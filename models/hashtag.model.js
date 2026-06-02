import { query } from "../modules/db.js"
import {
  postAggregateSelect,
  likedSelect,
  reactionSelect,
  visibilityWhere,
  publishedWhere,
} from "../modules/postQuery.js"
import { enrichPosts } from "../modules/postEnrich.js"

const postExtendedCols = `
  p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview
`

export const createHashtagsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS hashtags (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tag        VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS post_hashtags (
      post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
      PRIMARY KEY (post_id, hashtag_id)
    );
    CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(hashtag_id);
  `
  await query(sql)
  console.log("✅ hashtags tables ready")
}

export const upsertHashtag = async (tag) => {
  const normalized = tag.toLowerCase()
  const { rows } = await query(
    `INSERT INTO hashtags (tag) VALUES ($1)
     ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag
     RETURNING id, tag`,
    [normalized]
  )
  return rows[0]
}

export const linkPostHashtags = async (postId, tags) => {
  await query(`DELETE FROM post_hashtags WHERE post_id = $1`, [postId])
  for (const tag of tags) {
    const hashtag = await upsertHashtag(tag)
    await query(
      `INSERT INTO post_hashtags (post_id, hashtag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [postId, hashtag.id]
    )
  }
}

export const getPostsByHashtag = async (tag, { limit = 20, offset = 0, viewerId = null } = {}) => {
  const viewerParam = viewerId ? "$4" : null
  const params = viewerId ? [tag.toLowerCase(), limit, offset, viewerId] : [tag.toLowerCase(), limit, offset]

  const sql = `
    SELECT ${postAggregateSelect}, ${likedSelect(viewerParam)}, ${reactionSelect(viewerParam)}, ${postExtendedCols}
    FROM posts p
    JOIN users u ON u.id = p.user_id
    JOIN post_hashtags ph ON ph.post_id = p.id
    JOIN hashtags h ON h.id = ph.hashtag_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE h.tag = $1
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
    GROUP BY p.id, u.username, u.avatar_url, u.is_verified, u.is_admin,
      p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, params)
  return enrichPosts(rows, viewerId)
}

export const getTrendingHashtags = async ({ limit = 10, days = 7 } = {}) => {
  const sql = `
    SELECT h.tag, COUNT(ph.post_id)::INT AS post_count
    FROM hashtags h
    JOIN post_hashtags ph ON ph.hashtag_id = h.id
    JOIN posts p ON p.id = ph.post_id
    WHERE p.created_at >= NOW() - ($2 || ' days')::INTERVAL
      AND COALESCE(p.status, 'published') = 'published'
    GROUP BY h.id, h.tag
    ORDER BY post_count DESC, h.tag ASC
    LIMIT $1
  `
  const { rows } = await query(sql, [limit, days])
  return rows
}
