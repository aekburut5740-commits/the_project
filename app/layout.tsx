import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "The Project",
  description: "Client project portal",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}