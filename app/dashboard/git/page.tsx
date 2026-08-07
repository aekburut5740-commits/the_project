"use client"

import React, { useEffect, useMemo, useState } from "react"
import { backend } from "@/lib/backend"
import { useTheme } from "@/lib/themeContext"
import { getUser } from "@/lib/auth"
import { Sun, Moon, Monitor, Smartphone, Tablet, ExternalLink, RotateCw, Copy, Check, Eye, EyeOff, Lock, Globe, Sparkles } from "lucide-react"

type CommitItem = {
  id: string
  message: string
  author: string
  date: string
  url: string
}


const dayLabels = ["S", "M", "T", "W", "T", "F", "S"]

function extractProjectRepo(p: any): string {
  if (!p) return ""
  const candidates = [p.domain, p.website, p.token]
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue
    const source = raw.trim()
    if (source.includes("github.com/")) {
      const parts = source.replace(/\.git$/, "").split("github.com/")
      if (parts[1]) return parts[1].trim()
    }
    if (source.includes("/") && !source.startsWith("http://") && !source.startsWith("https://")) {
      return source.trim()
    }
  }
  return ""
}

export default function GitPage() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === "light"

  const [isAdmin, setIsAdmin] = useState(false)
  const [commits, setCommits] = useState<CommitItem[]>([])
  const [selectedCommit, setSelectedCommit] = useState<CommitItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [repo, setRepo] = useState("")

  // Projects list for selector
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | string>("")
  const [copiedLink, setCopiedLink] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  // Guest share & view count state
  const [shareToken, setShareToken] = useState("")
  const [viewCount, setViewCount] = useState(0)
  const [onlyLatestForGuest, setOnlyLatestForGuest] = useState(false)
  const [linkDisabled, setLinkDisabled] = useState(false)
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop")

  const currentUser = getUser()
  const isGuestUser = !currentUser

  useEffect(() => {
    const user = getUser()
    setIsAdmin(user?.role === "admin")

    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        // 1. Fetch Real Projects from Backend
        const user = getUser()
        const adminRole = user?.role === "admin"
        const projData = (await backend.projects(adminRole)) as any[]
        let initialRepo = ""

        if (Array.isArray(projData) && projData.length > 0) {
          setProjects(projData)
          const firstProj = projData[0]
          setSelectedProjectId(firstProj.id)
          setShareToken(firstProj.share_token || `demo-${firstProj.id}`)
          setViewCount(firstProj.view_count || 0)

          initialRepo = extractProjectRepo(firstProj)
          const gitData = await backend.gitPulse(initialRepo, firstProj.token)
          if (gitData.commits && gitData.commits.length > 0) {
            setCommits(gitData.commits)
            setSelectedCommit(gitData.commits[0])
            setRepo(gitData.repo || initialRepo)
          } else {
            setCommits([])
            setSelectedCommit(null)
            setRepo(initialRepo)
            if (gitData.message) setError(gitData.message)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const selectedProject = useMemo(() => {
    if (!projects || projects.length === 0) return null
    return projects.find((p) => Number(p.id) === Number(selectedProjectId)) || projects[0]
  }, [projects, selectedProjectId])

  // Compute Active Preview URL based strictly on Selected Project + Selected Commit
  const activePreviewUrl = useMemo(() => {
    let base = selectedProject?.website || ""

    // ถ้าโปรเจคไม่ได้ระบุ website URL ไว้อย่างถูกต้อง ให้ Fallback เป็น Relative URL เพื่อป้องกัน Hydration Error
    if (!base || base === "https://example.com" || !base.startsWith("http")) {
      base = selectedProject?.id ? `/dashboard/projects/${selectedProject.id}` : "/dashboard/projects"
    }

    if (selectedCommit) {
      const commitHash = selectedCommit.id ? selectedCommit.id.substring(0, 7) : ""
      const hasQuery = base.includes("?")
      return `${base}${hasQuery ? "&" : "?"}v=${commitHash}`
    }
    return base
  }, [selectedProject, selectedCommit])

  const handleSelectProject = async (id: number) => {
    setSelectedProjectId(id)
    const p = projects.find((item) => item.id === id)
    if (p) {
      setShareToken(p.share_token || `demo-${p.id}`)
      setViewCount(p.view_count || 0)

      const targetRepo = extractProjectRepo(p)

      try {
        setLoading(true)
        setError(null)
        const gitData = await backend.gitPulse(targetRepo, p.token)
        if (gitData.commits && gitData.commits.length > 0) {
          setCommits(gitData.commits)
          setSelectedCommit(gitData.commits[0])
          setRepo(gitData.repo || targetRepo)
        } else {
          setCommits([])
          setSelectedCommit(null)
          setRepo(targetRepo)
          setError(gitData.message || "ไม่พบรายการ Commit ใน Repository นี้")
        }
      } catch (err) {
        console.error("Failed to fetch project repo commits:", err)
        setError(err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูล Commit ของโปรเจกต์นี้ได้")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleGenerateShareLink = async () => {
    // สำหรับ Local Environment: ดึง URL ของโปรเจกต์ที่เลือก หรือ fallback ไปที่หน้าโครงการภายในระบบทันที
    let targetLink = selectedProject?.website || ""
    if (!targetLink || targetLink === "https://example.com" || !targetLink.startsWith("http")) {
      targetLink = typeof window !== "undefined" ? `${window.location.origin}/dashboard/projects/${selectedProject?.id || ""}` : "/dashboard/projects"
    }

    try {
      await navigator.clipboard.writeText(targetLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch (err) {
      console.error("Clipboard copy failed:", err)
      alert(`Local Project Link:\n${targetLink}`)
    }
  }

  // Theme Styles Object + responsive flags
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const S = useMemo(() => getStyles(isLight, isMobile, isTablet), [isLight, isMobile, isTablet])

  // นับจำนวน commit จริงย้อนหลัง 7 วัน (จากชุด commit ล่าสุดที่ GitHub ส่งมา)
  const weeklyActivity = useMemo(() => {
    const days: { label: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const count = commits.filter((c) => {
        const cd = new Date(c.date)
        return cd.toDateString() === d.toDateString()
      }).length
      days.push({ label: dayLabels[d.getDay()], count })
    }
    return days
  }, [commits])

  const maxWeeklyCount = Math.max(1, ...weeklyActivity.map((d) => d.count))

  return (
    <div style={S.page}>
      {/* Top Bar Header */}
      <div style={S.hero}>
        <div>
          <div style={S.eyebrow}>Git Pulse & Interactive Live Preview</div>
          <h1 style={S.title}>GitHub Commits & Live Web Sandbox</h1>
          <p style={S.subtitle}>
            คลิกเลือก Commit ด้านซ้ายเพื่อดู Preview เวอร์ชันการอัปเดตของแต่ละ Commit ได้ทันที
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        </div>
      </div>

      {/* Control Bar: Project Selector, Admin Settings & Share Link */}
      <div style={S.controlBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>เลือกโปรเจกต์งาน:</label>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => handleSelectProject(Number(e.target.value))}
            style={{
              ...S.selectInput,
              width: isMobile ? "100%" : 200,
              maxWidth: isMobile ? "100%" : 280,
              fontWeight: 600,
              color: isLight ? "#0f172a" : "#ffffff",
              background: isLight ? "#f8fafc" : "#1f2937",
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} style={{ background: isLight ? "#ffffff" : "#1f2937", color: isLight ? "#0f172a" : "#ffffff" }}>
                {p.name} {p.domain ? `(${p.domain})` : ""}
              </option>
            ))}
          </select>

          {/* Visitor Stats Badge */}
          <div style={S.badgeInfo}>
            <Eye size={14} />
            <span>เข้าชมแล้ว {viewCount} ครั้ง</span>
          </div>

          {/* Admin Toggle: Lock Guest or Disable Link */}
          {isAdmin && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={S.adminToggleLabel} title="เมื่อเปิดใช้งาน ลูกค้า/Guest จะเห็นเฉพาะ Commit ล่าสุดเท่านั้น">
                <input
                  type="checkbox"
                  checked={onlyLatestForGuest}
                  onChange={(e) => setOnlyLatestForGuest(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <Lock size={13} className="text-amber-400" />
                <span>จำกัดให้ Guest ดูเฉพาะ Commit ล่าสุด</span>
              </label>

              <label style={S.adminToggleLabel} title="ปิดใช้งานลิงก์พรีวิวเพื่อไม่ให้ Guest เข้าดูได้">
                <input
                  type="checkbox"
                  checked={linkDisabled}
                  onChange={(e) => setLinkDisabled(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <EyeOff size={13} className="text-rose-400" />
                <span>ปิดกั้นลิงก์ Guest (Disable Link)</span>
              </label>
            </div>
          )}
        </div>

        {/* Guest Demo Share Link Button */}
        <button
          onClick={handleGenerateShareLink}
          disabled={linkDisabled}
          style={{
            ...S.shareBtn,
            width: isMobile ? "100%" : "auto",
            justifyContent: isMobile ? "center" : "flex-start",
            opacity: linkDisabled ? 0.5 : 1,
            cursor: linkDisabled ? "not-allowed" : "pointer",
            background: linkDisabled ? "#64748b" : S.shareBtn.background,
          }}
        >
          {linkDisabled ? <EyeOff size={16} /> : copiedLink ? <Check size={16} /> : <Copy size={16} />}
          <span>{linkDisabled ? "ลิงก์ถูกปิดกั้นอยู่" : copiedLink ? "คัดลอก Link แล้ว!" : "คัดลอก Guest Demo Link"}</span>
        </button>
      </div>

      {/* Main Split Grid Layout: Left Commits Selection, Right Live Interactive Sandbox */}
      <div style={S.mainGrid}>
        {/* Left Column: Interactive Commit Selection List */}
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div>
              <div style={S.panelTitle}>Commits Activity</div>
              <div style={S.panelSub}>คลิก Commit เพื่อพรีวิว UI ของเวอร์ชันนั้น</div>
            </div>
            {repo && <div style={S.repoTag}>{repo}</div>}
          </div>

          {loading ? (
            <div style={S.emptyState}>กำลังโหลดข้อมูล Commits...</div>
          ) : error ? (
            <div style={S.emptyState}>{error}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 580, overflowY: "auto", paddingRight: 4 }}>
              {commits.map((commit, idx) => {
                const isLatest = idx === 0
                const isSelected = selectedCommit?.id === commit.id
                const isDisabled = onlyLatestForGuest && !isLatest

                return (
                  <div
                    key={commit.id}
                    onClick={() => {
                      if (isDisabled) return
                      setSelectedCommit(commit)
                      setIframeKey((k) => k + 1) // Refresh iframe preview when commit changes
                    }}
                    style={{
                      ...S.commitRow,
                      borderColor: isSelected ? "#3b82f6" : isLight ? "#e2e8f0" : "#1f2937",
                      background: isSelected
                        ? isLight ? "#eff6ff" : "rgba(59, 130, 246, 0.15)"
                        : isLight ? "#ffffff" : "rgba(17, 24, 39, 0.8)",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.5 : 1,
                      boxShadow: isSelected ? "0 0 0 2px rgba(59, 130, 246, 0.4)" : "none",
                    }}
                  >
                    <div
                      style={{
                        ...S.avatar,
                        background: isSelected ? "#2563eb" : isLight ? "#cbd5e1" : "#374151",
                        color: isSelected ? "#ffffff" : isLight ? "#334155" : "#9ca3af",
                      }}
                    >
                      {commit.author.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ ...S.commitMessage, color: isSelected ? "#2563eb" : isLight ? "#0f172a" : "#f9fafb" }}>
                          {commit.message}
                        </div>
                        <div style={S.commitTime}>{new Date(commit.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                        <span style={S.commitMeta}>โดย {commit.author}</span>
                        {isLatest && (
                          <span style={S.latestBadge}>
                            <Sparkles size={10} /> ล่าสุด (Latest)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Claude-style UI Live Preview Panel */}
        <div style={{ ...S.panel, display: "flex", flexDirection: "column" }}>
          {/* Preview Toolbar */}
          <div style={S.previewToolbar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Live UI Preview</span>
              {selectedCommit && (
                <span style={S.commitVersionBadge}>
                  Commit: {selectedCommit.message} ({selectedCommit.id.substring(0, 7)})
                </span>
              )}
            </div>

            {/* Device Switcher Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <button
                onClick={() => setDevice("desktop")}
                style={{ ...S.deviceBtn, background: device === "desktop" ? (isLight ? "#e0e7ff" : "#374151") : "transparent" }}
                title="Desktop View"
              >
                <Monitor size={16} />
              </button>
              <button
                onClick={() => setDevice("tablet")}
                style={{ ...S.deviceBtn, background: device === "tablet" ? (isLight ? "#e0e7ff" : "#374151") : "transparent" }}
                title="Tablet View"
              >
                <Tablet size={16} />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                style={{ ...S.deviceBtn, background: device === "mobile" ? (isLight ? "#e0e7ff" : "#374151") : "transparent" }}
                title="Mobile View"
              >
                <Smartphone size={16} />
              </button>
              <button onClick={() => setIframeKey((k) => k + 1)} style={S.deviceBtn} title="รีเฟรช Preview">
                <RotateCw size={16} />
              </button>
              <a href={activePreviewUrl} target="_blank" rel="noreferrer" style={S.deviceBtn} title="เปิดในแท็บใหม่">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>

          {/* URL Address Bar Display */}
          <div style={S.addressBar}>
            <Globe size={13} className="text-slate-400" />
            <span style={{ fontSize: 12, color: isLight ? "#475569" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activePreviewUrl}
            </span>
          </div>

          {/* Commit Changes Summary Box */}
          {selectedCommit && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: isLight ? "#f8fafc" : "rgba(30, 41, 59, 0.8)",
                border: isLight ? "1px solid #e2e8f0" : "1px solid #334155",
                marginBottom: 12,
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, color: isLight ? "#0f172a" : "#38bdf8" }}>
                  📝 Commit Details: {selectedCommit.message}
                </span>
                <span style={{ color: isLight ? "#64748b" : "#94a3b8" }}>
                  {new Date(selectedCommit.date).toLocaleString("th-TH")}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, color: isLight ? "#475569" : "#cbd5e1", fontSize: 11 }}>
                <span>ผู้ทำการ Commit: <strong>{selectedCommit.author}</strong></span>
                <span>Commit SHA: <code>{selectedCommit.id.substring(0, 7)}</code></span>
                {(selectedCommit as any).additions !== undefined && (
                  <span style={{ color: "#34d399" }}>+{(selectedCommit as any).additions} additions</span>
                )}
                {(selectedCommit as any).deletions !== undefined && (
                  <span style={{ color: "#f87171" }}>-{(selectedCommit as any).deletions} deletions</span>
                )}
              </div>
            </div>
          )}

          {/* iFrame Interactive Web Container */}
          <div style={S.iframeViewport}>
            <div
              style={{
                width: "100%",
                maxWidth: device === "desktop" ? "100%" : device === "tablet" ? 768 : 375,
                height: "100%",
                transition: "all 0.3s ease",
                margin: "0 auto",
                borderRadius: device !== "desktop" ? "16px" : "0px",
                overflow: "hidden",
                border: device !== "desktop" ? (isLight ? "4px solid #cbd5e1" : "4px solid #334155") : "none",
                boxShadow: device !== "desktop" ? "0 20px 25px -5px rgba(0,0,0,0.3)" : "none",
              }}
            >
              <iframe
                key={iframeKey}
                src={activePreviewUrl}
                style={{ width: "100%", height: "100%", border: "none" }}
                title="Project Interactive Live Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStyles(isLight: boolean, isMobile = false, isTablet = false): Record<string, React.CSSProperties> {
  return {
    page: {
      minHeight: "100vh",
      background: isLight ? "#f8fafc" : "#0d1117",
      color: isLight ? "#0f172a" : "#e5e7eb",
      padding: isMobile ? "12px 12px" : "24px 28px",
      fontFamily: "'Inter', 'DM Sans', sans-serif",
      transition: "background 0.3s ease, color 0.3s ease",
    },
    hero: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "flex-start" : "center",
      gap: 16,
      padding: isMobile ? "16px" : "20px 24px",
      borderRadius: 16,
      background: isLight ? "#ffffff" : "linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(17, 24, 39, 0.95))",
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      marginBottom: 16,
      boxShadow: isLight ? "0 4px 12px rgba(0, 0, 0, 0.05)" : "0 12px 30px rgba(0, 0, 0, 0.2)",
    },
    eyebrow: { fontSize: 12, fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 },
    title: { margin: 0, fontSize: 24, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" },
    subtitle: { margin: "4px 0 0", color: isLight ? "#64748b" : "#9ca3af", fontSize: 13 },
    themeBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 999,
      background: isLight ? "#f1f5f9" : "#1f2937",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      color: isLight ? "#334155" : "#f3f4f6",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    controlBar: {
      display: "flex",
      flexDirection: isMobile ? "column" : "row",
      justifyContent: "space-between",
      alignItems: isMobile ? "stretch" : "center",
      padding: isMobile ? "12px" : "12px 18px",
      borderRadius: 14,
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      marginBottom: 16,
      flexWrap: "wrap",
      gap: 12,
    },
    selectInput: {
      padding: "6px 12px",
      borderRadius: 8,
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      background: isLight ? "#ffffff" : "#1f2937",
      color: isLight ? "#0f172a" : "#f9fafb",
      fontSize: 13,
      outline: "none",
    },
    badgeInfo: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 999,
      background: isLight ? "#eff6ff" : "rgba(59, 130, 246, 0.15)",
      color: "#3b82f6",
      fontSize: 12,
      fontWeight: 600,
    },
    adminToggleLabel: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 10px",
      borderRadius: 8,
      background: isLight ? "#fef3c7" : "rgba(245, 158, 11, 0.15)",
      color: isLight ? "#92400e" : "#fbbf24",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    shareBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 14px",
      borderRadius: 8,
      background: "#2563eb",
      color: "#ffffff",
      border: "none",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    mainGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "360px 1fr",
      gap: isMobile ? 12 : 16,
      alignItems: "stretch",
    },
    panel: {
      background: isLight ? "#ffffff" : "#111827",
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      borderRadius: 16,
      padding: isMobile ? 12 : 16,
      boxShadow: isLight ? "0 2px 8px rgba(0,0,0,0.04)" : "0 8px 20px rgba(0,0,0,0.18)",
    },
    panelHeader: { display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 8 : 0, marginBottom: 12 },
    panelTitle: { fontSize: 15, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" },
    panelSub: { fontSize: 12, color: isLight ? "#64748b" : "#6b7280" },
    repoTag: { fontSize: 11, padding: "4px 8px", borderRadius: 999, background: isLight ? "#dcfce7" : "rgba(52, 211, 153, 0.12)", color: isLight ? "#166534" : "#34d399", fontWeight: 700 },
    commitRow: {
      display: "flex",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      border: "1px solid",
      transition: "all 0.2s ease",
    },
    avatar: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 },
    commitMessage: { fontSize: 13, fontWeight: 600, wordBreak: "break-word" },
    commitTime: { fontSize: 11, color: isLight ? "#94a3b8" : "#6b7280" },
    commitMeta: { fontSize: 12, color: isLight ? "#64748b" : "#9ca3af" },
    latestBadge: { display: "flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 999, background: "rgba(16, 185, 129, 0.15)", color: "#10b981" },
    previewToolbar: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 10,
      borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      marginBottom: 10,
      flexWrap: "wrap",
      gap: 8,
    },
    commitVersionBadge: { fontSize: 12, color: "#3b82f6", background: isLight ? "#eff6ff" : "rgba(59, 130, 246, 0.15)", padding: "3px 10px", borderRadius: 999, fontWeight: 600 },
    addressBar: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "6px 12px",
      borderRadius: 8,
      background: isLight ? "#f1f5f9" : "#0f172a",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
      marginBottom: 12,
    },
    deviceBtn: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 32,
      height: 32,
      borderRadius: 6,
      border: "none",
      color: isLight ? "#475569" : "#9ca3af",
      cursor: "pointer",
    },
    iframeViewport: {
      flex: 1,
      minHeight: isMobile ? 260 : isTablet ? 340 : 520,
      background: isLight ? "#f1f5f9" : "#000000",
      borderRadius: isMobile ? 10 : 12,
      padding: isMobile ? 8 : 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    emptyState: { padding: "16px", color: isLight ? "#64748b" : "#9ca3af", fontSize: 13, textAlign: "center" },
  }
}
