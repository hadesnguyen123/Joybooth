import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, COLOR_FILTERS, BEAUTY_PRESETS, type CapturedPhoto } from '../store/appStore'
import { joyBoothApi, isBrowser, mockApi } from '../lib/api'
import './CaptureScreen.css'

export default function CaptureScreen() {
  const {
    setScreen,
    setSessionPhotos,
    countdownSeconds,
    setCountdownSeconds,
    selectedLayout,
    selectedFilter,
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
    getEffectiveFilterCss,
  } = useAppStore()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const currentStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const totalShots = selectedLayout.photosCount || 4
  const isSelfboothMode = eventConfig.captureMode === 'selfbooth'
  const selfboothDuration = eventConfig.selfboothDurationSeconds || 60

  const [hasCamera, setHasCamera] = useState<boolean>(false)
  const [activeFlyout, setActiveFlyout] = useState<'filter' | 'beauty' | 'lighting' | null>(null)

  // ── Trạng thái chung khi chụp ──
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false)
  const [isCapturingShot, setIsCapturingShot] = useState<boolean>(false)
  const [currentCountdown, setCurrentCountdown] = useState<number>(3)
  const [showFlash, setShowFlash] = useState<boolean>(false)
  const [snapshotFlyer, setSnapshotFlyer] = useState<{ photoUrl: string; slotIndex: number } | null>(null)
  const [justCapturedSlot, setJustCapturedSlot] = useState<number | null>(null)

  // ── Chế độ PHOTOBOOTH CỔ ĐIỂN (Có Retake / Xóa ô xấu) ──
  const [slots, setSlots] = useState<(CapturedPhoto | null)[]>(Array(totalShots).fill(null))
  const [retakeSlotIndex, setRetakeSlotIndex] = useState<number | null>(null)

  // ── Chế độ SELFBOOTH (Chụp tự do theo thời gian & Chọn ảnh vào khung) ──
  const [isSelfboothRunning, setIsSelfboothRunning] = useState<boolean>(false)
  const [selfboothTimeLeft, setSelfboothTimeLeft] = useState<number>(selfboothDuration)
  const [selfboothLibrary, setSelfboothLibrary] = useState<CapturedPhoto[]>([])
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState<boolean>(false)
  const [pickedSlots, setPickedSlots] = useState<(CapturedPhoto | null)[]>(Array(totalShots).fill(null))
  const [activeSlotToPick, setActiveSlotToPick] = useState<number>(0)

  // Khởi động Camera thiết bị
  const startCamera = useCallback(async (deviceId?: string) => {
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((track) => track.stop())
      currentStreamRef.current = null
    }

    try {
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      }

      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      })

      currentStreamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch((e) => console.warn('Play video error:', e))
      }

      setHasCamera(true)

      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          id: d.deviceId,
          name: d.label || `Camera ${index + 1} (${d.deviceId.slice(0, 6)}...)`,
        }))

      if (videoDevices.length > 0) {
        setCameras(videoDevices)
        if (!selectedCameraId) {
          const track = stream.getVideoTracks()[0]
          selectCamera(track.getSettings().deviceId || videoDevices[0].id)
        }
      }
    } catch (err) {
      console.warn('Cannot connect camera:', err)
      setHasCamera(false)
    }
  }, [selectedCameraId, selectCamera, setCameras])

  useEffect(() => {
    startCamera(selectedCameraId || undefined)

    const handleDeviceChange = () => startCamera(selectedCameraId || undefined)
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [selectedCameraId, startCamera])

  // Đếm ngược thời gian phiên Selfbooth
  useEffect(() => {
    if (!isSelfboothMode || !isSelfboothRunning || isPhotoPickerOpen) return

    const timer = setInterval(() => {
      setSelfboothTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleFinishSelfboothSession()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isSelfboothMode, isSelfboothRunning, isPhotoPickerOpen])

  // Chụp 1 khung hình từ video sang DataURL
  function grabVideoFrame(): string {
    if (!videoRef.current) return ''
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1920
    canvas.height = videoRef.current.videoHeight || 1080
    const ctx = canvas.getContext('2d')

    if (ctx) {
      const effFilter = getEffectiveFilterCss()
      if (effFilter && effFilter !== 'none') {
        ctx.filter = effFilter
      }

      if (mirrorCamera) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      return canvas.toDataURL('image/jpeg', 0.98)
    }
    return ''
  }

  // Khởi động quay Timelapse
  function startTimelapse() {
    if (!eventConfig.timelapseEnabled || !currentStreamRef.current) return
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') return

    try {
      recordedChunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : 'video/webm'
      const recorder = new MediaRecorder(currentStreamRef.current, { mimeType })
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      recorder.start(250)
      mediaRecorderRef.current = recorder
    } catch (err) {
      console.warn('Failed to start MediaRecorder for timelapse:', err)
    }
  }

  // Dừng quay Timelapse
  async function stopTimelapse() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorderRef.current) return resolve()
        mediaRecorderRef.current.onstop = () => {
          try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
            const videoUrl = URL.createObjectURL(blob)
            setTimelapseUrl(videoUrl)

            const reader = new FileReader()
            reader.onloadend = () => {
              const dataUrl = reader.result as string
              if (dataUrl && dataUrl.startsWith('data:')) {
                const fileName = `joybooth_timelapse_${Date.now()}.webm`
                const api = isBrowser ? mockApi : joyBoothApi
                api.storage.savePhoto(dataUrl, fileName).catch((err) => console.warn('Save timelapse error:', err))
              }
            }
            reader.readAsDataURL(blob)
          } catch (err) {
            console.warn('Error creating timelapse blob:', err)
          }
          resolve()
        }
        mediaRecorderRef.current.stop()
      })
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

    // Khởi động timelapse nếu là bức ảnh đầu tiên
    if (filledSlotsCount === 0) {
      startTimelapse()
    }

    // Đếm ngược (3s, 5s hoặc 10s)
    for (let c = countdownSeconds; c >= 1; c--) {
      setCurrentCountdown(c)
      await new Promise((r) => setTimeout(r, 1000))
    }

    // Chớp Flash & Chụp ảnh
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 450)

    const photoDataUrl = grabVideoFrame()
    const timestamp = Date.now()
    const photoPath = photoDataUrl || `photo_${timestamp}_${targetIndex + 1}.jpg`

    const newPhoto: CapturedPhoto = {
      id: `photo_${timestamp}_${targetIndex + 1}`,
      rawPath: photoPath,
      enhancedPath: photoPath,
      compositedPath: photoPath,
      timestamp,
    }

    // Cập nhật ô slot
    const nextSlots = [...slots]
    nextSlots[targetIndex] = newPhoto
    setSlots(nextSlots)

    // Reset lại retake index sau khi chụp xong
    setRetakeSlotIndex(null)

    // Hiệu ứng bay vào ô thumbnail
    setSnapshotFlyer({ photoUrl: photoPath, slotIndex: targetIndex })
    setJustCapturedSlot(targetIndex)

    // Tự động lưu ảnh vào máy tính
    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      const fileName = `joybooth_shot_${targetIndex + 1}_${timestamp}.jpg`
      const api = isBrowser ? mockApi : joyBoothApi
      api.storage.savePhoto(photoDataUrl, fileName).catch((err) => console.warn('Save photo error:', err))
    }

    setTimeout(() => setSnapshotFlyer(null), 950)
    setTimeout(() => setJustCapturedSlot(null), 1500)
    setIsCapturingShot(false)

    // Nếu sau lần chụp này đã full tất cả các ô:
    // Dừng timelapse nhưng KHÔNG tự động chuyển màn hình ngay!
    // Giữ nguyên để khách xem lại, xóa ảnh không đẹp hoặc bấm Tiếp tục.
    if (nextSlots.every(Boolean)) {
      await stopTimelapse()
      if (eventConfig.gdriveEnabled) {
        const folderLink =
          eventConfig.gdriveFolderUrl ||
          `https://drive.google.com/drive/folders/${eventConfig.gdriveFolderId || 'JoyBooth_Demo'}`
        setGdriveUrl(folderLink)
      }
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

    // Đếm ngược ngắn 2 giây để tạo dáng nhanh vui vẻ
    for (let c = 2; c >= 1; c--) {
      setCurrentCountdown(c)
      await new Promise((r) => setTimeout(r, 1000))
    }

    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 450)

    const photoDataUrl = grabVideoFrame()
    const timestamp = Date.now()
    const photoNum = selfboothLibrary.length + 1
    const photoPath = photoDataUrl || `selfbooth_${timestamp}_${photoNum}.jpg`

    const newPhoto: CapturedPhoto = {
      id: `selfbooth_${timestamp}_${photoNum}`,
      rawPath: photoPath,
      enhancedPath: photoPath,
      compositedPath: photoPath,
      timestamp,
    }

    setSelfboothLibrary((prev) => [...prev, newPhoto])

    // Lưu ảnh vào máy
    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      const fileName = `joybooth_self_${photoNum}_${timestamp}.jpg`
      const api = isBrowser ? mockApi : joyBoothApi
      api.storage.savePhoto(photoDataUrl, fileName).catch((err) => console.warn('Save selfbooth photo error:', err))
    }

    // Hiệu ứng bay lên
    setSnapshotFlyer({ photoUrl: photoPath, slotIndex: 0 })
    setTimeout(() => setSnapshotFlyer(null), 800)
    setIsCapturingShot(false)
  }

  // Kết thúc phiên chụp Selfbooth (Hết giờ hoặc bấm "Xong Sớm")
  async function handleFinishSelfboothSession() {
    setIsSelfboothRunning(false)
    await stopTimelapse()

    if (eventConfig.gdriveEnabled) {
      const folderLink =
        eventConfig.gdriveFolderUrl ||
        `https://drive.google.com/drive/folders/${eventConfig.gdriveFolderId || 'JoyBooth_Demo'}`
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

      {/* ── Top Bar: Countdown Pills + Locked Badge + Utilities ── */}
      <header className={`capture-top-bar ${isSessionActive && !isPhotoboothFull ? 'locked-dimmed' : ''}`}>
        {!isSelfboothMode ? (
          <div className="countdown-capsule-group">
            {[3, 5, 10].map((sec) => (
              <button
                key={sec}
                className={`countdown-pill ${countdownSeconds === sec ? 'active' : ''}`}
                onClick={() => setCountdownSeconds(sec)}
                title={`Thời gian đếm ngược ${sec} giây`}
              >
                <span>⏱️</span>
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

        {/* Khung đã chọn (Cố định, không được đổi tại đây) */}
        <div className="locked-layout-badge" title="Khung lưới đã chọn từ trước">
          <span className="lock-icon">🔒</span>
          <span>Khung:</span>
          <strong>{selectedLayout.name}</strong>
          <span>({selectedLayout.photosCount} ảnh)</span>
        </div>

        {/* Right utility options */}
        <div className="top-utility-actions">
          {availableCameras.length > 0 && (
            <select
              className="utility-pill-btn camera-select-pill"
              value={selectedCameraId || ''}
              onChange={(e) => {
                selectCamera(e.target.value)
                startCamera(e.target.value)
              }}
            >
              {availableCameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  📷 {cam.name}
                </option>
              ))}
            </select>
          )}

          <button
            className="utility-pill-btn"
            onClick={() => setMirrorCamera(!mirrorCamera)}
            title="Lật gương camera"
          >
            {mirrorCamera ? '🪞 Gương: Bật' : '🪞 Gương: Tắt'}
          </button>

          <button
            className="utility-pill-btn"
            onClick={() => setScreen('admin')}
            title="Quản trị"
          >
            ⚙️ Quản Trị
          </button>

          <button
            className="utility-pill-btn"
            onClick={() => setScreen('idle')}
            title="Về màn hình chờ"
          >
            ✕ Thoát
          </button>
        </div>
      </header>

      {/* ── Main Stage Area: Left Dock + Flyout + Viewfinder ── */}
      <div className="capture-main-stage">
        {/* Left Floating Dock: Bộ lọc / Làm đẹp / Phát sáng */}
        <aside className={`left-sidebar-dock ${isSessionActive && !isPhotoboothFull ? 'locked-dimmed' : ''}`}>
          <button
            className={`dock-btn ${activeFlyout === 'filter' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'filter' ? null : 'filter')}
            title="Chọn bộ lọc màu"
          >
            <span className="dock-icon">🫧</span>
            <span className="dock-label">Bộ lọc</span>
          </button>

          <button
            className={`dock-btn ${activeFlyout === 'beauty' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'beauty' ? null : 'beauty')}
            title="Làm mịn da & chỉnh sáng"
          >
            <span className="dock-icon">✨</span>
            <span className="dock-label">Làm đẹp</span>
          </button>

          <button
            className={`dock-btn ${activeFlyout === 'lighting' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'lighting' ? null : 'lighting')}
            title="Đèn sáng studio"
          >
            <span className="dock-icon">💡</span>
            <span className="dock-label">Phát sáng</span>
          </button>
        </aside>

        {/* ── Flyout Panel 1: Bộ lọc màu ── */}
        {activeFlyout === 'filter' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">🫧 Bộ Lọc Màu Hàn Quốc</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content">
              <div className="filter-active-banner">
                <span>✨ Đang dùng: <strong>{selectedFilter.name}</strong></span>
                <span style={{ fontSize: '0.78rem' }}>({selectedFilter.tag})</span>
              </div>

              <div className="filter-list-presets">
                {COLOR_FILTERS.map((filter) => {
                  const isSelected = selectedFilter.id === filter.id
                  return (
                    <div
                      key={filter.id}
                      className={`filter-preset-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectFilter(filter)}
                    >
                      <div className="filter-card-circle" style={{ background: filter.previewColor }}>
                        {isSelected && <span className="filter-card-check">✓</span>}
                      </div>
                      <span className="filter-card-name">{filter.name}</span>
                      <span className="filter-card-tag">{filter.tag}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

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
                  <span>🌸 Làn Da Hàn Quốc</span>
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

        {/* ── Center Camera Viewfinder Stage ── */}
        <div className={`camera-viewfinder-wrapper ${isSessionActive && !isPhotoboothFull ? 'shooting-focus' : ''}`}>
          {hasCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-preview-element"
              style={{
                transform: mirrorCamera ? 'scaleX(-1)' : 'none',
                filter: getEffectiveFilterCss(),
              }}
            />
          ) : (
            <div style={{ color: '#fff', textAlign: 'center', padding: 20 }}>
              <p style={{ fontSize: '1.2rem', marginBottom: 12 }}>Đang kết nối camera...</p>
              <button className="btn btn-primary" onClick={() => startCamera(selectedCameraId || undefined)}>
                Thử lại Camera
              </button>
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
          {eventConfig.timelapseEnabled && isSessionActive && (
            <div className="timelapse-recording-badge">
              <span className="rec-dot" />
              <span>REC TIMELAPSE ({eventConfig.timelapseSpeed || 2.5}x)</span>
            </div>
          )}

          {/* Countdown digits overlay */}
          {isCapturingShot && (
            <div className="multi-shot-countdown-overlay">
              <div className="countdown-digits-translucent">{currentCountdown}</div>
            </div>
          )}

          {/* Flying Snap Effect Animation */}
          {snapshotFlyer && (
            <div className="snapshot-flying-overlay">
              <div className="snapshot-card-animate">
                <img src={snapshotFlyer.photoUrl} alt="Just Captured" />
                <div className="snapshot-card-badge">
                  {isSelfboothMode
                    ? `✨ Đã thêm vào bộ sưu tập (${selfboothLibrary.length} ảnh)`
                    : `✨ Đã lưu vào ô ${snapshotFlyer.slotIndex + 1}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Deck: 
          1) PHOTOBOOTH MODE: Hiển thị các ô slot kèm nút X xóa & Chụp lại
          2) SELFBOOTH MODE: Hiển thị đếm số ảnh & Nút Bấm Chụp / Nút Kết Thúc Sớm 
      ── */}
      <footer className="capture-bottom-deck">
        {!isSelfboothMode ? (
          /* ── PHOTOBOOTH MODE CONTROLS ── */
          <>
            <div className="live-slots-deck">
              <div className="live-slots-list">
                {Array.from({ length: totalShots }).map((_, index) => {
                  const slotItem = slots[index]
                  const isFilled = slotItem !== null
                  const isRetaking = retakeSlotIndex === index
                  const isJustCaptured = justCapturedSlot === index

                  return (
                    <div
                      key={index}
                      className={`live-slot-thumb ${isFilled ? 'filled' : 'empty'} ${isRetaking ? 'retaking-target' : ''} ${isJustCaptured ? 'just-captured' : ''}`}
                    >
                      {isFilled ? (
                        <>
                          <img src={slotItem.compositedPath || slotItem.rawPath} alt={`Slot ${index + 1}`} />
                          <span className="slot-index-badge">{index + 1}</span>
                          {/* Nút xóa ảnh không đẹp để chụp lại */}
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
              <div className="live-slots-counter">
                {filledSlotsCount}/{totalShots}
              </div>
            </div>

            <div className="capture-shutter-container">
              {isPhotoboothFull && retakeSlotIndex === null ? (
                /* ĐÃ ĐỦ FULL ẢNH: Nút Hài Lòng & Tiếp Tục */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <button
                    className="start-capture-btn-pink proceed-glow-btn"
                    id="proceed-theme-button"
                    onClick={handleProceedPhotobooth}
                  >
                    <span style={{ fontSize: '1.4rem' }}>🎉</span>
                    <span>Hài Lòng & Tiếp Tục ➔</span>
                  </button>
                  <span className="retake-hint-text">
                    💡 Mẹo: Bấm dấu <strong>✕</strong> trên ô ảnh chưa ưng ý để chụp lại ô đó!
                  </span>
                </div>
              ) : (
                /* CHƯA ĐỦ ẢNH HOẶC ĐANG CHỤP LẠI (RETAKE) */
                <button
                  className="start-capture-btn-pink"
                  id="start-capture-button"
                  disabled={isCapturingShot}
                  onClick={handleTakePhotoboothShot}
                >
                  <span style={{ fontSize: '1.5rem' }}>📷</span>
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
              )}
            </div>
          </>
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
