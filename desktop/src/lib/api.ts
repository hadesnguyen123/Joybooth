import {
  BRAND_NAME,
  APP_DOMAIN,
  SAVE_FOLDER_NAME,
  SAVE_ROOT_DIR,
  FILE_PREFIX_SHOT,
  FILE_PREFIX_FINAL,
  FILE_PREFIX_TIMELAPSE,
  DEFAULT_ACCOUNT_HOLDER,
} from './constants'

type IpcResponse<T = unknown> = Promise<{ success: boolean; data?: T; error?: string }>

export interface FotolismAPI {
  ai: {
    enhance: (imagePath: string, beautyLevel: number) => IpcResponse
    composite: (imagePath: string, framePath: string) => IpcResponse
    generateQr: (sessionId: string, imagePath: string) => IpcResponse
  }
  print: {
    send: (imagePath: string, copies: number) => IpcResponse
    listPrinters: () => IpcResponse
  }
  camera: {
    list: () => IpcResponse
    capture: (cameraId: string, savePath: string) => IpcResponse
    getDriverStatus: () => IpcResponse<{
      bundled: boolean
      installed: boolean
      cameraConnected: boolean
      cameraModel?: string
      setupPath?: string
    }>
    installCanonDriver: () => IpcResponse<{ message?: string }>
    installDigiCam: () => IpcResponse<{ message?: string }>
    /** EDSDK: Kích hoạt chụp ảnh máy ảnh thật, trả về dataUrl ảnh gốc 24MP */
    edsdkCapture: (savePath: string, shotIndex: number) => IpcResponse<{
      savedPath: string
      dataUrl: string
      source: string
      resolution: string
    }>
    /** EDSDK: Lấy 1 frame Live View chất lượng cao từ máy ảnh */
    edsdkLiveviewFrame: () => IpcResponse<{ dataUrl: string }>
    /** Canon Persistent Daemon Status */
    canonDaemonStatus: () => IpcResponse<{ running: boolean; url: string }>
  }
  config: {
    get: (key: string) => IpcResponse
    set: (key: string, value: unknown) => IpcResponse
  }
  storage: {
    getDownloadsPath: () => IpcResponse<{ path: string; baseDownloads: string }>
    savePhoto: (dataUrl: string, fileName: string) => IpcResponse<{ savedPath: string }>
    openFolder: (targetPath?: string) => IpcResponse
    uploadDriveSession: (payload: {
      parentFolderId: string
      subfolderName: string
      files: Array<{ name: string; dataUrl: string }>
      webhookUrl?: string
    }) => IpcResponse<{
      localDir: string
      cloudFolderUrl: string
      cloudFolderId: string
      subfolderName: string
      filesCount: number
    }>
  }
}

/** @deprecated Use FotolismAPI */
export type JoyBoothAPI = FotolismAPI

// Type-safe wrapper cho window.fotolism API
declare global {
  interface Window {
    fotolism: FotolismAPI
    joyBooth: FotolismAPI // backward compat alias
  }
}

import { notifyApiError, notifyApiWarning, type LogCategory } from '../store/logStore'

function wrapApiModule<T extends Record<string, any>>(category: LogCategory, moduleGetter: () => T): T {
  return new Proxy({} as T, {
    get(_target, propKey: string) {
      const realModule = moduleGetter()
      if (!realModule) return undefined
      const fn = (realModule as any)[propKey]
      if (typeof fn !== 'function') return fn

      return async (...args: any[]) => {
        try {
          const res = await fn.apply(realModule, args)
          if (res && typeof res === 'object') {
            if (res.success === false) {
              const errMsg = res.error || `Thất bại: API [${category}.${propKey}] trả về success: false`
              notifyApiError(category, `${category}.${propKey}`, errMsg, { args, response: res })
            }
          } else if (res === undefined || res === null) {
            notifyApiWarning(category, `${category}.${propKey}`, `Phản hồi rỗng từ API [${category}.${propKey}]`, { args })
          }
          return res
        } catch (err: any) {
          const errMsg = err?.message || String(err)
          notifyApiError(category, `${category}.${propKey}`, `Ngoại lệ khi gọi [${category}.${propKey}]: ${errMsg}`, {
            args,
            error: err,
          })
          throw err
        }
      }
    },
  })
}

const getRawApi = (): FotolismAPI => {
  if (typeof window !== 'undefined') {
    if (window.fotolism) return window.fotolism
    if (window.joyBooth) return window.joyBooth
  }
  return rawMockApi
}

export const fotolismApi: FotolismAPI = {
  ai: wrapApiModule('ai', () => getRawApi().ai),
  print: wrapApiModule('print', () => getRawApi().print),
  camera: wrapApiModule('camera', () => getRawApi().camera),
  config: wrapApiModule('config', () => getRawApi().config),
  storage: wrapApiModule('storage', () => getRawApi().storage),
}

/** @deprecated Use fotolismApi */
export const joyBoothApi = fotolismApi

// Fallback khi chay trong browser (development without Electron)
export const isBrowser = !(typeof window !== 'undefined' && (window.fotolism || window.joyBooth))

const MOCK_SAVE_BASE = SAVE_ROOT_DIR

const rawMockApi: FotolismAPI = {
  ai: {
    enhance: async (imagePath: string, _level: number) => ({
      success: true,
      data: { enhancedPath: imagePath },
    }),
    composite: async (imagePath: string, _framePath: string) => ({
      success: true,
      data: { compositedPath: imagePath },
    }),
    generateQr: async (sessionId: string, _imagePath: string) => ({
      success: true,
      data: {
        qrUrl: `https://${APP_DOMAIN}/s/${sessionId}`,
        qrImagePath: '/mock-qr.png',
      },
    }),
  },
  print: {
    send: async () => ({ success: true }),
    listPrinters: async () => ({
      success: true,
      data: [{ id: 'mock-printer', name: 'Mock Printer (Dev)' }],
    }),
  },
  camera: {
    list: async () => ({
      success: true,
      data: [{ id: 'webcam-0', name: 'Default Webcam' }],
    }),
    capture: async (_cameraId: string, savePath: string) => ({
      success: true,
      data: { rawPath: savePath },
    }),
    getDriverStatus: async () => ({
      success: true,
      data: {
        bundled: true,
        installed: false,
        cameraConnected: true,
        cameraModel: 'Canon EOS R100 (Mock)',
        digiCamInstalled: false,
        digiCamBundled: true,
      },
    }),
    installCanonDriver: async () => ({
      success: true,
      data: { message: 'Đã mở trình cài đặt driver Canon EOS.' },
    }),
    installDigiCam: async () => ({
      success: true,
      data: { message: 'Đã mở trình cài đặt digiCamControl.' },
    }),
    edsdkCapture: async (savePath: string, shotIndex: number) => {
      // 1. Thử gọi trực tiếp Canon EDSDK Persistent Daemon nếu đang chạy trên port 8899
      try {
        const daemonRes = await fetch(`http://127.0.0.1:8899/capture?savePath=${encodeURIComponent(savePath)}`, {
          signal: AbortSignal.timeout(6000),
        })
        if (daemonRes.ok) {
          const json = await daemonRes.json()
          if (json && json.success) {
            return {
              success: true,
              data: {
                savedPath: json.savedPath || savePath,
                dataUrl: `http://127.0.0.1:8899/frame?t=${Date.now()}`,
                source: json.source || 'Canon EOS R100 (EDSDK Persistent Daemon)',
                resolution: json.resolution || '24MP (Full Resolution)',
              },
            }
          }
        }
      } catch {}

      // 2. Thử gọi qua Vite dev bridge
      try {
        const res = await fetch('/api/edsdk-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ savePath, shotIndex }),
        })
        if (res.ok) {
          const json = await res.json()
          if (json && json.success) return json
          if (json && json.error) return { success: false, error: json.error }
        }
      } catch (err: any) {
        console.warn('Vite dev bridge fetch error:', err)
      }
      return {
        success: false,
        error: `Không thể kết nối tới Canon EDSDK bridge (shot ${shotIndex})`,
      }
    },
    edsdkLiveviewFrame: async () => ({
      success: false,
      error: '[Mock] EDSDK Live View chưa khả dụng trong browser mode',
    }),
    canonDaemonStatus: async () => {
      try {
        const res = await fetch('http://127.0.0.1:8899/status', { signal: AbortSignal.timeout(500) })
        if (res.ok) {
          const data = (await res.json()) as any
          return { success: true, data: { running: Boolean(data.connected), url: 'http://127.0.0.1:8899' } }
        }
      } catch {}
      return { success: true, data: { running: false, url: 'http://127.0.0.1:8899' } }
    },
  },
  config: {
    get: async (_key: string) => ({ success: true, data: null }),
    set: async () => ({ success: true }),
  },
  storage: {
    getDownloadsPath: async () => ({
      success: true,
      data: { path: MOCK_SAVE_BASE, baseDownloads: '~/Downloads' },
    }),
    savePhoto: async (_dataUrl: string, fileName: string) => ({
      success: true,
      data: { savedPath: `${MOCK_SAVE_BASE}/_mock_${fileName}` },
    }),
    openFolder: async () => ({ success: true }),
    uploadDriveSession: async (payload: {
      parentFolderId: string
      subfolderName: string
      files: Array<{ name: string; dataUrl: string }>
      webhookUrl?: string
    }) => ({
      success: true,
      data: {
        localDir: `${MOCK_SAVE_BASE}/${payload.subfolderName}`,
        cloudFolderUrl: `https://drive.google.com/drive/folders/${payload.parentFolderId}`,
        cloudFolderId: payload.parentFolderId,
        subfolderName: payload.subfolderName,
        filesCount: payload.files.length,
      },
    }),
  },
}

export const mockApi: FotolismAPI = fotolismApi

// Re-export brand helpers for convenience
export {
  BRAND_NAME,
  APP_DOMAIN,
  SAVE_FOLDER_NAME,
  SAVE_ROOT_DIR,
  FILE_PREFIX_SHOT,
  FILE_PREFIX_FINAL,
  FILE_PREFIX_TIMELAPSE,
  DEFAULT_ACCOUNT_HOLDER,
}
