type IpcResponse<T = unknown> = Promise<{ success: boolean; data?: T; error?: string }>

export interface JoyBoothAPI {
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
  }
  config: {
    get: (key: string) => IpcResponse
    set: (key: string, value: unknown) => IpcResponse
  }
}

// Type-safe wrapper cho window.joyBooth API
// Dùng thay cho gọi trực tiếp window.joyBooth trong components

declare global {
  interface Window {
    joyBooth: JoyBoothAPI
  }
}

export const joyBoothApi = {
  get ai() {
    return window.joyBooth.ai
  },
  get print() {
    return window.joyBooth.print
  },
  get camera() {
    return window.joyBooth.camera
  },
  get config() {
    return window.joyBooth.config
  },
}

// Fallback khi chạy trong browser (development without Electron)
export const isBrowser = !window.joyBooth

export const mockApi = {
  ai: {
    enhance: async (imagePath: string, _level: number) => ({
      success: true,
      data: { enhancedPath: imagePath }, // return original in mock
    }),
    composite: async (imagePath: string, _framePath: string) => ({
      success: true,
      data: { compositedPath: imagePath },
    }),
    generateQr: async (sessionId: string, _imagePath: string) => ({
      success: true,
      data: {
        qrUrl: `https://joybooth.app/s/${sessionId}`,
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
  },
  config: {
    get: async (_key: string) => ({ success: true, data: null }),
    set: async () => ({ success: true }),
  },
}
