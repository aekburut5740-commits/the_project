
import { register, login, getProjects, createProject, getAllProjects, updateProjectStatus, getAllUsers, updateProject, deleteProject, refreshToken, getDashboardSummary, getProjectHealth, updateProjectProgress, getAdminDashboard, createNotification, getNotifications, markAsRead, markAllAsRead } from "../database/route"
import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"
import jwt from "jsonwebtoken"
import type { JwtPayload } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "mysecretkey123"

const authCheck = ({ headers, set }: any) => {
  const authHeader = headers["authorization"]
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    set.status = 401
    return { message: "กรุณาเข้าสู่ระบบก่อน" }
  }
  const token = authHeader.split(" ")[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (!decoded || typeof decoded === "string" || !("id" in decoded)) {
      set.status = 401
      return { message: "Token ไม่ถูกต้องหรือหมดอายุ" }
    }
    return decoded as JwtPayload
  } catch (err) {
    set.status = 401
    return { message: "Token ไม่ถูกต้องหรือหมดอายุ" }
  }
}

new Elysia()
  .use(cors())
  .get("/", () => "Server is running!")

  .post("/api/register", async ({ body }) => {
    const { username, password, role } = body as any
    try {
     const user = await register(username, password, role)
      return { message: "สมัครสมาชิกสำเร็จ", user }
    } catch (err: any) {
      return { message: err.message }
    }
  })

  .post("/api/login", async ({ body }) => {
    const { username, password } = body as any
    try {
      const result = await login(username, password)
      return result
    } catch (err: any) {
      return { message: err.message }
    }
  })

  .get("/api/profile", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return { message: "ยินดีต้อนรับ!", user: result }
  })

  .get("/api/projects", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getProjects(result.id)
  })

  .post("/api/projects", async ({ headers, set, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { name, description } = body as any
    return createProject(name, description, result.id)
  })

  // Admin: ดูทุก project (ต้องเป็น admin)
  .get("/api/admin/projects", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return getAllProjects()
  })

  /// Admin: อัปเดตสถานะโปรเจค + แจ้งเตือน
  .put("/api/admin/projects/:id", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { status } = body as any
    const updated = await updateProjectStatus(Number(params.id), status)
    // สร้าง notification อัตโนมัติ
    await createNotification(
      updated.user_id,
      updated.id,
      `โปรเจค "${updated.name}" ถูกเปลี่ยนสถานะเป็น "${status}"`
    )
    return updated
  })

  // Admin: ดู users ทั้งหมด
  .get("/api/admin/users", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return getAllUsers()
  })

  // Customer: อัปเดตโปรเจคของตัวเอง
  .put("/api/projects/:id", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { name, description } = body as any
    try {
      return await updateProject(Number(params.id), name, description, result.id)
    } catch (err: any) {
      set.status = 403
      return { message: err.message }
    }
  })

  // Admin: ลบโปรเจค
  .delete("/api/admin/projects/:id", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return deleteProject(Number(params.id))
  })

  // Refresh Token
  .post("/api/refresh", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return refreshToken(result.id)
  })


  // Customer: Dashboard ของตัวเอง
  .get("/api/dashboard", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getDashboardSummary(result.id)
  })

  // Customer/Admin: ดู health โปรเจคเดียว
  .get("/api/projects/:id/health", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      return await getProjectHealth(Number(params.id), result.id, result.role)
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // Admin: Dashboard ภาพรวมทุก user
  .get("/api/admin/dashboard", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return getAdminDashboard()
  })

  // Admin: อัปเดต progress โปรเจค
  .put("/api/admin/projects/:id/progress", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { progress } = body as any
    try {
      return await updateProjectProgress(Number(params.id), Number(progress))
    }
     catch (err: any) {
      set.status = 400
      return { message: err.message }
    }
  })

  // Customer: ดูการแจ้งเตือนของตัวเอง
  .get("/api/notifications", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getNotifications(result.id)
  })

  // Customer: กดอ่านแล้ว (ทีละอัน)
  .patch("/api/notifications/:id/read", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      return await markAsRead(Number(params.id), result.id)
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // Customer: กดอ่านทั้งหมด
  .patch("/api/notifications/read-all", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return markAllAsRead(result.id)
  })
  .listen(4000)

console.log("Server running on port 4000")