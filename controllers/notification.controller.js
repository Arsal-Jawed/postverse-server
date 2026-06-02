// controllers/notification.controller.js
import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationsRead,
} from "../models/notification.model.js"

// ── GET /api/notifications ──────────────────────────────────────────────────
export const listNotifications = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 50)
  const offset = parseInt(req.query.offset) || 0

  try {
    const [notifications, unread_count] = await Promise.all([
      getNotificationsForUser(req.user.id, { limit, offset }),
      getUnreadCount(req.user.id),
    ])
    res.json({ notifications, unread_count })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications", detail: err.message })
  }
}

// ── PATCH /api/notifications/read ─────────────────────────────────────────
export const markRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : null
    await markNotificationsRead(req.user.id, ids)
    const unread_count = await getUnreadCount(req.user.id)
    res.json({ message: "Notifications marked as read", unread_count })
  } catch (err) {
    res.status(500).json({ error: "Failed to update notifications", detail: err.message })
  }
}
