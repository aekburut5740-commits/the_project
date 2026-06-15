"use client"

import { useMemo } from "react"
import { Bell, FolderKanban, Flag, FileText, Settings, Trash2, CheckCheck } from "lucide-react"
import { useNotifications, type NotifType } from "@/lib/notificationStore"
import { MOCK_CURRENT_USER } from "@/lib/mockData"

const TYPE_CONFIG: Record<NotifType, { label: string; color: string; icon: React.ReactNode }> = {
  project: { label: "โปรเจค", color: "#4f8ef7", icon: <FolderKanban size={14} /> },
  milestone: { label: "Milestone", color: "#a78bfa", icon: <Flag size={14} /> },
  document: { label: "เอกสาร", color: "#34d399", icon: <FileText size={14} /> },
  system: { label: "ระบบ", color: "#6b7280", icon: <Settings size={14} /> },
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return "เมื่อกี้"
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`
  return `${Math.floor(diff / 86400)} วันที่แล้ว`
}

export default function NotificationsPage() {
  // TODO: เปลี่ยนเป็น useRole() เมื่อ connect API
  const user = MOCK_CURRENT_USER
  const isAdmin = user.role === "admin"

  const { getForUser, unreadCount, markRead, markAllRead, deleteNotif } = useNotifications()

  const myNotifs = useMemo(
    () => getForUser(user.id, isAdmin),
    [getForUser, user.id, isAdmin]
  )

  const myUnread = unreadCount(user.id, isAdmin)

  const grouped = useMemo(() => {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24
    return {
      today: myNotifs.filter((n) => n.time.getTime() > cutoff),
      earlier: myNotifs.filter((n) => n.time.getTime() <= cutoff),
    }
  }, [myNotifs])

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Notifications</h1>
          <p style={S.subtitle}>
            {myUnread > 0 ? `${myUnread} แจ้งเตือนที่ยังไม่ได้อ่าน` : "อ่านครบทุกอันแล้ว"}
          </p>
        </div>
        {myUnread > 0 && (
          <button onClick={() => markAllRead(user.id, isAdmin)} style={S.markAllBtn}>
            <CheckCheck size={14} /> อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Role badge */}
      <div style={{ marginBottom: 24 }}>
        <span style={{
          ...S.roleBadge,
          background: isAdmin ? "#4f8ef722" : "#34d39922",
          color: isAdmin ? "#4f8ef7" : "#34d399",
          border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}`,
        }}>
          {isAdmin ? "👑 Admin — เห็นแจ้งเตือนทั้งหมดของระบบ" : "👤 Customer — เห็นเฉพาะแจ้งเตือนที่เกี่ยวกับคุณ"}
        </span>
      </div>

      {myNotifs.length === 0 ? (
        <div style={S.emptyState}>
          <Bell size={40} color="#1f2937" />
          <div style={{ fontSize: 14, color: "#374151", marginTop: 12 }}>ไม่มีแจ้งเตือน</div>
          {/* TODO: fetch GET /api/notifications เมื่อ connect API */}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {grouped.today.length > 0 && (
            <NotifGroup title="วันนี้" items={grouped.today}
              onMarkRead={markRead} onDelete={deleteNotif} />
          )}
          {grouped.earlier.length > 0 && (
            <NotifGroup title="ก่อนหน้า" items={grouped.earlier}
              onMarkRead={markRead} onDelete={deleteNotif} />
          )}
        </div>
      )}

      {/* TODO: เมื่อ connect API ให้ replace mock ด้วย
          GET  /api/notifications        — ดึงรายการ
          PUT  /api/notifications/:id    — mark read
          DELETE /api/notifications/:id — ลบ
      */}
    </div>
  )
}

function NotifGroup({ title, items, onMarkRead, onDelete }: {
  title: string
  items: ReturnType<typeof useNotifications>["notifications"]
  onMarkRead: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <div>
      <div style={S.groupLabel}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((n) => {
          const { color, icon } = TYPE_CONFIG[n.type]
          return (
            <div
              key={n.id}
              onClick={() => !n.read && onMarkRead(n.id)}
              style={{
                ...S.notifCard,
                // unread: พื้นหลังเข้ม border สี cursor pointer
                // read: จางลง ไม่มี cursor
                background: n.read ? "transparent" : "#111827",
                borderLeftColor: n.read ? "#0d1117" : color,
                cursor: n.read ? "default" : "pointer",
              }}
            >
              {/* Icon */}
              <div style={{
                ...S.iconWrap,
                background: color + "22",
                color: color,
              }}>
                {icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: n.read ? 400 : 700,
                    color: "#f9fafb",  // สีเดิมเหมือนกันทั้งคู่
                  }}>
                    {n.title}
                  </span>
                  {/* จุดน้ำเงิน เฉพาะยังไม่อ่าน */}
                  {!n.read && <span style={S.unreadDot} />}
                </div>
                <div style={{
                  fontSize: 13,
                  color: "#9ca3af",
                  lineHeight: 1.5,
                }}>
                  {n.message}
                </div>
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6 }}>
                </div>
              </div>

              {/* Actions — ยังคลิกได้แม้ read แล้ว (ลบได้ตลอด) */}
              <div
                style={S.actions}
                onClick={(e) => e.stopPropagation()}
              >
                {!n.read && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    style={{ ...S.actionBtn, pointerEvents: "auto" }}
                    title="ทำเครื่องหมายว่าอ่านแล้ว"
                  >
                    <CheckCheck size={13} />
                  </button>
                )}
                <button
                  onClick={() => onDelete(n.id)}
                  style={{ ...S.actionBtn, color: "#f87171", pointerEvents: "auto" }}
                  title="ลบ"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    background: "#0d1117", minHeight: "100vh", padding: "28px 32px",
    fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e7eb",
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  markAllBtn: {
    display: "flex", alignItems: "center", gap: 7,
    background: "#1f2937", border: "1px solid #374151", borderRadius: 8,
    color: "#9ca3af", fontSize: 13, fontWeight: 600,
    padding: "8px 16px", cursor: "pointer",
  },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  groupLabel: {
    fontSize: 11, fontWeight: 700, color: "#4b5563",
    letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10,
  },
  notifCard: {
    border: "1px solid #1f2937",
    borderLeft: "3px solid",
    borderRadius: 12,
    padding: "14px 16px",
    display: "flex", alignItems: "flex-start", gap: 14,
    transition: "opacity 0.2s, background 0.2s",
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  unreadDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#4f8ef7", flexShrink: 0,
  },
  actions: {
    display: "flex", flexDirection: "column" as const,
    gap: 6, flexShrink: 0,
  },
  actionBtn: {
    background: "transparent", border: "none",
    color: "#4b5563", cursor: "pointer", padding: 4,
    display: "flex", alignItems: "center", borderRadius: 4,
  },
  emptyState: {
    display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center", padding: "80px 0",
  },
}