import express from "express"
import {
  follow,
  unfollow,
  checkFollowStatus,
  listFollowers,
  listFollowing,
  followCounts,
  feed,
} from "../controllers/follow.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

// Personalized feed (posts from followed users) — must come before /:id routes
router.get("/feed",           authenticate, feed)

// Follow / Unfollow
router.post("/:id",           authenticate, follow)
router.delete("/:id",         authenticate, unfollow)

// Check if current user follows :id
router.get("/:id/status",     authenticate, checkFollowStatus)

// Public lists
router.get("/:id/followers",  listFollowers)
router.get("/:id/following",  listFollowing)
router.get("/:id/counts",     followCounts)

export default router
