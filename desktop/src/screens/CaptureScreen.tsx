import { useState, useRef, useEffect, useCallback } from 'react'
import { useAppStore, ALL_LAYOUTS, COLOR_FILTERS, type GridLayoutItem } from '../store/appStore'
import './CaptureScreen.css'

export default function CaptureScreen() {
  const {
    setScreen,
    addPhoto,
    countdownSeconds,
    setCountdownSeconds,
    selectedLayout,
    selectLayout,
    selectedFilter,
    selectFilter,
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
    setBrightnessAdjust,
    setContrastAdjust,
    setSaturationAdjust,
    resetAdjustments,
    getEffectiveFilterCss,
  } = useAppStore()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const currentStreamRef = useRef<MediaStream | null>(null)

  const [hasCamera, setHasCamera] = useState<boolean>(false)
  const [activeFlyout, setActiveFlyout] = useState<'layout' | 'filter' | 'lighting' | null>('layout')
  const [isCapturingSequence, setIsCapturingSequence] = useState<boolean>(false)
  const [currentShotNumber, setCurrentShotNumber] = useState<number>(1)
  const [currentCountdown, setCurrentCountdown] = useState<number>(3)
  const [showFlash, setShowFlash] = useState<boolean>(false)

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

  const [capturedThumbnails, setCapturedThumbnails] = useState<string[]>([])

  // Bắt đầu chuỗi chụp nhiều ảnh (Multi-shot Sequence) kết hợp quay Timelapse
  async function startCaptureSequence() {
    if (isCapturingSequence) return
    setActiveFlyout(null)
    setIsCapturingSequence(true)
    setCapturedThumbnails([])

    // 1. Khởi động MediaRecorder ghi video timelapse liên tục từ luồng camera trực tiếp
    let mediaRecorder: MediaRecorder | null = null
    const recordedChunks: Blob[] = []

    if (eventConfig.timelapseEnabled && currentStreamRef.current) {
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
          ? 'video/webm;codecs=vp8'
          : 'video/webm'
        mediaRecorder = new MediaRecorder(currentStreamRef.current, { mimeType })
        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data)
          }
        }
        mediaRecorder.start(250)
      } catch (err) {
        console.warn('Failed to start MediaRecorder for timelapse:', err)
      }
    }

    const totalShots = selectedLayout.photosCount || 4

    for (let shot = 1; shot <= totalShots; shot++) {
      setCurrentShotNumber(shot)

      // Chạy đếm ngược cho mỗi bức ảnh
      for (let c = countdownSeconds; c >= 1; c--) {
        setCurrentCountdown(c)
        await new Promise((r) => setTimeout(r, 1000))
      }

      // Flash & Chụp
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 450)

      const photoDataUrl = grabVideoFrame()
      const timestamp = Date.now()
      const photoPath = photoDataUrl || `photo_${timestamp}_${shot}.jpg`

      addPhoto({
        id: `photo_${timestamp}_${shot}`,
        rawPath: photoPath,
        enhancedPath: photoPath,
        compositedPath: photoPath,
        timestamp,
      })

      // Cập nhật thumbnail dải slot trực tiếp
      setCapturedThumbnails((prev) => [...prev, photoPath])

      // Nghỉ 1.5s giữa các lần chụp để khách đổi dáng
      if (shot < totalShots) {
        await new Promise((r) => setTimeout(r, 1600))
      }
    }

    // 2. Dừng ghi timelapse và lưu file video
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!mediaRecorder) return resolve()
        mediaRecorder.onstop = () => {
          try {
            const blob = new Blob(recordedChunks, { type: 'video/webm' })
            const videoUrl = URL.createObjectURL(blob)
            setTimelapseUrl(videoUrl)
          } catch (err) {
            console.warn('Error creating timelapse blob:', err)
          }
          resolve()
        }
        mediaRecorder.stop()
      })
    }

    // 3. Đồng bộ link Google Drive (Mock / Cloud Folder) nếu được bật
    if (eventConfig.gdriveEnabled) {
      const folderLink =
        eventConfig.gdriveFolderUrl ||
        `https://drive.google.com/drive/folders/${eventConfig.gdriveFolderId || 'JoyBooth_Demo'}`
      setGdriveUrl(folderLink)
    }

    setIsCapturingSequence(false)
    // Chuyển sang màn hình Chọn Chủ Đề (Themes)
    setTimeout(() => {
      setScreen('select-theme')
    }, 800)
  }

  // Helper vẽ thumbnail sơ đồ khung lưới (Khung lưới miniature)
  function renderLayoutMiniPreview(item: GridLayoutItem) {
    if (item.previewType === '1_single') {
      return (
        <div style={{ width: '85%', height: '85%', background: '#a3989c', borderRadius: 4 }} />
      )
    }
    if (item.previewType === '3_strip') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '45%', height: '100%' }}>
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
        </div>
      )
    }
    if (item.previewType === '4_strip') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, width: '38%', height: '100%' }}>
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
          <div className="slot-rect" style={{ flex: 1, width: '100%' }} />
        </div>
      )
    }
    if (item.previewType === '4_grid') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, width: '80%', height: '80%' }}>
          <div className="slot-rect" style={{ width: '100%', height: '100%' }} />
          <div className="slot-rect" style={{ width: '100%', height: '100%' }} />
          <div className="slot-rect" style={{ width: '100%', height: '100%' }} />
          <div className="slot-rect" style={{ width: '100%', height: '100%' }} />
        </div>
      )
    }
    if (item.previewType === '6_grid') {
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5, width: '80%', height: '90%' }}>
          <div className="slot-rect" />
          <div className="slot-rect" />
          <div className="slot-rect" />
          <div className="slot-rect" />
          <div className="slot-rect" />
          <div className="slot-rect" />
        </div>
      )
    }
    // 8 ảnh
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, width: '80%', height: '95%' }}>
        <div className="slot-rect" />
        <div className="slot-rect" />
        <div className="slot-rect" />
        <div className="slot-rect" />
        <div className="slot-rect" />
        <div className="slot-rect" />
        <div className="slot-rect" />
        <div className="slot-rect" />
      </div>
    )
  }

  return (
    <div className="capture-screen-pastel" id="capture-screen">
      {/* Screen Flash Animation */}
      {showFlash && <div className="screen-flash" />}

      {/* ── Top Bar: Countdown Selectors (3s, 5s, 10s) ── */}
      <header className="capture-top-bar">
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

        {/* Right utility options */}
        <div className="top-utility-actions">
          {availableCameras.length > 0 && (
            <select
              className="utility-pill-btn"
              value={selectedCameraId || ''}
              onChange={(e) => {
                selectCamera(e.target.value)
                startCamera(e.target.value)
              }}
              style={{ maxWidth: 170 }}
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
        {/* Left Floating Dock */}
        <aside className="left-sidebar-dock">
          {/* Nút 1: Khung lưới */}
          <button
            className={`dock-btn ${activeFlyout === 'layout' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'layout' ? null : 'layout')}
          >
            <span className="dock-icon">📑</span>
            <span className="dock-label">Khung lưới</span>
          </button>

          {/* Nút 2: Bộ lọc */}
          <button
            className={`dock-btn ${activeFlyout === 'filter' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'filter' ? null : 'filter')}
          >
            <span className="dock-icon">🫧</span>
            <span className="dock-label">Bộ lọc</span>
          </button>

          {/* Nút 3: Phát sáng */}
          <button
            className={`dock-btn ${activeFlyout === 'lighting' ? 'active' : ''}`}
            onClick={() => setActiveFlyout(activeFlyout === 'lighting' ? null : 'lighting')}
          >
            <span className="dock-icon">💡</span>
            <span className="dock-label">Phát sáng</span>
          </button>
        </aside>

        {/* ── Flyout Modal Panel (Khung lưới) ── */}
        {activeFlyout === 'layout' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">Khung lưới</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content">
              <div className="layout-grid-presets">
                {Object.values(ALL_LAYOUTS).flat().map((layout: GridLayoutItem) => {
                  const isSelected = selectedLayout.id === layout.id
                  return (
                    <div
                      key={layout.id}
                      className={`layout-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectLayout(layout)}
                    >
                      <div className="layout-preview-box">
                        <div className="layout-slots-wrapper">
                          {renderLayoutMiniPreview(layout)}
                        </div>
                      </div>
                      <span className="layout-card-label">{layout.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Flyout Modal Panel (Bộ lọc màu) ── */}
        {activeFlyout === 'filter' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">Bộ lọc màu</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content" style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
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
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{filter.name}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-pink-primary)' }}>
                          {filter.tag}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Tinh chỉnh thông số nâng cao */}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-pink-primary)', textTransform: 'uppercase' }}>
                    🎛️ Tinh Chỉnh Ánh Sáng
                  </span>
                  {(brightnessAdjust !== 100 || contrastAdjust !== 100 || saturationAdjust !== 100) && (
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                      onClick={resetAdjustments}
                    >
                      Đặt lại
                    </button>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#666', marginBottom: 4 }}>
                    <span>Độ sáng (Brightness)</span>
                    <span style={{ fontWeight: 700 }}>{brightnessAdjust}%</span>
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

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#666', marginBottom: 4 }}>
                    <span>Tương phản (Contrast)</span>
                    <span style={{ fontWeight: 700 }}>{contrastAdjust}%</span>
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

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#666', marginBottom: 4 }}>
                    <span>Độ bão hòa (Saturation)</span>
                    <span style={{ fontWeight: 700 }}>{saturationAdjust}%</span>
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

        {/* ── Flyout Modal Panel (Phát sáng / Lighting) ── */}
        {activeFlyout === 'lighting' && (
          <div className="flyout-panel animate-pop">
            <div className="flyout-header">
              <span className="flyout-title">Đèn phát sáng (Ring Light)</span>
              <button className="flyout-close-btn" onClick={() => setActiveFlyout(null)}>
                ✕
              </button>
            </div>

            <div className="flyout-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Đèn sáng Photobooth:</span>
                <button
                  className="btn btn-pill-white"
                  style={{
                    padding: '6px 14px',
                    borderColor: ringLightEnabled ? 'var(--color-pink-primary)' : 'rgba(0,0,0,0.1)',
                    color: ringLightEnabled ? 'var(--color-pink-primary)' : '#555',
                  }}
                  onClick={() => setRingLightEnabled(!ringLightEnabled)}
                >
                  {ringLightEnabled ? '💡 Đang Bật' : 'Tắt'}
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>Cường độ phát sáng:</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-pink-primary)' }}>{ringLightLevel}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={ringLightLevel}
                  onChange={(e) => setRingLightLevel(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--color-pink-primary)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Center Camera Viewfinder Stage ── */}
        <div className="camera-viewfinder-wrapper">
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
          {eventConfig.timelapseEnabled && isCapturingSequence && (
            <div className="timelapse-recording-badge">
              <span className="rec-dot" />
              <span>REC TIMELAPSE</span>
            </div>
          )}

          {/* Sequential Multi-Shot Countdown */}
          {isCapturingSequence && (
            <div className="multi-shot-countdown-overlay">
              <span className="shot-step-badge">
                📸 Chụp ảnh {currentShotNumber} / {selectedLayout.photosCount}
              </span>
              <div className="countdown-digits">{currentCountdown}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Deck: Live Slots Progress (Image 5) + Shutter Button ── */}
      <footer className="capture-bottom-deck">
        {/* Live Slot Strip: [Photo 1] [Photo 2] [+] [+] with counter (e.g. 3/6) */}
        <div className="live-slots-deck">
          <div className="live-slots-list">
            {Array.from({ length: selectedLayout.photosCount }).map((_, index) => {
              const isFilled = index < capturedThumbnails.length
              const isCurrent = isCapturingSequence && index === capturedThumbnails.length

              return (
                <div
                  key={index}
                  className={`live-slot-thumb ${isFilled ? 'filled' : 'empty'} ${isCurrent ? 'current' : ''}`}
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
            {capturedThumbnails.length}/{selectedLayout.photosCount}
          </div>
        </div>

        <button
          className="start-capture-btn-pink"
          id="start-capture-button"
          disabled={isCapturingSequence}
          onClick={startCaptureSequence}
        >
          <span style={{ fontSize: '1.4rem' }}>📷</span>
          <span>{isCapturingSequence ? 'Đang Chụp Theo Chuỗi...' : 'Bắt đầu chụp'}</span>
        </button>
      </footer>
    </div>
  )
}
