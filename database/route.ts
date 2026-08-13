import { db } from "../database/db"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { unlink } from "fs/promises"

if (!process.env.JWT_SECRET) {
  throw new Error("ไม่พบ JWT_SECRET ใน environment variable กรุณาตั้งค่าใน .env ก่อนรันเซิร์ฟเวอร์")
}
const JWT_SECRET = process.env.JWT_SECRET

// สมัครสมาชิก
export async function register(
  username: string,
  email: string,
  password: string
) {
  const cleanUsername = username?.trim()
  const cleanEmail = email?.trim().toLowerCase()

  if (!cleanUsername || !cleanEmail || !password) {
    throw new Error("กรุณากรอกข้อมูลให้ครบทุกช่อง")
  }

  if (password.length < 6) {
    throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
  }

  const existingUser = await db.query(
    `SELECT id
     FROM users
     WHERE LOWER(username) = LOWER($1)
        OR LOWER(email) = LOWER($2)
     LIMIT 1`,
    [cleanUsername, cleanEmail]
  )

  if (existingUser.rows.length > 0) {
    throw new Error("Username หรือ Email นี้ถูกใช้งานแล้ว")
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const result = await db.query(
    `INSERT INTO users (username, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, role`,
    [cleanUsername, cleanEmail, hashedPassword, "customer"]
  )

  return result.rows[0]
}

// เข้าสู่ระบบ (ใช้ได้ทั้ง username และ email)
export async function login(
  username: string,
  email: string,
  password: string
) {
  if (!username || !email || !password) {
    throw new Error("Username, Email หรือ Password ไม่ถูกต้อง")
  }

  const result = await db.query(
    `SELECT id, username, email, password, role
     FROM users
     WHERE username = $1 AND email = $2`,
    [username, email]
  )

  if (!result.rows.length) {
    throw new Error("Username, Email หรือ Password ไม่ถูกต้อง")
  }

  const user = result.rows[0]
  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw new Error("Username, Email หรือ Password ไม่ถูกต้อง")
  }

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  )

  return {
    message: "เข้าสู่ระบบสำเร็จ",
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  }
}

export async function getProjects(user_id: number) {
  const result = await db.query(
    `SELECT *
     FROM projects
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [user_id]
  )

  return result.rows
}

export async function createProject(
  name: string,
  description: string,
  user_id: number,
  domain?: string,
  start_date?: string,
  package_name?: string,
  token?: string,
  website?: string
) {
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS website TEXT;`)
  const result = await db.query(
    `INSERT INTO projects (name, description, user_id, domain, start_date, package, token, website) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [name, description, user_id, domain || null, start_date || null, package_name || null, token || null, website || null]
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

export async function getProjectById(projectId: number) {
  const result = await db.query(
    `SELECT * FROM projects WHERE id = $1 LIMIT 1`,
    [projectId]
  )
  return result.rows[0] || null
}

// Admin: อัปเดตสถานะโปรเจค
export async function updateProjectStatus(id: number, status: string) {
  const result = await db.query(
    "UPDATE projects SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  )
  return result.rows[0]
}


export async function updateAdminProject(
  id: number,
  name?: string,
  description?: string,
  status?: string,
  domain?: string,
  start_date?: string,
  package_name?: string,
  token?: string,
  website?: string,
  user_id?: number        // ✅ เพิ่ม parameter นี้
) {
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS website TEXT;`)
  const result = await db.query(
    `UPDATE projects SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       status = COALESCE($3, status),
       domain = COALESCE($4, domain),
       start_date = COALESCE($5, start_date),
       package = COALESCE($6, package),
       token = COALESCE($7, token),
       website = COALESCE($9, website),
       user_id = COALESCE($10, user_id)
     WHERE id = $8 RETURNING *`,
    [name, description, status, domain, start_date || null, package_name, token, id, website, user_id || null]
  )
  if (!result.rows.length) throw new Error("ไม่พบโปรเจค")
  return result.rows[0]
}

// Admin: ดู users ทั้งหมด
export async function getAllUsers() {
  const result = await db.query(
    "SELECT id, username, role, created_at FROM users ORDER BY id"
  )
  return result.rows
}

export async function getProfile(user_id: number) {
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`)
  const result = await db.query("SELECT id, username, email, role, avatar FROM users WHERE id = $1", [user_id])
  if (!result.rows.length) throw new Error("ไม่พบ user")
  return result.rows[0]
}
// Customer: อัปเดตข้อมูลโปรเจคของตัวเอง
export async function updateProject(
  id: number,
  name: string,
  description: string,
  user_id: number,
  domain?: string,
  start_date?: string,
  package_name?: string,
  token?: string,
  website?: string
) {
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS website TEXT;`)
  const result = await db.query(
    `UPDATE projects 
     SET name = $1, description = $2, domain = $3, 
         start_date = $4, package = $5, token = $6, website = $9
     WHERE id = $7 AND user_id = $8 
     RETURNING *`,
    [name, description, domain || null, start_date || null, package_name || null, token || null, id, user_id, website || null]
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
    JWT_SECRET,
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
      on_track: projects.filter(p => p.status === 'on_track').length,
      in_review: projects.filter(p => p.status === 'in_review').length,
      completed: projects.filter(p => p.status === 'completed').length,
      delayed: projects.filter(p => p.status === 'delayed').length,
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
    total_users: Number(usersResult.rows[0].count),
    total_projects: projects.length,
    summary: {
      on_track: projects.filter(p => p.status === 'on_track').length,
      in_review: projects.filter(p => p.status === 'in_review').length,
      completed: projects.filter(p => p.status === 'completed').length,
      delayed: projects.filter(p => p.status === 'delayed').length,
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

// Customer: บันทึกเวลาที่คลิกลิงก์ใน Notification
export async function clickNotification(notification_id: number, user_id: number) {
  const result = await db.query(
    `UPDATE notifications 
     SET clicked_at = NOW()
     WHERE id = $1 AND user_id = $2 
     RETURNING *`,
    [notification_id, user_id]
  )
  if (!result.rows.length) throw new Error("ไม่พบการแจ้งเตือน")
  return result.rows[0]
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

// Customer: ลบการแจ้งเตือนของตัวเอง
export async function deleteNotification(notification_id: number, user_id: number) {
  const result = await db.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *`,
    [notification_id, user_id]
  )
  if (!result.rows.length) throw new Error("ไม่พบการแจ้งเตือน หรือไม่มีสิทธิ์ลบ")
  return result.rows[0]
}

// ===== FILE UPLOAD =====

// บันทึกข้อมูลไฟล์ลง Database
export async function saveFile(project_id: number, user_id: number, filename: string, filepath: string, filesize: number, category?: string, is_confidential?: boolean) {
  await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS category TEXT;`)
  await db.query(`ALTER TABLE files ADD COLUMN IF NOT EXISTS is_confidential BOOLEAN DEFAULT FALSE;`)
  const result = await db.query(
    `INSERT INTO files (project_id, user_id, filename, filepath, filesize, category, is_confidential) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [project_id, user_id, filename, filepath, filesize, category || null, is_confidential ?? false]
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

  if (role === "admin") {
    result = await db.query(
      `SELECT filepath FROM files WHERE id = $1`,
      [file_id]
    )
  } else {
    result = await db.query(
      `SELECT filepath FROM files WHERE id = $1 AND user_id = $2`,
      [file_id, user_id]
    )
  }

  if (!result.rows.length) throw new Error("ไม่พบไฟล์หรือไม่มีสิทธิ์ลบ")

  const filepath = result.rows[0].filepath

  // ลบไฟล์จริงในเครื่องก่อน
  await unlink(filepath).catch(() => {
    // ถ้าไฟล์จริงหายไปแล้ว ไม่ต้องให้พัง
  })

  // แล้วค่อยลบข้อมูลในฐานข้อมูล
  const deleteResult = await db.query(
    `DELETE FROM files WHERE id = $1 RETURNING *`,
    [file_id]
  )

  return deleteResult.rows[0]
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
) {
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

// ===== MILESTONE TASKS =====

async function ensureMilestoneTasksTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS milestone_tasks (
      id SERIAL PRIMARY KEY,
      milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      is_done BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)
}

// ดู task ทั้งหมดของ milestone
export async function getMilestoneTasks(milestone_id: number) {
  await ensureMilestoneTasksTable()
  const result = await db.query(
    `SELECT * FROM milestone_tasks WHERE milestone_id = $1 ORDER BY created_at ASC`,
    [milestone_id]
  )
  return result.rows
}

// คำนวณ progress ของ milestone ใหม่ จาก tasks ทั้งหมดที่มีอยู่จริง แล้วบันทึกลงกราฟ
// (ใช้ร่วมกันทั้งตอนเพิ่ม/แก้/ลบ task เพราะทั้ง 3 เหตุการณ์ทำให้จำนวน task เปลี่ยน)
async function recalculateMilestoneProgress(milestone_id: number) {
  const progressResult = await db.query(
    `UPDATE milestones SET progress = (
       SELECT ROUND(COUNT(*) FILTER (WHERE is_done = true) * 100.0 / NULLIF(COUNT(*), 0))
       FROM milestone_tasks WHERE milestone_id = $1
     ) WHERE id = $1 RETURNING progress`,
    [milestone_id]
  )

  await db.query(
    `CREATE TABLE IF NOT EXISTS milestone_progress_history (
      id SERIAL PRIMARY KEY,
      milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE,
      progress INTEGER NOT NULL,
      recorded_at TIMESTAMP DEFAULT NOW()
    );`
  )
  await db.query(
    `INSERT INTO milestone_progress_history (milestone_id, progress) VALUES ($1, $2)`,
    [milestone_id, progressResult.rows[0]?.progress ?? 0]
  )
}

// Admin: สร้าง task ใหม่
export async function createMilestoneTask(milestone_id: number, title: string) {
  await ensureMilestoneTasksTable()
  const result = await db.query(
    `INSERT INTO milestone_tasks (milestone_id, title) VALUES ($1, $2) RETURNING *`,
    [milestone_id, title]
  )
  await recalculateMilestoneProgress(milestone_id)
  return result.rows[0]
}

// อัปเดต task (เปลี่ยนชื่อ หรือ ติ๊กว่าเสร็จแล้ว)
export async function updateMilestoneTask(id: number, title?: string, is_done?: boolean) {
  const result = await db.query(
    `UPDATE milestone_tasks SET
       title = COALESCE($1, title),
       is_done = COALESCE($2, is_done)
     WHERE id = $3 RETURNING *`,
    [title, is_done, id]
  )
  if (!result.rows.length) throw new Error("ไม่พบ task")
  const updatedTask = result.rows[0]

  await recalculateMilestoneProgress(updatedTask.milestone_id)

  return updatedTask
}

// Admin: ลบ task
export async function deleteMilestoneTask(id: number) {
  const result = await db.query(
    `DELETE FROM milestone_tasks WHERE id = $1 RETURNING *`,
    [id]
  )
  if (!result.rows.length) throw new Error("ไม่พบ task")
  const deletedTask = result.rows[0]

  await recalculateMilestoneProgress(deletedTask.milestone_id)

  return deletedTask
}

// ===== MILESTONE ACTIVITY LOG =====

async function ensureMilestoneLogColumn() {
  await db.query(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS milestone_id INTEGER REFERENCES milestones(id) ON DELETE CASCADE;`)
  // กันไว้เผื่อคอลัมน์ project_id เดิมบังคับห้ามว่าง (log ของ milestone ไม่มี project_id ตรงๆ)
  await db.query(`ALTER TABLE activity_logs ALTER COLUMN project_id DROP NOT NULL;`)
}

export async function createMilestoneLog(user_id: number, milestone_id: number, action: string) {
  await ensureMilestoneLogColumn()
  await db.query(
    `INSERT INTO activity_logs (user_id, milestone_id, action) VALUES ($1, $2, $3)`,
    [user_id, milestone_id, action]
  )
}

// ดู log ทั้งหมดของ milestone
export async function getMilestoneLogs(milestone_id: number) {
  await ensureMilestoneLogColumn()
  const result = await db.query(
    `SELECT activity_logs.*, users.username
     FROM activity_logs
     LEFT JOIN users ON activity_logs.user_id = users.id
     WHERE activity_logs.milestone_id = $1
     ORDER BY activity_logs.created_at DESC`,
    [milestone_id]
  )
  return result.rows
}
// ดูประวัติความคืบหน้าของ milestone (สำหรับกราฟ)
export async function getMilestoneProgressHistory(milestone_id: number) {
  const result = await db.query(
    `SELECT id, progress, recorded_at FROM milestone_progress_history
     WHERE milestone_id = $1 ORDER BY recorded_at ASC`,
    [milestone_id]
  )
  return result.rows
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
  await db.query(`ALTER TABLE feedback_replies ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;`)
  const result = await db.query(
    `SELECT feedback_replies.*, users.username, users.role AS author_role
     FROM feedback_replies 
     JOIN users ON feedback_replies.user_id = users.id
     WHERE feedback_replies.feedback_id = $1 
     ORDER BY feedback_replies.created_at ASC`,
    [feedback_id]
  )
  return result.rows
}

// ทำเครื่องหมายว่าอ่านข้อความตอบกลับแล้ว (เฉพาะข้อความที่ "ไม่ใช่" ของคนที่กำลังเปิดดูอยู่)
export async function markRepliesAsRead(feedback_id: number, viewer_id: number) {
  const result = await db.query(
    `UPDATE feedback_replies SET is_read = TRUE
     WHERE feedback_id = $1 AND user_id != $2 AND is_read = FALSE
     RETURNING id`,
    [feedback_id, viewer_id]
  )
  return { updated: result.rows.length }
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

// ===== WEBHOOK =====

// บันทึกข้อมูล Webhook จาก GitHub
export async function saveWebhook(
  event: string,
  pusher: string,
  branch: string,
  commit_message: string,
  commit_url: string,
  repository: string,
  pushed_at: string
) {
  const result = await db.query(
    `INSERT INTO webhook_logs 
     (event, pusher, branch, commit_message, commit_url, repository, pushed_at) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [event, pusher, branch, commit_message, commit_url, repository, pushed_at]
  )
  return result.rows[0]
}

// ดู Webhook ทั้งหมด
export async function getWebhooks() {
  const result = await db.query(
    `SELECT * FROM webhook_logs 
     ORDER BY created_at DESC 
     LIMIT 20`
  )
  return result.rows
}
// ===== SETTINGS =====

// แก้ไขโปรไฟล์
export async function updateProfile(user_id: number, username: string, email: string, avatar?: string) {
  await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;`)
  const result = await db.query(
    `UPDATE users 
     SET username = $1, email = $2, avatar = COALESCE($3, avatar)
     WHERE id = $4 
     RETURNING id, username, email, role, avatar`,
    [username, email, avatar ?? null, user_id]
  )
  if (!result.rows.length) throw new Error("ไม่พบผู้ใช้งาน")
  return result.rows[0]
}

// เปลี่ยนรหัสผ่าน
export async function changePassword(user_id: number, old_password: string, new_password: string) {
  // ดึงรหัสผ่านเดิมมาเช็คก่อน
  const result = await db.query(
    `SELECT * FROM users WHERE id = $1`,
    [user_id]
  )
  if (!result.rows.length) throw new Error("ไม่พบผู้ใช้งาน")

  const user = result.rows[0]
  const isMatch = await bcrypt.compare(old_password, user.password)
  if (!isMatch) throw new Error("รหัสผ่านเดิมไม่ถูกต้อง")

  const hashed = await bcrypt.hash(new_password, 10)
  await db.query(
    `UPDATE users SET password = $1 WHERE id = $2`,
    [hashed, user_id]
  )
  return { message: "เปลี่ยนรหัสผ่านสำเร็จ" }
}

// ===== PROJECT MEMBERS =====

// ดูผู้ดูแลโปรเจค
export async function getProjectMembers(project_id: number) {
  const result = await db.query(
    `SELECT * FROM project_members 
     WHERE project_id = $1 
     ORDER BY created_at ASC`,
    [project_id]
  )
  return result.rows
}

// เพิ่มผู้ดูแลโปรเจค
export async function addProjectMember(project_id: number, name: string, role: string) {
  const result = await db.query(
    `INSERT INTO project_members (project_id, name, role) 
     VALUES ($1, $2, $3) RETURNING *`,
    [project_id, name, role]
  )
  return result.rows[0]
}

// ลบผู้ดูแลโปรเจค
export async function removeProjectMember(id: number) {
  const result = await db.query(
    `DELETE FROM project_members WHERE id = $1 RETURNING *`,
    [id]
  )
  if (!result.rows.length) throw new Error("ไม่พบผู้ดูแล")
  return result.rows[0]
}

// ===== FEEDBACK READ =====

// บันทึกว่าอ่าน Feedback แล้ว
export async function markFeedbackAsRead(feedback_id: number) {
  const result = await db.query(
    `UPDATE feedbacks SET is_read = TRUE WHERE id = $1 RETURNING *`,
    [feedback_id]
  )
  if (!result.rows.length) throw new Error("ไม่พบ Feedback")
  return result.rows[0]
}

// ===== GUEST PREVIEW & SHARE TOKEN =====

export async function getProjectByShareToken(shareToken: string) {
  // เพิ่ม column ถ้ายังไม่มี
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);`)
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;`)
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;`)

  const result = await db.query(
    `UPDATE projects 
     SET view_count = COALESCE(view_count, 0) + 1,
         last_viewed_at = CURRENT_TIMESTAMP
     WHERE share_token = $1
     RETURNING *`,
    [shareToken]
  )
  if (!result.rows.length) {
    // ถ้ายังไม่เจอ token ใน DB อาจจะลองค้นหาด้วย ID เผื่อ token เป็น "demo-proj-id"
    const fallback = await db.query(`SELECT * FROM projects WHERE id = $1 LIMIT 1`, [isNaN(Number(shareToken)) ? 0 : Number(shareToken)])
    if (fallback.rows.length) return fallback.rows[0]
    throw new Error("ไม่พบโปรเจคที่ต้องการดูพรีวิว หรือ Share Token ไม่ถูกต้อง")
  }
  return result.rows[0]
}

export async function generateShareToken(projectId: number) {
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS share_token VARCHAR(255);`)
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;`)
  await db.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP;`)

  const token = `demo-${projectId}-${Math.random().toString(36).substring(2, 9)}`
  const result = await db.query(
    `UPDATE projects SET share_token = $1 WHERE id = $2 RETURNING *`,
    [token, projectId]
  )
  return result.rows[0]
}

export async function getUnreadCount(
  user_id: number,
  role: string
) {

  const notificationResult = await db.query(
    `
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = $1
    AND is_read = FALSE
    `,
    [user_id]
  )


  let feedbackCount = 0


  if (role === "admin") {

    const feedbackResult = await db.query(
      `
      SELECT COUNT(*)
      FROM feedbacks
      WHERE is_read = FALSE
      `
    )

    feedbackCount = Number(
      feedbackResult.rows[0].count
    )
  }


  return {
    notifications:
      Number(notificationResult.rows[0].count),

    feedbacks:
      feedbackCount,

    total:
      Number(notificationResult.rows[0].count)
      +
      feedbackCount
  }
}