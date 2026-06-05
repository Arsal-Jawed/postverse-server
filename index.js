import http           from "http"
import express        from "express"
import cors           from "cors"
import bodyParser     from "body-parser"
import dotenv         from "dotenv"
dotenv.config()

import pool           from "./config.js"
import { initDB }     from "./models/index.js"
import { initSocket } from "./modules/socket.js"
import { startScheduler } from "./modules/scheduler.js"

// ── Routes ──────────────────────────────────────────────────────────────────
import authRoutes     from "./routes/auth.routes.js"
import userRoutes     from "./routes/user.routes.js"
import postRoutes     from "./routes/post.routes.js"
import commentRoutes  from "./routes/comment.routes.js"
import likeRoutes     from "./routes/like.routes.js"
import uploadRoutes   from "./routes/upload.routes.js"
import followRoutes   from "./routes/follow.routes.js"
import searchRoutes   from "./routes/search.routes.js"
import exploreRoutes  from "./routes/explore.routes.js"
import messageRoutes  from "./routes/message.routes.js"
import hashtagRoutes  from "./routes/hashtag.routes.js"
import notificationRoutes from "./routes/notification.routes.js"
import pollRoutes from "./routes/poll.routes.js"
import blockRoutes from "./routes/block.routes.js"
import muteRoutes from "./routes/mute.routes.js"
import reportRoutes from "./routes/report.routes.js"
import adminRoutes from "./routes/admin.routes.js"

const app           = express()
const httpServer    = http.createServer(app)
const PORT          = process.env.PORT || 5000
// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// ── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status:    "✅ Postverse API is running",
    version:   "2.0.0",
    timestamp: new Date().toISOString(),
    features:  ["posts", "comments", "likes", "follow", "search", "explore", "chat", "pagination"],
  })
})

// ── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes)
app.use("/api/users",    userRoutes)
app.use("/api/posts",    postRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/likes",    likeRoutes)
app.use("/api/upload",   uploadRoutes)
app.use("/api/follow",   followRoutes)
app.use("/api/search",   searchRoutes)
app.use("/api/explore",  exploreRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/hashtags", hashtagRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/polls", pollRoutes)
app.use("/api/block", blockRoutes)
app.use("/api/mute", muteRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/admin", adminRoutes)

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message)
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  })
})

// ── Start HTTP Server + Socket.io ────────────────────────────────────────────
httpServer.listen(PORT, async () => {
  console.log(`🚀 Postverse server running on port ${PORT}`)

  // Attach Socket.io to the same HTTP server
  initSocket(httpServer, CLIENT_ORIGIN)
  console.log("💬 Socket.io real-time chat active")

  // Test DB connection and initialise schema
  try {
    const result = await pool.query("SELECT NOW()")
    console.log(`🗄️  Neon DB connected — ${result.rows[0].now}`)
    await initDB()
    startScheduler()
  } catch (err) {
    console.error("❌ Database initialization failed:", err.message)
  }
})

export default app
