import { clearAuth, getToken } from "./auth"

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "")

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = typeof window !== "undefined" ? getToken() : null

  if (token) headers.set("Authorization", `Bearer ${token}`)
  if (!(options.body instanceof FormData) && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  })

  let data: any = null
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) data = await response.json()
  else data = await response.text()

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") clearAuth()
    throw new Error(data?.message || `API error (${response.status})`)
  }

  // Backend บาง route ส่ง status 200 พร้อม message เมื่อเกิดข้อผิดพลาด
  if (data && typeof data === "object" && data.message && !data.token) {
    const message = String(data.message)
    if (/ไม่สำเร็จ|ไม่ถูกต้อง|หมดอายุ|มีผู้ใช้|มีอีเมล|ผิดพลาด|กรุณา/.test(message)) {
      throw new Error(message)
    }
  }

  return data as T
}
