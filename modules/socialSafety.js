import { isBlocked } from "../models/block.model.js"

/** Hide posts from blocked users (both directions) in feeds. */
export const blockFeedWhere = (viewerParam) => {
  if (!viewerParam) return ""
  return `
    AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = ${viewerParam} AND b.blocked_id = p.user_id)
         OR (b.blocker_id = p.user_id AND b.blocked_id = ${viewerParam})
    )
  `
}

/** Hide posts from muted users in feeds only. */
export const muteFeedWhere = (viewerParam) => {
  if (!viewerParam) return ""
  return `
    AND NOT EXISTS (
      SELECT 1 FROM mutes m
      WHERE m.muter_id = ${viewerParam} AND m.muted_id = p.user_id
    )
  `
}

export const assertNotBlocked = async (userA, userB, message = "Action not allowed") => {
  if (await isBlocked(userA, userB)) {
    const err = new Error(message)
    err.status = 403
    throw err
  }
}
