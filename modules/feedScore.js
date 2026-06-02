/**
 * For You feed ranking formula (higher = shown earlier):
 *
 *   score = recencyScore + engagementScore + followBoost + exploreRandom
 *
 *   recencyScore    = 40 * exp(-ageHours / 24)     — full weight at post time, ~half at 24h
 *   engagementScore = 2 * likes24h + 3 * comments24h — reactions in the last 24 hours
 *   followBoost     = 25 if the viewer follows the author, else 0
 *   exploreRandom   = random() * 15                  — small shuffle so feeds aren't static
 *
 * Feed reason (first match wins):
 *   1. Viewer follows author → "Because you follow @username"
 *   2. engagement24h >= 5   → "Popular in the last 24 hours"
 *   3. Otherwise            → "Suggested for you"
 */

export const feedScoreExpression = (viewerParam) => `
  (
    40 * EXP(-EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0)
    + 2 * COALESCE((
        SELECT COUNT(*)::INT FROM likes lk
        WHERE lk.post_id = p.id AND lk.created_at > NOW() - INTERVAL '24 hours'
      ), 0)
    + 3 * COALESCE((
        SELECT COUNT(*)::INT FROM comments cm
        WHERE cm.post_id = p.id AND cm.created_at > NOW() - INTERVAL '24 hours'
      ), 0)
    + ${
      viewerParam
        ? `CASE WHEN EXISTS (
             SELECT 1 FROM followers f
             WHERE f.follower_id = ${viewerParam} AND f.following_id = p.user_id
           ) THEN 25 ELSE 0 END`
        : "0"
    }
    + (random() * 15)
  ) AS feed_score,
  COALESCE((
    SELECT COUNT(*)::INT FROM likes lk
    WHERE lk.post_id = p.id AND lk.created_at > NOW() - INTERVAL '24 hours'
  ), 0) + COALESCE((
    SELECT COUNT(*)::INT FROM comments cm
    WHERE cm.post_id = p.id AND cm.created_at > NOW() - INTERVAL '24 hours'
  ), 0) AS engagement_24h,
  ${
    viewerParam
      ? `EXISTS (
           SELECT 1 FROM followers f
           WHERE f.follower_id = ${viewerParam} AND f.following_id = p.user_id
         ) AS is_following_author`
      : "FALSE AS is_following_author"
  }
`

export const attachFeedReasons = (posts) =>
  posts.map((post) => {
    let feed_reason = "Suggested for you"
    if (post.is_following_author) {
      feed_reason = `Because you follow @${post.username}`
    } else if ((post.engagement_24h || 0) >= 5) {
      feed_reason = "Popular in the last 24 hours"
    }
    const { feed_score, engagement_24h, is_following_author, ...rest } = post
    return { ...rest, feed_reason }
  })
