import { createUsersTable } from "./user.model.js"
import { createPostsTable } from "./post.model.js"
import { createCommentsTable } from "./comment.model.js"
import { createLikesTable } from "./like.model.js"

/**
 * Initialize all database tables in the correct order to respect foreign key constraints.
 */
export const initDB = async () => {
  try {
    console.log("🛠️  Initializing database schema...")
    
    // 1. Independent tables
    await createUsersTable()
    
    // 2. Tables with foreign keys to users
    await createPostsTable()
    
    // 3. Tables with foreign keys to users AND posts
    await createCommentsTable()
    await createLikesTable()
    
    console.log("✨ Database schema initialization complete")
  } catch (err) {
    console.error("❌ Failed to initialize database schema:", err.message)
    // We don't throw here to allow the server to still start, 
    // but the error will be visible in the logs.
  }
}
