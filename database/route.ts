import { db } from "../database/db"

export async function GET() {

  const result = await db.query(
    "SELECT NOW()"
  )

  return Response.json(result.rows)
}