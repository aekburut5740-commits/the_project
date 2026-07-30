"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { STATUS_CONFIG } from "@/lib/project-config"

import type {
  Project,
  ProjectStatus,
  Manager,
} from "@/types/project"
import {
  backend,
  normalizeManager,
  normalizeProject,
} from "@/lib/backend"
import { getUser } from "@/lib/auth"

const PACKAGES = ["Starter", "Professional", "Enterprise"]

export default function ProjectsPage() {
  const user = getUser() || { id: 0, username: "", role: "customer" as const }
  const isAdmin = user.role === "admin"
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadProjects() {
    setLoading(true)
    setError("")

    try {
      const rows = await backend.projects(isAdmin)

      const nextProjects = await Promise.all(
        rows.map(async (row) => {
          const project = normalizeProject(row)

          try {
            const memberRows =
              await backend.projectMembers(project.id)

            return {
              ...project,
              managers: memberRows.map(normalizeManager),
            }
          } catch {
            return {
              ...project,
              managers: [],
            }
          }
        })
      )

      setProjects(nextProjects)
    } catch (err: unknown) {
      setProjects([])

      setError(
        err instanceof Error
          ? err.message
          : "ไม่สามารถโหลดโปรเจคได้"
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [isAdmin])
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "all">("all")
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.website || p.domain || "").toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    return matchSearch && matchStatus
  })

  async function handleSave(updated: Project) {
    setError("")
    try {
      if (isCreating) {
        const created = normalizeProject(await backend.createProject({
          name: updated.name, description: updated.description,
          domain: updated.domain || updated.website, start_date: updated.startDate,
          package: updated.package, token: updated.token,
        })) as Project
        const managers = isAdmin ? await addNewManagers(created.id, updated.managers) : []
        setProjects((prev) => [...prev, { ...created, managers }])
      } else {
        const old = projects.find((project) => project.id === updated.id)
        if (isAdmin) {
          await backend.updateProject(updated.id, {
            name: updated.name, description: updated.description, status: updated.status,
            domain: updated.domain || updated.website, start_date: updated.startDate,
            package: updated.package, token: updated.token,
          }, true)
          await backend.updateProgress(updated.id, updated.progress)
          await syncManagers(updated.id, old?.managers || [], updated.managers)
        } else {
          await backend.updateProject(updated.id, {
            name: updated.name, description: updated.description,
            domain: updated.domain || updated.website, start_date: updated.startDate,
            package: updated.package, token: updated.token,
          })
        }
        await loadProjects()
      }
      setEditingProject(null)
      setIsCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกโปรเจคไม่สำเร็จ")
    }
  }

  async function handleDelete(id: number) {
    setError("")
    try {
      await backend.deleteProject(id)
      setProjects((prev) => prev.filter((item) => item.id !== id))
      setEditingProject(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ลบโปรเจคไม่สำเร็จ")
    }
  }

  function openCreate() {
    setIsCreating(true)
    setEditingProject({
      id: 0, name: "", website: "", description: "",
      status: "pending", progress: 0, startDate: "",
      package: "Starter", domain: "", token: "",
      ownerId: user.id, managers: [],
    })
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Projects</h1>
          <p style={S.subtitle}>
            {isAdmin ? `${projects.length} โปรเจคทั้งหมด` : `${projects.length} โปรเจคของคุณ`}
          </p>
        </div>
        {isAdmin && <button onClick={openCreate} style={S.addBtn}>+ เพิ่มโปรเจค</button>}
      </div>

      <div style={{ marginBottom: 20 }}>
        <span style={{ ...S.roleBadge, background: isAdmin ? "#4f8ef722" : "#34d39922", color: isAdmin ? "#4f8ef7" : "#34d399", border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}` }}>
          {isAdmin ? "👑 Admin — เห็นและแก้ไขได้ทุกโปรเจค" : "👤 Customer — เห็นเฉพาะโปรเจคของคุณ"}
        </span>
      </div>

      {error && <div style={{ color: "#f87171", marginBottom: 14 }}>{error}</div>}
      {loading && <div style={{ color: "#6b7280", marginBottom: 14 }}>กำลังโหลดโปรเจค...</div>}

      <div style={S.filterRow}>
        <input placeholder="ค้นหาโปรเจค..." value={search} onChange={(e) => setSearch(e.target.value)} style={S.searchInput} />
        <div style={S.tabGroup}>
          {(["all", "pending", "in_progress", "completed"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ ...S.tabBtn, background: filterStatus === s ? "#1f2937" : "transparent", color: filterStatus === s ? "#f9fafb" : "#6b7280" }}>
              {s === "all" ? "ทั้งหมด" : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={S.empty}>
          กำลังโหลดโปรเจค...
        </div>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          {search || filterStatus !== "all"
            ? "ไม่พบโปรเจคที่ตรงกับการค้นหา"
            : "ยังไม่มีโปรเจค"}
        </div>
      ) : (
        <div style={S.grid}>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={isAdmin}
              onEdit={() => {
                setIsCreating(false)
                setEditingProject(project)
              }}
            />
          ))}
        </div>
      )}

      {editingProject && isAdmin && (
        <EditModal project={editingProject} isCreating={isCreating}
          onClose={() => { setEditingProject(null); setIsCreating(false) }}
          onSave={handleSave} onDelete={handleDelete} />
      )}
    </div>
  )
}

function ProjectCard({ project: p, isAdmin, onEdit }: { project: Project; isAdmin: boolean; onEdit: () => void }) {
  const statusConfig = STATUS_CONFIG[p.status] || {
    label: p.status || "ไม่ระบุสถานะ",
    color: "#6b7280",
  }

  const { color, label } = statusConfig
  const detailHref = `/dashboard/projects/${p.id}`

  return (
    <div style={{ ...S.card, padding: "15px 15px 5px 15px", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.cardName}>{p.name}</div>
          {p.website ? (
            <a
              href={normalizeWebsiteUrl(p.website)}
              target="_blank"
              rel="noreferrer"
              style={S.cardWebsite}
              onClick={(event) => event.stopPropagation()}
            >
              🌐 {p.website}
            </a>
          ) : (
            <span style={S.cardWebsite}>
              🌐 ยังไม่ได้ระบุเว็บไซต์
            </span>
          )}
        </div>
        <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44` }}>{label}</span>
      </div>
      <p style={S.cardDesc}>{p.description}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#6b7280" }}>ความคืบหน้า</span>
          <span style={{ color: "#f9fafb", fontWeight: 700, fontFamily: "monospace" }}>{p.progress}%</span>
        </div>
        <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${Math.min(100, Math.max(0, p.progress))}%`, background: color }} /></div>
      </div>
      <div style={S.metaRow}>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>เริ่มต้น</span>
          <span style={S.metaValue}>
            {formatProjectDate(p.startDate)}
          </span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>แพ็กเกจ</span>
          <span style={{ ...S.metaValue, color: "#a78bfa" }}>{p.package}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex" }}>
          {p.managers.map((m, i) => (
            <div key={m.id} title={m.name} style={{ width: 28, height: 28, borderRadius: "50%", background: m.color + "33", color: m.color, border: "2px solid #111827", marginLeft: i > 0 ? -8 : 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, position: "relative", zIndex: p.managers.length - i }}>
              {m.avatar}
            </div>
          ))}
        </div>
      </div>
      <Link
        href={detailHref}
        style={{ padding: "3px", margin: "0px 0px 10px 0px", textAlign: "center", fontSize: 16, fontWeight: 200, background: color + "22", color, border: "1px solid gray", borderRadius: "14px 14px 14px 14px" }}
      >detail</Link>
      {isAdmin && (
        <div style={{ borderTop: "1px solid #1f2937", padding: "12px 22px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            style={S.editBtn}
          >
            แก้ไข
          </button>
        </div>
      )}
    </div>
  )
}

function EditModal({ project, isCreating, onClose, onSave, onDelete }: {
  project: Project; isCreating: boolean
  onClose: () => void; onSave: (p: Project) => void; onDelete: (id: number) => void
}) {
  const [form, setForm] = useState<Project>({ ...project, managers: project.managers.map((manager) => ({ ...manager })) })

  function set(key: keyof Project, value: any) { setForm((prev) => ({ ...prev, [key]: value })) }

  function updateManager(index: number, name: string) {
    setForm((prev) => ({
      ...prev,
      managers: prev.managers.map((manager, managerIndex) =>
        managerIndex === index
          ? { ...manager, name, avatar: getInitials(name) || manager.avatar }
          : manager
      ),
    }))
  }

  function addManager() {
    setForm((prev) => ({
      ...prev,
      managers: [
        ...prev.managers,
        {
          id: Date.now(),
          name: "",
          avatar: "",
          color: "#4f8ef7",
        },
      ],
    }))
  }

  function removeManager(index: number) {
    setForm((prev) => ({
      ...prev,
      managers: prev.managers.filter((_, managerIndex) => managerIndex !== index),
    }))
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>{isCreating ? "เพิ่มโปรเจคใหม่" : "แก้ไขโปรเจค"}</div>
            {!isCreating && <div style={S.modalSub}>{project.name}</div>}
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.modalBody}>
          <SLabel label="ข้อมูลหลัก" />
          <Field label="ชื่อโปรเจค"><Input value={form.name} onChange={(v) => set("name", v)} /></Field>
          <Field label="เว็บไซต์"><Input value={form.website} onChange={(v) => set("website", v)} placeholder="example.com" /></Field>
          <Field label="คำอธิบาย"><textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} style={{ ...S.input, resize: "vertical" }} /></Field>
          <SLabel label="สถานะและความคืบหน้า" />
          <Field label="สถานะ">
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={S.input}>
              <option value="pending">รอดำเนินการ</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จแล้ว</option>
            </select>
          </Field>
          <Field label={`ความคืบหน้า (${form.progress}%)`}>
            <input type="range" min={0} max={100} value={form.progress} onChange={(e) => set("progress", Number(e.target.value))} style={{ width: "100%", accentColor: "#4f8ef7" }} />
          </Field>
          <Field label="วันที่เริ่ม"><Input type="date" value={form.startDate} onChange={(v) => set("startDate", v)} /></Field>
          <SLabel label="ผู้ดูแลโปรเจค" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {form.managers.map((manager, index) => (
              <div key={`${manager.id}-${index}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={manager.name}
                  onChange={(e) => updateManager(index, e.target.value)}
                  placeholder="ชื่อผู้ดูแล"
                  style={S.input}
                />
                <button onClick={() => removeManager(index)} style={S.removeBtn}>ลบ</button>
              </div>
            ))}
            <button onClick={addManager} style={S.addManagerBtn}>+ เพิ่มผู้ดูแล</button>
          </div>
          <SLabel label="ข้อมูลเทคนิค" />
          <Field label="แพ็กเกจ">
            <select value={form.package} onChange={(e) => set("package", e.target.value)} style={S.input}>
              {PACKAGES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Domain"><Input value={form.domain} onChange={(v) => set("domain", v)} /></Field>
          <Field label="Token"><Input value={form.token} onChange={(v) => set("token", v)} /></Field>
        </div>
        <div style={{ ...S.modalFooter, justifyContent: isCreating ? "flex-end" : "space-between" }}>
          {!isCreating && <button onClick={() => { if (confirm("ลบโปรเจคนี้?")) onDelete(form.id) }} style={S.deleteBtn}>ลบโปรเจค</button>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
            <button onClick={() => onSave(form)} style={S.saveBtn}>บันทึก</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SLabel({ label }: { label: string }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: 4 }}>{label}</div>
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>{children}</div>
}
function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={S.input} />
}

async function addNewManagers(projectId: number, managers: Manager[]) {
  const created = await Promise.all(managers.filter((manager) => manager.name.trim()).map((manager) => backend.addProjectMember(projectId, manager.name)))
  return created.map(normalizeManager)
}

async function syncManagers(projectId: number, previous: Manager[], next: Manager[]) {
  const removed = previous.filter((manager) => !next.some((item) => item.id === manager.id))
  const added = next.filter((manager) => !previous.some((item) => item.id === manager.id) && manager.name.trim())
  await Promise.all(removed.map((manager) => backend.removeProjectMember(manager.id)))
  await Promise.all(added.map((manager) => backend.addProjectMember(projectId, manager.name)))
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
}

function formatProjectDate(value: string): string {
  if (!value) {
    return "ยังไม่กำหนด"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "ยังไม่กำหนด"
  }

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function normalizeWebsiteUrl(value: string): string {
  const website = value.trim()

  if (!website) {
    return ""
  }

  if (
    website.startsWith("http://") ||
    website.startsWith("https://")
  ) {
    return website
  }

  return `https://${website}`
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  filterRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" },
  searchInput: { background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 14px", color: "#f9fafb", fontSize: 13, outline: "none", width: 220 },
  tabGroup: { display: "flex", gap: 4, background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: 4 },
  tabBtn: { border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
  card: { background: "#111827", border: "1px solid #8b8b8b", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 },
  cardName: { fontSize: 16, fontWeight: 700, color: "#f9fafb", whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" },
  cardWebsite: { fontSize: 12, color: "#4f8ef7", textDecoration: "none", marginTop: 2, display: "block" },
  cardDesc: { fontSize: 13, color: "#6b7280", lineHeight: 1.6, margin: 0 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" as const, flexShrink: 0 },
  progressTrack: { background: "#1f2937", borderRadius: 999, height: 6, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, transition: "width 0.4s ease" },
  metaRow: { display: "flex", gap: 16 },
  metaItem: { display: "flex", flexDirection: "column", gap: 2 },
  metaLabel: { fontSize: 11, color: "#4b5563", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  metaValue: { fontSize: 13, color: "#d1d5db", fontWeight: 600 },
  editBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 7, color: "#9ca3af", fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer" },
  addManagerBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#4f8ef7", fontSize: 12, fontWeight: 600, padding: "8px 12px", cursor: "pointer", alignSelf: "flex-start" },
  removeBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#f87171", fontSize: 12, fontWeight: 600, padding: "8px 10px", cursor: "pointer" },
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
  saveBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", cursor: "pointer" },
  cancelBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer" },
  deleteBtn: { background: "#1f1215", border: "1px solid #450a0a", borderRadius: 8, color: "#f87171", fontSize: 13, fontWeight: 600, padding: "9px 16px", cursor: "pointer" },
}
