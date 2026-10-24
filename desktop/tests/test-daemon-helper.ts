import { spawn, ChildProcess } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

let daemonProc: ChildProcess | null = null

export async function ensureDaemonRunning(): Promise<boolean> {
  try {
    const res = await fetch('http://127.0.0.1:8899/status', { signal: AbortSignal.timeout(400) })
    if (res.ok) return true
  } catch {}

  const exePath = path.resolve(__dirname, '../electron/fotolism_canon_daemon.exe')
  if (!fs.existsSync(exePath)) {
    console.warn('fotolism_canon_daemon.exe not found at:', exePath)
    return false
  }

  try {
    daemonProc = spawn(exePath, [], { detached: true, stdio: 'ignore', windowsHide: true })
    daemonProc.unref()

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 150))
      try {
        const res = await fetch('http://127.0.0.1:8899/status', { signal: AbortSignal.timeout(400) })
        if (res.ok) return true
      } catch {}
    }
  } catch (err: any) {
    console.warn('Could not launch daemon:', err.message)
  }

  return false
}
