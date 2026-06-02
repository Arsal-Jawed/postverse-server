import express from "express"
import { getPostLikes, toggleReaction } from "../controllers/like.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/:postId", getPostLikes)
router.post("/", authenticate, toggleReaction)

export default router
