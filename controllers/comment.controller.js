// controllers/comment.controller.js
import {
  createComment, getCommentsByPost, updateComment, deleteComment
} from "../models/comment.model.js"
import { requireFields } from "../modules/validate.js"

// ── POST /api/comments ──────────────────────────────────────────────────────
export const addComment = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["post_id", "content"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  try {
    const comment = await createComment({
      post_id: req.body.post_id,
      user_id: req.user.id,
      content: req.body.content,
    })
    res.status(201).json({ message: "Comment added", comment })
  } catch (err) {
    res.status(500).json({ error: "Failed to add comment", detail: err.message })
  }
}

// ── GET /api/comments/:postId ───────────────────────────────────────────────
export const getComments = async (req, res) => {
  try {
    const comments = await getCommentsByPost(req.params.postId)
    res.json({ comments })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments", detail: err.message })
  }
}

// ── PUT /api/comments/:id ───────────────────────────────────────────────────
export const editComment = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["content"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  try {
    const updated = await updateComment(req.params.id, req.body.content)
    if (!updated) return res.status(404).json({ error: "Comment not found" })
    res.json({ message: "Comment updated", comment: updated })
  } catch (err) {
    res.status(500).json({ error: "Failed to update comment", detail: err.message })
  }
}

// ── DELETE /api/comments/:id ────────────────────────────────────────────────
export const removeComment = async (req, res) => {
  try {
    const deleted = await deleteComment(req.params.id)
    if (!deleted) return res.status(404).json({ error: "Comment not found" })
    res.json({ message: "Comment deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment", detail: err.message })
  }
}
