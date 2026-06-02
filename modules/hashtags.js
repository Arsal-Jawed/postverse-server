const HASHTAG_REGEX = /#([a-zA-Z0-9_]{2,50})/g

export const extractHashtags = (text) => {
  if (!text) return []
  const matches = [...text.matchAll(HASHTAG_REGEX)]
  return [...new Set(matches.map((m) => m[1].toLowerCase()))]
}
