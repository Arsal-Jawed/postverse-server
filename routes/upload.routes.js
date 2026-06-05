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

// Multer error handler — converts multer errors to clean JSON 400 responses
const handleMulterError = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (!err) return next()
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `File too large. Max size: ${err.field === "image" ? "5MB" : "10MB"}`
        : err.message || "File upload error"
    return res.status(status).json({ error: message })
  })
}

/**
 * @route POST /api/upload
 * @desc  Upload an image to S3 (field name: "image")
 */
router.post(
  "/",
  authenticate,
  handleMulterError(imageUpload.single("image")),
  uploadImage,
)

/**
 * @route POST /api/upload/media
 * @desc  Upload image, GIF, or video to S3 (field name: "media")
 */
router.post(
  "/media",
  authenticate,
  handleMulterError(mediaUpload.single("media")),
  uploadMedia,
)

export default router
