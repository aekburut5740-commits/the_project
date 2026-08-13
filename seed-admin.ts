import { db } from "./database/db"
import bcrypt from "bcryptjs"

async function seedAdmin() {
  try {
    // 1. Ensure all required columns exist in tables
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'customer';`)
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`)
    await db.query(`UPDATE projects SET website = NULL WHERE website LIKE '%/dashboard/projects/%' OR website = 'https://example.com';`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS domain TEXT;`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS package TEXT;`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS token TEXT;`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;`)
    await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;`)
    await db.query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`)

    const username = "admin"
    const email = "admin@example.com"
    const password = "123455**++-"
    const role = "admin"

    const hashedPassword = await bcrypt.hash(password, 10)

    const checkUser = await db.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR (email IS NOT NULL AND LOWER(email) = LOWER($2))`,
      [username, email]
    )

    if (checkUser.rows.length > 0) {
      await db.query(
        `UPDATE users SET username = $1, email = $2, password = $3, role = $4 WHERE id = $5`,
        [username, email, hashedPassword, role, checkUser.rows[0].id]
      )
      console.log(`Updated user ${email} password & role successfully.`)
    } else {
      await db.query(
        `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)`,
        [username, email, hashedPassword, role]
      )
      console.log(`Created admin user ${email} successfully.`)
    }
  } catch (err) {
    console.error("Error seeding admin user:", err)
  } finally {
    await db.end()
  }
}

seedAdmin()
