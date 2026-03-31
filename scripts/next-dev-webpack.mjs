/**
 * Lance `next dev --webpack` de façon explicite (évite Turbopack par défaut sous Next.js 16).
 * Utile si le script npm est ignoré ou si l'IDE lance `next dev` sans flags.
 */
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next")

const extraArgs = process.argv.slice(2)

const child = spawn(process.execPath, [nextBin, "dev", "--webpack", ...extraArgs], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env },
  shell: false,
})

child.on("exit", (code) => process.exit(code ?? 0))
