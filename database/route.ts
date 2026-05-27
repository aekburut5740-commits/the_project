import { query } from "./db"

export async function GET() {
  const result = await query('SELECT NOW()')
  return Response.json(result.rows)
}