import { spawn } from "node:child_process"
import path from "node:path"
import { readFileSync, existsSync } from "node:fs"

const root = path.resolve(import.meta.dir, "..")
const isWin = process.platform === "win32"

function loadDotEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(file)) return out
  for (const raw of readFileSync(file, "utf-8").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return out
}

// โหลด .env ที่ root แล้วส่งต่อให้ทั้งสอง process (backend จะได้ JWT_SECRET / DB_* ครบ)
const env = { ...process.env, ...loadDotEnv(path.join(root, ".env")) }

const C = { api: "\x1b[36m", web: "\x1b[33m", dim: "\x1b[2m", reset: "\x1b[0m" }

function createLinePrinter(tag: string, color: string) {
  let buffer = ""
  return (buf: Buffer) => {
    buffer += buf.toString("utf-8")
    let idx
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, "")
      buffer = buffer.slice(idx + 1)
      if (line.trim().length) process.stdout.write(`${color}[${tag}]${C.reset} ${line}\n`)
    }
  }
}

const apiOut = createLinePrinter("api", C.api)
const webOut = createLinePrinter("web", C.web)

// Backend (Elysia/Bun) — port 4000
const api = spawn("bun", ["run", "index.ts"], {
  cwd: path.join(root, "backend"),
  env,
  stdio: ["inherit", "pipe", "pipe"],
})

// Frontend (Next.js) — port 3000
const webCmd = isWin ? "cmd.exe" : "npm"
const webArgs = isWin ? ["/c", "npm", "run", "dev:web"] : ["run", "dev:web"]
const web = spawn(webCmd, webArgs, { cwd: root, env, stdio: ["inherit", "pipe", "pipe"] })

api.stdout?.on("data", apiOut)
api.stderr?.on("data", apiOut)
web.stdout?.on("data", webOut)
web.stderr?.on("data", webOut)

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  console.log("\nStopping dev servers...")
  api.kill()
  web.kill()
  setTimeout(() => process.exit(code), 400)
}

api.on("exit", (code) => {
  if (stopping) return
  console.error(`\n${C.dim}[api] stopped unexpectedly (code ${code}). Stopping web too.${C.reset}`)
  web.kill()
  process.exit(code ?? 1)
})

web.on("exit", (code) => {
  if (stopping) return
  console.error(`\n${C.dim}[web] stopped unexpectedly (code ${code}). Stopping api too.${C.reset}`)
  api.kill()
  process.exit(code ?? 1)
})

process.on("SIGINT", () => stop(0))
process.on("SIGTERM", () => stop(0))

console.log(`${C.dim}Dev orchestrator started — api: http://localhost:4000  web: http://localhost:3000${C.reset}`)
