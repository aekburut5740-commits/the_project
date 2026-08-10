"use client"

import Link from "next/link"
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
import { useTheme } from "@/lib/themeContext"

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

import { Suspense } from "react"

function MilestonesContent() {
  const { theme } = useTheme()
  const isLight = theme === "light"
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const S = useMemo(() => getStyles(isLight, isMobile, isTablet), [isLight, isMobile, isTablet])
  const searchParams = useSearchParams()
  const requestedProjectId = Number(searchParams.get("project"))
  const [isAdmin, setIsAdmin] = useState(false)
  const [mounted, setMounted] = useState(false)

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
    setMounted(true)
    const currentUser = getUser()
    const adminRole = currentUser?.role === "admin"
    setIsAdmin(adminRole)
    void loadPage(adminRole)
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

  async function loadPage(adminRole = isAdmin) {
    setLoading(true)
    setError("")

    try {
      const projectRows = await backend.projects(adminRole)
      const nextProjects = projectRows.map((row: any) => normalizeProject(row) as Project)
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
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Milestone ได้")
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
          <div key={item.label} style={statCardStyle(item.color, isLight)}>
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
              isLight={isLight}
              isMobile={isMobile}
              isTablet={isTablet}
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
          isLight={isLight}
          isMobile={isMobile}
          isTablet={isTablet}
        />
      )}
    </div>
  )
}

export default function MilestonesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#94a3b8" }}>กำลังโหลด...</div>}>
      <MilestonesContent />
    </Suspense>
  )
}

function MilestoneCard({
  milestone,
  projectName,
  isAdmin,
  onEdit,
  isLight = false,
  isMobile = false,
  isTablet = false,
}: {
  milestone: Milestone
  projectName: string
  isAdmin: boolean
  onEdit: () => void
  isLight?: boolean
  isMobile?: boolean
  isTablet?: boolean
}) {
  const S = getStyles(isLight, isMobile, isTablet)
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

            <Link
              href={`/dashboard/milestones/${milestone.id}`}
              style={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 7, color: "#9ca3af", fontSize: 12, fontWeight: 600, padding: "5px 12px", textDecoration: "none" }}
            >
              ดูรายละเอียด
            </Link>

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
  isLight = false,
  isMobile = false,
  isTablet = false,
}: {
  milestone: Milestone
  projects: Project[]
  isCreating: boolean
  saving: boolean
  onClose: () => void
  onSave: (form: MilestoneForm) => Promise<void>
  onDelete: (id: number) => Promise<void>
  isLight?: boolean
  isMobile?: boolean
  isTablet?: boolean
}) {
  const S = getStyles(isLight, isMobile, isTablet)
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
          <SectionLabel label="ข้อมูลหลัก" isLight={isLight} />

          <Field label="ชื่อ" isLight={isLight}>
            <Input
              value={form.title}
              onChange={(value) => update("title", value)}
              placeholder="ชื่อ Milestone"
              isLight={isLight}
            />
          </Field>

          <Field label="โปรเจค" isLight={isLight}>
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

          <Field label="Phase" isLight={isLight}>
            <Input
              value={form.phase}
              onChange={(value) => update("phase", value)}
              placeholder="เช่น Design, Development, Testing"
              isLight={isLight}
            />
          </Field>

          <Field label="คำอธิบาย" isLight={isLight}>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              rows={3}
              style={{ ...S.input, resize: "vertical" }}
            />
          </Field>

          <SectionLabel label="สถานะและเวลา" isLight={isLight} />

          <Field label="สถานะ" isLight={isLight}>
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
            <Field label="วันที่เริ่ม" isLight={isLight}>
              <Input
                type="date"
                value={form.startDate}
                onChange={(value) => update("startDate", value)}
                isLight={isLight}
              />
            </Field>

            <Field label="วันกำหนดส่ง" isLight={isLight}>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(value) => update("dueDate", value)}
                isLight={isLight}
              />
            </Field>
          </div>

          <Field label={`ความคืบหน้า (${form.progress}%)`} isLight={isLight}>
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

// Helper: builds full statCard style with borderTopColor included as individual property
// Avoids React's "mixing shorthand and non-shorthand" warning
function statCardStyle(color: string, isLight: boolean): React.CSSProperties {
  const sideBorderColor = isLight ? "#e2e8f0" : "#1f2937"
  return {
    background: isLight ? "#ffffff" : "#111827",
    borderTopWidth: 3,
    borderTopStyle: "solid",
    borderTopColor: color,
    borderRightWidth: 1,
    borderRightStyle: "solid",
    borderRightColor: sideBorderColor,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: sideBorderColor,
    borderLeftWidth: 1,
    borderLeftStyle: "solid",
    borderLeftColor: sideBorderColor,
    borderRadius: 12,
    padding: "16px 20px",
    flex: "1 1 120px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
  }
}

function SectionLabel({ label, isLight = false }: { label: string; isLight?: boolean }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
}

function Field({ label, children, isLight = false }: { label: string; children: React.ReactNode; isLight?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: isLight ? "#475569" : "#9ca3af", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  isLight = false,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  isLight?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        background: isLight ? "#f8fafc" : "#0d1117",
        border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
        borderRadius: 8,
        padding: "9px 12px",
        color: isLight ? "#0f172a" : "#f9fafb",
        fontSize: 13,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
      }}
    />
  )
}

function getStyles(isLight: boolean, isMobile = false, isTablet = false): Record<string, React.CSSProperties> {
  return {
    page: {
      background: isLight ? "#f8fafc" : "#0d1117",
      minHeight: "100vh",
      padding: isMobile ? "14px 12px" : "28px 32px",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      color: isLight ? "#0f172a" : "#e5e7eb",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
      flexWrap: "wrap",
    },
    title: { fontSize: 24, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
    subtitle: { fontSize: 13, color: isLight ? "#64748b" : "#6b7280", margin: "4px 0 0" },
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
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      borderRadius: 8,
      color: isLight ? "#334155" : "#9ca3af",
      fontSize: 13,
      fontWeight: 600,
      padding: "9px 14px",
      cursor: "pointer",
    },
    roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
    errorBox: {
      background: isLight ? "#fef2f2" : "#2a1115",
      border: isLight ? "1px solid #fca5a5" : "1px solid #7f1d1d",
      color: isLight ? "#991b1b" : "#fca5a5",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 13,
      marginBottom: 18,
    },
    statsRow: { display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" },
    statCard: {
      background: isLight ? "#ffffff" : "#111827",
      borderTopWidth: 3,
      borderTopStyle: "solid" as const,
      // borderTopColor is injected per-card via statCardStyle() helper below
      borderRightWidth: 1,
      borderRightStyle: "solid" as const,
      borderRightColor: isLight ? "#e2e8f0" : "#1f2937",
      borderBottomWidth: 1,
      borderBottomStyle: "solid" as const,
      borderBottomColor: isLight ? "#e2e8f0" : "#1f2937",
      borderLeftWidth: 1,
      borderLeftStyle: "solid" as const,
      borderLeftColor: isLight ? "#e2e8f0" : "#1f2937",
      borderRadius: 12,
      padding: "16px 20px",
      flex: "1 1 120px",
      display: "flex",
      flexDirection: "column" as const,
      gap: 4,
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    },
    statValue: { fontSize: 26, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", fontFamily: "monospace" },
    statLabel: { fontSize: 12, color: isLight ? "#64748b" : "#6b7280" },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 20,
      flexWrap: "wrap",
      justifyContent: isMobile ? "stretch" : "flex-start",
    },
    projectSelect: {
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
      borderRadius: 8,
      color: isLight ? "#0f172a" : "#d1d5db",
      fontSize: 12,
      padding: "9px 12px",
      outline: "none",
      minWidth: isMobile ? "100%" : undefined,
    },
    tabGroup: {
      display: "flex",
      gap: 4,
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
      borderRadius: 8,
      padding: 4,
      flexWrap: "wrap",
      width: isMobile ? "100%" : undefined,
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
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      borderRadius: 14,
      padding: isMobile ? "16px" : "20px 22px",
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      gap: 16,
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    },
    cardAccent: { width: 3, borderRadius: 999, flexShrink: 0 },
    cardHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    cardTitleRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 3 },
    cardTitle: { fontSize: 15, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" },
    projectName: { fontSize: 12, color: isLight ? "#64748b" : "#6b7280" },
    cardActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
    cardDesc: { fontSize: 13, color: isLight ? "#64748b" : "#6b7280", lineHeight: 1.6, margin: 0 },
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
      background: isLight ? "#f1f5f9" : "#1f2937",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      borderRadius: 7,
      color: isLight ? "#334155" : "#9ca3af",
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
      color: isLight ? "#64748b" : "#6b7280",
    },
    progressTrack: { background: isLight ? "#e2e8f0" : "#1f2937", borderRadius: 999, height: 5, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
    dateRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isLight ? "#64748b" : "#9ca3af" },
    empty: {
      color: isLight ? "#94a3b8" : "#4b5563",
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
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
      borderRadius: 16,
      width: "100%",
      maxWidth: isMobile ? "100%" : 540,
      maxHeight: "85vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      margin: isMobile ? "0" : undefined,
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: isMobile ? "16px 18px" : "20px 24px",
      borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
    },
    modalTitle: { fontSize: 17, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" },
    modalSub: { fontSize: 12, color: isLight ? "#64748b" : "#6b7280", marginTop: 2 },
    closeBtn: { background: "transparent", border: "none", color: isLight ? "#64748b" : "#6b7280", fontSize: 16, cursor: "pointer" },
    modalBody: {
      padding: isMobile ? "16px 18px" : "20px 24px",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 12,
    },
    modalFooter: {
      display: "flex",
      alignItems: "center",
      justifyContent: isMobile ? "center" : "space-between",
      flexDirection: isMobile ? "column" : "row",
      gap: isMobile ? 10 : 0,
      padding: isMobile ? "14px 18px" : "16px 24px",
      borderTop: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: 700,
      color: "#4f8ef7",
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      marginTop: 4,
    },
    fieldLabel: { fontSize: 12, color: isLight ? "#475569" : "#9ca3af", fontWeight: 600 },
    input: {
      background: isLight ? "#f8fafc" : "#0d1117",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
      borderRadius: 8,
      padding: "9px 12px",
      color: isLight ? "#0f172a" : "#f9fafb",
      fontSize: 13,
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    twoColumns: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 },
    saveBtn: {
      background: "#4f8ef7",
      border: "none",
      borderRadius: 8,
      color: "#fff",
      fontSize: 13,
      fontWeight: 600,
      padding: "9px 24px",
      width: isMobile ? "100%" : undefined,
    },
    cancelBtn: {
      background: "transparent",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      borderRadius: 8,
      color: isLight ? "#64748b" : "#9ca3af",
      fontSize: 13,
      fontWeight: 600,
      padding: "9px 20px",
      cursor: "pointer",
    },
    deleteBtn: {
      background: isLight ? "#fef2f2" : "#1f1215",
      border: "1px solid #ef444444",
      borderRadius: 8,
      color: "#f87171",
      fontSize: 13,
      fontWeight: 600,
      padding: "9px 16px",
      cursor: "pointer",
    },
  }
}