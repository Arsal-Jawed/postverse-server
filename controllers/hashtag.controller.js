// controllers/hashtag.controller.js
import { getPostsByHashtag, getTrendingHashtags } from "../models/hashtag.model.js"

// ── GET /api/hashtags/trending ──────────────────────────────────────────────
export const trendingHashtags = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 30)
  const days = Math.min(parseInt(req.query.days) || 7, 30)

  try {
    const hashtags = await getTrendingHashtags({ limit, days })
    res.json({ hashtags })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trending hashtags", detail: err.message })
  }
}

// ── GET /api/hashtags/:tag/posts ────────────────────────────────────────────
export const hashtagPosts = async (req, res) => {
  const tag = req.params.tag
  const limit = Math.min(parseInt(req.query.limit) || 20, 50)
  const offset = parseInt(req.query.offset) || 0
  const viewerId = req.user?.id || null

  try {
    const posts = await getPostsByHashtag(tag, { limit, offset, viewerId })
    res.json({
      tag: tag.toLowerCase(),
      posts,
      pagination: { limit, offset, next_offset: offset + posts.length },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch hashtag posts", detail: err.message })
  }
}
