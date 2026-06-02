import express from "express"
import { submitReport, listReasons } from "../controllers/report.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

router.get("/reasons", listReasons)
router.post("/", authenticate, submitReport)

export default router
