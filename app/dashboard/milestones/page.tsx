"use client"

import { useState } from "react"
import { Plus, Flag, Calendar, ChevronRight, Check, Clock, AlertCircle } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "overdue"

interface Task {
  id: number
  title: string
  done: boolean
}

interface Milestone {
  id: number
  title: string
  project: string
  description: string
  status: MilestoneStatus
  dueDate: string
  progress: number
  tasks: Task[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MILESTONES: Milestone[] = [
  {
    id: 1,
    title: "UI Design Completion",
    project: "BrandCo Redesign",
    description: "ออกแบบ UI ทุกหน้าให้ครบถ้วนและผ่านการ approve จากลูกค้า",
    status: "completed",
    dueDate: "2025-04-30",
    progress: 100,
    tasks: [
      { id: 1, title: "Wireframe หน้าหลัก", done: true },
      { id: 2, title: "Design System", done: true },
      { id: 3, title: "Prototype", done: true },
    ],
  },
  {
    id: 2,
    title: "Backend API Integration",
    project: "BrandCo Redesign",
    description: "เชื่อมต่อ API ทั้งหมดกับ frontend ให้ครบ",
    status: "in_progress",
    dueDate: "2025-06-15",
    progress: 60,
    tasks: [
      { id: 1, title: "Auth API", done: true },
      { id: 2, title: "Projects API", done: true },
      { id: 3, title: "Notifications API", done: false },
      { id: 4, title: "Reports API", done: false },
    ],
  },
  {
    id: 3,
    title: "Payment Gateway",
    project: "ShopNow E-Commerce",
    description: "ติดตั้งและทดสอบระบบชำระเงินออนไลน์",
    status: "upcoming",
    dueDate: "2025-07-20",
    progress: 0,
    tasks: [
      { id: 1, title: "เลือก payment provider", done: false },
      { id: 2, title: "Sandbox testing", done: false },
      { id: 3, title: "Production deploy", done: false },
    ],
  },
  {
    id: 4,
    title: "Launch & Deployment",
    project: "MediCare Portal",
    description: "Deploy ระบบขึ้น production และทดสอบ load",
    status: "overdue",
    dueDate: "2025-05-01",
    progress: 45,
    tasks: [
      { id: 1, title: "Server setup", done: true },
      { id: 2, title: "CI/CD pipeline", done: false },
      { id: 3, title: "Load testing", done: false },
    ],
  },
]

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string; icon: React.ReactNode }> = {
  upcoming:   { label: "กำลังจะมาถึง", color: "#6b7280", icon: <Clock size={12} /> },
  in_progress:{ label: "กำลังดำเนินการ", color: "#4f8ef7", icon: <ChevronRight size={12} /> },
  completed:  { label: "เสร็จแล้ว", color: "#34d399", icon: <Check size={12} /> },
  overdue:    { label: "เลยกำหนด", color: "#f87171", icon: <AlertCircle size={12} /> },
}

const PROJECTS = ["BrandCo Redesign", "ShopNow E-Commerce", "MediCare Portal"]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MilestonesPage() {
  // TODO: เปลี่ยนเป็น useRole() เมื่อ connect API
  const role: "admin" | "customer" = "admin"

  const [milestones, setMilestones] = useState<Milestone[]>(MOCK_MILESTONES)
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | "all">("all")
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const filtered = filterStatus === "all"
    ? milestones
    : milestones.filter((m) => m.status === filterStatus)

  // Stats
  const stats = {
    total: milestones.length,
    completed: milestones.filter((m) => m.status === "completed").length,
    in_progress: milestones.filter((m) => m.status === "in_progress").length,
    overdue: milestones.filter((m) => m.status === "overdue").length,
  }

  function handleSave(updated: Milestone) {
    if (isCreating) {
      setMilestones((prev) => [...prev, { ...updated, id: Date.now() }])
      setIsCreating(false)
    } else {
      setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
    }
    setEditingMilestone(null)
  }

  function handleDelete(id: number) {
    setMilestones((prev) => prev.filter((m) => m.id !== id))
    setEditingMilestone(null)
  }

  function openCreate() {
    setIsCreating(true)
    setEditingMilestone({
      id: 0,
      title: "",
      project: PROJECTS[0],
      description: "",
      status: "upcoming",
      dueDate: "",
      progress: 0,
      tasks: [],
    })
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Milestones</h1>
          <p style={S.subtitle}>{stats.total} milestones ทั้งหมด</p>
        </div>
        {role === "admin" && (
          <button onClick={openCreate} style={S.addBtn}>
            <Plus size={15} />
            เพิ่ม Milestone
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label: "ทั้งหมด", value: stats.total, color: "#6b7280" },
          { label: "กำลังดำเนินการ", value: stats.in_progress, color: "#4f8ef7" },
          { label: "เสร็จแล้ว", value: stats.completed, color: "#34d399" },
          { label: "เลยกำหนด", value: stats.overdue, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ ...S.statCard, borderTopColor: s.color }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={S.tabGroup}>
        {(["all", "upcoming", "in_progress", "completed", "overdue"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            style={{
              ...S.tabBtn,
              background: filterStatus === s ? "#1f2937" : "transparent",
              color: filterStatus === s ? "#f9fafb" : "#6b7280",
            }}
          >
            {s === "all" ? "ทั้งหมด" : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={S.empty}>ไม่พบ milestone</div>
      ) : (
        <div style={S.list}>
          {filtered.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              isAdmin={role === "admin"}
              onEdit={() => { setIsCreating(false); setEditingMilestone(m) }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {editingMilestone && (
        <EditModal
          milestone={editingMilestone}
          isCreating={isCreating}
          onClose={() => { setEditingMilestone(null); setIsCreating(false) }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ─── Milestone Card ───────────────────────────────────────────────────────────

function MilestoneCard({
  milestone: m,
  isAdmin,
  onEdit,
}: {
  milestone: Milestone
  isAdmin: boolean
  onEdit: () => void
}) {
  const { color, label, icon } = STATUS_CONFIG[m.status]
  const doneTasks = m.tasks.filter((t) => t.done).length

  return (
    <div style={S.card}>
      {/* Left accent */}
      <div style={{ ...S.cardAccent, background: color }} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Flag size={14} color={color} />
              <span style={S.cardTitle}>{m.title}</span>
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{m.project}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44` }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {icon} {label}
              </span>
            </span>
            {isAdmin && (
              <button onClick={onEdit} style={S.editBtn}>แก้ไข</button>
            )}
          </div>
        </div>

        <p style={S.cardDesc}>{m.description}</p>

        {/* Progress */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#6b7280" }}>
              Tasks: {doneTasks}/{m.tasks.length}
            </span>
            <span style={{ color: "#f9fafb", fontWeight: 700, fontFamily: "monospace" }}>
              {m.progress}%
            </span>
          </div>
          <div style={S.progressTrack}>
            <div style={{ ...S.progressFill, width: `${m.progress}%`, background: color }} />
          </div>
        </div>

        {/* Due date */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Calendar size={13} color="#4b5563" />
          <span style={{ fontSize: 12, color: m.status === "overdue" ? "#f87171" : "#6b7280" }}>
            กำหนดส่ง:{" "}
            {new Date(m.dueDate).toLocaleDateString("th-TH", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  milestone,
  isCreating,
  onClose,
  onSave,
  onDelete,
}: {
  milestone: Milestone
  isCreating: boolean
  onClose: () => void
  onSave: (m: Milestone) => void
  onDelete: (id: number) => void
}) {
  const [form, setForm] = useState<Milestone>({ ...milestone })
  const [newTask, setNewTask] = useState("")

  function set(key: keyof Milestone, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addTask() {
    if (!newTask.trim()) return
    set("tasks", [...form.tasks, { id: Date.now(), title: newTask.trim(), done: false }])
    setNewTask("")
  }

  function toggleTask(id: number) {
    set("tasks", form.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  }

  function removeTask(id: number) {
    set("tasks", form.tasks.filter((t) => t.id !== id))
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>{isCreating ? "เพิ่ม Milestone ใหม่" : "แก้ไข Milestone"}</div>
            {!isCreating && <div style={S.modalSub}>{milestone.title}</div>}
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        {/* Body */}
        <div style={S.modalBody}>
          {/* ข้อมูลหลัก */}
          <SectionLabel label="ข้อมูลหลัก" />
          <Field label="ชื่อ Milestone">
            <Input value={form.title} onChange={(v) => set("title", v)} placeholder="ชื่อ milestone" />
          </Field>
          <Field label="โปรเจค">
            <select value={form.project} onChange={(e) => set("project", e.target.value)} style={S.input}>
              {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="คำอธิบาย">
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              style={{ ...S.input, resize: "vertical" }}
            />
          </Field>

          {/* สถานะ */}
          <SectionLabel label="สถานะและกำหนดเวลา" />
          <Field label="สถานะ">
            <select value={form.status} onChange={(e) => set("status", e.target.value as MilestoneStatus)} style={S.input}>
              <option value="upcoming">กำลังจะมาถึง</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จแล้ว</option>
              <option value="overdue">เลยกำหนด</option>
            </select>
          </Field>
          <Field label="วันกำหนดส่ง">
            <Input type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} />
          </Field>
          <Field label={`ความคืบหน้า (${form.progress}%)`}>
            <input
              type="range" min={0} max={100} value={form.progress}
              onChange={(e) => set("progress", Number(e.target.value))}
              style={{ width: "100%", accentColor: "#4f8ef7" }}
            />
          </Field>

          {/* Tasks */}
          <SectionLabel label="Tasks" />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="เพิ่ม task..."
              style={{ ...S.input, flex: 1 }}
            />
            <button onClick={addTask} style={S.addTaskBtn}>+</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.tasks.map((t) => (
              <div key={t.id} style={S.taskRow}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => toggleTask(t.id)}
                  style={{ accentColor: "#4f8ef7", cursor: "pointer" }}
                />
                <span style={{ flex: 1, fontSize: 13, color: t.done ? "#4b5563" : "#d1d5db", textDecoration: t.done ? "line-through" : "none" }}>
                  {t.title}
                </span>
                <button onClick={() => removeTask(t.id)} style={S.removeTaskBtn}>✕</button>
              </div>
            ))}
            {form.tasks.length === 0 && (
              <div style={{ fontSize: 12, color: "#374151", fontStyle: "italic" }}>ยังไม่มี task</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ ...S.modalFooter, justifyContent: isCreating ? "flex-end" : "space-between" }}>
          {!isCreating && (
            <button onClick={() => onDelete(form.id)} style={S.deleteBtn}>ลบ Milestone</button>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
            <button onClick={() => onSave(form)} style={S.saveBtn}>บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={S.input} />
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
  statsRow: { display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderTop: "3px solid", borderRadius: 12, padding: "16px 20px", flex: "1 1 120px", display: "flex", flexDirection: "column", gap: 4 },
  tabGroup: { display: "flex", gap: 4, background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: 4, marginBottom: 20, flexWrap: "wrap" },
  tabBtn: { border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px 22px", display: "flex", gap: 16, position: "relative", overflow: "hidden" },
  cardAccent: { width: 3, borderRadius: 999, flexShrink: 0 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#f9fafb" },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" },
  editBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 7, color: "#9ca3af", fontSize: 12, fontWeight: 600, padding: "5px 12px", cursor: "pointer" },
  progressTrack: { background: "#1f2937", borderRadius: 999, height: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
  empty: { color: "#374151", fontSize: 14, textAlign: "center", padding: "60px 0", fontStyle: "italic" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
  modal: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: 500, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1f2937" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f9fafb" },
  modalSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  closeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer" },
  modalBody: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 },
  modalFooter: { display: "flex", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #1f2937" },
  input: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  taskRow: { display: "flex", alignItems: "center", gap: 10, background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "8px 12px" },
  addTaskBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 18, padding: "0 14px", cursor: "pointer", flexShrink: 0 },
  removeTaskBtn: { background: "transparent", border: "none", color: "#374151", fontSize: 12, cursor: "pointer", padding: 2 },
  saveBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", cursor: "pointer" },
  cancelBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer" },
  deleteBtn: { background: "#1f1215", border: "1px solid #450a0a", borderRadius: 8, color: "#f87171", fontSize: 13, fontWeight: 600, padding: "9px 16px", cursor: "pointer" },
}
