import { Elysia } from "elysia"
import { register, login } from "../database/route"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey123"

// Middleware ตรวจสอบ Token
const authCheck = ({ headers, set }: any) => {
  const authHeader = headers["authorization"]
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    set.status = 401
    return { message: "กรุณาเข้าสู่ระบบก่อน" }
  }
  
  const token = authHeader.split(" ")[1]
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded
  } catch (err) {
    set.status = 401
    return { message: "Token ไม่ถูกต้องหรือหมดอายุ" }
  }
}

new Elysia()
  .get("/", () => "Server is running!")

  // สมัครสมาชิก (ไม่ต้องมี Token)
  .post("/api/register", async ({ body }) => {
    const { email, password } = body as any
    try {
      const user = await register(email, password)
      return { message: "สมัครสมาชิกสำเร็จ", user }
    } catch (err: any) {
    
      return { message: err.message }
    }
  })

  // เข้าสู่ระบบ (ไม่ต้องมี Token)
  .post("/api/login", async ({ body }) => {
    const { email, password } = body as any
    try {
      const result = await login(email, password)
      return result
    } catch (err: any) {
      return { message: err.message }
    }
  })

  // ตัวอย่าง Route ที่ต้องมี Token ถึงจะเข้าได้
  .get("/api/profile", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    
    return { message: "ยินดีต้อนรับ!", user: result }
  })

  .listen(4000)

console.log("Server running on port 4000")