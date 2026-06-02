// modules/socket.js
// Real-time chat powered by Socket.io
import { Server } from "socket.io"
import { verifyToken } from "./auth.js"
import { saveMessage } from "../models/message.model.js"

/**
 * Attach Socket.io to an existing HTTP server.
 * @param {import("http").Server} httpServer
 * @param {string} clientOrigin - allowed CORS origin
 */
export const initSocket = (httpServer, clientOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: clientOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
  })

  // Map userId → Set of socket IDs (a user may have multiple tabs open)
  const onlineUsers = new Map()

  // ── Auth middleware ─────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error("Authentication required"))

    try {
      const decoded = verifyToken(token)
      socket.user = decoded       // { id, username, email, ... }
      next()
    } catch {
      next(new Error("Invalid or expired token"))
    }
  })

  // ── Connection handler ──────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = socket.user.id
    console.log(`🟢 Socket connected: ${socket.user.username} (${socket.id})`)

    // Track online status
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set())
    onlineUsers.get(userId).add(socket.id)

    // Broadcast updated online list
    io.emit("online_users", [...onlineUsers.keys()])

    // ── Join personal room so we can push notifications ─────────────────────
    socket.join(`user:${userId}`)

    // ── Send private message ─────────────────────────────────────────────────
    // Client emits: { to: receiverId, content: "Hello!" }
    socket.on("private_message", async ({ to, content }) => {
      if (!to || !content?.trim()) return

      try {
        const message = await saveMessage({
          sender_id:   userId,
          receiver_id: to,
          content:     content.trim(),
        })

        // Payload sent to both parties
        const payload = {
          ...message,
          sender_username: socket.user.username,
        }

        // Deliver to receiver (all their tabs)
        io.to(`user:${to}`).emit("new_message", payload)

        // Echo back to sender so all their tabs are in sync
        socket.to(`user:${userId}`).emit("new_message", payload)

        // ACK to the sending tab with the persisted message
        socket.emit("message_sent", payload)
      } catch (err) {
        socket.emit("error", { message: "Failed to send message", detail: err.message })
      }
    })

    // ── Typing indicators ────────────────────────────────────────────────────
    // Client emits: { to: receiverId }
    socket.on("typing",       ({ to }) => io.to(`user:${to}`).emit("user_typing",       { from: userId, username: socket.user.username }))
    socket.on("stop_typing",  ({ to }) => io.to(`user:${to}`).emit("user_stop_typing",  { from: userId }))

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) onlineUsers.delete(userId)
      }
      io.emit("online_users", [...onlineUsers.keys()])
      console.log(`🔴 Socket disconnected: ${socket.user.username} (${socket.id})`)
    })
  })

  return io
}
