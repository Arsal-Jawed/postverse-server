// controllers/message.controller.js
import { saveMessage, getConversation, getInbox, markAsRead } from "../models/message.model.js"
import { assertNotBlocked } from "../modules/socialSafety.js"

// ── GET /api/messages/inbox ─────────────────────────────────────────────────
export const inbox = async (req, res) => {
  try {
    const conversations = await getInbox(req.user.id)
    res.json({ conversations })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inbox", detail: err.message })
  }
}

// ── GET /api/messages/:userId?limit=&offset= ────────────────────────────────
export const conversation = async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 30, 100)
  const offset = parseInt(req.query.offset) || 0

  try {
    const messages = await getConversation(req.user.id, req.params.userId, { limit, offset })
    res.json({
      messages,
      pagination: { limit, offset, next_offset: offset + messages.length },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch conversation", detail: err.message })
  }
}

// ── POST /api/messages/:userId ──────────────────────────────────────────────
// REST fallback (for non-WS clients)
export const sendMessage = async (req, res) => {
  const { content } = req.body
  if (!content || !content.trim()) {
    return res.status(400).json({ error: "Message content is required" })
  }

  const sender_id   = req.user.id
  const receiver_id = req.params.userId

  if (sender_id === receiver_id) {
    return res.status(400).json({ error: "Cannot send a message to yourself" })
  }

  try {
    await assertNotBlocked(sender_id, receiver_id, "Cannot message this user")
    const message = await saveMessage({ sender_id, receiver_id, content: content.trim() })
    res.status(201).json({ message })
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({
      error: err.message || "Failed to send message",
      detail: err.message,
    })
  }
}

// ── PATCH /api/messages/:userId/read ────────────────────────────────────────
export const readMessages = async (req, res) => {
  try {
    const updated = await markAsRead({ viewer_id: req.user.id, other_user_id: req.params.userId })
    res.json({ marked_read: updated })
  } catch (err) {
    res.status(500).json({ error: "Failed to mark messages as read", detail: err.message })
  }
}
