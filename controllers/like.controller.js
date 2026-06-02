// controllers/like.controller.js
import {
  setReaction,
  getLikesByPost,
  getReactionCounts,
  REACTION_TYPES,
} from "../models/like.model.js"
import { requireFields } from "../modules/validate.js"
import { getPostByIdRaw } from "../models/post.model.js"
import { notifyLike } from "../modules/notifyEvents.js"

// ── POST /api/likes ─────────────────────────────────────────────────────────
export const toggleReaction = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["post_id"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  const reaction_type = req.body.reaction_type || "like"
  if (!REACTION_TYPES.includes(reaction_type)) {
    return res.status(400).json({ error: `Invalid reaction. Use: ${REACTION_TYPES.join(", ")}` })
  }

  const payload = { post_id: req.body.post_id, user_id: req.user.id, reaction_type }

  try {
    const result = await setReaction(payload)
    const counts = await getReactionCounts(req.body.post_id)

    if (!result.removed) {
      const post = await getPostByIdRaw(req.body.post_id)
      if (post) {
        await notifyLike({
          postOwnerId: post.user_id,
          actorId: req.user.id,
          postId: post.id,
        })
      }
    }

    res.json({
      message: result.removed ? "Reaction removed" : "Reaction updated",
      liked: !result.removed,
      user_reaction: result.removed ? null : result.reaction_type,
      reaction_counts: counts,
    })
  } catch (err) {
    res.status(500).json({ error: "Reaction action failed", detail: err.message })
  }
}

// ── GET /api/likes/:postId ──────────────────────────────────────────────────
export const getPostLikes = async (req, res) => {
  try {
    const likes = await getLikesByPost(req.params.postId)
    const counts = await getReactionCounts(req.params.postId)
    res.json({ count: counts.total, reaction_counts: counts, likes })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch likes", detail: err.message })
  }
}
