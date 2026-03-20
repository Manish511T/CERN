import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_API_URL?.replace('/api', ''), {
  withCredentials: true,
  autoConnect: false   // we connect manually after login
})

export default socket;