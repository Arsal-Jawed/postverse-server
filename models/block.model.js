import { query } from "../modules/db.js"

export const createBlocksTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (blocker_id, blocked_id),
      CHECK (blocker_id <> blocked_id)
    );
    CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);
  `)
  console.log("✅ blocks table ready")
}

export const blockUser = async ({ blocker_id, blocked_id }) => {
  const { rows } = await query(
    `INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)
     ON CONFLICT (blocker_id, blocked_id) DO NOTHING RETURNING *`,
    [blocker_id, blocked_id],
  )
  await query(
    `DELETE FROM followers
     WHERE (follower_id = $1 AND following_id = $2)
        OR (follower_id = $2 AND following_id = $1)`,
    [blocker_id, blocked_id],
  )
  return rows[0] || null
}

export const unblockUser = async ({ blocker_id, blocked_id }) => {
  const { rowCount } = await query(
    `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
    [blocker_id, blocked_id],
  )
  return rowCount > 0
}

export const isBlocked = async (userA, userB) => {
  if (!userA || !userB || userA === userB) return false
  const { rows } = await query(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
     LIMIT 1`,
    [userA, userB],
  )
  return rows.length > 0
}

export const hasBlocked = async (blocker_id, blocked_id) => {
  const { rows } = await query(
    `SELECT 1 FROM blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
    [blocker_id, blocked_id],
  )
  return rows.length > 0
}
