"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { STATUS_CONFIG, type Project } from "@/lib/mockData"
import { backend, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const [project, setProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const user = getUser()
        const rows = await backend.projects(user?.role === "admin")
        const found = (Array.isArray(rows) ? rows : []).map(normalizeProject).find((item) => item.id === id)
        if (!found) throw new Error("ไม่พบโปรเจค")
        found.website = found.website || found.domain || ""
        try {
          const members = await backend.projectMembers(id)
          found.managers = (Array.isArray(members) ? members : []).map((m: any) => ({ id: Number(m.id), name: m.name, avatar: String(m.name || "?").slice(0, 2).toUpperCase(), color: "#4f8ef7" }))
        } catch { found.managers = [] }
        setProject(found as Project)
      } catch (err) { setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ") }
    }
    if (Number.isFinite(id)) void load()
  }, [id])

  if (error) return <main style={S.page}><p style={{ color: "#f87171" }}>{error}</p><Link href="/dashboard/projects" style={S.back}>← กลับไป Projects</Link></main>
  if (!project) return <main style={S.page}><p style={S.muted}>กำลังโหลดข้อมูล...</p></main>

  const config = STATUS_CONFIG[project.status]
  return (
    <main style={S.page}>
      <Link href="/dashboard/projects" style={S.back}>← กลับไป Projects</Link>
      <section style={S.card}>
        <div style={S.header}>
          <div><h1 style={S.title}>{project.name}</h1><p style={S.muted}>{project.description || "ไม่มีคำอธิบาย"}</p></div>
          <span style={{ ...S.badge, color: config.color, borderColor: `${config.color}55`, background: `${config.color}18` }}>{config.label}</span>
        </div>
        <div style={S.grid}>
          <Info label="เว็บไซต์" value={project.website || "-"} />
          <Info label="Domain" value={project.domain || "-"} />
          <Info label="Package" value={project.package || "-"} />
          <Info label="วันที่เริ่ม" value={project.startDate ? new Date(project.startDate).toLocaleDateString("th-TH") : "-"} />
        </div>
        <div><div style={S.progressHead}><span>ความคืบหน้า</span><b>{project.progress}%</b></div><div style={S.track}><div style={{ ...S.fill, width: `${project.progress}%`, background: config.color }} /></div></div>
        <div><h2 style={S.sectionTitle}>ผู้ดูแลโปรเจค</h2>{project.managers.length ? project.managers.map((m) => <div key={m.id} style={S.manager}>{m.name}</div>) : <p style={S.muted}>ยังไม่มีผู้ดูแลโปรเจค</p>}</div>
      </section>
    </main>
  )
}

function Info({ label, value }: { label: string; value: string }) { return <div style={S.info}><span style={S.infoLabel}>{label}</span><span>{value}</span></div> }
const S: Record<string, React.CSSProperties> = { page:{minHeight:"100vh",background:"#0d1117",color:"#e5e7eb",padding:"28px 32px"},back:{color:"#93c5fd",textDecoration:"none",display:"inline-block",marginBottom:18},card:{background:"#111827",border:"1px solid #1f2937",borderRadius:16,padding:24,maxWidth:900},header:{display:"flex",justifyContent:"space-between",gap:20},title:{margin:0,color:"#f9fafb"},muted:{color:"#6b7280"},badge:{border:"1px solid",borderRadius:999,padding:"6px 12px",height:"fit-content"},grid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,margin:"24px 0"},info:{background:"#0d1117",border:"1px solid #1f2937",borderRadius:10,padding:14,display:"flex",flexDirection:"column",gap:5},infoLabel:{fontSize:11,color:"#6b7280"},progressHead:{display:"flex",justifyContent:"space-between",marginBottom:8},track:{height:8,background:"#1f2937",borderRadius:999,overflow:"hidden"},fill:{height:"100%",borderRadius:999},sectionTitle:{fontSize:15,marginTop:24},manager:{display:"inline-block",background:"#1f2937",borderRadius:999,padding:"6px 12px",marginRight:8,fontSize:13} }
