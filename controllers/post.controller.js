// controllers/post.controller.js
import {
  createPost, getAllPosts, getPostById, getPostsByUser, updatePost, deletePost
} from "../models/post.model.js"
import { requireFields } from "../modules/validate.js"

// ── POST /api/posts ─────────────────────────────────────────────────────────
export const addPost = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["content"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  try {
    const post = await createPost({
      user_id: req.user.id,
      content: req.body.content,
      image_url: req.body.image_url || null,
    })
    res.status(201).json({ message: "Post created", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to create post", detail: err.message })
  }
}

// ── GET /api/posts ──────────────────────────────────────────────────────────
export const getPosts = async (req, res) => {
  try {
    const posts = await getAllPosts()
    res.json(posts)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts", detail: err.message })
  }
}

// ── GET /api/posts/:id ──────────────────────────────────────────────────────
export const getPost = async (req, res) => {
  try {
    const post = await getPostById(req.params.id)
    if (!post) return res.status(404).json({ error: "Post not found" })
    res.json({ post })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post", detail: err.message })
  }
}

// ── GET /api/posts/user/:userId ─────────────────────────────────────────────
export const getUserPosts = async (req, res) => {
  try {
    const posts = await getPostsByUser(req.params.userId)
    res.json(posts)
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user posts", detail: err.message })
  }
}

// ── PUT /api/posts/:id ──────────────────────────────────────────────────────
export const editPost = async (req, res) => {
  try {
    const existing = await getPostById(req.params.id)
    if (!existing) return res.status(404).json({ error: "Post not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: not your post" })
    }

    const updated = await updatePost(req.params.id, req.body)
    res.json({ message: "Post updated", post: updated })
  } catch (err) {
    res.status(500).json({ error: "Failed to update post", detail: err.message })
  }
}

// ── DELETE /api/posts/:id ───────────────────────────────────────────────────
export const removePost = async (req, res) => {
  try {
    const existing = await getPostById(req.params.id)
    if (!existing) return res.status(404).json({ error: "Post not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: not your post" })
    }

    await deletePost(req.params.id)
    res.json({ message: "Post deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post", detail: err.message })
  }
}
