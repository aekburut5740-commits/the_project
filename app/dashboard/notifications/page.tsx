"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Bell, Trash2, CheckCheck } from "lucide-react"
import { getUser } from "@/lib/auth"

interface NotificationItem {
  id: number
  message: string
  created_at: string
  is_read: boolean
  project_id?: number
  url?: string | null
}

export default function NotificationsPage() {
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
        const token = localStorage.getItem("token")
        const res = await fetch("http://localhost:4000/api/notifications", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.message || "ไม่สามารถโหลดแจ้งเตือนได้")
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
      const token = localStorage.getItem("token")
      const res = await fetch(`http://localhost:4000/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "ไม่สามารถอัปเดตการแจ้งเตือนได้")
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถอัปเดตสถานะอ่านได้")
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("http://localhost:4000/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || "ไม่สามารถอ่านการแจ้งเตือนทั้งหมดได้")
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถอ่านทั้งหมดได้")
    }
  }

  const handleDelete = (id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
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
            <NotificationGroup title="วันนี้" items={grouped.today} onMarkRead={handleMarkRead} onDelete={handleDelete} />
          )}
          {grouped.earlier.length > 0 && (
            <NotificationGroup title="ก่อนหน้า" items={grouped.earlier} onMarkRead={handleMarkRead} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  )
}

function NotificationGroup({ title, items, onMarkRead, onDelete }: {
  title: string
  items: NotificationItem[]
  onMarkRead: (id: number) => void
  onDelete: (id: number) => void
}) {
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

const S: Record<string, React.CSSProperties> = {
  page: {
    background: "#0d1117",
    minHeight: "100vh",
    padding: "28px 32px",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
    color: "#e5e7eb",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  markAllBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: "#1f2937",
    border: "1px solid #374151",
    borderRadius: 8,
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: 600,
    padding: "8px 16px",
    cursor: "pointer",
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#4b5563",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  notifCard: {
    border: "1px solid #1f2937",
    borderRadius: 14,
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#111827",
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
    color: "#f9fafb",
    marginBottom: 6,
  },
  notifMeta: {
    fontSize: 12,
    color: "#9ca3af",
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
    color: "#9ca3af",
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
  },
}
