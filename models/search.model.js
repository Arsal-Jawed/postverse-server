// models/search.model.js
import { query } from "../modules/db.js"

/**
 * Search users by username (case-insensitive partial match)
 */
export const searchUsers = async (q) => {
  const sql = `
    SELECT
      u.id, u.username, u.avatar_url, u.bio,
      (SELECT COUNT(*)::INT FROM followers WHERE following_id = u.id) AS followers_count,
      (SELECT COUNT(*)::INT FROM followers WHERE follower_id  = u.id) AS following_count
    FROM users u
    WHERE u.username ILIKE $1
    ORDER BY u.username
    LIMIT 20
  `
  const { rows } = await query(sql, [`%${q}%`])
  return rows
}

/**
 * Search posts by content or author username (case-insensitive partial match)
 * Supports pagination via limit + offset
 */
export const searchPosts = async (q, { limit = 10, offset = 0 } = {}) => {
  const sql = `
    SELECT p.*, u.username, u.avatar_url,
           COUNT(DISTINCT l.id)::INT AS like_count,
           COUNT(DISTINCT c.id)::INT AS comment_count
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l    ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.content ILIKE $1
       OR u.username ILIKE $1
    GROUP BY p.id, u.username, u.avatar_url
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, [`%${q}%`, limit, offset])
  return rows
}
