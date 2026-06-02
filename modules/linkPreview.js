const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

export const extractFirstUrl = (text) => {
  if (!text) return null
  const match = text.match(URL_REGEX)
  return match?.[0]?.replace(/[.,;:!?)]+$/, "") || null
}

const decodeHtml = (str) =>
  str
    ?.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'") || ""

const metaContent = (html, property) => {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeHtml(m[1].trim())
  }
  return null
}

export const fetchLinkPreview = async (url) => {
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) return null

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PostverseBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    })
    clearTimeout(timeout)

    if (!res.ok) return { url, title: parsed.hostname, description: null, image: null }

    const html = await res.text()
    const title =
      metaContent(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      parsed.hostname
    const description = metaContent(html, "og:description") || metaContent(html, "description")
    const image = metaContent(html, "og:image")

    return {
      url,
      title: decodeHtml(title),
      description: description ? decodeHtml(description) : null,
      image: image || null,
    }
  } catch {
    try {
      return { url, title: new URL(url).hostname, description: null, image: null }
    } catch {
      return null
    }
  }
}
