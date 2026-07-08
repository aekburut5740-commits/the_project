"use client"

import React, { useRef, useState } from "react"
import Link from "next/link"
import { Camera, Bell, User, Mail, Lock, ArrowRight } from "lucide-react"
import { MOCK_CURRENT_USER } from "@/lib/mockData"

export default function SettingsPage() {
  const user = MOCK_CURRENT_USER
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(() => `${user.username.replace(/_/g, ".")}@example.com`)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [editing, setEditing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatar, setAvatar] = useState<string | null>(null)

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

  const [activeTab, setActiveTab] = useState<"account" | "notifications">("account")

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 mb-2">Settings</p>
            <h1 className="text-3xl font-semibold text-white">Account settings</h1>
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
                    <input placeholder="รหัสผ่านใหม่" type="password" className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-white outline-none" />
                    <input placeholder="ยืนยันรหัสผ่าน" type="password" className="w-full rounded-3xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-white outline-none" />
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">บันทึกการเปลี่ยนแปลงข้อมูลบัญชี</p>
                  </div>
                  <button type="button" className="inline-flex items-center justify-center rounded-3xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition">
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </>
            ) : (
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
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
