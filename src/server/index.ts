import { Elysia } from 'elysia'
import { pool } from '../database/db'

async function start() {
  try {
    await pool.query('SELECT 1')
    console.log('Database connection OK')
  } catch (err) {
    console.error('Database connection failed:', err)
  }

  new Elysia()
    .get('/', 'Hello Elysia')
    .get('/user/:id', ({ params: { id } }) => id)
    .post('/form', ({ body }) => body)
    .listen(3000)

  console.log('Elysia server starting on port 3000')
}

start()
