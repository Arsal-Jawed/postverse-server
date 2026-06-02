import { publishDueScheduledPosts, getPostByIdRaw } from "../models/post.model.js"
import { linkPostHashtags } from "../models/hashtag.model.js"
import { notifyMentions } from "../modules/notifyMentions.js"
import { extractHashtags } from "../modules/hashtags.js"
import { initThreadOnPost } from "../models/post.model.js"

const INTERVAL_MS = 60 * 1000

const finalizePublishedPost = async (post) => {
  if (!post?.id) return
  await initThreadOnPost(post.id)
  await linkPostHashtags(post.id, extractHashtags(post.content || ""))
  await notifyMentions({
    mentionerId: post.user_id,
    content: post.content || "",
    postId: post.id,
  })
}

export const runScheduledPublishJob = async () => {
  try {
    const published = await publishDueScheduledPosts()
    for (const row of published) {
      const full = await getPostByIdRaw(row.id)
      await finalizePublishedPost(full)
    }
    if (published.length) {
      console.log(`📅 Published ${published.length} scheduled post(s)`)
    }
  } catch (err) {
    console.error("❌ Scheduled publish job failed:", err.message)
  }
}

export const startScheduler = () => {
  void runScheduledPublishJob()
  setInterval(runScheduledPublishJob, INTERVAL_MS)
  console.log("⏰ Post scheduler started (checks every 60s)")
}
