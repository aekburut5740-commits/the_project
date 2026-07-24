"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Flag,
  Plus,
  RefreshCw,
} from "lucide-react"
import { backend, normalizeMilestone, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"

type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "overdue"

type Project = {
  id: number
  name: string
  ownerId: number
}

type Milestone = {
  id: number
  projectId: number
  title: string
  description: string
  status: MilestoneStatus
  progress: number
  startDate: string
  dueDate: string
  phase: string
}

type MilestoneForm = Omit<Milestone, "id">

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; color: string }> = {
  upcoming: { label: "กำลังจะมาถึง", color: "#f59e0b" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed: { label: "เสร็จแล้ว", color: "#34d399" },
  overdue: { label: "เลยกำหนด", color: "#f87171" },
}

function toMilestone(row: any): Milestone {
  const normalized = normalizeMilestone(row)
  const status = getDisplayStatus(normalized.status, normalized.dueDate)

  return {
    id: Number(normalized.id),
    projectId: Number(normalized.projectId),
    title: String(normalized.title ?? ""),
    description: String(normalized.description ?? ""),
    status,
    progress: clampProgress(normalized.progress),
    startDate: String(normalized.startDate ?? ""),
    dueDate: String(normalized.dueDate ?? ""),
    phase: String(normalized.phase ?? ""),
  }
}

function getDisplayStatus(status: unknown, dueDate: string): MilestoneStatus {
  const normalizedStatus = String(status ?? "upcoming")

  if (normalizedStatus === "completed") return "completed"
  if (normalizedStatus === "in_progress") return "in_progress"
  if (normalizedStatus === "overdue") return "overdue"

  if (dueDate) {
    const due = new Date(`${dueDate}T23:59:59`)
    if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
      return "overdue"
    }
  }

  return "upcoming"
}

export default function MilestonesPage() {
  const searchParams = useSearchParams()
  const requestedProjectId = Number(searchParams.get("project"))
  const user = getUser()
  const isAdmin = user?.role === "admin"

  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | "all">("all")
  const [filterStatus, setFilterStatus] = useState<MilestoneStatus | "all">("all")
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void loadPage()
  }, [])

  useEffect(() => {
    if (
      Number.isInteger(requestedProjectId) &&
      requestedProjectId > 0 &&
      projects.some((project) => project.id === requestedProjectId)
    ) {
      setSelectedProjectId(requestedProjectId)
    }
  }, [requestedProjectId, projects])

  async function loadPage() {
    setLoading(true)
    setError("")

    try {
      const projectRows = await backend.projects(isAdmin)
      const nextProjects = projectRows.map((row) => {
        const project = normalizeProject(row)
        return {
          id: Number(project.id),
          name: String(project.name ?? `Project #${project.id}`),
          ownerId: Number(project.ownerId ?? 0),
        }
      })

      setProjects(nextProjects)

      const milestoneGroups = await Promise.all(
        nextProjects.map(async (project) => {
          try {
            const rows = await backend.milestones(project.id)
            return rows.map(toMilestone)
          } catch {
            return []
          }
        })
      )

      setMilestones(milestoneGroups.flat())
    } catch (err: unknown) {
      setProjects([])
      setMilestones([])
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Milestones ได้")
    } finally {
      setLoading(false)
    }
  }

  const visibleMilestones = useMemo(() => {
    return milestones.filter((milestone) => {
      const projectMatches =
        selectedProjectId === "all" || milestone.projectId === selectedProjectId
      const statusMatches =
        filterStatus === "all" || milestone.status === filterStatus

      return projectMatches && statusMatches
    })
  }, [milestones, selectedProjectId, filterStatus])

  const stats = useMemo(
    () => ({
      total: milestones.length,
      completed: milestones.filter((item) => item.status === "completed").length,
      inProgress: milestones.filter((item) => item.status === "in_progress").length,
      overdue: milestones.filter((item) => item.status === "overdue").length,
    }),
    [milestones]
  )

  function openCreate() {
    if (projects.length === 0) {
      setError("ต้องมีโปรเจคอย่างน้อยหนึ่งโปรเจคก่อนเพิ่ม Milestone")
      return
    }

    const defaultProjectId =
      selectedProjectId !== "all" ? selectedProjectId : projects[0].id

    setIsCreating(true)
    setEditingMilestone({
      id: 0,
      projectId: defaultProjectId,
      title: "",
      description: "",
      status: "upcoming",
      progress: 0,
      startDate: "",
      dueDate: "",
      phase: "",
    })
  }

  async function handleSave(form: MilestoneForm) {
    setSaving(true)
    setError("")

    try {
      if (!form.title.trim()) {
        throw new Error("กรุณากรอกชื่อ Milestone")
      }

      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        progress: clampProgress(form.progress),
        start_date: form.startDate || null,
        end_date: form.dueDate || null,
        phase: form.phase.trim(),
      }

      if (isCreating) {
        const created = await backend.createMilestone(form.projectId, body)
        setMilestones((previous) => [...previous, toMilestone(created)])
      } else if (editingMilestone) {
        const updated = await backend.updateMilestone(editingMilestone.id, body)
        const normalized = toMilestone(updated)

        setMilestones((previous) =>
          previous.map((item) => (item.id === normalized.id ? normalized : item))
        )
      }

      setEditingMilestone(null)
      setIsCreating(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ไม่สามารถบันทึก Milestone ได้")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    setSaving(true)
    setError("")

    try {
      await backend.deleteMilestone(id)
      setMilestones((previous) => previous.filter((item) => item.id !== id))
      setEditingMilestone(null)
      setIsCreating(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ไม่สามารถลบ Milestone ได้")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Milestones</h1>
          <p style={S.subtitle}>
            {isAdmin
              ? `${stats.total} milestones ทั้งหมด`
              : `${stats.total} milestones ของโปรเจคคุณ`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => void loadPage()} style={S.secondaryBtn}>
            <RefreshCw size={14} /> รีเฟรช
          </button>

          {isAdmin && (
            <button type="button" onClick={openCreate} style={S.addBtn}>
              <Plus size={15} /> เพิ่ม Milestone
            </button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            ...S.roleBadge,
            background: isAdmin ? "#4f8ef722" : "#34d39922",
            color: isAdmin ? "#4f8ef7" : "#34d399",
            border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}`,
          }}
        >
          {isAdmin
            ? "👑 Admin — เห็นและแก้ไขได้ทุก Milestone"
            : "👤 Customer — เห็นเฉพาะ Milestone ของโปรเจคคุณ"}
        </span>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.statsRow}>
        {[
          { label: "ทั้งหมด", value: stats.total, color: "#6b7280" },
          { label: "กำลังดำเนินการ", value: stats.inProgress, color: "#4f8ef7" },
          { label: "เสร็จแล้ว", value: stats.completed, color: "#34d399" },
          { label: "เลยกำหนด", value: stats.overdue, color: "#f87171" },
        ].map((item) => (
          <div key={item.label} style={{ ...S.statCard, borderTopColor: item.color }}>
            <div style={S.statValue}>{item.value}</div>
            <div style={S.statLabel}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={S.controls}>
        <select
          value={selectedProjectId}
          onChange={(event) =>
            setSelectedProjectId(
              event.target.value === "all" ? "all" : Number(event.target.value)
            )
          }
          style={S.projectSelect}
        >
          <option value="all">ทุกโปรเจค</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        <div style={S.tabGroup}>
          {(["all", "upcoming", "in_progress", "completed", "overdue"] as const).map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                style={{
                  ...S.tabBtn,
                  background: filterStatus === status ? "#1f2937" : "transparent",
                  color: filterStatus === status ? "#f9fafb" : "#6b7280",
                }}
              >
                {status === "all" ? "ทั้งหมด" : STATUS_CONFIG[status].label}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div style={S.empty}>กำลังโหลด Milestones...</div>
      ) : visibleMilestones.length === 0 ? (
        <div style={S.empty}>
          {milestones.length === 0
            ? "ยังไม่มี Milestone"
            : "ไม่พบ Milestone ที่ตรงกับตัวกรอง"}
        </div>
      ) : (
        <div style={S.list}>
          {visibleMilestones.map((milestone) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              projectName={
                projects.find((project) => project.id === milestone.projectId)?.name ??
                `Project #${milestone.projectId}`
              }
              isAdmin={isAdmin}
              onEdit={() => {
                setIsCreating(false)
                setEditingMilestone(milestone)
              }}
            />
          ))}
        </div>
      )}

      {editingMilestone && isAdmin && (
        <EditModal
          milestone={editingMilestone}
          projects={projects}
          isCreating={isCreating}
          saving={saving}
          onClose={() => {
            if (saving) return
            setEditingMilestone(null)
            setIsCreating(false)
          }}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

function MilestoneCard({
  milestone,
  projectName,
  isAdmin,
  onEdit,
}: {
  milestone: Milestone
  projectName: string
  isAdmin: boolean
  onEdit: () => void
}) {
  const { color, label } = STATUS_CONFIG[milestone.status]
  const StatusIcon =
    milestone.status === "completed"
      ? Check
      : milestone.status === "overdue"
        ? AlertCircle
        : milestone.status === "in_progress"
          ? ChevronRight
          : Clock

  return (
    <div style={S.card}>
      <div style={{ ...S.cardAccent, background: color }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={S.cardHeader}>
          <div>
            <div style={S.cardTitleRow}>
              <Flag size={13} color={color} />
              <span style={S.cardTitle}>{milestone.title}</span>
            </div>
            <span style={S.projectName}>{projectName}</span>
          </div>

          <div style={S.cardActions}>
            <span
              style={{
                ...S.badge,
                background: `${color}22`,
                color,
                border: `1px solid ${color}44`,
              }}
            >
              <StatusIcon size={11} /> {label}
            </span>

            {isAdmin && (
              <button type="button" onClick={onEdit} style={S.editBtn}>
                แก้ไข
              </button>
            )}
          </div>
        </div>

        <p style={S.cardDesc}>
          {milestone.description || "ยังไม่มีคำอธิบาย"}
        </p>

        <div style={S.metaRow}>
          <span>Phase: {milestone.phase || "ยังไม่ระบุ"}</span>
          <span>{milestone.progress}%</span>
        </div>

        <div style={S.progressTrack}>
          <div
            style={{
              ...S.progressFill,
              width: `${clampProgress(milestone.progress)}%`,
              background: color,
            }}
          />
        </div>

        <div style={S.dateRow}>
          <Calendar size={12} color="#4b5563" />
          <span style={{ color: milestone.status === "overdue" ? "#f87171" : "#6b7280" }}>
            {formatDateRange(milestone.startDate, milestone.dueDate)}
          </span>
        </div>
      </div>
    </div>
  )
}

function EditModal({
  milestone,
  projects,
  isCreating,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  milestone: Milestone
  projects: Project[]
  isCreating: boolean
  saving: boolean
  onClose: () => void
  onSave: (form: MilestoneForm) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [form, setForm] = useState<MilestoneForm>({
    projectId: milestone.projectId,
    title: milestone.title,
    description: milestone.description,
    status: milestone.status,
    progress: milestone.progress,
    startDate: toDateInput(milestone.startDate),
    dueDate: toDateInput(milestone.dueDate),
    phase: milestone.phase,
  })

  function update<K extends keyof MilestoneForm>(key: K, value: MilestoneForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }))
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(event) => event.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>
              {isCreating ? "เพิ่ม Milestone ใหม่" : "แก้ไข Milestone"}
            </div>
            {!isCreating && <div style={S.modalSub}>{milestone.title}</div>}
          </div>
          <button type="button" onClick={onClose} disabled={saving} style={S.closeBtn}>
            ✕
          </button>
        </div>

        <div style={S.modalBody}>
          <SectionLabel label="ข้อมูลหลัก" />

          <Field label="ชื่อ">
            <Input
              value={form.title}
              onChange={(value) => update("title", value)}
              placeholder="ชื่อ Milestone"
            />
          </Field>

          <Field label="โปรเจค">
            <select
              value={form.projectId}
              onChange={(event) => update("projectId", Number(event.target.value))}
              style={S.input}
              disabled={!isCreating || saving}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Phase">
            <Input
              value={form.phase}
              onChange={(value) => update("phase", value)}
              placeholder="เช่น Design, Development, Testing"
            />
          </Field>

          <Field label="คำอธิบาย">
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              rows={3}
              style={{ ...S.input, resize: "vertical" }}
            />
          </Field>

          <SectionLabel label="สถานะและเวลา" />

          <Field label="สถานะ">
            <select
              value={form.status}
              onChange={(event) =>
                update("status", event.target.value as MilestoneStatus)
              }
              style={S.input}
              disabled={saving}
            >
              <option value="upcoming">กำลังจะมาถึง</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จแล้ว</option>
              <option value="overdue">เลยกำหนด</option>
            </select>
          </Field>

          <div style={S.twoColumns}>
            <Field label="วันที่เริ่ม">
              <Input
                type="date"
                value={form.startDate}
                onChange={(value) => update("startDate", value)}
              />
            </Field>

            <Field label="วันกำหนดส่ง">
              <Input
                type="date"
                value={form.dueDate}
                onChange={(value) => update("dueDate", value)}
              />
            </Field>
          </div>

          <Field label={`ความคืบหน้า (${form.progress}%)`}>
            <input
              type="range"
              min={0}
              max={100}
              value={form.progress}
              onChange={(event) => update("progress", Number(event.target.value))}
              style={{ width: "100%", accentColor: "#4f8ef7" }}
              disabled={saving}
            />
          </Field>
        </div>

        <div
          style={{
            ...S.modalFooter,
            justifyContent: isCreating ? "flex-end" : "space-between",
          }}
        >
          {!isCreating && (
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (window.confirm("ลบ Milestone นี้หรือไม่?")) {
                  void onDelete(milestone.id)
                }
              }}
              style={S.deleteBtn}
            >
              ลบ
            </button>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" onClick={onClose} disabled={saving} style={S.cancelBtn}>
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={saving || !form.title.trim()}
              onClick={() => void onSave(form)}
              style={{
                ...S.saveBtn,
                opacity: saving || !form.title.trim() ? 0.6 : 1,
                cursor: saving || !form.title.trim() ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function clampProgress(value: unknown): number {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

function toDateInput(value: string): string {
  if (!value) return ""
  return value.slice(0, 10)
}

function formatDate(value: string): string {
  if (!value) return "ยังไม่กำหนด"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "ยังไม่กำหนด"

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDateRange(startDate: string, dueDate: string): string {
  if (!startDate && !dueDate) return "ยังไม่ได้กำหนดช่วงเวลา"
  if (!startDate) return `กำหนดส่ง: ${formatDate(dueDate)}`
  if (!dueDate) return `เริ่ม: ${formatDate(startDate)}`
  return `${formatDate(startDate)} – ${formatDate(dueDate)}`
}

function SectionLabel({ label }: { label: string }) {
  return <div style={S.sectionLabel}>{label}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={S.input}
    />
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    background: "#0d1117",
    minHeight: "100vh",
    padding: "28px 32px",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    color: "#e5e7eb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#f9fafb",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#4f8ef7",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 18px",
    cursor: "pointer",
  },
  secondaryBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 14px",
    cursor: "pointer",
  },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  errorBox: {
    background: "#2a1115",
    border: "1px solid #7f1d1d",
    color: "#fca5a5",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 18,
  },
  statsRow: { display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" },
  statCard: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderTop: "3px solid",
    borderRadius: 12,
    padding: "16px 20px",
    flex: "1 1 120px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" },
  statLabel: { fontSize: 12, color: "#6b7280" },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  projectSelect: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 8,
    color: "#d1d5db",
    fontSize: 12,
    padding: "9px 12px",
    outline: "none",
  },
  tabGroup: {
    display: "flex",
    gap: 4,
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 8,
    padding: 4,
    flexWrap: "wrap",
  },
  tabBtn: {
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: "20px 22px",
    display: "flex",
    gap: 16,
  },
  cardAccent: { width: 3, borderRadius: 999, flexShrink: 0 },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardTitleRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 3 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#f9fafb" },
  projectName: { fontSize: 12, color: "#6b7280" },
  cardActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 },
  badge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
  },
  editBtn: {
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 7,
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 12px",
    cursor: "pointer",
  },
  metaRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontSize: 12,
    color: "#6b7280",
  },
  progressTrack: { background: "#1f2937", borderRadius: 999, height: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
  dateRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12 },
  empty: {
    color: "#4b5563",
    fontSize: 14,
    textAlign: "center",
    padding: "60px 0",
    fontStyle: "italic",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 24,
  },
  modal: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 16,
    width: "100%",
    maxWidth: 540,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid #1f2937",
  },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f9fafb" },
  modalSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  closeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer" },
  modalBody: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  modalFooter: {
    display: "flex",
    alignItems: "center",
    padding: "16px 24px",
    borderTop: "1px solid #1f2937",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#4f8ef7",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    marginTop: 4,
  },
  fieldLabel: { fontSize: 12, color: "#9ca3af", fontWeight: 600 },
  input: {
    background: "#0d1117",
    border: "1px solid #1f2937",
    borderRadius: 8,
    padding: "9px 12px",
    color: "#f9fafb",
    fontSize: 13,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  twoColumns: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  saveBtn: {
    background: "#4f8ef7",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 24px",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid #374151",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 20px",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "#1f1215",
    border: "1px solid #450a0a",
    borderRadius: 8,
    color: "#f87171",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 16px",
    cursor: "pointer",
  },
}