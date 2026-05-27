import { Elysia } from 'elysia'
import prisma from '../lib/prisma'
import { registerUserRoutes } from './routes/user.routes'

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('Database (Prisma) connection OK')
  } catch (err) {
    console.error('Database connection failed:', err)
  }

  const app = new Elysia()
    .get('/', 'Hello Elysia')
    .post('/form', ({ body }) => body)

  registerUserRoutes(app)
  app.listen(3000)

  console.log('Elysia server starting on port 3000')
}

start()
