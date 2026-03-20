import multer from 'multer'
import path from 'path'
import fs from 'fs'

// Create uploads folder if it doesn't exist
const uploadDir = 'uploads'
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, unique + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/mpeg']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only images and audio files are allowed'))
  }
}

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },  // 10MB max
  fileFilter
})