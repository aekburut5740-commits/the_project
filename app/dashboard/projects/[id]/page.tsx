import Link from "next/link"
import { notFound } from "next/navigation"
import { MOCK_PROJECTS, STATUS_CONFIG } from "@/lib/mockData"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const project = MOCK_PROJECTS.find((item) => item.id === Number(id))

  if (!project) {
    notFound()
  }

  const { color, label } = STATUS_CONFIG[project.status]

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e5e7eb", padding: "28px 32px" }}>
      <Link href="/dashboard/projects" style={{ color: "#4f8ef7", textDecoration: "none", fontSize: 14, fontWeight: 600, display: "inline-block", marginBottom: 20 }}>
        ← กลับไปหน้าผลิตภัณฑ์
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
          <InfoCard label="เว็บไซต์" value={project.website} />
          <InfoCard label="ความคืบหน้า" value={`${project.progress}%`} />
          <InfoCard label="แพ็กเกจ" value={project.package} />
          <InfoCard label="วันที่เริ่ม" value={new Date(project.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })} />
        </div>

        <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ความคืบหน้าโครงการ
            </div>
            <div style={{ fontSize: 14, color: "#f9fafb", fontWeight: 700 }}>{project.progress}%</div>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "#1f2937", overflow: "hidden" }}>
            <div style={{ width: `${project.progress}%`, height: "100%", borderRadius: 999, background: color, transition: "width 0.3s ease" }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: "#9ca3af" }}>สถานะ: {label}</div>
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 14, color: "#f9fafb", marginTop: 6, wordBreak: "break-word" }}>{value}</div>
    </div>
  )
}
