"use client"

import { useEffect, useState } from "react"
import { Plus, Flag, Calendar, ChevronRight, Check, Clock, AlertCircle } from "lucide-react"
import { MILESTONE_STATUS_CONFIG, type Milestone, type MilestoneStatus, type Project } from "@/lib/mockData"
import { backend, normalizeMilestone, normalizeProject } from "@/lib/backend"
import { getUser, type AuthUser } from "@/lib/auth"

export default function MilestonesPage() {
  const [user, setUser] = useState<AuthUser>(() => getUser() || ({ id: 0, username: "", role: "customer" } as AuthUser))
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | "all">("all")
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAdmin = user.role === "admin"
  const myProjectIds = projects.map((p) => p.id)

  async function loadData() {
    try {
      setError(null)
      const profile = await backend.profile(); setUser(profile.user)
      const rawProjects = await backend.projects(profile.user.role === "admin")
      const loadedProjects = (Array.isArray(rawProjects) ? rawProjects : []).map(normalizeProject) as Project[]
      const groups = await Promise.all(loadedProjects.map((p) => backend.milestones(p.id).catch(() => [])))
      setProjects(loadedProjects)
      setMilestones(groups.flat().map(normalizeMilestone) as Milestone[])
    } catch (err) { setError(err instanceof Error ? err.message : "โหลด milestone ไม่สำเร็จ") }
  }
  useEffect(() => { void loadData() }, [])

  const filtered = filterStatus === "all" ? milestones : milestones.filter((m) => m.status === filterStatus)
  const stats = { total: milestones.length, completed: milestones.filter((m) => m.status === "completed").length, in_progress: milestones.filter((m) => m.status === "in_progress").length, overdue: milestones.filter((m) => m.status === "overdue").length }

  async function handleSave(updated: Milestone) {
    try {
      const body = { title: updated.title, description: updated.description, status: updated.status, progress: updated.progress, start_date: (updated as any).startDate || null, end_date: updated.dueDate, phase: (updated as any).phase || null }
      if (isCreating) await backend.createMilestone(updated.projectId, body)
      else await backend.updateMilestone(updated.id, body)
      setEditingMilestone(null); setIsCreating(false); await loadData()
    } catch (err) { setError(err instanceof Error ? err.message : "บันทึก milestone ไม่สำเร็จ") }
  }
  async function handleDelete(id: number) {
    try { await backend.deleteMilestone(id); setEditingMilestone(null); await loadData() }
    catch (err) { setError(err instanceof Error ? err.message : "ลบ milestone ไม่สำเร็จ") }
  }
  function openCreate() { setIsCreating(true); setEditingMilestone({ id: 0, title: "", projectId: myProjectIds[0] || 0, description: "", status: "upcoming", dueDate: "", progress: 0, tasks: [] }) }

  return (
    <div style={S.page}>
      {error && <div style={{ color: "#f87171", marginBottom: 14 }}>{error}</div>}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Milestones</h1>
          <p style={S.subtitle}>{isAdmin ? `${stats.total} milestones ทั้งหมด` : `${stats.total} milestones ของโปรเจคคุณ`}</p>
        </div>
        {isAdmin && <button onClick={openCreate} style={S.addBtn}><Plus size={15} /> เพิ่ม Milestone</button>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <span style={{ ...S.roleBadge, background: isAdmin ? "#4f8ef722" : "#34d39922", color: isAdmin ? "#4f8ef7" : "#34d399", border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}` }}>
          {isAdmin ? "👑 Admin — เห็นและแก้ไขได้ทุก milestone" : "👤 Customer — เห็นเฉพาะ milestone ของโปรเจคคุณ"}
        </span>
      </div>

      <div style={S.statsRow}>
        {[
          { label: "ทั้งหมด", value: stats.total, color: "#6b7280" },
          { label: "กำลังดำเนินการ", value: stats.in_progress, color: "#4f8ef7" },
          { label: "เสร็จแล้ว", value: stats.completed, color: "#34d399" },
          { label: "เลยกำหนด", value: stats.overdue, color: "#f87171" },
        ].map((s) => (
          <div key={s.label} style={{ ...S.statCard, borderTopColor: s.color }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.tabGroup}>
        {(["all", "upcoming", "in_progress", "completed", "overdue"] as const).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ ...S.tabBtn, background: filterStatus === s ? "#1f2937" : "transparent", color: filterStatus === s ? "#f9fafb" : "#6b7280" }}>
            {s === "all" ? "ทั้งหมด" : MILESTONE_STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? <div style={S.empty}>ไม่พบ milestone</div> : (
        <div style={S.list}>
          {filtered.map((m) => (
            <MilestoneCard key={m.id} milestone={m} projectName={projects.find((p) => p.id === m.projectId)?.name || ""} isAdmin={isAdmin}
              onEdit={() => { setIsCreating(false); setEditingMilestone(m) }} />
          ))}
        </div>
      )}

      {editingMilestone && isAdmin && (
        <EditModal milestone={editingMilestone} isCreating={isCreating} projectIds={myProjectIds} projects={projects}
          onClose={() => { setEditingMilestone(null); setIsCreating(false) }}
          onSave={handleSave} onDelete={handleDelete} />
      )}
    </div>
  )
}

function MilestoneCard({ milestone: m, projectName, isAdmin, onEdit }: { milestone: Milestone; projectName: string; isAdmin: boolean; onEdit: () => void }) {
  const { color, label } = MILESTONE_STATUS_CONFIG[m.status]
  const doneTasks = m.tasks.filter((t) => t.done).length
  const StatusIcon = m.status === "completed" ? Check : m.status === "overdue" ? AlertCircle : m.status === "in_progress" ? ChevronRight : Clock
  return (
    <div style={S.card}>
      <div style={{ ...S.cardAccent, background: color }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <Flag size={13} color={color} />
              <span style={S.cardTitle}>{m.title}</span>
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{projectName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44`, display: "flex", alignItems: "center", gap: 4 }}>
              <StatusIcon size={11} />{label}
            </span>
            {isAdmin && <button onClick={onEdit} style={S.editBtn}>แก้ไข</button>}
          </div>
        </div>
        <p style={S.cardDesc}>{m.description}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "#6b7280" }}>Tasks: {doneTasks}/{m.tasks.length}</span>
            <span style={{ color: "#f9fafb", fontWeight: 700, fontFamily: "monospace" }}>{m.progress}%</span>
          </div>
          <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${m.progress}%`, background: color }} /></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Calendar size={12} color="#4b5563" />
          <span style={{ fontSize: 12, color: m.status === "overdue" ? "#f87171" : "#6b7280" }}>
            กำหนดส่ง: {new Date(m.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>
    </div>
  )
}

function EditModal({ milestone, isCreating, projectIds, projects, onClose, onSave, onDelete }: {
  milestone: Milestone; isCreating: boolean; projectIds: number[]; projects: Project[]
  onClose: () => void; onSave: (m: Milestone) => void; onDelete: (id: number) => void
}) {
  const [form, setForm] = useState<Milestone>({ ...milestone })
  const [newTask, setNewTask] = useState("")
  function set(key: keyof Milestone, value: any) { setForm((prev) => ({ ...prev, [key]: value })) }
  function addTask() {
    if (!newTask.trim()) return
    set("tasks", [...form.tasks, { id: Date.now(), title: newTask.trim(), done: false }])
    setNewTask("")
  }
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>{isCreating ? "เพิ่ม Milestone ใหม่" : "แก้ไข Milestone"}</div>
            {!isCreating && <div style={S.modalSub}>{milestone.title}</div>}
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.modalBody}>
          <SLabel label="ข้อมูลหลัก" />
          <Field label="ชื่อ"><Input value={form.title} onChange={(v) => set("title", v)} /></Field>
          <Field label="โปรเจค">
            <select value={form.projectId} onChange={(e) => set("projectId", Number(e.target.value))} style={S.input}>
              {projectIds.map((id) => {
                const p = projects.find((x) => x.id === id)
                return <option key={id} value={id}>{p?.name || `Project #${id}`}</option>
              })}
            </select>
          </Field>
          <Field label="คำอธิบาย"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} style={{ ...S.input, resize: "vertical" }} /></Field>
          <SLabel label="สถานะและเวลา" />
          <Field label="สถานะ">
            <select value={form.status} onChange={(e) => set("status", e.target.value as MilestoneStatus)} style={S.input}>
              <option value="upcoming">กำลังจะมาถึง</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จแล้ว</option>
              <option value="overdue">เลยกำหนด</option>
            </select>
          </Field>
          <Field label="วันกำหนดส่ง"><Input type="date" value={form.dueDate} onChange={(v) => set("dueDate", v)} /></Field>
          <Field label={`ความคืบหน้า (${form.progress}%)`}>
            <input type="range" min={0} max={100} value={form.progress} onChange={(e) => set("progress", Number(e.target.value))} style={{ width: "100%", accentColor: "#4f8ef7" }} />
          </Field>
          <SLabel label="Tasks" />
          <div style={{ display: "flex", gap: 8 }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="เพิ่ม task..." style={{ ...S.input, flex: 1 }} />
            <button onClick={addTask} style={S.addTaskBtn}>+</button>
          </div>
          {form.tasks.map((t) => (
            <div key={t.id} style={S.taskRow}>
              <input type="checkbox" checked={t.done} onChange={() => set("tasks", form.tasks.map((x) => x.id === t.id ? { ...x, done: !x.done } : x))} style={{ accentColor: "#4f8ef7", cursor: "pointer" }} />
              <span style={{ flex: 1, fontSize: 13, color: t.done ? "#4b5563" : "#d1d5db", textDecoration: t.done ? "line-through" : "none" }}>{t.title}</span>
              <button onClick={() => set("tasks", form.tasks.filter((x) => x.id !== t.id))} style={S.removeTaskBtn}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ ...S.modalFooter, justifyContent: isCreating ? "flex-end" : "space-between" }}>
          {!isCreating && <button onClick={() => { if (confirm("ลบ milestone นี้?")) onDelete(form.id) }} style={S.deleteBtn}>ลบ</button>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
            <button onClick={() => onSave(form)} style={S.saveBtn}>บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SLabel({ label }: { label: string }) { return <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>{label}</div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>{children}</div> }
function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) { return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={S.input} /> }

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  statsRow: { display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderTop: "3px solid", borderRadius: 12, padding: "16px 20px", flex: "1 1 120px", display: "flex", flexDirection: "column", gap: 4 },
  tabGroup: { display: "flex", gap: 4, background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: 4, marginBottom: 20, flexWrap: "wrap" },
  tabBtn: { border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px 22px", display: "flex", gap: 16 },
  cardAccent: { width: 3, borderRadius: 999, flexShrink: 0 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#f9fafb" },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" as const },
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
  input: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  taskRow: { display: "flex", alignItems: "center", gap: 10, background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "8px 12px" },
  addTaskBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 18, padding: "0 14px", cursor: "pointer", flexShrink: 0 },
  removeTaskBtn: { background: "transparent", border: "none", color: "#374151", fontSize: 12, cursor: "pointer" },
  saveBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", cursor: "pointer" },
  cancelBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer" },
  deleteBtn: { background: "#1f1215", border: "1px solid #450a0a", borderRadius: 8, color: "#f87171", fontSize: 13, fontWeight: 600, padding: "9px 16px", cursor: "pointer" },
}
