"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export type NotifType = "project" | "milestone" | "document" | "system"

export interface Notification {
  id: number
  type: NotifType
  title: string
  message: string
  time: Date
  read: boolean
  forUserId: number | "all" // "all" = admin เห็น, number = เฉพาะ user นั้น + admin
}

interface NotifContextValue {
  notifications: Notification[]
  unreadCount: (userId: number, isAdmin: boolean) => number
  getForUser: (userId: number, isAdmin: boolean) => Notification[]
  addNotif: (n: Omit<Notification, "id" | "time" | "read">) => void
  markRead: (id: number) => void
  markAllRead: (userId: number, isAdmin: boolean) => void
  deleteNotif: (id: number) => void
}

// ─── Initial mock data ────────────────────────────────────────────────────────

const INITIAL: Notification[] = [
  {
    id: 1, type: "project", read: false, forUserId: "all",
    title: "โปรเจคใหม่ถูกสร้าง",
    message: "Admin สร้างโปรเจค \"BrandCo Redesign\" แล้ว",
    time: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: 2, type: "milestone", read: false, forUserId: 2,
    title: "Milestone เสร็จแล้ว",
    message: "UI Design Completion ใน BrandCo Redesign เสร็จสมบูรณ์",
    time: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 3, type: "document", read: false, forUserId: 2,
    title: "อัปโหลดเอกสารใหม่",
    message: "Admin อัปโหลด Design_Brief_BrandCo.pdf ในโปรเจคของคุณ",
    time: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: 4, type: "milestone", read: true, forUserId: 3,
    title: "Milestone เลยกำหนด",
    message: "Launch & Deployment ใน MediCare Portal เลยกำหนดแล้ว",
    time: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: 5, type: "project", read: true, forUserId: 3,
    title: "สถานะโปรเจคเปลี่ยนแปลง",
    message: "Admin อัปเดตสถานะ MediCare Portal เป็น \"เสร็จแล้ว\"",
    time: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: 6, type: "system", read: true, forUserId: "all",
    title: "ยินดีต้อนรับ",
    message: "ระบบพร้อมใช้งานแล้ว",
    time: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
]

// ─── Context ──────────────────────────────────────────────────────────────────

const NotifContext = createContext<NotifContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL)

  // กรองตาม user
  const getForUser = useCallback((userId: number, isAdmin: boolean): Notification[] => {
    if (isAdmin) return notifications // admin เห็นทั้งหมด
    return notifications.filter(
      (n) => n.forUserId === "all" || n.forUserId === userId
    )
  }, [notifications])

  const unreadCount = useCallback((userId: number, isAdmin: boolean): number => {
    return getForUser(userId, isAdmin).filter((n) => !n.read).length
  }, [getForUser])

  const addNotif = useCallback((n: Omit<Notification, "id" | "time" | "read">) => {
    setNotifications((prev) => [
      { ...n, id: Date.now(), time: new Date(), read: false },
      ...prev,
    ])
  }, [])

  const markRead = useCallback((id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback((userId: number, isAdmin: boolean) => {
    setNotifications((prev) => prev.map((n) => {
      const visible = isAdmin || n.forUserId === "all" || n.forUserId === userId
      return visible ? { ...n, read: true } : n
    }))
  }, [])

  const deleteNotif = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, getForUser, addNotif, markRead, markAllRead, deleteNotif }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
