import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const DAEMON_URL = 'http://127.0.0.1:8899'
const TEST_SAVE_PATH = 'F:\\Fotolism_image\\it04_test_capture.jpg'

describe('Level 2: Integration Testing — Canon Native Daemon & IPC Bridge', () => {
  it('IT-01: Canon Daemon HTTP Healthcheck phản hồi trạng thái hợp lệ', async () => {
    const res = await fetch(`${DAEMON_URL}/status`)
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toHaveProperty('connected')
    expect(data).toHaveProperty('evfReady')
    expect(typeof data.connected).toBe('boolean')
    expect(typeof data.evfReady).toBe('boolean')
  })

  it('IT-02: Endpoint /frame trả về ảnh JPEG hợp lệ (khi máy ảnh kết nối)', async () => {
    const statusRes = await fetch(`${DAEMON_URL}/status`)
    const status = await statusRes.json()

    if (!status.connected || !status.evfReady) {
      console.warn('⚠️ IT-02 Skipped: Máy ảnh Canon chưa kết nối hoặc đang ở chế độ ngủ (Sleep).')
      return
    }

    const res = await fetch(`${DAEMON_URL}/frame`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/jpeg')

    const buffer = Buffer.from(await res.arrayBuffer())
    expect(buffer.length).toBeGreaterThan(1000)

    // Kiểm tra magic bytes của định dạng JPEG: 0xFF 0xD8 0xFF
    expect(buffer[0]).toBe(0xff)
    expect(buffer[1]).toBe(0xd8)
    expect(buffer[2]).toBe(0xff)
  })

  it('IT-03: Luồng Liveview MJPEG multipart/x-mixed-replace hoạt động liên tục', async () => {
    const statusRes = await fetch(`${DAEMON_URL}/status`)
    const status = await statusRes.json()

    if (!status.connected || !status.evfReady) {
      console.warn('⚠️ IT-03 Skipped: Máy ảnh Canon chưa kết nối.')
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    try {
      const res = await fetch(`${DAEMON_URL}/liveview`, { signal: controller.signal })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('multipart/x-mixed-replace')

      const reader = res.body?.getReader()
      expect(reader).toBeDefined()

      let receivedChunks = 0
      while (receivedChunks < 3) {
        const { done, value } = await reader!.read()
        if (done) break
        if (value && value.length > 0) {
          receivedChunks++
        }
      }
      expect(receivedChunks).toBeGreaterThanOrEqual(2)
    } catch (e: any) {
      if (e.name !== 'AbortError') throw e
    } finally {
      clearTimeout(timeout)
    }
  })

  it('IT-04: Kích hoạt chụp ảnh không trễ (/capture), file 24MP lưu thành công', async () => {
    const statusRes = await fetch(`${DAEMON_URL}/status`)
    const status = await statusRes.json()

    if (!status.connected) {
      console.warn('⚠️ IT-04 Skipped: Cần máy ảnh Canon kết nối để kích hoạt màn trập.')
      return
    }

    // Dọn file test cũ nếu có
    if (fs.existsSync(TEST_SAVE_PATH)) {
      fs.unlinkSync(TEST_SAVE_PATH)
    }

    const startTime = Date.now()
    const res = await fetch(`${DAEMON_URL}/capture?savePath=${encodeURIComponent(TEST_SAVE_PATH)}`)
    const data = await res.json()
    const duration = Date.now() - startTime

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.resolution).toContain('24MP')
    expect(duration).toBeLessThan(3000) // Đảm bảo toàn bộ chu trình chụp + tải về dưới 3 giây

    // Xác minh file tồn tại trên ổ đĩa và kích thước > 1MB
    expect(fs.existsSync(TEST_SAVE_PATH)).toBe(true)
    const stats = fs.statSync(TEST_SAVE_PATH)
    expect(stats.size).toBeGreaterThan(1024 * 1024)

    // Dọn dẹp sau khi kiểm tra xong
    try {
      fs.unlinkSync(TEST_SAVE_PATH)
    } catch {}
  })

  it('IT-05: Cấu trúc IPC Bridge an toàn qua Preload ContextIsolation', () => {
    const preloadPath = path.resolve(__dirname, '../electron/preload.cts')
    expect(fs.existsSync(preloadPath)).toBe(true)

    const preloadContent = fs.readFileSync(preloadPath, 'utf-8')
    expect(preloadContent).toContain('contextBridge.exposeInMainWorld')
    expect(preloadContent).toContain('edsdkCapture')
    expect(preloadContent).toContain('edsdkLiveviewFrame')
    expect(preloadContent).toContain('canonDaemonStatus')
    expect(preloadContent).toContain('print:send')
  })
})
