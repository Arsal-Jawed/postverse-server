import express from "express"
import { trendingHashtags, hashtagPosts } from "../controllers/hashtag.controller.js"
import { optionalAuthenticate } from "../modules/optionalAuth.js"

const router = express.Router()

router.get("/trending", trendingHashtags)
router.get("/:tag/posts", optionalAuthenticate, hashtagPosts)

export default router
