import { apiFetch } from "./api"
import type { JwtUser } from "./auth"
import type {
  Project,
  Manager,
  CreateProjectInput,
  UpdateProjectInput,
} from "@/types/project"


export const backend = {
  profile: () => apiFetch<{ user: JwtUser }>("/api/profile"),
  projects: (admin = false) =>
    apiFetch<unknown[]>(
      admin
        ? "/api/admin/projects"
        : "/api/projects"
    ),

  createProject: (body: CreateProjectInput) =>
    apiFetch<unknown>("/api/projects", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProject: (
    id: number,
    body: UpdateProjectInput,
    admin = false
  ) =>
    apiFetch<unknown>(
      admin
        ? `/api/admin/projects/${id}`
        : `/api/projects/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    ),

  updateProgress: (
    id: number,
    progress: number
  ) =>
    apiFetch<unknown>(
      `/api/admin/projects/${id}/progress`,
      {
        method: "PUT",
        body: JSON.stringify({ progress }),
      }
    ),

  deleteProject: (id: number) =>
    apiFetch<{ message?: string }>(
      `/api/admin/projects/${id}`,
      {
        method: "DELETE",
      }
    ),

  projectMembers: (projectId: number) =>
    apiFetch<unknown[]>(
      `/api/projects/${projectId}/members`
    ),
  dashboard: (admin = false) => apiFetch(admin ? "/api/admin/dashboard" : "/api/dashboard"),
  projectHealth: (id: number) => apiFetch<any>(`/api/projects/${id}/health`),
  milestones: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/milestones`),
  createMilestone: (projectId: number, body: any) => apiFetch(`/api/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(body) }),
  updateMilestone: (id: number, body: any) => apiFetch(`/api/milestones/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMilestone: (id: number) => apiFetch(`/api/milestones/${id}`, { method: "DELETE" }),
  files: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/files`),
uploadFile: (projectId: number, file: File, category?: string, isConfidential?: boolean) => { 
  const body = new FormData(); 
  body.append("file", file); 
  if (category) body.append("category", category)
  if (isConfidential !== undefined) body.append("is_confidential", String(isConfidential))
  return apiFetch(`/api/projects/${projectId}/files`, { method: "POST", body }) 
},
  deleteFile: (id: number) => apiFetch(`/api/files/${id}`, { method: "DELETE" }),
  feedbacks: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/feedbacks`),
  allFeedbacks: () => apiFetch<any[]>("/api/admin/feedbacks"),
  createFeedback: (projectId: number, body: any) => apiFetch(`/api/projects/${projectId}/feedbacks`, { method: "POST", body: JSON.stringify(body) }),
  updateFeedbackStatus: (id: number, status: string) => apiFetch(`/api/admin/feedbacks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  feedbackReplies: (id: number) => apiFetch<any[]>(`/api/feedbacks/${id}/replies`),
  createFeedbackReply: (id: number, message: string) => apiFetch(`/api/feedbacks/${id}/replies`, { method: "POST", body: JSON.stringify({ message }) }),
  markFeedbackRead: (id: number) => apiFetch(`/api/feedbacks/${id}/read`, { method: "PATCH" }),
  reports: (admin = false) => apiFetch(admin ? "/api/admin/reports" : "/api/reports"),
  users: () => apiFetch<any[]>("/api/admin/users"),
  maintenance: () => apiFetch<any>("/api/maintenance"),
  setMaintenance: (is_active: boolean, message = "") => apiFetch("/api/admin/maintenance", { method: "PATCH", body: JSON.stringify({ is_active, message }) }),
  updateProfile: (username: string, email: string, avatar?: string | null) =>
    apiFetch("/api/profile", {
      method: "PUT",
      body: JSON.stringify({ username, email, avatar }),
    }),
  changePassword: (old_password: string, new_password: string) => apiFetch("/api/profile/password", { method: "PUT", body: JSON.stringify({ old_password, new_password }) }),
  addProjectMember: (projectId: number, name: string, role = "ผู้ดูแลโปรเจค") => apiFetch(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ name, role }) }),
  removeProjectMember: (id: number) => apiFetch(`/api/members/${id}`, { method: "DELETE" }),
  notifications: () => apiFetch<any[]>("/api/notifications"),
  unreadCount: () =>
    apiFetch<{
      notifications: number
      feedbacks: number
      total: number
    }>("/api/unread-count"),
  markNotificationRead: (id: number) => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => apiFetch("/api/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: number) => apiFetch(`/api/notifications/${id}`, { method: "DELETE" }),
  comments: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/comments`),
  createComment: (projectId: number, content: string) => apiFetch(`/api/projects/${projectId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),
  deleteComment: (id: number) => apiFetch(`/api/comments/${id}`, { method: "DELETE" }),
  projectLogs: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/logs`),
  gitPulse: (repo?: string, token?: string) =>
    apiFetch<any>(
      repo
        ? `/api/gitpulse?repo=${encodeURIComponent(repo)}${token ? `&token=${encodeURIComponent(token)}` : ""}`
        : "/api/gitpulse"
    ),
  guestPreview: (token: string) => apiFetch<any>(`/api/guest/preview/${token}`),
  generateShareToken: (id: number) => apiFetch<any>(`/api/admin/projects/${id}/share-token`, { method: "POST" }),
  register: (body: { username: string, email: string, password: string }) => apiFetch("/api/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: {
    username: string
    email: string
    password: string
  }) =>
    apiFetch<{
      message: string
      token: string
    }>("/api/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
}



export function normalizeProject(project: any): Project {
  const domain = String(project.domain ?? "")
  let rawWebsite = String(project.website ?? "").trim()
  const id = Number(project.id)

  if (!rawWebsite || rawWebsite === "https://example.com" || rawWebsite === "example.com") {
    const currentOrigin = typeof window !== "undefined" ? window.location.origin : ""
    rawWebsite = currentOrigin ? `${currentOrigin}/dashboard/projects/${id}` : `/dashboard/projects/${id}`
  }

  return {
    id,

    name: String(project.name ?? ""),
    description: String(project.description ?? ""),

    status:
      project.status === "in_progress" ||
        project.status === "completed"
        ? project.status
        : "pending",

    progress: Math.min(
      100,
      Math.max(0, Number(project.progress ?? 0))
    ),

    ownerId: Number(
      project.ownerId ??
      project.user_id ??
      project.userId ??
      0
    ),

    ownerName:
      project.ownerName ??
      project.username ??
      undefined,

    domain,
    website: rawWebsite,

    startDate: String(
      project.startDate ??
      project.start_date ??
      ""
    ),

    package: String(project.package ?? ""),
    token: String(project.token ?? ""),

    managers: Array.isArray(project.managers)
      ? project.managers.map(normalizeManager)
      : [],

    createdAt:
      project.createdAt ??
      project.created_at ??
      undefined,

    updatedAt:
      project.updatedAt ??
      project.updated_at ??
      undefined,
  }
}
export function normalizeMilestone(m: any) {
  return { ...m, id: Number(m.id), projectId: Number(m.projectId ?? m.project_id), dueDate: m.dueDate ?? m.end_date ?? "", startDate: m.startDate ?? m.start_date ?? "", progress: Number(m.progress ?? 0), status: m.status ?? "upcoming", tasks: m.tasks ?? [] }
}

export function normalizeManager(manager: any): Manager {
  const name = String(manager.name ?? "")

  return {
    id: Number(manager.id),
    projectId: manager.project_id
      ? Number(manager.project_id)
      : undefined,

    name,
    role: String(manager.role ?? "ผู้ดูแลโปรเจค"),

    avatar:
      String(manager.avatar ?? "") ||
      getInitials(name),

    color: String(manager.color ?? "#4f8ef7"),
  }
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2)
}
