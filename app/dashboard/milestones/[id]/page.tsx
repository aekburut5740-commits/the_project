"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
    Check,
    Plus,
    Trash2,
    ArrowLeft,
    Pencil,
    ChevronDown,
    ChevronUp,
    Calendar,
    Flag,
    Activity,
    TrendingUp,
} from "lucide-react"
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import { backend, normalizeMilestone } from "@/lib/backend"
import { useCurrentUser } from "@/lib/useCurrentUser"
import { useTheme } from "@/lib/themeContext"

type Task = {
    id: number
    milestone_id: number
    title: string
    is_done: boolean
}

type ActivityLog = {
    id: number
    user_id: number
    username: string
    milestone_id: number
    action: string
    created_at: string
}

type ProgressPoint = {
    id: number
    progress: number | string
    recorded_at: string
}

type MilestoneStatus = "upcoming" | "in_progress" | "completed" | "overdue"

type MilestoneForm = {
    title: string
    description: string
    status: MilestoneStatus
    startDate: string
    dueDate: string
    phase: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    upcoming: { label: "กำลังจะมาถึง", color: "#f59e0b" },
    in_progress: { label: "กำลังดำเนินการ", color: "#4f8ef7" },
    completed: { label: "เสร็จแล้ว", color: "#34d399" },
    overdue: { label: "เลยกำหนด", color: "#f87171" },
}

const TASKS_PREVIEW_COUNT = 5
const ACTIVITY_PREVIEW_COUNT = 3

export default function MilestoneDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { isAdmin, mounted } = useCurrentUser()
    const { theme } = useTheme()
    const isLight = theme === "light"

    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        function handleResize() {
            setIsMobile(window.innerWidth < 900)
        }
        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    const [milestone, setMilestone] = useState<any>(null)
    const [tasks, setTasks] = useState<Task[]>([])
    const [activity, setActivity] = useState<ActivityLog[]>([])
    const [progressHistory, setProgressHistory] = useState<ProgressPoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [newTask, setNewTask] = useState("")
    const [addingTask, setAddingTask] = useState(false)
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
    const [editingTitle, setEditingTitle] = useState("")
    const [showAllTasks, setShowAllTasks] = useState(false)
    const [showAllActivity, setShowAllActivity] = useState(false)

    const [isEditingMilestone, setIsEditingMilestone] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!mounted) return
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, id])

    async function loadData() {
        setLoading(true)
        setError("")
        try {
            const [taskData, activityData, progressData] = await Promise.all([
                backend.milestoneTasks(Number(id)),
                backend.milestoneActivity(Number(id)).catch(() => []),
                backend.milestoneProgressHistory(Number(id)).catch(() => []),
            ])
            setTasks(Array.isArray(taskData) ? taskData : [])
            setActivity(Array.isArray(activityData) ? activityData : [])
            setProgressHistory(Array.isArray(progressData) ? progressData : [])

            // ดึง milestones ของทุก project แล้วหา id ที่ตรง (ยังไม่มี GET /api/milestones/:id ตรงๆ)
            const projects = await backend.projects(isAdmin)
            for (const proj of projects as any[]) {
                const rows = await backend.milestones((proj as any).id)
                const found = rows.find((m: any) => Number(m.id) === Number(id))
                if (found) {
                    setMilestone(normalizeMilestone(found))
                    break
                }
            }
        } catch (err) {
            setError("ไม่สามารถโหลดข้อมูลได้")
        } finally {
            setLoading(false)
        }
    }

    // โหลดใหม่เฉพาะ activity log + progress history (ใช้หลังแก้ไข task เพื่อไม่ต้องรีโหลดทั้งหน้า)
    async function refreshSecondary() {
        try {
            const [activityData, progressData] = await Promise.all([
                backend.milestoneActivity(Number(id)).catch(() => []),
                backend.milestoneProgressHistory(Number(id)).catch(() => []),
            ])
            setActivity(Array.isArray(activityData) ? activityData : [])
            setProgressHistory(Array.isArray(progressData) ? progressData : [])
        } catch {
            // เงียบไว้ ไม่ต้องโชว์ error สำหรับการรีเฟรชเบื้องหลัง
        }
    }

    async function handleAddTask() {
        if (!newTask.trim()) return
        setAddingTask(true)
        try {
            const created = await backend.createMilestoneTask(Number(id), newTask.trim())
            setTasks((prev) => [...prev, created])
            setNewTask("")
            void refreshSecondary()
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
            void refreshSecondary()
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
            void refreshSecondary()
        } catch {
            setError("แก้ไข task ไม่สำเร็จ")
        }
    }

    async function handleDeleteTask(taskId: number) {
        if (!confirm("ลบ task นี้?")) return
        try {
            await backend.deleteMilestoneTask(taskId)
            setTasks((prev) => prev.filter((t) => t.id !== taskId))
            void refreshSecondary()
        } catch {
            setError("ลบ task ไม่สำเร็จ")
        }
    }

    async function handleSaveMilestone(form: MilestoneForm) {
        setSaving(true)
        setError("")
        try {
            if (!form.title.trim()) {
                throw new Error("กรุณากรอกชื่อ Milestone")
            }
            const body = {
                title: form.title.trim(),
                description: form.description.trim(),
                status: form.status,
                progress: clampProgress(milestone?.progress),
                start_date: form.startDate || null,
                end_date: form.dueDate || null,
                phase: form.phase.trim(),
            }
            const updated = await backend.updateMilestone(Number(id), body)
            setMilestone(normalizeMilestone(updated))
            setIsEditingMilestone(false)
            void refreshSecondary()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "ไม่สามารถบันทึก Milestone ได้")
        } finally {
            setSaving(false)
        }
    }

    const doneTasks = tasks.filter((t) => t.is_done).length
    const progress = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : clampProgress(milestone?.progress)
    const statusConf = STATUS_CONFIG[milestone?.status] || { label: milestone?.status, color: "#6b7280" }

    const visibleTasks = showAllTasks ? tasks : tasks.slice(0, TASKS_PREVIEW_COUNT)
    const visibleActivity = showAllActivity ? activity : activity.slice(0, ACTIVITY_PREVIEW_COUNT)

    const chartData = useMemo(() => toDailyChartData(progressHistory), [progressHistory])

    const bg = isLight ? "#f8fafc" : "#0d1117"
    const cardBg = isLight ? "#ffffff" : "#111827"
    const border = isLight ? "1px solid #e2e8f0" : "1px solid #1f2937"
    const textMain = isLight ? "#0f172a" : "#f9fafb"
    const textSub = isLight ? "#64748b" : "#6b7280"
    const inputBg = isLight ? "#ffffff" : "#0d1117"
    const inputBorder = isLight ? "1px solid #cbd5e1" : "1px solid #1f2937"

    if (loading) {
        return (
            <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: textSub }}>
                กำลังโหลด...
            </div>
        )
    }

    return (
        <div style={{ background: bg, minHeight: "100vh", padding: isMobile ? "16px 14px" : "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: textMain }}>

            {/* Back */}
            <button onClick={() => router.back()} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: textSub, cursor: "pointer", fontSize: 13, marginBottom: 20 }}>
                <ArrowLeft size={15} /> กลับ
            </button>

            {error && <div style={{ color: "#f87171", marginBottom: 14, fontSize: 13 }}>{error}</div>}

            {milestone && (
                <>
                    {/* Header */}
                    <div style={{ background: cardBg, border, borderRadius: 14, padding: isMobile ? "18px 18px" : "24px 28px", marginBottom: 20 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 220 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: textMain }}>{milestone.title}</div>
                                    {milestone.phase && (
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#4f8ef722", color: "#4f8ef7", border: "1px solid #4f8ef744", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999 }}>
                                            <Flag size={11} /> {milestone.phase}
                                        </span>
                                    )}
                                </div>
                                {milestone.description && (
                                    <div style={{ fontSize: 14, color: textSub, lineHeight: 1.6 }}>{milestone.description}</div>
                                )}
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                                <span style={{ background: statusConf.color + "22", color: statusConf.color, border: `1px solid ${statusConf.color}44`, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999, whiteSpace: "nowrap" }}>
                                    {statusConf.label}
                                </span>
                                {isAdmin && (
                                    <button
                                        onClick={() => setIsEditingMilestone(true)}
                                        style={{ display: "flex", alignItems: "center", gap: 6, background: isLight ? "#f1f5f9" : "#1f2937", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 8, color: isLight ? "#334155" : "#9ca3af", fontSize: 12, fontWeight: 600, padding: "7px 14px", cursor: "pointer" }}
                                    >
                                        <Pencil size={13} /> แก้ไข
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 20 }}>
                        <StatCard label="ความคืบหน้า" value={`${progress}%`} color={statusConf.color} isLight={isLight} />
                        <StatCard label="วันเริ่ม" value={formatDate(milestone.startDate)} color="#4f8ef7" isLight={isLight} />
                        <StatCard label="กำหนดเสร็จ" value={formatDate(milestone.dueDate)} color={milestone.status === "overdue" ? "#f87171" : "#f59e0b"} isLight={isLight} />
                        <StatCard label="สถานะ" value={statusConf.label} color={statusConf.color} isLight={isLight} />
                    </div>

                    {/* Content grid: tasks (left) / chart + activity (right) */}
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr", gap: 20, alignItems: "start" }}>

                        {/* LEFT: Tasks */}
                        <div style={{ background: cardBg, border, borderRadius: 14, padding: isMobile ? "18px" : "24px 28px" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 16 }}>
                                Tasks ({doneTasks}/{tasks.length} เสร็จแล้ว)
                            </div>

                            {/* Progress bar */}
                            <div style={{ marginBottom: 18 }}>
                                <div style={{ background: isLight ? "#e2e8f0" : "#1f2937", borderRadius: 999, height: 8, overflow: "hidden" }}>
                                    <div style={{ width: `${progress}%`, height: "100%", background: statusConf.color, borderRadius: 999, transition: "width 0.4s ease" }} />
                                </div>
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
                                <>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {visibleTasks.map((task) => (
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

                                    {tasks.length > TASKS_PREVIEW_COUNT && (
                                        <ExpandButton
                                            expanded={showAllTasks}
                                            onClick={() => setShowAllTasks((v) => !v)}
                                            collapsedLabel={`ดูทั้งหมด (${tasks.length})`}
                                            expandedLabel="ย่อรายการ"
                                            isLight={isLight}
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        {/* RIGHT: chart + activity log */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                            {/* Progress chart */}
                            <div style={{ background: cardBg, border, borderRadius: 14, padding: isMobile ? "18px" : "22px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 16 }}>
                                    <TrendingUp size={14} /> Progress รายวัน
                                </div>

                                {chartData.length === 0 ? (
                                    <div style={{ color: textSub, fontSize: 13, textAlign: "center", padding: "40px 0", fontStyle: "italic" }}>
                                        ยังไม่มีข้อมูลความคืบหน้า
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isLight ? "#e2e8f0" : "#1f2937"} vertical={false} />
                                            <XAxis dataKey="label" tick={{ fill: isLight ? "#64748b" : "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 100]} tick={{ fill: isLight ? "#64748b" : "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ stroke: isLight ? "#cbd5e1" : "#374151" }}
                                                contentStyle={{ background: isLight ? "#ffffff" : "#1f2937", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 8, fontSize: 12, color: isLight ? "#0f172a" : "#e5e7eb" }}
                                                formatter={(value: any) => [`${value}%`, "ความคืบหน้า"]}
                                            />
                                            <Line type="monotone" dataKey="progress" stroke="#4f8ef7" strokeWidth={2} dot={{ r: 3, fill: "#4f8ef7" }} activeDot={{ r: 5 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>

                            {/* Activity log */}
                            <div style={{ background: cardBg, border, borderRadius: 14, padding: isMobile ? "18px" : "22px 24px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#4f8ef7", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 16 }}>
                                    <Activity size={14} /> Activity Log
                                </div>

                                {activity.length === 0 ? (
                                    <div style={{ color: textSub, fontSize: 13, textAlign: "center", padding: "24px 0", fontStyle: "italic" }}>
                                        ยังไม่มีความเคลื่อนไหว
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                            {visibleActivity.map((log) => (
                                                <div key={log.id} style={{ display: "flex", flexDirection: "column", gap: 3, paddingBottom: 10, borderBottom: isLight ? "1px solid #f1f5f9" : "1px solid #1f2937" }}>
                                                    <span style={{ fontSize: 13, color: textMain, lineHeight: 1.5 }}>{log.action}</span>
                                                    <span style={{ fontSize: 11, color: textSub }}>{formatDateTime(log.created_at)}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {activity.length > ACTIVITY_PREVIEW_COUNT && (
                                            <ExpandButton
                                                expanded={showAllActivity}
                                                onClick={() => setShowAllActivity((v) => !v)}
                                                collapsedLabel={`ดูทั้งหมด (${activity.length})`}
                                                expandedLabel="ย่อรายการ"
                                                isLight={isLight}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {isEditingMilestone && isAdmin && (
                        <EditMilestoneModal
                            milestone={milestone}
                            saving={saving}
                            isLight={isLight}
                            isMobile={isMobile}
                            onClose={() => { if (!saving) setIsEditingMilestone(false) }}
                            onSave={handleSaveMilestone}
                        />
                    )}
                </>
            )}
        </div>
    )
}

function StatCard({ label, value, color, isLight }: { label: string; value: string; color: string; isLight: boolean }) {
    return (
        <div
            style={{
                background: isLight ? "#ffffff" : "#111827",
                borderTop: `3px solid ${color}`,
                borderRight: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
                borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
                borderLeft: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
                borderRadius: 12,
                padding: "14px 18px",
                flex: "1 1 160px",
                boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
            }}
        >
            <div style={{ fontSize: 20, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", fontFamily: "monospace" }}>{value}</div>
            <div style={{ fontSize: 12, color: isLight ? "#64748b" : "#6b7280", marginTop: 2 }}>{label}</div>
        </div>
    )
}

function ExpandButton({
    expanded,
    onClick,
    collapsedLabel,
    expandedLabel,
    isLight,
}: {
    expanded: boolean
    onClick: () => void
    collapsedLabel: string
    expandedLabel: string
    isLight: boolean
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                width: "100%",
                marginTop: 12,
                background: "transparent",
                border: "none",
                color: "#4f8ef7",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                padding: "6px 0",
            }}
        >
            {expanded ? expandedLabel : collapsedLabel}
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
    )
}

function EditMilestoneModal({
    milestone,
    saving,
    isLight,
    isMobile,
    onClose,
    onSave,
}: {
    milestone: any
    saving: boolean
    isLight: boolean
    isMobile: boolean
    onClose: () => void
    onSave: (form: MilestoneForm) => Promise<void>
}) {
    const [form, setForm] = useState<MilestoneForm>({
        title: milestone.title ?? "",
        description: milestone.description ?? "",
        status: (milestone.status as MilestoneStatus) ?? "upcoming",
        startDate: toDateInput(milestone.startDate),
        dueDate: toDateInput(milestone.dueDate),
        phase: milestone.phase ?? "",
    })

    function update<K extends keyof MilestoneForm>(key: K, value: MilestoneForm[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    const inputStyle: React.CSSProperties = {
        background: isLight ? "#f8fafc" : "#0d1117",
        border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937",
        borderRadius: 8,
        padding: "9px 12px",
        color: isLight ? "#0f172a" : "#f9fafb",
        fontSize: 13,
        outline: "none",
        width: "100%",
        boxSizing: "border-box",
    }

    return (
        <div
            onClick={onClose}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: isMobile ? "100%" : 520, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: isMobile ? "16px 18px" : "20px 24px", borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937" }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" }}>แก้ไข Milestone</div>
                    <button onClick={onClose} disabled={saving} style={{ background: "transparent", border: "none", color: isLight ? "#64748b" : "#6b7280", fontSize: 16, cursor: "pointer" }}>✕</button>
                </div>

                <div style={{ padding: isMobile ? "16px 18px" : "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="ชื่อ" isLight={isLight}>
                        <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="ชื่อ Milestone" style={inputStyle} />
                    </Field>

                    <Field label="Phase" isLight={isLight}>
                        <input value={form.phase} onChange={(e) => update("phase", e.target.value)} placeholder="เช่น Design, Development, Testing" style={inputStyle} />
                    </Field>

                    <Field label="คำอธิบาย" isLight={isLight}>
                        <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                    </Field>

                    <Field label="สถานะ" isLight={isLight}>
                        <select value={form.status} onChange={(e) => update("status", e.target.value as MilestoneStatus)} style={inputStyle} disabled={saving}>
                            <option value="upcoming">กำลังจะมาถึง</option>
                            <option value="in_progress">กำลังดำเนินการ</option>
                            <option value="completed">เสร็จแล้ว</option>
                            <option value="overdue">เลยกำหนด</option>
                        </select>
                    </Field>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                        <Field label="วันที่เริ่ม" isLight={isLight}>
                            <input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} style={inputStyle} />
                        </Field>
                        <Field label="วันกำหนดส่ง" isLight={isLight}>
                            <input type="date" value={form.dueDate} onChange={(e) => update("dueDate", e.target.value)} style={inputStyle} />
                        </Field>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: isMobile ? "14px 18px" : "16px 24px", borderTop: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937" }}>
                    <button type="button" onClick={onClose} disabled={saving} style={{ background: "transparent", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 8, color: isLight ? "#64748b" : "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer" }}>
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        disabled={saving || !form.title.trim()}
                        onClick={() => void onSave(form)}
                        style={{ background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", opacity: saving || !form.title.trim() ? 0.6 : 1, cursor: saving || !form.title.trim() ? "not-allowed" : "pointer" }}
                    >
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>
        </div>
    )
}

function Field({ label, children, isLight }: { label: string; children: React.ReactNode; isLight: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={{ fontSize: 12, color: isLight ? "#475569" : "#9ca3af", fontWeight: 600 }}>{label}</label>
            {children}
        </div>
    )
}

function clampProgress(value: unknown): number {
    return Math.min(100, Math.max(0, Number(value) || 0))
}

function toDateInput(value: string): string {
    if (!value) return ""
    return value.slice(0, 10)
}

function formatDate(value: string): string {
    if (!value) return "ยังไม่กำหนด"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "ยังไม่กำหนด"
    return date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
}

function formatDateTime(value: string): string {
    if (!value) return ""
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// รวมข้อมูล progress history (บันทึกทุกครั้งที่ task ถูกติ๊ก/ยกเลิกติ๊ก) เป็นรายวัน
// โดยใช้ค่าล่าสุดของแต่ละวันเป็นจุดของกราฟ (progress สะสม ณ สิ้นวันนั้น)
function toDailyChartData(history: ProgressPoint[]): { date: string; label: string; progress: number }[] {
    if (!Array.isArray(history) || history.length === 0) return []

    const sorted = [...history].sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )

    const byDay = new Map<string, number>()
    for (const point of sorted) {
        const date = new Date(point.recorded_at)
        if (Number.isNaN(date.getTime())) continue
        const key = date.toISOString().slice(0, 10)
        byDay.set(key, clampProgress(point.progress))
    }

    return Array.from(byDay.entries()).map(([key, value]) => ({
        date: key,
        label: new Date(`${key}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
        progress: value,
    }))
}