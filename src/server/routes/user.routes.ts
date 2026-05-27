import { Elysia } from 'elysia'
import prisma from '../../lib/prisma'

export function registerUserRoutes(app: Elysia) {
  app.get('/api/users/:id', async ({ params: { id } }) => {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } as any })
    return user || null
  })
}
