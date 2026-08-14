import { register, login, getProfile, getProjects, createProject, getAllProjects, updateProjectStatus, getAllUsers, updateProject, updateAdminProject, deleteProject, refreshToken, getDashboardSummary, getProjectHealth, updateProjectProgress, getAdminDashboard, createNotification, getNotifications, markAsRead, markAllAsRead, deleteNotification, getComments, createComment, deleteComment, saveFile, getFiles, deleteFile, createLog, getProjectLogs, getAllLogs, getMilestones, createMilestone, updateMilestone, deleteMilestone, createFeedback, getFeedbacks, getAllFeedbacks, createGuestFeedback, updateFeedbackStatus, createFeedbackReply, getFeedbackReplies, getReport, getAdminReport, checkMilestoneDue, getMaintenanceStatus, setMaintenanceMode, clickNotification, saveWebhook, getWebhooks, updateProfile, changePassword, getProjectMembers, addProjectMember, removeProjectMember, getProjectByShareToken, getProjectByName, generateShareToken, markFeedbackAsRead, getUnreadCount, markRepliesAsRead, getMilestoneTasks, createMilestoneTask, updateMilestoneTask, deleteMilestoneTask, createMilestoneLog, getMilestoneLogs, getMilestoneProgressHistory, getProjectById } from "../database/route";
import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"
import jwt from "jsonwebtoken"
import type { JwtPayload } from "jsonwebtoken"
import path from "path"
import { deployProject, getDeployStatus, ensureDirs, slugify } from "./deploy"
const { WORK_ROOT } = ensureDirs()
const UPLOADS_DIR = path.join(__dirname, "../uploads")
if (!process.env.JWT_SECRET) {
  throw new Error("ไม่พบ JWT_SECRET ใน environment variable กรุณาตั้งค่าใน .env ก่อนรันเซิร์ฟเวอร์")
}
const JWT_SECRET = process.env.JWT_SECRET
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

async function resolveWorkFile(baseDir: string, fileParts: string[]): Promise<string | null> {
  let filePath = path.join(baseDir, ...fileParts)
  if (fileParts.length === 0 || (await Bun.file(filePath).exists()) === false) {
    filePath = path.join(filePath, "index.html")
  }
  const file = Bun.file(filePath)
  if (!(await file.exists())) return null
  return filePath
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
  // Public Guest Project By Name (No Auth required) — สำหรับ path /{project}/{commit}
  .get("/api/guest/project/:name", async ({ params, set }) => {
    try {
      const project = await getProjectByName(params.name)
      return {
        project,
        message: "ดึงข้อมูลโปรเจคสำหรับ Guest สำเร็จ"
      }
    } catch (err: any) {
      set.status = 404
      return { message: err.message || "ไม่พบโปรเจคที่ต้องการดู" }
    }
  })
  // Public Deploy Status (No Auth required)
  .get("/api/guest/deploy-status/:name", async ({ params }) => {
    return getDeployStatus(params.name)
  })
  // Admin: Trigger Deploy (clone + build + serve) — ไม่บล็อก request ให้ build ทำงาน background
  .post("/api/admin/projects/:id/deploy", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    try {
      const project = await getProjectById(Number(params.id))
      if (!project) {
        set.status = 404
        return { message: "ไม่พบโปรเจค" }
      }
      const current = getDeployStatus(project.name)
      if (current.state === "building") {
        return { message: "กำลัง Build อยู่ อย่าซ้ำซ้อน", status: current }
      }
      const requestedCommit = (body as { commit?: string } | undefined)?.commit
      deployProject(project, requestedCommit).catch(() => {})
      const building = getDeployStatus(project.name)
      return { message: "เริ่ม Deploy แล้ว", status: building }
    } catch (err: any) {
      set.status = 500
      return { message: err.message || "เกิดข้อผิดพลาดในการ Deploy" }
    }
  })
  // Public Guest Feedback Endpoint (No Auth required)
  .post("/api/guest/feedbacks", async ({ body, set }) => {
    const { token, title, message, priority, guest_name, guest_email } = body as {
      token?: string
      title?: string
      message?: string
      priority?: string
      guest_name?: string
      guest_email?: string
    }
    const cleanTitle = title?.trim()
    const cleanMessage = message?.trim()
    if (!token || !cleanTitle || !cleanMessage) {
      set.status = 400
      return { message: "กรุณากรอกข้อมูลให้ครบ (Token, หัวข้อ และรายละเอียด)" }
    }
    try {
      const project = await getProjectByShareToken(token)
      const feedback = await createGuestFeedback(
        Number(project.id),
        guest_name?.trim() ?? "",
        guest_email?.trim() ?? "",
        cleanTitle,
        cleanMessage,
        priority || "medium"
      )
      return { feedback, message: "ส่ง Feedback สำเร็จ" }
    } catch (err: any) {
      set.status = 404
      return { message: err.message || "ไม่พบโปรเจคที่ต้องการส่ง Feedback" }
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
  .post("/api/projects/:id/share-token", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result

    const project = await getProjectById(Number(params.id))
    if (!project) {
      set.status = 404
      return { message: "ไม่พบโปรเจค" }
    }

    if (result.role !== "admin" && project.user_id !== result.id) {
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
  // Admin: Generate Share Token (legacy compatibility)
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
    const { identifier, username, email, password } = body as {
      identifier?: string
      username?: string
      email?: string
      password?: string
    }
    const cleanIdentifier = (identifier ?? username ?? email)?.trim()
    if (!cleanIdentifier || !password) {
      set.status = 400

      return {
        message: "กรุณากรอก Username/Email และ Password ให้ครบ",
      }
    }

    try {
      const result = await login(
        cleanIdentifier,
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
      user_id,
    } = body as {
      name?: string
      description?: string
      domain?: string
      website?: string
      start_date?: string
      package?: string
      token?: string
      user_id?: number
    }
    const cleanName = name?.trim()
    const cleanDescription = description?.trim() ?? ""

    if (!cleanName) {
      set.status = 400

      return {
        message: "กรุณากรอกชื่อโปรเจค",
      }
    }
    // เฉพาะแอดมินเท่านั้นที่เลือกเจ้าของโปรเจคเองได้ ลูกค้าทั่วไปเป็นเจ้าของโปรเจคตัวเองเสมอ
    const ownerId = auth.role === "admin" && user_id ? Number(user_id) : auth.id
    try {
      const project = await createProject(
        cleanName,
        cleanDescription,
        ownerId,
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
    const {
      status,
      url,
      name,
      description,
      domain,
      website,
      start_date,
      package: package_name,
      token,
      user_id
    } = body as any
    const updated = await updateAdminProject(
      Number(params.id),
      name,
      description,
      status,
      domain,
      start_date,
      package_name,
      token,
      website,
      user_id
    )
    // สร้าง notification อัตโนมัติ พร้อมแนบ URL
    if (updated.user_id) {
  await createNotification(
    updated.user_id,
    updated.id,
    `Admin อัปเดตโปรเจค "${updated.name}"${status ? ` → สถานะ "${status}"` : ""}`,
    `/dashboard/projects/${updated.id}`
  )
}
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
    if (result.role !== "admin") {
      try {
        await getProjectHealth(Number(params.id), result.id, result.role)
      } catch (err: any) {
        set.status = 403
        return { message: "ไม่มีสิทธิ์เข้าถึงโปรเจคนี้" }
      }
    }
    return getFiles(Number(params.id))
  })

 // อัปโหลดไฟล์
  .post("/api/projects/:id/files", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      try {
        await getProjectHealth(Number(params.id), result.id, result.role)
      } catch (err: any) {
        set.status = 403
        return { message: "ไม่มีสิทธิ์เข้าถึงโปรเจคนี้" }
      }
    }
    const { file, category, is_confidential } = body as any

    const filename = file.name
    const filesize = file.size
    const uploadDir = "./uploads"
    const filepath = `${uploadDir}/${Date.now()}_${filename}`

    // บันทึกไฟล์ลงในเครื่อง
    await Bun.write(filepath, file)

    return saveFile(
      Number(params.id),
      result.id,
      filename,
      filepath,
      filesize,
      category,
      is_confidential === "true" || is_confidential === true
    )
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
      const updated = await updateMilestone(Number(params.id), title, description, status, progress, start_date, end_date, phase)
      await createMilestoneLog(result.id, updated.id, `${result.username} แก้ไข Milestone "${updated.title}"`)
      return updated
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

  // ดู task ทั้งหมดของ milestone
  .get("/api/milestones/:id/tasks", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getMilestoneTasks(Number(params.id))
  })
  // Admin: สร้าง task ใหม่
  .post("/api/milestones/:id/tasks", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    const { title } = body as any
    if (!title) {
      set.status = 400
      return { message: "กรุณาใส่ชื่อ task" }
    }
    const task = await createMilestoneTask(Number(params.id), title)
    await createMilestoneLog(result.id, Number(params.id), `${result.username} เพิ่ม task ใหม่ "${title}"`)
    return task
  })
  // อัปเดต task (เปลี่ยนชื่อ หรือติ๊กว่าเสร็จแล้ว)
  .patch("/api/milestone-tasks/:id", async ({ headers, set, params, body }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    const { title, is_done } = body as any
    try {
      const updated = await updateMilestoneTask(Number(params.id), title, is_done)
      if (is_done !== undefined) {
        await createMilestoneLog(
          result.id,
          updated.milestone_id,
          `${result.username} อัปเดตสถานะของ task "${updated.title}" เป็น ${is_done ? "เสร็จแล้ว" : "ยังไม่เสร็จ"}`
        )
      }
      if (title !== undefined) {
        await createMilestoneLog(result.id, updated.milestone_id, `${result.username} แก้ไขชื่อ task เป็น "${title}"`)
      }
      return updated
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })
  // Admin: ลบ task
  .delete("/api/milestone-tasks/:id", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    if (result.role !== "admin") {
      set.status = 403
      return { message: "ไม่มีสิทธิ์เข้าถึง" }
    }
    try {
      const deleted = await deleteMilestoneTask(Number(params.id))
      await createMilestoneLog(result.id, deleted.milestone_id, `${result.username} ลบ task "${deleted.title}"`)
      return deleted
    } catch (err: any) {
      set.status = 404
      return { message: err.message }
    }
  })

  // ดู Activity Log ของ milestone
  .get("/api/milestones/:id/logs", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getMilestoneLogs(Number(params.id))
  })
  // ดู Activity Log ของ milestone (ชื่อสำรอง ให้ผลลัพธ์เหมือนกัน)
  .get("/api/milestones/:id/activity", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getMilestoneLogs(Number(params.id))
  })

  // ดูประวัติความคืบหน้าของ milestone (สำหรับกราฟ)
  .get("/api/milestones/:id/progress-history", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return getMilestoneProgressHistory(Number(params.id))
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
  // ทำเครื่องหมายว่าอ่านข้อความตอบกลับในทิกเก็ตนี้แล้ว
  .patch("/api/feedbacks/:id/replies/read", async ({ headers, set, params }) => {
    const result = authCheck({ headers, set })
    if (set.status === 401) return result
    return await markRepliesAsRead(Number(params.id), result.id)
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
 
 
  // ดูสถานะ Maintenance Mode (ทุกคนดูได้ ไม่ต้อง login)
.get("/api/maintenance", async () => {
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
  // เสิร์ฟผล Build ที่ Deploy แล้ว — /work/{project}/* หรือ /work/{project}/{commit}/*
  .get("/work/*", async ({ params, request, set }) => {
    const url = new URL(request.url)
    const fullPath = decodeURIComponent(url.pathname.replace(/^\/work\//, ""))
    const segments = fullPath.split("/").filter(Boolean)
    if (!segments.length) {
      set.status = 404
      return { message: "ไม่พบโปรเจคที่ระบุ" }
    }
    const projectName = slugify(segments[0])
    const projectRoot = path.join(WORK_ROOT, projectName)

    // กรณี URL เป็น /work/{project}/{commit}/* → พยายามหา build เฉพาะ commit
    const hasCommitSegment = segments.length >= 2
    const commitCandidate = hasCommitSegment ? segments[1] : ""
    const commitDir = hasCommitSegment ? path.join(projectRoot, commitCandidate) : ""
    const commitBuilt = hasCommitSegment && commitCandidate !== "latest" &&
      (await Bun.file(path.join(commitDir, "index.html")).exists())

    // commit ที่ขอมี build แยก → เสิร์ฟจากโฟลเดอร์นั้น
    if (commitBuilt) {
      const filePath = await resolveWorkFile(commitDir, segments.slice(2))
      if (!filePath) {
        set.status = 404
        return { message: "ไม่พบไฟล์งาน" }
      }
      return new Response(Bun.file(filePath))
    }

    // ไม่มี commit หรือ commit ยังไม่มี build แยก → เสิร์ฟ build ล่าสุด (จาก status) หรือโครงสร้าง flat เดิม
    // fileParts ตัด commit segment ออกไปด้วย (โหลดไฟล์ของ build ล่าสุดมาแสดงแทน)
    let fileParts = hasCommitSegment ? segments.slice(2) : segments.slice(1)
    const status = getDeployStatus(projectName)
    const latestCommit = status?.commit && status.commit !== "latest" ? status.commit : ""
    const latestDir = latestCommit ? path.join(projectRoot, latestCommit) : ""
    let baseDir = projectRoot

    if (latestDir && (await Bun.file(path.join(latestDir, "index.html")).exists())) {
      baseDir = latestDir
    }

    const filePath = await resolveWorkFile(baseDir, fileParts)
    if (!filePath) {
      set.status = 404
      return { message: "ไม่พบไฟล์งาน" }
    }
    return new Response(Bun.file(filePath))
  })
  .listen({ port: 4000, hostname: "0.0.0.0" })
console.log("Server running on port 4000 (0.0.0.0)")