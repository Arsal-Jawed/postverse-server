import { query } from "../modules/db.js"

export const createMutesTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS mutes (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      muter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muted_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (muter_id, muted_id),
      CHECK (muter_id <> muted_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mutes_muter ON mutes(muter_id);
  `)
  console.log("✅ mutes table ready")
}

export const muteUser = async ({ muter_id, muted_id }) => {
  const { rows } = await query(
    `INSERT INTO mutes (muter_id, muted_id) VALUES ($1, $2)
     ON CONFLICT (muter_id, muted_id) DO NOTHING RETURNING *`,
    [muter_id, muted_id],
  )
  return rows[0] || null
}

export const unmuteUser = async ({ muter_id, muted_id }) => {
  const { rowCount } = await query(
    `DELETE FROM mutes WHERE muter_id = $1 AND muted_id = $2`,
    [muter_id, muted_id],
  )
  return rowCount > 0
}

export const isMuted = async (muter_id, muted_id) => {
  const { rows } = await query(
    `SELECT 1 FROM mutes WHERE muter_id = $1 AND muted_id = $2 LIMIT 1`,
    [muter_id, muted_id],
  )
  return rows.length > 0
}
