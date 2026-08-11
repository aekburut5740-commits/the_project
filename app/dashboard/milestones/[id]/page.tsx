"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Check, Plus, Trash2, ArrowLeft, Pencil } from "lucide-react"
import { backend, normalizeMilestone } from "@/lib/backend"
import { useCurrentUser } from "@/lib/useCurrentUser"
import { useTheme } from "@/lib/themeContext"

type Task = {
    id: number
    milestone_id: number
    title: string
    is_done: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    upcoming: { label: "กำลังจะมาถึง", color: "#f59e0b" },
    in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
    completed: { label: "เสร็จแล้ว", color: "#34d399" },
    overdue: { label: "เลยกำหนด", color: "#f87171" },
}

type ActivityLog = {
    id: number
    user_id: number
    username: string | null
    milestone_id: number
    action: string
    created_at: string
}

type ProgressHistoryPoint = {
    id: number
    progress: number
    recorded_at: string
}

export default function MilestoneDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { isAdmin, mounted } = useCurrentUser()
    const { theme } = useTheme()
    const isLight = theme === "light"

    const [milestone, setMilestone] = useState<any>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
    const [progressHistory, setProgressHistory] = useState<ProgressHistoryPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [newTask, setNewTask] = useState("")
    const [addingTask, setAddingTask] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editingTitle, setEditingTitle] = useState("")

    useEffect(() => {
        if (!mounted) return
        loadData()
    }, [mounted, id])

    async function loadData() {
        setLoading(true)
        setError("")

        try {
            const milestoneId = Number(id)

            // ข้อมูลหลัก: ถ้าส่วนนี้ไม่ได้จริง จึงค่อยให้หน้าแจ้ง error
            const [taskData, projects] = await Promise.all([
                backend.milestoneTasks(milestoneId),
                backend.projects(isAdmin),
            ])

            setTasks(taskData)

            for (const project of projects as any[]) {
                const milestones = await backend.milestones(Number(project.id))
                const found = milestones.find(
                    (item: any) => Number(item.id) === milestoneId
                )

                if (found) {
                    setMilestone(normalizeMilestone(found))
                    break
                }
            }

            // ส่วนเสริม: endpoint ใดมีปัญหา หน้า milestone ยังต้องใช้งานได้
            const [activityResult, historyResult] = await Promise.allSettled([
                backend.milestoneActivity(milestoneId),
                backend.milestoneProgressHistory(milestoneId),
            ])

            if (activityResult.status === "fulfilled") {
                setActivityLogs(activityResult.value)
            } else {
                console.warn("โหลด Activity Log ไม่สำเร็จ", activityResult.reason)
            }

            if (historyResult.status === "fulfilled") {
                setProgressHistory(historyResult.value)
            } else {
                console.warn("โหลด Progress History ไม่สำเร็จ", historyResult.reason)
            }
        } catch {
            setError("ไม่สามารถโหลดข้อมูลได้")
        } finally {
            setLoading(false)
        }
    }

    async function handleAddTask() {
        if (!newTask.trim()) return
        setAddingTask(true)
        try {
            const created = await backend.createMilestoneTask(Number(id), newTask.trim())
            setTasks((prev) => [...prev, created])
            setNewTask("")
        } catch {
            setError("เพิ่ม task ไม่สำเร็จ")
        } finally {
            setAddingTask(false)
        }
    }

    async function handleToggleTask(task: Task) {
        try {
            const updated = await backend.updateMilestoneTask(task.id, { is_done: !task.is_done })
            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_done: updated.is_done } : t))
        } catch {
            setError("อัปเดต task ไม่สำเร็จ")
        }
    }

    async function handleEditTask(task: Task) {
        if (!editingTitle.trim() || editingTitle === task.title) {
            setEditingTaskId(null)
            return
        }
        try {
            const updated = await backend.updateMilestoneTask(task.id, { title: editingTitle.trim() })
            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, title: updated.title } : t))
            setEditingTaskId(null)
        } catch {
            setError("แก้ไข task ไม่สำเร็จ")
        }
    }

    async function handleDeleteTask(taskId: number) {
        if (!confirm("ลบ task นี้?")) return
        try {
            await backend.deleteMilestoneTask(taskId)
            setTasks((prev) => prev.filter((t) => t.id !== taskId))
        } catch {
            setError("ลบ task ไม่สำเร็จ")
        }
    }

    const doneTasks = tasks.filter((t) => t.is_done).length
    const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : milestone?.progress || 0
    const statusConf = STATUS_CONFIG[milestone?.status] || { label: milestone?.status, color: "#6b7280" }

    const bg = isLight ? "#f8fafc" : "#0d1117"
    const cardBg = isLight ? "#ffffff" : "#111827"
    const border = isLight ? "1px solid #e2e8f0" : "1px solid #1f2937"
    const textMain = isLight ? "#0f172a" : "#f9fafb"
    const textSub = isLight ? "#64748b" : "#6b7280"
    const inputBg = isLight ? "#ffffff" : "#0d1117"
    const inputBorder = isLight ? "1px solid #cbd5e1" : "1px solid #1f2937"

    if (loading) return <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: textSub }}>กำลังโหลด...</div>

    return (
        <div style={{ background: bg, minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: textMain }}>

            {/* Back */}
            <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: textSub, cursor: "pointer", fontSize: 13, marginBottom: 20 }}>
                <ArrowLeft size={15} /> กลับ
            </button>

            {error && <div style={{ color: "#f87171", marginBottom: 14, fontSize: 13 }}>{error}</div>}

            {milestone && (
                <>
                    {/* Header */}
                    <div style={{ background: cardBg, border, borderRadius: 14, padding: "24px 28px", marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: textMain, marginBottom: 6 }}>{milestone.title}</div>
                                {milestone.description && (
                                    <div style={{ fontSize: 14, color: textSub, lineHeight: 1.6 }}>{milestone.description}</div>
                                )}
                            </div>
                            <span style={{ background: statusConf.color + "22", color: statusConf.color, border: `1px solid ${statusConf.color}44`, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                                {statusConf.label}
                            </span>
                        </div>

                        {/* Meta */}
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
                            {milestone.phase && (
                                <div>
                                    <div style={{ fontSize: 11, color: textSub, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>Phase</div>
                                    <div style={{ fontSize: 13, color: textMain, fontWeight: 600, marginTop: 2 }}>{milestone.phase}</div>
                                </div>
                            )}
                            {milestone.startDate && (
                                <div>
                                    <div style={{ fontSize: 11, color: textSub, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>วันเริ่ม</div>
                                    <div style={{ fontSize: 13, color: textMain, fontWeight: 600, marginTop: 2 }}>{new Date(milestone.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</div>
                                </div>
                            )}
                            {milestone.dueDate && (
                                <div>
                                    <div style={{ fontSize: 11, color: textSub, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>กำหนดส่ง</div>
                                    <div style={{ fontSize: 13, color: milestone.status === "overdue" ? "#f87171" : textMain, fontWeight: 600, marginTop: 2 }}>{new Date(milestone.dueDate).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</div>
                                </div>
                            )}
                        </div>

                        {/* Progress */}
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                                <span style={{ color: textSub }}>ความคืบหน้า ({doneTasks}/{tasks.length} tasks)</span>
                                <span style={{ color: textMain, fontWeight: 700, fontFamily: "monospace" }}>{progress}%</span>
                            </div>
                            <div style={{ background: isLight ? "#e2e8f0" : "#1f2937", borderRadius: 999, height: 8, overflow: "hidden" }}>
                                <div style={{ width: `${progress}%`, height: "100%", background: statusConf.color, borderRadius: 999, transition: "width 0.4s ease" }} />
                            </div>
                        </div>
                    </div>

                    {/* Tasks */}
                    <div style={{ background: cardBg, border, borderRadius: 14, padding: "24px 28px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 16 }}>
                            Tasks ({doneTasks}/{tasks.length} เสร็จแล้ว)
                        </div>

                        {/* Add task — admin only */}
                        {isAdmin && (
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                                <input
                                    value={newTask}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                                    placeholder="เพิ่ม task ใหม่..."
                                    style={{ flex: 1, background: inputBg, border: inputBorder, borderRadius: 8, padding: "9px 12px", color: textMain, fontSize: 13, outline: "none" }}
                                />
                                <button
                                    onClick={handleAddTask}
                                    disabled={addingTask || !newTask.trim()}
                                    style={{ background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", padding: "9px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, opacity: addingTask || !newTask.trim() ? 0.5 : 1 }}
                                >
                                    <Plus size={14} /> เพิ่ม
                                </button>
                            </div>
                        )}

                        {/* Task list */}
                        {tasks.length === 0 ? (
                            <div style={{ color: textSub, fontSize: 13, textAlign: "center", padding: "32px 0", fontStyle: "italic" }}>
                                {isAdmin ? "ยังไม่มี task — เพิ่มได้เลยครับ" : "ยังไม่มี task"}
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {tasks.map((task) => (
                                    <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 12, background: isLight ? "#f8fafc" : "#0d1117", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 10, padding: "12px 14px" }}>

                                        {/* Checkbox */}
                                        <button
                                            onClick={() => handleToggleTask(task)}
                                            style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${task.is_done ? "#34d399" : (isLight ? "#cbd5e1" : "#374151")}`, background: task.is_done ? "#34d399" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}
                                        >
                                            {task.is_done && <Check size={13} color="#fff" strokeWidth={3} />}
                                        </button>

                                        {/* Title */}
                                        {editingTaskId === task.id && isAdmin ? (
                                            <input
                                                autoFocus
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onBlur={() => handleEditTask(task)}
                                                onKeyDown={(e) => { if (e.key === "Enter") handleEditTask(task); if (e.key === "Escape") setEditingTaskId(null) }}
                                                style={{ flex: 1, background: inputBg, border: inputBorder, borderRadius: 6, padding: "4px 8px", color: textMain, fontSize: 13, outline: "none" }}
                                            />
                                        ) : (
                                            <span style={{ flex: 1, fontSize: 13, color: task.is_done ? textSub : textMain, textDecoration: task.is_done ? "line-through" : "none" }}>
                                                {task.title}
                                            </span>
                                        )}

                                        {/* Admin actions */}
                                        {isAdmin && editingTaskId !== task.id && (
                                            <div style={{ display: "flex", gap: 4 }}>
                                                <button onClick={() => { setEditingTaskId(task.id); setEditingTitle(task.title) }} style={{ background: "transparent", border: "none", color: textSub, cursor: "pointer", padding: 4, borderRadius: 4 }}>
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => handleDeleteTask(task.id)} style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 4, borderRadius: 4 }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}