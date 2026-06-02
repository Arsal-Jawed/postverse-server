import express from "express"
import {
  getMe,
  login,
  register,
  verifyOtp,
  resendVerification,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.post("/register",             register)
router.post("/login",                login)
router.post("/verify-otp",           verifyOtp)
router.post("/resend-verification",  resendVerification)
router.post("/forgot-password",      forgotPassword)
router.post("/verify-reset-otp",   verifyResetOtp)
router.post("/reset-password",       resetPassword)
router.get("/me",                    authenticate, getMe)

export default router
