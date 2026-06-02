import { query } from "./db.js"
import { getPollsByPostIds } from "../models/poll.model.js"
import { postAggregateSelect, likedSelect, reactionSelect, visibilityWhere } from "./postQuery.js"

const postFromClause = `
  FROM posts p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN likes l ON l.post_id = p.id
  LEFT JOIN comments c ON c.post_id = p.id
`

const groupByClause = `GROUP BY p.id, u.username, u.avatar_url, u.is_verified, u.is_admin`

const postExtras = (viewerParam) =>
  `${likedSelect(viewerParam)}, ${reactionSelect(viewerParam)}`

/** Fetch a single post card by id with aggregates (no visibility filter). */
export const fetchPostCard = async (postId, viewerId = null) => {
  const viewerParam = viewerId ? "$2" : null
  const params = viewerId ? [postId, viewerId] : [postId]
  const sql = `
    SELECT ${postAggregateSelect}, ${postExtras(viewerParam)},
           p.repost_of_id, p.repost_type, p.thread_id, p.thread_position, p.link_preview
    ${postFromClause}
    WHERE p.id = $1
    ${groupByClause}
  `
  const { rows } = await query(sql, params)
  return rows[0] || null
}

const getThreadCounts = async (threadIds) => {
  if (!threadIds.length) return {}
  const { rows } = await query(
    `SELECT thread_id, COUNT(*)::INT AS total FROM posts
     WHERE thread_id = ANY($1::uuid[]) GROUP BY thread_id`,
    [threadIds]
  )
  return Object.fromEntries(rows.map((r) => [r.thread_id, r.total]))
}

export const enrichPosts = async (posts, viewerId = null) => {
  if (!posts?.length) return []

  const postIds = posts.map((p) => p.id)
  const repostIds = posts.filter((p) => p.repost_of_id).map((p) => p.repost_of_id)
  const threadIds = [...new Set(posts.filter((p) => p.thread_id).map((p) => p.thread_id))]

  const [pollsMap, threadCounts] = await Promise.all([
    getPollsByPostIds(postIds, viewerId),
    getThreadCounts(threadIds),
  ])

  let repostMap = {}
  if (repostIds.length) {
    const repostPosts = await Promise.all(repostIds.map((id) => fetchPostCard(id, viewerId)))
    repostMap = Object.fromEntries(
      repostIds.map((id, i) => [id, repostPosts[i]]).filter(([, p]) => p)
    )
  }

  return posts.map((p) => ({
    ...p,
    link_preview: typeof p.link_preview === "string" ? JSON.parse(p.link_preview) : p.link_preview,
    poll: pollsMap[p.id] || null,
    reposted_post: p.repost_of_id ? repostMap[p.repost_of_id] || null : null,
    thread_total: p.thread_id ? threadCounts[p.thread_id] || 1 : null,
  }))
}
