import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET || 'dev-secret-change-me'

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, secret, { expiresIn: '7d' })
}

export function verifyToken(token) {
  return jwt.verify(token, secret)
}