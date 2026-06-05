import { Client } from "pg"
import { config } from "dotenv"
import path from "path"

config({ path: path.resolve(__dirname, "../.env") })

export const db = new Client({
  user:     process.env.DB_USER,
  host:     process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port:     Number(process.env.DB_PORT),
})

db.connect()

