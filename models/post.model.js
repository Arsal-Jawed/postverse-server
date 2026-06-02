// models/post.model.js
import { v4 as uuidv4 } from "uuid"
import { query } from "../modules/db.js"
import {
  postAggregateSelect,
  likedSelect,
  reactionSelect,
  visibilityWhere,
  publishedWhere,
  publishedOrOwnerWhere,
} from "../modules/postQuery.js"
import { enrichPosts } from "../modules/postEnrich.js"
import { feedScoreExpression } from "../modules/feedScore.js"
import { mutedWordsWhere } from "../modules/contentFilters.js"
import { blockFeedWhere, muteFeedWhere } from "../modules/socialSafety.js"

const postExtras = (viewerParam) =>
  `${likedSelect(viewerParam)}, ${reactionSelect(viewerParam)}`

const postExtendedCols = `
  p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview
`

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
  await query(`
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_of_id UUID REFERENCES posts(id) ON DELETE SET NULL;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_type VARCHAR(20);
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_id UUID;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS thread_position INT DEFAULT 1;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS link_preview JSONB;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_type VARCHAR(20);
    UPDATE posts SET status = 'published' WHERE status IS NULL;
  `)
  console.log("✅ posts table ready")
}

const postFromClause = `
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
`

const groupByClause = `GROUP BY p.id, u.username, u.avatar_url, u.is_verified, u.is_admin,
  p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview`

/** Feed shows thread starters only (position 1). */
const threadFeedFilter = `AND (p.thread_id IS NULL OR p.thread_position = 1)`

const baseSelect = (viewerParam) =>
  `SELECT ${postAggregateSelect}, ${postExtras(viewerParam)}, ${postExtendedCols}`

export const createPost = async ({
  user_id,
  content,
  image_url,
  visibility,
  repost_of_id = null,
  repost_type = null,
  thread_id = null,
  thread_position = 1,
  link_preview = null,
  status = "published",
  scheduled_at = null,
  media_type = null,
}) => {
  const sql = `
    INSERT INTO posts (
      user_id, content, image_url, visibility,
      repost_of_id, repost_type, thread_id, thread_position, link_preview,
      status, scheduled_at, media_type
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `
  const { rows } = await query(sql, [
    user_id,
    content,
    image_url || null,
    visibility || "public",
    repost_of_id,
    repost_type,
    thread_id,
    thread_position,
    link_preview ? JSON.stringify(link_preview) : null,
    status || "published",
    scheduled_at || null,
    media_type || null,
  ])
  return rows[0]
}

export const initThreadOnPost = async (postId) => {
  await query(
    `UPDATE posts SET thread_id = $1, thread_position = 1 WHERE id = $1`,
    [postId]
  )
}

export const getNextThreadPosition = async (threadId) => {
  const { rows } = await query(
    `SELECT COALESCE(MAX(thread_position), 0) + 1 AS next FROM posts WHERE thread_id = $1`,
    [threadId]
  )
  return rows[0].next
}

export const getForYouFeed = async ({
  limit = 10,
  offset = 0,
  viewerId = null,
  muted_words = [],
} = {}) => {
  const viewerParam = viewerId ? "$3" : null
  const mutedParam = viewerId ? "$4" : "$3"
  const params = viewerId
    ? [limit, offset, viewerId, muted_words || []]
    : [limit, offset, muted_words || []]

  const sql = `
    SELECT * FROM (
      SELECT ${postAggregateSelect}, ${postExtras(viewerParam)}, ${postExtendedCols},
        ${feedScoreExpression(viewerParam)}
      ${postFromClause}
      WHERE 1=1
      ${threadFeedFilter}
      ${publishedWhere}
      ${visibilityWhere(viewerParam)}
      ${blockFeedWhere(viewerParam)}
      ${muteFeedWhere(viewerParam)}
      ${mutedWordsWhere("p.content", mutedParam)}
      ${groupByClause}
    ) ranked
    ORDER BY feed_score DESC, created_at DESC
    LIMIT $1 OFFSET $2
  `
  const { rows } = await query(sql, params)
  return enrichPosts(rows, viewerId)
}

export const getForYouFeedCount = async (viewerId = null, muted_words = []) => {
  const viewerParam = viewerId ? "$1" : null
  const mutedParam = viewerId ? "$2" : "$1"
  const params = viewerId ? [viewerId, muted_words || []] : [muted_words || []]

  const sql = `
    SELECT COUNT(DISTINCT p.id)::INT AS total
    ${postFromClause}
    WHERE 1=1
    ${threadFeedFilter}
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
    ${blockFeedWhere(viewerParam)}
    ${muteFeedWhere(viewerParam)}
    ${mutedWordsWhere("p.content", mutedParam)}
  `
  const { rows } = await query(sql, params)
  return rows[0].total
}

export const getAllPosts = async ({ limit = 10, offset = 0, viewerId = null } = {}) => {
  const viewerParam = viewerId ? "$3" : null
  const params = viewerId ? [limit, offset, viewerId] : [limit, offset]

  const sql = `
    ${baseSelect(viewerParam)}
    ${postFromClause}
    WHERE 1=1
    ${threadFeedFilter}
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
    ${blockFeedWhere(viewerParam)}
    ${muteFeedWhere(viewerParam)}
    ${groupByClause}
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
  `
  const { rows } = await query(sql, params)
  return enrichPosts(rows, viewerId)
}

export const getTotalPostCount = async (viewerId = null) => {
  const viewerParam = viewerId ? "$1" : null
  const params = viewerId ? [viewerId] : []

  const sql = `
    SELECT COUNT(DISTINCT p.id)::INT AS total
    ${postFromClause}
    WHERE 1=1
    ${threadFeedFilter}
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
    ${blockFeedWhere(viewerParam)}
    ${muteFeedWhere(viewerParam)}
  `
  const { rows } = await query(sql, params)
  return rows[0].total
}

export const getPostById = async (id, viewerId = null) => {
  const viewerParam = viewerId ? "$2" : null
  const params = viewerId ? [id, viewerId] : [id]

  const sql = `
    ${baseSelect(viewerParam)}
    ${postFromClause}
    WHERE p.id = $1
    ${publishedOrOwnerWhere(viewerParam)}
    ${visibilityWhere(viewerParam)}
    ${groupByClause}
  `
  const { rows } = await query(sql, params)
  const enriched = await enrichPosts(rows, viewerId)
  return enriched[0] || null
}

/** Fetch post by id without published filter (author tools / scheduler). */
export const getPostByIdRaw = async (id) => {
  const sql = `SELECT p.*, u.username, u.avatar_url, u.is_verified, u.is_admin
    FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = $1`
  const { rows } = await query(sql, [id])
  return rows[0] || null
}

export const getPostsByUser = async (user_id, { limit = 10, offset = 0, viewerId = null } = {}) => {
  const viewerParam = viewerId ? "$4" : null
  const params = viewerId ? [user_id, limit, offset, viewerId] : [user_id, limit, offset]

  const sql = `
    ${baseSelect(viewerParam)}
    ${postFromClause}
    WHERE p.user_id = $1
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
    ${groupByClause}
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, params)
  return enrichPosts(rows, viewerId)
}

export const getThreadPosts = async (threadId, viewerId = null) => {
  const viewerParam = viewerId ? "$2" : null
  const params = viewerId ? [threadId, viewerId] : [threadId]

  const sql = `
    ${baseSelect(viewerParam)}
    ${postFromClause}
    WHERE p.thread_id = $1
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
    ${groupByClause}
    ORDER BY p.thread_position ASC, p.created_at ASC
  `
  const { rows } = await query(sql, params)
  return enrichPosts(rows, viewerId)
}

export const getTotalUserPostCount = async (user_id, viewerId = null) => {
  const viewerParam = viewerId ? "$2" : null
  const params = viewerId ? [user_id, viewerId] : [user_id]

  const sql = `
    SELECT COUNT(DISTINCT p.id)::INT AS total
    ${postFromClause}
    WHERE p.user_id = $1
    ${publishedWhere}
    ${visibilityWhere(viewerParam)}
  `
  const { rows } = await query(sql, params)
  return rows[0].total
}

export const updatePost = async (
  id,
  { content, image_url, visibility, link_preview, status, scheduled_at, media_type },
) => {
  const sets = ["updated_at = NOW()"]
  const vals = []
  let i = 1

  const add = (col, val) => {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`)
      vals.push(val)
    }
  }

  add("content", content ?? undefined)
  add("image_url", image_url ?? undefined)
  add("visibility", visibility ?? undefined)
  if (link_preview !== undefined) {
    sets.push(`link_preview = $${i++}`)
    vals.push(link_preview ? JSON.stringify(link_preview) : null)
  }
  add("status", status ?? undefined)
  add("scheduled_at", scheduled_at ?? undefined)
  add("media_type", media_type ?? undefined)

  vals.push(id)
  const sql = `UPDATE posts SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`
  const { rows } = await query(sql, vals)
  return rows[0] || null
}

const authorPostsBase = (viewerParam) => `
  SELECT ${postAggregateSelect}, ${likedSelect(viewerParam)}, ${reactionSelect(viewerParam)}, ${postExtendedCols}
  ${postFromClause}
  WHERE p.user_id = $1
`

const authorGroupBy = `GROUP BY p.id, u.username, u.avatar_url, u.is_verified, u.is_admin,
    p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview`

export const getDraftsByUser = async (user_id, { limit = 50, offset = 0 } = {}) => {
  const sql = `
    ${authorPostsBase("$4")}
    AND p.status = 'draft'
    ${authorGroupBy}
    ORDER BY p.updated_at DESC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, [user_id, limit, offset, user_id])
  return enrichPosts(rows, user_id)
}

export const getScheduledByUser = async (user_id, { limit = 50, offset = 0 } = {}) => {
  const sql = `
    ${authorPostsBase("$4")}
    AND p.status = 'scheduled'
    AND p.scheduled_at > NOW()
    ${authorGroupBy}
    ORDER BY p.scheduled_at ASC
    LIMIT $2 OFFSET $3
  `
  const { rows } = await query(sql, [user_id, limit, offset, user_id])
  return enrichPosts(rows, user_id)
}

export const publishDueScheduledPosts = async () => {
  const { rows } = await query(
    `UPDATE posts
     SET status = 'published', scheduled_at = NULL, created_at = NOW(), updated_at = NOW()
     WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= NOW()
     RETURNING id, user_id, content`,
  )
  return rows
}

export const markPostPublished = async (id) => {
  const { rows } = await query(
    `UPDATE posts
     SET status = 'published', scheduled_at = NULL, created_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  )
  return rows[0] || null
}

export const cancelScheduledPost = async (id, user_id) => {
  const { rows } = await query(
    `UPDATE posts
     SET status = 'draft', scheduled_at = NULL, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 AND status = 'scheduled'
     RETURNING *`,
    [id, user_id],
  )
  return rows[0] || null
}

export const deletePost = async (id) => {
  const { rowCount } = await query("DELETE FROM posts WHERE id = $1", [id])
  return rowCount > 0
}

export const enrichPost = async (post, viewerId = null) => {
  if (!post?.id) return post
  return getPostById(post.id, viewerId)
}

export const createRepost = async ({
  user_id,
  original_post_id,
  repost_type,
  content = "",
  visibility = "public",
}) => {
  const original = await getPostById(original_post_id, user_id)
  if (!original) return null

  const postContent =
    repost_type === "quote" ? content : content.trim() || "Reposted"

  const created = await createPost({
    user_id,
    content: postContent,
    image_url: null,
    visibility,
    repost_of_id: original_post_id,
    repost_type,
  })

  return enrichPost(created, user_id)
}
