import prisma from '../src/lib/prisma'

export async function GET() {
  const result = await prisma.$queryRaw`SELECT NOW()`
  return Response.json(result)
}