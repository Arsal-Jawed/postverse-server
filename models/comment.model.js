// models/comment.model.js
import { query } from "../modules/db.js"

/**
 * Initialize the comments table in Neon (run once on startup).
 */
export const createCommentsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS comments (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content    TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `
  await query(sql)
  console.log("✅ comments table ready")
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export const createComment = async ({ post_id, user_id, content }) => {
  const sql = `
    INSERT INTO comments (post_id, user_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const { rows } = await query(sql, [post_id, user_id, content])
  return rows[0]
}

export const getCommentsByPost = async (post_id) => {
  const sql = `
    SELECT c.*, u.username, u.avatar_url
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = $1
    ORDER BY c.created_at ASC
  `
  const { rows } = await query(sql, [post_id])
  return rows
}

export const updateComment = async (id, content) => {
  const sql = `
    UPDATE comments
    SET content = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `
  const { rows } = await query(sql, [content, id])
  return rows[0] || null
}

export const deleteComment = async (id) => {
  const { rowCount } = await query("DELETE FROM comments WHERE id = $1", [id])
  return rowCount > 0
}
