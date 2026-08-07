"use client";

import { useState } from "react";
import Sidebar from "@/components/sidebar"
import { NotificationProvider } from "@/lib/notificationStore"
import { ThemeProvider } from "@/lib/themeContext"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ThemeProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-950">

          {/* Mobile hamburger */}
          <div className="md:hidden fixed top-3 left-3 z-50">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="เปิดเมนู"
              className="p-2 rounded-md bg-white/90 dark:bg-gray-800/80 shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <path d="M4 6H20M4 12H20M4 18H20" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Mobile sidebar overlay */}
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 overflow-y-auto min-w-0">
            {children}
          </main>
        </div>
      </NotificationProvider>
    </ThemeProvider>
  )
}

