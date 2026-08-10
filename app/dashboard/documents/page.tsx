"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { FileText, FileImage, File, Download, Trash2, Upload, Search, FolderOpen, Eye, Lock } from "lucide-react"
import { getUser } from "@/lib/auth"
import { backend, normalizeProject } from "@/lib/backend"
import { useTheme } from "@/lib/themeContext"

export type DocCategory = "contract" | "proposal" | "design" | "credential" | "report" | "other"

export interface Project {
  id: number
  name: string
  ownerId: number
}

export interface Document {
  id: number
  name: string
  projectId: number
  category: DocCategory
  size: string
  uploadedBy: string
  uploadedAt: string
  isConfidential: boolean
  fileType: "pdf" | "image" | "doc" | "other"
}

const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string }> = {
  contract: { label: "สัญญา", color: "#f87171" },
  proposal: { label: "ใบเสนอราคา", color: "#fbbf24" },
  design: { label: "ดีไซน์", color: "#a78bfa" },
  credential: { label: "Credentials", color: "#f97316" },
  report: { label: "รายงาน", color: "#34d399" },
  other: { label: "อื่นๆ", color: "#6b7280" },
}

type DocumentWithUrl = Document & { fileUrl?: string }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

function buildFileUrl(filepath: string, fallbackName: string): string {
  const cleanPath = filepath.replace(/\\/g, "/")
  const filename = cleanPath.split("/").pop() ?? fallbackName
  return filename ? `${API_BASE_URL}/uploads/${encodeURIComponent(filename)}` : ""
}

function normalizeDocument(file: any): DocumentWithUrl {
  const name = file.filename ?? file.name ?? "untitled"
  const ext = name.split(".").pop()?.toLowerCase()
  const filepath = String(file.filepath ?? "")
  const rawCategory = file.category as DocCategory
  const category: DocCategory = rawCategory in CATEGORY_CONFIG ? rawCategory : "other"

  return {
    id: Number(file.id), name, projectId: Number(file.project_id ?? file.projectId),
    category,
    size: file.filesize ? `${Math.max(1, Math.round(Number(file.filesize) / 1024))} KB` : "—",
    uploadedBy: file.username ?? file.uploadedBy ?? "—",
    uploadedAt: file.created_at ?? file.uploadedAt ?? "",
    isConfidential: Boolean(file.is_confidential ?? file.isConfidential ?? false),
    fileType: ext === "pdf" ? "pdf" : ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "") ? "image" : ["doc", "docx", "txt", "md"].includes(ext || "") ? "doc" : "other",
    fileUrl: buildFileUrl(filepath, name)
  }
}

import { Suspense } from "react"
import { useCurrentUser } from "@/lib/useCurrentUser"

function DocumentsContent() {
  const { theme } = useTheme()
  const { user: tokenUser, isAdmin, mounted } = useCurrentUser()
  const isLight = theme === "light"
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640)
      setIsTablet(window.innerWidth < 1024)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const S = useMemo(() => getStyles(isLight, isMobile, isTablet), [isLight, isMobile, isTablet])
  const searchParams = useSearchParams()
  const requestedProject = searchParams.get("project")

  const [projects, setProjects] = useState<Project[]>([])
  const [docs, setDocs] = useState<DocumentWithUrl[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [filterProject, setFilterProject] = useState<number | "all">("all")
  const [filterCategory, setFilterCategory] = useState<DocCategory | "all">("all")
  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DocumentWithUrl | null>(null)

  const myProjects = projects

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError("")

      if (!mounted) {
        setLoading(false)
        return
      }

      try {
        const data = await backend.projects(isAdmin)
        const nextProjects = data.map((project: any) => normalizeProject(project) as Project)
        setProjects(nextProjects)
        console.log("projects:", nextProjects)

        const requestedProjectId = Number(requestedProject)
        if (Number.isInteger(requestedProjectId) && nextProjects.some((project) => project.id === requestedProjectId)) {
          setFilterProject(requestedProjectId)
        }

        const groups = await Promise.all(
          nextProjects.map(async (project) => {
            try {
              const files = await backend.files(project.id)
              console.log(`files of project ${project.id}:`, files)
              return files
            } catch (err) {
              console.log(`error files project ${project.id}:`, err)
              return []
            }
          })
        )

        setDocs(groups.flat().map(normalizeDocument))
      } catch (err: unknown) {
        setProjects([])
        setDocs([])
        setError(err instanceof Error ? err.message : "ไม่สามารถโหลดเอกสารได้")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [isAdmin, requestedProject, mounted])

  const visibleDocs = docs.filter((d) => isAdmin || !d.isConfidential)

  const filtered = visibleDocs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchProject = filterProject === "all" || d.projectId === filterProject
    const matchCategory = filterCategory === "all" || d.category === filterCategory
    return matchSearch && matchProject && matchCategory
  })

  const grouped = myProjects.reduce<Record<number, DocumentWithUrl[]>>((acc, proj) => {
    const items = filtered.filter((d) => d.projectId === proj.id)
    if (items.length > 0) acc[proj.id] = items
    return acc
  }, {})

  async function handleUpload(newDoc: Omit<Document, "id">, file: File) {
    setUploading(true)
    setError("")

    try {
      const response: any = await backend.uploadFile(newDoc.projectId, file, newDoc.category, newDoc.isConfidential)
      const saved = normalizeDocument({
        ...response,
        project_id: (response as any)?.project_id ?? newDoc.projectId,
        category: (response as any)?.category ?? newDoc.category,
        is_confidential: (response as any)?.is_confidential ?? newDoc.isConfidential,
      })
      setDocs((prev) => [...prev, saved])
      setShowUpload(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "อัปโหลดเอกสารไม่สำเร็จ")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Document Vault</h1>
          <p style={S.subtitle}>{visibleDocs.length} เอกสาร{isAdmin ? "ทั้งหมด" : "ของโปรเจคคุณ"}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(true)} style={S.addBtn}>
            <Upload size={15} /> อัปโหลดเอกสาร
          </button>
        )}
      </div>
      {error && <div style={{ color: "#f87171", marginBottom: 12 }}>{error}</div>}

      <div style={{ marginBottom: 20 }}>
        <span style={{
          ...S.roleBadge,
          background: isAdmin ? "#4f8ef722" : "#34d39922",
          color: isAdmin ? "#4f8ef7" : "#34d399",
          border: `1px solid ${isAdmin ? "#4f8ef744" : "#34d39944"}`,
        }}>
          {isAdmin ? "👑 Admin — เห็นและจัดการได้ทุกเอกสาร รวมถึงเอกสารลับ" : "👤 Customer — เห็นเฉพาะเอกสารของโปรเจคคุณ (ไม่รวมเอกสารลับ)"}
        </span>
      </div>

      <div style={S.statsRow}>
        {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((cat) => {
          const count = visibleDocs.filter((d) => d.category === cat).length
          return (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              style={{ ...S.statCard, borderTopColor: CATEGORY_CONFIG[cat].color, opacity: filterCategory !== "all" && filterCategory !== cat ? 0.4 : 1, cursor: "pointer" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", fontFamily: "monospace" }}>{count}</div>
              <div style={{ fontSize: 11, color: CATEGORY_CONFIG[cat].color, fontWeight: 600 }}>{CATEGORY_CONFIG[cat].label}</div>
            </button>
          )
        })}
      </div>

      <div style={S.filterRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 260 }}>
          <Search size={13} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
          <input placeholder="ค้นหาเอกสาร..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.searchInput, paddingLeft: 34 }} />
        </div>
        <select value={filterProject} onChange={(e) => setFilterProject(e.target.value === "all" ? "all" : Number(e.target.value))} style={S.select}>
          <option value="all">ทุกโปรเจค</option>
          {myProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={S.empty}>กำลังโหลดเอกสาร...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div style={S.empty}>
          {search || filterProject !== "all" || filterCategory !== "all"
            ? "ไม่พบเอกสารที่ตรงกับตัวกรอง"
            : "ยังไม่มีเอกสาร"}
        </div>
      ) : (
        Object.entries(grouped).map(([projId, items]) => {
          const proj = projects.find((p) => p.id === Number(projId))
          return (
            <div key={projId} style={{ marginBottom: 28 }}>
              <div style={S.groupHeader}>
                <FolderOpen size={14} color="#4f8ef7" />
                <span>{proj?.name}</span>
                <span style={S.groupCount}>{items.length} ไฟล์</span>
              </div>
              <div style={S.docGrid}>
                {items.map((doc) => (
                  <DocCard key={doc.id} doc={doc} isAdmin={isAdmin}
                    onPreview={() => setPreviewDoc(doc)}
                    onDelete={async () => {
                      if (confirm("ลบเอกสารนี้?")) {
                        try {
                          await backend.deleteFile(doc.id)
                          setDocs((prev) => prev.filter((d) => d.id !== doc.id))
                        } catch (err) { setError(err instanceof Error ? err.message : "ลบเอกสารไม่สำเร็จ") }
                      }
                    }}
                    isLight={isLight} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {showUpload && isAdmin && (
        <UploadModal projects={myProjects} uploading={uploading} onClose={() => setShowUpload(false)} onUpload={handleUpload} />
      )}
      {previewDoc && (
        <PreviewModal doc={previewDoc} projects={projects} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}

function DocCard({ doc, isAdmin, onPreview, onDelete, isLight = false }: {
  doc: DocumentWithUrl; isAdmin: boolean; onPreview: () => void; onDelete: () => void; isLight?: boolean
}) {
  const S = getStyles(isLight)
  const { label, color } = CATEGORY_CONFIG[doc.category]
  const FileIcon = doc.fileType === "image" ? FileImage : doc.fileType === "pdf" ? FileText : File
  return (
    <div style={S.docCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        {doc.fileType === "image" && doc.fileUrl ? (
          <img src={doc.fileUrl} alt={doc.name} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
        ) : (
          <div style={{ ...S.fileIcon, background: color + "22", color }}><FileIcon size={20} /></div>
        )}
        {doc.isConfidential && (
          <div style={S.confBadge}><Lock size={9} /><span>ลับ</span></div>
        )}
      </div>
      <div style={S.docName} title={doc.name}>{doc.name}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <span style={{ ...S.catBadge, background: color + "18", color, border: `1px solid ${color}33` }}>{label}</span>
        <span style={{ fontSize: 11, color: "#4b5563" }}>{doc.size}</span>
      </div>
      <div style={S.docMeta}>
        <span>{doc.uploadedBy}</span>
        <span>{formatDocumentDate(doc.uploadedAt, false)}</span>
      </div>
      <div style={S.docActions}>
        <button onClick={onPreview} style={S.actionBtn} title="ดูรายละเอียด"><Eye size={12} /></button>
        {doc.fileUrl && <a href={doc.fileUrl} download={doc.name} style={{ ...S.actionBtn, textDecoration: "none" }} title="ดาวน์โหลด"><Download size={12} /></a>}
        {isAdmin && (
          <button onClick={onDelete} style={{ ...S.actionBtn, color: "#f87171" }} title="ลบ"><Trash2 size={12} /></button>
        )}
      </div>
    </div>
  )
}

function UploadModal({ projects, uploading, onClose, onUpload, isLight = false }: {
  projects: Project[]
  uploading: boolean
  onClose: () => void
  onUpload: (d: Omit<Document, "id">, file: File) => void
  isLight?: boolean
}) {
  const S = getStyles(isLight)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({ projectId: projects[0]?.id ?? 0, category: "contract" as DocCategory, isConfidential: false })

  function getFileType(name: string): Document["fileType"] {
    const ext = name.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image"
    if (ext === "pdf") return "pdf"
    if (["doc", "docx", "txt", "md"].includes(ext || "")) return "doc"
    return "other"
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>อัปโหลดเอกสาร</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.modalBody}>
          <div onClick={() => fileRef.current?.click()}
            style={{ ...S.dropZone, borderColor: selectedFile ? "#4f8ef7" : (isLight ? "#cbd5e1" : "#1f2937"), background: selectedFile ? (isLight ? "#eff6ff" : "#0f1f3d") : (isLight ? "#f8fafc" : "#0d1117") }}>
            <Upload size={22} color={selectedFile ? "#4f8ef7" : "#374151"} />
            <div style={{ fontSize: 13, color: selectedFile ? "#4f8ef7" : (isLight ? "#64748b" : "#4b5563") }}>
              {selectedFile ? selectedFile.name : "คลิกเพื่อเลือกไฟล์"}
            </div>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          </div>
          <Field label="โปรเจค">
            <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: Number(e.target.value) }))} style={S.input}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </Field>
          <Field label="ประเภทเอกสาร">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as DocCategory }))} style={S.input}>
              {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="conf" checked={form.isConfidential}
              onChange={(e) => setForm((f) => ({ ...f, isConfidential: e.target.checked }))}
              style={{ accentColor: "#f87171", width: 16, height: 16, cursor: "pointer" }} />
            <label htmlFor="conf" style={{ fontSize: 13, color: isLight ? "#475569" : "#9ca3af", cursor: "pointer" }}>เอกสารลับ</label>
          </div>
        </div>
        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
          <button disabled={!selectedFile || !form.projectId || uploading}
            onClick={() => selectedFile && form.projectId && onUpload({
              name: selectedFile.name, projectId: form.projectId, category: form.category,
              size: selectedFile.size > 1048576 ? `${(selectedFile.size / 1048576).toFixed(1)} MB` : `${(selectedFile.size / 1024).toFixed(0)} KB`,
              uploadedBy: "Admin", uploadedAt: new Date().toISOString().split("T")[0],
              isConfidential: form.isConfidential, fileType: getFileType(selectedFile.name),
            }, selectedFile)}
            style={{ ...S.saveBtn, opacity: selectedFile && form.projectId && !uploading ? 1 : 0.5, cursor: selectedFile && form.projectId && !uploading ? "pointer" : "not-allowed" }}>
            {uploading ? "กำลังอัปโหลด..." : "อัปโหลด"}
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ doc, projects, onClose, isLight = false }: { doc: DocumentWithUrl; projects: Project[]; onClose: () => void; isLight?: boolean }) {
  const S = getStyles(isLight)
  const { label, color } = CATEGORY_CONFIG[doc.category]
  const project = projects.find((p) => p.id === doc.projectId)
  const FileIcon = doc.fileType === "image" ? FileImage : doc.fileType === "pdf" ? FileText : File
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>รายละเอียดเอกสาร</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={{ ...S.modalBody, gap: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            {doc.fileType === "image" && doc.fileUrl ? (
              <img src={doc.fileUrl} alt={doc.name} style={{ width: "100%", maxHeight: 420, borderRadius: 14, objectFit: "contain" }} />
            ) : (
              <div style={{ ...S.fileIcon, width: 56, height: 56, borderRadius: 14, background: color + "22", color }}><FileIcon size={28} /></div>
            )}
          </div>
          {[
            ["ชื่อไฟล์", doc.name],
            ["โปรเจค", project?.name],
            ["ประเภท", label],
            ["ขนาด", doc.size],
            ["อัปโหลดโดย", doc.uploadedBy],
            ["วันที่", formatDocumentDate(doc.uploadedAt, true)],
            ["สถานะ", doc.isConfidential ? "🔒 เอกสารลับ" : "เปิดเผย"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2232" }}>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 13, color: "#d1d5db", maxWidth: "60%", wordBreak: "break-all", textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          {doc.fileUrl && (
            <a href={doc.fileUrl} download={doc.name} style={{ ...S.saveBtn, textDecoration: "none" }}>
              <Download size={13} style={{ marginRight: 6 }} />ดาวน์โหลด
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DocumentVaultPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "#94a3b8" }}>กำลังโหลด...</div>}>
      <DocumentsContent />
    </Suspense>
  )
}

function formatDocumentDate(value: string, longFormat: boolean): string {
  if (!value) return "ไม่ระบุ"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "ไม่ระบุ"

  return date.toLocaleDateString("th-TH", longFormat
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "numeric", month: "short" }
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>{children}</div>
}

function getStyles(isLight: boolean, isMobile = false, isTablet = false): Record<string, React.CSSProperties> {
  return {
    page: { background: isLight ? "#f8fafc" : "#0d1117", minHeight: "100vh", padding: isMobile ? "14px 12px" : "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: isLight ? "#0f172a" : "e5e7eb" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    title: { fontSize: isMobile ? 20 : 24, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
    subtitle: { fontSize: 13, color: isLight ? "#64748b" : "#6b7280", margin: "4px 0 0" },
    addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
    roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
    statsRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" },
    statCard: { background: isLight ? "#ffffff" : "#111827", borderLeft: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRight: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderTopWidth: 3, borderTopStyle: "solid", borderRadius: 12, padding: "14px 18px", flex: "1 1 100px", display: "flex", flexDirection: "column", gap: 3, transition: "opacity 0.2s", boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none" },
    filterRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" },
    searchInput: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 8, padding: "9px 14px", color: isLight ? "#0f172a" : "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
    select: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: isLight ? "#0f172a" : "#f9fafb", fontSize: 13, outline: "none", cursor: "pointer" },
    groupHeader: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: isLight ? "#334155" : "#9ca3af", marginBottom: 12 },
    groupCount: { fontSize: 11, color: isLight ? "#64748b" : "#4b5563", marginLeft: 4 },
    docGrid: { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
    docCard: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937", borderRadius: 12, padding: isMobile ? "10px" : "16px", display: "flex", flexDirection: "column", gap: 6, boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.05)" : "none" },
    fileIcon: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
    confBadge: { display: "flex", alignItems: "center", gap: 3, background: "#f871711a", border: "1px solid #f8717133", borderRadius: 999, padding: "2px 7px", color: "#f87171", fontSize: 10, fontWeight: 700 },
    docName: { fontSize: 12, fontWeight: 600, color: isLight ? "#0f172a" : "#f9fafb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
    catBadge: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999 },
    docMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: isLight ? "#64748b" : "#374151", marginTop: 2 },
    docActions: { display: "flex", gap: 6, marginTop: 4, paddingTop: 8, borderTop: isLight ? "1px solid #e2e8f0" : "1px solid #1a2232" },
    actionBtn: { background: isLight ? "#f1f5f9" : "#1f2937", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 6, color: isLight ? "#334155" : "#9ca3af", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" },
    empty: { color: isLight ? "#94a3b8" : "#374151", fontSize: 14, textAlign: "center", padding: isMobile ? "36px 0" : "60px 0", fontStyle: "italic" },
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
    modal: { background: isLight ? "#ffffff" : "#111827", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
    modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937" },
    modalTitle: { fontSize: 17, fontWeight: 700, color: isLight ? "#0f172a" : "#f9fafb" },
    closeBtn: { background: "transparent", border: "none", color: isLight ? "#64748b" : "#6b7280", fontSize: 16, cursor: "pointer" },
    modalBody: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
    modalFooter: { display: "flex", alignItems: "center", padding: "16px 24px", borderTop: isLight ? "1px solid #e2e8f0" : "1px solid #1f2937" },
    input: { background: isLight ? "#f8fafc" : "#0d1117", border: isLight ? "1px solid #cbd5e1" : "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: isLight ? "#0f172a" : "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
    dropZone: { border: "2px dashed", borderRadius: 12, padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.2s" },
    saveBtn: { display: "flex", alignItems: "center", background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer" },
    cancelBtn: { background: "transparent", border: isLight ? "1px solid #cbd5e1" : "1px solid #374151", borderRadius: 8, color: isLight ? "#64748b" : "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer", marginRight: 8 },
  }
}