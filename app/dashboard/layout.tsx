import Sidebar from "@/components/sidebar"
import { NotificationProvider } from "@/lib/notificationStore"
import { ThemeProvider } from "@/lib/themeContext"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-gray-100 dark:bg-gray-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </NotificationProvider>
    </ThemeProvider>
  )
}

