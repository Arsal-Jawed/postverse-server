import express from "express"
import { trending, suggested } from "../controllers/explore.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

// GET /api/explore/trending?limit=10&offset=0&hours=48
router.get("/trending", trending)

// GET /api/explore/suggested?limit=5
// Optional JWT: if token present, personalise suggestions (exclude already-followed)
router.get("/suggested", (req, res, next) => {
  // Soft-authenticate: attach user if token provided, but don't block if missing
  const authHeader = req.headers["authorization"]
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authenticate(req, res, next)
  }
  next()
}, suggested)

export default router
