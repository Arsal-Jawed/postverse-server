import express from "express"
import { mute, unmute, status } from "../controllers/mute.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/:userId/status", authenticate, status)
router.post("/:userId", authenticate, mute)
router.delete("/:userId", authenticate, unmute)

export default router
