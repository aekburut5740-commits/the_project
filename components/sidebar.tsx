"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FolderKanban, Flag, Bell,
  MessageSquare, FileText, GitBranch, BarChart2,
  Settings, LogOut
} from "lucide-react";

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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-black text-white flex flex-col h-full">
      {/* Nav */}
      <nav className="flex-1 px-3 pt-4 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
            >
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <Settings size={17} />
          <span>Settings</span>
        </Link>
        <Link
          href="/login"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}