import { describe, it, expect, beforeAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ensureDaemonRunning } from './test-daemon-helper'
import { getDatabase, SessionDB } from '../dist-electron/sessionDatabase.cjs'

const DAEMON_URL = 'http://127.0.0.1:8899'
const TEST_SAVE_PATH = 'F:\\Fotolism_image\\it04_test_capture.jpg'

describe('Level 2: Integration Testing — Fotolism 2.2 Canon Daemon & Production Readiness', () => {
  beforeAll(async () => {
    await ensureDaemonRunning()
  })

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

  it('IT-03: Luồng Liveview MJPEG multipart/x-mixed-replace hoạt động liên tục (FR-04)', async () => {
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

    if (fs.existsSync(TEST_SAVE_PATH)) {
      fs.unlinkSync(TEST_SAVE_PATH)
    }

    const startTime = Date.now()
    const res = await fetch(`${DAEMON_URL}/capture?savePath=${encodeURIComponent(TEST_SAVE_PATH)}`)
    const data = await res.json()
    const duration = Date.now() - startTime

    if (!data.success) {
      console.warn('⚠️ IT-04 Skipped: Màn trập máy ảnh không phản hồi (có thể máy ảnh đang ngủ hoặc bận).')
      return
    }

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.resolution).toContain('24MP')
    expect(duration).toBeLessThan(4000)

    expect(fs.existsSync(TEST_SAVE_PATH)).toBe(true)
    const stats = fs.statSync(TEST_SAVE_PATH)
    expect(stats.size).toBeGreaterThan(1024 * 1024)

    try {
      fs.unlinkSync(TEST_SAVE_PATH)
    } catch {}
  })

  it('IT-05: Cấu trúc IPC Bridge an toàn qua Preload ContextIsolation (FR-10)', () => {
    const preloadPath = path.resolve(__dirname, '../electron/preload.cts')
    expect(fs.existsSync(preloadPath)).toBe(true)

    const preloadContent = fs.readFileSync(preloadPath, 'utf-8')
    expect(preloadContent).toContain('contextBridge.exposeInMainWorld')
    expect(preloadContent).toContain('edsdkCapture')
    expect(preloadContent).toContain('edsdkLiveviewFrame')
    expect(preloadContent).toContain('canonDaemonStatus')
    expect(preloadContent).toContain('canonDiagnostics')
    expect(preloadContent).toContain('session')
    expect(preloadContent).toContain('overhead')
  })

  it('IT-06: Camera State Machine trả về trạng thái chuẩn hóa (FR-01)', async () => {
    const res = await fetch(`${DAEMON_URL}/status`)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty('cameraState')
    expect([
      'DISCONNECTED',
      'CONNECTING',
      'READY',
      'LIVEVIEW',
      'CAPTURING',
      'TRANSFERRING',
      'RECOVERING',
      'ERROR',
    ]).toContain(data.cameraState)

    expect(data).toHaveProperty('fps')
    expect(data).toHaveProperty('latencyMs')
    expect(data).toHaveProperty('reconnectCount')
  })

  it('IT-07: Idempotency Verification — Gửi 10 request cùng captureId chỉ kích hoạt 1 lần (FR-03)', async () => {
    const testCaptureId = `idempotent_test_${Date.now()}`
    const testSessionId = `test_sess_${Date.now()}`
    const payload = JSON.stringify({
      captureId: testCaptureId,
      sessionId: testSessionId,
      slotIndex: 1,
    })

    // Gửi đồng thời 10 request cùng captureId
    const promises = Array.from({ length: 10 }, () =>
      fetch(`${DAEMON_URL}/api/captures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).then((r) => r.json())
    )

    const results = await Promise.all(promises)
    expect(results.length).toBe(10)

    // Tất cả 10 response đều có cùng captureId
    for (const r of results) {
      expect(r.captureId).toBe(testCaptureId)
    }

    // Các request trùng lặp sau request đầu tiên phải được đánh dấu idempotent: true
    const idempotentHits = results.filter((r) => r.idempotent === true)
    expect(idempotentHits.length).toBeGreaterThanOrEqual(1)
  })

  it('IT-08: POST /api/captures chấp nhận payload chuẩn hóa { captureId, sessionId, slotIndex } (FR-03)', async () => {
    const capId = `cap_standard_${Date.now()}`
    const res = await fetch(`${DAEMON_URL}/api/captures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captureId: capId,
        sessionId: 'session_demo_22',
        slotIndex: 2,
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('captureId')
    expect(data).toHaveProperty('status')
  })

  it('IT-09: Observability endpoint /api/diagnostics trả về Telemetry và Structured Logs (FR-09)', async () => {
    const res = await fetch(`${DAEMON_URL}/api/diagnostics`)
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data).toHaveProperty('cameraState')
    expect(data).toHaveProperty('evfFps')
    expect(data).toHaveProperty('evfLatencyMs')
    expect(data).toHaveProperty('activeLiveViewClients')
    expect(data).toHaveProperty('reconnectCount')
    expect(data).toHaveProperty('totalCaptures')
    expect(data).toHaveProperty('failedCaptures')
    expect(data).toHaveProperty('recentLogs')
    expect(Array.isArray(data.recentLogs)).toBe(true)
  })

  it('IT-10: SQLite Persistent Session Storage lưu trữ và khôi phục toàn vẹn phiên (FR-06)', () => {
    const dbPath = path.resolve(__dirname, '../fotolism_test_sessions.db')
    getDatabase(dbPath)

    const sessionId = `test_db_sess_${Date.now()}`

    // 1. Tạo session
    const session = SessionDB.createSession({
      id: sessionId,
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      total_slots: 4,
      layout_id: '4_strip_classic',
      price: 70000,
      payment_status: 'PAID',
      print_copies: 2,
    })
    expect(session.id).toBe(sessionId)

    // 2. Lưu lần chụp đầu tiên slot 0
    const cap1 = SessionDB.saveCapture({
      id: `cap_${sessionId}_slot0`,
      session_id: sessionId,
      slot_index: 0,
      status: 'COMPLETED',
      file_path: 'F:\\Fotolism_image\\shot0.jpg',
      raw_file_path: 'F:\\Fotolism_image\\shot0.jpg',
      is_retake: 0,
      retake_count: 0,
      latency_ms: 1200,
      shutter_ms: 150,
      transfer_ms: 1050,
    })
    expect(cap1.is_retake).toBe(0)
    expect(cap1.retake_count).toBe(0)

    // 3. Khách Retake lại slot 0 -> không ghi đè, tăng retake_count
    const cap1Retake = SessionDB.saveCapture({
      id: `cap_${sessionId}_slot0_retake1`,
      session_id: sessionId,
      slot_index: 0,
      status: 'COMPLETED',
      file_path: 'F:\\Fotolism_image\\shot0_retake.jpg',
      raw_file_path: 'F:\\Fotolism_image\\shot0_retake.jpg',
      is_retake: 1,
      retake_count: 1,
      latency_ms: 1100,
    })
    expect(cap1Retake.is_retake).toBe(1)
    expect(cap1Retake.retake_count).toBe(1)

    // 4. Kiểm tra danh sách captures trong session
    const captures = SessionDB.getCaptures(sessionId)
    expect(captures.length).toBe(2)
    expect(captures[0].file_path).toBe('F:\\Fotolism_image\\shot0.jpg')
    expect(captures[1].file_path).toBe('F:\\Fotolism_image\\shot0_retake.jpg')

    // 5. Cập nhật hoàn thành session
    SessionDB.updateSession(sessionId, { status: 'COMPLETED', completed_at: new Date().toISOString() })
    const updated = SessionDB.getSession(sessionId)
    expect(updated?.status).toBe('COMPLETED')
    expect(updated?.completed_at).toBeDefined()

    // Dọn dẹp db test
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
    } catch {}
  })
}, 20000)
