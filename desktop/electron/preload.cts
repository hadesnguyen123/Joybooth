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
  },

  // ── Config ───────────────────────────────────────────────────────────────
  config: {
    get: (key: string): IpcResponse =>
      ipcRenderer.invoke('config:get', key),

    set: (key: string, value: unknown): IpcResponse =>
      ipcRenderer.invoke('config:set', { key, value }),
  },
}

contextBridge.exposeInMainWorld('joyBooth', api)

// TypeScript type declaration cho renderer
export type JoyBoothAPI = typeof api
