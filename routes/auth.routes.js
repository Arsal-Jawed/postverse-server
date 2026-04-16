import express from "express"
import { getMe, login, register } from "../controllers/auth.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.post("/register", register)
router.post("/login", login)
router.get("/me", authenticate, getMe)

export default router
