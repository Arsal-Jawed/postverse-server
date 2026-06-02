// models/user.model.js
import { query } from "../modules/db.js"

/**
 * Initialize the users table in Neon (run once on startup).
 */
export const createUsersTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username           VARCHAR(50)  UNIQUE NOT NULL,
      email              VARCHAR(255) UNIQUE NOT NULL,
      password           TEXT         NOT NULL,
      avatar_url         TEXT,
      bio                TEXT,
      is_verified        BOOLEAN      DEFAULT FALSE,
      verification_token TEXT,
      created_at         TIMESTAMPTZ  DEFAULT NOW(),
      updated_at         TIMESTAMPTZ  DEFAULT NOW()
    );
  `
  await query(sql)
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_otp_expires TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS default_post_visibility VARCHAR(20) DEFAULT 'public';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_words TEXT[] DEFAULT '{}';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_spoilers BOOLEAN DEFAULT FALSE;
  `)
  console.log("✅ users table ready")
}

// ── CRUD ────────────────────────────────────────────────────────────────────

export const createUser = async ({
  username,
  email,
  password,
  avatar_url,
  verification_token,
  verification_otp_expires,
}) => {
  const sql = `
    INSERT INTO users (username, email, password, avatar_url, verification_token, verification_otp_expires)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, username, email, avatar_url, bio, is_verified, created_at
  `
  const { rows } = await query(sql, [
    username,
    email,
    password,
    avatar_url || null,
    verification_token,
    verification_otp_expires,
  ])
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
    `SELECT id, username, email, avatar_url, bio, created_at,
            is_verified, is_admin, is_private, default_post_visibility,
            muted_words, hide_spoilers
     FROM users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

export const findUserByUsername = async (username) => {
  const { rows } = await query(
    `SELECT id, username, avatar_url, bio, created_at,
            is_verified, is_admin, is_private, default_post_visibility,
            muted_words, hide_spoilers
     FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  )
  return rows[0] || null
}

/** Public profile fields — never includes email. */
export const toPublicUser = (user, { is_following = false, post_count = 0 } = {}) => ({
  id: user.id,
  username: user.username,
  avatar_url: user.avatar_url,
  bio: user.bio,
  created_at: user.created_at,
  is_verified: !!user.is_verified,
  is_admin: !!user.is_admin,
  is_private: !!user.is_private,
  default_post_visibility: user.default_post_visibility || "public",
  is_following,
  post_count,
})

export const getAllUsers = async () => {
  const { rows } = await query(
    "SELECT id, username, email, avatar_url, bio, created_at FROM users ORDER BY created_at DESC"
  )
  return rows
}

export const updateUser = async (id, fields) => {
  const {
    username,
    bio,
    avatar_url,
    is_private,
    default_post_visibility,
    muted_words,
    hide_spoilers,
    is_verified,
  } = fields

  const sets = ["updated_at = NOW()"]
  const vals = []
  let i = 1

  const add = (col, val) => {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`)
      vals.push(val)
    }
  }

  add("username", username ?? undefined)
  add("bio", bio ?? undefined)
  add("avatar_url", avatar_url ?? undefined)
  add("is_private", is_private ?? undefined)
  add("default_post_visibility", default_post_visibility ?? undefined)
  if (muted_words !== undefined) {
    sets.push(`muted_words = $${i++}`)
    vals.push(Array.isArray(muted_words) ? muted_words : [])
  }
  if (hide_spoilers !== undefined) {
    sets.push(`hide_spoilers = $${i++}`)
    vals.push(!!hide_spoilers)
  }
  if (is_verified !== undefined) {
    sets.push(`is_verified = $${i++}`)
    vals.push(!!is_verified)
  }

  vals.push(id)
  const sql = `
    UPDATE users SET ${sets.join(", ")}
    WHERE id = $${i}
    RETURNING id, username, email, avatar_url, bio, updated_at,
              is_verified, is_admin, is_private, default_post_visibility,
              muted_words, hide_spoilers
  `
  const { rows } = await query(sql, vals)
  return rows[0] || null
}

export const deleteUser = async (id) => {
  const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id])
  return rowCount > 0
}

export const verifyUserEmailByOtp = async (email, otp) => {
  const sql = `
    UPDATE users
    SET is_verified = TRUE,
        verification_token = NULL,
        verification_otp_expires = NULL,
        updated_at = NOW()
    WHERE email = $1
      AND verification_token = $2
      AND verification_otp_expires > NOW()
      AND is_verified = FALSE
    RETURNING id, username, email, avatar_url, bio, is_verified, created_at
  `
  const { rows } = await query(sql, [email, otp])
  return rows[0] || null
}

/**
 * Assign a fresh verification OTP to an unverified user (resend flow).
 * Returns null if the user is already verified or doesn't exist.
 */
export const updateVerificationOtp = async (email, otp, expiresAt) => {
  const sql = `
    UPDATE users
    SET verification_token = $1,
        verification_otp_expires = $2,
        updated_at = NOW()
    WHERE email = $3
      AND is_verified = FALSE
    RETURNING id, username, email
  `
  const { rows } = await query(sql, [otp, expiresAt, email])
  return rows[0] || null
}

export const setPasswordResetOtp = async (email, otp, expiresAt) => {
  const sql = `
    UPDATE users
    SET reset_password_token = $1,
        reset_password_expires = $2,
        updated_at = NOW()
    WHERE email = $3
    RETURNING id, username, email
  `
  const { rows } = await query(sql, [otp, expiresAt, email])
  return rows[0] || null
}

export const findUserByResetOtp = async (email, otp) => {
  const sql = `
    SELECT id, username, email
    FROM users
    WHERE email = $1
      AND reset_password_token = $2
      AND reset_password_expires > NOW()
  `
  const { rows } = await query(sql, [email, otp])
  return rows[0] || null
}

export const updatePasswordById = async (id, hashedPassword) => {
  const sql = `
    UPDATE users
    SET password = $1,
        reset_password_token = NULL,
        reset_password_expires = NULL,
        updated_at = NOW()
    WHERE id = $2
    RETURNING id, username, email
  `
  const { rows } = await query(sql, [hashedPassword, id])
  return rows[0] || null
}
