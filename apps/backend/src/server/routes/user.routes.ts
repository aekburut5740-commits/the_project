import { Pool } from 'pg'
import { Elysia } from 'elysia'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

export function registerUserRoutes(app: Elysia) {
  app.get('/api/users/:id', async ({ params: { id } }) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )

    return result.rows[0] || null
  })
}