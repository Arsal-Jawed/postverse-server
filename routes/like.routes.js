import express from "express"
import { getPostLikes, toggleLike } from "../controllers/like.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/:postId", getPostLikes)
router.post("/", authenticate, toggleLike)

export default router
