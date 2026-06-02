// controllers/follow.controller.js
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  getFollowCounts,
  getFollowingFeed,
  getFollowingFeedCount,
} from "../models/follow.model.js"
import { assertNotBlocked } from "../modules/socialSafety.js"
import { notifyFollow } from "../modules/notifyEvents.js"

// ── POST /api/follow/:id ────────────────────────────────────────────────────
export const follow = async (req, res) => {
  const follower_id  = req.user.id
  const following_id = req.params.id

  if (follower_id === following_id) {
    return res.status(400).json({ error: "You cannot follow yourself" })
  }

  try {
    await assertNotBlocked(follower_id, following_id, "Cannot follow this user")
    const result = await followUser({ follower_id, following_id })
    if (!result) {
      return res.status(409).json({ message: "Already following this user" })
    }
    await notifyFollow({ followedUserId: following_id, actorId: follower_id })
    res.status(201).json({ message: "User followed successfully", follow: result })
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({
      error: err.message || "Failed to follow user",
      detail: err.message,
    })
  }
}

// ── DELETE /api/follow/:id ──────────────────────────────────────────────────
export const unfollow = async (req, res) => {
  const follower_id  = req.user.id
  const following_id = req.params.id

  try {
    const removed = await unfollowUser({ follower_id, following_id })
    if (!removed) {
      return res.status(404).json({ error: "You are not following this user" })
    }
    res.json({ message: "User unfollowed successfully" })
  } catch (err) {
    res.status(500).json({ error: "Failed to unfollow user", detail: err.message })
  }
}

// ── GET /api/follow/:id/status ──────────────────────────────────────────────
export const checkFollowStatus = async (req, res) => {
  const follower_id  = req.user.id
  const following_id = req.params.id

  try {
    const following = await isFollowing({ follower_id, following_id })
    res.json({ following })
  } catch (err) {
    res.status(500).json({ error: "Failed to check follow status", detail: err.message })
  }
}

// ── GET /api/follow/:id/followers ───────────────────────────────────────────
export const listFollowers = async (req, res) => {
  try {
    const followers = await getFollowers(req.params.id)
    res.json({ followers, count: followers.length })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch followers", detail: err.message })
  }
}

// ── GET /api/follow/:id/following ───────────────────────────────────────────
export const listFollowing = async (req, res) => {
  try {
    const following = await getFollowing(req.params.id)
    res.json({ following, count: following.length })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch following", detail: err.message })
  }
}

// ── GET /api/follow/:id/counts ──────────────────────────────────────────────
export const followCounts = async (req, res) => {
  try {
    const counts = await getFollowCounts(req.params.id)
    res.json(counts)
  } catch (err) {
    res.status(500).json({ error: "Failed to get follow counts", detail: err.message })
  }
}

// ── GET /api/follow/feed ────────────────────────────────────────────────────
export const feed = async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 50)
  const offset = parseInt(req.query.offset) || 0

  try {
    const [posts, total] = await Promise.all([
      getFollowingFeed(req.user.id, { limit, offset }),
      getFollowingFeedCount(req.user.id),
    ])
    res.json({
      posts,
      pagination: {
        total,
        limit,
        offset,
        next_offset: offset + posts.length,
        has_more: offset + posts.length < total,
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feed", detail: err.message })
  }
}
