import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

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
      preload: join(__dirname, 'preload.cjs'),
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

// ─── Storage (Downloads folder default) ───────────────────────────────────────
ipcMain.handle('storage:get-downloads-path', async () => {
  try {
    const downloadsDir = app.getPath('downloads')
    const joyboothDir = join(downloadsDir, 'JoyBooth')
    if (!fs.existsSync(joyboothDir)) {
      fs.mkdirSync(joyboothDir, { recursive: true })
    }
    return { success: true, data: { path: joyboothDir, baseDownloads: downloadsDir } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('storage:save-photo', async (_event, payload: { dataUrl: string; fileName: string }) => {
  try {
    const downloadsDir = app.getPath('downloads')
    const joyboothDir = join(downloadsDir, 'JoyBooth')
    if (!fs.existsSync(joyboothDir)) {
      fs.mkdirSync(joyboothDir, { recursive: true })
    }

    // Convert dataUrl (base64) to buffer (supports both image and video webm/mp4)
    const base64Data = payload.dataUrl.replace(/^data:[^;]+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const targetFile = join(joyboothDir, payload.fileName)

    fs.writeFileSync(targetFile, buffer)
    return { success: true, data: { savedPath: targetFile } }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('storage:open-folder', async (_event, targetPath?: string) => {
  try {
    const downloadsDir = app.getPath('downloads')
    const folderToOpen = targetPath || join(downloadsDir, 'JoyBooth')
    if (!fs.existsSync(folderToOpen)) {
      fs.mkdirSync(folderToOpen, { recursive: true })
    }
    await shell.openPath(folderToOpen)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

// Tải session ảnh lên Google Drive (Tự động tạo folder con theo ngày giờ YYYY-MM-DD_HH-mm)
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
      const downloadsDir = app.getPath('downloads')
      const localSessionDir = join(downloadsDir, 'JoyBooth', payload.subfolderName)
      if (!fs.existsSync(localSessionDir)) {
        fs.mkdirSync(localSessionDir, { recursive: true })
      }

      // Lưu các file ảnh và video vào thư mục cục bộ theo ngày giờ
      const savedFiles: string[] = []
      for (const item of payload.files) {
        if (!item.dataUrl) continue
        try {
          const base64Data = item.dataUrl.replace(/^data:[^;]+;base64,/, '')
          const buffer = Buffer.from(base64Data, 'base64')
          const targetFilePath = join(localSessionDir, item.name)
          fs.writeFileSync(targetFilePath, buffer)
          savedFiles.push(targetFilePath)
        } catch (fileErr) {
          console.warn('Cannot write session file:', item.name, fileErr)
        }
      }

      let cloudFolderUrl = `https://drive.google.com/drive/folders/${payload.parentFolderId}`
      let cloudFolderId = payload.parentFolderId

      // Nếu có cấu hình Google Apps Script Webhook, gửi request tạo folder và đẩy ảnh lên Google Drive trực tiếp
      if (payload.webhookUrl && payload.webhookUrl.trim().startsWith('http')) {
        try {
          const res = await fetch(payload.webhookUrl.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create_session_folder',
              parentFolderId: payload.parentFolderId,
              folderName: payload.subfolderName,
              files: payload.files.map((f) => ({
                name: f.name,
                dataUrl: f.dataUrl,
              })),
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
