"use client"

import { useState, useMemo, useRef } from "react"
import { FileText, FileImage, File, Download, Trash2, Upload, Search, FolderOpen, Eye, Lock } from "lucide-react"
import {
  MOCK_CURRENT_USER, MOCK_PROJECTS, MOCK_DOCUMENTS, CATEGORY_CONFIG,
  type Document, type DocCategory,
} from "@/lib/mockData"
import { useNotifications } from "@/lib/notificationStore"

export default function DocumentVaultPage() {
  const user = MOCK_CURRENT_USER
  const isAdmin = user.role === "admin"

  const myProjectIds = useMemo(() =>
    isAdmin ? MOCK_PROJECTS.map((p) => p.id)
            : MOCK_PROJECTS.filter((p) => p.ownerId === user.id).map((p) => p.id),
    [isAdmin, user.id]
  )

  const baseDocs = useMemo(() => {
    const visible = MOCK_DOCUMENTS.filter((d) => myProjectIds.includes(d.projectId))
    // customer ไม่เห็นเอกสารลับ
    return isAdmin ? visible : visible.filter((d) => !d.isConfidential)
  }, [isAdmin, myProjectIds])

  const { addNotif } = useNotifications()
  const [docs, setDocs] = useState<Document[]>(baseDocs)
  const [search, setSearch] = useState("")
  const [filterProject, setFilterProject] = useState<number | "all">("all")
  const [filterCategory, setFilterCategory] = useState<DocCategory | "all">("all")
  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)

  const myProjects = MOCK_PROJECTS.filter((p) => myProjectIds.includes(p.id))

  const filtered = docs.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    const matchProject = filterProject === "all" || d.projectId === filterProject
    const matchCategory = filterCategory === "all" || d.category === filterCategory
    return matchSearch && matchProject && matchCategory
  })

  // Group by project
  const grouped = myProjects.reduce<Record<number, Document[]>>((acc, proj) => {
    const items = filtered.filter((d) => d.projectId === proj.id)
    if (items.length > 0) acc[proj.id] = items
    return acc
  }, {})

  function handleUpload(newDoc: Omit<Document, "id">) {
    setDocs((prev) => [...prev, { ...newDoc, id: Date.now() }])
    const proj = MOCK_PROJECTS.find((p) => p.id === newDoc.projectId)
    addNotif({
      type: "document",
      title: "อัปโหลดเอกสารใหม่",
      message: `Admin อัปโหลด ${newDoc.name} ใน ${proj?.name}`,
      forUserId: proj?.ownerId ?? "all",
    })
    setShowUpload(false)
  }

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Document Vault</h1>
          <p style={S.subtitle}>{docs.length} เอกสาร{isAdmin ? "ทั้งหมด" : "ของโปรเจคคุณ"}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowUpload(true)} style={S.addBtn}>
            <Upload size={15} /> อัปโหลดเอกสาร
          </button>
        )}
      </div>

      {/* Role badge */}
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

      {/* Category stats */}
      <div style={S.statsRow}>
        {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((cat) => {
          const count = docs.filter((d) => d.category === cat).length
          return (
            <button key={cat} onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              style={{ ...S.statCard, borderTopColor: CATEGORY_CONFIG[cat].color, opacity: filterCategory !== "all" && filterCategory !== cat ? 0.4 : 1, cursor: "pointer" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f9fafb", fontFamily: "monospace" }}>{count}</div>
              <div style={{ fontSize: 11, color: CATEGORY_CONFIG[cat].color, fontWeight: 600 }}>{CATEGORY_CONFIG[cat].label}</div>
            </button>
          )
        })}
      </div>

      {/* Filters */}
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

      {/* Grouped docs */}
      {Object.keys(grouped).length === 0 ? (
        <div style={S.empty}>ไม่พบเอกสาร</div>
      ) : (
        Object.entries(grouped).map(([projId, items]) => {
          const proj = MOCK_PROJECTS.find((p) => p.id === Number(projId))
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
                    onDelete={() => {
                      if (confirm("ลบเอกสารนี้?")) {
                        const proj = MOCK_PROJECTS.find((p) => p.id === doc.projectId)
                        setDocs((prev) => prev.filter((d) => d.id !== doc.id))
                        addNotif({
                          type: "document",
                          title: "เอกสารถูกลบ",
                          message: `Admin ลบ ${doc.name} ออกจาก ${proj?.name}`,
                          forUserId: proj?.ownerId ?? "all",
                        })
                      }
                    }} />
                ))}
              </div>
            </div>
          )
        })
      )}

      {showUpload && isAdmin && (
        <UploadModal projectIds={myProjectIds} onClose={() => setShowUpload(false)} onUpload={handleUpload} />
      )}
      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  )
}

function DocCard({ doc, isAdmin, onPreview, onDelete }: {
  doc: Document; isAdmin: boolean; onPreview: () => void; onDelete: () => void
}) {
  const { label, color } = CATEGORY_CONFIG[doc.category]
  const FileIcon = doc.fileType === "image" ? FileImage : doc.fileType === "pdf" ? FileText : File
  return (
    <div style={S.docCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ ...S.fileIcon, background: color + "22", color }}><FileIcon size={20} /></div>
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
        <span>{new Date(doc.uploadedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
      </div>
      <div style={S.docActions}>
        <button onClick={onPreview} style={S.actionBtn} title="ดูรายละเอียด"><Eye size={12} /></button>
        <button style={S.actionBtn} title="ดาวน์โหลด"><Download size={12} /></button>
        {isAdmin && (
          <button onClick={onDelete} style={{ ...S.actionBtn, color: "#f87171" }} title="ลบ"><Trash2 size={12} /></button>
        )}
      </div>
    </div>
  )
}

function UploadModal({ projectIds, onClose, onUpload }: {
  projectIds: number[]; onClose: () => void; onUpload: (d: Omit<Document, "id">) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [form, setForm] = useState({ projectId: projectIds[0] || 0, category: "contract" as DocCategory, isConfidential: false })

  function getFileType(name: string): Document["fileType"] {
    const ext = name.split(".").pop()?.toLowerCase()
    if (["jpg","jpeg","png","gif","webp"].includes(ext||"")) return "image"
    if (ext === "pdf") return "pdf"
    if (["doc","docx","txt","md"].includes(ext||"")) return "doc"
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
            style={{ ...S.dropZone, borderColor: selectedFile ? "#4f8ef7" : "#1f2937", background: selectedFile ? "#0f1f3d" : "#0d1117" }}>
            <Upload size={22} color={selectedFile ? "#4f8ef7" : "#374151"} />
            <div style={{ fontSize: 13, color: selectedFile ? "#4f8ef7" : "#4b5563" }}>
              {selectedFile ? selectedFile.name : "คลิกเพื่อเลือกไฟล์"}
            </div>
            <input ref={fileRef} type="file" style={{ display: "none" }} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
          </div>
          <Field label="โปรเจค">
            <select value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: Number(e.target.value) }))} style={S.input}>
              {projectIds.map((id) => {
                const p = MOCK_PROJECTS.find((x) => x.id === id)
                return <option key={id} value={id}>{p?.name}</option>
              })}
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
            <label htmlFor="conf" style={{ fontSize: 13, color: "#9ca3af", cursor: "pointer" }}>เอกสารลับ</label>
          </div>
        </div>
        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={S.cancelBtn}>ยกเลิก</button>
          <button disabled={!selectedFile}
            onClick={() => selectedFile && onUpload({
              name: selectedFile.name, projectId: form.projectId, category: form.category,
              size: selectedFile.size > 1048576 ? `${(selectedFile.size/1048576).toFixed(1)} MB` : `${(selectedFile.size/1024).toFixed(0)} KB`,
              uploadedBy: "Admin", uploadedAt: new Date().toISOString().split("T")[0],
              isConfidential: form.isConfidential, fileType: getFileType(selectedFile.name),
            })}
            style={{ ...S.saveBtn, opacity: selectedFile ? 1 : 0.5, cursor: selectedFile ? "pointer" : "not-allowed" }}>
            อัปโหลด
          </button>
        </div>
      </div>
    </div>
  )
}

function PreviewModal({ doc, onClose }: { doc: Document; onClose: () => void }) {
  const { label, color } = CATEGORY_CONFIG[doc.category]
  const project = MOCK_PROJECTS.find((p) => p.id === doc.projectId)
  const FileIcon = doc.fileType === "image" ? FileImage : doc.fileType === "pdf" ? FileText : File
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <div style={S.modalTitle}>รายละเอียดเอกสาร</div>
          <button onClick={onClose} style={S.closeBtn}>✕</button>
        </div>
        <div style={{ ...S.modalBody, gap: 0 }}>
          <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
            <div style={{ ...S.fileIcon, width: 56, height: 56, borderRadius: 14, background: color + "22", color }}><FileIcon size={28} /></div>
          </div>
          {[
            ["ชื่อไฟล์", doc.name],
            ["โปรเจค", project?.name],
            ["ประเภท", label],
            ["ขนาด", doc.size],
            ["อัปโหลดโดย", doc.uploadedBy],
            ["วันที่", new Date(doc.uploadedAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })],
            ["สถานะ", doc.isConfidential ? "🔒 เอกสารลับ" : "เปิดเผย"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #1a2232" }}>
              <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{k}</span>
              <span style={{ fontSize: 13, color: "#d1d5db", maxWidth: "60%", wordBreak: "break-all", textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ ...S.modalFooter, justifyContent: "flex-end" }}>
          <button style={S.saveBtn}><Download size={13} style={{ marginRight: 6 }} />ดาวน์โหลด</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{label}</label>{children}</div>
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#0d1117", minHeight: "100vh", padding: "28px 32px", fontFamily: "'DM Sans','Segoe UI',sans-serif", color: "#e5e7eb" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 700, color: "#f9fafb", margin: 0, letterSpacing: "-0.02em" },
  subtitle: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  addBtn: { display: "flex", alignItems: "center", gap: 7, background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer" },
  roleBadge: { fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999 },
  statsRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderTop: "3px solid", borderRadius: 12, padding: "14px 18px", flex: "1 1 100px", display: "flex", flexDirection: "column", gap: 3, transition: "opacity 0.2s" },
  filterRow: { display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" },
  searchInput: { background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 14px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  select: { background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", cursor: "pointer" },
  groupHeader: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#9ca3af", marginBottom: 12 },
  groupCount: { fontSize: 11, color: "#4b5563", marginLeft: 4 },
  docGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
  docCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: "16px", display: "flex", flexDirection: "column", gap: 6 },
  fileIcon: { width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" },
  confBadge: { display: "flex", alignItems: "center", gap: 3, background: "#f871711a", border: "1px solid #f8717133", borderRadius: 999, padding: "2px 7px", color: "#f87171", fontSize: 10, fontWeight: 700 },
  docName: { fontSize: 12, fontWeight: 600, color: "#f9fafb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const },
  catBadge: { fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999 },
  docMeta: { display: "flex", justifyContent: "space-between", fontSize: 11, color: "#374151", marginTop: 2 },
  docActions: { display: "flex", gap: 6, marginTop: 4, paddingTop: 8, borderTop: "1px solid #1a2232" },
  actionBtn: { background: "#1f2937", border: "1px solid #374151", borderRadius: 6, color: "#9ca3af", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center" },
  empty: { color: "#374151", fontSize: 14, textAlign: "center", padding: "60px 0", fontStyle: "italic" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 },
  modal: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, width: "100%", maxWidth: 460, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #1f2937" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#f9fafb" },
  closeBtn: { background: "transparent", border: "none", color: "#6b7280", fontSize: 16, cursor: "pointer" },
  modalBody: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 },
  modalFooter: { display: "flex", alignItems: "center", padding: "16px 24px", borderTop: "1px solid #1f2937" },
  input: { background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: "9px 12px", color: "#f9fafb", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" as const },
  dropZone: { border: "2px dashed", borderRadius: 12, padding: "28px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", transition: "all 0.2s" },
  saveBtn: { display: "flex", alignItems: "center", background: "#4f8ef7", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600, padding: "9px 20px", cursor: "pointer" },
  cancelBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 8, color: "#9ca3af", fontSize: 13, fontWeight: 600, padding: "9px 18px", cursor: "pointer", marginRight: 8 },
}
