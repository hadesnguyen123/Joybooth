import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, COLOR_FILTERS, BEAUTY_PRESETS } from '../store/appStore'
import { joyBoothApi, isBrowser, mockApi } from '../lib/api'
import './CaptureScreen.css'

export default function CaptureScreen() {
  const {
    setScreen,
    addPhoto,
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

  const [hasCamera, setHasCamera] = useState<boolean>(false)
  const [activeFlyout, setActiveFlyout] = useState<'filter' | 'beauty' | 'lighting' | null>(null)
  
  // Trạng thái buổi chụp theo từng lần nhấn:
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false) // Khóa các nút khác & làm tối xung quanh
  const [isCapturingShot, setIsCapturingShot] = useState<boolean>(false) // Đang trong 3s countdown của 1 shot
  const [currentShotNumber, setCurrentShotNumber] = useState<number>(1)
  const [currentCountdown, setCurrentCountdown] = useState<number>(3)
  const [showFlash, setShowFlash] = useState<boolean>(false)
  const [capturedThumbnails, setCapturedThumbnails] = useState<string[]>([])

  // Hiệu ứng ảnh bay vào lưới thumbnail
  const [snapshotFlyer, setSnapshotFlyer] = useState<{ photoUrl: string; slotIndex: number } | null>(null)
  const [justCapturedSlot, setJustCapturedSlot] = useState<number | null>(null)

  const totalShots = selectedLayout.photosCount || 4

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

  // Chụp 1 khung hình từ video sang DataURL
  function grabVideoFrame(): string {
    if (!videoRef.current) return ''
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 1920
    canvas.height = videoRef.current.videoHeight || 1080
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // Áp dụng bộ lọc màu và tinh chỉnh ánh sáng canvas
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

            // Tự động lưu video timelapse vào thư mục Downloads/JoyBooth của máy
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

  // Chụp từng ảnh một theo mỗi lần nhấn nút
  async function handleTakeSingleShot() {
    if (isCapturingShot) return
    if (capturedThumbnails.length >= totalShots) return

    // 1. Kích hoạt chế độ buổi chụp Studio: Làm tối xung quanh & Khóa toàn bộ tính năng khác
    setActiveFlyout(null)
    setIsSessionActive(true)
    setIsCapturingShot(true)

    // Khởi động timelapse nếu là lần nhấn đầu tiên
    if (capturedThumbnails.length === 0) {
      startTimelapse()
    }

    const nextShotNum = capturedThumbnails.length + 1
    setCurrentShotNumber(nextShotNum)

    // 2. Chạy đếm ngược (3s, 5s hoặc 10s)
    for (let c = countdownSeconds; c >= 1; c--) {
      setCurrentCountdown(c)
      await new Promise((r) => setTimeout(r, 1000))
    }

    // 3. Chớp Flash & Chụp ảnh
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 450)

    const photoDataUrl = grabVideoFrame()
    const timestamp = Date.now()
    const photoPath = photoDataUrl || `photo_${timestamp}_${nextShotNum}.jpg`

    addPhoto({
      id: `photo_${timestamp}_${nextShotNum}`,
      rawPath: photoPath,
      enhancedPath: photoPath,
      compositedPath: photoPath,
      timestamp,
    })

    // 4. Kích hoạt hiệu ứng bay vào ô thumbnail slot
    const slotIndex = capturedThumbnails.length
    setSnapshotFlyer({ photoUrl: photoPath, slotIndex })
    setJustCapturedSlot(slotIndex)

    const nextThumbnails = [...capturedThumbnails, photoPath]
    setCapturedThumbnails(nextThumbnails)

    // 5. Tự động lưu ảnh vào thư mục Downloads của máy
    if (photoDataUrl && photoDataUrl.startsWith('data:image')) {
      const fileName = `joybooth_shot_${nextShotNum}_${timestamp}.jpg`
      const api = isBrowser ? mockApi : joyBoothApi
      api.storage.savePhoto(photoDataUrl, fileName).catch((err) => console.warn('Save photo error:', err))
    }

    // Ẩn flyer sau khi hoàn tất animation bay
    setTimeout(() => {
      setSnapshotFlyer(null)
    }, 950)

    setTimeout(() => {
      setJustCapturedSlot(null)
    }, 1500)

    setIsCapturingShot(false)

    // 6. Kiểm tra xem đã hoàn thành tất cả ảnh chưa
    if (nextThumbnails.length >= totalShots) {
      await stopTimelapse()

      if (eventConfig.gdriveEnabled) {
        const folderLink =
          eventConfig.gdriveFolderUrl ||
          `https://drive.google.com/drive/folders/${eventConfig.gdriveFolderId || 'JoyBooth_Demo'}`
        setGdriveUrl(folderLink)
      }

      // Hủy bỏ cơ chế khóa và chuyển màn hình sau 1.2s
      setTimeout(() => {
        setIsSessionActive(false)
        setScreen('select-theme')
      }, 1200)
    }
  }

  // Hủy buổi chụp và chụp lại từ đầu
  function handleResetShootSession() {
    setIsSessionActive(false)
    setIsCapturingShot(false)
    setCapturedThumbnails([])
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  const isCompleted = capturedThumbnails.length >= totalShots

  return (
    <div className="capture-screen-pastel" id="capture-screen">
      {/* Screen Flash Animation */}
      {showFlash && <div className="screen-flash" />}

      {/* Focus Dim Backdrop: Làm tối xung quanh trong suốt buổi chụp */}
      {isSessionActive && <div className="focus-dim-backdrop" />}

      {/* ── Top Bar: Countdown Pills + Locked Badge + Utilities ── */}
      <header className={`capture-top-bar ${isSessionActive ? 'locked-dimmed' : ''}`}>
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

        {/* Khung đã chọn (Cố định, không được đổi tại đây) */}
        <div className="locked-layout-badge" title="Khung lưới đã chọn từ trước">
          <span className="lock-icon">🔒</span>
          <span>Khung:</span>
          <strong>{selectedLayout.name}</strong>
          <span>({selectedLayout.photosCount} ảnh)</span>
        </div>

        {/* Right utility options — Nút to rõ nét, font chữ lớn */}
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
        <aside className={`left-sidebar-dock ${isSessionActive ? 'locked-dimmed' : ''}`}>
          {/* Nút 1: Bộ lọc màu */}
          <button
            className={`dock-btn ${activeFlyout === 'filter' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'filter' ? null : 'filter')}
            title="Chọn bộ lọc màu"
          >
            <span className="dock-icon">🫧</span>
            <span className="dock-label">Bộ lọc</span>
          </button>

          {/* Nút 2: Làm đẹp & Chỉnh sáng (Tách riêng biệt) */}
          <button
            className={`dock-btn ${activeFlyout === 'beauty' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'beauty' ? null : 'beauty')}
            title="Làm mịn da & chỉnh sáng"
          >
            <span className="dock-icon">✨</span>
            <span className="dock-label">Làm đẹp</span>
          </button>

          {/* Nút 3: Phát sáng (Ring Light) */}
          <button
            className={`dock-btn ${activeFlyout === 'lighting' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'lighting' ? null : 'lighting')}
            title="Đèn sáng studio"
          >
            <span className="dock-icon">💡</span>
            <span className="dock-label">Phát sáng</span>
          </button>
        </aside>

        {/* ── Flyout Modal Panel: 1. Bộ lọc màu (Làm sáng rõ rệt thẻ đang chọn) ── */}
        {activeFlyout === 'filter' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">🫧 Bộ Lọc Màu Hàn Quốc</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content">
              {/* Banner hiển thị bộ lọc đang áp dụng */}
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
                      <div
                        className="filter-color-dot"
                        style={{ backgroundColor: filter.previewColor }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? 'var(--color-pink-primary)' : '#2D2426' }}>
                          {filter.name}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                          {filter.tag}
                        </span>
                      </div>
                      {isSelected && <span className="filter-selected-badge">✓ ĐANG CHỌN</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Flyout Modal Panel: 2. Làm đẹp & Chỉnh sáng (Tách riêng biệt) ── */}
        {activeFlyout === 'beauty' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">✨ Làm Đẹp & Ánh Sáng Studio</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content">
              {/* Presets Làm Đẹp 1-Chạm K-Beauty */}
              <div className="beauty-presets-container">
                <span className="beauty-presets-title">👑 Gợi Ý Phong Cách K-Beauty (1-Chạm):</span>
                <div className="beauty-presets-grid">
                  {BEAUTY_PRESETS.map((preset) => {
                    const isSelected = selectedBeautyPreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        className={`beauty-preset-pill ${isSelected ? 'active' : ''}`}
                        onClick={() => applyBeautyPreset(preset.id)}
                        title={preset.description}
                      >
                        <span className="preset-icon">{preset.icon}</span>
                        <span className="preset-name">{preset.name}</span>
                        {isSelected && <span className="preset-check">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Box 1: Làm đẹp khuôn mặt (Glam & Beauty) */}
              <div className="beauty-section-box">
                <div className="beauty-section-header">
                  <span>🌸 Tùy Chỉnh Da Chi Tiết</span>
                </div>

                <div className="beauty-slider-row">
                  <div className="beauty-slider-label">
                    <span>Làm Mịn Da (Skin Smoothing)</span>
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
                    <span>Trắng Hồng Da (Rosy Tone)</span>
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
                    <span>Độ Nét Căng Bóng (Clarity Glow)</span>
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

              {/* Box 2: Tinh chỉnh ánh sáng */}
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

        {/* ── Flyout Modal Panel: 3. Phát sáng (Ring Light) ── */}
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
        <div className={`camera-viewfinder-wrapper ${isSessionActive ? 'shooting-focus' : ''}`}>
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

          {/* Countdown digits overlay - Chỉ để mình số trong suốt mờ ảo, không che mặt người chụp */}
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
                  ✨ Đã lưu vào ô {snapshotFlyer.slotIndex + 1}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Deck: Live Slots Progress (Phóng to) + Shutter Button ── */}
      <footer className="capture-bottom-deck">
        {/* Live Slot Strip: [Photo 1] [Photo 2] [+] [+] with counter (e.g. 1/4) */}
        <div className="live-slots-deck">
          <div className="live-slots-list">
            {Array.from({ length: totalShots }).map((_, index) => {
              const isFilled = index < capturedThumbnails.length
              const isCurrent = index === capturedThumbnails.length
              const isJustCaptured = justCapturedSlot === index

              return (
                <div
                  key={index}
                  className={`live-slot-thumb ${isFilled ? 'filled' : 'empty'} ${isCurrent && isSessionActive ? 'current' : ''} ${isJustCaptured ? 'just-captured' : ''}`}
                >
                  {isFilled ? (
                    <img src={capturedThumbnails[index]} alt={`Slot ${index + 1}`} />
                  ) : (
                    <span>+</span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="live-slots-counter">
            {capturedThumbnails.length}/{totalShots}
          </div>
        </div>

        {/* Nút chụp: Căn giữa tuyệt đối, không lệch viền */}
        <div className="capture-shutter-container">
          <button
            className="start-capture-btn-pink"
            id="start-capture-button"
            disabled={isCapturingShot || isCompleted}
            onClick={handleTakeSingleShot}
          >
            <span style={{ fontSize: '1.5rem' }}>📷</span>
            <span>
              {isCapturingShot
                ? `Đang đếm ngược ảnh ${currentShotNumber}...`
                : isCompleted
                ? '✨ Đã hoàn thành tất cả ảnh!'
                : capturedThumbnails.length === 0
                ? `Bắt đầu chụp (Ảnh 1 / ${totalShots})`
                : `Chụp tiếp ảnh ${capturedThumbnails.length + 1} / ${totalShots}`}
            </span>
          </button>

          {/* Nút hủy buổi chụp nếu khách muốn chụp lại từ đầu - Nằm ngay dưới nút chính, không bị tràn cạnh phải */}
          {isSessionActive && !isCapturingShot && !isCompleted && (
            <button className="cancel-shoot-btn" onClick={handleResetShootSession}>
              ↩ Chụp lại từ đầu
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
