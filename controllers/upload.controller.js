import cloudinary from "../modules/cloudinary.js"

const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"]
const ALLOWED_VIDEO = ["video/mp4", "video/webm", "video/quicktime"]

const detectMediaType = (mimetype) => {
  if (mimetype === "image/gif") return "gif"
  if (ALLOWED_VIDEO.includes(mimetype)) return "video"
  return "image"
}

const uploadToCloudinary = async (file, folder) => {
  const base64 = file.buffer.toString("base64")
  const dataUri = `data:${file.mimetype};base64,${base64}`
  const isVideo = ALLOWED_VIDEO.includes(file.mimetype)

  return cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: isVideo ? "video" : "auto",
  })
}

/**
 * Handle image upload to Cloudinary.
 * Expects a file in req.file (via Multer).
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    const result = await uploadToCloudinary(req.file, "posts")
    console.log(`🖼️  Image uploaded: ${result.secure_url}`)

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      media_type: "image",
    })
  } catch (err) {
    console.error("❌ Cloudinary Upload Error:", err.message)
    res.status(500).json({ error: "Failed to upload image", detail: err.message })
  }
}

/**
 * Handle image, GIF, or short video upload.
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
    const result = await uploadToCloudinary(req.file, "posts/media")
    console.log(`📎 Media uploaded (${media_type}): ${result.secure_url}`)

    res.json({
      url: result.secure_url,
      public_id: result.public_id,
      media_type,
    })
  } catch (err) {
    console.error("❌ Media upload error:", err.message)
    res.status(500).json({ error: "Failed to upload media", detail: err.message })
  }
}
