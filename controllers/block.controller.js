import { blockUser, unblockUser, hasBlocked } from "../models/block.model.js"

export const block = async (req, res) => {
  const blocker_id = req.user.id
  const blocked_id = req.params.userId

  if (blocker_id === blocked_id) {
    return res.status(400).json({ error: "You cannot block yourself" })
  }

  try {
    const result = await blockUser({ blocker_id, blocked_id })
    res.status(201).json({
      message: "User blocked",
      blocked: true,
      block: result,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to block user", detail: err.message })
  }
}

export const unblock = async (req, res) => {
  try {
    const removed = await unblockUser({
      blocker_id: req.user.id,
      blocked_id: req.params.userId,
    })
    if (!removed) return res.status(404).json({ error: "User was not blocked" })
    res.json({ message: "User unblocked", blocked: false })
  } catch (err) {
    res.status(500).json({ error: "Failed to unblock user", detail: err.message })
  }
}

export const status = async (req, res) => {
  const viewerId = req.user.id
  const targetId = req.params.userId

  try {
    const you_blocked = await hasBlocked(viewerId, targetId)
    const they_blocked = await hasBlocked(targetId, viewerId)
    res.json({
      you_blocked,
      they_blocked,
      blocked: you_blocked || they_blocked,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to get block status", detail: err.message })
  }
}
