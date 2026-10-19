import { contextBridge, ipcRenderer } from 'electron'

// Expose typed API từ main process sang renderer (React)
// Đây là bridge an toàn — renderer không có quyền node trực tiếp

type IpcResponse<T = unknown> = Promise<{ success: boolean; data?: T; error?: string }>

const api = {
  // ── AI ───────────────────────────────────────────────────────────────────
  ai: {
    enhance: (imagePath: string, beautyLevel: number): IpcResponse =>
      ipcRenderer.invoke('ai:enhance', { imagePath, beautyLevel }),

    composite: (imagePath: string, framePath: string): IpcResponse =>
      ipcRenderer.invoke('ai:composite', { imagePath, framePath }),

    generateQr: (sessionId: string, imagePath: string): IpcResponse =>
      ipcRenderer.invoke('ai:generate-qr', { sessionId, imagePath }),
  },

  // ── Print ────────────────────────────────────────────────────────────────
  print: {
    send: (imagePath: string, copies: number): IpcResponse =>
      ipcRenderer.invoke('print:send', { imagePath, copies }),

    listPrinters: (): IpcResponse =>
      ipcRenderer.invoke('print:list-printers'),
  },

  // ── Camera ───────────────────────────────────────────────────────────────
  camera: {
    list: (): IpcResponse =>
      ipcRenderer.invoke('camera:list'),

    capture: (cameraId: string, savePath: string): IpcResponse =>
      ipcRenderer.invoke('camera:capture', { cameraId, savePath }),

    getDriverStatus: (): IpcResponse<{
      bundled: boolean
      installed: boolean
      cameraConnected: boolean
      cameraModel?: string
      setupPath?: string
      digiCamInstalled?: boolean
      digiCamBundled?: boolean
    }> => ipcRenderer.invoke('camera:get-driver-status'),

    installCanonDriver: (): IpcResponse<{ message?: string }> =>
      ipcRenderer.invoke('camera:install-canon-driver'),

    installDigiCam: (): IpcResponse<{ message?: string }> =>
      ipcRenderer.invoke('camera:install-digicam'),

    /** EDSDK: Kích hoạt chụp ảnh máy ảnh thật, trả về dataUrl ảnh gốc 24MP */
    edsdkCapture: (savePath: string, shotIndex: number): IpcResponse<{
      savedPath: string
      dataUrl: string
      source: string
      resolution: string
    }> => ipcRenderer.invoke('camera:edsdk-capture', { savePath, shotIndex }),

    /** EDSDK: Lấy 1 frame Live View chất lượng cao từ máy ảnh */
    edsdkLiveviewFrame: (): IpcResponse<{ dataUrl: string }> =>
      ipcRenderer.invoke('camera:edsdk-liveview-frame'),

    /** Canon Persistent Daemon Status */
    canonDaemonStatus: (): IpcResponse<{ running: boolean; url: string }> =>
      ipcRenderer.invoke('camera:canon-daemon-status'),
  },

  // ── Config ───────────────────────────────────────────────────────────────
  config: {
    get: (key: string): IpcResponse =>
      ipcRenderer.invoke('config:get', key),

    set: (key: string, value: unknown): IpcResponse =>
      ipcRenderer.invoke('config:set', { key, value }),
  },

  // ── Storage (Downloads folder) ────────────────────────────────────────────
  storage: {
    getDownloadsPath: (): IpcResponse<{ path: string; baseDownloads: string }> =>
      ipcRenderer.invoke('storage:get-downloads-path'),

    savePhoto: (dataUrl: string, fileName: string): IpcResponse<{ savedPath: string }> =>
      ipcRenderer.invoke('storage:save-photo', { dataUrl, fileName }),

    openFolder: (targetPath?: string): IpcResponse =>
      ipcRenderer.invoke('storage:open-folder', targetPath),

    uploadDriveSession: (payload: {
      parentFolderId: string
      subfolderName: string
      files: Array<{ name: string; dataUrl: string }>
      webhookUrl?: string
    }): IpcResponse<{
      localDir: string
      cloudFolderUrl: string
      cloudFolderId: string
      subfolderName: string
      filesCount: number
    }> => ipcRenderer.invoke('storage:upload-drive-session', payload),
  },
}

// Expose as 'fotolism' (new brand), keep 'joyBooth' alias for backward compat
contextBridge.exposeInMainWorld('fotolism', api)
contextBridge.exposeInMainWorld('joyBooth', api) // backward compat alias

// TypeScript type declaration cho renderer
export type FotolismAPI = typeof api
/** @deprecated Use FotolismAPI */
export type JoyBoothAPI = typeof api
