import { query } from "../modules/db.js"

export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate",
  "misinformation",
  "violence",
  "other",
]

export const createReportsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS reports (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      reason      VARCHAR(50) NOT NULL,
      details     TEXT,
      status      VARCHAR(20) DEFAULT 'pending',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ,
      UNIQUE (reporter_id, post_id)
    );
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
  `)
  console.log("✅ reports table ready")
}

export const createReport = async ({ reporter_id, post_id, reason, details }) => {
  const { rows } = await query(
    `INSERT INTO reports (reporter_id, post_id, reason, details)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (reporter_id, post_id) DO UPDATE
       SET reason = EXCLUDED.reason, details = EXCLUDED.details, status = 'pending', created_at = NOW()
     RETURNING *`,
    [reporter_id, post_id, reason, details || null],
  )
  return rows[0]
}

export const getReportsQueue = async ({ limit = 50, offset = 0, status = "pending" } = {}) => {
  const sql = `
    SELECT r.*,
           rep.username AS reporter_username,
           pu.username AS post_author_username,
           p.content AS post_content_snippet
    FROM reports r
    JOIN users rep ON rep.id = r.reporter_id
    JOIN posts p ON p.id = r.post_id
    JOIN users pu ON pu.id = p.user_id
    WHERE ($3::text IS NULL OR r.status = $3)
    ORDER BY r.created_at DESC
    LIMIT $1 OFFSET $2
  `
  const { rows } = await query(sql, [limit, offset, status || null])
  return rows.map((r) => ({
    ...r,
    post_content_snippet: (r.post_content_snippet || "").slice(0, 200),
  }))
}

export const updateReportStatus = async (id, status) => {
  const { rows } = await query(
    `UPDATE reports SET status = $2, reviewed_at = NOW() WHERE id = $1 RETURNING *`,
    [id, status],
  )
  return rows[0] || null
}
