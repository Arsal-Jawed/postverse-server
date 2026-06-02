import { query } from "../modules/db.js"

export const createNotificationsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS notifications (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type       VARCHAR(30) NOT NULL,
      actor_id   UUID REFERENCES users(id) ON DELETE SET NULL,
      post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
      comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      read       BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
  `
  await query(sql)
  console.log("✅ notifications table ready")
}

export const createNotification = async ({
  user_id,
  type,
  actor_id = null,
  post_id = null,
  comment_id = null,
}) => {
  const sql = `
    INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `
  const { rows } = await query(sql, [user_id, type, actor_id, post_id, comment_id])
  return rows[0]
}

export const getNotificationsForUser = async (user_id, { limit = 30, offset = 0 } = {}) => {
  const sql = `
    SELECT n.*,
           a.username AS actor_username,
           a.avatar_url AS actor_avatar_url
    FROM notifications n
    LEFT JOIN users a ON a.id = n.actor_id
    WHERE n.user_id = $1
    ORDER BY n.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, [user_id, limit, offset])
  return rows
}

export const getUnreadCount = async (user_id) => {
  const { rows } = await query(
    `SELECT COUNT(*)::INT AS count FROM notifications WHERE user_id = $1 AND read = FALSE`,
    [user_id]
  )
  return rows[0].count
}

export const markNotificationsRead = async (user_id, ids = null) => {
  if (ids?.length) {
    const { rowCount } = await query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND id = ANY($2::uuid[])`,
      [user_id, ids]
    )
    return rowCount
  }
  const { rowCount } = await query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
    [user_id]
  )
  return rowCount
}
