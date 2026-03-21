import SOS from '../models/SOS.model.js'
import User from '../models/User.model.js'
import { getIO } from '../socket/io.js'
import { getSocketId } from '../socket.js'



export const triggerSOS = async (req, res) => {
  try {
    await SOS.updateMany(
      { triggeredBy: req.user._id, status: 'active' },
      { $set: { status: 'cancelled' } }
    )
    const { longitude, latitude, forSelf, emergencyType, address } = req.body

    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Location is required' })
    }

    const photoUrl = req.files?.photo?.[0]
      ? `/uploads/${req.files.photo[0].filename}` : ''
    const voiceNoteUrl = req.files?.voice?.[0]
      ? `/uploads/${req.files.voice[0].filename}` : ''

    const sos = await SOS.create({
      triggeredBy: req.user._id,
      forSelf: forSelf === 'false' ? false : true,
      emergencyType: emergencyType || 'other',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
        address: address || ''
      },
      photoUrl,
      voiceNoteUrl
    })

    // Find nearby volunteers within 5km
    let volunteersToNotify = await User.find({
      role: 'volunteer',
      isOnDuty: true,
      _id: { $ne: req.user._id },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 5000
        }
      }
    }).select('_id name')

    // Fallback: if no nearby volunteers found, notify ALL online volunteers
    if (volunteersToNotify.length === 0) {
      console.log('No nearby volunteers — notifying all online volunteers')
      volunteersToNotify = await User.find({
        role: 'volunteer',
        isOnDuty: true, 
        _id: { $ne: req.user._id }
      }).select('_id name')
    }

    // Find nearby users within 5km
    const nearbyUsers = await User.find({
      role: 'user',
      _id: { $ne: req.user._id },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 5000
        }
      }
    }).select('_id name')

    const alertPayload = {
      sosId: sos._id,
      emergencyType: sos.emergencyType,
      forSelf: sos.forSelf,
      location: {
        coordinates: sos.location.coordinates,
        address: sos.location.address
      },
      photoUrl: sos.photoUrl,
      voiceNoteUrl: sos.voiceNoteUrl,
      triggeredAt: sos.createdAt,
      triggeredBy: req.user._id
    }

    let notifiedCount = 0
    for (const volunteer of volunteersToNotify) {
      const socketId = getSocketId(volunteer._id.toString())
      if (socketId) {
        getIO().to(socketId).emit('sos:alert', { ...alertPayload, isVolunteer: true })
        notifiedCount++
        console.log(`Notified volunteer: ${volunteer.name} (${volunteer._id})`)
      } else {
        console.log(`Volunteer ${volunteer.name} is offline`)
      }
    }

    for (const user of nearbyUsers) {
      const socketId = getSocketId(user._id.toString())
      if (socketId) {
        getIO().to(socketId).emit('sos:alert', { ...alertPayload, isVolunteer: false })
      }
    }

    res.status(201).json({
      message: 'SOS alert sent',
      sosId: sos._id,
      notifiedVolunteers: notifiedCount,
      nearbyVolunteers: volunteersToNotify.length
    })

  } catch (err) {
    console.error('SOS trigger error:', err)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

export const acceptSOS = async (req, res) => {
  try {
    console.log('acceptSOS hit — sosId:', req.params.sosId, 'user:', req.user?._id)

    const { sosId } = req.params
    const sos = await SOS.findById(sosId).populate('triggeredBy', 'name phone')

    if (!sos) return res.status(404).json({ message: 'SOS not found' })
    if (sos.status !== 'active') {
      return res.status(400).json({ message: 'This SOS has already been accepted' })
    }

    sos.status = 'accepted'
    sos.acceptedBy = req.user._id
    await sos.save()

    // Build victim location from the SOS record — always accurate
    const victimLocation = {
      latitude: sos.location.coordinates[1],
      longitude: sos.location.coordinates[0],
      address: sos.location.address || ''
    }

    const triggererSocketId = getSocketId(sos.triggeredBy._id.toString())
    if (triggererSocketId) {
      getIO().to(triggererSocketId).emit('sos:accepted', {
        sosId: sos._id,
        volunteerId: req.user._id,
        volunteerName: req.user.name,
        openMap: true,
        // Send victim their own location back from DB
        // so SOSPage doesn't rely on stale local state
        victimLocation
      })
    }

    res.json({
      message: 'SOS accepted',
      sos,
      victimLocation,
      victimId: sos.triggeredBy._id,
      victimName: sos.triggeredBy.name
    })

  } catch (err) {
    console.error('acceptSOS error:', err)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

export const updateLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body
    await User.findByIdAndUpdate(req.user._id, {
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    })
    res.json({ message: 'Location updated' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}

export const getActiveAlerts = async (req, res) => {
  try {
    const alerts = await SOS.find({ status: 'active' })
      .populate('triggeredBy', 'name phone')
      .sort({ createdAt: -1 })
      .limit(20)
    res.json(alerts)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
}


export const updateSOSStatus = async (req, res) => {
  try {
    const { sosId } = req.params
    const { status } = req.body

    const allowed = ['resolved', 'cancelled']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' })
    }

    const sos = await SOS.findById(sosId)
    if (!sos) return res.status(404).json({ message: 'SOS not found' })

    // Only the volunteer who accepted or the user who triggered can update
    const isOwner = sos.triggeredBy.toString() === req.user._id.toString()
    const isResponder = sos.acceptedBy?.toString() === req.user._id.toString()
    if (!isOwner && !isResponder) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    sos.status = status
    await sos.save()
    res.json({ message: `SOS marked as ${status}`, sos })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

export const getMySOSHistory = async (req, res) => {
  try {
    let query = {}

    if (req.user.role === 'volunteer') {
      // Volunteers see SOS they accepted + all active ones
      query = {
        $or: [
          { acceptedBy: req.user._id },
          { status: 'active' }
        ]
      }
    } else {
      // Users see their own SOS history
      query = { triggeredBy: req.user._id }
    }

    const history = await SOS.find(query)
      .populate('triggeredBy', 'name phone')
      .populate('acceptedBy', 'name phone')
      .sort({ createdAt: -1 })
      .limit(50)

    res.json(history)
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}