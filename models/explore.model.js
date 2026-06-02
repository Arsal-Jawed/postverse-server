// models/explore.model.js
import { query } from "../modules/db.js"

/**
 * Trending posts: scored by likes + comments over the last 48 hours.
 * Falls back gracefully to all-time if the window is empty.
 * Supports pagination via limit + offset.
 */
export const getTrendingPosts = async ({ limit = 10, offset = 0, hours = 48 } = {}) => {
  const sql = `
    SELECT
      p.*,
      u.username,
      u.avatar_url,
      COUNT(DISTINCT l.id)::INT                          AS like_count,
      COUNT(DISTINCT c.id)::INT                          AS comment_count,
      (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT c.id)) AS trend_score
    FROM posts p
    JOIN  users    u ON u.id      = p.user_id
    LEFT JOIN likes    l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.created_at >= NOW() - ($3 || ' hours')::INTERVAL
    GROUP BY p.id, u.username, u.avatar_url
    ORDER BY trend_score DESC, p.created_at DESC
    LIMIT $1 OFFSET $2
  `
  let { rows } = await query(sql, [limit, offset, hours])

  // Fallback: if no posts in the time window, return all-time trending
  if (rows.length === 0) {
    const fallback = `
      SELECT
        p.*,
        u.username,
        u.avatar_url,
        COUNT(DISTINCT l.id)::INT                          AS like_count,
        COUNT(DISTINCT c.id)::INT                          AS comment_count,
        (COUNT(DISTINCT l.id) * 2 + COUNT(DISTINCT c.id)) AS trend_score
      FROM posts p
      JOIN  users    u ON u.id      = p.user_id
      LEFT JOIN likes    l ON l.post_id = p.id
      LEFT JOIN comments c ON c.post_id = p.id
      GROUP BY p.id, u.username, u.avatar_url
      ORDER BY trend_score DESC, p.created_at DESC
      LIMIT $1 OFFSET $2
    `
    const result = await query(fallback, [limit, offset])
    rows = result.rows
  }

  return rows
}

/**
 * Suggested users to follow — users with the most followers
 * that the current user does NOT already follow.
 * Pass viewer_id = null to get global suggestions.
 */
export const getSuggestedUsers = async ({ viewer_id = null, limit = 5 } = {}) => {
  const sql = `
    SELECT
      u.id, u.username, u.avatar_url, u.bio,
      COUNT(f.follower_id)::INT AS followers_count
    FROM users u
    LEFT JOIN followers f ON f.following_id = u.id
    WHERE u.id <> COALESCE($1::UUID, u.id)   -- exclude self when logged in
      AND (
        $1 IS NULL
        OR u.id NOT IN (
          SELECT following_id FROM followers WHERE follower_id = $1
        )
      )
    GROUP BY u.id
    ORDER BY followers_count DESC
    LIMIT $2
  `
  const { rows } = await query(sql, [viewer_id, limit])
  return rows
}
