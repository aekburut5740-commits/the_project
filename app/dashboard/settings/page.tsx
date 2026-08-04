"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Bell,
  Lock,
  RefreshCw,
  ShieldCheck,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react"
import { getUser, setToken } from "@/lib/auth"
import { backend } from "@/lib/backend"
import { useTheme } from "@/lib/themeContext"

type Tab = "account" | "notifications" | "users" | "system"

type ProfileUser = {
  id: number
  username: string
  email?: string
  role: "admin" | "customer" | string
}

type SystemUser = {
  id: number
  username: string
  email?: string
  role: "admin" | "customer" | string
  created_at?: string
  createdAt?: string
}

const NOTIFICATION_STORAGE_KEY = "nexus_notifications_enabled"

function normalizeUser(row: any): SystemUser {
  return {
    id: Number(row?.id ?? 0),
    username: String(row?.username ?? "ไม่ระบุชื่อ"),
    email: row?.email ? String(row.email) : "",
    role: String(row?.role ?? "customer"),
    created_at: row?.created_at ?? row?.createdAt ?? "",
  }
}

function formatDate(value?: string) {
  if (!value) return "ไม่ระบุ"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "ไม่ระบุ"
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getInitials(username: string) {
  const trimmed = username.trim()
  if (!trimmed) return "U"
  return trimmed.slice(0, 2).toUpperCase()
}

export default function SettingsPage() {
  const { theme } = useTheme()
  const isLight = theme === "light"
  const tokenUser = getUser()
  const isAdmin = tokenUser?.role === "admin"

  const [activeTab, setActiveTab] = useState<Tab>("account")

  const [profile, setProfile] = useState<ProfileUser>({
    id: Number(tokenUser?.id ?? 0),
    username: tokenUser?.username ?? "",
    email: "",
    role: tokenUser?.role ?? "customer",
  })
  const [username, setUsername] = useState(tokenUser?.username ?? "")
  const [email, setEmail] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [users, setUsers] = useState<SystemUser[]>([])
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState("")

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [savingMaintenance, setSavingMaintenance] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const profileResponse = (await backend.profile()) as {
        user?: ProfileUser
      }

      const loadedProfile: ProfileUser = {
        id: Number(profileResponse?.user?.id ?? tokenUser?.id ?? 0),
        username: String(
          profileResponse?.user?.username ?? tokenUser?.username ?? ""
        ),
        email: String(profileResponse?.user?.email ?? ""),
        role: String(
          profileResponse?.user?.role ?? tokenUser?.role ?? "customer"
        ),
      }

      setProfile(loadedProfile)
      setUsername(loadedProfile.username)
      setEmail(loadedProfile.email ?? "")

      const storedNotificationValue = window.localStorage.getItem(
        NOTIFICATION_STORAGE_KEY
      )
      setNotificationsEnabled(storedNotificationValue !== "false")

      if (isAdmin) {
        const [maintenanceResponse, userRows] = await Promise.all([
          backend.maintenance(),
          backend.users(),
        ])

        setMaintenanceMode(Boolean(maintenanceResponse?.is_active))
        setMaintenanceMessage(String(maintenanceResponse?.message ?? ""))
        setUsers(
          (Array.isArray(userRows) ? userRows : [])
            .map(normalizeUser)
            .filter((item) => item.id > 0)
        )
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถโหลดการตั้งค่าได้"
      )
    } finally {
      setLoading(false)
    }
  }, [isAdmin, tokenUser?.id, tokenUser?.role, tokenUser?.username])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const profileChanged =
    username.trim() !== profile.username ||
    email.trim() !== (profile.email ?? "")

  const adminCount = useMemo(
    () => users.filter((item) => item.role === "admin").length,
    [users]
  )

  const customerCount = users.length - adminCount

  function clearStatus() {
    setMessage("")
    setError("")
  }

  async function handleSaveProfile() {
    clearStatus()

    const cleanUsername = username.trim()
    const cleanEmail = email.trim()

    if (!cleanUsername) {
      setError("กรุณากรอกชื่อผู้ใช้งาน")
      return
    }

    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง")
      return
    }

    setSavingProfile(true)

    try {
      const response = (await backend.updateProfile(
        cleanUsername,
        cleanEmail
      )) as any

      const updatedUser = response?.user ?? response ?? {}
      const nextProfile: ProfileUser = {
        id: Number(updatedUser.id ?? profile.id),
        username: String(updatedUser.username ?? cleanUsername),
        email: String(updatedUser.email ?? cleanEmail),
        role: String(updatedUser.role ?? profile.role),
      }

      setProfile(nextProfile)
      setUsername(nextProfile.username)
      setEmail(nextProfile.email ?? "")

      // บาง Backend จะคืน token ใหม่หลังเปลี่ยน username
      if (typeof response?.token === "string" && response.token) {
        setToken(response.token)
      }

      setMessage("บันทึกข้อมูลบัญชีสำเร็จ")
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "บันทึกข้อมูลบัญชีไม่สำเร็จ"
      )
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    clearStatus()

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("กรุณากรอกรหัสผ่านให้ครบทุกช่อง")
      return
    }

    if (newPassword.length < 6) {
      setError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน")
      return
    }

    if (oldPassword === newPassword) {
      setError("รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเดิม")
      return
    }

    setChangingPassword(true)

    try {
      await backend.changePassword(oldPassword, newPassword)
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage("เปลี่ยนรหัสผ่านสำเร็จ")
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "เปลี่ยนรหัสผ่านไม่สำเร็จ"
      )
    } finally {
      setChangingPassword(false)
    }
  }

  function handleNotificationToggle() {
    const nextValue = !notificationsEnabled
    setNotificationsEnabled(nextValue)
    window.localStorage.setItem(
      NOTIFICATION_STORAGE_KEY,
      String(nextValue)
    )
    setMessage(
      nextValue
        ? "เปิดการแจ้งเตือนสำหรับเบราว์เซอร์นี้แล้ว"
        : "ปิดการแจ้งเตือนสำหรับเบราว์เซอร์นี้แล้ว"
    )
    setError("")
  }

  async function handleSaveMaintenance() {
    if (!isAdmin) return

    clearStatus()
    setSavingMaintenance(true)

    try {
      await backend.setMaintenance(
        maintenanceMode,
        maintenanceMessage.trim()
      )
      setMessage(
        maintenanceMode
          ? "เปิด Maintenance Mode สำเร็จ"
          : "ปิด Maintenance Mode สำเร็จ"
      )
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "บันทึกสถานะระบบไม่สำเร็จ"
      )
    } finally {
      setSavingMaintenance(false)
    }
  }

  const tabs: Array<{
    id: Tab
    label: string
    icon: React.ReactNode
    adminOnly?: boolean
  }> = [
    {
      id: "account",
      label: "ข้อมูลบัญชี",
      icon: <UserRound size={17} />,
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell size={17} />,
    },
    {
      id: "users",
      label: "จัดการผู้ใช้",
      icon: <UsersRound size={17} />,
      adminOnly: true,
    },
    {
      id: "system",
      label: "ระบบ",
      icon: <Wrench size={17} />,
      adminOnly: true,
    },
  ]

  return (
    <main className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"}`}>
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
              จัดการข้อมูลบัญชี รหัสผ่าน และการตั้งค่าที่ระบบรองรับจริง
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "กำลังโหลด..." : "รีเฟรช"}
          </button>
        </header>

        {(message || error) && (
          <div
            role="status"
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              error
                ? "border-red-800 bg-red-950/50 text-red-300"
                : "border-emerald-800 bg-emerald-950/50 text-emerald-300"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className={`h-fit space-y-4 rounded-3xl border p-5 shadow-xl ${isLight ? "border-slate-200 bg-white shadow-slate-200/50" : "border-slate-800 bg-slate-900 shadow-black/20"}`}>
            <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              เมนู Settings
            </p>

            <nav className="space-y-2">
              {tabs
                .filter((tab) => !tab.adminOnly || isAdmin)
                .map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id)
                      clearStatus()
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? (isLight ? "bg-blue-600 text-white shadow-sm" : "bg-slate-800 text-white shadow-inner")
                        : (isLight ? "bg-slate-50 text-slate-700 hover:bg-slate-100" : "bg-slate-950/70 text-slate-300 hover:bg-slate-800")
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
            </nav>

            <div className={`rounded-2xl border p-4 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/70"}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 font-bold text-slate-950">
                  {getInitials(profile.username)}
                </div>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                    {profile.username || "ไม่ระบุชื่อ"}
                  </p>
                  <p className={`mt-1 text-xs capitalize ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    {profile.role}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <section className={`min-w-0 rounded-3xl border p-5 shadow-xl sm:p-8 ${isLight ? "border-slate-200 bg-white shadow-slate-200/50 text-slate-900" : "border-slate-800 bg-slate-900 shadow-black/20 text-slate-100"}`}>
            {loading ? (
              <div className="py-20 text-center text-sm text-slate-400">
                กำลังโหลดการตั้งค่า...
              </div>
            ) : activeTab === "account" ? (
              <>
                <div className="mb-8">
                  <p className={`text-sm uppercase tracking-[0.24em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    Account
                  </p>
                  <h2 className={`mt-3 text-2xl font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                    ข้อมูลบัญชี
                  </h2>
                  <p className={`mt-2 max-w-2xl text-sm leading-7 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    ชื่อผู้ใช้ อีเมล และรหัสผ่านในหน้านี้บันทึกผ่าน Backend
                    โดยตรง
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label className={`block rounded-3xl border p-5 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/70"}`}>
                    <span className={`text-sm font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      ชื่อผู้ใช้งาน
                    </span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      className={`mt-3 w-full border-b bg-transparent pb-2 outline-none transition focus:border-sky-500 ${isLight ? "border-slate-300 text-slate-900" : "border-slate-800 text-white"}`}
                    />
                  </label>

                  <label className={`block rounded-3xl border p-5 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/70"}`}>
                    <span className={`text-sm font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      อีเมล
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      placeholder="name@example.com"
                      className={`mt-3 w-full border-b bg-transparent pb-2 outline-none transition focus:border-sky-500 ${isLight ? "border-slate-300 text-slate-900" : "border-slate-800 text-white"}`}
                    />
                  </label>
                </div>

                <div className={`mt-5 flex flex-col gap-3 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/70"}`}>
                  <div>
                    <p className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                      บันทึกข้อมูลบัญชี
                    </p>
                    <p className={`mt-1 text-xs ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                      {profileChanged
                        ? "มีข้อมูลที่ยังไม่ได้บันทึก"
                        : "ข้อมูลล่าสุดถูกบันทึกแล้ว"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveProfile()}
                    disabled={!profileChanged || savingProfile}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>

                <div className={`mt-7 rounded-3xl border p-5 sm:p-6 ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/70"}`}>
                  <div className={`flex items-center gap-3 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    <Lock size={18} />
                    <div>
                      <p className={`text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                        เปลี่ยนรหัสผ่าน
                      </p>
                      <p className={`mt-1 text-sm ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                        กรอกรหัสผ่านเดิมและยืนยันรหัสผ่านใหม่ก่อนบันทึก
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <input
                      value={oldPassword}
                      onChange={(event) => setOldPassword(event.target.value)}
                      placeholder="รหัสผ่านเดิม"
                      type="password"
                      autoComplete="current-password"
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-500 ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-white"}`}
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="รหัสผ่านใหม่"
                        type="password"
                        autoComplete="new-password"
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-500 ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-white"}`}
                      />
                      <input
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="ยืนยันรหัสผ่านใหม่"
                        type="password"
                        autoComplete="new-password"
                        className={`w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-sky-500 ${isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-white"}`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleChangePassword()}
                    disabled={changingPassword}
                    className={`mt-4 inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 ${isLight ? "border-slate-300 bg-white text-slate-900 hover:bg-slate-100" : "border-slate-700 bg-slate-800 text-white"}`}
                  >
                    {changingPassword
                      ? "กำลังเปลี่ยนรหัสผ่าน..."
                      : "เปลี่ยนรหัสผ่าน"}
                  </button>
                </div>
              </>
            ) : activeTab === "notifications" ? (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                    Notifications
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    การแจ้งเตือนของบัญชี
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    Backend ยังไม่มีช่องบันทึกการตั้งค่านี้ จึงเก็บไว้ใน
                    Browser เครื่องนี้แทน และจะไม่หายเมื่อรีเฟรชหน้า
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        เปิดการแจ้งเตือนใน Dashboard
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        ค่านี้ควบคุมการแสดงผลสำหรับ Browser ปัจจุบัน
                        แต่ยังไม่ได้ลบข้อมูล Notification ในฐานข้อมูล
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={notificationsEnabled}
                      onClick={handleNotificationToggle}
                      className={`inline-flex min-w-28 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                        notificationsEnabled
                          ? "bg-sky-500 text-slate-950"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      <Bell size={16} className="mr-2" />
                      {notificationsEnabled ? "เปิดแล้ว" : "ปิดแล้ว"}
                    </button>
                  </div>

                  <Link
                    href="/dashboard/notifications"
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-600 hover:bg-slate-800"
                  >
                    ไปที่หน้า Notifications
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </>
            ) : activeTab === "users" && isAdmin ? (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                    Users
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    รายชื่อผู้ใช้ในระบบ
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    หน้านี้อ่านข้อมูลจริงจาก Backend ปัจจุบัน Backend
                    ยังไม่มี API สำหรับเปลี่ยน Role หรือลบผู้ใช้
                    จึงยังไม่แสดงปุ่มที่ทำงานเพียงชั่วคราวบนหน้าเว็บ
                  </p>
                </div>

                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  {[
                    ["ผู้ใช้ทั้งหมด", users.length],
                    ["Admin", adminCount],
                    ["Customer", customerCount],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-white">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {users.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-700 px-5 py-12 text-center text-sm text-slate-500">
                    ยังไม่มีข้อมูลผู้ใช้
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((item) => (
                      <article
                        key={item.id}
                        className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
                            {getInitials(item.username)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {item.username}
                              {item.id === profile.id ? " (คุณ)" : ""}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-400">
                              {item.email || "ไม่ได้ระบุอีเมล"}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              สร้างเมื่อ{" "}
                              {formatDate(item.created_at ?? item.createdAt)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
                            item.role === "admin"
                              ? "border-violet-700 bg-violet-950/50 text-violet-300"
                              : "border-sky-800 bg-sky-950/50 text-sky-300"
                          }`}
                        >
                          {item.role}
                        </span>
                      </article>
                    ))}
                  </div>
                )}
              </>
            ) : activeTab === "system" && isAdmin ? (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                    System
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Maintenance Mode
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                    สถานะและข้อความด้านล่างบันทึกลง Backend จริง
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        size={20}
                        className={
                          maintenanceMode
                            ? "mt-0.5 text-rose-400"
                            : "mt-0.5 text-emerald-400"
                        }
                      />
                      <div>
                        <p className="text-sm font-semibold text-white">
                          สถานะระบบ
                        </p>
                        <p className="mt-2 text-sm text-slate-400">
                          {maintenanceMode
                            ? "ระบบอยู่ใน Maintenance Mode"
                            : "ระบบเปิดใช้งานตามปกติ"}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={maintenanceMode}
                      onClick={() =>
                        setMaintenanceMode((current) => !current)
                      }
                      className={`inline-flex min-w-28 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                        maintenanceMode
                          ? "bg-rose-500 text-white"
                          : "bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {maintenanceMode ? "เปิดอยู่" : "ปิดอยู่"}
                    </button>
                  </div>

                  <label className="mt-6 block">
                    <span className="text-sm font-semibold text-slate-300">
                      ข้อความ Maintenance
                    </span>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(event) =>
                        setMaintenanceMessage(event.target.value)
                      }
                      rows={4}
                      placeholder="เช่น ระบบอยู่ระหว่างปรับปรุง กรุณาลองใหม่ภายหลัง"
                      className="mt-3 w-full resize-y rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-500"
                    />
                  </label>

                  <div className="mt-5 rounded-2xl border border-amber-900/70 bg-amber-950/30 p-4 text-sm leading-6 text-amber-200">
                    การเปิดโหมดนี้เป็นการเปลี่ยนค่าระบบจริง
                    ควรเปิดเฉพาะช่วงที่กำลังบำรุงรักษา
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveMaintenance()}
                    disabled={savingMaintenance}
                    className="mt-5 inline-flex items-center justify-center rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingMaintenance
                      ? "กำลังบันทึก..."
                      : "บันทึกสถานะระบบ"}
                  </button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}