import express from "express"
import cors from "cors"
import bodyParser from "body-parser"
import dotenv from "dotenv"
dotenv.config()
import pool from "./config.js"
import { initDB } from "./models/index.js"

// ── Routes ─────────────────────────────────────────────────────────────────
import authRoutes from "./routes/auth.routes.js"
import userRoutes from "./routes/user.routes.js"
import postRoutes from "./routes/post.routes.js"
import commentRoutes from "./routes/comment.routes.js"
import likeRoutes from "./routes/like.routes.js"
import uploadRoutes from "./routes/upload.routes.js"

const app = express()
const PORT = process.env.PORT || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8080"

console.log(`📡 CORS Origin: ${CLIENT_ORIGIN}`)

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: CLIENT_ORIGIN,
  credentials: true,
}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    status: "✅ Postverse API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
})

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth",     authRoutes)
app.use("/api/users",    userRoutes)
app.use("/api/posts",    postRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/likes",    likeRoutes)
app.use("/api/upload",   uploadRoutes)

// ── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" })
})

// ── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message)
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  })
})

// ── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`🚀 Postverse server running on port ${PORT}`)

  // Test DB connection and Initialize schema
  try {
    const result = await pool.query("SELECT NOW()")
    console.log(`🗄️  Neon DB connected — ${result.rows[0].now}`)
    
    // Auto-create tables if they don't exist
    await initDB()
  } catch (err) {
    console.error("❌ Database initialization failed:", err.message)
  }
})

export default app
