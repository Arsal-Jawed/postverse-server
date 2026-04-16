// controllers/upload.controller.js
import cloudinary from "../modules/cloudinary.js"

/**
 * Handle image upload to Cloudinary.
 * Expects a file in req.file (via Multer).
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    // Convert buffer to data URI for Cloudinary
    const base64Image = req.file.buffer.toString("base64")
    const dataUri = `data:${req.file.mimetype};base64,${base64Image}`

    // Upload to Cloudinary in the "posts" folder
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "posts",
      resource_type: "auto"
    })

    console.log(`🖼️  Image uploaded to Cloudinary: ${result.secure_url}`)

    res.json({
      url: result.secure_url,
      public_id: result.public_id
    })
  } catch (err) {
    console.error("❌ Cloudinary Upload Error:", err.message)
    res.status(500).json({ error: "Failed to upload image", detail: err.message })
  }
}
