"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Bell, Trash2, CheckCheck } from "lucide-react"
import { getUser } from "@/lib/auth"
import { backend } from "@/lib/backend"
import { useTheme } from "@/lib/themeContext"

interface NotificationItem {
  id: number
  message: string
  created_at: string
  is_read: boolean
  project_id?: number
  url?: string | null
}

export default function NotificationsPage() {
  const { theme } = useTheme()
  const isLight = theme === "light"
  const S = getStyles(isLight)
  const user = getUser()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setError("กรุณาเข้าสู่ระบบก่อน")
        setLoading(false)
        return
      }

      try {
        const data = await backend.notifications()
        setNotifications(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดแจ้งเตือนได้")
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [user])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])

  const grouped = useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24
    return {
      today: notifications.filter((n) => new Date(n.created_at).getTime() > cutoff),
      earlier: notifications.filter((n) => new Date(n.created_at).getTime() <= cutoff),
    }
  }, [notifications])

  const handleMarkRead = async (id: number) => {
    try {
      await backend.markNotificationRead(id)
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถอัปเดตสถานะอ่านได้")
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await backend.markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถอ่านทั้งหมดได้")
    }
  }

  const handleDelete = async (id: number) => {
    const prevState = notifications
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await backend.deleteNotification(id)
    } catch (err) {
      setNotifications(prevState)
      setError(err instanceof Error ? err.message : "ไม่สามารถลบแจ้งเตือนได้")
    }
  }

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.emptyState}>กำลังโหลดแจ้งเตือน...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={S.page}>
        <div style={S.emptyState}>{error}</div>
      </div>
    )
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Notifications</h1>
          <p style={S.subtitle}>{unreadCount > 0 ? `${unreadCount} แจ้งเตือนที่ยังไม่ได้อ่าน` : "อ่านครบทุกอันแล้ว"}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={S.markAllBtn}>
            <CheckCheck size={14} /> อ่านทั้งหมด
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={S.emptyState}>
          <Bell size={40} color="#1f2937" />
          <div style={{ fontSize: 14, color: "#374151", marginTop: 12 }}>ไม่มีแจ้งเตือน</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {grouped.today.length > 0 && (
            <NotificationGroup title="วันนี้" items={grouped.today} onMarkRead={handleMarkRead} onDelete={handleDelete} isLight={isLight} />
          )}
          {grouped.earlier.length > 0 && (
            <NotificationGroup title="ก่อนหน้า" items={grouped.earlier} onMarkRead={handleMarkRead} onDelete={handleDelete} isLight={isLight} />
          )}
        </div>
      )}
    </div>
  )
}

function NotificationGroup({ title, items, onMarkRead, onDelete, isLight = false }: {
  title: string
  items: NotificationItem[]
  onMarkRead: (id: number) => void
  onDelete: (id: number) => void
  isLight?: boolean
}) {
  const S = getStyles(isLight)
  return (
    <div>
      <div style={S.groupLabel}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <div key={item.id} style={S.notifCard}>
            <div style={S.iconWrap}>
              <Bell size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.notifTitle}>{item.message}</div>
              <div style={S.notifMeta}>{new Date(item.created_at).toLocaleString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div style={S.actions} onClick={(e) => e.stopPropagation()}>
              {!item.is_read && (
                <button onClick={() => onMarkRead(item.id)} style={S.actionBtn} title="ทำเครื่องหมายว่าอ่านแล้ว">
                  <CheckCheck size={13} />
                </button>
              )}
              <button onClick={() => onDelete(item.id)} style={{ ...S.actionBtn, color: "#f87171" }} title="ลบ">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getStyles(isLight: boolean): Record<string, React.CSSProperties> {
  return {
    page: {
      background: isLight ? "#f8fafc" : "#0d1117",
      minHeight: "100vh",
      padding: "28px 32px",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      color: isLight ? "#0f172a" : "#e5e7eb",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
    subtitle: { fontSize: 13, color: isLight ? "#64748b" : "#6b7280", margin: "4px 0 0" },
    markAllBtn: {
      display: "flex",
      alignItems: "center",
      gap: 7,
      background: isLight ? "#ffffff" : "#1f2937",
      border: isLight ? "1px solid #cbd5e1" : "1px solid #374151",
      borderRadius: 8,
      color: isLight ? "#334155" : "#9ca3af",
      fontSize: 13,
      fontWeight: 600,
      padding: "8px 16px",
      cursor: "pointer",
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: 700,
      color: isLight ? "#64748b" : "#4b5563",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      marginBottom: 10,
    },
    notifCard: {
      border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937",
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      background: isLight ? "#ffffff" : "#111827",
      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(79, 142, 247, 0.15)",
      color: "#4f8ef7",
      flexShrink: 0,
    },
    notifTitle: {
      fontSize: 14,
      fontWeight: 600,
      color: isLight ? "#0f172a" : "#f9fafb",
      marginBottom: 6,
    },
    notifMeta: {
      fontSize: 12,
      color: isLight ? "#64748b" : "#9ca3af",
    },
    actions: {
      display: "flex",
      flexDirection: "column" as const,
      gap: 8,
      alignItems: "flex-end",
    },
    actionBtn: {
      background: "transparent",
      border: "none",
      color: isLight ? "#64748b" : "#9ca3af",
      cursor: "pointer",
      padding: 6,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
    },
    emptyState: {
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 0",
      color: isLight ? "#94a3b8" : "#4b5563",
    },
  }
}
