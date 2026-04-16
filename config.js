import pkg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon's TLS connection
  },
  max: 10,             // max pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Log connection events
pool.on("connect", () => {
  console.log("🔗 New DB client connected")
})

pool.on("error", (err) => {
  console.error("⚠️  Unexpected DB error:", err.message)
})

export default pool