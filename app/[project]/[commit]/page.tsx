"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { backend } from "@/lib/backend"
import { API_URL } from "@/lib/api"
import { MessageSquare, Send, X } from "lucide-react"

export default function ProjectCommitPreviewPage() {
  const params = useParams()
  const projectName = decodeURIComponent((params?.project as string) || "")
  const requestedCommit = decodeURIComponent((params?.commit as string) || "latest")

  const [project, setProject] = useState<any>(null)
  const [deployStatus, setDeployStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showFeedback, setShowFeedback] = useState(false)
  const [fbName, setFbName] = useState("")
  const [fbEmail, setFbEmail] = useState("")
  const [fbTitle, setFbTitle] = useState("")
  const [fbMessage, setFbMessage] = useState("")
  const [fbPriority, setFbPriority] = useState<"low" | "medium" | "high">("medium")
  const [fbSending, setFbSending] = useState(false)
  const [fbError, setFbError] = useState("")
  const [fbSuccess, setFbSuccess] = useState("")

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true)
        const data = await backend.guestProject(projectName)
        if (data && (data.project || data.id)) {
          setProject(data.project || data)
        } else {
          throw new Error("ไม่พบโปรเจคในระบบ")
        }
        try {
          const ds = await backend.guestDeployStatus(projectName)
          setDeployStatus(ds || null)
        } catch {
          setDeployStatus(null)
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลได้")
      } finally {
        setLoading(false)
      }
    }

    if (projectName) loadPreview()
  }, [projectName])

  const isLatest = requestedCommit === "latest"
  const targetCommit = isLatest ? deployStatus?.commit : requestedCommit
  const commitIsBuilt = Array.isArray(deployStatus?.commits)
    ? deployStatus.commits.includes(targetCommit)
    : false

  // latest → /work/{name}/ (handler resolve commit ล่าสุดเอง, รองรับทั้งแบบเก่า-ใหม่)
  // เฉพาะ commit → /work/{name}/{commit}/ (ต้องถูก build แล้ว)
  const workUrl = deployStatus?.state === "ready" && (isLatest || commitIsBuilt)
    ? `${API_URL}/work/${encodeURIComponent(projectName)}/${isLatest ? "" : encodeURIComponent(targetCommit) + "/"}`
    : null

  const websiteUrl = project?.website?.startsWith("http")
    ? project.website
    : null

  const previewUrl = workUrl || (isLatest ? websiteUrl : null)

  const commitNotBuilt = !isLatest && deployStatus?.state === "ready" && !commitIsBuilt

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault()
    setFbError("")
    setFbSuccess("")

    const title = fbTitle.trim()
    const message = fbMessage.trim()
    if (!title || !message) {
      setFbError("กรุณากรอกหัวข้อและรายละเอียด")
      return
    }

    setFbSending(true)
    try {
      await backend.guestFeedback({
        token: String(project?.id || ""),
        title,
        message,
        priority: fbPriority,
        guest_name: fbName.trim(),
        guest_email: fbEmail.trim(),
      })
      setFbSuccess("ส่ง Feedback เรียบร้อยแล้ว ขอบคุณครับ")
      setFbTitle("")
      setFbMessage("")
      setFbPriority("medium")
    } catch (err: unknown) {
      setFbError(err instanceof Error ? err.message : "ส่ง Feedback ไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setFbSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>กำลังโหลด...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#1e293b", padding: 32, borderRadius: 16, textAlign: "center", maxWidth: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#f87171" }}>ไม่พบหน้าโปรเจค</h2>
          <p style={{ fontSize: 14, color: "#94a3b8" }}>{error || "ชื่อโปรเจคไม่ถูกต้องหรือถูกยกเลิกแล้ว"}</p>
        </div>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#1e293b", padding: 32, borderRadius: 16, textAlign: "center", maxWidth: 440 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🚧</div>
          {commitNotBuilt ? (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>ยังไม่ได้ Build Commit นี้</h2>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                Commit <strong style={{ color: "#f8fafc" }}>{requestedCommit}</strong> ของ{" "}
                <strong style={{ color: "#f8fafc" }}>{project.name}</strong> ยังไม่ได้ถูก Build
                กรุณาเข้าไปกด Deploy commit นี้ในหน้า Git ของ Admin ก่อนเข้าชม
              </p>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>โปรเจคนี้ยังไม่ได้เปิดขึ้น server</h2>
              <p style={{ fontSize: 14, color: "#94a3b8", margin: 0 }}>
                งานของ <strong style={{ color: "#f8fafc" }}>{project.name}</strong> ยังอยู่ระหว่างการพัฒนา
                {deployStatus?.state === "building" ? " — กำลัง Build งานอยู่ กรุณารอสักครู่" : " เมื่อเสร็จแล้วจะสามารถเข้าชมได้จากลิงก์นี้"}
              </p>
            </>
          )}
          <button
            onClick={() => {
              setFbError("")
              setFbSuccess("")
              setShowFeedback(true)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              margin: "20px auto 0",
              padding: "10px 18px",
              borderRadius: 999,
              background: "#16a34a",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            <MessageSquare size={15} />
            <span>ส่ง Feedback ถึงทีมงาน</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a" }}>
      {/* เว็บของโปรเจคแบบเต็มจอ */}
      <iframe
        src={previewUrl}
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: "none" }}
        title={project.name}
      />

      {/* ปุ่มส่ง Feedback ลอยมุมขวาล่าง */}
      <button
        onClick={() => {
          setFbError("")
          setFbSuccess("")
          setShowFeedback(true)
        }}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 18px",
          borderRadius: 999,
          background: "#16a34a",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.35)",
        }}
      >
        <MessageSquare size={16} />
        <span>ส่ง Feedback</span>
      </button>

      {/* Feedback Modal */}
      {showFeedback && (
        <div
          onClick={() => setShowFeedback(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(2, 6, 23, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 440, background: "#1e293b", border: "1px solid #334155", borderRadius: 16, padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <MessageSquare size={18} className="text-emerald-400" />
                ส่ง Feedback
              </h3>
              <button onClick={() => setShowFeedback(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }} aria-label="ปิด">
                <X size={18} />
              </button>
            </div>

            {fbSuccess ? (
              <div style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid #34d399", color: "#34d399", borderRadius: 10, padding: "16px 14px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
                {fbSuccess}
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>ชื่อของคุณ</label>
                    <input
                      type="text"
                      value={fbName}
                      onChange={(e) => setFbName(e.target.value)}
                      placeholder="ชื่อ (ไม่บังคับ)"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>อีเมล</label>
                    <input
                      type="email"
                      value={fbEmail}
                      onChange={(e) => setFbEmail(e.target.value)}
                      placeholder="อีเมล (ไม่บังคับ)"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>หัวข้อ *</label>
                  <input
                    type="text"
                    value={fbTitle}
                    onChange={(e) => setFbTitle(e.target.value)}
                    placeholder="สรุปเรื่องที่ต้องการแจ้ง"
                    required
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>รายละเอียด *</label>
                  <textarea
                    value={fbMessage}
                    onChange={(e) => setFbMessage(e.target.value)}
                    placeholder="อธิบายปัญหา หรือความต้องการเพิ่มเติม..."
                    required
                    rows={4}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>ความสำคัญ</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFbPriority(p)}
                        style={{
                          flex: 1,
                          padding: "8px 0",
                          borderRadius: 8,
                          border: fbPriority === p ? "1px solid #34d399" : "1px solid #334155",
                          background: fbPriority === p ? "rgba(52, 211, 153, 0.1)" : "#0f172a",
                          color: fbPriority === p ? "#34d399" : "#94a3b8",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {p === "low" ? "ต่ำ" : p === "medium" ? "กลาง" : "สูง"}
                      </button>
                    ))}
                  </div>
                </div>

                {fbError && (
                  <div style={{ background: "rgba(248, 113, 113, 0.1)", border: "1px solid #f87171", color: "#f87171", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
                    {fbError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={fbSending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "10px 0",
                    borderRadius: 10,
                    background: "#16a34a",
                    color: "#fff",
                    border: "none",
                    cursor: fbSending ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 700,
                    opacity: fbSending ? 0.6 : 1,
                  }}
                >
                  {fbSending ? "กำลังส่ง..." : <><Send size={15} /> ส่ง Feedback</>}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#f8fafc",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
}
