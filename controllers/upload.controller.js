import { uploadToS3 } from "../modules/s3.js"

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"]

const detectMediaType = (mimetype) => {
  if (mimetype === "image/gif") return "gif"
  if (ALLOWED_VIDEO.includes(mimetype)) return "video"
  return "image"
}

/**
 * Handle image upload to S3.
 * Expects a file in req.file (via Multer).
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    const result = await uploadToS3(req.file, "posts")
    console.log(`🖼️  Image uploaded to S3: ${result.url}`)

    res.json({
      url: result.url,
      key: result.key,
      media_type: "image",
    })
  } catch (err) {
    console.error("❌ S3 upload error:", err.message)
    res.status(500).json({ error: "Failed to upload image", detail: err.message })
  }
}

/**
 * Handle image, GIF, or short video upload to S3.
 * Field name: media
 */
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No media file provided" })
    }

    const allowed = [...ALLOWED_IMAGE, ...ALLOWED_VIDEO]
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: "Unsupported file type. Use JPEG, PNG, WebP, GIF, or MP4/WebM video.",
      })
    }

    const media_type = detectMediaType(req.file.mimetype)
    const result = await uploadToS3(req.file, "posts/media")
    console.log(`📎 Media uploaded to S3 (${media_type}): ${result.url}`)

    res.json({
      url: result.url,
      key: result.key,
      media_type,
    })
  } catch (err) {
    console.error("❌ S3 media upload error:", err.message)
    res.status(500).json({ error: "Failed to upload media", detail: err.message })
  }
}
