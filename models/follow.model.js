// models/follow.model.js
import { query } from "../modules/db.js"
import {
  postAggregateSelect,
  likedSelect,
  reactionSelect,
  visibilityWhere,
  publishedWhere,
} from "../modules/postQuery.js"
import { enrichPosts } from "../modules/postEnrich.js"
import { blockFeedWhere, muteFeedWhere } from "../modules/socialSafety.js"

const postExtendedCols = `
  p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview
`
const threadFeedFilter = `AND (p.thread_id IS NULL OR p.thread_position = 1)`

/**
 * Initialize the followers table in Neon (run once on startup).
 */
export const createFollowersTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS followers (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (follower_id, following_id),
      CHECK (follower_id <> following_id)
    );
    CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
    CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);
  `
  await query(sql)
  console.log("✅ followers table ready")
}

// ── Operations ──────────────────────────────────────────────────────────────

export const followUser = async ({ follower_id, following_id }) => {
  const sql = `
    INSERT INTO followers (follower_id, following_id)
    VALUES ($1, $2)
    ON CONFLICT (follower_id, following_id) DO NOTHING
    RETURNING *
  `
  const { rows } = await query(sql, [follower_id, following_id])
  return rows[0] || null
}

export const unfollowUser = async ({ follower_id, following_id }) => {
  const { rowCount } = await query(
    "DELETE FROM followers WHERE follower_id = $1 AND following_id = $2",
    [follower_id, following_id]
  )
  return rowCount > 0
}

export const isFollowing = async ({ follower_id, following_id }) => {
  const { rows } = await query(
    "SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2",
    [follower_id, following_id]
  )
  return rows.length > 0
}

export const getFollowing = async (user_id) => {
  const sql = `
    SELECT u.id, u.username, u.avatar_url, u.bio, u.is_verified, u.is_admin, f.created_at AS followed_at
    FROM followers f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = $1
    ORDER BY f.created_at DESC
  `
  const { rows } = await query(sql, [user_id])
  return rows
}

export const getFollowers = async (user_id) => {
  const sql = `
    SELECT u.id, u.username, u.avatar_url, u.bio, u.is_verified, u.is_admin, f.created_at AS followed_at
    FROM followers f
    JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = $1
    ORDER BY f.created_at DESC
  `
  const { rows } = await query(sql, [user_id])
  return rows
}

export const getFollowCounts = async (user_id) => {
  const sql = `
    SELECT
      (SELECT COUNT(*) FROM followers WHERE following_id = $1)::INT AS followers_count,
      (SELECT COUNT(*) FROM followers WHERE follower_id  = $1)::INT AS following_count
  `
  const { rows } = await query(sql, [user_id])
  return rows[0]
}

export const getFollowingFeed = async (user_id, { limit = 50, offset = 0 } = {}) => {
  const sql = `
    SELECT ${postAggregateSelect}, ${likedSelect("$4")}, ${reactionSelect("$4")}, ${postExtendedCols}
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE p.user_id IN (
      SELECT following_id FROM followers WHERE follower_id = $1
    )
    ${threadFeedFilter}
    ${publishedWhere}
    ${visibilityWhere("$4")}
    ${blockFeedWhere("$4")}
    ${muteFeedWhere("$4")}
    GROUP BY p.id, u.username, u.avatar_url, u.is_verified, u.is_admin,
      p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, [user_id, limit, offset, user_id])
  return enrichPosts(rows, user_id)
}

export const getFollowingFeedCount = async (user_id) => {
  const sql = `
    SELECT COUNT(DISTINCT p.id)::INT AS total
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id IN (
      SELECT following_id FROM followers WHERE follower_id = $1
    )
    ${threadFeedFilter}
    ${publishedWhere}
    ${visibilityWhere("$2")}
    ${blockFeedWhere("$2")}
    ${muteFeedWhere("$2")}
  `
  const { rows } = await query(sql, [user_id, user_id])
  return rows[0].total
}
