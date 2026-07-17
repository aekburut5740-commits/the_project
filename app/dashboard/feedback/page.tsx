"use client"

import { useState, useMemo, useEffect } from "react"
import { MessageSquare, Plus, Send } from "lucide-react"
import {
  FEEDBACK_STATUS_CONFIG, FEEDBACK_PRIORITY_CONFIG,
  type Feedback, type FeedbackStatus, type FeedbackPriority, type FeedbackComment, type Project,
} from "@/lib/mockData"
import { useNotifications } from "@/lib/notificationStore"
import { getUser } from "@/lib/auth"
import { backend, normalizeProject } from "@/lib/backend"

function normalizeFeedback(row: any, replies: any[]): Feedback {
  return {
    id: Number(row.id), title: row.title ?? "", description: row.message ?? row.description ?? "",
    projectId: Number(row.project_id ?? row.projectId), authorId: Number(row.user_id ?? row.authorId ?? 0),
    authorName: row.username ?? row.authorName ?? "—", status: row.status ?? "sent", priority: row.priority ?? "medium",
    createdAt: new Date(row.created_at ?? row.createdAt ?? Date.now()), updatedAt: new Date(row.updated_at ?? row.updatedAt ?? row.created_at ?? Date.now()),
    isRead: Boolean(row.is_read ?? row.isRead ?? false),
    comments: replies.map((reply: any) => ({ id: Number(reply.id), authorId: Number(reply.user_id ?? 0), authorName: reply.username ?? "—", authorRole: reply.role ?? "customer", message: reply.message ?? "", createdAt: new Date(reply.created_at ?? Date.now()) })),
  }
}

export default function FeedbackPage() {
  const user = getUser()
  const isAdmin = user?.role === "admin"
  const { addNotif } = useNotifications()
  const [projects, setProjects] = useState<Project[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [error, setError] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "all">("all")

  useEffect(() => {
    const load = async () => {
      try {
        const projectRows = await backend.projects(isAdmin)
        const nextProjects = projectRows.map((p: any) => normalizeProject(p))
        setProjects(nextProjects)
        const rows = isAdmin ? await backend.allFeedbacks() : (await Promise.all(nextProjects.map((p) => backend.feedbacks(p.id)))).flat()
        const next = await Promise.all(rows.map(async (row: any) => normalizeFeedback(row, await backend.feedbackReplies(Number(row.id)))))
        setFeedbacks(next)
      } catch (err) { setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Feedback ได้") }
    }
    load()
  }, [isAdmin])

  const selected = feedbacks.find((f) => f.id === selectedId) ?? null
  const filtered = feedbacks.filter((f) => filterStatus === "all" || f.status === filterStatus)
  const unreadCount = isAdmin ? feedbacks.filter((f) => !f.isRead).length : 0

  function handleSelect(id: number) {
    setSelectedId(id)
    if (isAdmin) {
      setFeedbacks((prev) => prev.map((f) => f.id === id ? { ...f, isRead: true } : f))
    }
  }

  async function handleCreate(data: { title: string; description: string; projectId: number; priority: FeedbackPriority }) {
    if (!user) return
    const proj = projects.find((p) => p.id === data.projectId)
    try { const newFeedback = normalizeFeedback(await backend.createFeedback(data.projectId, { title: data.title, message: data.description, priority: data.priority }), [])
    setFeedbacks((prev) => [newFeedback, ...prev])
    addNotif({
      type: "feedback",
      title: "มี Feedback ใหม่",
      message: `${user.username} ส่ง feedback "${data.title}" ใน ${proj?.name}`,
      forUserId: "all",
    })
    setShowCreate(false)
    } catch (err) { setError(err instanceof Error ? err.message : "ส่ง Feedback ไม่สำเร็จ") }
  }

  async function handleStatusChange(feedbackId: number, status: FeedbackStatus) {
    const f = feedbacks.find((x) => x.id === feedbackId)
    try { await backend.updateFeedbackStatus(feedbackId, status)
    setFeedbacks((prev) => prev.map((x) => x.id === feedbackId ? { ...x, status, updatedAt: new Date() } : x))
    if (f) {
      addNotif({
        type: "feedback",
        title: "สถานะ Feedback เปลี่ยนแปลง",
        message: `"${f.title}" → ${FEEDBACK_STATUS_CONFIG[status].label}`,
        forUserId: f.authorId,
      })
    }
    } catch (err) { setError(err instanceof Error ? err.message : "เปลี่ยนสถานะไม่สำเร็จ") }
  }

  async function handleComment(feedbackId: number, message: string) {
    if (!user) return
    try { const row: any = await backend.createFeedbackReply(feedbackId, message)
    const comment: FeedbackComment = {
      id: Number(row?.id ?? Date.now()), authorId: user.id,
      authorName: user.username, authorRole: user.role,
      message, createdAt: new Date(),
    }
    const f = feedbacks.find((x) => x.id === feedbackId)
    setFeedbacks((prev) => prev.map((x) =>
      x.id === feedbackId ? { ...x, comments: [...x.comments, comment], updatedAt: new Date() } : x
    ))
    if (isAdmin && f) {
      addNotif({
        type: "feedback",
        title: "Admin ตอบกลับ Feedback",
        message: `Admin ตอบกลับ "${f.title}"`,
        forUserId: f.authorId,
      })
    }
    } catch (err) { setError(err instanceof Error ? err.message : "ส่งข้อความตอบกลับไม่สำเร็จ") }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Feedback Center</h1>
          <p style={S.subtitle}>
            {isAdmin
              ? `${feedbacks.length} รายการทั้งหมด${unreadCount > 0 ? ` · ${unreadCount} ยังไม่ได้อ่าน` : ""}`
              : `${feedbacks.length} รายการของคุณ`}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={S.addBtn}>
          <Plus size={15} /> ส่ง Feedback
        </button>
      </div>
      {error && <div style={{ color: "#f87171", marginBottom: 12 }}>{error}</div>}

      {/* Role badge */}
      <div style={{ marginBottom: 20 }}>
        <span style={{
          ...S.roleBadge,
          background: isAdmin ? "#4f8ef722" : "#34d39922",
          color: isAdmin ? "#4f8ef7" : "#34d399",
          border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}`,
        }}>
          {isAdmin ? "👑 Admin — เห็นและจัดการ feedback ทั้งหมด เปลี่ยนสถานะได้" : "👤 Customer — ส่งและติดตาม feedback ของคุณ"}
        </span>
      </div>

      {/* 2-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 14, height: "calc(100vh - 230px)" }}>

        {/* Left panel */}
        <div style={S.listPanel}>
          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 2, padding: "10px 10px 0", flexWrap: "wrap" }}>
            {(["all", "sent", "in_progress", "resolved"] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                style={{ ...S.tabBtn, background: filterStatus === s ? "#1f2937" : "transparent", color: filterStatus === s ? "#f9fafb" : "#6b7280" }}>
                {s === "all" ? "ทั้งหมด" : FEEDBACK_STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.length === 0 ? (
              <div style={S.empty}>ไม่มี feedback</div>
            ) : filtered.map((f) => {
              const { color } = FEEDBACK_STATUS_CONFIG[f.status]
              const { color: pColor } = FEEDBACK_PRIORITY_CONFIG[f.priority]
              const proj = projects.find((p) => p.id === f.projectId)
              const isSelected = selectedId === f.id
              return (
                <div key={f.id} onClick={() => handleSelect(f.id)}
                  style={{
                    ...S.feedbackItem,
                    background: isSelected ? "#1e3a5f" : "#0d1117",
                    borderColor: isSelected ? "#4f8ef7" : "#1f2937",
                    borderLeftColor: color,
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: isAdmin && !f.isRead ? 700 : 500, color: "#f9fafb", flex: 1, lineHeight: 1.4 }}>
                      {f.title}
                    </span>
                    {isAdmin && !f.isRead && <span style={S.unreadDot} />}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{proj?.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44` }}>
                      {FEEDBACK_STATUS_CONFIG[f.status].label}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ ...S.badge, background: pColor + "22", color: pColor, border: `1px solid ${pColor}44` }}>
                        {FEEDBACK_PRIORITY_CONFIG[f.priority].label}
                      </span>
                      {f.comments.length > 0 && (
                        <span style={{ fontSize: 10, color: "#4b5563" }}>💬 {f.comments.length}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div style={S.detailPanel}>
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <MessageSquare size={40} color="#1f2937" />
              <div style={{ fontSize: 13, color: "#374151" }}>เลือก feedback เพื่อดูรายละเอียด</div>
            </div>
          ) : (
            <FeedbackDetail
              feedback={selected}
              projectName={projects.find((p) => p.id === selected.projectId)?.name}
              isAdmin={isAdmin}
              currentUserId={user?.id ?? 0}
              currentUsername={user?.username ?? ""}
              currentRole={user?.role ?? "customer"}
              onStatusChange={handleStatusChange}
              onComment={handleComment}
            />
          )}
        </div>
      </div>

      {showCreate && (
        <CreateModal
          projects={projects}
          userId={user?.id ?? 0}
          isAdmin={isAdmin}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}

// ─── Feedback Detail ──────────────────────────────────────────────────────────

function FeedbackDetail({ feedback: f, projectName, isAdmin, currentUserId, currentUsername, currentRole, onStatusChange, onComment }: {
  feedback: Feedback
  projectName?: string
  isAdmin: boolean
  currentUserId: number
  currentUsername: string
  currentRole: "admin" | "customer"
  onStatusChange: (id: number, status: FeedbackStatus) => void
  onComment: (id: number, message: string) => void
}) {
  const [newComment, setNewComment] = useState("")
  const { color: sColor, label: sLabel } = FEEDBACK_STATUS_CONFIG[f.status]
  const { color: pColor, label: pLabel } = FEEDBACK_PRIORITY_CONFIG[f.priority]

  function submit() {
    if (!newComment.trim()) return
    onComment(f.id, newComment.trim())
    setNewComment("")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Detail header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f9fafb", marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              โดย {f.authorName} · {projectName} · {f.createdAt.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <span style={{ ...S.badge, background: pColor + "22", color: pColor, border: `1px solid ${pColor}44` }}>
              ⚡ {pLabel}
            </span>
            {isAdmin ? (
              <select value={f.status}
                onChange={(e) => onStatusChange(f.id, e.target.value as FeedbackStatus)}
                style={{ background: sColor + "22", color: sColor, border: `1px solid ${sColor}44`, borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", outline: "none" }}>
                <option value="sent">ส่งถึงแล้ว</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">เสร็จสิ้น</option>
              </select>
            ) : (
              <span style={{ ...S.badge, background: sColor + "22", color: sColor, border: `1px solid ${sColor}44` }}>
                {sLabel}
              </span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6, margin: 0, background: "#0d1117", borderRadius: 8, padding: "12px 14px" }}>
          {f.description}
        </p>
      </div>

      {/* Comments */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        {f.comments.length === 0 && (
          <div style={{ color: "#374151", fontSize: 13, textAlign: "center", padding: "32px 0", fontStyle: "italic" }}>
            ยังไม่มีความคิดเห็น — เริ่มการสนทนาได้เลย
          </div>
        )}
        {f.comments.map((c) => {
          const isMe = c.authorId === currentUserId
          return (
            <div key={c.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: c.authorRole === "admin" ? "#4f8ef722" : "#34d39922",
                color: c.authorRole === "admin" ? "#4f8ef7" : "#34d399",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, border: `1px solid ${c.authorRole === "admin" ? "#4f8ef744" : "#34d39944"}`,
              }}>
                {c.authorName[0].toUpperCase()}
              </div>
              {/* Bubble */}
              <div style={{ maxWidth: "68%" }}>
                <div style={{
                  background: isMe ? "#1e3a5f" : "#1f2937",
                  borderRadius: isMe ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                  padding: "10px 14px",
                  border: `1px solid ${isMe ? "#2d5a9a" : "#374151"}`,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: c.authorRole === "admin" ? "#4f8ef7" : "#34d399", marginBottom: 5 }}>
                    {c.authorName}{c.authorRole === "admin" ? " · Admin" : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "#e5e7eb", lineHeight: 1.6 }}>{c.message}</div>
                </div>
                <div style={{ fontSize: 10, color: "#374151", marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                  {c.createdAt.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 24px", borderTop: "1px solid #1f2937", display: "flex", gap: 10, flexShrink: 0 }}>
        <input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={isAdmin ? "ตอบกลับลูกค้า..." : "พิมพ์ความคิดเห็น..."}
          style={{ ...S.input, flex: 1 }}
        />
        <button onClick={submit} style={S.sendBtn} title="ส่ง">
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

function CreateModal({ projects, userId, isAdmin, onClose, onCreate }: {
  projects: Project[]
  userId: number
  isAdmin: boolean
  onClose: () => void
  onCreate: (data: { title: string; description: string; projectId: number; priority: FeedbackPriority }) => void
}) {
  const myProjects = projects.filter((p) => isAdmin || p.ownerId === userId)
  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: myProjects[0]?.id ?? 0,
    priority: "medium" as FeedbackPriority,
  })
  const canSubmit = form.title.trim() && form.description.trim()

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>ส่ง Feedback ใหม่</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.modalBody}>
          <Field label="หัวข้อ">
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="สรุปปัญหาหรือข้อเสนอแนะ" style={S.input} />
          </Field>
          <Field label="รายละเอียด">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4} placeholder="อธิบายให้ละเอียดขึ้น..." style={{ ...S.input, resize: "vertical" }} />
          </Field>
          <Field label="โปรเจค">
            <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: Number(e.target.value) }))} style={S.input}>
              {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="ระดับความสำคัญ">
            <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as FeedbackPriority }))} style={S.input}>
              <option value="low">ต่ำ — ข้อเสนอแนะทั่วไป</option>
              <option value="medium">กลาง — ส่งผลต่อการใช้งาน</option>
              <option value="high">สูง — ต้องแก้ไขเร่งด่วน</option>
            </select>
          </Field>
        </div>
        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
          <button onClick={() => canSubmit && onCreate(form)}
            style={{ ...S.saveBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}>
            ส่ง Feedback
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  listPanel: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden" },
  detailPanel: { background: "#111827", border: "1px solid #1f2937", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden" },
  tabBtn: { border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  feedbackItem: { border: "1px solid", borderLeft: "3px solid", borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s" },
  unreadDot: { width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 2 },
  badge: { fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" as const },
  input: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  sendBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  empty: { color: "#374151", fontSize: 13, textAlign: "center", padding: "40px 0", fontStyle: "italic" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
  modal: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1f2937" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f9fafb" },
  closeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer" },
  modalBody: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
  modalFooter: { display: "flex", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #1f2937" },
  saveBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", cursor: "pointer" },
  cancelBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer", marginRight: 8 },
}
