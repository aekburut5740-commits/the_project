"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { backend } from "@/lib/backend"
import { Eye, ExternalLink, RotateCw, Smartphone, Tablet, Monitor, Sparkles, Globe } from "lucide-react"

export default function GuestPreviewPage() {
  const params = useParams()
  const token = (params?.token as string) || ""

  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [commits, setCommits] = useState<any[]>([])
  const [selectedCommit, setSelectedCommit] = useState<any>(null)

  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [iframeKey, setIframeKey] = useState(0)

  useEffect(() => {
    async function loadGuestPreview() {
      try {
        setLoading(true)
        // 1. Fetch Project Details by Share Token
        try {
          const data = await backend.guestPreview(token)
          if (data && (data.project || data.id)) {
            setProject(data.project || data)
          } else {
            throw new Error("ไม่พบโปรเจคในระบบ")
          }
        } catch {
          // If token is fallback demo format (e.g. demo-1) or backend guest API not available, construct demo project
          const projIdMatch = token.match(/\d+/)
          const projId = projIdMatch ? projIdMatch[0] : "1"
          setProject({
            id: Number(projId),
            name: `Project Demo #${projId}`,
            domain: "http://localhost:3000/dashboard/projects",
            view_count: 1,
          })
        }

        // 2. Fetch Recent Commits
        try {
          const gitData = await backend.gitPulse()
          if (gitData && gitData.commits && gitData.commits.length > 0) {
            setCommits(gitData.commits)
            setSelectedCommit(gitData.commits[0]) // Default select latest commit
          }
        } catch {
          // Fallback demo commit
          setCommits([
            { id: "661a4d4", message: "fix maybe all?", author: "jeans", date: new Date().toISOString() }
          ])
        }
      } catch (err: any) {
        setError(err.message || "ไม่สามารถโหลดข้อมูลพรีวิวได้")
      } finally {
        setLoading(false)
      }
    }

    if (token) loadGuestPreview()
  }, [token])

  const basePreviewUrl = project?.domain || project?.website || "http://localhost:3000"
  
  const activePreviewUrl = selectedCommit 
    ? (basePreviewUrl.startsWith("http") ? `${basePreviewUrl}?commit=${selectedCommit.id.substring(0, 7)}` : `https://${basePreviewUrl}?commit=${selectedCommit.id.substring(0, 7)}`)
    : (basePreviewUrl.startsWith("http") ? basePreviewUrl : `https://${basePreviewUrl}`)

  useEffect(() => {
    if (project && !loading) {
      let targetUrl = project?.domain || project?.website || ""
      if (!targetUrl || targetUrl === "https://example.com" || targetUrl === "http://localhost:3000") {
        targetUrl = "/dashboard/projects"
      } else if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://") && !targetUrl.startsWith("/")) {
        targetUrl = `https://${targetUrl}`
      }
      window.location.replace(targetUrl)
    }
  }, [project, loading])

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>กำลังโหลดข้อมูล Demo Preview...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#1e293b", padding: 32, borderRadius: 16, textAlign: "center", maxWidth: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#f87171" }}>ไม่พบหน้า Demo Preview</h2>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>{error || "Share Link ไม่ถูกต้องหรือถูกยกเลิกแล้ว"}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#f8fafc", fontFamily: "'Inter', sans-serif" }}>
      {/* Top Header Bar for Guest */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", background: "#1e293b", borderBottom: "1px solid #334155" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Client Demo Preview</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{project.name}</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#94a3b8", background: "#0f172a", padding: "6px 12px", borderRadius: 999 }}>
            <Eye size={14} className="text-sky-400" />
            <span>เข้าดูแล้ว {project.view_count || 1} ครั้ง</span>
          </div>

          <a href={activePreviewUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#0284c7", color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            <span>เปิดหน้าเว็บจริง</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* Main Grid: Left Git Pulse, Right Live UI Interactive Sandbox */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, padding: 20, minHeight: "calc(100vh - 80px)" }}>
        {/* Left Side: Interactive Commit Selection for Guest */}
        <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>เลือก Commit ที่ต้องการดู UI</h3>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>คลิกเพื่อสลับพรีวิวเวอร์ชันการอัปเดต</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: "65vh" }}>
            {commits.map((c, idx) => {
              const isSelected = selectedCommit?.id === c.id
              const isLatest = idx === 0

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCommit(c)
                    setIframeKey((k) => k + 1)
                  }}
                  style={{
                    padding: "10px 12px",
                    background: isSelected ? "rgba(56, 189, 248, 0.15)" : "#0f172a",
                    borderRadius: 10,
                    border: isSelected ? "1px solid #38bdf8" : "1px solid #334155",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: isSelected ? "#38bdf8" : "#94a3b8" }}>{c.author}</span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{new Date(c.date).toLocaleDateString("th-TH")}</span>
                  </div>
                  <div style={{ fontSize: 13, color: isSelected ? "#38bdf8" : "#e2e8f0", fontWeight: 600 }}>{c.message}</div>
                  {isLatest && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 10, color: "#34d399", fontWeight: 700 }}>
                      <Sparkles size={10} /> เวอร์ชันล่าสุด (Latest)
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side: Interactive Web Viewport */}
        <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", padding: 18, display: "flex", flexDirection: "column" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid #334155" }}>
            <div style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span>Live UI Preview</span>
              {selectedCommit && (
                <span style={{ fontSize: 12, color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: 999 }}>
                  Commit: {selectedCommit.message}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setDevice("desktop")} style={{ padding: 6, borderRadius: 6, border: "none", background: device === "desktop" ? "#334155" : "transparent", color: "#fff", cursor: "pointer" }} title="Desktop View">
                <Monitor size={16} />
              </button>
              <button onClick={() => setDevice("tablet")} style={{ padding: 6, borderRadius: 6, border: "none", background: device === "tablet" ? "#334155" : "transparent", color: "#fff", cursor: "pointer" }} title="Tablet View">
                <Tablet size={16} />
              </button>
              <button onClick={() => setDevice("mobile")} style={{ padding: 6, borderRadius: 6, border: "none", background: device === "mobile" ? "#334155" : "transparent", color: "#fff", cursor: "pointer" }} title="Mobile View">
                <Smartphone size={16} />
              </button>
              <button onClick={() => setIframeKey((k) => k + 1)} style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }} title="รีเฟรช">
                <RotateCw size={16} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 8, background: "#0f172a", border: "1px solid #334155", marginBottom: 12 }}>
            <Globe size={13} className="text-slate-400" />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{activePreviewUrl}</span>
          </div>

          {/* Web Frame */}
          <div style={{ flex: 1, minHeight: 520, background: "#020617", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: device === "mobile" ? "375px" : device === "tablet" ? "768px" : "100%",
                height: "100%",
                transition: "all 0.3s ease",
                margin: "0 auto",
                borderRadius: device !== "desktop" ? "16px" : "0px",
                overflow: "hidden",
                border: device !== "desktop" ? "4px solid #334155" : "none",
              }}
            >
              <iframe
                key={iframeKey}
                src={activePreviewUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Guest Live Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
