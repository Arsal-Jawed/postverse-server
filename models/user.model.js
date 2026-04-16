// models/user.model.js
import { query } from "../modules/db.js"

/**
 * Initialize the users table in Neon (run once on startup).
 */
export const createUsersTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username    VARCHAR(50)  UNIQUE NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    TEXT         NOT NULL,
      avatar_url  TEXT,
      bio         TEXT,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    );
  `
  await query(sql)
  console.log("✅ users table ready")
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export const createUser = async ({ username, email, password, avatar_url }) => {
  const sql = `
    INSERT INTO users (username, email, password, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, username, email, avatar_url, bio, created_at
  `
  const { rows } = await query(sql, [username, email, password, avatar_url || null])
  return rows[0]
}

export const findUserByEmail = async (email) => {
  const { rows } = await query(
    "SELECT * FROM users WHERE email = $1", [email]
  )
  return rows[0] || null
}

export const findUserById = async (id) => {
  const { rows } = await query(
    "SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id = $1",
    [id]
  )
  return rows[0] || null
}

export const getAllUsers = async () => {
  const { rows } = await query(
    "SELECT id, username, email, avatar_url, bio, created_at FROM users ORDER BY created_at DESC"
  )
  return rows
}

export const updateUser = async (id, fields) => {
  const { username, bio, avatar_url } = fields
  const sql = `
    UPDATE users
    SET username   = COALESCE($1, username),
        bio        = COALESCE($2, bio),
        avatar_url = COALESCE($3, avatar_url),
        updated_at = NOW()
    WHERE id = $4
    RETURNING id, username, email, avatar_url, bio, updated_at
  `
  const { rows } = await query(sql, [username, bio, avatar_url, id])
  return rows[0] || null
}

export const deleteUser = async (id) => {
  const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id])
  return rowCount > 0
}
