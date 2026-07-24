"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { backend, normalizeMilestone, normalizeProject } from "@/lib/backend"
import { getUser, type JwtUser } from "@/lib/auth"

type ProjectStatus = "pending" | "in_progress" | "completed" | string
type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "overdue" | string

type DashboardProject = {
  id: number
  name: string
  status: ProjectStatus
  progress: number
}

type DashboardMilestone = {
  id: number
  projectId: number
  title: string
  status: MilestoneStatus
  progress: number
  dueDate?: string | null
}

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "#fbbf24" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed: { label: "เสร็จแล้ว", color: "#34d399" },
}

const MILESTONE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  upcoming: { label: "กำลังจะเริ่ม", color: "#a78bfa" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed: { label: "เสร็จแล้ว", color: "#34d399" },
  overdue: { label: "เลยกำหนด", color: "#f87171" },
}

function clampProgress(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, Math.round(parsed)))
}

function safeDateValue(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(value?: string | null) {
  const date = safeDateValue(value)
  if (!date) return "ไม่ระบุ"
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
}

function resolveMilestoneStatus(milestone: DashboardMilestone): MilestoneStatus {
  if (milestone.status === "completed" || milestone.progress >= 100) return "completed"

  const dueDate = safeDateValue(milestone.dueDate)
  if (dueDate) {
    const endOfDueDate = new Date(dueDate)
    endOfDueDate.setHours(23, 59, 59, 999)
    if (endOfDueDate.getTime() < Date.now()) return "overdue"
  }

  return milestone.status || "upcoming"
}

export default function DashboardPage() {
  const [user, setUser] = useState<JwtUser | null>(null)
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [milestones, setMilestones] = useState<DashboardMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const isAdmin = user?.role === "admin"

  const loadDashboard = useCallback(async (showRefreshState = false) => {
    if (showRefreshState) setRefreshing(true)
    else setLoading(true)

    setError("")

    try {
      const currentUser = getUser()
      setUser(currentUser)

      const projectRows = await backend.projects(currentUser?.role === "admin")
      const nextProjects = projectRows.map((row: any) => {
        const project = normalizeProject(row) as any
        return {
          id: Number(project.id),
          name: project.name || "โปรเจคไม่มีชื่อ",
          status: project.status || "pending",
          progress: clampProgress(project.progress),
        } satisfies DashboardProject
      })

      setProjects(nextProjects)

      const milestoneResults = await Promise.allSettled(
        nextProjects.map((project) => backend.milestones(project.id)),
      )

      const nextMilestones = milestoneResults.flatMap((result) => {
        if (result.status !== "fulfilled") return []

        return result.value.map((row: any) => {
          const milestone = normalizeMilestone(row) as any
          return {
            id: Number(milestone.id),
            projectId: Number(milestone.projectId ?? milestone.project_id),
            title: milestone.title || "Milestone ไม่มีชื่อ",
            status: milestone.status || "upcoming",
            progress: clampProgress(milestone.progress),
            dueDate: milestone.dueDate ?? milestone.due_date ?? milestone.endDate ?? milestone.end_date ?? null,
          } satisfies DashboardMilestone
        })
      })

      setMilestones(nextMilestones)

      const failedMilestoneRequests = milestoneResults.filter((result) => result.status === "rejected").length
      if (failedMilestoneRequests > 0) {
        setError(`โหลด Milestone ไม่สำเร็จ ${failedMilestoneRequests} โปรเจค แต่ข้อมูลส่วนอื่นยังแสดงได้`)
      }
    } catch (err) {
      setProjects([])
      setMilestones([])
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Dashboard ได้")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const dashboardData = useMemo(() => {
    const resolvedMilestones = milestones.map((milestone) => ({
      ...milestone,
      resolvedStatus: resolveMilestoneStatus(milestone),
    }))

    const totalProjects = projects.length
    const completedProjects = projects.filter((project) => project.status === "completed").length
    const inProgressProjects = projects.filter((project) => project.status === "in_progress").length
    const pendingProjects = projects.filter((project) => project.status === "pending").length
    const avgProgress = totalProjects
      ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / totalProjects)
      : 0

    const overdueMilestones = resolvedMilestones.filter((milestone) => milestone.resolvedStatus === "overdue").length

    const upcomingMilestones = resolvedMilestones
      .filter((milestone) => milestone.resolvedStatus === "upcoming" || milestone.resolvedStatus === "in_progress" || milestone.resolvedStatus === "overdue")
      .sort((a, b) => {
        const aTime = safeDateValue(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
        const bTime = safeDateValue(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
        return aTime - bTime
      })

    const projectHealthData = [
      { name: "เสร็จแล้ว", value: completedProjects, color: PROJECT_STATUS_CONFIG.completed.color },
      { name: "กำลังดำเนินการ", value: inProgressProjects, color: PROJECT_STATUS_CONFIG.in_progress.color },
      { name: "รอดำเนินการ", value: pendingProjects, color: PROJECT_STATUS_CONFIG.pending.color },
    ].filter((item) => item.value > 0)

    const progressDistribution = [
      { range: "0–24%", projects: projects.filter((project) => project.progress < 25).length },
      { range: "25–49%", projects: projects.filter((project) => project.progress >= 25 && project.progress < 50).length },
      { range: "50–74%", projects: projects.filter((project) => project.progress >= 50 && project.progress < 75).length },
      { range: "75–99%", projects: projects.filter((project) => project.progress >= 75 && project.progress < 100).length },
      { range: "100%", projects: projects.filter((project) => project.progress >= 100).length },
    ]

    return {
      totalProjects,
      completedProjects,
      inProgressProjects,
      avgProgress,
      overdueMilestones,
      upcomingMilestones,
      projectHealthData,
      progressDistribution,
    }
  }, [milestones, projects])

  return (
    <div style={S.page}>
      <div style={S.headerRow}>
        <div>
          <h1 style={S.title}>Dashboard</h1>
          <p style={S.subtitle}>
            {user
              ? isAdmin
                ? "ภาพรวมข้อมูลโปรเจคทั้งหมด"
                : `ภาพรวมโปรเจคของคุณ · ${user.username}`
              : "กำลังโหลดข้อมูลผู้ใช้..."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard(true)}
          disabled={loading || refreshing}
          style={{ ...S.refreshButton, opacity: loading || refreshing ? 0.6 : 1 }}
        >
          ↻ {refreshing ? "กำลังรีเฟรช..." : "รีเฟรช"}
        </button>
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
          {isAdmin ? "👑 Admin — เห็นข้อมูลทุกโปรเจค" : "👤 Customer — เห็นเฉพาะโปรเจคของคุณ"}
        </span>
      </div>

      {error && <div role="alert" style={S.errorBox}>{error}</div>}
      {loading && <div style={S.loadingBox}>กำลังโหลดข้อมูล Dashboard...</div>}

      <div style={S.statsRow}>
        {[
          { label: "โปรเจคทั้งหมด", value: dashboardData.totalProjects, color: "#4f8ef7", icon: "◎" },
          { label: "ความคืบหน้าเฉลี่ย", value: `${dashboardData.avgProgress}%`, color: "#a78bfa", icon: "▥" },
          { label: "กำลังดำเนินการ", value: dashboardData.inProgressProjects, color: "#fbbf24", icon: "◷" },
          { label: "เสร็จแล้ว", value: dashboardData.completedProjects, color: "#34d399", icon: "✓" },
          { label: "Milestone เลยกำหนด", value: dashboardData.overdueMilestones, color: "#f87171", icon: "⚠" },
        ].map((stat) => (
          <div key={stat.label} style={{ ...S.statCard, borderTopColor: stat.color }}>
            <div style={{ fontSize: 20 }}>{stat.icon}</div>
            <div style={S.statValue}>{stat.value}</div>
            <div style={S.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={S.firstGrid}>
        <SectionCard title="Project Health">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={160} height={160}>
              <Pie
                data={dashboardData.projectHealthData.length ? dashboardData.projectHealthData : [{ name: "ยังไม่มีข้อมูล", value: 1, color: "#1f2937" }]}
                cx={75}
                cy={75}
                innerRadius={48}
                outerRadius={70}
                dataKey="value"
                paddingAngle={2}
              >
                {(dashboardData.projectHealthData.length ? dashboardData.projectHealthData : [{ name: "ยังไม่มีข้อมูล", value: 1, color: "#1f2937" }]).map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {Object.entries(PROJECT_STATUS_CONFIG).map(([status, config]) => {
              const count = projects.filter((project) => project.status === status).length
              return (
                <div key={status} style={S.legendRow}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: config.color }} />
                    <span style={{ color: "#9ca3af" }}>{config.label}</span>
                  </div>
                  <span style={S.monospaceMuted}>{count}</span>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          title={isAdmin ? "โปรเจคทั้งหมด" : "โปรเจคของฉัน"}
          action={<Link href="/dashboard/projects" style={S.cardLink}>ดูทั้งหมด →</Link>}
        >
          {projects.length === 0 && !loading ? (
            <div style={S.empty}>ยังไม่มีโปรเจค</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projects.slice(0, 6).map((project) => {
                const statusConfig = PROJECT_STATUS_CONFIG[project.status] ?? {
                  label: project.status || "ไม่ระบุสถานะ",
                  color: "#6b7280",
                }

                return (
                  <Link key={project.id} href={`/dashboard/projects/${project.id}`} style={S.projectRowLink}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.projectName}>
                        {project.name}
                        {isAdmin && <span style={S.projectId}>#{project.id}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={S.progressTrack}>
                          <div style={{ width: `${project.progress}%`, height: "100%", background: statusConfig.color, borderRadius: 999 }} />
                        </div>
                        <span style={S.progressText}>{project.progress}%</span>
                      </div>
                    </div>
                    <span style={{ ...S.badge, background: `${statusConfig.color}22`, color: statusConfig.color, border: `1px solid ${statusConfig.color}44` }}>
                      {statusConfig.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div style={S.secondGrid}>
        <SectionCard title="การกระจายความคืบหน้าของโปรเจค">
          {projects.length === 0 && !loading ? (
            <div style={S.empty}>ยังไม่มีข้อมูลความคืบหน้า</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dashboardData.progressDistribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#172033" }}
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 12, color: "#e5e7eb" }}
                  formatter={(value) => [`${value} โปรเจค`, "จำนวน"]}
                />
                <Bar dataKey="projects" fill="#4f8ef7" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        <SectionCard
          title="Milestone ที่ควรติดตาม"
          action={<Link href="/dashboard/milestones" style={S.cardLink}>ดูทั้งหมด →</Link>}
        >
          {dashboardData.upcomingMilestones.length === 0 && !loading ? (
            <div style={S.empty}>ไม่มี Milestone ที่ต้องติดตาม</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {dashboardData.upcomingMilestones.slice(0, 5).map((milestone) => {
                const project = projects.find((item) => item.id === milestone.projectId)
                const statusConfig = MILESTONE_STATUS_CONFIG[milestone.resolvedStatus] ?? {
                  label: milestone.resolvedStatus || "ไม่ระบุสถานะ",
                  color: "#6b7280",
                }

                return (
                  <Link
                    key={milestone.id}
                    href={`/dashboard/milestones?project=${milestone.projectId}`}
                    style={{ ...S.milestoneLink, borderLeftColor: statusConfig.color }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f9fafb" }}>{milestone.title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>{project?.name ?? "ไม่พบชื่อโปรเจค"}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 11, color: statusConfig.color }}>● {statusConfig.label}</span>
                      <span style={{ fontSize: 11, color: "#6b7280" }}>{formatShortDate(milestone.dueDate)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <div style={S.quickGrid}>
        <QuickLink href="/dashboard/feedback" title="Feedback Center" description="ตรวจข้อเสนอแนะและข้อความตอบกลับ" />
        <QuickLink href="/dashboard/documents" title="Document Vault" description="ดูและจัดการเอกสารของโปรเจค" />
        <QuickLink href="/dashboard/reports" title="Reports" description="เปิดรายงานและสรุปความคืบหน้า" />
        {isAdmin && <QuickLink href="/dashboard/git" title="Git Pulse" description="ดูข้อมูล Repository และ Commit" />}
      </div>
    </div>
  )
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section style={S.sectionCard}>
      <div style={S.sectionHeader}>
        <div style={S.sectionTitle}>{title}</div>
        {action}
      </div>
      {children}
    </section>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} style={S.quickLink}>
      <div style={{ fontSize: 14, color: "#f9fafb", fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{description}</div>
      <div style={{ fontSize: 12, color: "#4f8ef7", marginTop: 4 }}>เปิดหน้า →</div>
    </Link>
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
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  refreshButton: {
    border: "1px solid #374151",
    borderRadius: 9,
    background: "#111827",
    color: "#cbd5e1",
    padding: "9px 13px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
  },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  errorBox: {
    color: "#fca5a5",
    background: "#7f1d1d22",
    border: "1px solid #ef444444",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
  },
  loadingBox: {
    color: "#9ca3af",
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 10,
    padding: "10px 12px",
    marginBottom: 14,
    fontSize: 13,
  },
  statsRow: { display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  statCard: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderTop: "3px solid",
    borderRadius: 12,
    padding: "16px 18px",
    flex: "1 1 140px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statValue: { fontSize: 26, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" },
  statLabel: { fontSize: 12, color: "#6b7280" },
  firstGrid: { display: "grid", gridTemplateColumns: "250px minmax(0, 1fr)", gap: 14, marginBottom: 14 },
  secondGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 340px", gap: 14, marginBottom: 14 },
  sectionCard: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    minWidth: 0,
  },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: "0.08em", textTransform: "uppercase" },
  cardLink: { color: "#4f8ef7", textDecoration: "none", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  legendRow: { display: "flex", justifyContent: "space-between", fontSize: 12 },
  monospaceMuted: { color: "#4b5563", fontFamily: "monospace" },
  projectRowLink: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#0d1117",
    border: "1px solid #1a2232",
    borderRadius: 10,
    padding: "12px 14px",
    textDecoration: "none",
  },
  projectName: { fontSize: 14, fontWeight: 600, color: "#f9fafb", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  projectId: { fontSize: 11, color: "#4b5563", marginLeft: 8 },
  progressTrack: { flex: 1, background: "#1f2937", borderRadius: 999, height: 5, overflow: "hidden" },
  progressText: { fontSize: 11, color: "#6b7280", fontFamily: "monospace", flexShrink: 0 },
  badge: { fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0 },
  milestoneLink: {
    borderLeft: "3px solid",
    padding: "4px 0 4px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textDecoration: "none",
  },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 },
  quickLink: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    textDecoration: "none",
  },
  empty: { color: "#4b5563", fontSize: 13, textAlign: "center", padding: "24px 0", fontStyle: "italic" },
}