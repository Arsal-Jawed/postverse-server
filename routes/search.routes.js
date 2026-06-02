import express from "express"
import { search } from "../controllers/search.controller.js"

const router = express.Router()

// GET /api/search?q=<term>&type=users|posts|all&limit=10&offset=0
router.get("/", search)

export default router
