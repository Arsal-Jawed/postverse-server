// models/like.model.js
import { query } from "../modules/db.js"

/**
 * Initialize the likes table in Neon (run once on startup).
 */
export const createLikesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS likes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (post_id, user_id)
    );
  `
  await query(sql)
  console.log("✅ likes table ready")
}

// ── Operations ──────────────────────────────────────────────────────────────

export const likePost = async ({ post_id, user_id }) => {
  const sql = `
    INSERT INTO likes (post_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (post_id, user_id) DO NOTHING
    RETURNING *
  `
  const { rows } = await query(sql, [post_id, user_id])
  return rows[0] || null // null = already liked
}

export const unlikePost = async ({ post_id, user_id }) => {
  const { rowCount } = await query(
    "DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
    [post_id, user_id]
  )
  return rowCount > 0
}

export const getLikesByPost = async (post_id) => {
  const { rows } = await query(
    "SELECT * FROM likes WHERE post_id = $1",
    [post_id]
  )
  return rows
}

export const hasUserLiked = async ({ post_id, user_id }) => {
  const { rows } = await query(
    "SELECT 1 FROM likes WHERE post_id = $1 AND user_id = $2",
    [post_id, user_id]
  )
  return rows.length > 0
}
