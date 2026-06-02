import express from "express"
import multer from "multer"
import { uploadImage, uploadMedia } from "../controllers/upload.controller.js"
import { authenticate } from "../modules/auth.js"

const router = express.Router()

const storage = multer.memoryStorage()

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

const mediaUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error("Unsupported media type"))
  },
})

/**
 * @route POST /api/upload
 * @desc  Upload an image to S3
 */
router.post("/", authenticate, imageUpload.single("image"), uploadImage)

/**
 * @route POST /api/upload/media
 * @desc  Upload image, GIF, or video to S3
 */
router.post("/media", authenticate, mediaUpload.single("media"), uploadMedia)

export default router
