import { apiFetch } from "./api"
import type { JwtUser } from "./auth"

export const backend = {
  profile: () => apiFetch<{ user: JwtUser }>("/api/profile"),
  projects: (admin = false) => apiFetch<any[]>(admin ? "/api/admin/projects" : "/api/projects"),
  createProject: (body: any) => apiFetch("/api/projects", { method: "POST", body: JSON.stringify(body) }),
  updateProject: (id: number, body: any, admin = false) => apiFetch(admin ? `/api/admin/projects/${id}` : `/api/projects/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateProgress: (id: number, progress: number) => apiFetch(`/api/admin/projects/${id}/progress`, { method: "PUT", body: JSON.stringify({ progress }) }),
  deleteProject: (id: number) => apiFetch(`/api/admin/projects/${id}`, { method: "DELETE" }),
  dashboard: (admin = false) => apiFetch(admin ? "/api/admin/dashboard" : "/api/dashboard"),
  projectHealth: (id: number) => apiFetch<any>(`/api/projects/${id}/health`),
  milestones: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/milestones`),
  createMilestone: (projectId: number, body: any) => apiFetch(`/api/projects/${projectId}/milestones`, { method: "POST", body: JSON.stringify(body) }),
  updateMilestone: (id: number, body: any) => apiFetch(`/api/milestones/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteMilestone: (id: number) => apiFetch(`/api/milestones/${id}`, { method: "DELETE" }),
  files: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/files`),
  uploadFile: (projectId: number, file: File) => { const body = new FormData(); body.append("file", file); return apiFetch(`/api/projects/${projectId}/files`, { method: "POST", body }) },
  deleteFile: (id: number) => apiFetch(`/api/files/${id}`, { method: "DELETE" }),
  feedbacks: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/feedbacks`),
  allFeedbacks: () => apiFetch<any[]>("/api/admin/feedbacks"),
  createFeedback: (projectId: number, body: any) => apiFetch(`/api/projects/${projectId}/feedbacks`, { method: "POST", body: JSON.stringify(body) }),
  updateFeedbackStatus: (id: number, status: string) => apiFetch(`/api/admin/feedbacks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  feedbackReplies: (id: number) => apiFetch<any[]>(`/api/feedbacks/${id}/replies`),
  createFeedbackReply: (id: number, message: string) => apiFetch(`/api/feedbacks/${id}/replies`, { method: "POST", body: JSON.stringify({ message }) }),
  reports: (admin = false) => apiFetch(admin ? "/api/admin/reports" : "/api/reports"),
  users: () => apiFetch<any[]>("/api/admin/users"),
  maintenance: () => apiFetch<any>("/api/maintenance"),
  setMaintenance: (is_active: boolean, message = "") => apiFetch("/api/admin/maintenance", { method: "PATCH", body: JSON.stringify({ is_active, message }) }),
  updateProfile: (username: string, email: string) => apiFetch("/api/profile", { method: "PUT", body: JSON.stringify({ username, email }) }),
  changePassword: (old_password: string, new_password: string) => apiFetch("/api/profile/password", { method: "PUT", body: JSON.stringify({ old_password, new_password }) }),
  projectMembers: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/members`),
  addProjectMember: (projectId: number, name: string, role = "ผู้ดูแลโปรเจค") => apiFetch(`/api/projects/${projectId}/members`, { method: "POST", body: JSON.stringify({ name, role }) }),
  removeProjectMember: (id: number) => apiFetch(`/api/members/${id}`, { method: "DELETE" }),
  notifications: () => apiFetch<any[]>("/api/notifications"),
  markNotificationRead: (id: number) => apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllNotificationsRead: () => apiFetch("/api/notifications/read-all", { method: "PATCH" }),
  comments: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/comments`),
  createComment: (projectId: number, content: string) => apiFetch(`/api/projects/${projectId}/comments`, { method: "POST", body: JSON.stringify({ content }) }),
  deleteComment: (id: number) => apiFetch(`/api/comments/${id}`, { method: "DELETE" }),
  projectLogs: (projectId: number) => apiFetch<any[]>(`/api/projects/${projectId}/logs`),
  gitPulse: () => apiFetch<any>("/api/gitpulse"),
}

export function normalizeProject(p: any) {
  return {    ...p, 
    id: Number(p.id), 
    ownerId: Number(p.ownerId ?? p.user_id ?? p.userId ?? 0), 
    startDate: p.startDate ?? p.start_date ?? "", 
    progress: Number(p.progress ?? 0), 
    status: p.status ?? "pending", 
    managers: p.managers ?? [],
    domain: p.domain ?? "",
    website: p.website ?? p.domain ?? "",
    package: p.package ?? "",
    token: p.token ?? "",}
}
export function normalizeMilestone(m: any) {
  return { ...m, id: Number(m.id), projectId: Number(m.projectId ?? m.project_id), dueDate: m.dueDate ?? m.end_date ?? "", startDate: m.startDate ?? m.start_date ?? "", progress: Number(m.progress ?? 0), status: m.status ?? "upcoming", tasks: m.tasks ?? [] }
}
