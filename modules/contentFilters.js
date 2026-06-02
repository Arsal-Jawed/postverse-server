/** Detect spoiler markers in post text. */
export const isSpoilerContent = (content = "") =>
  /#spoiler\b/i.test(content) || /\[spoiler\]/i.test(content)

/**
 * SQL fragment: exclude posts whose content contains any muted word (case-insensitive).
 * @param {string} contentParamRef - e.g. "p.content"
 * @param {string} wordsParam - e.g. "$4" for the muted_words array bind param
 */
export const mutedWordsWhere = (contentParamRef, wordsParam) => `
  AND (
    cardinality(${wordsParam}::text[]) = 0
    OR NOT EXISTS (
      SELECT 1 FROM unnest(${wordsParam}::text[]) AS w
      WHERE length(trim(w)) > 0
        AND ${contentParamRef} ILIKE '%' || trim(w) || '%'
    )
  )
`

export const normalizeMutedWords = (words) => {
  if (!Array.isArray(words)) return []
  return [...new Set(words.map((w) => String(w).trim().toLowerCase()).filter(Boolean))]
}

/** Mark spoiler posts; strip internal fields after filtering. */
export const applySpoilerFlags = (posts, hideSpoilers) => {
  if (!hideSpoilers) return posts
  return posts.map((p) => ({
    ...p,
    is_spoiler: isSpoilerContent(p.content),
  }))
}

/** Remove posts matching muted words (client-side backup). */
export const filterPostsByMutedWords = (posts, mutedWords) => {
  const words = normalizeMutedWords(mutedWords)
  if (!words.length) return posts
  return posts.filter((p) => {
    const text = (p.content || "").toLowerCase()
    return !words.some((w) => text.includes(w))
  })
}
