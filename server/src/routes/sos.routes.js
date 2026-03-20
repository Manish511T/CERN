import express from 'express'
import {
  triggerSOS,
  acceptSOS,
  updateLocation,
  getActiveAlerts,
  updateSOSStatus,
  getMySOSHistory
} from '../controllers/sos.controller.js'
import { protect } from '../middleware/auth.middleware.js'
import { upload } from '../middleware/upload.middleware.js'

const router = express.Router()

router.use(protect)

router.post('/trigger',
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'voice', maxCount: 1 }]),
  triggerSOS
)
router.patch('/accept/:sosId', acceptSOS)
router.patch('/status/:sosId', updateSOSStatus)
router.post('/location', updateLocation)
router.get('/active', getActiveAlerts)
router.get('/history', getMySOSHistory)

export default router