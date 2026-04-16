// models/post.model.js
import { query } from "../modules/db.js"

/**
 * Initialize the posts table in Neon (run once on startup).
 */
export const createPostsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS posts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT         NOT NULL,
      image_url   TEXT,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );
  `
  await query(sql)
  console.log("✅ posts table ready")
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export const createPost = async ({ user_id, content, image_url }) => {
  const sql = `
    INSERT INTO posts (user_id, content, image_url)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const { rows } = await query(sql, [user_id, content, image_url || null])
  return rows[0]
}

export const getAllPosts = async () => {
  const sql = `
    SELECT p.*, u.username, u.avatar_url,
           COUNT(DISTINCT l.id)::INT AS like_count,
           COUNT(DISTINCT c.id)::INT AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    GROUP BY p.id, u.username, u.avatar_url
    ORDER BY p.created_at DESC
  `
  const { rows } = await query(sql)
  return rows
}

export const getPostById = async (id) => {
  const sql = `
    SELECT p.*, u.username, u.avatar_url,
           COUNT(DISTINCT l.id)::INT AS like_count,
           COUNT(DISTINCT c.id)::INT AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.id = $1
    GROUP BY p.id, u.username, u.avatar_url
  `
  const { rows } = await query(sql, [id])
  return rows[0] || null
}

export const getPostsByUser = async (user_id) => {
  const sql = `
    SELECT p.*, u.username, u.avatar_url,
           COUNT(DISTINCT l.id)::INT AS like_count,
           COUNT(DISTINCT c.id)::INT AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.user_id = $1
    GROUP BY p.id, u.username, u.avatar_url
    ORDER BY p.created_at DESC
  `
  const { rows } = await query(sql, [user_id])
  return rows
}

export const updatePost = async (id, { content, image_url }) => {
  const sql = `
    UPDATE posts
    SET content    = COALESCE($1, content),
        image_url  = COALESCE($2, image_url),
        updated_at = NOW()
    WHERE id = $3
    RETURNING *
  `
  const { rows } = await query(sql, [content, image_url, id])
  return rows[0] || null
}

export const deletePost = async (id) => {
  const { rowCount } = await query("DELETE FROM posts WHERE id = $1", [id])
  return rowCount > 0
}
