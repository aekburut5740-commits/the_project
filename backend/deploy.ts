import { $ } from "bun"
import path from "path"
import fs from "fs"

const BACKEND_DIR = path.resolve(import.meta.dir)
const WORKSPACE_ROOT = path.join(BACKEND_DIR, "workspace")
const WORK_ROOT = path.join(BACKEND_DIR, "work")
const STATUS_DIR = path.join(BACKEND_DIR, "deploy-status")

export type DeployStatus = {
  state: "idle" | "building" | "ready" | "error"
  projectName: string
  repo?: string
  commit?: string
  lastBuildAt?: string
  error?: string
  outputDir?: string
}

export function slugify(name: string): string {
  return String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
}

function statusFile(name: string): string {
  return path.join(STATUS_DIR, `${slugify(name)}.json`)
}

export function getDeployStatus(name: string): DeployStatus {
  try {
    const raw = fs.readFileSync(statusFile(name), "utf-8")
    return JSON.parse(raw) as DeployStatus
  } catch {
    return { state: "idle", projectName: name }
  }
}

function saveStatus(status: DeployStatus) {
  fs.mkdirSync(STATUS_DIR, { recursive: true })
  fs.writeFileSync(statusFile(status.projectName), JSON.stringify(status, null, 2))
}

function extractRepo(project: any): string {
  const candidates = [project?.domain, project?.website, project?.token]
  for (const raw of candidates) {
    if (!raw || typeof raw !== "string") continue
    const source = raw.trim()
    if (source.includes("github.com/")) {
      const parts = source.replace(/\.git$/, "").split("github.com/")
      if (parts[1]) return parts[1].trim()
    }
    if (source.includes("/") && !source.startsWith("http://") && !source.startsWith("https://")) {
      return source.trim()
    }
  }
  return ""
}

function repoUrl(repo: string): string {
  const token = process.env.GITHUB_TOKEN
  if (token) return `https://x-access-token:${token}@github.com/${repo}.git`
  return `https://github.com/${repo}.git`
}

function detectOutputDir(buildScript: string): string {
  if (buildScript.includes("next build")) return "out"
  if (buildScript.includes("vite build")) return "dist"
  if (buildScript.includes("react-scripts build")) return "build"
  return ""
}

export async function deployProject(project: any): Promise<DeployStatus> {
  const name = slugify(project?.name || "project")
  const repo = extractRepo(project)
  const current = getDeployStatus(name)
  if (current.state === "building") return current

  if (!repo) {
    const err: DeployStatus = {
      state: "error",
      projectName: name,
      repo,
      error: "ไม่พบ Git Repo ในโปรเจค (กรุณากรอก Domain เช่น chalanon/database-midterm)",
      lastBuildAt: new Date().toISOString(),
    }
    saveStatus(err)
    return err
  }

  const building: DeployStatus = {
    state: "building",
    projectName: name,
    repo,
  }
  saveStatus(building)

  try {
    const cloneDir = path.join(WORKSPACE_ROOT, name, "src")
    fs.mkdirSync(path.dirname(cloneDir), { recursive: true })

    if (!fs.existsSync(path.join(cloneDir, ".git"))) {
      await $`git clone --depth 1 ${repoUrl(repo)} ${cloneDir}`.quiet().nothrow()
    } else {
      await $`git pull`.cwd(cloneDir).quiet().nothrow()
    }

    if (!fs.existsSync(path.join(cloneDir, ".git"))) {
      throw new Error("Clone Repo ไม่สำเร็จ (ตรวจ URL หรือสิทธิ์การเข้าถึง)")
    }

    const commit = (await $`git rev-parse --short HEAD`.cwd(cloneDir).quiet().nothrow().text()).trim() || "latest"

    const pkgPath = path.join(cloneDir, "package.json")
    let outputSubDir = ""
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
      const buildScript = String(pkg?.scripts?.build || "")
      const installResult = await $`npm install --no-audit --no-fund`.cwd(cloneDir).quiet().nothrow()
      if (installResult.exitCode !== 0) {
        throw new Error("ติดตั้ง dependencies (npm install) ไม่สำเร็จ")
      }
      if (buildScript) {
        const buildArgs = buildScript.includes("next build") ? ["--", "--no-lint"] : []
        const buildEnv = buildScript.includes("next build") ? { NEXT_PUBLIC_BASE_PATH: `/work/${name}` } : {}
        const buildResult = await $`npm run build ${buildArgs}`.cwd(cloneDir).env(buildEnv).quiet().nothrow()
        if (buildResult.exitCode !== 0) {
          throw new Error("Build งานไม่สำเร็จ (npm run build) — ดู error ในเทอร์มินัล")
        }
      }
      outputSubDir = detectOutputDir(buildScript)
    }

    const srcDir = outputSubDir ? path.join(cloneDir, outputSubDir) : cloneDir
    if (!fs.existsSync(srcDir)) {
      throw new Error(`ไม่พบผล build ในโฟลเดอร์ "${outputSubDir || "."}"`)
    }

    const target = path.join(WORK_ROOT, name)
    fs.rmSync(target, { recursive: true, force: true })
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.cpSync(srcDir, target, { recursive: true })

    const ready: DeployStatus = {
      state: "ready",
      projectName: name,
      repo,
      commit,
      lastBuildAt: new Date().toISOString(),
      outputDir: target,
    }
    saveStatus(ready)
    return ready
  } catch (err) {
    const failed: DeployStatus = {
      state: "error",
      projectName: name,
      repo,
      error: err instanceof Error ? err.message : "เกิดข้อผิดพลาดระหว่าง Deploy",
      lastBuildAt: new Date().toISOString(),
    }
    saveStatus(failed)
    return failed
  }
}

export function ensureDirs() {
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true })
  fs.mkdirSync(WORK_ROOT, { recursive: true })
  fs.mkdirSync(STATUS_DIR, { recursive: true })
  return { WORK_ROOT }
}
