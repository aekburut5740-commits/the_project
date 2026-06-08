// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = "admin" | "customer"
export type ProjectStatus = "pending" | "in_progress" | "completed"
export type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "overdue"
export type DocCategory = "contract" | "proposal" | "design" | "credential" | "report" | "other"

export interface User {
  id: number
  username: string
  role: Role
}

export interface Project {
  id: number
  name: string
  website: string
  description: string
  status: ProjectStatus
  progress: number
  startDate: string
  package: string
  domain: string
  token: string
  ownerId: number
  managers: Manager[]
}

export interface Manager {
  id: number
  name: string
  avatar: string
  color: string
}

export interface Milestone {
  id: number
  title: string
  projectId: number
  description: string
  status: MilestoneStatus
  dueDate: string
  progress: number
  tasks: { id: number; title: string; done: boolean }[]
}

export interface Document {
  id: number
  name: string
  projectId: number
  category: DocCategory
  size: string
  uploadedBy: string
  uploadedAt: string
  isConfidential: boolean
  fileType: "pdf" | "image" | "doc" | "other"
}

// ─── Mock Users ───────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  { id: 1, username: "admin_aek",        role: "admin"    },
  { id: 2, username: "customer_somchai", role: "customer" },
  { id: 3, username: "customer_nisa",    role: "customer" },
]

// เปลี่ยน index นี้เพื่อจำลอง login เป็น user คนละคน
// [0] = admin, [1] = customer มี 2 โปรเจค, [2] = customer มี 1 โปรเจค
export const MOCK_CURRENT_USER: User = MOCK_USERS[0]

// ─── Mock Managers ────────────────────────────────────────────────────────────

const MANAGERS: Manager[] = [
  { id: 1, name: "Aek Burin", avatar: "AB", color: "#4f8ef7" },
  { id: 2, name: "Nisa Wong", avatar: "NW", color: "#a78bfa" },
  { id: 3, name: "Tong Dev",  avatar: "TD", color: "#34d399" },
]

// ─── Mock Projects ────────────────────────────────────────────────────────────

export const MOCK_PROJECTS: Project[] = [
  {
    id: 1, name: "BrandCo Redesign", website: "brandco.com",
    description: "รีดีไซน์เว็บไซต์หลักและระบบ CMS ใหม่ทั้งหมด",
    status: "in_progress", progress: 65, startDate: "2025-03-01",
    package: "Professional", domain: "brandco.com", token: "tok_bc_xK9m2Lp4Qr",
    ownerId: 2, managers: [MANAGERS[0], MANAGERS[1]],
  },
  {
    id: 2, name: "ShopNow E-Commerce", website: "shopnow.co.th",
    description: "พัฒนาระบบร้านค้าออนไลน์พร้อม payment gateway",
    status: "pending", progress: 10, startDate: "2025-05-15",
    package: "Enterprise", domain: "shopnow.co.th", token: "tok_sn_mP3nZq7Yw",
    ownerId: 2, managers: [MANAGERS[0]],
  },
  {
    id: 3, name: "MediCare Portal", website: "medicare-portal.com",
    description: "ระบบนัดหมายและจัดการข้อมูลผู้ป่วยออนไลน์",
    status: "completed", progress: 100, startDate: "2024-11-01",
    package: "Starter", domain: "medicare-portal.com", token: "tok_mc_rT8vXj2Hn",
    ownerId: 3, managers: [MANAGERS[1], MANAGERS[2]],
  },
]

// ─── Mock Milestones ──────────────────────────────────────────────────────────

export const MOCK_MILESTONES: Milestone[] = [
  {
    id: 1, title: "UI Design Completion", projectId: 1,
    description: "ออกแบบ UI ทุกหน้าให้ครบถ้วนและผ่านการ approve",
    status: "completed", dueDate: "2025-04-30", progress: 100,
    tasks: [
      { id: 1, title: "Wireframe หน้าหลัก", done: true },
      { id: 2, title: "Design System", done: true },
      { id: 3, title: "Prototype", done: true },
    ],
  },
  {
    id: 2, title: "Backend API Integration", projectId: 1,
    description: "เชื่อมต่อ API ทั้งหมดกับ frontend ให้ครบ",
    status: "in_progress", dueDate: "2025-06-15", progress: 60,
    tasks: [
      { id: 1, title: "Auth API", done: true },
      { id: 2, title: "Projects API", done: true },
      { id: 3, title: "Notifications API", done: false },
      { id: 4, title: "Reports API", done: false },
    ],
  },
  {
    id: 3, title: "Payment Gateway", projectId: 2,
    description: "ติดตั้งและทดสอบระบบชำระเงินออนไลน์",
    status: "upcoming", dueDate: "2025-07-20", progress: 0,
    tasks: [
      { id: 1, title: "เลือก payment provider", done: false },
      { id: 2, title: "Sandbox testing", done: false },
      { id: 3, title: "Production deploy", done: false },
    ],
  },
  {
    id: 4, title: "Launch & Deployment", projectId: 3,
    description: "Deploy ระบบขึ้น production และทดสอบ load",
    status: "overdue", dueDate: "2025-05-01", progress: 45,
    tasks: [
      { id: 1, title: "Server setup", done: true },
      { id: 2, title: "CI/CD pipeline", done: false },
      { id: 3, title: "Load testing", done: false },
    ],
  },
]

// ─── Mock Documents ───────────────────────────────────────────────────────────

export const MOCK_DOCUMENTS: Document[] = [
  { id: 1, name: "Contract_BrandCo_2025.pdf",  projectId: 1, category: "contract",   size: "2.4 MB", uploadedBy: "Aek Burin", uploadedAt: "2025-03-01", isConfidential: true,  fileType: "pdf"   },
  { id: 2, name: "Design_Brief_BrandCo.pdf",   projectId: 1, category: "design",     size: "5.1 MB", uploadedBy: "Nisa Wong", uploadedAt: "2025-03-05", isConfidential: false, fileType: "pdf"   },
  { id: 3, name: "Proposal_ShopNow_v2.pdf",    projectId: 2, category: "proposal",   size: "1.8 MB", uploadedBy: "Aek Burin", uploadedAt: "2025-05-10", isConfidential: false, fileType: "pdf"   },
  { id: 4, name: "Server_Credentials.txt",     projectId: 2, category: "credential", size: "4 KB",   uploadedBy: "Tong Dev",  uploadedAt: "2025-05-18", isConfidential: true,  fileType: "doc"   },
  { id: 5, name: "Wireframe_MediCare_v1.png",  projectId: 3, category: "design",     size: "8.3 MB", uploadedBy: "Nisa Wong", uploadedAt: "2024-11-10", isConfidential: false, fileType: "image" },
  { id: 6, name: "Monthly_Report_May2025.pdf", projectId: 1, category: "report",     size: "3.2 MB", uploadedBy: "Aek Burin", uploadedAt: "2025-05-31", isConfidential: false, fileType: "pdf"   },
]

// ─── Config ───────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  pending:     { label: "รอดำเนินการ",    color: "#fbbf24" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed:   { label: "เสร็จแล้ว",      color: "#34d399" },
}

export const MILESTONE_STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string }> = {
  upcoming:    { label: "กำลังจะมาถึง",   color: "#6b7280" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed:   { label: "เสร็จแล้ว",      color: "#34d399" },
  overdue:     { label: "เลยกำหนด",       color: "#f87171" },
}

export const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string }> = {
  contract:   { label: "สัญญา",       color: "#f87171" },
  proposal:   { label: "ใบเสนอราคา",  color: "#fbbf24" },
  design:     { label: "ดีไซน์",      color: "#a78bfa" },
  credential: { label: "Credentials", color: "#f97316" },
  report:     { label: "รายงาน",      color: "#34d399" },
  other:      { label: "อื่นๆ",       color: "#6b7280" },
}
