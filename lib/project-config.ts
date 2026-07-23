import type { ProjectStatus } from "@/types/project"

export const STATUS_CONFIG: Record<
  ProjectStatus,
  {
    label: string
    color: string
  }
> = {
  pending: {
    label: "รอดำเนินการ",
    color: "#fbbf24",
  },

  in_progress: {
    label: "กำลังดำเนินการ",
    color: "#60a5fa",
  },

  completed: {
    label: "เสร็จแล้ว",
    color: "#34d399",
  },
}