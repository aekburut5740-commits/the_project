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
// Customer: อัปเดตข้อมูลโปรเจคของตัวเอง
export async function updateProject(
  id: number,
  name: string,
  description: string,
  user_id: number
) {
  const result = await db.query(
    `UPDATE projects 
     SET name = $1, description = $2 
     WHERE id = $3 AND user_id = $4 
     RETURNING *`,
    [name, description, id, user_id]
  )
  if (!result.rows.length) {
    throw new Error("ไม่พบโปรเจคหรือไม่มีสิทธิ์แก้ไข")
  }
  return result.rows[0]
}

// Admin: ลบโปรเจค
export async function deleteProject(id: number) {
  const result = await db.query(
    "DELETE FROM projects WHERE id = $1 RETURNING *",
    [id]
  )
  return result.rows[0]
}
// Refresh Token
export async function refreshToken(user_id: number) {
  const result = await db.query(
    "SELECT id, username, role FROM users WHERE id = $1",
    [user_id]
  )
  if (!result.rows.length) {
    throw new Error("ไม่พบ user")
  }
  const user = result.rows[0]
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || "mysecretkey123",
    { expiresIn: "1d" }
  )
  return { token }
}
// ===== DASHBOARD =====

// Customer: ดู dashboard ของตัวเอง
export async function getDashboardSummary(user_id: number) {
  const result = await db.query(
    `SELECT id, name, description, status, progress, created_at
     FROM projects 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [user_id]
  )
  const projects = result.rows

  return {
    total: projects.length,
    summary: {
      on_track:         projects.filter(p => p.status === 'on_track').length,
      in_review:        projects.filter(p => p.status === 'in_review').length,
      completed:        projects.filter(p => p.status === 'completed').length,
      delayed:          projects.filter(p => p.status === 'delayed').length,
    },
    projects
  }
}

// Customer/Admin: ดู health โปรเจคเดียว (progress bar)
export async function getProjectHealth(project_id: number, user_id: number, role: string) {
  let result

  if (role === 'admin') {
    result = await db.query(
      `SELECT p.*, u.username FROM projects p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.id = $1`,
      [project_id]
    )
  } else {
    result = await db.query(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
      [project_id, user_id]
    )
  }

  if (!result.rows.length) throw new Error("ไม่พบโปรเจค")
  return result.rows[0]
}

// Admin: อัปเดต progress (0-100)
export async function updateProjectProgress(id: number, progress: number) {
  if (progress < 0 || progress > 100) throw new Error("Progress ต้องอยู่ระหว่าง 0-100")

  const result = await db.query(
    `UPDATE projects 
     SET progress = $1,
         status = CASE WHEN $1 = 100 THEN 'completed' ELSE status END
     WHERE id = $2 RETURNING *`,
    [progress, id]
  )

  if (!result.rows.length) throw new Error("ไม่พบโปรเจค")
  return result.rows[0]
}

// Admin: Dashboard ภาพรวมทุก user
export async function getAdminDashboard() {
  const projectsResult = await db.query(
    `SELECT p.id, p.name, p.status, p.progress, p.created_at, u.username
     FROM projects p 
     JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC`
  )
  const usersResult = await db.query("SELECT COUNT(*) FROM users")
  const projects = projectsResult.rows

  return {
    total_users:    Number(usersResult.rows[0].count),
    total_projects: projects.length,
    summary: {
      on_track:  projects.filter(p => p.status === 'on_track').length,
      in_review: projects.filter(p => p.status === 'in_review').length,
      completed: projects.filter(p => p.status === 'completed').length,
      delayed:   projects.filter(p => p.status === 'delayed').length,
    },
    projects
  }
}
// ===== NOTIFICATIONS =====

// สร้าง notification (ใช้ภายในระบบ ไม่ใช่ API)
export async function createNotification(user_id: number, project_id: number, message: string, url?: string) {
  await db.query(
    `INSERT INTO notifications (user_id, project_id, message, url) 
     VALUES ($1, $2, $3, $4)`,
    [user_id, project_id, message, url || null]
  )
}

// Customer: ดูการแจ้งเตือนของตัวเอง
export async function getNotifications(user_id: number) {
  // เช็คก่อนว่า Maintenance Mode เปิดอยู่ไหม
  const maintenance = await db.query(
    `SELECT is_active FROM maintenance WHERE id = 1`
  )
  const isMaintenanceActive = maintenance.rows[0]?.is_active

  const result = await db.query(
    `SELECT * FROM notifications 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [user_id]
  )

  // ถ้า Maintenance Mode เปิดอยู่ ให้ซ่อน URL ทั้งหมด
  return result.rows.map((n: any) => ({
    ...n,
    url: isMaintenanceActive ? null : n.url
  }))
}

// Customer: กดอ่านแล้ว (ทีละอัน)
export async function markAsRead(notification_id: number, user_id: number) {
  const result = await db.query(
    `UPDATE notifications 
     SET is_read = TRUE 
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notification_id, user_id]
  )
  if (!result.rows.length) throw new Error("ไม่พบการแจ้งเตือน")
  return result.rows[0]
}

// Customer: กดอ่านทั้งหมด
export async function markAllAsRead(user_id: number) {
  await db.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
    [user_id]
  )
  return { message: "อ่านทั้งหมดแล้ว" }
}

// ===== COMMENTS =====

// ดู comment ทั้งหมดในโปรเจค
export async function getComments(project_id: number) {
  const result = await db.query(
    `SELECT comments.*, users.username 
     FROM comments 
     JOIN users ON comments.user_id = users.id
     WHERE comments.project_id = $1 
     ORDER BY comments.created_at ASC`,
    [project_id]
  )
  return result.rows
}

// เพิ่ม comment
export async function createComment(project_id: number, user_id: number, content: string) {
  const result = await db.query(
    `INSERT INTO comments (project_id, user_id, content) 
     VALUES ($1, $2, $3) RETURNING *`,
    [project_id, user_id, content]
  )
  return result.rows[0]
}

// ลบ comment (เฉพาะเจ้าของหรือ Admin)
export async function deleteComment(comment_id: number, user_id: number, role: string) {
  let result
  if (role === 'admin') {
    result = await db.query(
      `DELETE FROM comments WHERE id = $1 RETURNING *`,
      [comment_id]
    )
  } else {
    result = await db.query(
      `DELETE FROM comments WHERE id = $1 AND user_id = $2 RETURNING *`,
      [comment_id, user_id]
    )
  }
  if (!result.rows.length) throw new Error("ไม่พบ comment หรือไม่มีสิทธิ์ลบ")
  return result.rows[0]
}

// ===== FILE UPLOAD =====

// บันทึกข้อมูลไฟล์ลง Database
export async function saveFile(project_id: number, user_id: number, filename: string, filepath: string, filesize: number) {
  const result = await db.query(
    `INSERT INTO files (project_id, user_id, filename, filepath, filesize) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [project_id, user_id, filename, filepath, filesize]
  )
  return result.rows[0]
}

// ดูไฟล์ทั้งหมดในโปรเจค
export async function getFiles(project_id: number) {
  const result = await db.query(
    `SELECT files.*, users.username 
     FROM files 
     JOIN users ON files.user_id = users.id
     WHERE files.project_id = $1 
     ORDER BY files.created_at DESC`,
    [project_id]
  )
  return result.rows
}

// ลบไฟล์
export async function deleteFile(file_id: number, user_id: number, role: string) {
  let result
  if (role === 'admin') {
    result = await db.query(
      `DELETE FROM files WHERE id = $1 RETURNING *`,
      [file_id]
    )
  } else {
    result = await db.query(
      `DELETE FROM files WHERE id = $1 AND user_id = $2 RETURNING *`,
      [file_id, user_id]
    )
  }
  if (!result.rows.length) throw new Error("ไม่พบไฟล์หรือไม่มีสิทธิ์ลบ")
  return result.rows[0]
}
// ===== ACTIVITY LOG =====

// บันทึก log (ใช้ภายในระบบ)
export async function createLog(user_id: number, project_id: number, action: string) {
  await db.query(
    `INSERT INTO activity_logs (user_id, project_id, action) 
     VALUES ($1, $2, $3)`,
    [user_id, project_id, action]
  )
}

// ดู log ของโปรเจค
export async function getProjectLogs(project_id: number) {
  const result = await db.query(
    `SELECT activity_logs.*, users.username 
     FROM activity_logs 
     LEFT JOIN users ON activity_logs.user_id = users.id
     WHERE activity_logs.project_id = $1 
     ORDER BY activity_logs.created_at DESC`,
    [project_id]
  )
  return result.rows
}

// Admin: ดู log ทั้งหมด
export async function getAllLogs() {
  const result = await db.query(
    `SELECT activity_logs.*, users.username, projects.name as project_name
     FROM activity_logs 
     LEFT JOIN users ON activity_logs.user_id = users.id
     LEFT JOIN projects ON activity_logs.project_id = projects.id
     ORDER BY activity_logs.created_at DESC`
  )
  return result.rows
}
// ===== MILESTONES =====

// ดู milestone ทั้งหมดของโปรเจค (เรียงตาม date)
export async function getMilestones(project_id: number) {
  const result = await db.query(
    `SELECT * FROM milestones 
     WHERE project_id = $1 
     ORDER BY start_date ASC`,
    [project_id]
  )
  return result.rows
}
// Admin: สร้าง milestone
export async function createMilestone(
  project_id: number,
  title: string,
  description: string,
  start_date: string,
  end_date: string,
  phase: string
)
 {
  const result = await db.query(
    `INSERT INTO milestones (project_id, title, description, start_date, end_date, phase) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [project_id, title, description, start_date, end_date, phase]
  )
  return result.rows[0]
}
 

// Admin: อัปเดต milestone
export async function updateMilestone(
  id: number,
  title: string,
  description: string,
  status: string,
  progress: number,
  start_date: string,
  end_date: string,
  phase: string
) {
  const result = await db.query(
    `UPDATE milestones 
     SET title = $1, description = $2, status = $3, 
         progress = $4, start_date = $5, end_date = $6, phase = $7
     WHERE id = $8 RETURNING *`,
    [title, description, status, progress, start_date, end_date, phase, id]
  )
  if (!result.rows.length) throw new Error("ไม่พบ milestone")
  return result.rows[0]
}

// Admin: ลบ milestone
export async function deleteMilestone(id: number) {
  const result = await db.query(
    `DELETE FROM milestones WHERE id = $1 RETURNING *`,
    [id]
  )
  if (!result.rows.length) throw new Error("ไม่พบ milestone")
  return result.rows[0]
}

// ===== FEEDBACK CENTER =====

// Customer: สร้าง Ticket
export async function createFeedback(project_id: number, user_id: number, title: string, message: string, priority: string) {
  const result = await db.query(
    `INSERT INTO feedbacks (project_id, user_id, title, message, priority) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [project_id, user_id, title, message, priority]
  )
  return result.rows[0]
}

// ดู Ticket ทั้งหมดของโปรเจค
export async function getFeedbacks(project_id: number) {
  const result = await db.query(
    `SELECT feedbacks.*, users.username 
     FROM feedbacks 
     JOIN users ON feedbacks.user_id = users.id
     WHERE feedbacks.project_id = $1 
     ORDER BY feedbacks.created_at DESC`,
    [project_id]
  )
  return result.rows
}

// Admin: ดู Ticket ทั้งหมดในระบบ
export async function getAllFeedbacks() {
  const result = await db.query(
    `SELECT feedbacks.*, users.username, projects.name as project_name
     FROM feedbacks 
     JOIN users ON feedbacks.user_id = users.id
     JOIN projects ON feedbacks.project_id = projects.id
     ORDER BY feedbacks.created_at DESC`
  )
  return result.rows
}

// Admin: เปลี่ยนสถานะ Ticket
export async function updateFeedbackStatus(id: number, status: string) {
  const result = await db.query(
    `UPDATE feedbacks SET status = $1 WHERE id = $2 RETURNING *`,
    [status, id]
  )
  if (!result.rows.length) throw new Error("ไม่พบ Ticket")
  return result.rows[0]
}

// ตอบกลับ Ticket
export async function createFeedbackReply(feedback_id: number, user_id: number, message: string) {
  const result = await db.query(
    `INSERT INTO feedback_replies (feedback_id, user_id, message) 
     VALUES ($1, $2, $3) RETURNING *`,
    [feedback_id, user_id, message]
  )
  return result.rows[0]
}

// ดูการตอบกลับของ Ticket
export async function getFeedbackReplies(feedback_id: number) {
  const result = await db.query(
    `SELECT feedback_replies.*, users.username 
     FROM feedback_replies 
     JOIN users ON feedback_replies.user_id = users.id
     WHERE feedback_replies.feedback_id = $1 
     ORDER BY feedback_replies.created_at ASC`,
    [feedback_id]
  )
  return result.rows
}

// ===== REPORTS =====

// Customer: รายงานโปรเจคของตัวเอง
export async function getReport(user_id: number) {
  const projects = await db.query(
    `SELECT id, name, status, progress, created_at 
     FROM projects 
     WHERE user_id = $1 
     ORDER BY created_at DESC`,
    [user_id]
  )

  const milestones = await db.query(
    `SELECT m.*, p.name as project_name 
     FROM milestones m
     JOIN projects p ON m.project_id = p.id
     WHERE p.user_id = $1
     ORDER BY m.start_date ASC`,
    [user_id]
  )

  const feedbacks = await db.query(
    `SELECT f.*, p.name as project_name 
     FROM feedbacks f
     JOIN projects p ON f.project_id = p.id
     WHERE p.user_id = $1
     ORDER BY f.created_at DESC`,
    [user_id]
  )

  return {
    projects: projects.rows,
    milestones: milestones.rows,
    feedbacks: feedbacks.rows
  }
}

// Admin: รายงานภาพรวมทุกโปรเจค
export async function getAdminReport() {
  const projects = await db.query(
    `SELECT p.id, p.name, p.status, p.progress, p.created_at, u.username
     FROM projects p
     JOIN users u ON p.user_id = u.id
     ORDER BY p.created_at DESC`
  )

  const milestones = await db.query(
    `SELECT m.*, p.name as project_name
     FROM milestones m
     JOIN projects p ON m.project_id = p.id
     ORDER BY m.start_date ASC`
  )

  const feedbacks = await db.query(
    `SELECT f.*, u.username, p.name as project_name
     FROM feedbacks f
     JOIN users u ON f.user_id = u.id
     JOIN projects p ON f.project_id = p.id
     ORDER BY f.created_at DESC`
  )

  return {
    projects: projects.rows,
    milestones: milestones.rows,
    feedbacks: feedbacks.rows
  }
}

// ===== MILESTONE DUE CHECK =====

export async function checkMilestoneDue() {
  // ดึง Milestone ที่ยังไม่เสร็จ และเหลือเวลาไม่เกิน 3 วัน
  const result = await db.query(
    `SELECT m.*, p.name as project_name, p.user_id
     FROM milestones m
     JOIN projects p ON m.project_id = p.id
     WHERE m.status != 'completed'
     AND m.end_date <= NOW() + INTERVAL '3 days'
     AND m.end_date >= NOW()`
  )

  // ส่ง Notification ให้ลูกค้าทุก Milestone ที่ใกล้ครบกำหนด
  for (const milestone of result.rows) {
    await db.query(
      `INSERT INTO notifications (user_id, project_id, message)
       VALUES ($1, $2, $3)`,
      [
        milestone.user_id,
        milestone.project_id,
        `Milestone "${milestone.title}" ในโปรเจค "${milestone.project_name}" ใกล้ครบกำหนดแล้ว!`
      ]
    )
  }

  return {
    message: `พบ ${result.rows.length} Milestone ที่ใกล้ครบกำหนด`,
    milestones: result.rows
  }
}

// ===== MAINTENANCE MODE =====

// ดูสถานะ Maintenance Mode
export async function getMaintenanceStatus() {
  const result = await db.query(
    `SELECT * FROM maintenance WHERE id = 1`
  )
  return result.rows[0]
}

// Admin: เปิด/ปิด Maintenance Mode
export async function setMaintenanceMode(is_active: boolean, message: string) {
  const result = await db.query(
    `UPDATE maintenance 
     SET is_active = $1, message = $2, updated_at = NOW()
     WHERE id = 1 RETURNING *`,
    [is_active, message]
  )
  return result.rows[0]
}