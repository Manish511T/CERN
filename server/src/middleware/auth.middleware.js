import jwt from 'jsonwebtoken'
import User from '../models/User.model.js'

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, access denied' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Fetch full user so req.user has _id, name, role — not just id
    const user = await User.findById(decoded.id).select('-password')
    if (!user) return res.status(401).json({ message: 'User not found' })

    req.user = user   // full mongoose document
    next()
  } catch (err) {
    console.error('Auth middleware error:', err.message)
    res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden' })
    }
    next()
  }
}