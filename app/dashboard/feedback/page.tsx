"use client"

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Plus, RefreshCw, Send } from "lucide-react"
import { backend, normalizeProject } from "@/lib/backend"
import { getUser } from "@/lib/auth"
import { useTheme } from "@/lib/themeContext"
import { useCurrentUser } from "@/lib/useCurrentUser"

type UserRole = "admin" | "customer"
type FeedbackStatus = "sent" | "in_progress" | "resolved"
type FeedbackPriority = "low" | "medium" | "high"

type Project = {
  id: number
  name: string
  ownerId?: number
}

type FeedbackComment = {
  id: number
  authorId: number
  authorName: string
  authorRole: UserRole
  message: string
  createdAt: Date
}

type Feedback = {
  id: number
  title: string
  description: string
  projectId: number
  priority: FeedbackPriority
  authorId: number
  authorName: string
  status: FeedbackStatus
  createdAt: Date
  updatedAt: Date
  isRead: boolean
  comments: FeedbackComment[]
}

const FEEDBACK_STATUS_CONFIG: Record<FeedbackStatus, { label: string; color: string }> = {
  sent: { label: "ส่งถึงแล้ว", color: "#60a5fa" },
  in_progress: { label: "กำลังดำเนินการ", color: "#f59e0b" },
  resolved: { label: "เสร็จสิ้น", color: "#34d399" },
}

const FEEDBACK_PRIORITY_CONFIG: Record<FeedbackPriority, { label: string; color: string }> = {
  low: { label: "ต่ำ", color: "#9ca3af" },
  medium: { label: "กลาง", color: "#f59e0b" },
  high: { label: "สูง", color: "#f87171" },
}

import { Suspense } from "react"

function FeedbackContent() {
  const { theme } = useTheme()
  const { user: rawUser, isAdmin, mounted } = useCurrentUser()
  const user = rawUser ?? { id: 0, username: "", role: "customer" as UserRole }
  const isLight = theme === "light"
  const S = getStyles(isLight)
  const searchParams = useSearchParams()
  const requestedProjectId = Number(searchParams.get("project"))

  const [projects, setProjects] = useState<Project[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | "all">(
    Number.isFinite(requestedProjectId) && requestedProjectId > 0 ? requestedProjectId : "all",
  )
  const [showCreate, setShowCreate] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "all">("all")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [replying, setReplying] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)

  const selected = feedbacks.find((feedback) => feedback.id === selectedId) ?? null

  const filtered = useMemo(() => {
    return feedbacks.filter((feedback) => {
      const matchesStatus = filterStatus === "all" || feedback.status === filterStatus
      const matchesProject = selectedProjectId === "all" || feedback.projectId === selectedProjectId
      return matchesStatus && matchesProject
    })
  }, [feedbacks, filterStatus, selectedProjectId])

  const unreadCount = isAdmin ? feedbacks.filter((feedback) => !feedback.isRead).length : 0

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const projectRows = await backend.projects(isAdmin)
      const nextProjects = projectRows.map((row: any) => normalizeProject(row) as Project)
      setProjects(nextProjects)

      if (
        selectedProjectId !== "all" &&
        !nextProjects.some((project) => project.id === selectedProjectId)
      ) {
        setSelectedProjectId("all")
      }

      const rows = isAdmin
        ? await backend.allFeedbacks()
        : (
          await Promise.all(
            nextProjects.map((project) => backend.feedbacks(project.id).catch(() => [])),
          )
        ).flat()

      const nextFeedbacks = await Promise.all(
        rows.map(async (row: any) => {
          const comments = await backend.feedbackReplies(Number(row.id)).catch(() => [])
          return normalizeFeedback(row, comments, user)
        }),
      )

      nextFeedbacks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      setFeedbacks(nextFeedbacks)

      setSelectedId((currentId) => {
        if (currentId && nextFeedbacks.some((feedback) => feedback.id === currentId)) {
          return currentId
        }

        const firstMatching = nextFeedbacks.find((feedback) =>
          selectedProjectId === "all" ? true : feedback.projectId === selectedProjectId,
        )
        return firstMatching?.id ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถโหลด Feedback ได้")
    } finally {
      setLoading(false)
    }
  }, [isAdmin, selectedProjectId, user.id, user.role, user.username])

  useEffect(() => {
    void loadFeedbacks()
  }, [loadFeedbacks])

  useEffect(() => {
    if (Number.isFinite(requestedProjectId) && requestedProjectId > 0) {
      setSelectedProjectId(requestedProjectId)
    }
  }, [requestedProjectId])

  async function handleSelect(id: number) {
    setSelectedId(id)

    const feedback = feedbacks.find((f) => f.id === id)

    if (feedback && !feedback.isRead) {

      setFeedbacks((previous) =>
        previous.map((f) =>
          f.id === id
            ? { ...f, isRead: true }
            : f
        )
      )

      try {
        await backend.markFeedbackRead(id)
      } catch (err) {
        console.error(err)
      }
    }
  }

  async function handleCreate(data: {
    title: string
    description: string
    projectId: number
    priority: FeedbackPriority
  }) {
    if (creating) return

    setCreating(true)
    setError("")

    try {
      await backend.createFeedback(data.projectId, {
        title: data.title.trim(),
        message: data.description.trim(),
        priority: data.priority,
      })
      setSelectedProjectId(data.projectId)
      setShowCreate(false)
      await loadFeedbacks()
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่ง Feedback ไม่สำเร็จ")
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(feedbackId: number, status: FeedbackStatus) {
    if (changingStatus) return

    setChangingStatus(true)
    setError("")

    try {
      await backend.updateFeedbackStatus(feedbackId, status)
      setFeedbacks((previous) =>
        previous.map((item) =>
          item.id === feedbackId ? { ...item, status, updatedAt: new Date() } : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนสถานะไม่สำเร็จ")
    } finally {
      setChangingStatus(false)
    }
  }

  async function handleComment(feedbackId: number, message: string) {
    if (replying) return

    setReplying(true)
    setError("")

    try {
      await backend.createFeedbackReply(feedbackId, message.trim())
      const comments = await backend.feedbackReplies(feedbackId)

      setFeedbacks((previous) =>
        previous.map((item) =>
          item.id === feedbackId
            ? {
              ...item,
              comments: comments.map((row: any) => normalizeReply(row, user)),
              updatedAt: new Date(),
            }
            : item,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "ส่งข้อความไม่สำเร็จ")
      throw err
    } finally {
      setReplying(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Feedback Center</h1>
          <p style={S.subtitle}>
            {isAdmin
              ? `${feedbacks.length} รายการทั้งหมด${unreadCount > 0 ? ` · ${unreadCount} ยังไม่ได้อ่าน` : ""}`
              : `${feedbacks.length} รายการของคุณ`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void loadFeedbacks()} disabled={loading} style={S.secondaryBtn}>
            <RefreshCw size={15} /> รีเฟรช
          </button>
          <button
            onClick={() => setShowCreate(true)}
            disabled={projects.length === 0}
            style={{ ...S.addBtn, opacity: projects.length === 0 ? 0.5 : 1 }}
          >
            <Plus size={15} /> ส่ง Feedback
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <span
          style={{
            ...S.roleBadge,
            background: isAdmin ? "#4f8ef722" : "#34d39922",
            color: isAdmin ? "#4f8ef7" : "#34d399",
            border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}`,
          }}
        >
          {isAdmin
            ? "👑 Admin — เห็นและจัดการ Feedback ทั้งหมด เปลี่ยนสถานะได้"
            : "👤 Customer — ส่งและติดตาม Feedback ของคุณ"}
        </span>
      </div>

      {error && <div style={S.errorBox}>{error}</div>}

      <div style={S.filterRow}>
        <select
          value={selectedProjectId}
          onChange={(event) => {
            const value = event.target.value
            setSelectedProjectId(value === "all" ? "all" : Number(value))
            setSelectedId(null)
          }}
          style={{ ...S.input, maxWidth: 280 }}
        >
          <option value="all">ทุกโปรเจค</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={S.loadingBox}>กำลังโหลด Feedback...</div>
      ) : (
        <div style={S.contentGrid}>
          <div style={S.listPanel}>
            <div style={{ display: "flex", gap: 2, padding: "10px 10px 0", flexWrap: "wrap" }}>
              {(["all", "sent", "in_progress", "resolved"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    ...S.tabBtn,
                    background:
                      filterStatus === status
                        ? (isLight ? "#e6eefb" : "#1f2937")
                        : "transparent",
                    color: filterStatus === status ? (isLight ? "#0f172a" : "#f9fafb") : (isLight ? "#475569" : "#6b7280"),
                  }}
                >
                  {status === "all" ? "ทั้งหมด" : FEEDBACK_STATUS_CONFIG[status].label}
                </button>
              ))}
            </div>

            <div style={S.listBody}>
              {filtered.length === 0 ? (
                <div style={S.empty}>ไม่มี Feedback ตามตัวกรองนี้</div>
              ) : (
                filtered.map((feedback) => {
                  const { color } = FEEDBACK_STATUS_CONFIG[feedback.status]
                  const { color: priorityColor } = FEEDBACK_PRIORITY_CONFIG[feedback.priority]
                  const project = projects.find((item) => item.id === feedback.projectId)
                  const isSelected = selectedId === feedback.id

                  return (
                    <button
                      type="button"
                      key={feedback.id}
                      onClick={() => handleSelect(feedback.id)}
                      style={{
                        ...S.feedbackItem,
                        background: isSelected ? (isLight ? "#e6f0ff" : "#1e3a5f") : (isLight ? "#ffffff" : "#0d1117"),
                        borderColor: isSelected ? (isLight ? "#bfdbfe" : "#4f8ef7") : (isLight ? "#e2e8f0" : "#1f2937"),
                        borderLeftColor: color,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: isAdmin && !feedback.isRead ? 700 : 500,
                            color: isLight ? "#0f172a" : "#f9fafb",
                            flex: 1,
                            lineHeight: 1.4,
                          }}
                        >
                          {feedback.title || "ไม่มีหัวข้อ"}
                        </span>
                        {isAdmin && !feedback.isRead && <span style={S.unreadDot} />}
                      </div>

                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                        {project?.name || "ไม่พบโปรเจค"}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ ...S.badge, background: color + "22", color, border: `1px solid ${color}44` }}>
                          {FEEDBACK_STATUS_CONFIG[feedback.status].label}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              ...S.badge,
                              background: priorityColor + "22",
                              color: priorityColor,
                              border: `1px solid ${priorityColor}44`,
                            }}
                          >
                            {FEEDBACK_PRIORITY_CONFIG[feedback.priority].label}
                          </span>
                          {feedback.comments.length > 0 && (
                            <span style={{ fontSize: 10, color: "#4b5563" }}>💬 {feedback.comments.length}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div style={S.detailPanel}>
            {!selected ? (
              <div style={S.noSelection}>
                <MessageSquare size={40} color="#1f2937" />
                <div style={{ fontSize: 13, color: "#374151" }}>เลือก Feedback เพื่อดูรายละเอียด</div>
              </div>
            ) : (
              <FeedbackDetail
                feedback={selected}
                isAdmin={isAdmin}
                currentUserId={user.id}
                projectName={projects.find((project) => project.id === selected.projectId)?.name || "ไม่พบโปรเจค"}
                changingStatus={changingStatus}
                replying={replying}
                onStatusChange={handleStatusChange}
                onComment={handleComment}
                isLight={isLight}
              />
            )}
          </div>
        </div>
      )}

      {showCreate && (
        <CreateModal
          projects={projects}
          initialProjectId={selectedProjectId === "all" ? undefined : selectedProjectId}
          submitting={creating}
          onClose={() => !creating && setShowCreate(false)}
          onCreate={handleCreate}
          isLight={isLight}
        />
      )}
    </div>
  )
}

function FeedbackDetail({
  feedback,
  isAdmin,
  currentUserId,
  projectName,
  changingStatus,
  replying,
  onStatusChange,
  onComment,
  isLight = false,
}: {
  feedback: Feedback
  isAdmin: boolean
  currentUserId: number
  projectName: string
  changingStatus: boolean
  replying: boolean
  onStatusChange: (id: number, status: FeedbackStatus) => void | Promise<void>
  onComment: (id: number, message: string) => void | Promise<void>
  isLight?: boolean
}) {
  const S = getStyles(isLight)
  const [newComment, setNewComment] = useState("")
  const { color: statusColor, label: statusLabel } = FEEDBACK_STATUS_CONFIG[feedback.status]
  const { color: priorityColor, label: priorityLabel } = FEEDBACK_PRIORITY_CONFIG[feedback.priority]

  async function submit() {
    const message = newComment.trim()
    if (!message || replying) return

    try {
      await onComment(feedback.id, message)
      setNewComment("")
    } catch {
      // ข้อผิดพลาดถูกแสดงที่หน้าหลักแล้ว จึงเก็บข้อความไว้ให้ผู้ใช้ลองส่งใหม่
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2937", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", marginBottom: 4 }}>
              {feedback.title || "ไม่มีหัวข้อ"}
            </div>
            <div style={{ fontSize: 12, color: isLight ? "#475569" : "#6b7280" }}>
              โดย {feedback.authorName} · {projectName} · {formatDate(feedback.createdAt)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <span
              style={{
                ...S.badge,
                background: priorityColor + "22",
                color: priorityColor,
                border: `1px solid ${priorityColor}44`,
              }}
            >
              ⚡ {priorityLabel}
            </span>

            {isAdmin ? (
              <select
                value={feedback.status}
                disabled={changingStatus}
                onChange={(event) => void onStatusChange(feedback.id, event.target.value as FeedbackStatus)}
                style={{
                  background: statusColor + "22",
                  color: statusColor,
                  border: `1px solid ${statusColor}44`,
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: changingStatus ? "wait" : "pointer",
                  outline: "none",
                }}
              >
                <option value="sent">ส่งถึงแล้ว</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="resolved">เสร็จสิ้น</option>
              </select>
            ) : (
              <span
                style={{
                  ...S.badge,
                  background: statusColor + "22",
                  color: statusColor,
                  border: `1px solid ${statusColor}44`,
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        <p style={S.descriptionBox}>{feedback.description || "ไม่มีรายละเอียด"}</p>
      </div>

      <div style={S.commentsBody}>
        {feedback.comments.length === 0 && (
          <div style={S.noComments}>ยังไม่มีความคิดเห็น — เริ่มการสนทนาได้เลย</div>
        )}

        {feedback.comments.map((comment) => {
          const isMe = comment.authorId === currentUserId
          const initial = comment.authorName.trim().charAt(0).toUpperCase() || "?"

          return (
            <div
              key={comment.id}
              style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", gap: 10, alignItems: "flex-start" }}
            >
              <div
                style={{
                  ...S.avatar,
                  background: comment.authorRole === "admin" ? "#4f8ef722" : "#34d39922",
                  color: comment.authorRole === "admin" ? "#4f8ef7" : "#34d399",
                  border: `1px solid ${comment.authorRole === "admin" ? "#4f8ef744" : "#34d39944"}`,
                }}
              >
                {initial}
              </div>

              <div style={{ maxWidth: "68%" }}>
                <div
                  style={{
                    background: isMe
                      ? (isLight ? "#dbeafe" : "#1e3a5f")
                      : (isLight ? "#f1f5f9" : "#1f2937"),
                    borderRadius: isMe ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                    padding: "10px 14px",
                    border: `1px solid ${isMe
                      ? (isLight ? "#bfdbfe" : "#2d5a9a")
                      : (isLight ? "#e2e8f0" : "#374151")}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: comment.authorRole === "admin" ? "#4f8ef7" : "#34d399",
                      marginBottom: 5,
                    }}
                  >
                    {comment.authorName}
                    {comment.authorRole === "admin" ? " · Admin" : ""}
                  </div>
                  <div style={{ fontSize: 13, color: isLight ? "#0f172a" : "#e5e7eb", lineHeight: 1.6 }}>{comment.message}</div>                </div>
                <div style={{ fontSize: 10, color: isLight ? "#94a3b8" : "#374151", marginTop: 3, textAlign: isMe ? "right" : "left" }}>
                  {formatTime(comment.createdAt)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={S.commentInputRow}>
        <input
          value={newComment}
          disabled={replying}
          onChange={(event) => setNewComment(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              void submit()
            }
          }}
          placeholder={isAdmin ? "ตอบกลับลูกค้า..." : "พิมพ์ความคิดเห็น..."}
          style={{ ...S.input, flex: 1 }}
        />
        <button
          onClick={() => void submit()}
          disabled={!newComment.trim() || replying}
          style={{ ...S.sendBtn, opacity: !newComment.trim() || replying ? 0.5 : 1 }}
          title="ส่ง"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#94a3b8" }}>กำลังโหลด...</div>}>
      <FeedbackContent />
    </Suspense>
  )
}

function CreateModal({
  projects,
  initialProjectId,
  submitting,
  onClose,
  onCreate,
  isLight = false,
}: {
  projects: Project[]
  initialProjectId?: number
  submitting: boolean
  onClose: () => void
  onCreate: (data: {
    title: string
    description: string
    projectId: number
    priority: FeedbackPriority
  }) => void | Promise<void>
  isLight?: boolean
}) {
  const S = getStyles(isLight)
  const availableProjects = projects
  const firstProjectId =
    availableProjects.find((project) => project.id === initialProjectId)?.id ?? availableProjects[0]?.id ?? 0

  const [form, setForm] = useState({
    title: "",
    description: "",
    projectId: firstProjectId,
    priority: "medium" as FeedbackPriority,
  })

  const canSubmit =
    Boolean(form.title.trim()) &&
    Boolean(form.description.trim()) &&
    form.projectId > 0 &&
    !submitting

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(event) => event.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>ส่ง Feedback ใหม่</div>
          <button onClick={onClose} disabled={submitting} style={S.closeBtn}>✕</button>
        </div>

        <div style={S.modalBody}>
          <Field label="หัวข้อ">
            <input
              value={form.title}
              disabled={submitting}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              placeholder="สรุปปัญหาหรือข้อเสนอแนะ"
              style={S.input}
            />
          </Field>

          <Field label="รายละเอียด">
            <textarea
              value={form.description}
              disabled={submitting}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              rows={4}
              placeholder="อธิบายให้ละเอียดขึ้น..."
              style={{ ...S.input, resize: "vertical" }}
            />
          </Field>

          <Field label="โปรเจค">
            <select
              value={form.projectId}
              disabled={submitting || availableProjects.length === 0}
              onChange={(event) => setForm((previous) => ({ ...previous, projectId: Number(event.target.value) }))}
              style={S.input}
            >
              {availableProjects.length === 0 ? (
                <option value={0}>ไม่มีโปรเจคที่เลือกได้</option>
              ) : (
                availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="ระดับความสำคัญ">
            <select
              value={form.priority}
              disabled={submitting}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, priority: event.target.value as FeedbackPriority }))
              }
              style={S.input}
            >
              <option value="low">ต่ำ — ข้อเสนอแนะทั่วไป</option>
              <option value="medium">กลาง — ส่งผลต่อการใช้งาน</option>
              <option value="high">สูง — ต้องแก้ไขเร่งด่วน</option>
            </select>
          </Field>
        </div>

        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={submitting} style={S.cancelBtn}>ยกเลิก</button>
          <button
            onClick={() => canSubmit && void onCreate(form)}
            disabled={!canSubmit}
            style={{ ...S.saveBtn, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}
          >
            {submitting ? "กำลังส่ง..." : "ส่ง Feedback"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

function normalizeFeedback(
  row: any,
  replies: any[],
  currentUser: { id: number; username: string; role: UserRole },
): Feedback {
  return {
    id: Number(row.id),
    title: String(row.title || ""),
    description: String(row.description ?? row.message ?? ""),
    projectId: Number(row.projectId ?? row.project_id),
    priority: normalizePriority(row.priority),
    authorId: Number(row.authorId ?? row.user_id ?? 0),
    authorName: String(row.authorName ?? row.username ?? "ผู้ใช้งาน"),
    status: normalizeStatus(row.status),
    createdAt: safeDate(row.createdAt ?? row.created_at),
    updatedAt: safeDate(row.updatedAt ?? row.updated_at ?? row.created_at),
    isRead: Boolean(row.isRead ?? row.is_read ?? false),
    comments: replies.map((reply) => normalizeReply(reply, currentUser)),
  }
}

function normalizeReply(
  row: any,
  currentUser: { id: number; username: string; role: UserRole },
): FeedbackComment {
  const authorId = Number(row.authorId ?? row.user_id ?? 0)
  const rawRole = row.authorRole ?? row.author_role ?? row.role
  const authorRole: UserRole =
    rawRole === "admin" || rawRole === "customer"
      ? rawRole
      : authorId === currentUser.id
        ? currentUser.role
        : currentUser.role === "admin"
          ? "customer"
          : "admin"

  return {
    id: Number(row.id),
    authorId,
    authorName: String(row.authorName ?? row.username ?? "ผู้ใช้งาน"),
    authorRole,
    message: String(row.message ?? row.content ?? ""),
    createdAt: safeDate(row.createdAt ?? row.created_at),
  }
}

function normalizeStatus(value: unknown): FeedbackStatus {
  return value === "in_progress" || value === "resolved" ? value : "sent"
}

function normalizePriority(value: unknown): FeedbackPriority {
  return value === "low" || value === "high" ? value : "medium"
}

function safeDate(value: unknown): Date {
  const date = value ? new Date(String(value)) : new Date()
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function formatDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "ไม่ระบุวันที่"
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
}

function formatTime(date: Date): string {
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
}

function getStyles(isLight: boolean): Record<string, CSSProperties> {
  return {
    page: { background: isLight ? "#f8fafc" : "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: isLight ? "#0f172a" : "#e5e7eb" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16 },
    title: { fontSize: 24, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
    subtitle: { fontSize: 13, color: isLight ? "#64748b" : "#6b7280", margin: "4px 0 0" },
    addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
    secondaryBtn: { display: "flex", alignItems: "center", gap: 7, background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 8, color: isLight ? "#334155" : "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 14px", cursor: "pointer" },
    roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
    filterRow: { display: "flex", gap: 10, marginBottom: 14 },
    contentGrid: { display: "grid", gridTemplateColumns: "minmax(280px, 320px) minmax(0, 1fr)", gap: 14, height: "calc(100vh - 280px)", minHeight: 520 },
    listPanel: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none" },
    detailPanel: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 14, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none" },
    tabBtn: { border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" },
    listBody: { flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 },
    feedbackItem: { border: "1px solid", borderLeft: "3px solid", borderRadius: 10, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s", width: "100%" },
    unreadDot: { width: 8, height: 8, borderRadius: "50%", background: "#ef4444", flexShrink: 0, marginTop: 2 },
    badge: { fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" },
    input: { background: isLight ? "#f8fafc" : "#0d1117", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: isLight ? "#0f172a" : "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
    sendBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    empty: { color: isLight ? "#94a3b8" : "#374151", fontSize: 13, textAlign: "center", padding: "40px 0", fontStyle: "italic" },
    loadingBox: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 14, color: isLight ? "#64748b" : "#6b7280", padding: 40, textAlign: "center" },
    errorBox: { color: isLight ? "#991b1b" : "#fca5a5", background: isLight ? "#fef2f2" : "#7f1d1d33", border: isLight ? "1px solid #fca5a5" : "1px solid #ef444455", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 },
    noSelection: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: isLight ? "#64748b" : "#9ca3af" },
    descriptionBox: { fontSize: 13, color: isLight ? "#334155" : "#9ca3af", lineHeight: 1.6, margin: 0, background: isLight ? "#f8fafc" : "#0d1117", border: isLight ? "1px solid #e2e8f0" : "none", borderRadius: 8, padding: "12px 14px", whiteSpace: "pre-wrap" },
    commentsBody: { flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 14 },
    noComments: { color: isLight ? "#94a3b8" : "#374151", fontSize: 13, textAlign: "center", padding: "32px 0", fontStyle: "italic" },
    avatar: { width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 },
    commentInputRow: { padding: "12px 24px", borderTop: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", display: "flex", gap: 10, flexShrink: 0 },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
    modal: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
    modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937" },
    modalTitle: { fontSize: 17, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" },
    closeBtn: { background: "transparent", border: "none", color: isLight ? "#64748b" : "#6b7280", fontSize: 16, cursor: "pointer" },
    modalBody: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
    modalFooter: { display: "flex", alignItems: "center", padding: "16px 24px", borderTop: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937" },
    saveBtn: { background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", cursor: "pointer" },
    cancelBtn: { background: "transparent", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 8, color: isLight ? "#64748b" : "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer", marginRight: 8 },
  }
}