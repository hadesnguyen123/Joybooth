import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { joyBoothApi, isBrowser, mockApi } from '../lib/api'
import { generateStripComposite } from '../lib/canvasCompositor'
import QRCode from 'qrcode'
import './ReviewScreen.css'

export default function ReviewScreen() {
  const {
    session,
    setScreen,
    clearSession,
    eventConfig,
    selectedLayout,
    selectedFilter,
    selectedTheme,
    placedStickers,
    selectedFrameSize,
  } = useAppStore()

  const [activeMediaView, setActiveMediaView] = useState<'strip' | 'timelapse'>('strip')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [printCopies, setPrintCopies] = useState<number>(1)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)
  const [printSuccess, setPrintSuccess] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(eventConfig.idleTimeoutSeconds || 60)
  const [compositeStripUrl, setCompositeStripUrl] = useState<string>('')
  const [isGeneratingComposite, setIsGeneratingComposite] = useState<boolean>(true)

  const photos = session?.photos && session.photos.length > 0 ? session.photos : [
    { id: '1', rawPath: '', enhancedPath: '', compositedPath: '', timestamp: 1 },
    { id: '2', rawPath: '', enhancedPath: '', compositedPath: '', timestamp: 2 },
    { id: '3', rawPath: '', enhancedPath: '', compositedPath: '', timestamp: 3 },
    { id: '4', rawPath: '', enhancedPath: '', compositedPath: '', timestamp: 4 },
  ]

  // Link đích của mã QR: Google Drive hoặc Local Gallery
  const targetCloudUrl =
    eventConfig.gdriveEnabled && session?.gdriveUrl
      ? session.gdriveUrl
      : `https://joybooth.vn/gallery/${session?.sessionId || 'demo'}`

  // Tạo mã QR Code
  useEffect(() => {
    QRCode.toDataURL(targetCloudUrl, {
      margin: 1,
      width: 260,
      color: { dark: '#2d2426', light: '#ffffff' },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err))
  }, [targetCloudUrl])

  // Sinh bản ghép canvas composite chất lượng cao
  useEffect(() => {
    let isMounted = true
    async function makeComposite() {
      try {
        setIsGeneratingComposite(true)
        const photoUrls = photos.map((p) => p.compositedPath || p.enhancedPath || p.rawPath).filter(Boolean)
        const stripUrl = await generateStripComposite({
          photos: photoUrls,
          frameSize: selectedFrameSize,
          layout: selectedLayout,
          theme: selectedTheme,
          stickers: placedStickers,
          filter: selectedFilter,
          eventName: eventConfig.eventName,
          eventDate: eventConfig.date,
        })
        if (isMounted) {
          setCompositeStripUrl(stripUrl)
          setIsGeneratingComposite(false)

          // Tự động lưu dải ảnh đã hoàn thiện vào thư mục Downloads của máy tính
          if (stripUrl && stripUrl.startsWith('data:image')) {
            const fileName = `joybooth_final_${selectedFrameSize}_${Date.now()}.jpg`
            const api = isBrowser ? mockApi : joyBoothApi
            api.storage.savePhoto(stripUrl, fileName).catch((e) => console.warn('Auto-save strip error:', e))
          }
        }
      } catch (err) {
        console.error('Failed to generate strip composite canvas:', err)
        if (isMounted) setIsGeneratingComposite(false)
      }
    }

    makeComposite()
    return () => {
      isMounted = false
    }
  }, [photos, selectedFrameSize, selectedLayout, selectedTheme, placedStickers, selectedFilter, eventConfig])

  // Tự động đếm ngược
  useEffect(() => {
    if (timeLeft <= 0) {
      clearSession()
      setScreen('idle')
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, clearSession, setScreen])

  function handleFinish() {
    clearSession()
    setScreen('idle')
  }

  async function handlePrint() {
    if (isPrinting) return
    setIsPrinting(true)
    setPrintSuccess(false)

    try {
      const api = isBrowser ? mockApi : joyBoothApi
      const pathToPrint = compositeStripUrl || photos[0]?.compositedPath || ''
      await api.print.send(pathToPrint, printCopies)
      setTimeout(() => {
        setIsPrinting(false)
        setPrintSuccess(true)
      }, 1500)
    } catch (err) {
      console.error('Print failed:', err)
      setIsPrinting(false)
    }
  }

  function handleDownloadStrip() {
    if (!compositeStripUrl) return
    const a = document.createElement('a')
    a.href = compositeStripUrl
    a.download = `joybooth_${selectedFrameSize}_${Date.now()}.jpg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function handleDownloadTimelapse() {
    if (!session?.timelapseUrl) return
    const a = document.createElement('a')
    a.href = session.timelapseUrl
    a.download = `joybooth_timelapse_${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const isGrid =
    selectedLayout.previewType === '4_grid' ||
    selectedLayout.previewType === '6_grid' ||
    selectedLayout.previewType === '8_grid'

  return (
    <div className="review-screen-pastel" id="review-screen">
      {/* Header */}
      <header className="review-header-pastel">
        <div className="review-brand-title">
          <span>🌸</span>
          <span>Dải Ảnh & Video Photobooth</span>
        </div>
        <div className="review-timer-capsule">
          <span>⏳</span>
          <span>Tự động quay về sau: <strong>{timeLeft}s</strong></span>
        </div>
      </header>

      {/* Main 2-Column Content */}
      <main className="review-content-pastel">
        {/* Left: Photobooth Strip Frame & Timelapse Media View */}
        <section className="strip-frame-container">
          {/* Media View Mode Selector */}
          <div className="review-media-tabs">
            <button
              className={`review-media-tab-btn ${activeMediaView === 'strip' ? 'active' : ''}`}
              onClick={() => setActiveMediaView('strip')}
            >
              📸 Dải Ảnh ({selectedFrameSize.toUpperCase()})
            </button>
            <button
              className={`review-media-tab-btn ${activeMediaView === 'timelapse' ? 'active' : ''}`}
              onClick={() => setActiveMediaView('timelapse')}
            >
              🎬 Video Timelapse ({eventConfig.timelapseSpeed || 2.5}x)
            </button>
          </div>

          {activeMediaView === 'strip' ? (
            <div
              className="photobooth-strip-card"
              style={{
                background: selectedTheme.bgGradient || selectedTheme.bgColor,
                borderColor: selectedTheme.borderColor,
                position: 'relative',
              }}
            >
              {/* Render placed stickers */}
              {placedStickers.map((st) => (
                <div
                  key={st.id}
                  className="placed-sticker-element"
                  style={{
                    left: `${st.x}%`,
                    top: `${st.y}%`,
                    transform: `rotate(${st.rotation}deg)`,
                    pointerEvents: 'none',
                  }}
                >
                  {st.icon}
                </div>
              ))}

              <div className={isGrid ? 'strip-slots-grid' : 'strip-slots-vertical'}>
                {photos.slice(0, selectedLayout.photosCount).map((p, idx) => (
                  <div key={p.id || idx} className="strip-photo-item">
                    {p.compositedPath ? (
                      <img
                        src={p.compositedPath}
                        alt={`Photobooth Shot ${idx + 1}`}
                        className="strip-photo-img"
                      />
                    ) : (
                      <div style={{ color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.85rem' }}>
                        📸 Ảnh {idx + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Strip Footer Branding */}
              <div className="strip-footer-badge" style={{ color: selectedTheme.textColor }}>
                <span className="strip-footer-text" style={{ color: selectedTheme.textColor }}>
                  {eventConfig.eventName}
                </span>
                <span className="strip-date-text" style={{ color: selectedTheme.textColor, opacity: 0.85 }}>
                  {eventConfig.date} • {selectedFilter.name}
                </span>
              </div>
            </div>
          ) : (
            <div className="timelapse-preview-card">
              {session?.timelapseUrl ? (
                <div className="timelapse-video-container">
                  <video
                    src={session.timelapseUrl}
                    autoPlay
                    loop
                    playsInline
                    controls
                    className="timelapse-video-element"
                    ref={(el) => {
                      if (el) el.playbackRate = eventConfig.timelapseSpeed || 2.5
                    }}
                  />
                  <div className="timelapse-meta-bar">
                    <span>⚡ Tua nhanh: {eventConfig.timelapseSpeed || 2.5}x</span>
                    <span>🎥 1 Camera Đa Nhiệm (Stream + Capture)</span>
                  </div>
                  <button
                    className="download-strip-btn"
                    style={{ marginTop: 12, width: '100%' }}
                    onClick={handleDownloadTimelapse}
                  >
                    🎬 Tải Video Timelapse Về Máy (.webm)
                  </button>
                </div>
              ) : (
                <div className="timelapse-empty-state">
                  <span style={{ fontSize: '3.5rem' }}>🎬</span>
                  <h3 style={{ margin: '10px 0 6px', color: 'var(--color-pink-primary)' }}>
                    Video Timelapse Hậu Trường
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.5, textAlign: 'center', maxWidth: 300 }}>
                    Camera vừa quay luồng trực tiếp vừa chụp ảnh đồng thời. Hãy bật tính năng trong menu Quản Trị để tự động xuất video mỗi phiên chụp!
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: Instant QR & Print */}
        <section className="review-delivery-deck">
          {/* Card QR Tải Ảnh & Cloud */}
          <div className="delivery-card-pastel">
            <div className="card-title-pastel">
              <span>{eventConfig.gdriveEnabled ? '📁' : '📱'}</span>
              <span>
                {eventConfig.gdriveEnabled
                  ? 'Quét QR Mở Google Drive (Ảnh + Strip + Timelapse)'
                  : 'Quét QR Tải Toàn Bộ Ảnh & Dải Strip'}
              </span>
            </div>
            <div className="qr-row">
              <div className="qr-box-pastel">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code tải ảnh" />
                ) : (
                  <span>Tạo mã QR...</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <p className="qr-guide-text">
                  {eventConfig.gdriveEnabled
                    ? 'Mở Camera iPhone/Android hoặc Zalo để mở thư mục Google Drive chứa ảnh gốc, dải strip và video timelapse.'
                    : 'Mở Camera iPhone/Android hoặc Zalo để quét và lưu ảnh gốc về điện thoại tức thì.'}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                  <span className="cloud-sync-badge">
                    {eventConfig.gdriveEnabled ? '☁️ Đã đồng bộ Google Drive' : '⚡ Tải trực tiếp'}
                  </span>
                </div>

                <p className="qr-subguide">Khổ in: {selectedFrameSize.toUpperCase()} • Bộ lọc: {selectedFilter.name}</p>
                
                {compositeStripUrl && (
                  <button
                    className="download-strip-btn"
                    onClick={handleDownloadStrip}
                    style={{ marginTop: 10 }}
                  >
                    💾 Tải Dải Strip Về Máy ({selectedFrameSize.toUpperCase()})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card In Ảnh */}
          <div className="delivery-card-pastel">
            <div className="card-title-pastel">
              <span>🖨️</span>
              <span>In Ảnh Nhiệt Lấy Liền (Dye-Sub)</span>
            </div>

            <div className="print-copies-row">
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Số lượng bản in:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  className="copies-btn-pastel"
                  onClick={() => setPrintCopies((c) => Math.max(1, c - 1))}
                  disabled={printCopies <= 1}
                >
                  -
                </button>
                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{printCopies}</span>
                <button
                  className="copies-btn-pastel"
                  onClick={() => setPrintCopies((c) => Math.min(eventConfig.printCopies || 4, c + 1))}
                  disabled={printCopies >= (eventConfig.printCopies || 4)}
                >
                  +
                </button>
              </div>
            </div>

            <button
              className="print-btn-pastel"
              id="print-button"
              disabled={isPrinting || isGeneratingComposite}
              onClick={handlePrint}
            >
              {isPrinting ? (
                <>⏳ Đang gửi lệnh in ({printCopies} bản)...</>
              ) : printSuccess ? (
                <>✅ Đã gửi lệnh in! Vui lòng nhận ảnh tại khe in</>
              ) : (
                <>🖨️ In {printCopies} Bản Ngay</>
              )}
            </button>
          </div>
        </section>
      </main>

      {/* Bottom Bar */}
      <footer className="review-bottom-bar-pastel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-pill-white"
            style={{ padding: '12px 20px', color: 'var(--color-dark-text)', borderColor: 'var(--color-border-pink)' }}
            onClick={() => setScreen('select-sticker')}
          >
            ← Sửa Sticker
          </button>
          <button
            className="btn btn-pill-white"
            style={{ padding: '12px 20px', color: 'var(--color-dark-text)', borderColor: 'var(--color-border-pink)' }}
            onClick={() => setScreen('select-theme')}
          >
            🎨 Đổi Theme
          </button>
          <button
            className="btn btn-pill-white"
            style={{ padding: '12px 20px', color: 'var(--color-dark-text)', borderColor: 'var(--color-border-pink)' }}
            onClick={() => setScreen('capture')}
          >
            📸 Chụp Lại
          </button>
        </div>

        <button
          className="btn btn-pink"
          id="finish-button"
          style={{ padding: '14px 40px', fontSize: '1.1rem' }}
          onClick={handleFinish}
        >
          ✅ Hoàn Tất & Về Trang Đầu
        </button>
      </footer>
    </div>
  )
}
