
import { register, login, getProfile, getProjects, createProject, getAllProjects, updateProjectStatus, getAllUsers, updateProject, updateAdminProject, deleteProject, refreshToken, getDashboardSummary, getProjectHealth, updateProjectProgress, getAdminDashboard, createNotification, getNotifications, markAsRead, markAllAsRead, getComments, createComment, deleteComment, saveFile, getFiles, deleteFile, createLog, getProjectLogs, getAllLogs, getMilestones, createMilestone, updateMilestone, deleteMilestone, createFeedback, getFeedbacks, getAllFeedbacks, updateFeedbackStatus, createFeedbackReply, getFeedbackReplies, getReport, getAdminReport ,checkMilestoneDue,getMaintenanceStatus, setMaintenanceMode,clickNotification,saveWebhook, getWebhooks,updateProfile, changePassword,getProjectMembers, addProjectMember, removeProjectMember } from "../database/route"
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

  .post("/api/register", async ({ body, set }) => {
    const { username, email, password, role } = body as any
    try {
      const user = await register(username, email, password, role)
      return { message: "สมัครสมาชิกสำเร็จ", user }
    } catch (err: any) {
      set.status = 400
      return { message: err.message }
    }
  })

  .post("/api/login", async ({ body }) => {
  const { username, email, password } = body as any
  try {
    const result = await login(username, email, password)
    return result
  } catch (err: any) {
    return { message: err.message }
  }
})

  .get("/api/profile", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return { message: "ยินดีต้อนรับ!", user: await getProfile(result.id) }
  })

  .get("/api/projects", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getProjects(result.id)
  })

  .post("/api/projects", async ({ headers, set, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { name, description, domain, start_date, package: package_name, token } = body as any
    const project = await createProject(name, description, result.id, domain, start_date, package_name, token)
    await createLog(result.id, project.id, `สร้างโปรเจค "${name}"`)
    return project
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
    const { status, url, name, description, domain, start_date, package: package_name, token } = body as any
    const updated = await updateAdminProject(
      Number(params.id),
      name,
      description,
      status,
      domain,
      start_date,
      package_name,
      token
    )
    // สร้าง notification อัตโนมัติ พร้อมแนบ URL
    await createNotification(
      updated.user_id,
      updated.id,
      `โปรเจค "${updated.name}" ถูกเปลี่ยนสถานะเป็น "${status}"`,
      url || null
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
    const { name, description, domain, start_date, package: package_name, token } = body as any
    try {
      return await updateProject(Number(params.id), name, description, result.id, domain, start_date, package_name, token)
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

 // ดู comment ทั้งหมดในโปรเจค
  .get("/api/projects/:id/comments", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getComments(Number(params.id))
  })

  // เพิ่ม comment
  .post("/api/projects/:id/comments", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { content } = body as any
    if (!content) {
      set.status = 400
      return { message: "กรุณาใส่ข้อความ" }
    }
    return createComment(Number(params.id), result.id, content)
  })

  // ลบ comment
  .delete("/api/comments/:commentId", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      return await deleteComment(Number(params.commentId), result.id, result.role)
    } catch (err: any) {
      set.status = 403
      return { message: err.message }
    }
  })
// ดูไฟล์ทั้งหมดในโปรเจค
  .get("/api/projects/:id/files", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getFiles(Number(params.id))
  })

  // อัปโหลดไฟล์
  .post("/api/projects/:id/files", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    
    const { file } = body as any
    if (!file) {
      set.status = 400
      return { message: "กรุณาเลือกไฟล์" }
    }

    const filename = file.name
    const filesize = file.size
    const uploadDir = "./uploads"
    const filepath = `${uploadDir}/${Date.now()}_${filename}`

    // บันทึกไฟล์ลงในเครื่อง
    await Bun.write(filepath, file)

    return saveFile(Number(params.id), result.id, filename, filepath, filesize)
  })

  // ลบไฟล์
  .delete("/api/files/:id", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      return await deleteFile(Number(params.id), result.id, result.role)
    } catch (err: any) {
      set.status = 403
      return { message: err.message }
    }
  })

  // ดู log ของโปรเจค
  .get("/api/projects/:id/logs", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getProjectLogs(Number(params.id))
  })

  // Admin: ดู log ทั้งหมด
  .get("/api/admin/logs", ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return getAllLogs()
  })

  // Admin: เช็ค Milestone ที่ใกล้ครบกำหนด
  .get("/api/admin/milestones/check-due", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return checkMilestoneDue()
  })
  
// ดู milestone ทั้งหมดของโปรเจค
  .get("/api/projects/:id/milestones", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getMilestones(Number(params.id))
  })

  // Admin: สร้าง milestone
  .post("/api/projects/:id/milestones", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { title, description, start_date, end_date, phase } = body as any
    return createMilestone(Number(params.id), title, description, start_date, end_date, phase)
  })

  // Admin: อัปเดต milestone
  .put("/api/milestones/:id", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { title, description, status, progress, start_date, end_date, phase } = body as any
    try {
      return await updateMilestone(Number(params.id), title, description, status, progress, start_date, end_date, phase)
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // Admin: ลบ milestone
  .delete("/api/milestones/:id", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    try {
      return await deleteMilestone(Number(params.id))
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // Customer: สร้าง Ticket
  .post("/api/projects/:id/feedbacks", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { title, message, priority } = body as any
    if (!title || !message) {
      set.status = 400
      return { message: "กรุณาใส่หัวข้อและรายละเอียด" }
    }
    return createFeedback(Number(params.id), result.id, title, message, priority || "medium")
  })

  // ดู Ticket ทั้งหมดของโปรเจค
  .get("/api/projects/:id/feedbacks", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getFeedbacks(Number(params.id))
  })

  // Admin: ดู Ticket ทั้งหมดในระบบ
  .get("/api/admin/feedbacks", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return getAllFeedbacks()
  })

  // Admin: เปลี่ยนสถานะ Ticket
  .patch("/api/admin/feedbacks/:id/status", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { status } = body as any
    try {
      return await updateFeedbackStatus(Number(params.id), status)
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // ตอบกลับ Ticket
  .post("/api/feedbacks/:id/replies", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { message } = body as any
    if (!message) {
      set.status = 400
      return { message: "กรุณาใส่ข้อความ" }
    }
    return createFeedbackReply(Number(params.id), result.id, message)
  })

  // ดูการตอบกลับของ Ticket
  .get("/api/feedbacks/:id/replies", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getFeedbackReplies(Number(params.id))
  })

  // Customer: รายงานโปรเจคของตัวเอง
  .get("/api/reports", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getReport(result.id)
  })

  // Admin: รายงานภาพรวมทุกโปรเจค
  .get("/api/admin/reports", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    return getAdminReport()
  })

  // Git Pulse: ดึงข้อมูล Commit จาก GitHub
  .get("/api/gitpulse", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      const response = await fetch(
        "https://api.github.com/repos/aekburut5740-commits/the_project/commits",
        {
          headers: {
            "User-Agent": "the_project-app"
          }
        }
      )
      if (!response.ok) {
        set.status = 400
        return { message: "ไม่สามารถดึงข้อมูลจาก GitHub ได้" }
      }
      const commits = await response.json() as any[]
      const recentCommits = commits.slice(0, 10).map((c: any) => ({
        id: c.sha,
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url
      }))
      return { repo: "aekburut5740-commits/the_project", commits: recentCommits }
    } catch (err: any) {
      set.status = 500
      return { message: "เกิดข้อผิดพลาด" }
    }
  })
// ดูสถานะ Maintenance Mode (ทุกคนดูได้)
  .get("/api/maintenance", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getMaintenanceStatus()
  })

  // Admin: เปิด/ปิด Maintenance Mode
  .patch("/api/admin/maintenance", async ({ headers, set, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { is_active, message } = body as any
    return setMaintenanceMode(is_active, message)
  })

  // Customer: บันทึกเวลาที่คลิกลิงก์ใน Notification
  .patch("/api/notifications/:id/click", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      return await clickNotification(Number(params.id), result.id)
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // รับข้อมูล Webhook จาก GitHub
  .post("/api/webhook/git-push", async ({ body, set }) => {
    try {
      const payload = body as any
      const event = "push"
      const pusher = payload?.pusher?.name || "unknown"
      const branch = payload?.ref?.replace("refs/heads/", "") || "unknown"
      const commit = payload?.commits?.[0]
      const commit_message = commit?.message || ""
      const commit_url = commit?.url || ""
      const repository = payload?.repository?.full_name || ""
      const pushed_at = payload?.repository?.pushed_at
        ? new Date(payload.repository.pushed_at * 1000).toISOString()
        : new Date().toISOString()

      return await saveWebhook(event, pusher, branch, commit_message, commit_url, repository, pushed_at)
    } catch (err: any) {
      set.status = 400
      return { message: "รับข้อมูลไม่สำเร็จ" }
    }
  })

  // ดู Webhook ทั้งหมด
  .get("/api/webhook/git-push", async ({ headers, set }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getWebhooks()
  })
  // แก้ไขโปรไฟล์
  .put("/api/profile", async ({ headers, set, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { username, email } = body as any
    if (!username || !email) {
      set.status = 400
      return { message: "กรุณากรอกชื่อผู้ใช้และอีเมล" }
    }
    try {
      return await updateProfile(result.id, username, email)
    } catch (err: any) {
      set.status = 400
      return { message: err.message }
    }
  })

  // เปลี่ยนรหัสผ่าน
  .put("/api/profile/password", async ({ headers, set, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { old_password, new_password } = body as any
    if (!old_password || !new_password) {
      set.status = 400
      return { message: "กรุณากรอกรหัสผ่านให้ครบ" }
    }
    try {
      return await changePassword(result.id, old_password, new_password)
    } catch (err: any) {
      set.status = 400
      return { message: err.message }
    }
  })

  // ดูผู้ดูแลโปรเจค
  .get("/api/projects/:id/members", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getProjectMembers(Number(params.id))
  })

  // Admin: เพิ่มผู้ดูแลโปรเจค
  .post("/api/projects/:id/members", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { name, role } = body as any
    if (!name) {
      set.status = 400
      return { message: "กรุณาใส่ชื่อผู้ดูแล" }
    }
    return addProjectMember(Number(params.id), name, role || "ผู้ดูแลโปรเจค")
  })

  // Admin: ลบผู้ดูแลโปรเจค
  .delete("/api/members/:id", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    try {
      return await removeProjectMember(Number(params.id))
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // เสิร์ฟไฟล์จาก uploads folder
  .get("/uploads/:filename", async ({ params, set }) => {
    const filepath = `./uploads/${params.filename}`
    const file = Bun.file(filepath)
    const exists = await file.exists()
    if (!exists) {
      set.status = 404
      return { message: "ไม่พบไฟล์" }
    }
    return new Response(file)
  })
  
  .listen(4000)

console.log("Server running on port 4000")
