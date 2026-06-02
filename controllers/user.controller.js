// controllers/user.controller.js
import {
  getAllUsers,
  findUserById,
  findUserByUsername,
  updateUser,
  deleteUser,
  toPublicUser,
} from "../models/user.model.js"
import { isFollowing, getFollowCounts } from "../models/follow.model.js"
import { getTotalUserPostCount } from "../models/post.model.js"
import { isBlocked, hasBlocked } from "../models/block.model.js"
import { isMuted } from "../models/mute.model.js"

// ── GET /api/users ──────────────────────────────────────────────────────────
export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers()
    res.json({ users })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users", detail: err.message })
  }
}

// ── GET /api/users/username/:username ─────────────────────────────────────
export const getUserByUsername = async (req, res) => {
  try {
    const user = await findUserByUsername(req.params.username)
    if (!user) return res.status(404).json({ error: "User not found" })

    const viewerId = req.user?.id || null

    if (viewerId && viewerId !== user.id) {
      if (await isBlocked(viewerId, user.id)) {
        return res.status(404).json({ error: "User not found" })
      }
    }

    const [counts, post_count, following, you_blocked, they_blocked, you_muted] =
      await Promise.all([
        getFollowCounts(user.id),
        getTotalUserPostCount(user.id, viewerId),
        viewerId
          ? isFollowing({ follower_id: viewerId, following_id: user.id })
          : Promise.resolve(false),
        viewerId ? hasBlocked(viewerId, user.id) : false,
        viewerId ? hasBlocked(user.id, viewerId) : false,
        viewerId ? isMuted(viewerId, user.id) : false,
      ])

    res.json({
      user: {
        ...toPublicUser(user, { is_following: following, post_count }),
        you_blocked,
        they_blocked,
        you_muted,
        blocked: you_blocked || they_blocked,
      },
      followers_count: counts.followers_count,
      following_count: counts.following_count,
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user", detail: err.message })
  }
}

// ── GET /api/users/:id ──────────────────────────────────────────────────────
export const getUser = async (req, res) => {
  try {
    const user = await findUserById(req.params.id)
    if (!user) return res.status(404).json({ error: "User not found" })

    const isOwner = req.user?.id === user.id
    const viewerId = req.user?.id || null

    const payload = isOwner
      ? { ...user, email: user.email }
      : toPublicUser(user)

    if (!isOwner && viewerId) {
      payload.is_following = await isFollowing({
        follower_id: viewerId,
        following_id: user.id,
      })
    }

    res.json({ user: payload })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user", detail: err.message })
  }
}

// ── PUT /api/users/:id ──────────────────────────────────────────────────────
export const updateUserProfile = async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Forbidden: cannot edit another user's profile" })
  }

  const { is_private, default_post_visibility, muted_words, hide_spoilers } = req.body
  if (default_post_visibility && !["public", "followers"].includes(default_post_visibility)) {
    return res.status(400).json({ error: "default_post_visibility must be 'public' or 'followers'" })
  }
  if (muted_words !== undefined && !Array.isArray(muted_words)) {
    return res.status(400).json({ error: "muted_words must be an array of strings" })
  }
  try {
    const updated = await updateUser(req.params.id, {
      ...req.body,
      muted_words: muted_words?.map((w) => String(w).trim()).filter(Boolean),
      hide_spoilers,
    })
    if (!updated) return res.status(404).json({ error: "User not found" })
    res.json({ message: "Profile updated", user: updated })
  } catch (err) {
    res.status(500).json({ error: "Failed to update user", detail: err.message })
  }
}

// ── DELETE /api/users/:id ───────────────────────────────────────────────────
export const removeUser = async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Forbidden: cannot delete another user" })
  }

  try {
    const deleted = await deleteUser(req.params.id)
    if (!deleted) return res.status(404).json({ error: "User not found" })
    res.json({ message: "Account deleted successfully" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user", detail: err.message })
  }
}
