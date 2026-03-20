// Map to track online users: userId -> socketId
const onlineUsers = new Map()

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    // When a user connects, they register themselves with their userId
    socket.on('register', (userId) => {
      onlineUsers.set(userId, socket.id)
      console.log(`User ${userId} registered with socket ${socket.id}`)
    })

    socket.on('disconnect', () => {
      // Remove user from online map on disconnect
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

// Helper used by SOS controller to send alert to a specific user
export const getSocketId = (userId) => onlineUsers.get(userId)