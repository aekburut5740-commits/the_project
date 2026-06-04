import { db } from "../database/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey123"

// สมัครสมาชิก
export async function register(username: string, password: string, role: string = "user") {
  const hashed = await bcrypt.hash(password, 10)
  
  const result = await db.query(
    "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role",
    [username, hashed, role]
  )
  
  return result.rows[0]
}

// เข้าสู่ระบบ
export async function login(username: string, password: string) {
  const result = await db.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  )
  
  if (!result.rows.length) {
    throw new Error("Username หรือ Password ไม่ถูกต้อง")
  }
  
  const user = result.rows[0]
  const isMatch = await bcrypt.compare(password, user.password)
  
  if (!isMatch) {
    throw new Error("Username หรือ Password ไม่ถูกต้อง")
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" }
  )
  
  return { message: "เข้าสู่ระบบสำเร็จ", token }
}

export async function getProjects(user_id: number) {
  const result = await db.query(
    "SELECT * FROM projects WHERE user_id = $1",
    [user_id]
  )
  return result.rows
}

export async function createProject(name: string, description: string, user_id: number) {
  const result = await db.query(
    "INSERT INTO projects (name, description, user_id) VALUES ($1, $2, $3) RETURNING *",
    [name, description, user_id]
  )
  return result.rows[0]
}
// Admin: ดูทุก project
export async function getAllProjects() {
  const result = await db.query(
    `SELECT projects.*, users.username 
     FROM projects 
     JOIN users ON projects.user_id = users.id 
     ORDER BY projects.created_at DESC`
  )
  return result.rows
}

// Admin: อัปเดตสถานะโปรเจค
export async function updateProjectStatus(id: number, status: string) {
  const result = await db.query(
    "UPDATE projects SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  )
  return result.rows[0]
}

// Admin: ดู users ทั้งหมด
export async function getAllUsers() {
  const result = await db.query(
    "SELECT id, username, role, created_at FROM users ORDER BY id"
  )
  return result.rows
}