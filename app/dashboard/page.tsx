"use client"

import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts"
import {
  STATUS_CONFIG, MILESTONE_STATUS_CONFIG,
  type Project, type Milestone,
} from "@/lib/mockData"
import { backend, normalizeMilestone, normalizeProject } from "@/lib/backend"
import { getUser, type JwtUser } from "@/lib/auth"

const PROGRESS_OVER_TIME = [
  { week: "W1", progress: 0 },
  { week: "W2", progress: 15 },
  { week: "W3", progress: 28 },
  { week: "W4", progress: 45 },
  { week: "W5", progress: 58 },
  { week: "W6", progress: 65 },
]

const GIT_PULSE = [
  { day: "จ", commits: 4 },
  { day: "อ", commits: 7 },
  { day: "พ", commits: 2 },
  { day: "พฤ", commits: 9 },
  { day: "ศ", commits: 5 },
  { day: "ส", commits: 1 },
  { day: "อา", commits: 0 },
]

export default function DashboardPage() {
  const [user, setUser] = useState<JwtUser | null>(null)
  const isAdmin = user?.role === "admin"
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const currentUser = getUser()
    setUser(currentUser)

    const load = async () => {
      try {
        const projectRows = await backend.projects(currentUser?.role === "admin")
        const nextProjects = projectRows.map((row) => normalizeProject(row) as Project)
        setProjects(nextProjects)
        const milestoneRows = await Promise.all(nextProjects.map((project) => backend.milestones(project.id)))
        setMilestones(milestoneRows.flat().map((row) => normalizeMilestone(row) as Milestone))
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Dashboard ได้")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalProjects = projects.length
  const completedProjects = projects.filter((p) => p.status === "completed").length
  const inProgressProjects = projects.filter((p) => p.status === "in_progress").length
  const avgProgress = totalProjects
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / totalProjects)
    : 0
  const overdueMilestones = milestones.filter((m) => m.status === "overdue").length
  const upcomingMilestones = milestones.filter((m) => m.status === "upcoming" || m.status === "in_progress")

  const healthData = [
    { name: "เสร็จแล้ว",      value: completedProjects,                                        color: "#34d399" },
    { name: "กำลังดำเนินการ", value: inProgressProjects,                                       color: "#4f8ef7" },
    { name: "รอดำเนินการ",    value: projects.filter((p) => p.status === "pending").length,    color: "#fbbf24" },
  ].filter((d) => d.value > 0)

  const emptyDonut = [{ name: "ว่าง", value: 1, color: "#1f2937" }]

  return (
    <div style={S.page}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={S.title}>Dashboard</h1>
        <p style={S.subtitle}>
          {user
            ? (isAdmin ? "ภาพรวมทุกโปรเจค" : `โปรเจคของคุณ · ${user.username}`)
            : "กำลังโหลดข้อมูลผู้ใช้..."}
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <span style={{
          ...S.roleBadge,
          background: isAdmin ? "#4f8ef722" : "#34d39922",
          color: isAdmin ? "#4f8ef7" : "#34d399",
          border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}`,
        }}>
          {isAdmin ? "👑 Admin — เห็นข้อมูลทั้งหมด" : "👤 Customer — เห็นเฉพาะโปรเจคของคุณ"}
        </span>
      </div>

      {error && <div style={{ color: "#f87171", marginBottom: 14 }}>{error}</div>}
      {loading && <div style={{ color: "#6b7280", marginBottom: 14 }}>กำลังโหลดข้อมูล...</div>}

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label: "โปรเจคทั้งหมด",     value: totalProjects,      color: "#4f8ef7", icon: "◎" },
          { label: "ความคืบหน้าเฉลี่ย", value: `${avgProgress}%`,  color: "#a78bfa", icon: "📊" },
          { label: "กำลังดำเนินการ",    value: inProgressProjects, color: "#fbbf24", icon: "⏳" },
          { label: "เสร็จแล้ว",          value: completedProjects,  color: "#34d399", icon: "✓" },
          { label: "Milestone เลยกำหนด", value: overdueMilestones,  color: "#f87171", icon: "⚠" },
        ].map((s) => (
          <div key={s.label} style={{ ...S.statCard, borderTopColor: s.color }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, marginBottom: 14 }}>
        <SectionCard title="Project Health">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={150} height={150}>
              <Pie data={healthData.length ? healthData : emptyDonut} cx={70} cy={70} innerRadius={45} outerRadius={68} dataKey="value" paddingAngle={2}>
                {(healthData.length ? healthData : emptyDonut).map((e) => <Cell key={e.name} fill={e.color} />)}
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(STATUS_CONFIG).map(([key, { label, color }]) => {
              const count = projects.filter((p) => p.status === key).length
              return (
                <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    <span style={{ color: "#9ca3af" }}>{label}</span>
                  </div>
                  <span style={{ color: "#4b5563", fontFamily: "monospace" }}>{count}</span>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard title={isAdmin ? "โปรเจคทั้งหมด" : "โปรเจคของฉัน"}>
          {projects.length === 0 ? (
            <div style={S.empty}>ยังไม่มีโปรเจค</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.map((p) => {
                const statusConfig = STATUS_CONFIG[p.status] || { label: p.status || "ไม่ระบุสถานะ", color: "#6b7280" }
                const { color } = statusConfig
                return (
                  <div key={p.id} style={S.projectRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f9fafb", marginBottom: 6 }}>
                        {p.name}
                        {isAdmin && <span style={{ fontSize: 11, color: "#4b5563", marginLeft: 8 }}>#{p.id}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, background: "#1f2937", borderRadius: 999, height: 5, overflow: "hidden" }}>
                          <div style={{ width: `${p.progress}%`, height: "100%", background: color, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", flexShrink: 0 }}>{p.progress}%</span>
                      </div>
                    </div>
                    <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44` }}>
                      {statusConfig.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Row 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14, marginBottom: 14 }}>
        <SectionCard title="ความคืบหน้าตามเวลา">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={PROGRESS_OVER_TIME} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="week" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12, color: "#e5e7eb" }} />
              <Area type="monotone" dataKey="progress" stroke="#4f8ef7" strokeWidth={2} fill="url(#pg)" />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Milestone ที่กำลังจะมา">
          {upcomingMilestones.length === 0 ? (
            <div style={S.empty}>ไม่มี milestone ที่รอดำเนินการ</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingMilestones.slice(0, 4).map((m) => {
                const proj = projects.find((p) => p.id === m.projectId)
                const { color, label } = MILESTONE_STATUS_CONFIG[m.status]
                return (
                  <div key={m.id} style={{ borderLeft: `3px solid ${color}`, paddingLeft: 12, display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f9fafb" }}>{m.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{proj?.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color }}>● {label}</span>
                      <span style={{ fontSize: 11, color: "#4b5563" }}>
                        {new Date(m.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Git Pulse — admin only */}
      {isAdmin && (
        <SectionCard title="Git Pulse — commits รายสัปดาห์">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={GIT_PULSE} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4b5563", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12, color: "#e5e7eb" }} />
              <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
                {GIT_PULSE.map((_, i) => <Cell key={i} fill="#4f8ef7" opacity={0.75} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      )}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{title}</div>
      {children}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e7eb" },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  statsRow: { display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderTop: "3px solid", borderRadius: 12, padding: "16px 18px", flex: "1 1 130px", display: "flex", flexDirection: "column", gap: 4 },
  projectRow: { display: "flex", alignItems: "center", gap: 14, background: "#0d1117", border: "1px solid #1a2232", borderRadius: 10, padding: "12px 14px" },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" as const, flexShrink: 0 },
  empty: { color: "#374151", fontSize: 13, textAlign: "center", padding: "24px 0", fontStyle: "italic" },
}
