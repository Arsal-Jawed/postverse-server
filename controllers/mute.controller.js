import { muteUser, unmuteUser, isMuted } from "../models/mute.model.js"

export const mute = async (req, res) => {
  const muter_id = req.user.id
  const muted_id = req.params.userId

  if (muter_id === muted_id) {
    return res.status(400).json({ error: "You cannot mute yourself" })
  }

  try {
    const result = await muteUser({ muter_id, muted_id })
    res.status(201).json({ message: "User muted", muted: true, mute: result })
  } catch (err) {
    res.status(500).json({ error: "Failed to mute user", detail: err.message })
  }
}

export const unmute = async (req, res) => {
  try {
    const removed = await unmuteUser({
      muter_id: req.user.id,
      muted_id: req.params.userId,
    })
    if (!removed) return res.status(404).json({ error: "User was not muted" })
    res.json({ message: "User unmuted", muted: false })
  } catch (err) {
    res.status(500).json({ error: "Failed to unmute user", detail: err.message })
  }
}

export const status = async (req, res) => {
  try {
    const muted = await isMuted(req.user.id, req.params.userId)
    res.json({ muted })
  } catch (err) {
    res.status(500).json({ error: "Failed to get mute status", detail: err.message })
  }
}
