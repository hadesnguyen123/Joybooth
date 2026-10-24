import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, COLOR_FILTERS, BEAUTY_PRESETS, type CapturedPhoto } from '../store/appStore'
import { fotolismApi, isBrowser, mockApi, api } from '../lib/api'
import {
  FILE_PREFIX_SHOT,
  FILE_PREFIX_SELF,
  FILE_PREFIX_TIMELAPSE,
  SESSION_FOLDER_PREFIX,
} from '../lib/constants'
import { BeautyCameraView, type BeautyCameraHandle } from '../components/BeautyCameraView'
import { Sparkles, Lightbulb, Camera, Settings, X, ArrowRight } from 'lucide-react'
import './CaptureScreen.css'

// ── Giả lập âm thanh màn trập cơ học "TÁCH!" dứt khoát 1 lần duy nhất qua Web Audio API ──
function playCameraShutterSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // 1 Tiếng "TÁCH!" cơ học dứt khoát duy nhất (Single crisp shutter click)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1100, now)
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.045)
    gain.gain.setValueAtTime(0.45, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.05)
  } catch { }
}

export default function CaptureScreen() {
  const {
    setScreen,
    setSessionPhotos,
    countdownSeconds,
    setCountdownSeconds,
    selectedLayout,
    selectedCopies,
    selectFilter,
    selectedBeautyPreset,
    applyBeautyPreset,
    ringLightEnabled,
    setRingLightEnabled,
    ringLightLevel,
    setRingLightLevel,
    mirrorCamera,
    setMirrorCamera,
    availableCameras,
    selectedCameraId,
    setCameras,
    selectCamera,
    eventConfig,
    setTimelapseUrl,
    setGdriveUrl,
    slimFace,
    setSlimFace,
    whiteningTone,
    setWhiteningTone,
    brightnessAdjust,
    contrastAdjust,
    saturationAdjust,
    skinSmoothing,
    rosyTone,
    glowClarity,
    setBrightnessAdjust,
    setContrastAdjust,
    setSaturationAdjust,
    setSkinSmoothing,
    setRosyTone,
    setGlowClarity,
    resetAdjustments,
    getBeautyFilterCss,
  } = useAppStore()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const beautyCameraRef = useRef<BeautyCameraHandle>(null)
  const currentStreamRef = useRef<MediaStream | null>(null)
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const timelapseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const timelapseTimerRef = useRef<number | null>(null)
  const [isTimelapseRecording, setIsTimelapseRecording] = useState<boolean>(false)

  const totalShots = selectedLayout.photosCount || 4
  const isSelfboothMode = eventConfig.captureMode === 'selfbooth'
  const selfboothDuration = eventConfig.selfboothDurationSeconds || 60

  const [hasCamera, setHasCamera] = useState<boolean>(false)
  const [activeFlyout, setActiveFlyout] = useState<'beauty' | 'lighting' | null>(null)

  // ── Trạng thái chung khi chụp ──
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false)
  const [isCapturingShot, setIsCapturingShot] = useState<boolean>(false)
  const [currentCountdown, setCurrentCountdown] = useState<number>(3)
  const [showFlash, setShowFlash] = useState<boolean>(false)
  const [snapshotFlyer, setSnapshotFlyer] = useState<{ photoUrl: string; slotIndex: number; isEdsdk?: boolean } | null>(null)
  const [justCapturedSlot, setJustCapturedSlot] = useState<number | null>(null)
  const [cameraFreezeFrame, setCameraFreezeFrame] = useState<string | null>(null)

  // ── Session ID cho Fotolism 2.2 SQLite & Idempotency ──
  const [sessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`)

  // ── Chế độ PHOTOBOOTH CỔ ĐIỂN (Có Retake / Xóa ô xấu) ──
  const [slots, setSlots] = useState<(CapturedPhoto | null)[]>(Array(totalShots).fill(null))
  const [retakeSlotIndex, setRetakeSlotIndex] = useState<number | null>(null)

  useEffect(() => {
    // Khởi tạo phiên trong SQLite persistent session storage (FR-06)
    api.session?.create({
      id: sessionId,
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      total_slots: totalShots,
      layout_id: selectedLayout?.id,
      payment_status: 'PAID',
      print_copies: selectedCopies || 1,
    }).catch(console.warn)
  }, [sessionId, totalShots, selectedLayout?.id, selectedCopies])

  // ── Chế độ SELFBOOTH (Chụp tự do theo thời gian & Chọn ảnh vào khung) ──
  const [isSelfboothRunning, setIsSelfboothRunning] = useState<boolean>(false)
  const [selfboothTimeLeft, setSelfboothTimeLeft] = useState<number>(selfboothDuration)
  const [selfboothLibrary, setSelfboothLibrary] = useState<CapturedPhoto[]>([])
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState<boolean>(false)
  const [pickedSlots, setPickedSlots] = useState<(CapturedPhoto | null)[]>(Array(totalShots).fill(null))
  const [activeSlotToPick, setActiveSlotToPick] = useState<number>(0)
  const [isCanonDaemonActive, setIsCanonDaemonActive] = useState<boolean>(false)

  // Khởi động Camera thiết bị
  const startCamera = useCallback(async (deviceId?: string) => {
    // 0. Kiểm tra Canon Persistent Daemon (Direct EDSDK)
    let daemonActive = false
    try {
      const daemonRes = await (isBrowser ? mockApi : fotolismApi).camera.canonDaemonStatus?.()
      if (daemonRes?.success && daemonRes.data?.running) {
        daemonActive = true
      }
    } catch { }

    // Lấy toàn bộ danh sách thiết bị video của hệ thống
    let allDevices: MediaDeviceInfo[] = []
    try {
      allDevices = await navigator.mediaDevices.enumerateDevices()
    } catch { }

    // Kiểm tra xem người dùng có đang cố tình chọn một webcam phụ (ví dụ webcam laptop) hay không
    const isExplicitNonCanonWebcam =
      Boolean(deviceId) &&
      deviceId !== 'canon-daemon-stream' &&
      !/canon|eos/i.test(deviceId || '') &&
      allDevices.some((d) => d.deviceId === deviceId && !/canon|eos/i.test(d.label))

    // NẾU Canon Daemon đang hoạt động và không chọn webcam phụ khác -> BẮT BUỘC dùng luồng Canon EDSDK trực tiếp
    if (daemonActive && !isExplicitNonCanonWebcam) {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop())
        currentStreamRef.current = null
      }
      setActiveMediaStream(null)
      setIsCanonDaemonActive(true)
      selectCamera('canon-daemon-stream')
      setHasCamera(true)

      // Lọc bỏ HOÀN TOÀN driver ảo EOS Webcam Utility (DirectShow) để không bao giờ chiếm cổng USB của máy ảnh
      const nonCanonDevices = allDevices
        .filter((d) => d.kind === 'videoinput' && !/eos|canon/i.test(d.label))
        .map((d, index) => ({
          id: d.deviceId,
          name: d.label || `Webcam ${index + 1}`,
        }))

      const cameraList = [
        {
          id: 'canon-daemon-stream',
          name: '📸 Máy ảnh Canon EOS (EDSDK Trực Tiếp - Chuẩn)',
        },
        ...nonCanonDevices,
      ]
      setCameras(cameraList)
      return
    }

    setIsCanonDaemonActive(false)
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((track) => track.stop())
      currentStreamRef.current = null
    }

    try {
      // 1. Quét danh sách thiết bị webcam thông thường
      const videoDevices = allDevices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => {
          let displayName = d.label || `Camera ${index + 1}`
          if (/eos|canon/i.test(displayName)) {
            displayName = '📷 Máy ảnh Canon EOS (DirectShow)'
          }
          return {
            id: d.deviceId,
            name: displayName,
          }
        })

      if (daemonActive) {
        videoDevices.unshift({
          id: 'canon-daemon-stream',
          name: '📸 Máy ảnh Canon EOS (EDSDK Trực Tiếp - Chuẩn)',
        })
      }

      if (videoDevices.length > 0) {
        setCameras(videoDevices)
      }

      // Ưu tiên chọn camera
      let targetId = deviceId
      if (!targetId) {
        const storedId = useAppStore.getState().selectedCameraId
        const storedDev = videoDevices.find((d) => d.id === storedId)
        if (storedDev) {
          targetId = storedId || undefined
        } else {
          targetId = videoDevices[0]?.id
          if (targetId) selectCamera(targetId)
        }
      }

      if (targetId === 'canon-daemon-stream') {
        setIsCanonDaemonActive(true)
        setHasCamera(true)
        return
      }

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: targetId ? { ...videoConstraints, deviceId: { exact: targetId } } : videoConstraints,
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: targetId ? { ...videoConstraints, deviceId: { ideal: targetId } } : true,
          audio: false,
        })
      }

      currentStreamRef.current = stream
      setActiveMediaStream(stream)

      const actualTrack = stream.getVideoTracks()[0]
      const actualDeviceId = actualTrack?.getSettings()?.deviceId || targetId
      if (actualDeviceId) {
        selectCamera(actualDeviceId)
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((e) => console.warn('Play video error:', e))
      }

      setHasCamera(true)
    } catch (err) {
      console.warn('Cannot connect camera with constraints, trying fallback:', err)
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        currentStreamRef.current = fallbackStream
        setActiveMediaStream(fallbackStream)
        const actualTrack = fallbackStream.getVideoTracks()[0]
        const fallbackId = actualTrack?.getSettings()?.deviceId
        if (fallbackId) {
          selectCamera(fallbackId)
        }
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream
          videoRef.current.play().catch(() => { })
        }
        setHasCamera(true)
      } catch (fallbackErr) {
        console.error('All camera attempts failed:', fallbackErr)
        setHasCamera(false)
      }
    }
  }, [setCameras, selectCamera])

  // Chuyển đổi nhanh 1-chạm giữa các camera khả dụng (Laptop Camera <-> Canon EOS)
  const handleCycleCamera = useCallback(() => {
    if (availableCameras.length <= 1) return
    const currentIndex = availableCameras.findIndex((c) => c.id === selectedCameraId)
    const nextIndex = (currentIndex + 1) % availableCameras.length
    const nextCam = availableCameras[nextIndex]
    selectCamera(nextCam.id)
    startCamera(nextCam.id)
  }, [availableCameras, selectedCameraId, selectCamera, startCamera])

  useEffect(() => {
    // Reset bộ lọc về Tự nhiên khi bắt đầu chụp để ảnh gốc luôn sạch
    selectFilter(COLOR_FILTERS[0])
    // Gương mặc định là lật theo chuẩn Photobooth
    setMirrorCamera(true)
  }, [selectFilter, setMirrorCamera])

  useEffect(() => {
    const initialId = useAppStore.getState().selectedCameraId
    startCamera(initialId || undefined)

    return () => {
      if (timelapseTimerRef.current) {
        clearInterval(timelapseTimerRef.current)
        timelapseTimerRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop() } catch { }
      }
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop())
        currentStreamRef.current = null
      }
    }
  }, [startCamera])

  // Tự động phát hiện và kết nối lại máy ảnh Canon EOS ngay khi máy bật nguồn hoặc cắm lại cáp USB
  useEffect(() => {
    if (isCanonDaemonActive) return

    const probeTimer = setInterval(async () => {
      try {
        const daemonRes = await (isBrowser ? mockApi : fotolismApi).camera.canonDaemonStatus?.()
        if (daemonRes?.success && daemonRes.data?.running) {
          console.log('⚡ [CaptureScreen] Canon EOS Daemon detected active, auto-switching to live stream...')
          startCamera('canon-daemon-stream')
        }
      } catch { }
    }, 2000)

    return () => clearInterval(probeTimer)
  }, [isCanonDaemonActive, startCamera])

  const finishSelfboothRef = useRef<() => void>(() => { })

  // Đếm ngược thời gian phiên Selfbooth
  useEffect(() => {
    if (!isSelfboothMode || !isSelfboothRunning || isPhotoPickerOpen) return

    const timer = setInterval(() => {
      setSelfboothTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          finishSelfboothRef.current()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isSelfboothMode, isSelfboothRunning, isPhotoPickerOpen])

  // Chụp 1 khung hình từ video sang DataURL với bảo đảm không bao giờ trả về ảnh đen
  function grabVideoFrame(): string {
    // 1. Chụp từ WebGL Beauty Camera (đã có kiểm tra readPixels chống đen do swapchain)
    if (beautyCameraRef.current) {
      const liveFrame = beautyCameraRef.current.captureFrame()
      if (liveFrame && liveFrame.length > 1000 && !liveFrame.startsWith('data:,')) {
        return liveFrame
      }
    }

    // 2. Dự phòng trực tiếp: Canvas 2D lấy từ video element đang chạy
    const video = beautyCameraRef.current?.getVideoElement() || videoRef.current
    if (video && (video.videoWidth > 0 || video.readyState >= 2)) {
      const w = video.videoWidth || 1920
      const h = video.videoHeight || 1080
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      if (ctx) {
        const beautyFilter = getBeautyFilterCss()
        if (beautyFilter && beautyFilter !== 'none') {
          ctx.filter = beautyFilter
        }

        if (mirrorCamera) {
          ctx.translate(w, 0)
          ctx.scale(-1, 1)
        }

        if (slimFace > 0) {
          const scaleXFactor = 1 - (slimFace / 100) * 0.055
          const scaleYFactor = 1 + (slimFace / 100) * 0.015
          const cx = w / 2
          const cy = h / 2
          ctx.translate(cx, cy)
          ctx.scale(scaleXFactor, scaleYFactor)
          ctx.translate(-cx, -cy)
        }

        ctx.drawImage(video, 0, 0, w, h)
        const fallbackDataUrl = canvas.toDataURL('image/jpeg', 0.98)
        if (fallbackDataUrl && fallbackDataUrl.length > 1000) {
          return fallbackDataUrl
        }
      }
    }
    return ''
  }

  // Khởi động quay Timelapse
  function startTimelapse() {
    if (!eventConfig.timelapseEnabled) return
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return

    try {
      recordedChunksRef.current = []

      // 1. Thu thập luồng MediaStream để ghi hình:
      // - Nếu có stream webcam trực tiếp (currentStreamRef.current), dùng trực tiếp
      // - Nếu đang dùng Canon Daemon MJPEG hoặc không có stream trực tiếp: dùng canvas.captureStream(20)
      let streamToRecord: MediaStream | null = null

      if (currentStreamRef.current && currentStreamRef.current.active && currentStreamRef.current.getVideoTracks().length > 0) {
        streamToRecord = currentStreamRef.current
      } else {
        // Universal Canvas Stream: dùng cho Canon EDSDK MJPEG hoặc khi không có MediaStream trực tiếp
        if (!timelapseCanvasRef.current) {
          const c = document.createElement('canvas')
          c.width = 960
          c.height = 540
          timelapseCanvasRef.current = c
        }
        const canvas = timelapseCanvasRef.current
        const ctx = canvas.getContext('2d')

        if (ctx) {
          if (timelapseTimerRef.current) {
            clearInterval(timelapseTimerRef.current)
          }

          // Vẽ khung hình định kỳ vào recording canvas ở tốc độ 20 FPS
          timelapseTimerRef.current = window.setInterval(() => {
            const img = beautyCameraRef.current?.getImageElement()
            const glCanvas = beautyCameraRef.current?.getCanvasElement()
            const video = beautyCameraRef.current?.getVideoElement() || videoRef.current

            if (img && img.naturalWidth > 0) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            } else if (glCanvas && glCanvas.width > 0) {
              ctx.drawImage(glCanvas, 0, 0, canvas.width, canvas.height)
            } else if (video && video.videoWidth > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
            }
          }, 50)

          if (typeof canvas.captureStream === 'function') {
            streamToRecord = canvas.captureStream(20)
          }
        }
      }

      if (!streamToRecord) {
        console.warn('[Timelapse] Không thể khởi tạo MediaStream để ghi video')
        return
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm'
      const recorder = new MediaRecorder(streamToRecord, { mimeType })
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      recorder.start(250)
      mediaRecorderRef.current = recorder
      setIsTimelapseRecording(true)
      console.log('🎬 [Timelapse] Đã bắt đầu ghi hình video hậu trường!')
    } catch (err) {
      console.warn('Failed to start MediaRecorder for timelapse:', err)
    }
  }

  // Dừng quay Timelapse
  async function stopTimelapse() {
    if (timelapseTimerRef.current) {
      clearInterval(timelapseTimerRef.current)
      timelapseTimerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve()
        mediaRecorderRef.current.onstop = () => {
          setIsTimelapseRecording(false)
          try {
            if (recordedChunksRef.current.length > 0) {
              const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
              const videoUrl = URL.createObjectURL(blob)
              setTimelapseUrl(videoUrl)
              console.log(`🎬 [Timelapse] Hoàn tất ghi video! Kích thước: ${(blob.size / 1024).toFixed(1)} KB`)

              const reader = new FileReader()
              reader.onloadend = () => {
                const dataUrl = reader.result as string
                if (dataUrl && dataUrl.startsWith('data:')) {
                  const fileName = `${FILE_PREFIX_TIMELAPSE}_${Date.now()}.webm`
                  const api = isBrowser ? mockApi : fotolismApi
                  api.storage.savePhoto(dataUrl, fileName).catch((err) => console.warn('Save timelapse error:', err))
                }
              }
              reader.readAsDataURL(blob)
            }
          } catch (err) {
            console.warn('Error creating timelapse blob:', err)
          }
          resolve()
        }
        mediaRecorderRef.current.stop()
      })
    } else {
      setIsTimelapseRecording(false)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // XỬ LÝ PHOTOBOOTH CỔ ĐIỂN (Retake / Xóa ô xấu)
  // ══════════════════════════════════════════════════════════════════════════════
  const filledSlotsCount = slots.filter(Boolean).length
  const isPhotoboothFull = filledSlotsCount === totalShots

  async function handleTakePhotoboothShot() {
    if (isCapturingShot) return
    if (isPhotoboothFull && retakeSlotIndex === null) return

    // Xác định ô sẽ được gán ảnh vào
    let targetIndex = retakeSlotIndex
    if (targetIndex === null) {
      targetIndex = slots.findIndex((s) => s === null)
      if (targetIndex === -1) targetIndex = 0
    }

    setActiveFlyout(null)
    setIsSessionActive(true)
    setIsCapturingShot(true)

    try {
      // Khởi động timelapse nếu là bức ảnh đầu tiên
      if (filledSlotsCount === 0) {
        startTimelapse()
      }

      const timestamp = Date.now()
      const fileName = `${FILE_PREFIX_SHOT}_${targetIndex + 1}_${timestamp}.jpg`

      const canonSavePath = `F:\\Fotolism_image\\${fileName}`
      const api = isBrowser ? mockApi : fotolismApi

      // Đếm ngược mượt mà (3s, 5s hoặc 10s), giữ nguyên luồng video cho người dùng tạo dáng
      for (let c = countdownSeconds; c >= 1; c--) {
        setCurrentCountdown(c)
        await new Promise((r) => setTimeout(r, 1000))
      }

      // ── BẮT ẢNH TỨC THÌ TẠI 0s (KHÔNG BỊ LỆCH TƯ THẾ) ──────────────
      // 1. Chớp Flash và âm thanh màn trập cơ học "TÁCH!" dứt khoát
      if (!isCanonDaemonActive) {
        playCameraShutterSound()
      }
      setCurrentCountdown(0)
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 450)

      // 2. Chụp khung hình tại đúng 0s (người dùng đã cười tươi tạo dáng xong)
      const photoDataUrl = grabVideoFrame()
      if (photoDataUrl) {
        setCameraFreezeFrame(photoDataUrl)
      }
      const photoPath = photoDataUrl || `photo_${timestamp}_${targetIndex + 1}.jpg`

      const newPhoto: CapturedPhoto = {
        id: `photo_${timestamp}_${targetIndex + 1}`,
        rawPath: photoPath,
        enhancedPath: photoPath,
        compositedPath: photoPath,
        timestamp,
      }

      // 3. Đẩy ảnh vào ô khung hình (Slot) NGAY LẬP TỨC (< 0.1s sau 0s)
      const nextSlots = [...slots]
      nextSlots[targetIndex] = newPhoto
      setSlots(nextSlots)

      // Reset lại retake index sau khi chụp xong
      setRetakeSlotIndex(null)

      // 4. Kích hoạt hiệu ứng bay vào ô thumbnail ngay lập tức (Tổng delay < 0.4s!)
      setSnapshotFlyer({ photoUrl: photoPath, slotIndex: targetIndex, isEdsdk: false })
      setJustCapturedSlot(targetIndex)

      // 5. Lưu ảnh vào đĩa trong nền bất đồng bộ (không chặn giao diện người dùng)
      if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
        api.storage.savePhoto(photoDataUrl, fileName).catch((err) => console.warn('Save photo error:', err))
      }

      // 6. PHƯƠNG ÁN 2: KÍCH HOẠT MÁY ẢNH CANON EOS THẬT (24MP FULL EXIF) - FOTOLISM 2.2 IDEMPOTENCY
      const captureId = `cap_${sessionId}_slot${targetIndex}_${Date.now()}`
      await api.camera.edsdkCapture({
        captureId,
        sessionId,
        slotIndex: targetIndex,
        savePath: canonSavePath,
        shotIndex: targetIndex,
      })
        .then((res) => {
          if (res && res.success && res.data && res.data.dataUrl) {
            const canonData = res.data
            console.log(`[Method 2] Canon EOS 24MP captured: ${canonData.savedPath}`)
            setSlots((prev) => {
              const next = [...prev]
              if (next[targetIndex]) {
                next[targetIndex] = {
                  ...next[targetIndex]!,
                  rawPath: canonData.savedPath,
                  enhancedPath: canonData.dataUrl,
                  compositedPath: canonData.dataUrl,
                }
              }
              return next
            })
            setSnapshotFlyer((prev) =>
              prev && prev.slotIndex === targetIndex ? { ...prev, photoUrl: canonData.dataUrl, isEdsdk: true } : prev
            )
          }
        })
        .catch((err) => {
          console.warn('[Method 2] Canon hardware capture fallback:', err)
        })
        .finally(() => {
          setTimeout(() => setCameraFreezeFrame(null), 300)
        })

      setTimeout(() => setSnapshotFlyer(null), 850)
      setTimeout(() => setJustCapturedSlot(null), 1400)


      // Nếu sau lần chụp này đã full tất cả các ô:
      // Dừng timelapse nhưng KHÔNG tự động chuyển màn hình ngay!
      // Giữ nguyên để khách xem lại, xóa ảnh không đẹp hoặc bấm Tiếp tục.
      if (nextSlots.every(Boolean)) {
        await stopTimelapse()
        if (eventConfig.gdriveEnabled) {
          const folderLink =
            eventConfig.gdriveFolderUrl ||
            `https://drive.google.com/drive/folders/${eventConfig.gdriveFolderId || `${SESSION_FOLDER_PREFIX}_Demo`}`
          setGdriveUrl(folderLink)
        }
      }
    } catch (shootErr) {
      console.error('Error during photobooth shot:', shootErr)
    } finally {
      setCurrentCountdown(0)
      setIsCapturingShot(false)
    }
  }

  // Xóa ảnh ở ô slot k để chuẩn bị chụp lại (retake)
  function handleDeleteSlot(indexToDelete: number) {
    if (isCapturingShot) return
    const nextSlots = [...slots]
    nextSlots[indexToDelete] = null
    setSlots(nextSlots)
    setRetakeSlotIndex(indexToDelete)
  }

  // Khách hài lòng và bấm xác nhận tiếp tục sang bước chọn theme
  function handleProceedPhotobooth() {
    const validPhotos = slots.filter((s): s is CapturedPhoto => s !== null)
    if (validPhotos.length < totalShots) return

    setSessionPhotos(validPhotos)
    setIsSessionActive(false)
    setScreen('select-theme')
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // XỬ LÝ CHẾ ĐỘ SELFBOOTH (Chụp tự do không giới hạn thời gian & Chọn ảnh)
  // ══════════════════════════════════════════════════════════════════════════════

  // Bắt đầu phiên chụp Selfbooth
  function handleStartSelfbooth() {
    setIsSelfboothRunning(true)
    setIsSessionActive(true)
    setSelfboothTimeLeft(selfboothDuration)
    setSelfboothLibrary([])
    startTimelapse()
  }

  // Bấm chụp 1 ảnh trong phiên Selfbooth (chụp tự do liên tục)
  async function handleTakeSelfboothShot() {
    if (isCapturingShot || !isSelfboothRunning) return

    setIsCapturingShot(true)

    try {
      const timestamp = Date.now()
      const photoNum = selfboothLibrary.length + 1
      const fileName = `${FILE_PREFIX_SELF}_${photoNum}_${timestamp}.jpg`

      const canonSelfPath = `F:\\Fotolism_image\\${fileName}`
      const selfApi = isBrowser ? mockApi : fotolismApi

      // Đếm ngược ngắn 2 giây để tạo dáng nhanh vui vẻ
      for (let c = 2; c >= 1; c--) {
        setCurrentCountdown(c)
        await new Promise((r) => setTimeout(r, 1000))
      }

      // ── BẮT ẢNH TỨC THÌ TỪ LUỒNG MÁY ẢNH CANON SELFBOOTH ──────────────
      if (!isCanonDaemonActive) {
        playCameraShutterSound()
      }
      setCurrentCountdown(0)
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 450)

      const photoDataUrl = grabVideoFrame()
      if (photoDataUrl) {
        setCameraFreezeFrame(photoDataUrl)
      }
      const photoPath = photoDataUrl || `selfbooth_${timestamp}_${photoNum}.jpg`

      const newPhoto: CapturedPhoto = {
        id: `selfbooth_${timestamp}_${photoNum}`,
        rawPath: photoPath,
        enhancedPath: photoPath,
        compositedPath: photoPath,
        timestamp,
      }

      setSelfboothLibrary((prev) => [...prev, newPhoto])

      // Lưu ảnh vào máy trong nền bất đồng bộ
      if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
        selfApi.storage.savePhoto(photoDataUrl, fileName).catch((err) => console.warn('Save selfbooth photo error:', err))
      }

      // PHƯƠNG ÁN 2 cho Selfbooth: Chụp ảnh thật từ cảm biến máy ảnh Canon (Fotolism 2.2 Idempotency)
      const captureId = `cap_${sessionId}_self${photoNum}_${Date.now()}`
      await selfApi.camera.edsdkCapture({
        captureId,
        sessionId,
        slotIndex: photoNum,
        savePath: canonSelfPath,
        shotIndex: photoNum,
      })
        .then((res) => {
          if (res && res.success && res.data && res.data.dataUrl) {
            const canonData = res.data
            console.log(`[Method 2 Selfbooth] Canon 24MP captured: ${canonData.savedPath}`)
            setSelfboothLibrary((prev) =>
              prev.map((p) =>
                p.id === newPhoto.id
                  ? {
                    ...p,
                    rawPath: canonData.savedPath,
                    enhancedPath: canonData.dataUrl,
                    compositedPath: canonData.dataUrl,
                  }
                  : p
              )
            )
          }
        })
        .catch((err) => console.warn('[Method 2] Selfbooth Canon capture fallback:', err))
        .finally(() => {
          setTimeout(() => setCameraFreezeFrame(null), 300)
        })

      // Hiệu ứng bay lên ngay lập tức (< 0.4s)
      setSnapshotFlyer({ photoUrl: photoPath, slotIndex: 0, isEdsdk: false })
      setTimeout(() => setSnapshotFlyer(null), 800)

    } catch (shootErr) {
      console.error('Error during selfbooth shot:', shootErr)
    } finally {
      setCurrentCountdown(0)
      setIsCapturingShot(false)
    }
  }

  // Kết thúc phiên chụp Selfbooth (Hết giờ hoặc bấm "Xong Sớm")
  async function handleFinishSelfboothSession() {
    setIsSelfboothRunning(false)
    await stopTimelapse()

    if (eventConfig.gdriveEnabled) {
      const folderLink =
        eventConfig.gdriveFolderUrl ||
        `https://drive.google.com/drive/folders/${eventConfig.gdriveFolderId || `${SESSION_FOLDER_PREFIX}_Demo`}`
      setGdriveUrl(folderLink)
    }

    // Tự động điền trước các ảnh gần nhất vào pickedSlots
    setSelfboothLibrary((currentLibrary) => {
      const initialPicked: (CapturedPhoto | null)[] = Array(totalShots).fill(null)
      for (let i = 0; i < totalShots; i++) {
        if (i < currentLibrary.length) {
          // Lấy các ảnh mới chụp
          initialPicked[i] = currentLibrary[currentLibrary.length - totalShots + i] || currentLibrary[i]
        }
      }
      setPickedSlots(initialPicked)
      return currentLibrary
    })

    setIsPhotoPickerOpen(true)
  }

  useEffect(() => {
    finishSelfboothRef.current = handleFinishSelfboothSession
  })

  // Chọn ảnh từ gallery gán vào slot trong Photo Picker
  function handleAssignPhotoToSlot(photo: CapturedPhoto) {
    const nextPicked = [...pickedSlots]

    // Nếu ảnh này đã có ở một slot khác, tháo ra
    const existingIndex = nextPicked.findIndex((p) => p?.id === photo.id)
    if (existingIndex !== -1) {
      nextPicked[existingIndex] = null
    }

    // Gán vào ô đang active
    nextPicked[activeSlotToPick] = photo
    setPickedSlots(nextPicked)

    // Tự động chuyển active slot sang ô trống tiếp theo (nếu có)
    const nextEmptySlot = nextPicked.findIndex((s) => s === null)
    if (nextEmptySlot !== -1) {
      setActiveSlotToPick(nextEmptySlot)
    }
  }

  // Bỏ chọn ảnh khỏi slot
  function handleRemovePickedSlot(index: number) {
    const nextPicked = [...pickedSlots]
    nextPicked[index] = null
    setPickedSlots(nextPicked)
    setActiveSlotToPick(index)
  }

  // Xác nhận ảnh đã chọn trong Selfbooth & Tiếp tục
  function handleConfirmSelfboothSelection() {
    const validPhotos = pickedSlots.filter((p): p is CapturedPhoto => p !== null)
    if (validPhotos.length < totalShots) return

    setSessionPhotos(validPhotos)
    setIsPhotoPickerOpen(false)
    setIsSessionActive(false)
    setScreen('select-theme')
  }

  // Định dạng thời gian Selfbooth mm:ss
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Hủy buổi chụp và làm mới
  function handleResetShootSession() {
    setIsSessionActive(false)
    setIsCapturingShot(false)
    setIsSelfboothRunning(false)
    setIsPhotoPickerOpen(false)
    setSlots(Array(totalShots).fill(null))
    setRetakeSlotIndex(null)
    setSelfboothLibrary([])
    setSelfboothTimeLeft(selfboothDuration)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  return (
    <div className="capture-screen-pastel" id="capture-screen">
      {/* Screen Flash Animation */}
      {showFlash && <div className="screen-flash" />}

      {/* Focus Dim Backdrop: Làm tối xung quanh khi đang chụp */}
      {isSessionActive && !isPhotoPickerOpen && <div className="focus-dim-backdrop" />}

      {/* ── Top Bar: Countdown Pills (5s / 3s) + Utility Icon Buttons ── */}
      <header className="capture-top-bar">
        {!isSelfboothMode ? (
          <div className="countdown-capsule-group">
            {[5, 3].map((sec) => (
              <button
                key={sec}
                className={`countdown-pill ${countdownSeconds === sec ? 'active' : ''}`}
                onClick={() => setCountdownSeconds(sec)}
                title={`Thời gian đếm ngược ${sec} giây`}
              >
                <span>{sec}s</span>
              </button>
            ))}
          </div>
        ) : (
          /* Selfbooth Session Timer Badge */
          <div className={`selfbooth-session-timer-badge ${selfboothTimeLeft <= 10 && isSelfboothRunning ? 'timer-warning' : ''}`}>
            <span className="timer-icon">{isSelfboothRunning ? '⏱️' : '⏳'}</span>
            <span className="timer-label">Selfbooth:</span>
            <strong className="timer-digits">{formatTime(selfboothTimeLeft)}</strong>
            <span className="timer-photos-count">({selfboothLibrary.length} ảnh)</span>
          </div>
        )}

        {/* Right utility options — Chỉ để icon Cài đặt, Close, Máy ảnh (Đổi Camera) */}
        <div className="top-utility-actions">
          <button
            className="utility-icon-btn"
            onClick={handleCycleCamera}
            title="Đổi Camera (Laptop / Canon R100)"
            aria-label="Đổi camera"
          >
            <Camera size={26} strokeWidth={1.8} />
          </button>

          <button
            className="utility-icon-btn"
            onClick={() => setScreen('admin')}
            title="Cài đặt quản trị"
            aria-label="Cài đặt"
          >
            <Settings size={26} strokeWidth={1.8} />
          </button>

          <button
            className="utility-icon-btn"
            onClick={() => setScreen('idle')}
            title="Thoát về màn hình chờ"
            aria-label="Thoát"
          >
            <X size={26} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* ── Main Stage Area: Left Dock + Flyout + Viewfinder ── */}
      <div className="capture-main-stage">
        {/* Left Floating Dock: Làm đẹp / Phát sáng (Tối ưu bằng icon tinh gọn) */}
        <aside className={`left-sidebar-dock ${isSessionActive && !isPhotoboothFull ? 'locked-dimmed' : ''}`}>
          <button
            className={`dock-btn ${activeFlyout === 'beauty' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'beauty' ? null : 'beauty')}
            title="Làm đẹp da"
            aria-label="Làm đẹp"
          >
            <Sparkles size={28} strokeWidth={1.8} />
          </button>

          <button
            className={`dock-btn ${activeFlyout === 'lighting' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'lighting' ? null : 'lighting')}
            title="Đèn sáng studio"
            aria-label="Phát sáng"
          >
            <Lightbulb size={28} strokeWidth={1.8} />
          </button>
        </aside>

        {/* ── Flyout Panel 2: Làm đẹp & Chỉnh sáng ── */}
        {activeFlyout === 'beauty' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">✨ Làm Đẹp Chuẩn K-Beauty</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content">
              <div className="beauty-presets-container">
                <div className="beauty-presets-title">🌸 PRESET LÀM ĐẸP (1-CHẠM)</div>
                <div className="beauty-presets-grid">
                  {BEAUTY_PRESETS.map((preset) => {
                    const isActive = selectedBeautyPreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        className={`beauty-preset-pill ${isActive ? 'active' : ''}`}
                        onClick={() => applyBeautyPreset(preset.id)}
                        title={preset.description}
                      >
                        <span className="preset-icon">{preset.icon}</span>
                        <span>{preset.name}</span>
                        {isActive && <span className="preset-check">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="beauty-section-box">
                <div className="beauty-section-header">
                  <span>🌸 Thon Gọn & Làn Da Hàn Quốc</span>
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Thon Gọn Mặt (V-Line / Mặt nhỏ)</span>
                    <span className="beauty-val-badge">{slimFace}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={slimFace}
                    onChange={(e) => setSlimFace(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Làm Mịn Da (Skin Blur)</span>
                    <span className="beauty-val-badge">{skinSmoothing}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={skinSmoothing}
                    onChange={(e) => setSkinSmoothing(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Nâng Tone Trắng Sáng (Whitening)</span>
                    <span className="beauty-val-badge">{whiteningTone}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={whiteningTone}
                    onChange={(e) => setWhiteningTone(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Trắng Hồng Tự Nhiên</span>
                    <span className="beauty-val-badge">{rosyTone}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={rosyTone}
                    onChange={(e) => setRosyTone(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Sáng Nét Chi Tiết</span>
                    <span className="beauty-val-badge">{glowClarity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={glowClarity}
                    onChange={(e) => setGlowClarity(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>
              </div>

              <div className="beauty-section-box">
                <div className="beauty-section-header">
                  <span>🎛️ Tinh Chỉnh Ánh Sáng</span>
                  {(brightnessAdjust !== 100 || contrastAdjust !== 100 || saturationAdjust !== 100 || skinSmoothing !== 0 || rosyTone !== 0 || glowClarity !== 0) && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.75rem', padding: '2px 8px', color: 'var(--color-pink-primary)' }}
                      onClick={resetAdjustments}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Độ Sáng (Brightness)</span>
                    <span className="beauty-val-badge">{brightnessAdjust}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="130"
                    value={brightnessAdjust}
                    onChange={(e) => setBrightnessAdjust(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Độ Tương Phản (Contrast)</span>
                    <span className="beauty-val-badge">{contrastAdjust}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="130"
                    value={contrastAdjust}
                    onChange={(e) => setContrastAdjust(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Độ Bão Hòa (Saturation)</span>
                    <span className="beauty-val-badge">{saturationAdjust}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="150"
                    value={saturationAdjust}
                    onChange={(e) => setSaturationAdjust(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Flyout Panel 3: Phát sáng (Ring Light) ── */}
        {activeFlyout === 'lighting' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">💡 Đèn Phát Sáng (Ring Light)</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Đèn sáng Photobooth:</span>
                <button
                  className={`btn ${ringLightEnabled ? 'btn-primary' : 'btn-pill-white'}`}
                  style={{ padding: '6px 18px', fontSize: '0.88rem' }}
                  onClick={() => setRingLightEnabled(!ringLightEnabled)}
                >
                  {ringLightEnabled ? 'Đang Bật' : 'Tắt'}
                </button>
              </div>

              {ringLightEnabled && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#666', marginBottom: 6 }}>
                    <span>Cường độ ánh sáng</span>
                    <span style={{ fontWeight: 700, color: 'var(--color-pink-primary)' }}>{ringLightLevel}%</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    value={ringLightLevel}
                    onChange={(e) => setRingLightLevel(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CỘT LIVE VIEW: Chiếm 10/12 (approx 83.33%) ── */}
        <div className="liveview-grid-col-10">
          <div className={`camera-viewfinder-wrapper ${isSessionActive && !isPhotoboothFull ? 'shooting-focus' : ''}`}>
          {hasCamera ? (
            <>
              <BeautyCameraView
                ref={beautyCameraRef}
                stream={isCanonDaemonActive ? null : activeMediaStream}
                mjpegUrl={isCanonDaemonActive && !(typeof window !== 'undefined' && window.location.search.includes('noLiveStream=1')) ? 'http://127.0.0.1:8899/liveview' : undefined}
                mirrorCamera={mirrorCamera}
                slimFace={slimFace}
                skinSmoothing={skinSmoothing}
                whiteningTone={whiteningTone}
                rosyTone={rosyTone}
                glowClarity={glowClarity}
                brightnessAdjust={brightnessAdjust}
                contrastAdjust={contrastAdjust}
                saturationAdjust={saturationAdjust}
                className="camera-preview-element"
              />
              {cameraFreezeFrame && (
                <img
                  src={cameraFreezeFrame}
                  alt="Capture Freeze"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 2,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {/* Thẻ video nguồn dự phòng cấp thấp luôn phát stream camera */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 1,
                  height: 1,
                  opacity: 0.01,
                  pointerEvents: 'none',
                  zIndex: -999,
                }}
              />
            </>
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: '3.2rem', animation: 'pulse 1.8s infinite' }}>📷</div>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--color-pink-primary)' }}>
                Luồng hình ảnh trực tiếp chưa hiển thị
              </p>
              <p style={{ fontSize: '0.92rem', color: '#ccc', maxWidth: 520, margin: 0, lineHeight: 1.5 }}>
                Đang kết nối luồng máy ảnh Canon EOS R100. Hãy bật ON công tắc máy ảnh, kiểm tra cáp USB hoặc bấm chọn camera bên dưới:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10, justifyContent: 'center' }}>
                {availableCameras.map((cam) => (
                  <button
                    key={cam.id}
                    className="btn btn-secondary"
                    style={{ padding: '8px 18px', fontSize: '0.9rem' }}
                    onClick={() => {
                      selectCamera(cam.id)
                      startCamera(cam.id)
                    }}
                  >
                    {/eos|canon/i.test(cam.name) ? '📸 Dùng Canon EOS (Ưu tiên)' : '💻 Dùng ' + cam.name}
                  </button>
                ))}
                <button
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.9rem' }}
                  onClick={() => startCamera(selectedCameraId || undefined)}
                >
                  ⚡ Thử lại luồng
                </button>
              </div>
            </div>
          )}

          {/* Ring Light Overlay effect */}
          {ringLightEnabled && (
            <div
              className="ring-light-overlay"
              style={{
                borderWidth: `${Math.round(16 + (ringLightLevel / 100) * 20)}px`,
                opacity: ringLightLevel / 100,
              }}
            />
          )}

          {/* Timelapse Recording Indicator */}
          {eventConfig.timelapseEnabled && (isTimelapseRecording || isSessionActive) && (
            <div className="timelapse-recording-badge">
              <span className="rec-dot" />
              <span>REC TIMELAPSE ({eventConfig.timelapseSpeed || 2.5}x)</span>
            </div>
          )}

          {/* Countdown digits overlay */}
          {isCapturingShot && currentCountdown > 0 && (
            <div className="multi-shot-countdown-overlay">
              <div className="countdown-digits-translucent">{currentCountdown}</div>
            </div>
          )}

          {/* Flying Snap Effect Animation */}
          {snapshotFlyer && (
            <div className="snapshot-flying-overlay">
              <div className="snapshot-card-animate">
                <img src={snapshotFlyer.photoUrl} alt="Just Captured" />
                <div
                  className="snapshot-card-badge"
                  style={
                    snapshotFlyer.isEdsdk
                      ? { background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: '#ffffff', fontWeight: 800 }
                      : undefined
                  }
                >
                  {isSelfboothMode
                    ? snapshotFlyer.isEdsdk
                      ? `📸 Canon R100 (24MP) • Đã lưu ảnh ${selfboothLibrary.length}`
                      : `✨ Đã thêm vào bộ sưu tập (${selfboothLibrary.length} ảnh)`
                    : snapshotFlyer.isEdsdk
                      ? `📸 Canon R100 (24MP) ➔ Ô ${snapshotFlyer.slotIndex + 1}`
                      : `✨ Đã lưu vào ô ${snapshotFlyer.slotIndex + 1}`}
                </div>
              </div>
          </div>
        </div>

        {/* ── CỘT DẢI Ô DỌC: Chiếm 2/12 (approx 16.67%) ── */}
        {!isSelfboothMode && (
          <aside className="slots-grid-col-2 right-slots-dock">
            <div className="vertical-slots-list">
              {Array.from({ length: totalShots }).map((_, index) => {
                const slotItem = slots[index]
                const isFilled = slotItem !== null
                const isRetaking = retakeSlotIndex === index
                const isJustCaptured = justCapturedSlot === index

                return (
                  <div
                    key={index}
                    className={`vertical-slot-thumb ${isFilled ? 'filled' : 'empty'} ${isRetaking ? 'retaking-target' : ''} ${isJustCaptured ? 'just-captured' : ''}`}
                    onClick={() => {
                      if (isFilled && !isCapturingShot) {
                        handleDeleteSlot(index)
                      }
                    }}
                  >
                    {isFilled ? (
                      <>
                        <img src={slotItem.compositedPath || slotItem.rawPath} alt={`Slot ${index + 1}`} />
                        <span className="slot-index-badge">{index + 1}</span>
                        <button
                          className="slot-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSlot(index)
                          }}
                          title={`Xóa ảnh ô ${index + 1} để chụp lại`}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="slot-empty-content">
                        <span className="slot-empty-plus">+</span>
                        <span className="slot-empty-label">Ô {index + 1}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="vertical-slots-counter">
              <span className="counter-fraction">{filledSlotsCount}/{totalShots}</span>
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Deck: Shutter Action Control (Căn thẳng theo Live View 10/12) ── */}
      <footer className="capture-bottom-deck">
        {!isSelfboothMode ? (
          /* ── PHOTOBOOTH MODE CONTROLS ── */
          <div className="bottom-deck-12col">
            <div className="shutter-col-10">
              <div className="capture-shutter-container">
              {isPhotoboothFull && retakeSlotIndex === null ? (
                /* ĐÃ ĐỦ FULL ẢNH: Nút Hài Lòng & Tiếp Tục */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    className="start-capture-btn-pink proceed-glow-btn"
                    id="proceed-theme-button"
                    onClick={handleProceedPhotobooth}
                  >
                    <span>Tiếp Tục Chọn Frame</span>
                    <ArrowRight size={22} strokeWidth={2.2} />
                  </button>
                </div>
              ) : (
                /* CHƯA ĐỦ ẢNH HOẶC ĐANG CHỤP LẠI (RETAKE) */
                <button
                  className="start-capture-btn-pink"
                  id="start-capture-button"
                  disabled={isCapturingShot}
                  onClick={handleTakePhotoboothShot}
                >
                  <Camera size={26} strokeWidth={2} />
                  <span>
                    {isCapturingShot
                      ? `Đang đếm ngược...`
                      : retakeSlotIndex !== null
                        ? `📸 Chụp Lại Ô ${retakeSlotIndex + 1}`
                        : filledSlotsCount === 0
                          ? `Bắt đầu chụp (Ảnh 1 / ${totalShots})`
                          : `Chụp tiếp ảnh ${filledSlotsCount + 1} / ${totalShots}`}
                  </span>
                </button>
              )}

              {isSessionActive && !isCapturingShot && (
                <button className="cancel-shoot-btn" onClick={handleResetShootSession}>
                  ↩ Chụp lại từ đầu
                </button>
              </div>
            </div>
            <div className="shutter-col-2" />
          </div>
        ) : (
          /* ── SELFBOOTH MODE CONTROLS ── */
          <div className="selfbooth-bottom-controls">
            {!isSelfboothRunning ? (
              <div className="selfbooth-start-box">
                <button
                  className="start-capture-btn-pink selfbooth-start-btn"
                  onClick={handleStartSelfbooth}
                >
                  <span style={{ fontSize: '1.5rem' }}>🚀</span>
                  <span>Bắt Đầu Phiên Selfbooth ({Math.round(selfboothDuration / 60)} Phút)</span>
                </button>
                <p className="selfbooth-start-desc">
                  Thỏa sức tạo dáng và bấm chụp không giới hạn số ảnh. Khi hết giờ, bạn sẽ tự tay chọn ra {totalShots} ảnh đẹp nhất!
                </p>
              </div>
            ) : (
              <div className="selfbooth-running-box">
                <div className="selfbooth-stat-bar">
                  <div className="selfbooth-stat-item">
                    <span>⏱️ Còn lại:</span>
                    <strong className={selfboothTimeLeft <= 10 ? 'text-danger' : ''}>
                      {formatTime(selfboothTimeLeft)}
                    </strong>
                  </div>
                  <div className="selfbooth-stat-item">
                    <span>📸 Đã chụp:</span>
                    <strong>{selfboothLibrary.length} tấm</strong>
                  </div>
                </div>

                <div className="selfbooth-actions-row">
                  <button
                    className="start-capture-btn-pink selfbooth-shutter-btn"
                    disabled={isCapturingShot}
                    onClick={handleTakeSelfboothShot}
                  >
                    <span style={{ fontSize: '1.6rem' }}>📸</span>
                    <span>{isCapturingShot ? 'Đang chụp...' : 'Bấm Chụp Ảnh (Pose!)'}</span>
                  </button>

                  {selfboothLibrary.length >= totalShots && (
                    <button
                      className="selfbooth-finish-early-btn"
                      onClick={handleFinishSelfboothSession}
                    >
                      ✨ Xong Sớm & Chọn Ảnh ➔
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </footer>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL CHỌN ẢNH VÀO KHUNG CHO CHẾ ĐỘ SELFBOOTH (Photo Picker Modal)
      ════════════════════════════════════════════════════════════════════════ */}
      {isPhotoPickerOpen && (
        <div className="photo-picker-modal-backdrop">
          <div className="photo-picker-modal-card animate-pop">
            <div className="photo-picker-header">
              <div>
                <h2 className="photo-picker-title">
                  🌸 CHỌN {totalShots} ẢNH ĐẸP NHẤT VÀO KHUNG
                </h2>
                <p className="photo-picker-subtitle">
                  Bạn đã chụp được {selfboothLibrary.length} tấm ảnh! Hãy chạm vào ảnh bạn thích để đưa vào các ô bên dưới.
                </p>
              </div>
              <div className="photo-picker-badge">
                {pickedSlots.filter(Boolean).length}/{totalShots} Ảnh Đã Chọn
              </div>
            </div>

            {/* Hàng 1: Các ô slot của khung hình */}
            <div className="picker-target-slots-row">
              {Array.from({ length: totalShots }).map((_, idx) => {
                const picked = pickedSlots[idx]
                const isActive = activeSlotToPick === idx

                return (
                  <div
                    key={idx}
                    className={`picker-slot-card ${picked ? 'filled' : 'empty'} ${isActive ? 'active-target' : ''}`}
                    onClick={() => setActiveSlotToPick(idx)}
                  >
                    {picked ? (
                      <>
                        <img src={picked.compositedPath || picked.rawPath} alt={`Slot ${idx + 1}`} />
                        <span className="picker-slot-number">Ô {idx + 1}</span>
                        <button
                          className="picker-slot-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemovePickedSlot(idx)
                          }}
                          title="Bỏ ảnh này ra"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="picker-slot-empty">
                        <span style={{ fontSize: '1.8rem', color: '#94a3b8' }}>+</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b' }}>
                          Ô {idx + 1} {isActive ? '(Đang chọn)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Hàng 2: Lưới tất cả ảnh đã chụp trong phiên Selfbooth */}
            <div className="picker-library-section">
              <div className="picker-library-label">
                <span>📸 Kho Ảnh Đã Chụp Trong Phiên ({selfboothLibrary.length} ảnh):</span>
                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Chạm vào ảnh để gán vào ô đang sáng viền hồng
                </span>
              </div>

              <div className="picker-library-grid">
                {selfboothLibrary.map((photo, pIdx) => {
                  const assignedSlot = pickedSlots.findIndex((s) => s?.id === photo.id)
                  const isAssigned = assignedSlot !== -1

                  return (
                    <div
                      key={photo.id}
                      className={`picker-library-item ${isAssigned ? 'assigned' : ''}`}
                      onClick={() => handleAssignPhotoToSlot(photo)}
                    >
                      <img src={photo.compositedPath || photo.rawPath} alt={`Photo ${pIdx + 1}`} />
                      <span className="library-photo-num">#{pIdx + 1}</span>
                      {isAssigned && (
                        <div className="assigned-badge">
                          ✓ Ô {assignedSlot + 1}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Footer Modal: Nút Xác Nhận & Nút Chụp Thêm */}
            <div className="photo-picker-footer">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setIsPhotoPickerOpen(false)
                  setIsSelfboothRunning(true)
                }}
              >
                ↩ Chụp Thêm Ảnh
              </button>

              <button
                className="start-capture-btn-pink picker-confirm-btn"
                disabled={pickedSlots.filter(Boolean).length < totalShots}
                onClick={handleConfirmSelfboothSelection}
              >
                <span>🎉</span>
                <span>
                  {pickedSlots.filter(Boolean).length < totalShots
                    ? `Hãy chọn đủ ${totalShots} ảnh (${pickedSlots.filter(Boolean).length}/${totalShots})`
                    : 'Xác Nhận & Tiếp Tục Chọn Theme ➔'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
