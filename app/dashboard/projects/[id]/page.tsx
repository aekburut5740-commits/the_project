"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { backend, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"
import { STATUS_CONFIG } from "@/lib/project-config"
import type { Manager, Project } from "@/types/project"
import { useTheme } from "@/lib/themeContext"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { theme } = useTheme()
  const isLight = theme === "light"
  const S = getStyles(isLight)

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")

      try {
        const projectId = Number(id)

        if (!Number.isInteger(projectId) || projectId <= 0) {
          throw new Error("รหัสโปรเจคไม่ถูกต้อง")
        }

        const currentUser = getUser()
        const isAdmin = currentUser?.role === "admin"

        const [projectRows, memberRows] = await Promise.all([
          backend.projects(isAdmin),
          backend.projectMembers(projectId).catch(() => []),
        ])

        const projectRow = projectRows.find(
          (row: any) => Number(row.id) === projectId
        )

        if (!projectRow) {
          throw new Error("ไม่พบโปรเจคนี้ หรือคุณไม่มีสิทธิ์เข้าถึง")
        }

        const normalized = normalizeProject(projectRow) as Project

        setProject({
          ...normalized,
          managers: (memberRows as MemberApiRow[]).map(normalizeManager),
        })
      } catch (err: unknown) {
        setProject(null)

        setError(
          err instanceof Error
            ? err.message
            : "ไม่สามารถโหลดรายละเอียดโปรเจคได้"
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  if (loading) return (
    <div style={{ minHeight: "100vh", background: isLight ? "#f8fafc" : "#0d1117", color: isLight ? "#64748b" : "#9ca3af", padding: 32 }}>
      กำลังโหลดรายละเอียดโปรเจค...
    </div>
  )
  if (error || !project) return (
    <div style={{ minHeight: "100vh", background: isLight ? "#f8fafc" : "#0d1117", color: "#f87171", padding: 32 }}>
      {error || "ไม่พบโปรเจค"}
    </div>
  )

  const { color, label } = STATUS_CONFIG[project.status] || { color: "#6b7280", label: project.status }

  return (
    <div style={S.page}>
      <Link href="/dashboard/projects" style={{ color: "#4f8ef7", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-block", marginBottom: 20 }}>
        ← กลับไปหน้าโปรเจค
      </Link>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: isLight ? "#0f172a" : "#f9fafb" }}>{project.name}</h1>
            <p style={{ margin: "6px 0 0", color: isLight ? "#64748b" : "#9ca3af", fontSize: 14 }}>{project.description}</p>
          </div>
          <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${color}44`, background: `${color}22`, color, fontSize: 12, fontWeight: 700 }}>
            {label}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <InfoCard
            label="แพ็กเกจ"
            value={project.package}
            isLight={isLight}
          />

          <InfoCard
            label="วันที่เริ่ม"
            value={formatDate(project.startDate)}
            isLight={isLight}
          />
        </div>

        {/* Progress Bar */}
        <div style={S.progressBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: isLight ? "#64748b" : "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ความคืบหน้าโครงการ
            </div>
            <div style={{ fontSize: 14, color: isLight ? "#0f172a" : "#f9fafb", fontWeight: 700 }}>{project.progress}%</div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: isLight ? "#e2e8f0" : "#1f2937", overflow: "hidden" }}>
            <div
              style={{
                width: `${clampProgress(project.progress)}%`,
                height: "100%",
                borderRadius: 999,
                background: color,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: isLight ? "#64748b" : "#9ca3af" }}>สถานะ: {label}</div>
        </div>

        {/* Menu Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <ProjectMenuCard href={`/dashboard/milestones?project=${project.id}`} icon="🚩" title="Milestones" description="ดูขั้นตอนและกำหนดส่ง" isLight={isLight} />
          <ProjectMenuCard href={`/dashboard/documents?project=${project.id}`} icon="📄" title="Documents" description="ดูไฟล์ของโปรเจค" isLight={isLight} />
          <ProjectMenuCard href={`/dashboard/feedback?project=${project.id}`} icon="💬" title="Feedback" description="ดูข้อเสนอแนะและการตอบกลับ" isLight={isLight} />
          <ProjectMenuCard href={`/dashboard/reports?project=${project.id}`} icon="📊" title="Reports" description="ดูรายงานของโปรเจค" isLight={isLight} />
        </div>

        {/* Detail Info */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <InfoCard label="Git Repo / Domain" value={project.domain || "-"} isLight={isLight} />
          <InfoCard label="Website URL" value={project.website || "-"} isLight={isLight} />
          <InfoCard label="Token" value={project.token || "-"} isLight={isLight} />
          <InfoCard label="Owner ID" value={String(project.ownerId)} isLight={isLight} />
        </div>
      </div>
    </div>
  )
}

function getStyles(isLight: boolean): Record<string, React.CSSProperties> {
  return {
    page: {
      minHeight: "100vh",
      background: isLight ? "#f8fafc" : "#0d1117",
      color: isLight ? "#0f172a" : "#e5e7eb",
      padding: "28px 32px",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
    },
    card: {
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      borderRadius: 16,
      padding: 24,
      display: "flex",
      flexDirection: "column" as const,
      gap: 18,
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    },
    progressBox: {
      background: isLight ? "#f8fafc" : "#0d1117",
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      borderRadius: 12,
      padding: "16px 18px",
    },
  }
}

function ProjectMenuCard({ href, icon, title, description, isLight }: {
  href: string; icon: string; title: string; description: string; isLight: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        background: isLight ? "#f8fafc" : "#0d1117",
        border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
        borderRadius: 12,
        padding: "14px 16px",
        textDecoration: "none",
        transition: "border-color 0.2s ease",
      }}
    >
      <div style={{ fontSize: 21 }}>{icon}</div>
      <div style={{ marginTop: 8, color: isLight ? "#0f172a" : "#f9fafb", fontSize: 14, fontWeight: 700 }}>{title}</div>
      <div style={{ marginTop: 3, color: isLight ? "#64748b" : "#6b7280", fontSize: 12 }}>{description}</div>
    </Link>
  )
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

function formatDate(value: string): string {
  if (!value) return "ยังไม่ได้กำหนด"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "ยังไม่ได้กำหนด"
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
}

function InfoCard({ label, value, isLight }: { label: string; value: string; isLight: boolean }) {
  return (
    <div style={{ background: isLight ? "#f8fafc" : "#0d1117", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: isLight ? "#64748b" : "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 14, color: isLight ? "#0f172a" : "#f9fafb", marginTop: 6, wordBreak: "break-word" }}>{value}</div>
    </div>
  )
}

function WebsiteCard({ website, isLight, projectId }: { website: string; isLight: boolean; projectId?: number }) {
  const cleanWebsite = website?.trim() ?? ""
  const currentOrigin = typeof window !== "undefined" ? window.location.origin : ""

  const href = (cleanWebsite && !cleanWebsite.startsWith("http://localhost:3000"))
    ? (cleanWebsite.startsWith("http://") || cleanWebsite.startsWith("https://") ? cleanWebsite : `https://${cleanWebsite}`)
    : (currentOrigin ? `${currentOrigin}/dashboard/projects/${projectId || ""}` : `/dashboard/projects/${projectId || ""}`)

  return (
    <div style={{ background: isLight ? "#f8fafc" : "#0d1117", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: isLight ? "#64748b" : "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>เว็บไซต์หน้างาน (Preview)</div>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 13, color: "#4f8ef7", textDecoration: "none", fontWeight: 600, marginTop: 4, display: "inline-block", wordBreak: "break-all" }}
      >
        🌐 {cleanWebsite && !cleanWebsite.startsWith("http://localhost:3000") ? cleanWebsite : href}
      </a>
    </div>
  )
}

interface MemberApiRow {
  id?: number | string
  name?: string
  username?: string
  role?: string
}

function normalizeManager(member: MemberApiRow, index: number): Manager {
  const name = member.name ?? member.username ?? "ผู้ดูแล"
  const colors = ["#4f8ef7", "#a78bfa", "#34d399", "#f59e0b"]
  const avatar = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")
  return {
    id: Number(member.id),
    name,
    avatar: avatar || "U",
    color: colors[index % colors.length],
  }
}
