import express from "express"
import { listNotifications, markRead } from "../controllers/notification.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/", authenticate, listNotifications)
router.patch("/read", authenticate, markRead)

export default router
