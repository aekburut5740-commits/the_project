import { db } from "../database/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// สมัครสมาชิก
export async function register(email: string, password: string) {
  const hashed = await bcrypt.hash(password, 10)
  
  const result = await db.query(
    "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
    [email, hashed]
  )
  
  return result.rows[0]
}

// เข้าสู่ระบบ
export async function login(email: string, password: string) {
  const result = await db.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  )
  
  if (!result.rows.length) {
    throw new Error("Email หรือ Password ไม่ถูกต้อง")
  }
  
  const user = result.rows[0]
  const isMatch = await bcrypt.compare(password, user.password)
  
  if (!isMatch) {
    throw new Error("Email หรือ Password ไม่ถูกต้อง")
  }
  
  const token = jwt.sign(
    { id: user.id, email: user.email },
    "mysecretkey123",
    { expiresIn: "1d" }
  )
  
  return { message: "เข้าสู่ระบบสำเร็จ", token }
}