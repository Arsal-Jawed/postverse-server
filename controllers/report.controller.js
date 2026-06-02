import { createReport, REPORT_REASONS } from "../models/report.model.js"
import { getPostByIdRaw } from "../models/post.model.js"
import { requireFields } from "../modules/validate.js"

export const submitReport = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["post_id", "reason"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  const { post_id, reason, details } = req.body
  if (!REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ error: `Invalid reason. Use: ${REPORT_REASONS.join(", ")}` })
  }

  try {
    const post = await getPostByIdRaw(post_id)
    if (!post) return res.status(404).json({ error: "Post not found" })

    const report = await createReport({
      reporter_id: req.user.id,
      post_id,
      reason,
      details,
    })

    res.status(201).json({ message: "Report submitted. Thank you for helping keep Postverse safe.", report })
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report", detail: err.message })
  }
}

export const listReasons = (_req, res) => {
  res.json({ reasons: REPORT_REASONS })
}
