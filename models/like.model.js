// models/like.model.js
import { query } from "../modules/db.js"

export const REACTION_TYPES = ["like", "love", "laugh", "fire"]

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
  await query(`
    ALTER TABLE likes ADD COLUMN IF NOT EXISTS reaction_type VARCHAR(20) DEFAULT 'like';
    UPDATE likes SET reaction_type = 'like' WHERE reaction_type IS NULL;
  `)
  console.log("✅ likes table ready")
}

export const setReaction = async ({ post_id, user_id, reaction_type }) => {
  const existing = await getUserReaction({ post_id, user_id })

  if (existing === reaction_type) {
    await unlikePost({ post_id, user_id })
    return { removed: true, reaction_type: null }
  }

  const sql = `
    INSERT INTO likes (post_id, user_id, reaction_type)
    VALUES ($1, $2, $3)
    ON CONFLICT (post_id, user_id)
    DO UPDATE SET reaction_type = EXCLUDED.reaction_type, created_at = NOW()
    RETURNING *
  `
  const { rows } = await query(sql, [post_id, user_id, reaction_type])
  return { removed: false, reaction_type, like: rows[0] }
}

export const unlikePost = async ({ post_id, user_id }) => {
  const { rowCount } = await query(
    "DELETE FROM likes WHERE post_id = $1 AND user_id = $2",
    [post_id, user_id]
  )
  return rowCount > 0
}

export const getUserReaction = async ({ post_id, user_id }) => {
  const { rows } = await query(
    "SELECT reaction_type FROM likes WHERE post_id = $1 AND user_id = $2",
    [post_id, user_id]
  )
  return rows[0]?.reaction_type || null
}

export const getReactionCounts = async (post_id) => {
  const { rows } = await query(
    `SELECT reaction_type, COUNT(*)::INT AS count
     FROM likes WHERE post_id = $1
     GROUP BY reaction_type`,
    [post_id]
  )
  const counts = { like: 0, love: 0, laugh: 0, fire: 0, total: 0 }
  for (const row of rows) {
    counts[row.reaction_type] = row.count
    counts.total += row.count
  }
  return counts
}

export const getLikesByPost = async (post_id) => {
  const { rows } = await query("SELECT * FROM likes WHERE post_id = $1", [post_id])
  return rows
}

export const hasUserLiked = async ({ post_id, user_id }) => {
  const reaction = await getUserReaction({ post_id, user_id })
  return !!reaction
}
