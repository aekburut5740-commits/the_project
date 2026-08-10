"use client"

import { color } from "bun"
import { useEffect, useState } from "react"

export default function MaintenancePage() {
    const [message, setMessage] = useState("ระบบอยู่ระหว่างการบำรุงรักษา")

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/maintenance`)
            .then((r) => r.json())
            .then((data) => { if (data.message) setMessage(data.message) })
            .catch(() => { })
    }, [])

    return (
        <div style={{
            minHeight: "100vh", background: "#0d1117",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'DM Sans', sans-serif", padding: 24,
        }}>
            <div style={{
                background: "#111827", border: "1px solid #1f2937",
                borderTop: `1px solid #1f2937`,
                borderRight: `1px solid #1f2937`,
                borderBottom: `1px solid #1f2937`,
                borderLeft: `3px solid ${color}`,
                maxWidth: 480, width: "100%", textAlign: "center",
                display: "flex", flexDirection: "column", gap: 16,
            }}>
                <div style={{ fontSize: 48 }}>🔧</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#f9fafb" }}>
                    ระบบปิดปรับปรุงชั่วคราว
                </div>
                <div style={{
                    fontSize: 14, color: "#9ca3af", lineHeight: 1.7,
                    background: "#0d1117", borderRadius: 10, padding: "14px 18px",
                }}>
                    {message}
                </div>
                <div style={{ fontSize: 12, color: "#4b5563" }}>
                    ขออภัยในความไม่สะดวก กรุณาลองใหม่ในภายหลัง
                </div>
            </div>
        </div>
    )
}