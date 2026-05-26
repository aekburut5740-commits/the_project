import { Client } from "pg"

export const db = new Client({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "รหัสผ่านของคุณ",
  port: 5432,
})

//db.connect()