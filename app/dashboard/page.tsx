"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { backend, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"
import { STATUS_CONFIG, type Project } from "@/lib/mockData"

type DashboardData = {
  total?: number
  total_projects?: number
  total_users?: number
  summary?: Record<string, number>
  projects?: unknown[]
}

export default function DashboardPage() {
  const user = getUser()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    backend.dashboard(user?.role === "admin")
      .then((result) => setData(result as DashboardData))
      .catch((err) => setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Dashboard ได้"))
      .finally(() => setLoading(false))
  }, [user?.role])

  const projects: Project[] = (data?.projects || []).map(normalizeProject)
  const summary = data?.summary || {}

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>Overview</div>
          <h1 style={S.title}>Dashboard</h1>
          <p style={S.subtitle}>ภาพรวมโปรเจคและความคืบหน้าล่าสุดจากระบบ</p>
        </div>
        <span style={S.roleBadge}>{user?.role === "admin" ? "Admin" : "Customer"}</span>
      </div>

      {error && <div style={S.error}>{error}</div>}

      <div style={S.statsGrid}>
        <StatCard label="โปรเจคทั้งหมด" value={data?.total_projects ?? data?.total ?? projects.length} color="#4f8ef7" loading={loading} />
        <StatCard label="กำลังดำเนินการ" value={(summary.in_progress ?? 0) + (summary.on_track ?? 0)} color="#fbbf24" loading={loading} />
        <StatCard label="เสร็จแล้ว" value={summary.completed ?? 0} color="#34d399" loading={loading} />
        <StatCard label="ล่าช้า" value={summary.delayed ?? 0} color="#f87171" loading={loading} />
      </div>

      <section style={S.panel}>
        <div style={S.panelHeader}>
          <div>
            <h2 style={S.panelTitle}>Projects</h2>
            <p style={S.panelSub}>โปรเจคล่าสุดที่คุณสามารถเข้าถึงได้</p>
          </div>
          <Link href="/dashboard/projects" style={S.viewAll}>ดูทั้งหมด →</Link>
        </div>

        {loading ? <div style={S.empty}>กำลังโหลดข้อมูล...</div> : projects.length === 0 ? <div style={S.empty}>ยังไม่มีโปรเจค</div> : (
          <div style={S.projectList}>
            {projects.slice(0, 6).map((project) => {
              const status = STATUS_CONFIG[project.status] || { label: project.status, color: "#6b7280" }
              return (
                <Link key={project.id} href={`/dashboard/projects/${project.id}`} style={S.projectRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.projectName}>{project.name}</div>
                    <div style={S.projectDesc}>{project.description || "ไม่มีรายละเอียด"}</div>
                  </div>
                  <div style={S.progressArea}>
                    <div style={S.progressText}>{project.progress}%</div>
                    <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${project.progress}%`, background: status.color }} /></div>
                    <div style={{ color: status.color, fontSize: 11 }}>{status.label}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({ label, value, color, loading }: { label: string; value: number; color: string; loading: boolean }) {
  return <div style={{ ...S.statCard, borderTopColor: color }}><div style={S.statValue}>{loading ? "—" : value}</div><div style={S.statLabel}>{label}</div></div>
}

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0d1117", color: "#e5e7eb", padding: "28px 32px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" },
  eyebrow: { color: "#4f8ef7", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.12em" },
  title: { margin: "5px 0 0", fontSize: 30, color: "#f9fafb" },
  subtitle: { color: "#9ca3af", margin: "8px 0 0", fontSize: 14 },
  roleBadge: { background: "#4f8ef722", color: "#4f8ef7", border: "1px solid #4f8ef744", padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
  error: { color: "#f87171", background: "#7f1d1d22", border: "1px solid #f8717144", borderRadius: 10, padding: 12, marginTop: 18 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginTop: 26 },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderTop: "3px solid", borderRadius: 14, padding: 18 },
  statValue: { color: "#f9fafb", fontSize: 28, fontWeight: 800, fontFamily: "monospace" },
  statLabel: { color: "#9ca3af", fontSize: 12, marginTop: 5 },
  panel: { marginTop: 22, background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 22 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 },
  panelTitle: { color: "#f9fafb", fontSize: 17, margin: 0 },
  panelSub: { color: "#6b7280", fontSize: 12, margin: "5px 0 0" },
  viewAll: { color: "#4f8ef7", fontSize: 13, textDecoration: "none", fontWeight: 700 },
  empty: { color: "#6b7280", padding: "36px 0", textAlign: "center" },
  projectList: { display: "flex", flexDirection: "column", gap: 10, marginTop: 18 },
  projectRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "14px 16px", color: "inherit", textDecoration: "none" },
  projectName: { color: "#f9fafb", fontSize: 14, fontWeight: 700 },
  projectDesc: { color: "#6b7280", fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  progressArea: { width: 160, flexShrink: 0 }, progressText: { color: "#f9fafb", fontSize: 12, textAlign: "right", marginBottom: 5 },
  progressTrack: { height: 6, background: "#1f2937", borderRadius: 999, overflow: "hidden", marginBottom: 5 }, progressFill: { height: "100%", borderRadius: 999 },
}
