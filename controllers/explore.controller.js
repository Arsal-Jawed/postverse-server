// controllers/explore.controller.js
import { getTrendingPosts, getSuggestedUsers } from "../models/explore.model.js"

// ── GET /api/explore/trending?limit=&offset=&hours= ────────────────────────
export const trending = async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 10, 50)
  const offset = parseInt(req.query.offset) || 0
  const hours  = Math.min(parseInt(req.query.hours)  || 48, 168) // max 7 days

  try {
    const posts = await getTrendingPosts({ limit, offset, hours })
    res.json({
      posts,
      pagination: { limit, offset, next_offset: offset + posts.length },
      window_hours: hours,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending posts", detail: err.message })
  }
}

// ── GET /api/explore/suggested?limit= ──────────────────────────────────────
// Optional auth: pass viewer_id from JWT if logged in
export const suggested = async (req, res) => {
  const limit     = Math.min(parseInt(req.query.limit) || 5, 20)
  const viewer_id = req.user?.id || null   // optionally set by auth middleware

  try {
    const users = await getSuggestedUsers({ viewer_id, limit })
    res.json({ users })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch suggestions", detail: err.message })
  }
}
