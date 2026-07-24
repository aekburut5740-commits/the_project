"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { backend, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"
import {
  STATUS_CONFIG,
  type Manager,
  type Project,
} from "@/lib/mockData"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
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

  if (loading) return <div style={{ minHeight: "100vh", background: "#0d1117", color: "#9ca3af", padding: 32 }}>กำลังโหลดรายละเอียดโปรเจค...</div>
  if (error || !project) return <div style={{ minHeight: "100vh", background: "#0d1117", color: "#f87171", padding: 32 }}>{error || "ไม่พบโปรเจค"}</div>

  const { color, label } = STATUS_CONFIG[project.status] || { color: "#6b7280", label: project.status }

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e5e7eb", padding: "28px 32px" }}>
      <Link href="/dashboard/projects" style={{ color: "#4f8ef7", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-block", marginBottom: 20 }}>
        ← กลับไปหน้าโปรเจค
      </Link>

      <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: "#f9fafb" }}>{project.name}</h1>
            <p style={{ margin: "6px 0 0", color: "#9ca3af", fontSize: 14 }}>{project.description}</p>
          </div>
          <span style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${color}44`, background: `${color}22`, color, fontSize: 12, fontWeight: 700 }}>
            {label}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <WebsiteCard website={project.website} />
          <InfoCard label="ความคืบหน้า" value={`${clampProgress(project.progress)}%`} />
          <InfoCard label="แพ็กเกจ" value={project.package} />
          <InfoCard
            label="วันที่เริ่ม"
            value={formatDate(project.startDate)}
          />
        </div>

        <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ความคืบหน้าโครงการ
            </div>
            <div style={{ fontSize: 14, color: "#f9fafb", fontWeight: 700 }}>{project.progress}%</div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "#1f2937", overflow: "hidden" }}>
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
          <div style={{ marginTop: 8, fontSize: 13, color: "#9ca3af" }}>สถานะ: {label}</div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <ProjectMenuCard
            href={`/dashboard/milestones?project=${project.id}`}
            icon="🚩"
            title="Milestones"
            description="ดูขั้นตอนและกำหนดส่ง"
          />

          <ProjectMenuCard
            href={`/dashboard/documents?project=${project.id}`}
            icon="📄"
            title="Documents"
            description="ดูไฟล์ของโปรเจค"
          />

          <ProjectMenuCard
            href={`/dashboard/feedback?project=${project.id}`}
            icon="💬"
            title="Feedback"
            description="ดูข้อเสนอแนะและการตอบกลับ"
          />

          <ProjectMenuCard
            href={`/dashboard/reports?project=${project.id}`}
            icon="📊"
            title="Reports"
            description="ดูรายงานของโปรเจค"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <InfoCard label="Domain" value={project.domain || "-"} />
          <InfoCard label="Token" value={project.token || "-"} />
          <InfoCard label="Owner ID" value={String(project.ownerId)} />
          <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ผู้จัดการและดูแล
            </div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              {project.managers.length > 0 ? (
                project.managers.map((manager) => (
                  <div key={manager.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${manager.color}22`, color: manager.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: `1px solid ${manager.color}44` }}>
                      {manager.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: "#f9fafb", fontWeight: 600 }}>{manager.name}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>ผู้ดูแลโปรเจกต์</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>ยังไม่มีผู้จัดการที่กำกับดูแล</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectMenuCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        background: "#0d1117",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: "14px 16px",
        textDecoration: "none",
        transition: "border-color 0.2s ease",
      }}
    >
      <div style={{ fontSize: 21 }}>{icon}</div>

      <div
        style={{
          marginTop: 8,
          color: "#f9fafb",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          marginTop: 3,
          color: "#6b7280",
          fontSize: 12,
        }}
      >
        {description}
      </div>
    </Link>
  )
}

function clampProgress(value: number): number {
  return Math.min(100, Math.max(0, Number(value) || 0))
}

function formatDate(value: string): string {
  if (!value) {
    return "ยังไม่ได้กำหนด"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "ยังไม่ได้กำหนด"
  }

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 14, color: "#f9fafb", marginTop: 6, wordBreak: "break-word" }}>{value}</div>
    </div>
  )
}

function WebsiteCard({ website }: { website: string }) {
  const cleanWebsite = website?.trim() ?? ""

  if (!cleanWebsite) {
    return (
      <InfoCard
        label="เว็บไซต์"
        value="ยังไม่ได้ระบุเว็บไซต์"
      />
    )
  }

  const href =
    cleanWebsite.startsWith("http://") ||
      cleanWebsite.startsWith("https://")
      ? cleanWebsite
      : `https://${cleanWebsite}`

  return (
    <div
      style={{
        background: "#0d1117",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        เว็บไซต์
      </div>

      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "inline-block",
          fontSize: 14,
          color: "#4f8ef7",
          marginTop: 6,
          wordBreak: "break-word",
          textDecoration: "none",
        }}
      >
        {cleanWebsite}
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

function normalizeManager(
  member: MemberApiRow,
  index: number
): Manager {
  const name =
    member.name ??
    member.username ??
    "ผู้ดูแล"

  const colors = [
    "#4f8ef7",
    "#a78bfa",
    "#34d399",
    "#f59e0b",
  ]

  const avatar = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")


  return {
    id: Number(member.id),
    name,
    avatar: avatar || "U",
    color: colors[index % colors.length],
  }
}
