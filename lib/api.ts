import { authHeader } from "./auth"

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...authHeader(),
    ...((options.headers as Record<string, string>) || {}),
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
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

  return data as T
}
