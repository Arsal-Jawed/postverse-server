// controllers/post.controller.js
import {
  createPost,
  getAllPosts,
  getPostById,
  getPostsByUser,
  updatePost,
  deletePost,
  getTotalPostCount,
  getTotalUserPostCount,
  enrichPost,
  initThreadOnPost,
  getNextThreadPosition,
  getThreadPosts,
  createRepost,
  getDraftsByUser,
  getScheduledByUser,
  getPostByIdRaw,
  markPostPublished,
  cancelScheduledPost,
  getForYouFeed,
  getForYouFeedCount,
} from "../models/post.model.js"
import { getFollowingFeed, getFollowingFeedCount } from "../models/follow.model.js"
import { findUserById } from "../models/user.model.js"
import { linkPostHashtags } from "../models/hashtag.model.js"
import { createPollForPost } from "../models/poll.model.js"
import { extractHashtags } from "../modules/hashtags.js"
import { notifyMentions } from "../modules/notifyMentions.js"
import { extractFirstUrl, fetchLinkPreview } from "../modules/linkPreview.js"
import { requireFields } from "../modules/validate.js"
import { attachFeedReasons } from "../modules/feedScore.js"
import {
  applySpoilerFlags,
  filterPostsByMutedWords,
  normalizeMutedWords,
} from "../modules/contentFilters.js"
import { isBlocked } from "../models/block.model.js"
import { isMuted } from "../models/mute.model.js"
import { notifyRepost } from "../modules/notifyEvents.js"

const parsePagination = (query) => ({
  limit: Math.min(parseInt(query.limit) || 10, 50),
  offset: parseInt(query.offset) || 0,
})

const buildLinkPreview = async (body) => {
  if (body.link_preview) return body.link_preview
  const url = body.preview_url || extractFirstUrl(body.content)
  if (!url) return null
  return fetchLinkPreview(url)
}

const attachPoll = async (postId, pollBody) => {
  if (!pollBody?.question || !pollBody?.options?.length) return
  const options = pollBody.options.filter((o) => String(o).trim()).slice(0, 4)
  if (options.length < 2) throw new Error("Polls need at least 2 options")
  await createPollForPost(postId, {
    question: pollBody.question,
    options,
    ends_at: pollBody.ends_at || null,
  })
}

const finalizeNewPost = async (postId, userId, content, pollBody) => {
  await linkPostHashtags(postId, extractHashtags(content || ""))
  await notifyMentions({
    mentionerId: userId,
    content: content || "",
    postId,
  })
  if (pollBody) await attachPoll(postId, pollBody)
}

const resolvePostStatus = (body) => {
  if (body.status === "draft") return { status: "draft", scheduled_at: null }
  if (body.scheduled_at) {
    const at = new Date(body.scheduled_at)
    if (Number.isNaN(at.getTime())) throw new Error("Invalid scheduled_at")
    if (at <= new Date()) throw new Error("scheduled_at must be in the future")
    return { status: "scheduled", scheduled_at: at.toISOString() }
  }
  return { status: "published", scheduled_at: null }
}

// ── POST /api/posts/preview-link ────────────────────────────────────────────
export const previewLink = async (req, res) => {
  const url = req.body.url || extractFirstUrl(req.body.content)
  if (!url) return res.status(400).json({ error: "URL is required" })

  try {
    const preview = await fetchLinkPreview(url)
    if (!preview) return res.status(400).json({ error: "Could not fetch link preview" })
    res.json({ preview })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch preview", detail: err.message })
  }
}

// ── POST /api/posts/repost ──────────────────────────────────────────────────
export const repost = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["post_id", "repost_type"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  const { post_id, repost_type, content } = req.body
  if (!["simple", "quote"].includes(repost_type)) {
    return res.status(400).json({ error: "repost_type must be 'simple' or 'quote'" })
  }
  if (repost_type === "quote" && !content?.trim()) {
    return res.status(400).json({ error: "Quote repost requires a comment" })
  }

  try {
    const post = await createRepost({
      user_id: req.user.id,
      original_post_id: post_id,
      repost_type,
      content: content || "",
      visibility: req.body.visibility || "public",
    })
    if (!post) return res.status(404).json({ error: "Original post not found" })

    const original = await getPostByIdRaw(post_id)
    if (original) {
      await notifyRepost({
        originalAuthorId: original.user_id,
        actorId: req.user.id,
        postId: original.id,
      })
    }

    if (content) {
      await linkPostHashtags(post.id, extractHashtags(content))
      await notifyMentions({ mentionerId: req.user.id, content, postId: post.id })
    }

    res.status(201).json({ message: "Reposted successfully", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to repost", detail: err.message })
  }
}

// ── GET /api/posts/thread/:threadId ─────────────────────────────────────────
export const getThread = async (req, res) => {
  try {
    const posts = await getThreadPosts(req.params.threadId, req.user?.id || null)
    if (!posts.length) return res.status(404).json({ error: "Thread not found" })
    res.json({ thread_id: req.params.threadId, posts })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch thread", detail: err.message })
  }
}

// ── GET /api/posts/drafts ─────────────────────────────────────────────────────
export const listDrafts = async (req, res) => {
  try {
    const posts = await getDraftsByUser(req.user.id, parsePagination(req.query))
    res.json({ posts })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch drafts", detail: err.message })
  }
}

// ── GET /api/posts/scheduled ──────────────────────────────────────────────────
export const listScheduled = async (req, res) => {
  try {
    const posts = await getScheduledByUser(req.user.id, parsePagination(req.query))
    res.json({ posts })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scheduled posts", detail: err.message })
  }
}

// ── POST /api/posts/draft ─────────────────────────────────────────────────────
export const saveDraft = async (req, res) => {
  try {
    const author = await findUserById(req.user.id)
    const visibility =
      req.body.visibility || author?.default_post_visibility || "public"
    const content = (req.body.content || "").trim() || "(draft)"
    const link_preview = await buildLinkPreview(req.body)

    if (req.body.id) {
      const existing = await getPostByIdRaw(req.body.id)
      if (!existing) return res.status(404).json({ error: "Draft not found" })
      if (existing.user_id !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" })
      }
      if (existing.status !== "draft") {
        return res.status(400).json({ error: "Only drafts can be updated here" })
      }
      const updated = await updatePost(req.body.id, {
        content,
        image_url: req.body.image_url,
        visibility,
        link_preview,
        media_type: req.body.media_type,
      })
      const post = await enrichPost(updated, req.user.id)
      return res.json({ message: "Draft saved", post })
    }

    const created = await createPost({
      user_id: req.user.id,
      content,
      image_url: req.body.image_url || null,
      visibility,
      link_preview,
      status: "draft",
      media_type: req.body.media_type || null,
    })
    const post = await enrichPost(created, req.user.id)
    res.status(201).json({ message: "Draft created", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to save draft", detail: err.message })
  }
}

// ── POST /api/posts/:id/publish ─────────────────────────────────────────────
export const publishDraft = async (req, res) => {
  try {
    const existing = await getPostByIdRaw(req.params.id)
    if (!existing) return res.status(404).json({ error: "Post not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" })
    }
    if (!["draft", "scheduled"].includes(existing.status)) {
      return res.status(400).json({ error: "Post is already published" })
    }

    const published = await markPostPublished(req.params.id)
    await finalizeNewPost(
      published.id,
      req.user.id,
      published.content,
      req.body.poll,
    )

    const post = await enrichPost(published, req.user.id)
    res.json({ message: "Post published", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to publish", detail: err.message })
  }
}

// ── POST /api/posts/:id/schedule ──────────────────────────────────────────────
export const schedulePost = async (req, res) => {
  const { scheduled_at } = req.body
  if (!scheduled_at) {
    return res.status(400).json({ error: "scheduled_at is required" })
  }

  try {
    const at = new Date(scheduled_at)
    if (Number.isNaN(at.getTime()) || at <= new Date()) {
      return res.status(400).json({ error: "scheduled_at must be a future datetime" })
    }

    const existing = await getPostByIdRaw(req.params.id)
    if (!existing) return res.status(404).json({ error: "Post not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" })
    }
    if (!["draft", "scheduled"].includes(existing.status)) {
      return res.status(400).json({ error: "Only drafts or scheduled posts can be rescheduled" })
    }

    const updated = await updatePost(req.params.id, {
      status: "scheduled",
      scheduled_at: at.toISOString(),
      content: req.body.content ?? existing.content,
      image_url: req.body.image_url ?? existing.image_url,
      visibility: req.body.visibility ?? existing.visibility,
      media_type: req.body.media_type ?? existing.media_type,
    })
    const post = await enrichPost(updated, req.user.id)
    res.json({ message: "Post scheduled", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule", detail: err.message })
  }
}

// ── DELETE /api/posts/:id/schedule ────────────────────────────────────────────
export const unschedulePost = async (req, res) => {
  try {
    const updated = await cancelScheduledPost(req.params.id, req.user.id)
    if (!updated) return res.status(404).json({ error: "Scheduled post not found" })
    const post = await enrichPost(updated, req.user.id)
    res.json({ message: "Schedule cancelled; moved to drafts", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel schedule", detail: err.message })
  }
}

// ── POST /api/posts ─────────────────────────────────────────────────────────
export const addPost = async (req, res) => {
  const hasMedia = !!req.body.image_url
  const hasContent = !!req.body.content?.trim()
  const hasPoll = !!req.body.poll?.question

  if (!hasContent && !hasMedia && !hasPoll) {
    return res.status(400).json({ error: "Post needs content, media, or a poll" })
  }

  try {
    const author = await findUserById(req.user.id)
    const visibility =
      req.body.visibility || author?.default_post_visibility || "public"

    if (!["public", "followers"].includes(visibility)) {
      return res.status(400).json({ error: "visibility must be 'public' or 'followers'" })
    }

    const { status, scheduled_at } = resolvePostStatus(req.body)
    const link_preview = await buildLinkPreview(req.body)
    let thread_id = req.body.thread_id || null
    let thread_position = 1

    if (thread_id && status === "published") {
      thread_position = await getNextThreadPosition(thread_id)
    }

    const created = await createPost({
      user_id: req.user.id,
      content: req.body.content || "",
      image_url: req.body.image_url || null,
      visibility,
      thread_id: status === "published" ? thread_id : null,
      thread_position,
      link_preview,
      status,
      scheduled_at,
      media_type: req.body.media_type || null,
    })

    if (status === "published") {
      if (!thread_id) await initThreadOnPost(created.id)
      await finalizeNewPost(created.id, req.user.id, req.body.content, req.body.poll)
    }

    const post = await enrichPost(created, req.user.id)
    const message =
      status === "draft"
        ? "Draft saved"
        : status === "scheduled"
          ? "Post scheduled"
          : "Post created"
    res.status(201).json({ message, post })
  } catch (err) {
    res.status(400).json({ error: err.message || "Failed to create post" })
  }
}

const getViewerFilterPrefs = async (viewerId) => {
  if (!viewerId) return { muted_words: [], hide_spoilers: false }
  const viewer = await findUserById(viewerId)
  return {
    muted_words: normalizeMutedWords(viewer?.muted_words),
    hide_spoilers: !!viewer?.hide_spoilers,
  }
}

const applyFeedContentFilters = (posts, prefs) => {
  let filtered = filterPostsByMutedWords(posts, prefs.muted_words)
  filtered = applySpoilerFlags(filtered, prefs.hide_spoilers)
  return filtered
}

// ── GET /api/posts/feed?type=foryou|following ─────────────────────────────────
export const getFeed = async (req, res) => {
  const { limit, offset } = parsePagination(req.query)
  const type = req.query.type === "following" ? "following" : "foryou"
  const viewerId = req.user?.id || null

  try {
    const prefs = await getViewerFilterPrefs(viewerId)

    if (type === "following") {
      if (!viewerId) {
        return res.status(401).json({ error: "Authentication required for following feed" })
      }
      const [posts, total] = await Promise.all([
        getFollowingFeed(viewerId, { limit, offset }),
        getFollowingFeedCount(viewerId),
      ])
      const filtered = applyFeedContentFilters(posts, prefs)
      return res.json({
        posts: filtered,
        feed_type: "following",
        pagination: {
          total,
          limit,
          offset,
          next_offset: offset + posts.length,
          has_more: offset + posts.length < total,
        },
      })
    }

    const [posts, total] = await Promise.all([
      getForYouFeed({
        limit,
        offset,
        viewerId,
        muted_words: prefs.muted_words,
      }),
      getForYouFeedCount(viewerId, prefs.muted_words),
    ])

    const withReasons = attachFeedReasons(posts)
    const filtered = applyFeedContentFilters(withReasons, prefs)

    res.json({
      posts: filtered,
      feed_type: "foryou",
      algorithm: "personalized",
      pagination: {
        total,
        limit,
        offset,
        next_offset: offset + posts.length,
        has_more: offset + posts.length < total,
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feed", detail: err.message })
  }
}

export const getPosts = async (req, res) => {
  const { limit, offset } = parsePagination(req.query)
  const viewerId = req.user?.id || null

  try {
    const [posts, total] = await Promise.all([
      getAllPosts({ limit, offset, viewerId }),
      getTotalPostCount(viewerId),
    ])
    res.json({
      posts,
      pagination: {
        total,
        limit,
        offset,
        next_offset: offset + posts.length,
        has_more: offset + posts.length < total,
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts", detail: err.message })
  }
}

export const getPost = async (req, res) => {
  try {
    const viewerId = req.user?.id || null
    const raw = await getPostByIdRaw(req.params.id)
    if (!raw) return res.status(404).json({ error: "Post not found" })

    if (viewerId && raw.user_id !== viewerId) {
      if (await isBlocked(viewerId, raw.user_id)) {
        return res.status(404).json({ error: "Post not found" })
      }
    }

    const post = await getPostById(req.params.id, viewerId)
    if (!post) return res.status(404).json({ error: "Post not found" })
    res.json({ post })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch post", detail: err.message })
  }
}

export const getUserPosts = async (req, res) => {
  const { limit, offset } = parsePagination(req.query)
  const viewerId = req.user?.id || null

  try {
    const [posts, total] = await Promise.all([
      getPostsByUser(req.params.userId, { limit, offset, viewerId }),
      getTotalUserPostCount(req.params.userId, viewerId),
    ])
    res.json({
      posts,
      pagination: {
        total,
        limit,
        offset,
        next_offset: offset + posts.length,
        has_more: offset + posts.length < total,
      },
    })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user posts", detail: err.message })
  }
}

export const editPost = async (req, res) => {
  try {
    const existing = await getPostById(req.params.id, req.user.id)
    if (!existing) return res.status(404).json({ error: "Post not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: not your post" })
    }

    if (req.body.visibility && !["public", "followers"].includes(req.body.visibility)) {
      return res.status(400).json({ error: "visibility must be 'public' or 'followers'" })
    }

    let link_preview = undefined
    if (req.body.content || req.body.preview_url) {
      link_preview = await buildLinkPreview(req.body)
    }

    const updated = await updatePost(req.params.id, {
      content: req.body.content,
      image_url: req.body.image_url,
      visibility: req.body.visibility,
      link_preview,
    })

    if (req.body.content) {
      await linkPostHashtags(req.params.id, extractHashtags(req.body.content))
      await notifyMentions({
        mentionerId: req.user.id,
        content: req.body.content,
        postId: req.params.id,
      })
    }

    const post = await enrichPost(updated || { id: req.params.id }, req.user.id)
    res.json({ message: "Post updated", post })
  } catch (err) {
    res.status(500).json({ error: "Failed to update post", detail: err.message })
  }
}

export const removePost = async (req, res) => {
  try {
    const existing = await getPostById(req.params.id, req.user.id)
    if (!existing) return res.status(404).json({ error: "Post not found" })
    if (existing.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: not your post" })
    }

    await deletePost(req.params.id)
    res.json({ message: "Post deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete post", detail: err.message })
  }
}
