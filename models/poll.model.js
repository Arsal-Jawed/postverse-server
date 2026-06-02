import { query } from "../modules/db.js"

export const createPollsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS polls (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id    UUID UNIQUE NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      question   TEXT NOT NULL,
      ends_at    TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS poll_options (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id     UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      position    INT NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS poll_votes (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      poll_id         UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
      poll_option_id  UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
      user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (poll_id, user_id)
    );
  `)
  console.log("✅ polls tables ready")
}

export const createPollForPost = async (postId, { question, options, ends_at = null }) => {
  const pollSql = `
    INSERT INTO polls (post_id, question, ends_at)
    VALUES ($1, $2, $3)
    RETURNING *
  `
  const { rows: pollRows } = await query(pollSql, [postId, question, ends_at])
  const poll = pollRows[0]

  const optionRows = []
  for (let i = 0; i < options.length; i++) {
    const { rows } = await query(
      `INSERT INTO poll_options (poll_id, option_text, position) VALUES ($1, $2, $3) RETURNING *`,
      [poll.id, options[i], i]
    )
    optionRows.push(rows[0])
  }

  return { ...poll, options: optionRows }
}

export const getPollByPostId = async (postId, userId = null) => {
  const { rows: polls } = await query(`SELECT * FROM polls WHERE post_id = $1`, [postId])
  if (!polls[0]) return null

  const poll = polls[0]
  const { rows: options } = await query(
    `SELECT po.*, COUNT(pv.id)::INT AS vote_count
     FROM poll_options po
     LEFT JOIN poll_votes pv ON pv.poll_option_id = po.id
     WHERE po.poll_id = $1
     GROUP BY po.id
     ORDER BY po.position ASC`,
    [poll.id]
  )

  let user_vote_option_id = null
  if (userId) {
    const { rows } = await query(
      `SELECT poll_option_id FROM poll_votes WHERE poll_id = $1 AND user_id = $2`,
      [poll.id, userId]
    )
    user_vote_option_id = rows[0]?.poll_option_id || null
  }

  const total_votes = options.reduce((sum, o) => sum + o.vote_count, 0)

  return {
    id: poll.id,
    question: poll.question,
    ends_at: poll.ends_at,
    total_votes,
    user_vote_option_id,
    options: options.map((o) => ({
      id: o.id,
      text: o.option_text,
      vote_count: o.vote_count,
      percentage: total_votes > 0 ? Math.round((o.vote_count / total_votes) * 100) : 0,
    })),
  }
}

export const getPollsByPostIds = async (postIds, userId = null) => {
  if (!postIds.length) return {}
  const map = {}

  const { rows: polls } = await query(
    `SELECT * FROM polls WHERE post_id = ANY($1::uuid[])`,
    [postIds]
  )

  for (const poll of polls) {
    map[poll.post_id] = await getPollByPostId(poll.post_id, userId)
  }
  return map
}

export const votePoll = async ({ poll_id, option_id, user_id }) => {
  const { rows: opt } = await query(
    `SELECT po.id, p.post_id FROM poll_options po
     JOIN polls p ON p.id = po.poll_id
     WHERE po.id = $1 AND p.id = $2`,
    [option_id, poll_id]
  )
  if (!opt[0]) return null

  await query(
    `INSERT INTO poll_votes (poll_id, poll_option_id, user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (poll_id, user_id)
     DO UPDATE SET poll_option_id = EXCLUDED.poll_option_id, created_at = NOW()`,
    [poll_id, option_id, user_id]
  )

  return getPollByPostId(opt[0].post_id, user_id)
}
