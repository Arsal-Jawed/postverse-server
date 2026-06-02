import express from "express"
import {
  getUser,
  getUsers,
  removeUser,
  updateUserProfile,
  getUserByUsername,
} from "../controllers/user.controller.js"
import { authenticate } from "../modules/auth.js"
import { optionalAuthenticate } from "../modules/optionalAuth.js"

const router = express.Router()

router.get("/", getUsers)
router.get("/username/:username", optionalAuthenticate, getUserByUsername)
router.get("/:id", optionalAuthenticate, getUser)
router.put("/:id", authenticate, updateUserProfile)
router.delete("/:id", authenticate, removeUser)

export default router
