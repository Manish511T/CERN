import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import api from '../api/axios'
import socket from '../socket/socket'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      api.get('/auth/me')
        .then(res => {
          setUser(res.data)
          // Connect socket and register user
          socket.connect()
          socket.emit('register', res.data._id)
        })
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false))
    } else {
      Promise.resolve().then(() => setLoading(false))
    }
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('accessToken', token)
    setUser(userData)
    // Connect socket after login
    socket.connect()
    socket.emit('register', userData.id)
  }

  const logout = async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('accessToken')
    socket.disconnect()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}