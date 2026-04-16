import express from "express"
import { addPost, editPost, getPost, getPosts, getUserPosts, removePost } from "../controllers/post.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/", getPosts)
router.get("/user/:userId", getUserPosts)
router.get("/:id", getPost)
router.post("/", authenticate, addPost)
router.put("/:id", authenticate, editPost)
router.delete("/:id", authenticate, removePost)

export default router
