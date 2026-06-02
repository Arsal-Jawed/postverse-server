// models/comment.model.js
import { query } from "../modules/db.js"

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
  await query(`
    ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
  `)
  console.log("✅ comments table ready")
}

export const getCommentById = async (id) => {
  const { rows } = await query(`SELECT * FROM comments WHERE id = $1`, [id])
  return rows[0] || null
}

/** Returns nesting depth of a comment (0 = top-level). */
export const getParentDepth = async (parentCommentId) => {
  if (!parentCommentId) return -1
  let depth = 0
  let current = await getCommentById(parentCommentId)
  if (!current) return -1
  while (current.parent_comment_id) {
    depth++
    current = await getCommentById(current.parent_comment_id)
  }
  return depth
}

export const createComment = async ({ post_id, user_id, content, parent_comment_id = null }) => {
  const sql = `
    INSERT INTO comments (post_id, user_id, content, parent_comment_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `
  const { rows } = await query(sql, [post_id, user_id, content, parent_comment_id])
  return rows[0]
}

export const enrichComment = async (comment) => {
  const sql = `
    SELECT c.*, u.username, u.avatar_url, u.is_verified, u.is_admin
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = $1
  `
  const { rows } = await query(sql, [comment.id])
  return rows[0] || comment
}

export const getCommentsByPost = async (post_id) => {
  const sql = `
    SELECT c.*, u.username, u.avatar_url, u.is_verified, u.is_admin
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
