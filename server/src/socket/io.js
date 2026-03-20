import { Server } from 'socket.io'

let io = null

export const initIO = (httpServer, corsOptions) => {
  io = new Server(httpServer, { cors: corsOptions })
  return io
}

export const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized yet')
  return io
}