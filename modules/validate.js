// modules/validate.js
// Lightweight input validation helpers

/**
 * Check that all required fields are present and non-empty in a body object.
 * @param {Object} body     - req.body
 * @param {string[]} fields - Required field names
 * @returns {{ valid: boolean, missing: string[] }}
 */
export const requireFields = (body, fields) => {
  const missing = fields.filter(
    (f) => body[f] === undefined || body[f] === null || body[f] === ""
  )
  return { valid: missing.length === 0, missing }
}

/**
 * Simple email format check.
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Password strength check (min 6 chars).
 * @param {string} password
 * @returns {boolean}
 */
export const isStrongPassword = (password) => {
  return typeof password === "string" && password.length >= 6
}
