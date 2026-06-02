import express from "express"
import {
  addPost,
  editPost,
  getPost,
  getPosts,
  getUserPosts,
  removePost,
  getFeed,
  previewLink,
  repost,
  getThread,
  listDrafts,
  listScheduled,
  saveDraft,
  publishDraft,
  schedulePost,
  unschedulePost,
} from "../controllers/post.controller.js"
import { authenticate } from "../modules/auth.js"
import { optionalAuthenticate } from "../modules/optionalAuth.js"

const router = express.Router()

router.get("/feed", optionalAuthenticate, getFeed)
router.get("/drafts", authenticate, listDrafts)
router.get("/scheduled", authenticate, listScheduled)
router.post("/draft", authenticate, saveDraft)
router.post("/preview-link", authenticate, previewLink)
router.post("/repost", authenticate, repost)
router.get("/thread/:threadId", optionalAuthenticate, getThread)
router.get("/", optionalAuthenticate, getPosts)
router.get("/user/:userId", optionalAuthenticate, getUserPosts)
router.post("/:id/publish", authenticate, publishDraft)
router.post("/:id/schedule", authenticate, schedulePost)
router.delete("/:id/schedule", authenticate, unschedulePost)
router.get("/:id", optionalAuthenticate, getPost)
router.post("/", authenticate, addPost)
router.put("/:id", authenticate, editPost)
router.delete("/:id", authenticate, removePost)

export default router
