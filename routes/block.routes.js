import express from "express"
import { block, unblock, status } from "../controllers/block.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/:userId/status", authenticate, status)
router.post("/:userId", authenticate, block)
router.delete("/:userId", authenticate, unblock)

export default router
