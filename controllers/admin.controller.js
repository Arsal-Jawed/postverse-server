import { getReportsQueue, updateReportStatus } from "../models/report.model.js"
import { findUserById, updateUser } from "../models/user.model.js"

export const reportsQueue = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0
  const status = req.query.status || "pending"

  try {
    const reports = await getReportsQueue({ limit, offset, status })
    res.json({ reports, status })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports", detail: err.message })
  }
}

export const reviewReport = async (req, res) => {
  const { status } = req.body
  if (!["reviewed", "dismissed"].includes(status)) {
    return res.status(400).json({ error: "status must be 'reviewed' or 'dismissed'" })
  }

  try {
    const report = await updateReportStatus(req.params.id, status)
    if (!report) return res.status(404).json({ error: "Report not found" })
    res.json({ message: "Report updated", report })
  } catch (err) {
    res.status(500).json({ error: "Failed to update report", detail: err.message })
  }
}

export const setUserVerified = async (req, res) => {
  const { is_verified } = req.body
  if (typeof is_verified !== "boolean") {
    return res.status(400).json({ error: "is_verified must be a boolean" })
  }

  try {
    const target = await findUserById(req.params.userId)
    if (!target) return res.status(404).json({ error: "User not found" })

    const updated = await updateUser(req.params.userId, { is_verified })
    res.json({
      message: is_verified ? "User verified" : "Verification removed",
      user: {
        id: updated.id,
        username: updated.username,
        is_verified: updated.is_verified,
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to update user", detail: err.message })
  }
}
