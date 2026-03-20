import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'
import api from '../api/axios'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('accessToken'))
        .finally(() => setLoading(false))
    } else {
      // Use a resolved promise so the setState happens asynchronously,
      // same as the .finally() branch above — fixes the linter warning
      Promise.resolve().then(() => setLoading(false))
    }
  }, [])

  const login = (userData, token) => {
    localStorage.setItem('accessToken', token)
    setUser(userData)
  }

  const logout = async () => {
    await api.post('/auth/logout')
    localStorage.removeItem('accessToken')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
