import { Elysia } from 'elysia'
import { db } from '../../lib/db'

export const userRoutes = new Elysia()
  .get('/api/users/:id', async ({ params: { id } }) => {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [Number(id)])
    return result.rows[0] || null
  })