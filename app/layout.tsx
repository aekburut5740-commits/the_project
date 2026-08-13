import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "The Project",
  description: "Client project portal",
}

// อ่าน theme จาก localStorage แล้ว set class ที่ <html> ก่อน browser paint
// ต้องเป็น script ธรรมดา (ไม่ async/defer) เพื่อให้รัน block ก่อนหน้าจอขึ้นภาพ
const themeInitScript = `
(function () {
  try {
    var saved = localStorage.getItem("app_theme");
    var theme = saved === "light" ? "light" : "dark";
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}