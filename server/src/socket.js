import { getIO } from './socket/io.js'

const onlineUsers = new Map()

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    socket.on('register', (userId) => {
      onlineUsers.set(userId, socket.id)
      console.log(`User ${userId} registered`)
    })

    socket.on('volunteer:location', ({ sosId, latitude, longitude, toUserId }) => {
      const targetSocketId = onlineUsers.get(toUserId)
      if (targetSocketId) {
        getIO().to(targetSocketId).emit('volunteer:location', { sosId, latitude, longitude })
      }
    })

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId)
          console.log(`User ${userId} disconnected`)
          break
        }
      }
    })
  })
}

export const getSocketId = (userId) => onlineUsers.get(userId)