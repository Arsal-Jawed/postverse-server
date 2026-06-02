import { query } from "../modules/db.js"

export const createMentionsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS mentions (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mentioner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id           UUID REFERENCES posts(id) ON DELETE CASCADE,
      comment_id        UUID REFERENCES comments(id) ON DELETE CASCADE,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id);
  `
  await query(sql)
  console.log("✅ mentions table ready")
}
