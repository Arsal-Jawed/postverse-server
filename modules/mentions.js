import { query } from "./db.js"

const MENTION_REGEX = /@([a-zA-Z0-9_]{2,30})/g

export const extractMentionUsernames = (text) => {
  if (!text) return []
  const matches = [...text.matchAll(MENTION_REGEX)]
  return [...new Set(matches.map((m) => m[1].toLowerCase()))]
}

export const findUsersByUsernames = async (usernames) => {
  if (!usernames.length) return []
  const { rows } = await query(
    `SELECT id, username FROM users WHERE LOWER(username) = ANY($1::text[])`,
    [usernames]
  )
  return rows
}

export const syncMentions = async ({ mentionerId, usernames, postId = null, commentId = null }) => {
  const users = await findUsersByUsernames(usernames)
  const targets = users.filter((u) => u.id !== mentionerId)

  for (const user of targets) {
    await query(
      `INSERT INTO mentions (mentioned_user_id, mentioner_user_id, post_id, comment_id)
       VALUES ($1, $2, $3, $4)`,
      [user.id, mentionerId, postId, commentId]
    )
  }

  return targets
}
