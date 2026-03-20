import SOS from '../models/SOS.model.js'
import User from '../models/User.model.js'
import { io, } from '../index.js'
import { getSocketId } from '../socket.js'

// Trigger an SOS alert
export const triggerSOS = async (req, res) => {
  try {
    const { longitude, latitude, forSelf, emergencyType, address } = req.body

    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Location is required' })
    }

    const photoUrl = req.files?.photo?.[0]
      ? `/uploads/${req.files.photo[0].filename}`
      : ''

    const voiceNoteUrl = req.files?.voice?.[0]
      ? `/uploads/${req.files.voice[0].filename}`
      : ''

    // Create the SOS alert in DB
    const sos = await SOS.create({
      triggeredBy: req.user.id,
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

    // Find volunteers within 1km using MongoDB geo query
    const nearbyVolunteers = await User.find({
      role: 'volunteer',
      _id: { $ne: req.user.id },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 1000  // 1km in meters
        }
      }
    }).select('_id name')

    // Find nearby users within 1km
    const nearbyUsers = await User.find({
      role: 'user',
      _id: { $ne: req.user.id },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: 1000
        }
      }
    }).select('_id name')

    // Build the alert payload
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
      triggeredBy: req.user.id
    }

    // Emit to each nearby volunteer
    let notifiedCount = 0
    for (const volunteer of nearbyVolunteers) {
      const socketId = getSocketId(volunteer._id.toString())
      if (socketId) {
        io.to(socketId).emit('sos:alert', { ...alertPayload, isVolunteer: true })
        notifiedCount++
      }
    }

    // Emit to each nearby user
    for (const user of nearbyUsers) {
      const socketId = getSocketId(user._id.toString())
      if (socketId) {
        io.to(socketId).emit('sos:alert', { ...alertPayload, isVolunteer: false })
      }
    }

    res.status(201).json({
      message: 'SOS alert sent',
      sosId: sos._id,
      notifiedVolunteers: notifiedCount,
      nearbyVolunteers: nearbyVolunteers.length
    })

  } catch (err) {
    console.error('SOS trigger error:', err)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Volunteer accepts an SOS
export const acceptSOS = async (req, res) => {
  try {
    const { sosId } = req.params

    const sos = await SOS.findById(sosId)
    if (!sos) return res.status(404).json({ message: 'SOS not found' })
    if (sos.status !== 'active') {
      return res.status(400).json({ message: 'This SOS has already been accepted' })
    }

    sos.status = 'accepted'
    sos.acceptedBy = req.user.id
    await sos.save()

    // Notify the person who triggered the SOS
    const triggererSocketId = getSocketId(sos.triggeredBy.toString())
    if (triggererSocketId) {
      io.to(triggererSocketId).emit('sos:accepted', {
        sosId: sos._id,
        acceptedBy: req.user.id,
        volunteerName: req.user.name
      })
    }

    res.json({ message: 'SOS accepted', sos })
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}

// Update user's current location (needed for geo queries to work)
export const updateLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.body
    await User.findByIdAndUpdate(req.user.id, {
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

// Get active SOS alerts (for volunteer dashboard)
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