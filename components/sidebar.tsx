"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, FolderKanban, Flag, Bell,
  MessageSquare, FileText, GitBranch, BarChart2,
  Settings, LogOut, Pencil, Check, X, Camera, Sun, Moon
} from "lucide-react";
import { getUser } from "@/lib/auth";
import { backend } from "@/lib/backend";
import { useTheme } from "@/lib/themeContext";

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      onClick={toggleTheme}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
      title="สลับธีมระบบ"
    >
      {isLight ? <Moon size={17} /> : <Sun size={17} />}
      <span>{isLight ? "Dark Mode" : "Light Mode"}</span>
    </button>
  );
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Milestones", href: "/dashboard/milestones", icon: Flag },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Feedback Center", href: "/dashboard/feedback", icon: MessageSquare },
  { label: "Document Vault", href: "/dashboard/documents", icon: FileText },
  { label: "Git Pulse", href: "/dashboard/git", icon: GitBranch },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart2 },
];

interface ProfileInfo {
  id: number;
  username: string;
  email: string;
  role: "admin" | "customer";
  avatar?: string | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [feedbackUnread, setFeedbackUnread] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const jwtUser = getUser();
    if (jwtUser) {
      setProfile({ id: jwtUser.id, username: jwtUser.username, email: "", role: jwtUser.role });
    }
    backend.profile()
      .then((res: any) => {
        if (res?.user) {
          setProfile(res.user);
          setAvatar(res.user.avatar || null);
        }
      })
      .catch(() => { });
  }, []);

  const jwtUser = getUser();
  const isAdmin = profile?.role === "admin" || jwtUser?.role === "admin";

  useEffect(() => {
    if (!mounted) return;

    const loadUnread = () => {
      backend.unreadCount()
        .then((data: any) => {
          setNotifCount(data.notifications || 0)
          setFeedbackUnread(data.feedbacks || 0)
        })
        .catch(() => {
          setNotifCount(0)
          setFeedbackUnread(0)
        });
    };

    loadUnread();

    const interval = setInterval(loadUnread, 5000);

    return () => clearInterval(interval);

  }, [mounted]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const nextAvatar = reader.result as string;
      setAvatar(nextAvatar);
      try {
        const updatedProfile = await backend.updateProfile(
          profile.username,
          profile.email,
          nextAvatar
        ) as ProfileInfo;
        setProfile(updatedProfile);
      } catch {
        setAvatar(profile.avatar || null);
      }
    };
    reader.readAsDataURL(file);
  }

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
      const updatedProfile = await backend.updateProfile(newName, profile.email, avatar) as ProfileInfo;
      setProfile(updatedProfile);
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "บันทึกชื่อไม่สำเร็จ");
    } finally {
      setSavingName(false);
    }
  }

  const username = profile?.username || jwtUser?.username || "ผู้ใช้งาน";
  const role = profile?.role || jwtUser?.role || "customer";
  const canEditName = !!profile?.email;
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? "bg-blue-600 text-white font-semibold" : "text-gray-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
            >
              <Icon size={17} className={active ? "text-white" : "text-gray-500 dark:text-gray-400"} />
              <span className="flex-1">{label}</span>
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
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === "/dashboard/settings"
            ? "bg-blue-600 text-white font-semibold"
            : "text-gray-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
            }`}>
          <Settings size={17} className={pathname === "/dashboard/settings" ? "text-white" : "text-gray-500 dark:text-gray-400"} />
          <span>Settings</span>
        </Link>
        <ThemeToggleButton />
        <Link href="/login"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors">
          <LogOut size={17} /><span>Logout</span>
        </Link>

        <div className="border-t border-gray-200 dark:border-white/10 my-2" />

        {/* Profile */}
        <div className="px-1 pt-1">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative flex-shrink-0 group">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-600/30 border border-white/10 flex items-center justify-center text-sm font-bold text-blue-400">
                {avatar
                  ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                  : (mounted ? initials : "")}
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
                  <span suppressHydrationWarning className="text-sm text-white font-medium truncate">{mounted ? username : ""}</span>
                  {canEditName && (
                    <button onClick={startEdit}
                      className="text-gray-600 hover:text-gray-300 opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0">
                      <Pencil size={11} />
                    </button>
                  )}
                </div>
              )}
              <span suppressHydrationWarning className="text-xs text-gray-500">{mounted ? role : ""}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}