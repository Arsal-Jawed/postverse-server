// modules/auth.js
// JWT token utilities
import jwt from "jsonwebtoken"
import dotenv from "dotenv"

dotenv.config()

const SECRET = process.env.JWT_SECRET
const EXPIRES = process.env.JWT_EXPIRES_IN || "7d"

/**
 * Generate a signed JWT for a user.
 * @param {Object} payload - Data to embed (e.g. { id, username, email })
 * @returns {string} Signed JWT string
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES })
}

/**
 * Verify and decode a JWT.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  return jwt.verify(token, SECRET)
}

/**
 * Express middleware — protects routes requiring authentication.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" })
  }

  const token = authHeader.split(" ")[1]
  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" })
  }
}
