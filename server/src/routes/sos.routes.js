import express from 'express'
import {
  triggerSOS,
  acceptSOS,
  updateLocation,
  getActiveAlerts
} from '../controllers/sos.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { upload } from '../middleware/upload.middleware.js'

const router = express.Router()

// All SOS routes require login
router.use(protect)

router.post(
  '/trigger',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'voice', maxCount: 1 }
  ]),
  triggerSOS
)

router.patch('/accept/:sosId', acceptSOS)
router.post('/location', updateLocation)
router.get('/active', getActiveAlerts)

export default router