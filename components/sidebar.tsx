"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, FolderKanban, Flag, Bell,
  MessageSquare, FileText, GitBranch, BarChart2,
  Settings, LogOut, Pencil, Check, X, Camera
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { backend } from "@/lib/backend";

const navItems = [
  { label: "Dashboard",      href: "/dashboard",               icon: LayoutDashboard },
  { label: "Projects",       href: "/dashboard/projects",      icon: FolderKanban },
  { label: "Milestones",     href: "/dashboard/milestones",    icon: Flag },
  { label: "Notifications",  href: "/dashboard/notifications", icon: Bell },
  { label: "Feedback Center",href: "/dashboard/feedback",      icon: MessageSquare },
  { label: "Document Vault", href: "/dashboard/documents",     icon: FileText },
  { label: "Git Pulse",      href: "/dashboard/git",           icon: GitBranch },
  { label: "Reports",        href: "/dashboard/reports",       icon: BarChart2 },
];

interface ProfileInfo {
  id: number;
  username: string;
  email: string;
  role: "admin" | "customer";
}

export default function Sidebar() {
  const pathname = usePathname();
  const jwtUser = getUser();
  const isAdmin = jwtUser?.role === "admin";

  // ข้อมูล User จริง: เริ่มจาก JWT ก่อน (แสดงผลได้ทันที) แล้วค่อยอัปเดตด้วยข้อมูลล่าสุดจาก Backend
  const [profile, setProfile] = useState<ProfileInfo | null>(
    jwtUser ? { id: jwtUser.id, username: jwtUser.username, email: "", role: jwtUser.role } : null
  );

  useEffect(() => {
    backend.profile()
      .then((res: any) => setProfile(res.user))
      .catch(() => {});
  }, []);

  // จุดแดง Notification / Feedback: นับจากข้อมูลจริงของ Backend
  // โหลดใหม่ทุกครั้งที่เปลี่ยนหน้า เพื่อให้ badge อัปเดตหลังจากไปกดอ่านในหน้า Notifications/Feedback มาแล้ว
  const [notifCount, setNotifCount] = useState(0);
  const [feedbackUnread, setFeedbackUnread] = useState(0);

  useEffect(() => {
    if (!jwtUser) return;

    backend.notifications()
      .then((list: any[]) => setNotifCount(Array.isArray(list) ? list.filter((n) => !n.is_read).length : 0))
      .catch(() => {});

    if (isAdmin) {
      // ยังไม่มี "อ่านแล้ว" สำหรับ Feedback ใน Backend เลยใช้สถานะ "sent" (ยังไม่มีใครรับเรื่อง) แทนความหมาย "ยังไม่อ่าน"
      backend.allFeedbacks()
        .then((list: any[]) => setFeedbackUnread(Array.isArray(list) ? list.filter((f) => f.status === "sent").length : 0))
        .catch(() => {});
    }
  }, [pathname, isAdmin, jwtUser?.id]);

  // Avatar: ยังไม่มี endpoint ใน Backend รองรับการอัปโหลด/บันทึกรูปโปรไฟล์
  // เก็บไว้เป็น preview ในเครื่อง/เซสชันนี้เท่านั้น รีเฟรชแล้วจะหาย
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  // แก้ชื่อผู้ใช้: บันทึกผ่าน Backend จริง (endpoint เดียวกับหน้า Settings)
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  function startEdit() {
    if (!profile) return;
    setTempName(profile.username);
    setNameError("");
    setEditingName(true);
  }

  function cancelEdit() {
    setNameError("");
    setEditingName(false);
  }

  async function confirmName() {
    const newName = tempName.trim();
    if (!profile || !newName || savingName) return;
    if (newName === profile.username) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameError("");
    try {
      await backend.updateProfile(newName, profile.email);
      setProfile({ ...profile, username: newName });
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "บันทึกชื่อไม่สำเร็จ");
    } finally {
      setSavingName(false);
    }
  }

  const username = profile?.username || jwtUser?.username || "ผู้ใช้งาน";
  const role = profile?.role || jwtUser?.role || "customer";
  const canEditName = !!profile?.email; // ต้องมี email จาก Backend ก่อนถึงจะแก้ชื่อได้ (updateProfile ต้องใช้คู่กัน)
  const initials = username.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className="w-56 bg-black text-white flex flex-col h-full print:hidden">
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          const isNotif = href === "/dashboard/notifications";
          const isFeedback = href === "/dashboard/feedback";
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {/* Badge ตัวเลขแจ้งเตือน (นับจาก Backend จริง) */}
              {isNotif && notifCount > 0 && (
                <span style={{
                  background: active ? "#fff" : "#ef4444",
                  color: active ? "#2563eb" : "#fff",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 999,
                  minWidth: 18,
                  textAlign: "center",
                }}>
                  {notifCount > 99 ? "99+" : notifCount}
                </span>
              )}
              {isFeedback && feedbackUnread > 0 && (
                <span style={{
                  background: active ? "#fff" : "#ef4444",
                  color: active ? "#dc2626" : "#fff",
                  fontSize: 10, fontWeight: 700,
                  padding: "1px 6px", borderRadius: 999,
                  minWidth: 18, textAlign: "center" as const,
                }}>
                  {feedbackUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 space-y-0.5">
        <Link href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
          <Settings size={17} /><span>Settings</span>
        </Link>
        <Link href="/login"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors">
          <LogOut size={17} /><span>Logout</span>
        </Link>

        <div className="border-t border-white/10 my-2" />

        {/* Profile */}
        <div className="px-1 pt-1">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0 group">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-600/30 border border-white/10 flex items-center justify-center text-sm font-bold text-blue-400">
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera size={13} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div>
                  <div className="flex items-center gap-1">
                    <input autoFocus value={tempName}
                      disabled={savingName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmName(); if (e.key === "Escape") cancelEdit(); }}
                      className="w-full bg-white/10 text-white text-sm rounded px-2 py-0.5 outline-none border border-blue-500/60 min-w-0" />
                    <button onClick={confirmName} disabled={savingName} className="text-green-400 hover:text-green-300 flex-shrink-0 disabled:opacity-50"><Check size={13} /></button>
                    <button onClick={cancelEdit} disabled={savingName} className="text-gray-500 hover:text-gray-300 flex-shrink-0 disabled:opacity-50"><X size={13} /></button>
                  </div>
                  {nameError && <div className="text-[10px] text-red-400 mt-1">{nameError}</div>}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/name">
                  <span className="text-sm text-white font-medium truncate">{username}</span>
                  {canEditName && (
                    <button onClick={startEdit}
                      className="text-gray-600 hover:text-gray-300 opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0">
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              )}
              <span className="text-xs text-gray-500">{role}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}