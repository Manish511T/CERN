import express from 'express'
import { createServer } from 'http'
import mongoose from 'mongoose'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initIO } from './socket/io.js'
import { initSocket } from './socket.js'
import authRoutes from './routes/auth.routes.js'
import sosRoutes from './routes/sos.routes.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)

const io = initIO(httpServer, {
  origin: process.env.CLIENT_URL,
  credentials: true
})

initSocket(io)

const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(cors(corsOptions))
app.options('/{*path}', cors(corsOptions))   // handle preflight for every route

app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

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