// modules/db.js
// Central query helper — wraps pool.query for easy use in models
import pool from "../config.js"

/**
 * Execute a SQL query against the Neon database.
 * @param {string} text  - SQL statement with $1, $2 ... placeholders
 * @param {Array}  params - Bound parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
export const query = async (text, params) => {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    console.log(`📋 Query executed in ${duration}ms — rows: ${result.rowCount}`)
    return result
  } catch (err) {
    console.error("❌ DB Query Error:", err.message, "\nSQL:", text)
    throw err
  }
}

/**
 * Get a dedicated DB client from the pool (for transactions).
 */
export const getClient = () => pool.connect()

export default { query, getClient }
