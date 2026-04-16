// routes/upload.routes.js
import express from "express"
import multer from "multer"
import { uploadImage } from "../controllers/upload.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

// Configure Multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

/**
 * @route POST /api/upload
 * @desc  Upload an image to Cloudinary
 * @access Private
 */
router.post("/", authenticate, upload.single("image"), uploadImage)

export default router
