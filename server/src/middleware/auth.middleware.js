import jwt from 'jsonwebtoken'

export const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, access denied' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded   // { id: userId }
    next()
  } catch (err) {
    res.status(401).json({ message: 'Token invalid or expired' })
  }
}

// Role guard — use after protect
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden' })
    }
    next()
  }
}