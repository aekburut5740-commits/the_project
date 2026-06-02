import { Elysia } from 'elysia'
import { db } from '../lib/db'
import { userRoutes } from './routes/user.routes'

async function start() {
  try {
    await db.query('SELECT 1')
    console.log('Database (pg) connection OK')
  } catch (err) {
    console.error('Database connection failed:', err)
  }

  const app = new Elysia()
    .get('/', 'Hello Elysia')
    .post('/form', ({ body }) => body)

  app.use(userRoutes)
  app.listen(3000)

  console.log('Elysia server starting on port 3000')
}

start()
