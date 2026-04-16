import express from "express"
import { addComment, editComment, getComments, removeComment } from "../controllers/comment.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/:postId", getComments)
router.post("/", authenticate, addComment)
router.put("/:id", authenticate, editComment)
router.delete("/:id", authenticate, removeComment)

export default router
