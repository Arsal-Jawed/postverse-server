import express from "express"
import { inbox, conversation, sendMessage, readMessages } from "../controllers/message.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

// All message routes require authentication
router.use(authenticate)

router.get("/inbox",            inbox)           // GET  /api/messages/inbox
router.get("/:userId",          conversation)    // GET  /api/messages/:userId?limit=&offset=
router.post("/:userId",         sendMessage)     // POST /api/messages/:userId (REST fallback)
router.patch("/:userId/read",   readMessages)    // PATCH /api/messages/:userId/read

export default router
