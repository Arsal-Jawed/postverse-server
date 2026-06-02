// controllers/search.controller.js
import { searchUsers, searchPosts } from "../models/search.model.js"

// ── GET /api/search?q=&type=users|posts|all&limit=&offset= ──────────────────
export const search = async (req, res) => {
  const { q, type = "all", limit = 10, offset = 0 } = req.query

  if (!q || q.trim().length < 1) {
    return res.status(400).json({ error: "Search query 'q' is required" })
  }

  const term    = q.trim()
  const limitN  = Math.min(parseInt(limit)  || 10, 50) // cap at 50
  const offsetN = parseInt(offset) || 0

  try {
    let users = []
    let posts = []

    if (type === "users" || type === "all") {
      users = await searchUsers(term)
    }
    if (type === "posts" || type === "all") {
      posts = await searchPosts(term, { limit: limitN, offset: offsetN })
    }

    res.json({
      query: term,
      type,
      results: {
        users,
        posts,
        total: {
          users: users.length,
          posts: posts.length,
        },
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Search failed", detail: err.message })
  }
}
