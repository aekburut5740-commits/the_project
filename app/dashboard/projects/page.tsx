"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { backend, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"
import { STATUS_CONFIG, type Project, type ProjectStatus } from "@/lib/mockData"

export default function ProjectsPage() {
  const user = getUser()
  const [projects, setProjects] = useState<Project[]>([])
  const [filter, setFilter] = useState<ProjectStatus | "all">("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    backend.projects(user?.role === "admin")
      .then((rows) => setProjects(rows.map(normalizeProject)))
      .catch((err) => setError(err instanceof Error ? err.message : "ไม่สามารถโหลดโปรเจคได้"))
      .finally(() => setLoading(false))
  }, [user?.role])

  const filtered = useMemo(() => filter === "all" ? projects : projects.filter((project) => project.status === filter), [filter, projects])

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div><h1 style={S.title}>Projects</h1><p style={S.subtitle}>รายการโปรเจคทั้งหมดที่บัญชีของคุณสามารถเข้าถึงได้</p></div>
        <div style={S.totalBadge}>{projects.length} โปรเจค</div>
      </div>

      <div style={S.filters}>
        {(["all", "pending", "in_progress", "completed"] as const).map((status) => (
          <button key={status} onClick={() => setFilter(status)} style={{ ...S.filterButton, background: filter === status ? "#1f2937" : "transparent", color: filter === status ? "#f9fafb" : "#6b7280" }}>
            {status === "all" ? "ทั้งหมด" : STATUS_CONFIG[status].label}
          </button>
        ))}
      </div>

      {error && <div style={S.error}>{error}</div>}
      {loading ? <div style={S.empty}>กำลังโหลดโปรเจค...</div> : filtered.length === 0 ? <div style={S.empty}>ไม่พบโปรเจค</div> : (
        <div style={S.grid}>
          {filtered.map((project) => {
            const status = STATUS_CONFIG[project.status] || { label: project.status, color: "#6b7280" }
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`} style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.projectName}>{project.name}</div>
                  <span style={{ ...S.statusBadge, color: status.color, background: `${status.color}22`, borderColor: `${status.color}44` }}>{status.label}</span>
                </div>
                <p style={S.description}>{project.description || "ไม่มีรายละเอียด"}</p>
                <div style={S.metaGrid}>
                  <Meta label="Domain" value={project.domain || project.website || "—"} />
                  <Meta label="Package" value={project.package || "—"} />
                </div>
                <div style={S.progressHeader}><span>ความคืบหน้า</span><strong>{project.progress}%</strong></div>
                <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${project.progress}%`, background: status.color }} /></div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) { return <div><div style={S.metaLabel}>{label}</div><div style={S.metaValue}>{value}</div></div> }
const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0d1117", color: "#e5e7eb", padding: "28px 32px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }, title: { margin: 0, color: "#f9fafb", fontSize: 28 }, subtitle: { color: "#9ca3af", fontSize: 14, margin: "7px 0 0" },
  totalBadge: { color: "#4f8ef7", background: "#4f8ef722", border: "1px solid #4f8ef744", borderRadius: 999, padding: "7px 12px", fontSize: 12, fontWeight: 700 },
  filters: { display: "flex", gap: 5, marginTop: 24, paddingBottom: 14, borderBottom: "1px solid #1f2937", flexWrap: "wrap" }, filterButton: { border: 0, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" },
  error: { color: "#f87171", marginTop: 18 }, empty: { color: "#6b7280", textAlign: "center", padding: 50 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 22 },
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 20, color: "inherit", textDecoration: "none" }, cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, projectName: { color: "#f9fafb", fontSize: 16, fontWeight: 700 }, statusBadge: { border: "1px solid", borderRadius: 999, padding: "5px 8px", fontSize: 10, fontWeight: 700, flexShrink: 0 },
  description: { color: "#9ca3af", fontSize: 13, lineHeight: 1.6, minHeight: 42 }, metaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#0d1117", borderRadius: 10, padding: 12, marginTop: 16 }, metaLabel: { color: "#4b5563", fontSize: 10, textTransform: "uppercase" }, metaValue: { color: "#d1d5db", fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" },
  progressHeader: { display: "flex", justifyContent: "space-between", color: "#6b7280", fontSize: 11, marginTop: 16 }, progressTrack: { height: 7, background: "#1f2937", borderRadius: 999, overflow: "hidden", marginTop: 7 }, progressFill: { height: "100%", borderRadius: 999 },
}
