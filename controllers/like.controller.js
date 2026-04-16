// controllers/like.controller.js
import { likePost, unlikePost, getLikesByPost, hasUserLiked } from "../models/like.model.js"
import { requireFields } from "../modules/validate.js"

// ── POST /api/likes ─────────────────────────────────────────────────────────
export const toggleLike = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["post_id"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  const payload = { post_id: req.body.post_id, user_id: req.user.id }

  try {
    const alreadyLiked = await hasUserLiked(payload)

    if (alreadyLiked) {
      await unlikePost(payload)
      return res.json({ message: "Post unliked", liked: false })
    } else {
      const like = await likePost(payload)
      return res.status(201).json({ message: "Post liked", liked: true, like })
    }
  } catch (err) {
    res.status(500).json({ error: "Like action failed", detail: err.message })
  }
}

// ── GET /api/likes/:postId ──────────────────────────────────────────────────
export const getPostLikes = async (req, res) => {
  try {
    const likes = await getLikesByPost(req.params.postId)
    res.json({ count: likes.length, likes })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch likes", detail: err.message })
  }
}
