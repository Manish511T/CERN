import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import mongoose from 'mongoose'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'
import sosRoutes from './routes/sos.routes.js'
import { initSocket } from './socket.js'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const httpServer = createServer(app)  // wrap express in http server for socket.io
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
})

// Make io accessible in controllers
export { io }

// Initialize socket handlers
initSocket(io)

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/sos', sosRoutes)

app.get('/', (req, res) => res.json({ message: 'CERN API running' }))

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected')
    httpServer.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`)
    })
  })
  .catch((err) => console.error('MongoDB connection error:', err))