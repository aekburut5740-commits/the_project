"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { backend, normalizeProject } from "@/lib/backend"
import { STATUS_CONFIG, type Project } from "@/lib/mockData"

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    backend.projectHealth(Number(id)).then((data) => setProject(normalizeProject(data))).catch((err) => setError(err instanceof Error ? err.message : "ไม่สามารถโหลดโปรเจคได้"))
  }, [id])

  if (error) return <div style={{ minHeight: "100vh", background: "#0b1220", color: "#f87171", padding: 32 }}>{error}</div>
  if (!project) return <div style={{ minHeight: "100vh", background: "#0b1220", color: "#9ca3af", padding: 32 }}>กำลังโหลดโปรเจค...</div>
  const status = STATUS_CONFIG[project.status] || { label: project.status, color: "#6b7280" }

  return (
    <div style={{ minHeight: "100vh", background: "#0b1220", color: "#e5e7eb", padding: 32 }}>
      <Link href="/dashboard/projects" style={{ color: "#4f8ef7", textDecoration: "none" }}>← กลับไปหน้า Projects</Link>
      <div style={{ maxWidth: 900, marginTop: 24, background: "#111827", border: "1px solid #1f2937", borderRadius: 20, padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div><h1 style={{ margin: 0 }}>{project.name}</h1><p style={{ color: "#9ca3af" }}>{project.description || "ไม่มีรายละเอียด"}</p></div>
          <span style={{ color: status.color, border: `1px solid ${status.color}55`, borderRadius: 999, padding: "8px 14px", height: "fit-content" }}>{status.label}</span>
        </div>
        <div style={{ marginTop: 24 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span>Progress</span><span>{project.progress}%</span></div><div style={{ height: 10, background: "#1f2937", borderRadius: 99 }}><div style={{ width: `${project.progress}%`, height: "100%", background: status.color, borderRadius: 99 }} /></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 28 }}>
          <InfoCard label="Domain" value={project.domain || project.website || "—"} />
          <InfoCard label="Package" value={project.package || "—"} />
          <InfoCard label="Start date" value={project.startDate || "—"} />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return <div style={{ background: "#0f172a", border: "1px solid #1f2937", borderRadius: 14, padding: 16 }}><div style={{ color: "#6b7280", fontSize: 12 }}>{label}</div><div style={{ marginTop: 6 }}>{value}</div></div>
}
