
import { register, login, getProfile, getProjects, createProject, getAllProjects, updateProjectStatus, getAllUsers, updateProject, updateAdminProject, deleteProject, refreshToken, getDashboardSummary, getProjectHealth, updateProjectProgress, getAdminDashboard, createNotification, getNotifications, markAsRead, markAllAsRead, deleteNotification, getComments, createComment, deleteComment, saveFile, getFiles, deleteFile, createLog, getProjectLogs, getAllLogs, getMilestones, createMilestone, updateMilestone, deleteMilestone, createFeedback, getFeedbacks, getAllFeedbacks, updateFeedbackStatus, createFeedbackReply, getFeedbackReplies, getReport, getAdminReport, checkMilestoneDue, getMaintenanceStatus, setMaintenanceMode, clickNotification, saveWebhook, getWebhooks, updateProfile, changePassword, getProjectMembers, addProjectMember, removeProjectMember, getProjectByShareToken, generateShareToken, markFeedbackAsRead, getUnreadCount } from "../database/route"
import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"
import jwt from "jsonwebtoken"
import type { JwtPayload } from "jsonwebtoken"
import path from "path"

const UPLOADS_DIR = path.join(__dirname, "../uploads")
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

  // Public Guest Preview Endpoint (No Auth required)
  .get("/api/guest/preview/:token", async ({ params, set }) => {
    try {
      const project = await getProjectByShareToken(params.token)
      return {
        project,
        message: "ดึงข้อมูล Demo สื่อสารสำหรับ Guest สำเร็จ"
      }
    } catch (err: any) {
      set.status = 404
      return { message: err.message || "ไม่พบโปรเจคที่ต้องการดู" }
    }
  })

  // Git Pulse GitHub Proxy Endpoint
  .get("/api/gitpulse", async ({ query, set }) => {
    const requestedRepo = query?.repo ? String(query.repo) : ""
    const repoToken = query?.token ? String(query.token) : process.env.GITHUB_TOKEN
    const repo = requestedRepo || process.env.GITHUB_REPO || "aekburut5740-commits/the_project"
    try {
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "the-project-app",
      }
      if (repoToken && (repoToken.startsWith("ghp_") || repoToken.startsWith("github_pat_") || repoToken.length > 10)) {
        headers["Authorization"] = `Bearer ${repoToken}`
      }
      const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=15`, {
        headers,
      })
      if (!response.ok) {
        set.status = response.status
        if (response.status === 404) {
          return { message: `ไม่พบ Repository "${repo}" หรือเป็น Private Repo (จำเป็นต้องใส่ GitHub Access Token ในช่อง Token)` }
        }
        if (response.status === 401) {
          return { message: "GitHub Access Token ไม่ถูกต้องหรือไม่มีสิทธิ์อ่าน Repository นี้" }
        }
        return { message: `ไม่สามารถดึงข้อมูล GitHub ได้ (${response.statusText})` }
      }
      const data = (await response.json()) as any[]
      const commits = data.map((item: any) => ({
        id: item.sha,
        message: item.commit?.message?.split("\n")[0] || "",
        author: item.commit?.author?.name || item.author?.login || "Unknown",
        date: item.commit?.author?.date || "",
        url: item.html_url,
      }))
      return { repo, commits }
    } catch (err) {
      set.status = 500
      return { message: "เกิดข้อผิดพลาดขณะเชื่อมต่อ GitHub" }
    }
  })


  // Admin: Generate Share Token
  .post("/api/admin/projects/:id/share-token", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    try {
      const updated = await generateShareToken(Number(params.id))
      return updated
    } catch (err: any) {
      set.status = 400
      return { message: err.message }
    }
  })


  .post("/api/register", async ({ body, set }) => {
    const { username, email, password } = body as {
      username?: string
      email?: string
      password?: string
    }

    try {
      const user = await register(
        username ?? "",
        email ?? "",
        password ?? ""
      )

      set.status = 201

      return {
        message: "สมัครสมาชิกสำเร็จ",
        user,
      }
    } catch (err: unknown) {
      set.status = 400

      return {
        message:
          err instanceof Error
            ? err.message
            : "ไม่สามารถสร้างบัญชีได้",
      }
    }
  })

  .post("/api/login", async ({ body, set }) => {
    const { username, email, password } = body as {
      username?: string
      email?: string
      password?: string
    }

    if (!username?.trim() || !email?.trim() || !password) {
      set.status = 400

      return {
        message: "กรุณากรอก Username, Email และ Password ให้ครบ",
      }
    }

    try {
      const result = await login(
        username.trim(),
        email.trim(),
        password
      )

      return result
    } catch (err: unknown) {
      set.status = 401

      return {
        message:
          err instanceof Error
            ? err.message
            : "Username, Email หรือ Password ไม่ถูกต้อง",
      }
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
    const auth = authCheck({ headers, set })

    if (set.status === 401) {
      return auth
    }

    const {
      name,
      description,
      domain,
      website,
      start_date,
      package: packageName,
      token,
    } = body as {
      name?: string
      description?: string
      domain?: string
      website?: string
      start_date?: string
      package?: string
      token?: string
    }

    const cleanName = name?.trim()
    const cleanDescription = description?.trim() ?? ""

    if (!cleanName) {
      set.status = 400

      return {
        message: "กรุณากรอกชื่อโปรเจค",
      }
    }

    try {
      const project = await createProject(
        cleanName,
        cleanDescription,
        auth.id,
        domain?.trim(),
        start_date,
        packageName,
        token?.trim(),
        website?.trim()
      )

      await createLog(
        auth.id,
        project.id,
        `สร้างโปรเจค "${cleanName}"`
      )

      set.status = 201
      return project
    } catch (err: unknown) {
      set.status = 400

      return {
        message:
          err instanceof Error
            ? err.message
            : "ไม่สามารถสร้างโปรเจคได้",
      }
    }
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
    const { status, url, name, description, domain, website, start_date, package: package_name, token } = body as any
    const updated = await updateAdminProject(
      Number(params.id),
      name,
      description,
      status,
      domain,
      start_date,
      package_name,
      token,
      website
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
    const { name, description, domain, website, start_date, package: package_name, token } = body as any
    try {
      return await updateProject(Number(params.id), name, description, result.id, domain, start_date, package_name, token, website)
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

  // จำนวน notification ที่ยังไม่อ่าน
  .get("/api/unread-count", async ({ headers, set }) => {

    const result = authCheck({ headers, set })

    if (set.status === 401)
      return result

    return await getUnreadCount(
      result.id,
      result.role
    )

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
  // Feedback: ทำเครื่องหมายว่าอ่านแล้ว
  .patch("/api/feedbacks/:id/read", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result

    try {
      return await markFeedbackAsRead(Number(params.id))
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

  // Customer: ลบการแจ้งเตือน
  .delete("/api/notifications/:id", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    try {
      return await deleteNotification(Number(params.id), result.id)
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
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

  // Public Guest Preview (ไม่ต้อง Auth)
  .get("/api/guest/preview/:token", async ({ params, set }) => {
    const { token } = params
    try {
      const allProjects = await getAllProjects()
      const found = allProjects.find(
        (p: any) => p.share_token === token || `demo-${p.id}` === token || String(p.id) === token
      )
      if (found) {
        return { project: found }
      }
      return {
        project: {
          id: 1,
          name: `Guest Demo Project`,
          domain: "http://localhost:3000/dashboard/projects",
          view_count: 1,
        }
      }
    } catch {
      return {
        project: {
          id: 1,
          name: `Guest Demo Project`,
          domain: "http://localhost:3000/dashboard/projects",
          view_count: 1,
        }
      }
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
    const { username, email, avatar } = body as any
    if (!username || !email) {
      set.status = 400
      return { message: "กรุณากรอกชื่อผู้ใช้และอีเมล" }
    }
    try {
      return await updateProfile(result.id, username, email, avatar)
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
    const filepath = path.join(UPLOADS_DIR, params.filename)
    const file = Bun.file(filepath)
    const exists = await file.exists()
    if (!exists) {
      set.status = 404
      return { message: "ไม่พบไฟล์" }
    }
    return new Response(file)
  })



  .listen({ port: 4000, hostname: "0.0.0.0" })

console.log("Server running on port 4000 (0.0.0.0)")
