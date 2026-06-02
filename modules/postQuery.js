/** Shared SELECT / WHERE fragments for post feeds with privacy + liked state. */

export const postAggregateSelect = `
  p.*,
  u.username,
  u.avatar_url,
  u.is_verified,
  u.is_admin,
  COUNT(DISTINCT l.id)::INT AS like_count,
  COUNT(DISTINCT c.id)::INT AS comment_count
`

export const reactionSelect = (viewerParam) =>
  viewerParam
    ? `(
        SELECT lk.reaction_type FROM likes lk
        WHERE lk.post_id = p.id AND lk.user_id = ${viewerParam}
        LIMIT 1
      ) AS user_reaction`
    : `NULL::text AS user_reaction`

export const likedSelect = (viewerParam) =>
  viewerParam
    ? `EXISTS(SELECT 1 FROM likes lk WHERE lk.post_id = p.id AND lk.user_id = ${viewerParam}) AS liked`
    : `FALSE AS liked`

const publishedCondition = `
  COALESCE(p.status, 'published') = 'published'
  AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())
`

/** Only posts visible in public feeds (published, not future-scheduled). */
export const publishedWhere = `AND ${publishedCondition}`

/** Single-post fetch: published posts or any post owned by the viewer (drafts/scheduled). */
export const publishedOrOwnerWhere = (viewerParam) => {
  if (!viewerParam) return publishedWhere
  return `AND ((${publishedCondition}) OR p.user_id = ${viewerParam})`
}

/** Restricts which posts a viewer may see based on account + post visibility. */
export const visibilityWhere = (viewerParam) => {
  if (!viewerParam) {
    return `AND u.is_private = FALSE AND COALESCE(p.visibility, 'public') = 'public'`
  }

  return `
    AND (
      p.user_id = ${viewerParam}
      OR (
        (
          u.is_private = FALSE
          OR EXISTS (
            SELECT 1 FROM followers f
            WHERE f.follower_id = ${viewerParam} AND f.following_id = u.id
          )
        )
        AND (
          COALESCE(p.visibility, 'public') = 'public'
          OR (
            COALESCE(p.visibility, 'public') = 'followers'
            AND EXISTS (
              SELECT 1 FROM followers f
              WHERE f.follower_id = ${viewerParam} AND f.following_id = p.user_id
            )
          )
        )
      )
    )
  `
}
