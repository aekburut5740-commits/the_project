import { authHeader } from "./auth"

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeader(),
    ...((options.headers as Record<string, string>) || {}),
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  })

  const contentType = response.headers.get("content-type") || ""
  const data = contentType.includes("application/json") ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.message || response.statusText || "API request failed")
  }

  return data
}
