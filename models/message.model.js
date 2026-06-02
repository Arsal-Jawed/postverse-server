// models/message.model.js
import { query } from "../modules/db.js"

/**
 * Initialize the messages table in Neon (run once on startup).
 */
export const createMessagesTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS messages (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content     TEXT NOT NULL,
      is_read     BOOLEAN     DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
    CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
    CREATE INDEX IF NOT EXISTS idx_messages_convo    ON messages(
      LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id)
    );
  `
  await query(sql)
  console.log("✅ messages table ready")
}

// ── Operations ───────────────────────────────────────────────────────────────

/**
 * Save a message to the DB.
 */
export const saveMessage = async ({ sender_id, receiver_id, content }) => {
  const sql = `
    INSERT INTO messages (sender_id, receiver_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const { rows } = await query(sql, [sender_id, receiver_id, content])
  return rows[0]
}

/**
 * Get full conversation between two users, ordered oldest→newest.
 * Supports pagination via limit + offset.
 */
export const getConversation = async (user_a, user_b, { limit = 30, offset = 0 } = {}) => {
  const sql = `
    SELECT m.*,
           s.username AS sender_username,   s.avatar_url AS sender_avatar,
           r.username AS receiver_username, r.avatar_url AS receiver_avatar
    FROM messages m
    JOIN users s ON s.id = m.sender_id
    JOIN users r ON r.id = m.receiver_id
    WHERE (m.sender_id = $1 AND m.receiver_id = $2)
       OR (m.sender_id = $2 AND m.receiver_id = $1)
    ORDER BY m.created_at DESC
    LIMIT $3 OFFSET $4
  `
  const { rows } = await query(sql, [user_a, user_b, limit, offset])
  // Return chronological order (oldest first) for UI
  return rows.reverse()
}

/**
 * Get list of all conversations for a user (inbox view).
 * Returns latest message per conversation + unread count.
 */
export const getInbox = async (user_id) => {
  const sql = `
    SELECT DISTINCT ON (
        LEAST(m.sender_id, m.receiver_id),
        GREATEST(m.sender_id, m.receiver_id)
      )
      m.*,
      u.id           AS other_user_id,
      u.username     AS other_username,
      u.avatar_url   AS other_avatar,
      (
        SELECT COUNT(*)::INT
        FROM messages unread
        WHERE unread.sender_id   = u.id
          AND unread.receiver_id = $1
          AND unread.is_read     = FALSE
      ) AS unread_count
    FROM messages m
    JOIN users u ON u.id = CASE
      WHEN m.sender_id = $1 THEN m.receiver_id
      ELSE m.sender_id
    END
    WHERE m.sender_id = $1 OR m.receiver_id = $1
    ORDER BY
      LEAST(m.sender_id, m.receiver_id),
      GREATEST(m.sender_id, m.receiver_id),
      m.created_at DESC
  `
  const { rows } = await query(sql, [user_id])
  // Sort by latest message across all conversations
  return rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

/**
 * Mark all messages from sender → receiver as read.
 */
export const markAsRead = async ({ viewer_id, other_user_id }) => {
  const { rowCount } = await query(
    `UPDATE messages SET is_read = TRUE
     WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
    [other_user_id, viewer_id]
  )
  return rowCount
}
