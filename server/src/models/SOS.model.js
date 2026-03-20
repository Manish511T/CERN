import mongoose from 'mongoose'

const sosSchema = new mongoose.Schema({
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  forSelf: {
    type: Boolean,
    default: true   // false means triggered for someone else
  },
  emergencyType: {
    type: String,
    enum: ['accident', 'cardiac', 'snake_bite', 'rabies', 'other'],
    default: 'other'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],   // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },
  photoUrl: {
    type: String,
    default: ''
  },
  voiceNoteUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'accepted', 'resolved', 'cancelled'],
    default: 'active'
  },
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true })

sosSchema.index({ location: '2dsphere' })

export default mongoose.model('SOS', sosSchema)