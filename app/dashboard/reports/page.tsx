"use client"

import React, { useEffect, useState } from "react"
import { getUser } from "@/lib/auth"
import { backend, normalizeProject } from "@/lib/backend"
import type { Project } from "@/lib/mockData"

const REPORT_TYPES = [
  {
    title: "Weekly Progress Report",
    description: "สรุปความคืบหน้าตามสัปดาห์เพื่อดูแนวโน้มและปัญหา",
    metric: "65% avg",
    color: "#4f8ef7",
  },
  {
    title: "Milestone Report",
    description: "ติดตาม milestone ที่ใกล้ถึงและที่เลยกำหนด",
    metric: "4 items",
    color: "#fbbf24",
  },
  {
    title: "Client Feedback Summary",
    description: "สรุปคำติชมและปัญหาจากลูกค้าเพื่อจัดลำดับงาน",
    metric: "3 issues",
    color: "#34d399",
  },
]

const RECENT_REPORTS = [
  { name: "Progress Report - May 2025", project: "BrandCo Redesign", date: "31 May 2025", status: "Ready" },
  { name: "Milestone Review", project: "ShopNow E-Commerce", date: "28 May 2025", status: "Pending" },
  { name: "Client Feedback Summary", project: "MediCare Portal", date: "25 May 2025", status: "Ready" },
]

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 32px",
    background: "#0b1220",
    color: "#e5e7eb",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  titleGroup: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  title: { fontSize: 30, fontWeight: 800, color: "#f9fafb", margin: 0, letterSpacing: "-0.03em" },
  subtitle: { fontSize: 14, color: "#9ca3af", margin: "0px 0px 20px 0px", maxWidth: 620, lineHeight: 1.7 },
  badge: { fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "8px 14px", border: "1px solid transparent" },
  summaryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 24 },
  statCard: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 20,
    minHeight: 110,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "space-between",
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.18)",
  },
  statTitle: { fontSize: 13, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 },
  statValue: { fontSize: 32, fontWeight: 800, color: "#f9fafb", letterSpacing: "-0.02em" },
  sectionGrid: { display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 16, alignItems: "start", width: "100%" },
  card: {
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
    margin: "20px 0px 0px 0px",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#f9fafb", marginBottom: 18 },
  reportItem: {
    background: "#0f172a",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    flexDirection: "column" as const,
    gap: 10,
  },
  reportLabel: { fontSize: 15, fontWeight: 700, color: "#f9fafb" },
  reportMeta: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" as const },
  reportMetaText: { fontSize: 13, color: "#9ca3af" },
  summaryText: { fontSize: 13, color: "#cbd5e1", lineHeight: 1.8 },
  actionCard: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 },
  actionItem: {
    background: "#0f172a",
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: 16,
  },
  actionTitle: { fontSize: 14, fontWeight: 700, color: "#f9fafb", marginBottom: 6 },
  actionText: { fontSize: 13, color: "#9ca3af", lineHeight: 1.6 },
}

function ReportsPage() {
  const [printOrientation, setPrintOrientation] = useState<"portrait" | "landscape">("portrait")
  const user = getUser()
  const isAdmin = user?.role === "admin"
  const [projects, setProjects] = useState<Project[]>([])
  const [milestones, setMilestones] = useState<any[]>([])
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [error, setError] = useState("")

  useEffect(() => { backend.reports(isAdmin).then((data: any) => { setProjects((data.projects || []).map(normalizeProject)); setMilestones(data.milestones || []); setFeedbacks(data.feedbacks || []) }).catch((err) => setError(err instanceof Error ? err.message : "โหลดรายงานไม่สำเร็จ")) }, [isAdmin])
  const totalProjects = projects.length
  const completedProjects = projects.filter((project) => project.status === "completed").length
  const overdueMilestones = milestones.filter((milestone) => milestone.status === "overdue").length
  const avgProgress = totalProjects
    ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / totalProjects)
    : 0

  function handlePrint(orientation: "portrait" | "landscape") {
    setPrintOrientation(orientation)
    window.setTimeout(() => window.print(), 100)
  }

  return (
    <div style={styles.page} className={`report-print-wrapper print-${printOrientation}`}>
      {error && <div style={{ color: "#f87171" }}>{error}</div>}
      <style>{`
        @page { size: A4 ${printOrientation}; margin: 16mm; }
        @media print {
          .no-print { display: none !important; }
          .screen-only { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; color: #111 !important; }
          .report-print-wrapper { background: white !important; color: #111 !important; padding: 0 !important; }
          .report-print-wrapper * { box-shadow: none !important; }
          .report-print-wrapper .print-only * {
            background: transparent !important;
            color: #111 !important;
          }
          .report-print-wrapper .print-only .statCard,
          .report-print-wrapper .print-only .card,
          .report-print-wrapper .print-only .reportItem {
            background: #fff !important;
            border-color: #d1d5db !important;
          }
        }
      `}</style>

      <div className="print-only" style={{ display: "none", padding: "0 0 24px" }}>
        <div style={{ borderBottom: "1px solid #d1d5db", paddingBottom: 16, marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Project Report Summary</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#4b5563" }}>
            สรุปภาพรวมโปรเจกต์ ณ {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 20 }}>
          <div className="statCard" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>โปรเจกต์ทั้งหมด</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>{totalProjects}</div>
          </div>
          <div className="statCard" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>ความคืบหน้าเฉลี่ย</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>{avgProgress}%</div>
          </div>
          <div className="statCard" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>Milestone เลยกำหนด</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>{overdueMilestones}</div>
          </div>
          <div className="statCard" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 12 }}>โปรเจกต์สำเร็จ</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#111" }}>{completedProjects}</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>รายงานล่าสุด</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #d1d5db" }}>ชื่อรายงาน</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #d1d5db" }}>โปรเจกต์</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #d1d5db" }}>วันที่</th>
                <th style={{ textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #d1d5db" }}>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {RECENT_REPORTS.map((report) => (
                <tr key={report.name}>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>{report.name}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>{report.project}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>{report.date}</td>
                  <td style={{ padding: "10px 12px", borderBottom: "1px solid #e5e7eb" }}>{report.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="screen-only">
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <h1 style={styles.title}>Reports</h1>
            <p style={styles.subtitle}>
              {isAdmin
                ? "แดชบอร์ดรายงานสำหรับทีมและผู้ดูแลระบบ เพื่อดูสถานะโปรเจกต์และ milestone ทุกโปรเจกต์"
                : "สรุปรายงานโปรเจกต์ของคุณในมุมมองเดียว ทั้งความคืบหน้า milestone และ feedback ที่สำคัญ"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }} className="no-print">
            <button
              type="button"
              onClick={() => handlePrint("portrait")}
              style={{
                borderRadius: 999,
                border: printOrientation === "portrait" ? "1px solid #4f8ef7" : "1px solid #374151",
                background: printOrientation === "portrait" ? "#1d4ed8" : "#111827",
                color: "#fff",
                padding: "10px 16px",
                cursor: "pointer",
              }}
            >
              Print Portrait
            </button>
            <button
              type="button"
              onClick={() => handlePrint("landscape")}
              style={{
                borderRadius: 999,
                border: printOrientation === "landscape" ? "1px solid #4f8ef7" : "1px solid #374151",
                background: printOrientation === "landscape" ? "#1d4ed8" : "#111827",
                color: "#fff",
                padding: "10px 16px",
                cursor: "pointer",
              }}
            >
              Print Landscape
            </button>
          </div>
        </div>

        <div style={styles.summaryGrid}>
          <div style={{ ...styles.statCard, borderTop: "4px solid #4f8ef7" }}>
            <div style={styles.statTitle}>โปรเจกต์ทั้งหมด</div>
            <div style={styles.statValue}>{totalProjects}</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: "4px solid #a78bfa" }}>
            <div style={styles.statTitle}>ความคืบหน้าเฉลี่ย</div>
            <div style={styles.statValue}>{avgProgress}%</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: "4px solid #fbbf24" }}>
            <div style={styles.statTitle}>Milestone เลยกำหนด</div>
            <div style={styles.statValue}>{overdueMilestones}</div>
          </div>
          <div style={{ ...styles.statCard, borderTop: "4px solid #34d399" }}>
            <div style={styles.statTitle}>โปรเจกต์สำเร็จ</div>
            <div style={styles.statValue}>{completedProjects}</div>
          </div>
        </div>

        <div style={styles.sectionGrid}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>ประเภทรายงานที่ควรใช้</div>
            <div style={{ display: "grid", gap: 12 }}>
              {REPORT_TYPES.map((item) => (
                <div key={item.title} style={{ ...styles.reportItem, borderLeft: `4px solid ${item.color}` }}>
                  <div style={styles.reportMeta}>
                    <div style={styles.reportLabel}>{item.title}</div>
                    <span style={{ ...styles.badge, background: `${item.color}22`, color: item.color, borderColor: `${item.color}44` }}>
                      {item.metric}
                    </span>
                  </div>
                  <div style={{ color: "#cbd5e1", fontSize: 13 }}>{item.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.cardTitle}>สรุปรายงานล่าสุด</div>
            <div style={{ display: "grid", gap: 10 }}>
              {RECENT_REPORTS.map((report) => (
                <div key={report.name} style={{ ...styles.reportItem, borderColor: "#1f2937" }}>
                  <div style={styles.reportMeta}>
                    <div style={styles.reportLabel}>{report.name}</div>
                    <span
                      style={{
                        ...styles.badge,
                        background: report.status === "Ready" ? "#34d39922" : "#fbbf2422",
                        color: report.status === "Ready" ? "#34d399" : "#fbbf24",
                        borderColor: report.status === "Ready" ? "#34d39944" : "#fbbf2444",
                      }}
                    >
                      {report.status}
                    </span>
                  </div>
                  <div style={styles.reportMeta}>
                    <span style={styles.reportMetaText}>{report.project}</span>
                    <span style={styles.reportMetaText}>{report.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsPage
