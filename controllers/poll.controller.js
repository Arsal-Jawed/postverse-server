// controllers/poll.controller.js
import { votePoll } from "../models/poll.model.js"
import { requireFields } from "../modules/validate.js"

export const castVote = async (req, res) => {
  const { valid, missing } = requireFields(req.body, ["poll_id", "option_id"])
  if (!valid) {
    return res.status(400).json({ error: `Missing fields: ${missing.join(", ")}` })
  }

  try {
    const poll = await votePoll({
      poll_id: req.body.poll_id,
      option_id: req.body.option_id,
      user_id: req.user.id,
    })
    if (!poll) return res.status(404).json({ error: "Poll or option not found" })
    res.json({ message: "Vote recorded", poll })
  } catch (err) {
    res.status(500).json({ error: "Failed to vote", detail: err.message })
  }
}
