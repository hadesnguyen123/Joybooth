import { app, BrowserWindow, ipcMain, shell, screen } from 'electron'
import { join } from 'path'
import * as path from 'path'
import * as fs from 'fs'
import { execSync, exec, spawn, ChildProcess } from 'child_process'
import { SessionDB } from './sessionDatabase.cjs'

// ─── FOTOLISM ELECTRON BACKEND CONFIGURATION ─────────────────────────────────
const isDev = process.env.NODE_ENV === 'development'
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://127.0.0.1:5173'
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8000'

// ── Hardware & Timeout Constants ──
const HARDWARE_TIMEOUT_MS = 22000
const LIVEVIEW_TIMEOUT_MS = 2000
const DEVICE_QUERY_TIMEOUT_MS = 3000
const CANON_VENDOR_ID = 'VID_04A9'

/** Asynchronously executes a CLI command with strict timeout and force-kill protection */
function runAsyncCommand(cmd: string, timeoutMs: number = HARDWARE_TIMEOUT_MS): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let settled = false
    const child = exec(cmd, { timeout: timeoutMs, windowsHide: true }, (error, stdout, stderr) => {
      if (settled) return
      settled = true
      resolve({ stdout: stdout || '', stderr: stderr || (error ? error.message : '') })
    })

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        try {
          if (child.pid) {
            exec(`taskkill /F /T /PID ${child.pid} 2>nul`, { windowsHide: true })
          }
        } catch (_k) {}
        resolve({ stdout: '', stderr: 'Command timed out' })
      }
    }, timeoutMs + 200)

    child.on('close', () => clearTimeout(timer))
  })
}

// ── Known Installation Paths for Drivers & CLI Tools ──
const CANON_UTILITY_PATHS = [
  'C:\\Program Files\\Canon\\EOS Webcam Utility',
  'C:\\Program Files (x86)\\Canon\\EOS Webcam Utility',
]

const DIGICAM_INSTALL_PATHS = [
  'C:\\Program Files (x86)\\digiCamControl\\CameraControlCmd.exe',
  'C:\\Program Files\\digiCamControl\\CameraControlCmd.exe',
]

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: !isDev,
    frame: isDev,
    kiosk: !isDev,
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  if (isDev) {
    const loadWithRetry = async (retries = 15) => {
      if (!mainWindow) return
      try {
        await mainWindow.loadURL(VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools({ mode: 'detach' })
      } catch (err) {
        if (retries > 0) {
          console.warn(`[Electron] Vite server not ready yet, retrying in 1s (${retries} retries left)...`)
          setTimeout(() => loadWithRetry(retries - 1), 1000)
        } else {
          console.error('[Electron] Failed to connect to Vite dev server:', err)
        }
      }
    }
    loadWithRetry()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── OVERHEAD MULTI-MONITOR DISPLAY MANAGER (FR-08) ─────────────────────────
let overheadWindow: BrowserWindow | null = null

function createOverheadWindow(displayId?: number) {
  const displays = screen.getAllDisplays()
  let targetDisplay = displays.find((d) => d.id === displayId)
  if (!targetDisplay) {
    targetDisplay = displays.find((d) => d.id !== screen.getPrimaryDisplay().id) || screen.getPrimaryDisplay()
  }

  if (overheadWindow && !overheadWindow.isDestroyed()) {
    try { overheadWindow.close() } catch {}
    overheadWindow = null
  }

  overheadWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: !isDev,
    frame: false,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  const overheadUrl = isDev
    ? `${VITE_DEV_SERVER_URL}?mode=overhead`
    : `file://${join(__dirname, '../dist/index.html')}?mode=overhead`

  overheadWindow.loadURL(overheadUrl)
  overheadWindow.on('closed', () => {
    overheadWindow = null
  })
}

// ─── FOTOLISM STORAGE DIRECTORY (ƯU TIÊN Ổ D:\) ──────────────────────────────
const SAVE_FOLDER_NAME = 'Fotolism_image'
const STORAGE_DRIVE_CANDIDATES = ['D:\\', 'F:\\']

function getFotolismDir(): string {
  for (const drive of STORAGE_DRIVE_CANDIDATES) {
    if (fs.existsSync(drive)) {
      const targetPath = join(drive, SAVE_FOLDER_NAME)
      try {
        if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true })
        return targetPath
      } catch (_err) {
        /* proceed to next drive candidate */
      }
    }
  }

  // Fallback nếu không có quyền ghi vào các ổ cứng chính
  const fallbackPath = join(app.getPath('downloads'), SAVE_FOLDER_NAME)
  if (!fs.existsSync(fallbackPath)) fs.mkdirSync(fallbackPath, { recursive: true })
  return fallbackPath
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// AI Service Handlers
ipcMain.handle('ai:enhance', async (_event, payload: { imagePath: string; beautyLevel: number }) => {
  const res = await fetch(`${AI_SERVICE_URL}/enhance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
})

ipcMain.handle('ai:composite', async (_event, payload: { imagePath: string; framePath: string }) => {
  const res = await fetch(`${AI_SERVICE_URL}/composite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
})

ipcMain.handle('ai:generate-qr', async (_event, payload: { sessionId: string; imagePath: string }) => {
  const res = await fetch(`${AI_SERVICE_URL}/qr/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
})

// Print Handlers
ipcMain.handle('print:send', async (_event, payload: { imagePath: string; copies: number }) => {
  const res = await fetch(`${AI_SERVICE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
})

ipcMain.handle('print:list-printers', async () => {
  const res = await fetch(`${AI_SERVICE_URL}/print/printers`)
  return res.json()
})

// Camera Basic Handlers
ipcMain.handle('camera:list', async () => {
  const res = await fetch(`${AI_SERVICE_URL}/camera/list`)
  return res.json()
})

ipcMain.handle('camera:capture', async (_event, payload: { cameraId: string; savePath: string }) => {
  const res = await fetch(`${AI_SERVICE_URL}/camera/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
})

// ─── CANON EOS DRIVER HELPER ─────────────────────────────────────────────────
function findCanonDriverSetupPath(): string | null {
  const candidates = [
    join(app.getAppPath(), 'resources/drivers/EOSWebcamUtility/Setup.exe'),
    join(process.resourcesPath || '', 'resources/drivers/EOSWebcamUtility/Setup.exe'),
    join(process.resourcesPath || '', 'drivers/EOSWebcamUtility/Setup.exe'),
    join(__dirname, '../resources/drivers/EOSWebcamUtility/Setup.exe'),
    join(__dirname, '../../resources/drivers/EOSWebcamUtility/Setup.exe'),
    join(process.cwd(), 'desktop/resources/drivers/EOSWebcamUtility/Setup.exe'),
    join(process.cwd(), 'resources/drivers/EOSWebcamUtility/Setup.exe'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function findDigiCamSetupPath(): string | null {
  const candidates = [
    join(app.getAppPath(), 'resources/drivers/digiCamControl/digiCamControlsetup.exe'),
    join(process.resourcesPath || '', 'resources/drivers/digiCamControl/digiCamControlsetup.exe'),
    join(process.resourcesPath || '', 'drivers/digiCamControl/digiCamControlsetup.exe'),
    join(__dirname, '../resources/drivers/digiCamControl/digiCamControlsetup.exe'),
    join(__dirname, '../../resources/drivers/digiCamControl/digiCamControlsetup.exe'),
    join(process.cwd(), 'desktop/resources/drivers/digiCamControl/digiCamControlsetup.exe'),
    join(process.cwd(), 'resources/drivers/digiCamControl/digiCamControlsetup.exe'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

ipcMain.handle('camera:get-driver-status', async () => {
  const setupPath = findCanonDriverSetupPath()
  const bundled = setupPath !== null
  const installed = CANON_UTILITY_PATHS.some((p) => fs.existsSync(p))

  // Kiểm tra digiCamControl (EDSDK Shutter Control)
  const digiCamInstalled = DIGICAM_INSTALL_PATHS.some((p) => fs.existsSync(p))
  const digiCamSetupPath = findDigiCamSetupPath()

  let cameraConnected = false
  let cameraModel = ''

  try {
    const stdout = execSync(
      `powershell -NoProfile -Command "Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object InstanceId -match '${CANON_VENDOR_ID}' | Select-Object -ExpandProperty FriendlyName -First 1"`,
      { encoding: 'utf-8', timeout: DEVICE_QUERY_TIMEOUT_MS }
    ).trim()
    if (stdout) {
      cameraConnected = true
      cameraModel = stdout
    }
  } catch (_e) {
    /* ignore */
  }

  return {
    success: true,
    data: {
      bundled,
      installed,
      cameraConnected,
      cameraModel: cameraModel || (cameraConnected ? 'Canon EOS Camera' : undefined),
      setupPath,
      digiCamInstalled,
      digiCamBundled: digiCamSetupPath !== null,
    },
  }
})

ipcMain.handle('camera:install-canon-driver', async () => {
  const setupPath = findCanonDriverSetupPath()
  if (!setupPath) {
    return { success: false, error: 'Không tìm thấy bộ cài driver Canon EOS.' }
  }
  try {
    const res = await shell.openPath(setupPath)
    if (res) return { success: false, error: res }
    return { success: true, data: { message: 'Đã khởi chạy trình cài đặt Canon EOS Webcam Utility.' } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('camera:install-digicam', async () => {
  const setupPath = findDigiCamSetupPath()
  if (!setupPath) {
    return { success: false, error: 'Không tìm thấy bộ cài digiCamControl trong thư mục resources.' }
  }
  try {
    const res = await shell.openPath(setupPath)
    if (res) return { success: false, error: res }
    return { success: true, data: { message: 'Đã mở trình cài đặt digiCamControl trên màn hình của bạn. Vui lòng bấm Next để hoàn tất.' } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// ─── CANON EDSDK PERSISTENT DAEMON (ZERO DELAY & PURE LIVEVIEW) ──────────────
const CANON_DAEMON_PORT = 8899
const CANON_DAEMON_URL = `http://127.0.0.1:${CANON_DAEMON_PORT}`
let canonDaemonProc: ChildProcess | null = null

async function checkCanonDaemon(): Promise<boolean> {
  try {
    const res = await fetch(`${CANON_DAEMON_URL}/status`, { signal: AbortSignal.timeout(400) })
    if (res.ok) {
      const data = (await res.json()) as any
      return Boolean(data.connected)
    }
  } catch {}
  return false
}

async function ensureCanonDaemon(): Promise<boolean> {
  if (await checkCanonDaemon()) return true

  const daemonPaths = [
    path.join(__dirname, '../electron/fotolism_canon_daemon.exe'),
    path.join(app.getAppPath(), 'electron/fotolism_canon_daemon.exe'),
    'F:/JoyBooth/desktop/electron/fotolism_canon_daemon.exe',
  ]
  const daemonExe = daemonPaths.find((p) => fs.existsSync(p))
  if (!daemonExe) {
    console.warn('[Canon Daemon] Daemon executable not found')
    return false
  }

  try {
    console.log(`[Canon Daemon] Launching high-speed daemon: ${daemonExe}`)
    canonDaemonProc = spawn(daemonExe, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    canonDaemonProc.unref()

    // Chờ tối đa 3 giây để daemon mở kết nối máy ảnh và lắng nghe port
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 200))
      if (await checkCanonDaemon()) {
        console.log(`[Canon Daemon] Connected & listening on port ${CANON_DAEMON_PORT}`)
        return true
      }
    }
  } catch (err: any) {
    console.warn('[Canon Daemon] Spawn exception:', err.message)
  }
  return false
}

function stopCanonDaemon() {
  try {
    fetch(`${CANON_DAEMON_URL}/quit`, { signal: AbortSignal.timeout(500) }).catch(() => {})
  } catch {}
  if (canonDaemonProc && canonDaemonProc.pid) {
    try {
      exec(`taskkill /F /PID ${canonDaemonProc.pid} 2>nul`, { windowsHide: true })
    } catch {}
    canonDaemonProc = null
  }
}

ipcMain.handle('camera:canon-daemon-status', async () => {
  const isRunning = await checkCanonDaemon()
  return { success: true, data: { running: isRunning, url: CANON_DAEMON_URL } }
})

// ─── CANON PERSISTENT DAEMON DIAGNOSTICS (FR-09) ────────────────────────────
ipcMain.handle('camera:canon-diagnostics', async () => {
  try {
    const res = await fetch(`${CANON_DAEMON_URL}/api/diagnostics`, { signal: AbortSignal.timeout(1000) })
    if (res.ok) {
      const data = await res.json()
      return { success: true, data }
    }
  } catch {}
  return {
    success: true,
    data: {
      cameraState: 'DISCONNECTED',
      connected: false,
      evfReady: false,
      evfFps: 0,
      evfLatencyMs: 0,
      activeLiveViewClients: 0,
      reconnectCount: 0,
      totalCaptures: 0,
      failedCaptures: 0,
      averageCaptureLatencyMs: 0,
      recentLogs: [],
    },
  }
})

// ─── EDSDK HARDWARE CAPTURE (FOTOLISM 2.2 IDEMPOTENCY & SESSIONS) ───────────
ipcMain.handle(
  'camera:edsdk-capture',
  async (
    _event,
    payload: {
      savePath?: string
      shotIndex?: number
      captureId?: string
      sessionId?: string
      slotIndex?: number
    }
  ) => {
    try {
      const sessionId = payload.sessionId || `session_${Date.now()}`
      const slotIndex = payload.slotIndex ?? payload.shotIndex ?? 0
      const captureId = payload.captureId || `cap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

      // 1. Chụp qua Canon Daemon Persistent (FR-01, FR-02, FR-03, FR-05)
      const daemonReady = await ensureCanonDaemon()
      if (daemonReady) {
        try {
          console.log(`[Canon Daemon] Posting capture: ID=${captureId}, Session=${sessionId}, Slot=${slotIndex}`)
          const daemonRes = await fetch(`${CANON_DAEMON_URL}/api/captures`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ captureId, sessionId, slotIndex }),
            signal: AbortSignal.timeout(HARDWARE_TIMEOUT_MS),
          })

          if (daemonRes.ok) {
            const result = (await daemonRes.json()) as any
            const targetPath = result.savedPath || payload.savePath
            if (result.success && targetPath && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1000) {
              const buffer = fs.readFileSync(targetPath)
              const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1)

              // Lưu trạng thái chụp vào SQLite persistent session storage (FR-06)
              try {
                SessionDB.saveCapture({
                  id: captureId,
                  session_id: sessionId,
                  slot_index: slotIndex,
                  status: 'COMPLETED',
                  file_path: targetPath,
                  raw_file_path: targetPath,
                  is_retake: 0,
                  retake_count: 0,
                  latency_ms: result.latencyMs,
                  shutter_ms: result.shutterMs,
                  transfer_ms: result.transferMs,
                })

                SessionDB.recordMediaFile({
                  id: `media_${captureId}`,
                  session_id: sessionId,
                  capture_id: captureId,
                  type: 'raw',
                  file_path: targetPath,
                  file_size: buffer.length,
                })
              } catch (dbErr) {
                console.warn('[SessionDB] SQLite record warning:', dbErr)
              }

              console.log(
                `[Canon Daemon] Shutter success! Saved: ${targetPath} (${sizeMb} MB) in ${result.latencyMs}ms (Idempotent: ${Boolean(result.idempotent)})`
              )
              return {
                success: true,
                data: {
                  savedPath: targetPath,
                  dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
                  source: result.source || 'Canon EOS R100 (EDSDK Persistent Daemon 2.2)',
                  resolution: result.resolution || '24MP (Full Resolution)',
                  fileSizeMb: sizeMb,
                  latencyMs: result.latencyMs,
                  shutterMs: result.shutterMs,
                  transferMs: result.transferMs,
                  captureId,
                  sessionId,
                  slotIndex,
                  idempotent: Boolean(result.idempotent),
                },
              }
            } else if (result.error) {
              console.warn('[Canon Daemon] Daemon capture returned error:', result.error)
              try {
                SessionDB.saveCapture({
                  id: captureId,
                  session_id: sessionId,
                  slot_index: slotIndex,
                  status: result.status || 'FAILED',
                  file_path: targetPath,
                  is_retake: 0,
                  retake_count: 0,
                  latency_ms: result.latencyMs || 0,
                })
              } catch {}
              return { success: false, error: result.error, idempotent: Boolean(result.idempotent) }
            }
          }
        } catch (daemonErr: any) {
          console.warn('[Canon Daemon] POST /api/captures failed, trying legacy route:', daemonErr.message)
        }
      }

      // Fallback: Legacy /capture route if daemon running older revision or direct file path
      const savePath = payload.savePath || join(getFotolismDir(), `fotolism_shot_${Date.now()}.jpg`)
      const saveDir = join(savePath, '..')
      if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true })

    // 2. Fallback: Trực tiếp gọi native Canon EDSDK 64-bit EXE (KHÔNG truyền -noaf vì EOS R100 cần Halfway AF để nhả màn trập)
    const canonExePaths = [
      path.join(__dirname, '../electron/fotolism_canon_capture.exe'),
      path.join(app.getAppPath(), 'electron/fotolism_canon_capture.exe'),
      'F:/JoyBooth/desktop/electron/fotolism_canon_capture.exe',
    ]
    const canonExe = canonExePaths.find((p) => fs.existsSync(p))

    const canonScriptPaths = [
      path.join(__dirname, '../electron/canon_edsdk_capture.ps1'),
      path.join(app.getAppPath(), 'electron/canon_edsdk_capture.ps1'),
      'F:/JoyBooth/desktop/electron/canon_edsdk_capture.ps1',
    ]
    const canonScript = canonScriptPaths.find((p) => fs.existsSync(p))

    if (canonExe || canonScript) {
      try {
        const captureCmd = canonExe
          ? `"${canonExe}" -savePath "${savePath}"`
          : `powershell -NoProfile -ExecutionPolicy Bypass -File "${canonScript}" -savePath "${savePath}"`
        const { stdout } = await runAsyncCommand(captureCmd, HARDWARE_TIMEOUT_MS)

        if (fs.existsSync(savePath) && fs.statSync(savePath).size > 1000) {
          const buffer = fs.readFileSync(savePath)
          const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1)
          console.log(`[EDSDK Native 64-bit] Shutter triggered successfully! Saved: ${savePath} (${sizeMb} MB)`)
          return {
            success: true,
            data: {
              savedPath: savePath,
              dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
              source: 'Canon EOS R100 (Native 64-bit EDSDK)',
              resolution: '24MP (Full Resolution)',
              fileSizeMb: sizeMb,
            },
          }
        }

        // Parse JSON output nếu có thông báo lỗi từ script
        try {
          const parsed = JSON.parse(stdout || '{}')
          if (parsed && parsed.error) {
            console.warn('[EDSDK Native] Error:', parsed.error)
            return {
              success: false,
              error: parsed.error,
            }
          }
        } catch {}

        return {
          success: false,
          error: 'Không thể nhận được ảnh từ Canon EDSDK 64-bit.',
        }
      } catch (nativeErr: any) {
        console.warn('[EDSDK Native] Exception:', nativeErr)
        return {
          success: false,
          error: nativeErr?.message || 'Lỗi ngoại lệ khi gọi Canon EDSDK 64-bit.',
        }
      }
    }

    // 3. Fallback dự phòng: Thử qua digiCamControl CLI (EDSDK 32-bit cũ)
    const digiCamExe = DIGICAM_INSTALL_PATHS.find((p) => fs.existsSync(p))
    if (digiCamExe) {
      // Dùng flag /wait 2000 để digiCamControl có đủ 2 giây chuyển file ảnh 24MP qua USB về đĩa trước khi thoát
      const cmd = `"${digiCamExe}" /capturenoaf /wait 2000 /filename "${savePath}"`
      const { stdout, stderr } = await runAsyncCommand(cmd, HARDWARE_TIMEOUT_MS)
      const cliOutput = stdout || stderr || ''

      // Đợi file ghi hoàn tất vào ổ cứng (chống race condition USB buffer)
      let fileReady = fs.existsSync(savePath) && fs.statSync(savePath).size > 1000
      if (!fileReady) {
        for (let poll = 0; poll < 15; poll++) {
          await new Promise((r) => setTimeout(r, 100))
          if (fs.existsSync(savePath) && fs.statSync(savePath).size > 1000) {
            fileReady = true
            break
          }
        }
      }

      if (fileReady) {
        const buffer = fs.readFileSync(savePath)
        const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1)
        console.log(`[EDSDK] Shutter triggered successfully! Saved: ${savePath} (${sizeMb} MB)`)
        return {
          success: true,
          data: {
            savedPath: savePath,
            dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            source: 'Canon EOS R100 (digiCamControl EDSDK)',
            resolution: '24MP (Full Resolution)',
            fileSizeMb: sizeMb,
          },
        }
      }

      if (cliOutput.includes('No connected device was found')) {
        return {
          success: false,
          error:
            'Chưa phát hiện máy ảnh Canon EOS R100 qua cổng USB! Hãy bật máy ảnh (ON), bấm nhẹ nút chụp để đánh thức nếu đang ngủ (sleep) hoặc cắm lại cáp USB.',
        }
      }

      return {
        success: false,
        error: `Không thể chụp ảnh từ máy ảnh Canon: ${cliOutput.trim() || 'Máy ảnh không phản hồi lệnh chụp.'}`,
      }
    }

    // 3. Thử qua gPhoto2 CLI (nếu có cài trên Windows)
    try {
      await runAsyncCommand(`gphoto2 --capture-image-and-download --filename "${savePath}"`, HARDWARE_TIMEOUT_MS)
      if (fs.existsSync(savePath) && fs.statSync(savePath).size > 1000) {
        const buffer = fs.readFileSync(savePath)
        return {
          success: true,
          data: {
            savedPath: savePath,
            dataUrl: `data:image/jpeg;base64,${buffer.toString('base64')}`,
            source: 'gphoto2',
            resolution: 'full-24mp',
          },
        }
      }
    } catch (_gErr) {
      /* ignore */
    }

    return {
      success: false,
      error: 'EDSDK chưa được cài đặt. Vui lòng cài digiCamControl từ resources/drivers/digiCamControl.',
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// EDSDK: Lấy 1 frame Live View chất lượng cao
ipcMain.handle('camera:edsdk-liveview-frame', async () => {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/camera/edsdk-liveview`, {
      signal: AbortSignal.timeout(LIVEVIEW_TIMEOUT_MS),
    })
    if (res.ok) return await res.json()
    return { success: false, error: 'AI service unavailable' }
  } catch (_err) {
    return { success: false, error: 'EDSDK Live View chưa kết nối' }
  }
})

// ─── SQLITE PERSISTENT SESSION HANDLERS (FR-06) ─────────────────────────────
ipcMain.handle('session:create', (_event, sessionData) => {
  try {
    const record = SessionDB.createSession(sessionData)
    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('session:get', (_event, sessionId: string) => {
  try {
    const record = SessionDB.getSession(sessionId)
    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('session:update', (_event, payload: { id: string; updates: any }) => {
  try {
    SessionDB.updateSession(payload.id, payload.updates)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('session:get-captures', (_event, sessionId: string) => {
  try {
    const records = SessionDB.getCaptures(sessionId)
    return { success: true, data: records }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// ─── OVERHEAD MULTI-MONITOR IPC HANDLERS (FR-08) ────────────────────────────
ipcMain.handle('overhead:get-displays', () => {
  try {
    const primaryId = screen.getPrimaryDisplay().id
    const displays = screen.getAllDisplays().map((d) => ({
      id: d.id,
      label: `Màn hình ${d.id} (${d.bounds.width}x${d.bounds.height})${d.id === primaryId ? ' - Kiosk Chính' : ' - Overhead Phụ'}`,
      bounds: d.bounds,
      isPrimary: d.id === primaryId,
    }))
    return { success: true, data: displays }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('overhead:toggle', (_event, payload: { enabled: boolean; displayId?: number }) => {
  try {
    if (payload.enabled) {
      createOverheadWindow(payload.displayId)
    } else if (overheadWindow && !overheadWindow.isDestroyed()) {
      try { overheadWindow.close() } catch {}
      overheadWindow = null
    }
    return { success: true, data: { active: Boolean(overheadWindow && !overheadWindow.isDestroyed()) } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('overhead:status', () => {
  return { success: true, data: { active: Boolean(overheadWindow && !overheadWindow.isDestroyed()) } }
})

// ─── Config Handlers ─────────────────────────────────────────────────────────
ipcMain.handle('config:get', async (_event, key: string) => {
  const res = await fetch(`${AI_SERVICE_URL}/config/${key}`)
  return res.json()
})

ipcMain.handle('config:set', async (_event, payload: { key: string; value: unknown }) => {
  const res = await fetch(`${AI_SERVICE_URL}/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
})

// ─── Storage Handlers (Fotolism_image folder) ─────────────────────────────────
ipcMain.handle('storage:get-downloads-path', async () => {
  try {
    const dir = getFotolismDir()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return { success: true, data: { path: dir, baseDownloads: app.getPath('downloads') } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('storage:save-photo', async (_event, payload: { dataUrl: string; fileName: string }) => {
  try {
    const dir = getFotolismDir()
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const base64Data = payload.dataUrl.replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const targetFile = join(dir, payload.fileName)
    fs.writeFileSync(targetFile, buffer)
    return { success: true, data: { savedPath: targetFile } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('storage:open-folder', async (_event, targetPath?: string) => {
  try {
    const folderToOpen = targetPath || getFotolismDir()
    if (!fs.existsSync(folderToOpen)) fs.mkdirSync(folderToOpen, { recursive: true })
    await shell.openPath(folderToOpen)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle(
  'storage:upload-drive-session',
  async (
    _event,
    payload: {
      parentFolderId: string
      subfolderName: string
      files: Array<{ name: string; dataUrl: string }>
      webhookUrl?: string
    }
  ) => {
    try {
      const localSessionDir = join(getFotolismDir(), payload.subfolderName)
      if (!fs.existsSync(localSessionDir)) fs.mkdirSync(localSessionDir, { recursive: true })

      const savedFiles: string[] = []
      for (const item of payload.files) {
        if (!item.dataUrl) continue
        try {
          const targetFilePath = join(localSessionDir, item.name)
          if (item.dataUrl.startsWith('data:')) {
            const base64Data = item.dataUrl.replace(/^data:[^;]+;base64,/, '')
            const buffer = Buffer.from(base64Data, 'base64')
            fs.writeFileSync(targetFilePath, buffer)
            savedFiles.push(targetFilePath)
          } else if (fs.existsSync(item.dataUrl)) {
            fs.copyFileSync(item.dataUrl, targetFilePath)
            savedFiles.push(targetFilePath)
          }
        } catch (fileErr) {
          console.warn('Cannot write session file:', item.name, fileErr)
        }
      }

      let cloudFolderUrl = `https://drive.google.com/drive/folders/${payload.parentFolderId}`
      let cloudFolderId = payload.parentFolderId

      if (payload.webhookUrl && payload.webhookUrl.trim().startsWith('http')) {
        try {
          const res = await fetch(payload.webhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_session_folder',
              parentFolderId: payload.parentFolderId,
              folderName: payload.subfolderName,
              files: payload.files.map((f) => ({ name: f.name, dataUrl: f.dataUrl })),
            }),
          })
          const resJson: any = await res.json()
          if (resJson && resJson.success && resJson.folderUrl) {
            cloudFolderUrl = resJson.folderUrl
            cloudFolderId = resJson.folderId || cloudFolderId
          }
        } catch (netErr: any) {
          console.warn('Google Drive Webhook upload error:', netErr.message)
        }
      }

      return {
        success: true,
        data: {
          localDir: localSessionDir,
          cloudFolderUrl,
          cloudFolderId,
          subfolderName: payload.subfolderName,
          filesCount: savedFiles.length,
        },
      }
    } catch (err: any) {
      console.error('Upload drive session failed:', err)
      return { success: false, error: err.message }
    }
  }
)

// ─── App Lifecycle & Single Instance Lock ──────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()
    // Khởi động Canon Daemon Persistent trong nền ngay khi mở ứng dụng
    ensureCanonDaemon().catch((err) => console.warn('[Canon Daemon] Init failed:', err))

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('will-quit', () => {
    stopCanonDaemon()
  })

  app.on('window-all-closed', () => {
    stopCanonDaemon()
    if (process.platform !== 'darwin') app.quit()
  })
}
