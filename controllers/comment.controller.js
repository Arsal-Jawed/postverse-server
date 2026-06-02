// controllers/comment.controller.js
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
  enrichComment,
  getParentDepth,
  getCommentById,
} from "../models/comment.model.js"
import { requireFields } from "../modules/validate.js"
import { notifyMentions } from "../modules/notifyMentions.js"
import { getPostByIdRaw } from "../models/post.model.js"
import { notifyComment, notifyReply } from "../modules/notifyEvents.js"

const MAX_REPLY_DEPTH = 2

// ── POST /api/comments ──────────────────────────────────────────────────────
export const addComment = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["post_id", "content"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  const parent_comment_id = req.body.parent_comment_id || null
  let parent = null

  try {
    if (parent_comment_id) {
      parent = await getCommentById(parent_comment_id)
      if (!parent || parent.post_id !== req.body.post_id) {
        return res.status(400).json({ error: "Invalid parent comment" })
      }
      const depth = await getParentDepth(parent_comment_id)
      if (depth >= MAX_REPLY_DEPTH) {
        return res.status(400).json({ error: "Maximum reply depth reached" })
      }
    }

    const raw = await createComment({
      post_id: req.body.post_id,
      user_id: req.user.id,
      content: req.body.content,
      parent_comment_id,
    })
    const comment = await enrichComment(raw)

    await notifyMentions({
      mentionerId: req.user.id,
      content: req.body.content,
      postId: req.body.post_id,
      commentId: comment.id,
    })

    const post = await getPostByIdRaw(req.body.post_id)
    if (post) {
      await notifyComment({
        postOwnerId: post.user_id,
        actorId: req.user.id,
        postId: post.id,
        commentId: comment.id,
      })
      if (parent_comment_id && parent?.user_id) {
        await notifyReply({
          parentAuthorId: parent.user_id,
          actorId: req.user.id,
          postId: post.id,
          commentId: comment.id,
        })
      }
    }

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
    const existing = await getCommentById(req.params.id)
    if (!existing) return res.status(404).json({ error: "Comment not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: not your comment" })
    }

    const updated = await updateComment(req.params.id, req.body.content)
    const comment = await enrichComment(updated)
    res.json({ message: "Comment updated", comment })
  } catch (err) {
    res.status(500).json({ error: "Failed to update comment", detail: err.message })
  }
}

// ── DELETE /api/comments/:id ────────────────────────────────────────────────
export const removeComment = async (req, res) => {
  try {
    const existing = await getCommentById(req.params.id)
    if (!existing) return res.status(404).json({ error: "Comment not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: not your comment" })
    }

    const deleted = await deleteComment(req.params.id)
    if (!deleted) return res.status(404).json({ error: "Comment not found" })
    res.json({ message: "Comment deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete comment", detail: err.message })
  }
}
