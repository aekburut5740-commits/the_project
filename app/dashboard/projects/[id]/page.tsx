"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { backend, normalizeProject } from "@/lib/backend"
import { STATUS_CONFIG, type Manager, type Project } from "@/lib/mockData"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [projectData, memberData] = await Promise.all([
          backend.projectHealth(Number(id)),
          backend.projectMembers(Number(id)).catch(() => []),
        ])
        setProject(normalizeProject(projectData))
        setMembers(memberData.map(normalizeMember))
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดรายละเอียดโปรเจคได้")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return <div style={S.state}>กำลังโหลดรายละเอียดโปรเจค...</div>
  if (error || !project) return <div style={{ ...S.state, color: "#f87171" }}>{error || "ไม่พบโปรเจค"}</div>

  const status = STATUS_CONFIG[project.status] || { label: project.status, color: "#6b7280" }
  const managers = members.length > 0 ? members : project.managers

  return (
    <div style={S.page}>
      <Link href="/dashboard/projects" style={S.back}>← กลับไปหน้า Projects</Link>

      <div style={S.card}>
        <div style={S.heading}>
          <div><h1 style={S.title}>{project.name}</h1><p style={S.description}>{project.description || "ไม่มีรายละเอียด"}</p></div>
          <span style={{ ...S.statusBadge, color: status.color, borderColor: `${status.color}44`, background: `${status.color}22` }}>{status.label}</span>
        </div>

        <div style={S.infoGrid}>
          <InfoCard label="เว็บไซต์" value={project.website || project.domain || "-"} />
          <InfoCard label="ความคืบหน้า" value={`${project.progress}%`} />
          <InfoCard label="แพ็กเกจ" value={project.package || "-"} />
          <InfoCard label="วันที่เริ่ม" value={formatDate(project.startDate)} />
        </div>

        <div style={S.progressBox}>
          <div style={S.progressHeader}><span>ความคืบหน้าโครงการ</span><strong>{project.progress}%</strong></div>
          <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${project.progress}%`, background: status.color }} /></div>
          <div style={S.progressStatus}>สถานะ: {status.label}</div>
        </div>

        <div style={S.bottomGrid}>
          <div style={S.dataGrid}>
            <InfoCard label="Domain" value={project.domain || "-"} />
            <InfoCard label="Token" value={project.token || "-"} />
            <InfoCard label="Owner ID" value={String(project.ownerId)} />
          </div>
          <div style={S.managerBox}>
            <div style={S.infoLabel}>ผู้จัดการและดูแล</div>
            <div style={S.managerList}>
              {managers.length > 0 ? managers.map((manager) => (
                <div key={manager.id} style={S.managerRow}>
                  <div style={{ ...S.avatar, background: `${manager.color}22`, color: manager.color, borderColor: `${manager.color}44` }}>{manager.avatar}</div>
                  <div><div style={S.managerName}>{manager.name}</div><div style={S.managerRole}>ผู้ดูแลโปรเจกต์</div></div>
                </div>
              )) : <div style={S.managerRole}>ยังไม่มีผู้จัดการที่กำกับดูแล</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function normalizeMember(member: any, index: number): Manager {
  const name = member.name ?? member.username ?? "ผู้ดูแล"
  const colors = ["#4f8ef7", "#a78bfa", "#34d399", "#f59e0b"]
  return { id: Number(member.id), name, avatar: name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(), color: colors[index % colors.length] }
}
function formatDate(value: string) { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) }
function InfoCard({ label, value }: { label: string; value: string }) { return <div style={S.infoCard}><div style={S.infoLabel}>{label}</div><div style={S.infoValue}>{value}</div></div> }

const S: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#0d1117", color: "#e5e7eb", padding: "28px 32px" }, state: { minHeight: "100vh", background: "#0d1117", color: "#9ca3af", padding: 32 }, back: { color: "#4f8ef7", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-block", marginBottom: 20 },
  card: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 18 }, heading: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }, title: { margin: 0, fontSize: 24, color: "#f9fafb" }, description: { margin: "6px 0 0", color: "#9ca3af", fontSize: 14 }, statusBadge: { padding: "6px 10px", borderRadius: 999, border: "1px solid", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }, infoCard: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }, infoLabel: { fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, infoValue: { fontSize: 14, color: "#f9fafb", marginTop: 6, wordBreak: "break-word" },
  progressBox: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "16px 18px" }, progressHeader: { display: "flex", justifyContent: "space-between", color: "#9ca3af", fontSize: 12, marginBottom: 10 }, progressTrack: { height: 10, borderRadius: 999, background: "#1f2937", overflow: "hidden" }, progressFill: { height: "100%", borderRadius: 999 }, progressStatus: { marginTop: 8, fontSize: 13, color: "#9ca3af" },
  bottomGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }, dataGrid: { display: "grid", gap: 14 }, managerBox: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }, managerList: { marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }, managerRow: { display: "flex", alignItems: "center", gap: 10 }, avatar: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, border: "1px solid" }, managerName: { fontSize: 13, color: "#f9fafb", fontWeight: 600 }, managerRole: { fontSize: 12, color: "#9ca3af" },
}
