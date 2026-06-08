"use client"

import { useState, useRef } from "react"
import {
  FileText, FileImage, File, Download, Trash2,
  Upload, Search, FolderOpen, Eye, Plus, Lock
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type DocCategory = "contract" | "proposal" | "design" | "credential" | "report" | "other"

interface Document {
  id: number
  name: string
  project: string
  category: DocCategory
  size: string
  uploadedBy: string
  uploadedAt: string
  isConfidential: boolean
  fileType: "pdf" | "image" | "doc" | "other"
  url?: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DOCS: Document[] = [
  {
    id: 1,
    name: "Contract_BrandCo_2025.pdf",
    project: "BrandCo Redesign",
    category: "contract",
    size: "2.4 MB",
    uploadedBy: "Aek Burin",
    uploadedAt: "2025-03-01",
    isConfidential: true,
    fileType: "pdf",
  },
  {
    id: 2,
    name: "Design_Brief_BrandCo.pdf",
    project: "BrandCo Redesign",
    category: "design",
    size: "5.1 MB",
    uploadedBy: "Nisa Wong",
    uploadedAt: "2025-03-05",
    isConfidential: false,
    fileType: "pdf",
  },
  {
    id: 3,
    name: "Proposal_ShopNow_v2.pdf",
    project: "ShopNow E-Commerce",
    category: "proposal",
    size: "1.8 MB",
    uploadedBy: "Aek Burin",
    uploadedAt: "2025-05-10",
    isConfidential: false,
    fileType: "pdf",
  },
  {
    id: 4,
    name: "Server_Credentials.txt",
    project: "ShopNow E-Commerce",
    category: "credential",
    size: "4 KB",
    uploadedBy: "Tong Dev",
    uploadedAt: "2025-05-18",
    isConfidential: true,
    fileType: "doc",
  },
  {
    id: 5,
    name: "Wireframe_MediCare_v1.png",
    project: "MediCare Portal",
    category: "design",
    size: "8.3 MB",
    uploadedBy: "Nisa Wong",
    uploadedAt: "2024-11-10",
    isConfidential: false,
    fileType: "image",
  },
  {
    id: 6,
    name: "Monthly_Report_May2025.pdf",
    project: "BrandCo Redesign",
    category: "report",
    size: "3.2 MB",
    uploadedBy: "Aek Burin",
    uploadedAt: "2025-05-31",
    isConfidential: false,
    fileType: "pdf",
  },
]

const PROJECTS = ["BrandCo Redesign", "ShopNow E-Commerce", "MediCare Portal"]

const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string }> = {
  contract:   { label: "สัญญา",        color: "#f87171" },
  proposal:   { label: "ใบเสนอราคา",   color: "#fbbf24" },
  design:     { label: "ดีไซน์",       color: "#a78bfa" },
  credential: { label: "Credentials",  color: "#f97316" },
  report:     { label: "รายงาน",       color: "#34d399" },
  other:      { label: "อื่นๆ",        color: "#6b7280" },
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentVaultPage() {
  // TODO: เปลี่ยนเป็น useRole() เมื่อ connect API
  const role: "admin" | "customer" = "admin"

  const [docs, setDocs] = useState<Document[]>(MOCK_DOCS)
  const [search, setSearch] = useState("")
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterCategory, setFilterCategory] = useState<DocCategory | "all">("all")
  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchProject = filterProject === "all" || d.project === filterProject
    const matchCategory = filterCategory === "all" || d.category === filterCategory
    return matchSearch && matchProject && matchCategory
  })

  function handleUpload(newDoc: Omit<Document, "id">) {
    setDocs((prev) => [...prev, { ...newDoc, id: Date.now() }])
    setShowUpload(false)
  }

  function handleDelete(id: number) {
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  // Group by project
  const grouped = PROJECTS.reduce<Record<string, Document[]>>((acc, proj) => {
    const items = filtered.filter((d) => d.project === proj)
    if (items.length > 0) acc[proj] = items
    return acc
  }, {})

  const totalSize = docs.length

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Document Vault</h1>
          <p style={S.subtitle}>{totalSize} เอกสารทั้งหมด</p>
        </div>
        {role === "admin" && (
          <button onClick={() => setShowUpload(true)} style={S.addBtn}>
            <Upload size={15} />
            อัปโหลดเอกสาร
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((cat) => {
          const count = docs.filter((d) => d.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              style={{
                ...S.statCard,
                borderTopColor: CATEGORY_CONFIG[cat].color,
                opacity: filterCategory !== "all" && filterCategory !== cat ? 0.4 : 1,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" }}>{count}</div>
              <div style={{ fontSize: 11, color: CATEGORY_CONFIG[cat].color, fontWeight: 600 }}>
                {CATEGORY_CONFIG[cat].label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div style={S.filterRow}>
        <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
          <input
            placeholder="ค้นหาเอกสาร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.searchInput, paddingLeft: 36 }}
          />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          style={S.select}
        >
          <option value="all">ทุกโปรเจค</option>
          {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Document List grouped by project */}
      {Object.keys(grouped).length === 0 ? (
        <div style={S.empty}>ไม่พบเอกสาร</div>
      ) : (
        Object.entries(grouped).map(([project, items]) => (
          <div key={project} style={{ marginBottom: 28 }}>
            <div style={S.groupHeader}>
              <FolderOpen size={15} color="#4f8ef7" />
              <span>{project}</span>
              <span style={S.groupCount}>{items.length} ไฟล์</span>
            </div>
            <div style={S.docGrid}>
              {items.map((doc) => (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  isAdmin={role === "admin"}
                  onPreview={() => setPreviewDoc(doc)}
                  onDelete={() => handleDelete(doc.id)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
        />
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}

// ─── Doc Card ─────────────────────────────────────────────────────────────────

function DocCard({
  doc,
  isAdmin,
  onPreview,
  onDelete,
}: {
  doc: Document
  isAdmin: boolean
  onPreview: () => void
  onDelete: () => void
}) {
  const { label, color } = CATEGORY_CONFIG[doc.category]
  const FileIcon = doc.fileType === "image" ? FileImage : doc.fileType === "pdf" ? FileText : File

  return (
    <div style={S.docCard}>
      {/* Icon + confidential */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ ...S.fileIcon, background: color + "22", color }}>
          <FileIcon size={22} />
        </div>
        {doc.isConfidential && (
          <div title="เอกสารลับ" style={S.confidentialBadge}>
            <Lock size={10} />
            <span>ลับ</span>
          </div>
        )}
      </div>

      {/* Name */}
      <div style={S.docName} title={doc.name}>{doc.name}</div>

      {/* Category + size */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <span style={{ ...S.catBadge, background: color + "18", color, border: `1px solid ${color}33` }}>
          {label}
        </span>
        <span style={S.docSize}>{doc.size}</span>
      </div>

      {/* Meta */}
      <div style={S.docMeta}>
        <span>โดย {doc.uploadedBy}</span>
        <span>{new Date(doc.uploadedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>

      {/* Actions */}
      <div style={S.docActions}>
        <button onClick={onPreview} style={S.actionBtn} title="ดูรายละเอียด">
          <Eye size={13} />
        </button>
        <button style={S.actionBtn} title="ดาวน์โหลด">
          <Download size={13} />
        </button>
        {isAdmin && (
          <button
            onClick={() => { if (confirm("ลบเอกสารนี้?")) onDelete() }}
            style={{ ...S.actionBtn, color: "#f87171" }}
            title="ลบ"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({
  onClose,
  onUpload,
}: {
  onClose: () => void
  onUpload: (doc: Omit<Document, "id">) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    project: PROJECTS[0],
    category: "contract" as DocCategory,
    isConfidential: false,
  })

  function set(key: keyof typeof form, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function getFileType(name: string): Document["fileType"] {
    const ext = name.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image"
    if (ext === "pdf") return "pdf"
    if (["doc", "docx", "txt", "md"].includes(ext || "")) return "doc"
    return "other"
  }

  function handleSubmit() {
    if (!selectedFile) return
    onUpload({
      name: selectedFile.name,
      project: form.project,
      category: form.category,
      size: selectedFile.size > 1024 * 1024
        ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
        : `${(selectedFile.size / 1024).toFixed(0)} KB`,
      uploadedBy: "Admin",
      uploadedAt: new Date().toISOString().split("T")[0],
      isConfidential: form.isConfidential,
      fileType: getFileType(selectedFile.name),
    })
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>อัปโหลดเอกสาร</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={S.modalBody}>

          {/* File drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              ...S.dropZone,
              borderColor: selectedFile ? "#4f8ef7" : "#1f2937",
              background: selectedFile ? "#0f1f3d" : "#0d1117",
            }}
          >
            <Upload size={24} color={selectedFile ? "#4f8ef7" : "#374151"} />
            {selectedFile ? (
              <div style={{ fontSize: 13, color: "#4f8ef7", fontWeight: 600 }}>{selectedFile.name}</div>
            ) : (
              <div style={{ fontSize: 13, color: "#4b5563" }}>คลิกเพื่อเลือกไฟล์</div>
            )}
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
          </div>

          {/* Project */}
          <Field label="โปรเจค">
            <select value={form.project} onChange={(e) => set("project", e.target.value)} style={S.input}>
              {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          {/* Category */}
          <Field label="ประเภทเอกสาร">
            <select value={form.category} onChange={(e) => set("category", e.target.value as DocCategory)} style={S.input}>
              {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c].label}</option>
              ))}
            </select>
          </Field>

          {/* Confidential */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="checkbox"
              id="conf"
              checked={form.isConfidential}
              onChange={(e) => set("isConfidential", e.target.checked)}
              style={{ accentColor: "#f87171", width: 16, height: 16, cursor: "pointer" }}
            />
            <label htmlFor="conf" style={{ fontSize: 13, color: "#9ca3af", cursor: "pointer" }}>
              เอกสารลับ (เฉพาะ admin เท่านั้น)
            </label>
          </div>
        </div>

        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile}
            style={{ ...S.saveBtn, opacity: selectedFile ? 1 : 0.5, cursor: selectedFile ? "pointer" : "not-allowed" }}
          >
            อัปโหลด
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { label, color } = CATEGORY_CONFIG[doc.category]
  const FileIcon = doc.fileType === "image" ? FileImage : doc.fileType === "pdf" ? FileText : File

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>รายละเอียดเอกสาร</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={{ ...S.modalBody, gap: 16 }}>
          {/* File icon big */}
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
            <div style={{ ...S.fileIcon, width: 64, height: 64, borderRadius: 16, background: color + "22", color, fontSize: 32 }}>
              <FileIcon size={32} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "ชื่อไฟล์", value: doc.name },
              { label: "โปรเจค", value: doc.project },
              { label: "ประเภท", value: <span style={{ color, fontWeight: 600 }}>{label}</span> },
              { label: "ขนาด", value: doc.size },
              { label: "อัปโหลดโดย", value: doc.uploadedBy },
              { label: "วันที่อัปโหลด", value: new Date(doc.uploadedAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) },
              { label: "สถานะ", value: doc.isConfidential ? <span style={{ color: "#f87171", fontWeight: 600 }}>🔒 เอกสารลับ</span> : <span style={{ color: "#34d399" }}>เปิดเผย</span> },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1a2232" }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: 13, color: "#d1d5db", textAlign: "right", maxWidth: "60%", wordBreak: "break-all" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button style={S.saveBtn}>
            <Download size={14} style={{ marginRight: 6 }} />
            ดาวน์โหลด
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
  statsRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderTop: "3px solid", borderRadius: 12, padding: "14px 18px", flex: "1 1 100px", display: "flex", flexDirection: "column", gap: 3, transition: "opacity 0.2s" },
  filterRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" },
  searchInput: { background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 14px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  select: { background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", cursor: "pointer" },
  groupHeader: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#9ca3af", marginBottom: 12 },
  groupCount: { fontSize: 11, color: "#4b5563", fontWeight: 500, marginLeft: 4 },
  docGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  docCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 6 },
  fileIcon: { width: 44, height: 44, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  confidentialBadge: { display: "flex", alignItems: "center", gap: 4, background: "#f871711a", border: "1px solid #f8717133", borderRadius: 999, padding: "2px 8px", color: "#f87171", fontSize: 10, fontWeight: 700 },
  docName: { fontSize: 13, fontWeight: 600, color: "#f9fafb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  catBadge: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999 },
  docSize: { fontSize: 11, color: "#4b5563" },
  docMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#374151", marginTop: 2 },
  docActions: { display: "flex", gap: 6, marginTop: 4, paddingTop: 10, borderTop: "1px solid #1a2232" },
  actionBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 6, color: "#9ca3af", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  empty: { color: "#374151", fontSize: 14, textAlign: "center", padding: "60px 0", fontStyle: "italic" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
  modal: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1f2937" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f9fafb" },
  closeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer" },
  modalBody: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
  modalFooter: { display: "flex", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #1f2937" },
  input: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  dropZone: { border: "2px dashed", borderRadius: 12, padding: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, cursor: "pointer", transition: "all 0.2s" },
  saveBtn: { display: "flex", alignItems: "center", background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 24px", cursor: "pointer" },
  cancelBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer", marginRight: 8 },
}
