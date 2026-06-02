import express from "express"
import { reportsQueue, reviewReport, setUserVerified } from "../controllers/admin.controller.js"
import { authenticate } from "../modules/auth.js"
import { requireAdmin } from "../modules/requireAdmin.js"

const router = express.Router()

router.use(authenticate, requireAdmin)

router.get("/reports", reportsQueue)
router.patch("/reports/:id", reviewReport)
router.patch("/users/:userId/verified", setUserVerified)

export default router
