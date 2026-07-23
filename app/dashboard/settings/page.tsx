"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Camera, Bell, User as UserIcon, Mail, Lock, ArrowRight } from "lucide-react"
import { type User } from "@/lib/mockData"
import { getUser } from "@/lib/auth"
import { backend } from "@/lib/backend"

export default function SettingsPage() {
  const user = getUser() || { id: 0, username: "", role: "customer" as const }
  const isAdmin = user.role === "admin"
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [editing, setEditing] = useState(false)
  const [users, setUsers] = useState<import("@/lib/mockData").User[]>([])
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [saveMessage, setSaveMessage] = useState("")
  const [saveError, setSaveError] = useState("")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const profile = await backend.profile()
        setUsername(profile.user.username)
        setEmail((profile.user as any).email || "")
        const maintenance = await backend.maintenance()
        setMaintenanceMode(Boolean(maintenance?.is_active))
        if (isAdmin) setUsers(await backend.users())
      } catch (error) {
        console.error("Error occurred while loading settings:", error)
      }
    }
    loadSettings()
  }, [isAdmin])

  const handleSaveProfile = async () => {
    setSaveMessage("")
    setSaveError("")
    try {
      const updated = await backend.updateProfile(username, email) as any
      setUsername(updated.username ?? username)
      setEmail(updated.email ?? email)
      setEditing(false)
      setSaveMessage("บันทึกข้อมูลบัญชีสำเร็จ")
    } catch (error) {
      const message = error instanceof Error ? error.message : "บันทึกข้อมูลบัญชีไม่สำเร็จ"
      setSaveError(message)
      console.error("Error occurred while updating profile:", error)
    }
  }

  const handleChangePassword = async () => {
    setSaveMessage("")
    setSaveError("")
    if (!oldPassword || !newPassword) {
      setSaveError("กรุณากรอกรหัสผ่านเดิมและรหัสผ่านใหม่")
      return
    }
    try {
      await backend.changePassword(oldPassword, newPassword)
      setOldPassword("")
      setNewPassword("")
      setSaveMessage("เปลี่ยนรหัสผ่านสำเร็จ")
    } catch (error) {
      const message = error instanceof Error ? error.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ"
      setSaveError(message)
      console.error("Error occurred while changing password:", error)
    }
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setAvatar(reader.result as string)
    reader.readAsDataURL(file)
  }

  function toggleNotifications() {
    setNotificationsEnabled((current) => !current)
  }

  const initials = username
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const [activeTab, setActiveTab] = useState<"account" | "notifications" | "users" | "system">("account")

  async function toggleMaintenance() {
    const next = !maintenanceMode
    try { await backend.setMaintenance(next); setMaintenanceMode(next) } catch (error) { console.error("Error occurred while updating maintenance:", error) }
  }

  function toggleUserRole(id: number) {
    setUsers((current) => current.map((item) =>
      item.id === id
        ? { ...item, role: item.role === "admin" ? "customer" : "admin" }
        : item
    ))
  }

  function deleteUser(id: number) {
    if (id === user.id) return
    setUsers((current) => current.filter((item) => item.id !== id))
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold text-white">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              จัดการข้อมูลบัญชีและการแจ้งเตือนหลัก โดยไม่ซ้ำกับหน้าการแจ้งเตือนหลักของระบบ
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">เมนู Setting</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveTab("account")}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === "account" ? "bg-slate-800 text-white shadow-inner" : "bg-slate-950/70 text-slate-300 hover:bg-slate-800"}`}
              >
                ข้อมูลบัญชี
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === "notifications" ? "bg-slate-800 text-white shadow-inner" : "bg-slate-950/70 text-slate-300 hover:bg-slate-800"}`}
              >
                Notifications
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveTab("users")}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === "users" ? "bg-slate-800 text-white shadow-inner" : "bg-slate-950/70 text-slate-300 hover:bg-slate-800"}`}
                  >
                    จัดการผู้ใช้
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("system")}
                    className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${activeTab === "system" ? "bg-slate-800 text-white shadow-inner" : "bg-slate-950/70 text-slate-300 hover:bg-slate-800"}`}
                  >
                    ระบบ
                  </button>
                </>
              )}
            </div>
          </aside>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl shadow-black/20">
            {activeTab === "account" ? (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">ข้อมูลบัญชี</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">แก้ไขข้อมูลบัญชี</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    ปรับชื่อผู้ใช้งานและอีเมลได้จากที่นี่ หากต้องการเปลี่ยนรหัสผ่านให้ใช้ฟอร์มด้านล่าง
                  </p>
                </div>

                {saveMessage && <div className="mb-5 rounded-2xl border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">{saveMessage}</div>}
                {saveError && <div className="mb-5 rounded-2xl border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">{saveError}</div>}

                <div className="grid gap-6 md:grid-cols-2">
                  <label className="block rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <span className="text-sm font-semibold text-slate-300">ชื่อผู้ใช้งาน</span>
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="mt-3 w-full bg-transparent text-white outline-none"
                    />
                  </label>
                  <label className="block rounded-3xl border border-slate-800 bg-slate-950/70 p-4">
                    <span className="text-sm font-semibold text-slate-300">อีเมล</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-3 w-full bg-transparent text-white outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Lock size={18} />
                    <div>
                      <p className="text-sm font-semibold">เปลี่ยนรหัสผ่าน</p>
                      <p className="text-sm text-slate-500">ตั้งค่ารหัสผ่านใหม่หรือรีเซ็ตรหัสผ่านได้ที่นี่</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <input value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="รหัสผ่านเดิม" type="password" className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-white outline-none" />
                    <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="รหัสผ่านใหม่" type="password" className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-white outline-none" />
                  </div>
                  <button type="button" onClick={handleChangePassword} className="mt-4 inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition">
                    เปลี่ยนรหัสผ่าน
                  </button>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">บันทึกการเปลี่ยนแปลงข้อมูลบัญชี</p>
                  </div>
                  <button type="button" onClick={handleSaveProfile} className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition">
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </>
            ) : activeTab === "notifications" ? (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Notifications</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">ตั้งค่าการแจ้งเตือน</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    เปิด/ปิดการแจ้งเตือนหลักของระบบที่เกี่ยวข้องกับหน้าการแจ้งเตือนโดยรวม
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">เปิด/ปิดการแจ้งเตือน</p>
                      <p className="mt-2 text-sm text-slate-400">ควบคุมการแจ้งเตือนหลักของระบบในส่วนที่เกี่ยวข้องกับ user account</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleNotifications}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${notificationsEnabled ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-200"}`}
                    >
                      <Bell size={16} className="mr-2" />
                      {notificationsEnabled ? "เปิดแล้ว" : "ปิดแล้ว"}
                    </button>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                    ปุ่มนี้สำหรับตั้งค่าการแจ้งเตือนของบัญชีโดยตรง หากต้องการจัดการ notification ทั้งหมด โปรดไปที่หน้าการแจ้งเตือนหลัก
                  </div>

                  <Link href="/dashboard/notifications"
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/75 px-4 py-3 text-sm font-semibold text-slate-100 hover:border-slate-600 hover:bg-slate-900 transition"
                  >
                    ไปที่ Notifications
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </>
            ) : activeTab === "users" ? (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">จัดการผู้ใช้</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">ดูรายชื่อ User ทั้งหมด</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    แก้ไข Role ของผู้ใช้ หรือ ลบผู้ใช้ได้จากที่นี่ โดยเฉพาะสำหรับ admin
                  </p>
                </div>

                <div className="space-y-4">
                  {users.map((item) => (
                    <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">{item.username}</div>
                        <div className="mt-1 text-sm text-slate-400">Role: {item.role}</div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => toggleUserRole(item.id)}
                          className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700 transition"
                        >
                          เปลี่ยนเป็น {item.role === "admin" ? "customer" : "admin"}
                        </button>
                        <button
                          type="button"
                          disabled={item.id === user.id}
                          onClick={() => deleteUser(item.id)}
                          className="inline-flex items-center justify-center rounded-3xl border border-slate-700 bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ลบ User
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="mb-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">ระบบ</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">เปิด/ปิด Maintenance Mode</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-400">
                    ปิดระบบหรือเปิดให้เข้าบางส่วนเมื่อกำลังบำรุงรักษา สามารถใช้ฟีเจอร์นี้เฉพาะ admin เท่านั้น
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Maintenance Mode</p>
                      <p className="mt-2 text-sm text-slate-400">เปลี่ยนการเข้าถึงระบบขณะบำรุงรักษา</p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleMaintenance}
                      className={`${maintenanceMode ? "bg-rose-500 text-white" : "bg-slate-800 text-slate-200"} inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition`}
                    >
                      {maintenanceMode ? "เปิดอยู่" : "ปิดอยู่"}
                    </button>
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                    เมื่อเปิด Maintenance mode หน้าไซต์จะอยู่ในสถานะบำรุงรักษาและจำกัดการเข้าถึงสำหรับผู้ใช้ทั่วไป (ตัวอย่างนี้เป็นสถานะภายใน)
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
