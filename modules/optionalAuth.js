import { verifyToken } from "./auth.js"

/** Sets req.user when a valid Bearer token is present; otherwise continues without error. */
export const optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next()
  }

  const token = authHeader.split(" ")[1]
  try {
    req.user = verifyToken(token)
  } catch {
    // ignore invalid token for public reads
  }
  next()
}
