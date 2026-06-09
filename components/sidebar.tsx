"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  LayoutDashboard, FolderKanban, Flag, Bell,
  MessageSquare, FileText, GitBranch, BarChart2,
  Settings, LogOut, Pencil, Check, X, Camera
} from "lucide-react";
import { useNotifications } from "@/lib/notificationStore";
import { MOCK_CURRENT_USER } from "@/lib/mockData";

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

export default function Sidebar() {
  const pathname = usePathname();
  const user = MOCK_CURRENT_USER;
  const isAdmin = user.role === "admin";
  const { unreadCount } = useNotifications();
  const count = unreadCount(user.id, isAdmin);

  // Profile state
  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState(user.username);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(username);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  }

  function confirmName() {
    if (tempName.trim()) setUsername(tempName.trim());
    setEditingName(false);
  }

  const initials = username.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className="w-56 bg-black text-white flex flex-col h-full">
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          const isNotif = href === "/dashboard/notifications";
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {/* Badge ตัวเลขแจ้งเตือน */}
              {isNotif && count > 0 && (
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
                  {count > 99 ? "99+" : count}
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
                <div className="flex items-center gap-1">
                  <input autoFocus value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmName(); if (e.key === "Escape") { setTempName(username); setEditingName(false); } }}
                    className="w-full bg-white/10 text-white text-sm rounded px-2 py-0.5 outline-none border border-blue-500/60 min-w-0" />
                  <button onClick={confirmName} className="text-green-400 hover:text-green-300 flex-shrink-0"><Check size={13} /></button>
                  <button onClick={() => { setTempName(username); setEditingName(false); }} className="text-gray-500 hover:text-gray-300 flex-shrink-0"><X size={13} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/name">
                  <span className="text-sm text-white font-medium truncate">{username}</span>
                  <button onClick={() => { setTempName(username); setEditingName(true); }}
                    className="text-gray-600 hover:text-gray-300 opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0">
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <span className="text-xs text-gray-500">{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
