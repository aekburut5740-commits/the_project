export type ProjectStatus =
  | "pending"
  | "in_progress"
  | "completed"

export interface Manager {
  id: number
  projectId?: number
  name: string
  role?: string
  avatar: string
  color: string
}

export interface Project {
  id: number
  name: string
  description: string
  status: ProjectStatus
  progress: number

  ownerId: number
  ownerName?: string

  domain: string
  website: string
  startDate: string
  package: string
  token: string

  managers: Manager[]

  createdAt?: string
  updatedAt?: string
}

export interface CreateProjectInput {
  name: string
  description: string
  domain?: string
  start_date?: string
  package?: string
  token?: string
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: ProjectStatus
  domain?: string
  start_date?: string
  package?: string
  token?: string
}