import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
const AI_SERVICE_URL = 'http://localhost:8000'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: !isDev,          // fullscreen ở production
    frame: isDev,                // frame (titlebar) chỉ hiện khi dev
    kiosk: !isDev,               // kiosk mode: khóa OS taskbar
    backgroundColor: '#0d0d0d',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,    // security: tắt node trong renderer
      contextIsolation: true,    // security: context isolation
      webSecurity: true,
    },
  })

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Ngăn navigate ra ngoài app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

// Gọi AI service (FastAPI localhost)
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

// Print
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

// Camera
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

// Config / Sessions
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

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
