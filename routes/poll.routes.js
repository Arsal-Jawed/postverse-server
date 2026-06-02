import express from "express"
import { castVote } from "../controllers/poll.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.post("/vote", authenticate, castVote)

export default router
