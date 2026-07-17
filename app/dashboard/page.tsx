"use client"

import React, { useEffect, useMemo, useState } from "react"
import { backend } from "@/lib/backend"

type CommitItem = {
  id: string
  message: string
  author: string
  date: string
  url: string
}

const fallbackStats = [
  { label: "Commits this week", value: "—", change: "Loading", tone: "#4f8ef7" },
  { label: "Active branches", value: "—", change: "Loading", tone: "#34d399" },
  { label: "PRs merged", value: "—", change: "Loading", tone: "#a78bfa" },
  { label: "Deploy cadence", value: "—", change: "Loading", tone: "#f59e0b" },
]

const weekly = [42, 58, 76, 68, 88, 92, 81]

export default function GitPage() {
  const [commits, setCommits] = useState<CommitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [repo, setRepo] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const data = await backend.gitPulse()
        if (data.commits) {
          setCommits(data.commits)
          setRepo(data.repo || "")
        } else {
          throw new Error(data.message || "ไม่พบข้อมูล")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const stats = useMemo(() => [
    { label: "Latest commit", value: commits[0]?.message || "—", change: commits[0] ? "Live from GitHub" : "Waiting", tone: "#4f8ef7" },
    { label: "Repo", value: repo || "—", change: repo ? "Connected" : "Pending", tone: "#34d399" },
    { label: "Recent pushes", value: String(commits.length), change: commits.length ? "Fetched" : "Waiting", tone: "#a78bfa" },
    { label: "Deploy cadence", value: "Live", change: "Auto refresh", tone: "#f59e0b" },
  ], [commits, repo])

  return (
    <div style={S.page}>
      <div style={S.hero}>
        <div>
          <div style={S.eyebrow}>Git Pulse</div>
          <h1 style={S.title}>GitHub activity, connected in real time</h1>
          <p style={S.subtitle}>
            Recent commits from your repository are pulled directly from GitHub and shown here.
          </p>
        </div>
        <div style={S.liveBadge}>● Live from GitHub</div>
      </div>

      <div style={S.statsGrid}>
        {(loading ? fallbackStats : stats).map((item) => (
          <div key={item.label} style={S.statCard}>
            <div style={{ ...S.dot, background: item.tone }} />
            <div style={S.statLabel}>{item.label}</div>
            <div style={S.statValue}>{item.value}</div>
            <div style={{ ...S.statChange, color: item.tone }}>{item.change}</div>
          </div>
        ))}
      </div>

      <div style={S.mainGrid}>
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div>
              <div style={S.panelTitle}>Recent commits</div>
              <div style={S.panelSub}>Latest commits from GitHub</div>
            </div>
            {repo ? <div style={S.repoTag}>{repo}</div> : null}
          </div>

          {loading ? (
            <div style={S.emptyState}>กำลังโหลดข้อมูลจาก GitHub…</div>
          ) : error ? (
            <div style={S.emptyState}>{error}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {commits.map((commit) => (
                <a key={commit.id} href={commit.url} target="_blank" rel="noreferrer" style={S.commitRow}>
                  <div style={S.avatar}>{commit.author.slice(0, 1).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <div style={S.commitMessage}>{commit.message}</div>
                      <div style={S.commitTime}>{new Date(commit.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</div>
                    </div>
                    <div style={S.commitMeta}>{commit.author}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div>
              <div style={S.panelTitle}>Repository status</div>
              <div style={S.panelSub}>Current connection state</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={S.statusBox}>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Connection</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f9fafb" }}>{repo ? "Connected" : "Pending"}</div>
            </div>
            <div style={S.statusBox}>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>Latest data</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f9fafb" }}>{commits[0] ? "Fetched successfully" : "Waiting"}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={S.bottomGrid}>
        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div>
              <div style={S.panelTitle}>Weekly activity</div>
              <div style={S.panelSub}>Simple visual overview</div>
            </div>
          </div>

          <div style={S.chartWrap}>
            {weekly.map((value, index) => (
              <div key={`${value}-${index}`} style={S.barCol}>
                <div style={{ ...S.bar, height: `${value}%` }} />
                <div style={S.barLabel}>{["M", "T", "W", "T", "F", "S", "S"][index]}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={S.panel}>
          <div style={S.panelHeader}>
            <div>
              <div style={S.panelTitle}>Next focus</div>
              <div style={S.panelSub}>Useful follow-up items</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Review the latest GitHub updates",
              "Keep milestone work moving",
              "Monitor the newest merged changes",
            ].map((item) => (
              <div key={item} style={S.focusItem}>
                <div style={{ ...S.dot, background: "#4f8ef7" }} />
                <span style={{ color: "#e5e7eb", fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0d1117",
    color: "#e5e7eb",
    padding: "28px 32px",
    fontFamily: "'DM Sans','Segoe UI',sans-serif",
  },
  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: "24px 28px",
    borderRadius: 20,
    background: "linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(17, 24, 39, 0.95))",
    border: "1px solid #1f2937",
    marginBottom: 18,
    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
  },
  eyebrow: { fontSize: 12, fontWeight: 700, color: "#4f8ef7", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: "#f9fafb" },
  subtitle: { margin: "8px 0 0", color: "#9ca3af", fontSize: 14, maxWidth: 620 },
  liveBadge: { padding: "8px 12px", borderRadius: 999, background: "rgba(52, 211, 153, 0.12)", color: "#34d399", fontSize: 13, fontWeight: 700 },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 18 },
  statCard: { background: "#111827", border: "1px solid #1f2937", borderRadius: 16, padding: 16, position: "relative", boxShadow: "0 8px 22px rgba(0,0,0,0.18)" },
  dot: { width: 10, height: 10, borderRadius: "50%", marginBottom: 10 },
  statLabel: { fontSize: 12, color: "#9ca3af", marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: 700, color: "#f9fafb" },
  statChange: { fontSize: 12, marginTop: 4, fontWeight: 600 },
  mainGrid: { display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 18, marginBottom: 18 },
  bottomGrid: { display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 18 },
  panel: { background: "#111827", border: "1px solid #1f2937", borderRadius: 18, padding: 18, boxShadow: "0 10px 24px rgba(0,0,0,0.18)" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  panelTitle: { fontSize: 16, fontWeight: 700, color: "#f9fafb" },
  panelSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  ghostBtn: { background: "transparent", border: "1px solid #374151", borderRadius: 999, color: "#9ca3af", padding: "7px 12px", fontSize: 12, cursor: "pointer" },
  commitRow: { display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(17, 24, 39, 0.8)", border: "1px solid #1f2937" },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "#4f8ef7", color: "#fff", fontWeight: 700, fontSize: 13 },
  commitMessage: { fontSize: 13, fontWeight: 700, color: "#f9fafb" },
  commitTime: { fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" },
  commitMeta: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  branchName: { fontSize: 13, color: "#f9fafb", fontWeight: 700 },
  branchHealth: { fontSize: 12, color: "#34d399", fontWeight: 700 },
  progressTrack: { height: 8, borderRadius: 999, background: "#1f2937", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #4f8ef7, #34d399)" },
  chartWrap: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, height: 170, paddingTop: 12 },
  barCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  bar: { width: "100%", maxWidth: 28, borderRadius: 999, background: "linear-gradient(180deg, #4f8ef7, #34d399)" },
  barLabel: { fontSize: 11, color: "#6b7280" },
  focusItem: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "rgba(17, 24, 39, 0.8)", border: "1px solid #1f2937" },
  repoTag: { fontSize: 11, padding: "6px 10px", borderRadius: 999, background: "rgba(52, 211, 153, 0.12)", color: "#34d399", fontWeight: 700 },
  emptyState: { padding: "16px 12px", borderRadius: 12, background: "rgba(17, 24, 39, 0.8)", border: "1px solid #1f2937", color: "#9ca3af", fontSize: 13 },
  statusBox: { padding: "10px 12px", borderRadius: 12, background: "rgba(17, 24, 39, 0.8)", border: "1px solid #1f2937" },
}
