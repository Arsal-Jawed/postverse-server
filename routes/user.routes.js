import express from "express"
import { getUser, getUsers, removeUser, updateUserProfile } from "../controllers/user.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/", getUsers)
router.get("/:id", getUser)
router.put("/:id", authenticate, updateUserProfile)
router.delete("/:id", authenticate, removeUser)

export default router
