"use client"

import { useState } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Status = "pending" | "in_progress" | "completed"

interface Manager {
  id: number
  name: string
  avatar: string // initials
  color: string
}

interface Project {
  id: number
  name: string
  website: string
  description: string
  status: Status
  progress: number
  startDate: string
  package: string
  domain: string
  token: string
  managers: Manager[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_PROJECTS: Project[] = [
  {
    id: 1,
    name: "BrandCo Redesign",
    website: "brandco.com",
    description: "รีดีไซน์เว็บไซต์หลักและระบบ CMS ใหม่ทั้งหมด",
    status: "in_progress",
    progress: 65,
    startDate: "2025-03-01",
    package: "Professional",
    domain: "brandco.com",
    token: "tok_bc_xK9m2Lp4Qr",
    managers: [
      { id: 1, name: "Aek Burin", avatar: "AB", color: "#4f8ef7" },
      { id: 2, name: "Nisa Wong", avatar: "NW", color: "#a78bfa" },
    ],
  },
  {
    id: 2,
    name: "ShopNow E-Commerce",
    website: "shopnow.co.th",
    description: "พัฒนาระบบร้านค้าออนไลน์พร้อม payment gateway",
    status: "pending",
    progress: 10,
    startDate: "2025-05-15",
    package: "Enterprise",
    domain: "shopnow.co.th",
    token: "tok_sn_mP3nZq7Yw",
    managers: [
      { id: 1, name: "Aek Burin", avatar: "AB", color: "#4f8ef7" },
    ],
  },
  {
    id: 3,
    name: "MediCare Portal",
    website: "medicare-portal.com",
    description: "ระบบนัดหมายและจัดการข้อมูลผู้ป่วยออนไลน์",
    status: "completed",
    progress: 100,
    startDate: "2024-11-01",
    package: "Starter",
    domain: "medicare-portal.com",
    token: "tok_mc_rT8vXj2Hn",
    managers: [
      { id: 2, name: "Nisa Wong", avatar: "NW", color: "#a78bfa" },
      { id: 3, name: "Tong Dev", avatar: "TD", color: "#34d399" },
    ],
  },
]

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "#fbbf24" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed: { label: "เสร็จแล้ว", color: "#34d399" },
}

const PACKAGES = ["Starter", "Professional", "Enterprise"]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  // TODO: เปลี่ยนเป็นดึงจาก useRole() เมื่อ connect API แล้ว
  const role: "admin" | "customer" = "admin"

  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all")

  const filtered = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.website.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    return matchSearch && matchStatus
  })

  function handleSave(updated: Project) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditingProject(null)
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Projects</h1>
          <p style={S.subtitle}>{projects.length} โปรเจคทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <div style={S.filterRow}>
        <input
          placeholder="ค้นหาโปรเจค..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={S.searchInput}
        />
        <div style={S.tabGroup}>
          {(["all", "pending", "in_progress", "completed"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                ...S.tabBtn,
                background: filterStatus === s ? "#1f2937" : "transparent",
                color: filterStatus === s ? "#f9fafb" : "#6b7280",
              }}
            >
              {s === "all"
                ? "ทั้งหมด"
                : STATUS_CONFIG[s as Status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={S.empty}>ไม่พบโปรเจค</div>
      ) : (
        <div style={S.grid}>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isAdmin={role === "admin"}
              onEdit={() => setEditingProject(project)}
            />
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <EditModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  isAdmin,
  onEdit,
}: {
  project: Project
  isAdmin: boolean
  onEdit: () => void
}) {
  const { color, label } = STATUS_CONFIG[project.status]

  return (
    <div style={S.card}>
      {/* Top */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.cardName}>{project.name}</div>
          <a
            href={`https://${project.website}`}
            target="_blank"
            rel="noreferrer"
            style={S.cardWebsite}
          >
            🌐 {project.website}
          </a>
        </div>
        <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44` }}>
          {label}
        </span>
      </div>

      <p style={S.cardDesc}>{project.description}</p>

      {/* Progress */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: "#6b7280" }}>ความคืบหน้า</span>
          <span style={{ color: "#f9fafb", fontWeight: 700, fontFamily: "monospace" }}>
            {project.progress}%
          </span>
        </div>
        <div style={S.progressTrack}>
          <div
            style={{
              ...S.progressFill,
              width: `${project.progress}%`,
              background: color,
            }}
          />
        </div>
      </div>

      {/* Meta */}
      <div style={S.metaRow}>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>เริ่มต้น</span>
          <span style={S.metaValue}>
            {new Date(project.startDate).toLocaleDateString("th-TH", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </span>
        </div>
        <div style={S.metaItem}>
          <span style={S.metaLabel}>แพ็กเกจ</span>
          <span style={{ ...S.metaValue, color: "#a78bfa" }}>{project.package}</span>
        </div>
      </div>

      {/* Managers */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: -4 }}>
          {project.managers.map((m, i) => (
            <div
              key={m.id}
              title={m.name}
              style={{
                ...S.avatar,
                background: m.color + "33",
                color: m.color,
                border: `2px solid #111827`,
                marginLeft: i > 0 ? -8 : 0,
                zIndex: project.managers.length - i,
              }}
            >
              {m.avatar}
            </div>
          ))}
        </div>
        {isAdmin && (
          <button onClick={onEdit} style={S.editBtn}>
            แก้ไข
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  project,
  onClose,
  onSave,
}: {
  project: Project
  onClose: () => void
  onSave: (p: Project) => void
}) {
  const [form, setForm] = useState<Project>({ ...project })

  function set(key: keyof Project, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={S.modalHeader}>
          <div>
            <div style={S.modalTitle}>แก้ไขโปรเจค</div>
            <div style={S.modalSub}>{project.name}</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>

        <div style={S.modalBody}>
          {/* Section: ข้อมูลหลัก */}
          <Section title="ข้อมูลหลัก">
            <Row label="ชื่อโปรเจค">
              <Input value={form.name} onChange={(v) => set("name", v)} />
            </Row>
            <Row label="เว็บไซต์">
              <Input value={form.website} onChange={(v) => set("website", v)} placeholder="example.com" />
            </Row>
            <Row label="คำอธิบาย">
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                style={{ ...S.input, resize: "vertical" }}
              />
            </Row>
          </Section>

          {/* Section: สถานะและความคืบหน้า */}
          <Section title="สถานะและความคืบหน้า">
            <Row label="สถานะ">
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                style={S.input}
              >
                <option value="pending">รอดำเนินการ</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จแล้ว</option>
              </select>
            </Row>
            <Row label={`ความคืบหน้า (${form.progress}%)`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.progress}
                onChange={(e) => set("progress", Number(e.target.value))}
                style={{ width: "100%", accentColor: "#4f8ef7" }}
              />
            </Row>
            <Row label="วันที่เริ่ม">
              <Input type="date" value={form.startDate} onChange={(v) => set("startDate", v)} />
            </Row>
          </Section>

          {/* Section: ข้อมูลเทคนิค */}
          <Section title="ข้อมูลเทคนิค">
            <Row label="แพ็กเกจ">
              <select
                value={form.package}
                onChange={(e) => set("package", e.target.value)}
                style={S.input}
              >
                {PACKAGES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Row>
            <Row label="Domain">
              <Input value={form.domain} onChange={(v) => set("domain", v)} placeholder="example.com" />
            </Row>
            <Row label="Token">
              <div style={{ position: "relative" }}>
                <Input value={form.token} onChange={(v) => set("token", v)} />
                <span style={S.tokenHint}>🔑</span>
              </div>
            </Row>
          </Section>
        </div>

        {/* Modal Footer */}
        <div style={S.modalFooter}>
          <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
          <button onClick={() => onSave(form)} style={S.saveBtn}>บันทึก</button>
        </div>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={S.sectionLabel}>{title}</div>
      {children}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={S.input}
    />
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    background: "#0d1117",
    minHeight: "100vh",
    padding: "28px 32px",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    color: "#e5e7eb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#f9fafb",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  filterRow: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
    alignItems: "center",
  },
  searchInput: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 8,
    padding: "9px 14px",
    color: "#f9fafb",
    fontSize: 13,
    outline: "none",
    width: 220,
  },
  tabGroup: {
    display: "flex",
    gap: 4,
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 8,
    padding: 4,
  },
  tabBtn: {
    border: "none",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    transition: "border-color 0.2s",
  },
  cardName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#f9fafb",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cardWebsite: {
    fontSize: 12,
    color: "#4f8ef7",
    textDecoration: "none",
    marginTop: 2,
    display: "block",
  },
  cardDesc: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
    margin: 0,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  progressTrack: {
    background: "#1f2937",
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.4s ease",
  },
  metaRow: {
    display: "flex",
    gap: 16,
  },
  metaItem: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  metaLabel: { fontSize: 11, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  metaValue: { fontSize: 13, color: "#d1d5db", fontWeight: 600 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    position: "relative",
  },
  editBtn: {
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 7,
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 14px",
    cursor: "pointer",
  },
  empty: {
    color: "#374151",
    fontSize: 14,
    textAlign: "center",
    padding: "60px 0",
    fontStyle: "italic",
  },
  // Modal
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
    maxWidth: 520,
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
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 16,
    cursor: "pointer",
    padding: 4,
  },
  modalBody: {
    padding: "20px 24px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "16px 24px",
    borderTop: "1px solid #1f2937",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#4f8ef7",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
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
  tokenHint: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: 14,
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
  saveBtn: {
    background: "#4f8ef7",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 24px",
    cursor: "pointer",
  },
}
