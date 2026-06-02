import { extractMentionUsernames, syncMentions } from "./mentions.js"
import { createNotification } from "../models/notification.model.js"

export const notifyMentions = async ({ mentionerId, content, postId = null, commentId = null }) => {
  const usernames = extractMentionUsernames(content)
  if (!usernames.length) return []

  const targets = await syncMentions({
    mentionerId,
    usernames,
    postId,
    commentId,
  })

  for (const target of targets) {
    await createNotification({
      user_id: target.id,
      type: "mention",
      actor_id: mentionerId,
      post_id: postId,
      comment_id: commentId,
    })
  }

  return targets
}
