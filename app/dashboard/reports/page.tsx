"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { getUser } from "@/lib/auth"
import { backend, normalizeProject } from "@/lib/backend"
import { useTheme } from "@/lib/themeContext"

type ProjectStatus = "pending" | "in_progress" | "completed" | "on_hold" | string
type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "overdue" | string
type FeedbackStatus = "received" | "in_progress" | "resolved" | string

type Project = {
  id: number
  name: string
  status: ProjectStatus
  progress: number
  createdAt?: string
  created_at?: string
  username?: string
}

type Milestone = {
  id: number
  projectId: number
  project_id?: number
  projectName?: string
  project_name?: string
  title: string
  status: MilestoneStatus
  progress: number
  startDate?: string
  start_date?: string
  dueDate?: string
  end_date?: string
}

type Feedback = {
  id: number
  projectId: number
  project_id?: number
  projectName?: string
  project_name?: string
  title: string
  status: FeedbackStatus
  priority?: string
  createdAt?: string
  created_at?: string
}

type ReportsResponse = {
  projects?: unknown[]
  milestones?: unknown[]
  feedbacks?: unknown[]
}

const PROJECT_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "รอดำเนินการ", color: "#fbbf24" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed: { label: "เสร็จสิ้น", color: "#34d399" },
  on_hold: { label: "พักงาน", color: "#f97316" },
}

const MILESTONE_STATUS: Record<string, { label: string; color: string }> = {
  upcoming: { label: "กำลังจะเริ่ม", color: "#94a3b8" },
  in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
  completed: { label: "เสร็จสิ้น", color: "#34d399" },
  overdue: { label: "เลยกำหนด", color: "#f87171" },
}

const FEEDBACK_STATUS: Record<string, { label: string; color: string }> = {
  received: { label: "ส่งถึงแล้ว", color: "#94a3b8" },
  pending: { label: "ส่งถึงแล้ว", color: "#94a3b8" },
  in_progress: { label: "กำลังดำเนินการ", color: "#fbbf24" },
  resolved: { label: "เสร็จสิ้น", color: "#34d399" },
  completed: { label: "เสร็จสิ้น", color: "#34d399" },
}

function getStyles(isLight: boolean): Record<string, React.CSSProperties> {
  return {
    page: {
      minHeight: "100vh",
      padding: "28px 32px",
      background: isLight ? "#f8fafc" : "#0b1220",
      color: isLight ? "#0f172a" : "#e5e7eb",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 16,
      flexWrap: "wrap",
      marginBottom: 22,
    },
    title: {
      margin: 0,
      color: isLight ? "#0f172a" : "#f9fafb",
      fontSize: 30,
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    subtitle: {
      margin: "7px 0 0",
      color: isLight ? "#64748b" : "#94a3b8",
      fontSize: 14,
      lineHeight: 1.7,
      maxWidth: 720,
    },
    buttonRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
    },
    button: {
      minHeight: 42,
      padding: "0 15px",
      borderRadius: 10,
      border: isLight ? "1px solid #cbd5e1" : "1px solid #334155",
      background: isLight ? "#ffffff" : "#111827",
      color: isLight ? "#334155" : "#e5e7eb",
      fontWeight: 700,
      cursor: "pointer",
    },
    primaryButton: {
      minHeight: 42,
      padding: "0 15px",
      borderRadius: 10,
      border: "1px solid #4f8ef7",
      background: "#2563eb",
      color: "#ffffff",
      fontWeight: 700,
      cursor: "pointer",
    },
    filterCard: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      padding: 16,
      marginBottom: 18,
      borderRadius: 14,
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      background: isLight ? "#ffffff" : "#111827",
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    },
    select: {
      minWidth: 260,
      height: 42,
      padding: "0 12px",
      borderRadius: 10,
      border: isLight ? "1px solid #cbd5e1" : "1px solid #334155",
      background: isLight ? "#ffffff" : "#0b1220",
      color: isLight ? "#0f172a" : "#f8fafc",
      outline: "none",
    },
    summaryGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
      gap: 14,
      marginBottom: 18,
    },
    statCard: {
      borderRadius: 16,
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      background: isLight ? "#ffffff" : "#111827",
      padding: 18,
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "0 10px 26px rgba(0,0,0,0.16)",
    },
    statTitle: {
      color: isLight ? "#64748b" : "#94a3b8",
      fontSize: 12,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    statValue: {
      color: isLight ? "#0f172a" : "#f8fafc",
      fontSize: 30,
      fontWeight: 800,
      marginTop: 10,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
      gap: 18,
      alignItems: "start",
    },
    card: {
      borderRadius: 16,
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      background: isLight ? "#ffffff" : "#111827",
      padding: 20,
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "0 10px 26px rgba(0,0,0,0.14)",
    },
    cardTitle: {
      margin: "0 0 16px",
      color: isLight ? "#0f172a" : "#f8fafc",
      fontSize: 17,
      fontWeight: 800,
    },
    item: {
      borderRadius: 13,
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      background: isLight ? "#f8fafc" : "#0f172a",
      padding: 15,
    },
    empty: {
      padding: "30px 20px",
      textAlign: "center",
      color: isLight ? "#94a3b8" : "#64748b",
      borderRadius: 12,
      border: isLight ? "1px dashed #cbd5e1" : "1px dashed #334155",
    },
    error: {
      marginBottom: 16,
      padding: "12px 14px",
      borderRadius: 10,
      border: "1px solid rgba(248,113,113,0.4)",
      background: isLight ? "#fef2f2" : "rgba(127,29,29,0.22)",
      color: isLight ? "#991b1b" : "#fecaca",
    },
  }
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampProgress(value: unknown) {
  return Math.min(100, Math.max(0, toNumber(value)))
}

function normalizeMilestone(row: any): Milestone {
  return {
    ...row,
    id: toNumber(row?.id),
    projectId: toNumber(row?.projectId ?? row?.project_id),
    projectName: row?.projectName ?? row?.project_name ?? "",
    title: String(row?.title ?? "ไม่มีชื่อ Milestone"),
    status: row?.status ?? "upcoming",
    progress: clampProgress(row?.progress),
    startDate: row?.startDate ?? row?.start_date ?? "",
    dueDate: row?.dueDate ?? row?.end_date ?? "",
  }
}

function normalizeFeedback(row: any): Feedback {
  return {
    ...row,
    id: toNumber(row?.id),
    projectId: toNumber(row?.projectId ?? row?.project_id),
    projectName: row?.projectName ?? row?.project_name ?? "",
    title: String(row?.title ?? row?.subject ?? "ไม่มีหัวข้อ"),
    status: row?.status ?? "received",
    priority: row?.priority ?? "medium",
    createdAt: row?.createdAt ?? row?.created_at ?? "",
  }
}

function formatDate(value?: string) {
  if (!value) return "ไม่ระบุ"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "ไม่ระบุ"
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function isMilestoneOverdue(milestone: Milestone) {
  if (milestone.status === "completed") return false
  if (milestone.status === "overdue") return true
  if (!milestone.dueDate) return false

  const dueDate = new Date(milestone.dueDate)
  if (Number.isNaN(dueDate.getTime())) return false

  dueDate.setHours(23, 59, 59, 999)
  return dueDate.getTime() < Date.now()
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

import { Suspense } from "react"

function ReportsContent() {
  const { theme } = useTheme()
  const isLight = theme === "light"
  const styles = getStyles(isLight)
  const searchParams = useSearchParams()
  const requestedProjectId = toNumber(searchParams.get("project"))
  const currentUser = getUser()
  const isAdmin = currentUser?.role === "admin"

  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number>(requestedProjectId)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("portrait")

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const response = (await backend.reports(isAdmin)) as ReportsResponse

      const projectRows = Array.isArray(response?.projects) ? response.projects : []
      const milestoneRows = Array.isArray(response?.milestones) ? response.milestones : []
      const feedbackRows = Array.isArray(response?.feedbacks) ? response.feedbacks : []

      const normalizedProjects = projectRows
        .map((row) => normalizeProject(row) as Project)
        .filter((project) => project.id > 0)

      setProjects(normalizedProjects)
      setMilestones(milestoneRows.map(normalizeMilestone).filter((item) => item.id > 0))
      setFeedbacks(feedbackRows.map(normalizeFeedback).filter((item) => item.id > 0))

      if (
        requestedProjectId > 0 &&
        !normalizedProjects.some((project) => project.id === requestedProjectId)
      ) {
        setSelectedProjectId(0)
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถโหลดข้อมูลรายงานได้"
      )
    } finally {
      setLoading(false)
    }
  }, [isAdmin, requestedProjectId])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const filteredProjects = useMemo(() => {
    if (!selectedProjectId) return projects
    return projects.filter((project) => project.id === selectedProjectId)
  }, [projects, selectedProjectId])

  const filteredMilestones = useMemo(() => {
    if (!selectedProjectId) return milestones
    return milestones.filter((milestone) => milestone.projectId === selectedProjectId)
  }, [milestones, selectedProjectId])

  const filteredFeedbacks = useMemo(() => {
    if (!selectedProjectId) return feedbacks
    return feedbacks.filter((feedback) => feedback.projectId === selectedProjectId)
  }, [feedbacks, selectedProjectId])

  const totalProjects = filteredProjects.length
  const completedProjects = filteredProjects.filter(
    (project) => project.status === "completed"
  ).length
  const activeProjects = filteredProjects.filter(
    (project) => project.status === "in_progress"
  ).length
  const averageProgress = totalProjects
    ? Math.round(
        filteredProjects.reduce(
          (sum, project) => sum + clampProgress(project.progress),
          0
        ) / totalProjects
      )
    : 0
  const completedMilestones = filteredMilestones.filter(
    (milestone) => milestone.status === "completed"
  ).length
  const overdueMilestones = filteredMilestones.filter(isMilestoneOverdue).length
  const openFeedbacks = filteredFeedbacks.filter(
    (feedback) =>
      !["resolved", "completed"].includes(String(feedback.status).toLowerCase())
  ).length

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId
  )

  function handlePrint(orientation: "portrait" | "landscape") {
    setPrintOrientation(orientation)
    window.setTimeout(() => window.print(), 80)
  }

  function downloadCsv() {
    const projectName = selectedProject?.name ?? "all-projects"
    const rows: string[][] = [
      ["Project Report"],
      ["Scope", selectedProject?.name ?? "ทุกโปรเจกต์"],
      ["Generated At", new Date().toLocaleString("th-TH")],
      [],
      ["Project", "Status", "Progress", "Created At"],
      ...filteredProjects.map((project) => [
        project.name,
        PROJECT_STATUS[project.status]?.label ?? project.status,
        `${clampProgress(project.progress)}%`,
        formatDate(project.createdAt ?? project.created_at),
      ]),
      [],
      ["Milestone", "Project", "Status", "Progress", "Due Date"],
      ...filteredMilestones.map((milestone) => [
        milestone.title,
        milestone.projectName ||
          projects.find((project) => project.id === milestone.projectId)?.name ||
          "-",
        isMilestoneOverdue(milestone)
          ? "เลยกำหนด"
          : MILESTONE_STATUS[milestone.status]?.label ?? milestone.status,
        `${clampProgress(milestone.progress)}%`,
        formatDate(milestone.dueDate),
      ]),
      [],
      ["Feedback", "Project", "Status", "Priority", "Created At"],
      ...filteredFeedbacks.map((feedback) => [
        feedback.title,
        feedback.projectName ||
          projects.find((project) => project.id === feedback.projectId)?.name ||
          "-",
        FEEDBACK_STATUS[feedback.status]?.label ?? feedback.status,
        feedback.priority ?? "-",
        formatDate(feedback.createdAt),
      ]),
    ]

    const csv = "\uFEFF" + rows.map((row) => row.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `project-report-${projectName
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]+/gi, "-")
      .replace(/^-|-$/g, "") || "report"}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main style={styles.page} className="report-page">
      <style>{`
        @page {
          size: A4 ${printOrientation};
          margin: 14mm;
        }

        @media (max-width: 1050px) {
          .report-main-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px) {
          .report-page {
            padding: 20px 16px !important;
          }

          .report-filter-select {
            width: 100% !important;
            min-width: 0 !important;
          }
        }

        @media print {
          body {
            background: #ffffff !important;
          }

          .no-print {
            display: none !important;
          }

          .report-page {
            min-height: auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #111827 !important;
          }

          .print-card {
            break-inside: avoid;
            background: #ffffff !important;
            border-color: #d1d5db !important;
            box-shadow: none !important;
          }

          .print-card * {
            color: #111827 !important;
          }

          .print-progress-track {
            background: #e5e7eb !important;
          }

          .print-progress-fill {
            background: #4f8ef7 !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Reports</h1>
          <p style={styles.subtitle}>
            {isAdmin
              ? "สรุปข้อมูลจริงของทุกโปรเจกต์ Milestone และ Feedback ในระบบ"
              : "สรุปข้อมูลจริงของโปรเจกต์ที่อยู่ในบัญชีของคุณ"}
          </p>
        </div>

        <div style={styles.buttonRow} className="no-print">
          <button
            type="button"
            style={styles.button}
            onClick={() => void loadReports()}
            disabled={loading}
          >
            ↻ {loading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
          <button type="button" style={styles.button} onClick={downloadCsv}>
            ↓ ดาวน์โหลด CSV
          </button>
          <button
            type="button"
            style={styles.button}
            onClick={() => handlePrint("portrait")}
          >
            พิมพ์แนวตั้ง
          </button>
          <button
            type="button"
            style={styles.primaryButton}
            onClick={() => handlePrint("landscape")}
          >
            พิมพ์แนวนอน
          </button>
        </div>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <section style={styles.filterCard} className="no-print">
        <strong style={{ color: "#f8fafc", fontSize: 14 }}>ขอบเขตรายงาน</strong>
        <select
          className="report-filter-select"
          style={styles.select}
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(toNumber(event.target.value))}
        >
          <option value={0}>ทุกโปรเจกต์</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <span style={{ color: "#64748b", fontSize: 13 }}>
          อัปเดตล่าสุด {new Date().toLocaleString("th-TH")}
        </span>
      </section>

      {loading ? (
        <div style={{ ...styles.card, textAlign: "center", color: "#94a3b8" }}>
          กำลังโหลดข้อมูลรายงาน...
        </div>
      ) : (
        <>
          <section style={styles.summaryGrid}>
            {[
              ["โปรเจกต์ทั้งหมด", totalProjects],
              ["กำลังดำเนินการ", activeProjects],
              ["ความคืบหน้าเฉลี่ย", `${averageProgress}%`],
              ["Milestone เสร็จแล้ว", `${completedMilestones}/${filteredMilestones.length}`],
              ["Milestone เลยกำหนด", overdueMilestones],
              ["Feedback ที่ยังเปิดอยู่", openFeedbacks],
            ].map(([label, value]) => (
              <article key={String(label)} style={styles.statCard} className="print-card">
                <div style={styles.statTitle}>{label}</div>
                <div style={styles.statValue}>{value}</div>
              </article>
            ))}
          </section>

          <div style={styles.grid} className="report-main-grid">
            <section style={{ display: "grid", gap: 18 }}>
              <article style={styles.card} className="print-card">
                <h2 style={styles.cardTitle}>
                  ภาพรวมโปรเจกต์
                  {selectedProject ? ` — ${selectedProject.name}` : ""}
                </h2>

                {filteredProjects.length === 0 ? (
                  <div style={styles.empty}>ยังไม่มีข้อมูลโปรเจกต์</div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {filteredProjects.map((project) => {
                      const status =
                        PROJECT_STATUS[project.status] ?? {
                          label: project.status || "ไม่ระบุ",
                          color: "#94a3b8",
                        }

                      return (
                        <div key={project.id} style={styles.item} className="print-card">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: "#f8fafc",
                                  fontSize: 15,
                                  fontWeight: 800,
                                }}
                              >
                                {project.name}
                              </div>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: 12,
                                  marginTop: 5,
                                }}
                              >
                                สร้างเมื่อ{" "}
                                {formatDate(project.createdAt ?? project.created_at)}
                                {isAdmin && project.username
                                  ? ` · ลูกค้า ${project.username}`
                                  : ""}
                              </div>
                            </div>

                            <span
                              style={{
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: `1px solid ${status.color}55`,
                                background: `${status.color}18`,
                                color: status.color,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 14,
                              marginBottom: 7,
                              color: "#cbd5e1",
                              fontSize: 12,
                            }}
                          >
                            <span>ความคืบหน้า</span>
                            <strong>{clampProgress(project.progress)}%</strong>
                          </div>

                          <div
                            className="print-progress-track"
                            style={{
                              height: 8,
                              overflow: "hidden",
                              borderRadius: 999,
                              background: "#1e293b",
                            }}
                          >
                            <div
                              className="print-progress-fill"
                              style={{
                                width: `${clampProgress(project.progress)}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: status.color,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </article>

              <article style={styles.card} className="print-card">
                <h2 style={styles.cardTitle}>Milestones</h2>

                {filteredMilestones.length === 0 ? (
                  <div style={styles.empty}>ยังไม่มี Milestone ในขอบเขตนี้</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {filteredMilestones.map((milestone) => {
                      const overdue = isMilestoneOverdue(milestone)
                      const status = overdue
                        ? { label: "เลยกำหนด", color: "#f87171" }
                        : MILESTONE_STATUS[milestone.status] ?? {
                            label: milestone.status || "ไม่ระบุ",
                            color: "#94a3b8",
                          }
                      const projectName =
                        milestone.projectName ||
                        projects.find(
                          (project) => project.id === milestone.projectId
                        )?.name ||
                        "ไม่พบโปรเจกต์"

                      return (
                        <div key={milestone.id} style={styles.item} className="print-card">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  color: "#f8fafc",
                                  fontSize: 14,
                                  fontWeight: 800,
                                }}
                              >
                                {milestone.title}
                              </div>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: 12,
                                  marginTop: 5,
                                }}
                              >
                                {projectName} · กำหนด {formatDate(milestone.dueDate)}
                              </div>
                            </div>
                            <span
                              style={{
                                color: status.color,
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </article>
            </section>

            <aside style={{ display: "grid", gap: 18 }}>
              <article style={styles.card} className="print-card">
                <h2 style={styles.cardTitle}>สรุปสถานะ</h2>
                <div style={{ display: "grid", gap: 11 }}>
                  {[
                    ["โปรเจกต์เสร็จสิ้น", completedProjects, "#34d399"],
                    ["โปรเจกต์กำลังทำ", activeProjects, "#4f8ef7"],
                    ["Milestone เลยกำหนด", overdueMilestones, "#f87171"],
                    ["Feedback ยังไม่เสร็จ", openFeedbacks, "#fbbf24"],
                  ].map(([label, value, color]) => (
                    <div
                      key={String(label)}
                      style={{
                        ...styles.item,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ color: "#cbd5e1", fontSize: 13 }}>{label}</span>
                      <strong style={{ color: String(color), fontSize: 18 }}>
                        {value}
                      </strong>
                    </div>
                  ))}
                </div>
              </article>

              <article style={styles.card} className="print-card">
                <h2 style={styles.cardTitle}>Feedback ล่าสุด</h2>

                {filteredFeedbacks.length === 0 ? (
                  <div style={styles.empty}>ยังไม่มี Feedback ในขอบเขตนี้</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {filteredFeedbacks.slice(0, 8).map((feedback) => {
                      const status =
                        FEEDBACK_STATUS[feedback.status] ?? {
                          label: feedback.status || "ไม่ระบุ",
                          color: "#94a3b8",
                        }
                      const projectName =
                        feedback.projectName ||
                        projects.find(
                          (project) => project.id === feedback.projectId
                        )?.name ||
                        "ไม่พบโปรเจกต์"

                      return (
                        <div key={feedback.id} style={styles.item} className="print-card">
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "flex-start",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  color: "#f8fafc",
                                  fontWeight: 800,
                                  fontSize: 13,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {feedback.title}
                              </div>
                              <div
                                style={{
                                  color: "#64748b",
                                  fontSize: 11,
                                  marginTop: 5,
                                }}
                              >
                                {projectName} · {formatDate(feedback.createdAt)}
                              </div>
                            </div>
                            <span
                              style={{
                                flexShrink: 0,
                                color: status.color,
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </article>

              <article style={styles.card} className="print-card">
                <h2 style={styles.cardTitle}>ข้อมูลรายงาน</h2>
                <p
                  style={{
                    margin: 0,
                    color: "#94a3b8",
                    fontSize: 13,
                    lineHeight: 1.8,
                  }}
                >
                  หน้านี้คำนวณจาก Projects, Milestones และ Feedback ที่ Backend
                  ส่งมาโดยตรง ไม่มีรายงานตัวอย่างหรือข้อมูลจาก Mock Data
                </p>
              </article>
            </aside>
          </div>
        </>
      )}
    </main>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#94a3b8" }}>กำลังโหลด...</div>}>
      <ReportsContent />
    </Suspense>
  )
}