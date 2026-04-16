// controllers/user.controller.js
import { getAllUsers, findUserById, updateUser, deleteUser } from "../models/user.model.js"

// ── GET /api/users ──────────────────────────────────────────────────────────
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers()
    res.json({ users })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users", detail: err.message })
  }
}

// ── GET /api/users/:id ──────────────────────────────────────────────────────
export const getUser = async (req, res) => {
  try {
    const user = await findUserById(req.params.id)
    if (!user) return res.status(404).json({ error: "User not found" })
    res.json({ user })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user", detail: err.message })
  }
}

// ── PUT /api/users/:id ──────────────────────────────────────────────────────
export const updateUserProfile = async (req, res) => {
  // Only allow users to update their own profile
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Forbidden: cannot edit another user's profile" })
  }

  try {
    const updated = await updateUser(req.params.id, req.body)
    if (!updated) return res.status(404).json({ error: "User not found" })
    res.json({ message: "Profile updated", user: updated })
  } catch (err) {
    res.status(500).json({ error: "Failed to update user", detail: err.message })
  }
}

// ── DELETE /api/users/:id ───────────────────────────────────────────────────
export const removeUser = async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Forbidden: cannot delete another user" })
  }

  try {
    const deleted = await deleteUser(req.params.id)
    if (!deleted) return res.status(404).json({ error: "User not found" })
    res.json({ message: "Account deleted successfully" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user", detail: err.message })
  }
}
