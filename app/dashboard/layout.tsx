import Sidebar from "@/components/sidebar"
import { NotificationProvider } from "@/lib/notificationStore"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </NotificationProvider>
  )
}
