import { findUserById } from "../models/user.model.js"

export const requireAdmin = async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id)
    if (!user?.is_admin) {
      return res.status(403).json({ error: "Admin access required" })
    }
    req.adminUser = user
    next()
  } catch (err) {
    res.status(500).json({ error: "Authorization check failed", detail: err.message })
  }
}
