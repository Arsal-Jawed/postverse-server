import { createNotification } from "../models/notification.model.js"
import { isBlocked } from "../models/block.model.js"

const safeNotify = async ({ user_id, actor_id, type, post_id = null, comment_id = null }) => {
  if (!user_id || !actor_id || user_id === actor_id) return
  if (await isBlocked(user_id, actor_id)) return
  await createNotification({ user_id, type, actor_id, post_id, comment_id })
}

export const notifyLike = async ({ postOwnerId, actorId, postId }) => {
  await safeNotify({ user_id: postOwnerId, actor_id: actorId, type: "like", post_id: postId })
}

export const notifyComment = async ({ postOwnerId, actorId, postId, commentId }) => {
  await safeNotify({
    user_id: postOwnerId,
    actor_id: actorId,
    type: "comment",
    post_id: postId,
    comment_id: commentId,
  })
}

export const notifyReply = async ({ parentAuthorId, actorId, postId, commentId }) => {
  await safeNotify({
    user_id: parentAuthorId,
    actor_id: actorId,
    type: "reply",
    post_id: postId,
    comment_id: commentId,
  })
}

export const notifyFollow = async ({ followedUserId, actorId }) => {
  await safeNotify({ user_id: followedUserId, actor_id: actorId, type: "follow" })
}

export const notifyRepost = async ({ originalAuthorId, actorId, postId }) => {
  await safeNotify({
    user_id: originalAuthorId,
    actor_id: actorId,
    type: "repost",
    post_id: postId,
  })
}
