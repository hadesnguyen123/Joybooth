import { useAppStore, type CaptureMode } from '../store/appStore'
import './IdleScreen.css'

export default function IdleScreen() {
  const { setScreen, startNewSession, eventConfig, setCaptureMode } = useAppStore()

  function handleSelectMode(mode: CaptureMode) {
    setCaptureMode(mode)
    startNewSession()
    if (mode === 'selfbooth') {
      // Đối với Selfbooth: Vào thẳng màn hình chụp, mặc định không thanh toán trước
      setScreen('capture')
    } else {
      // Đối với Photobooth: Bắt đầu chọn Khung (2x6 vs 4x6) -> Bố cục -> Thanh toán -> Chụp
      setScreen('select-size')
    }
  }

  const selfboothMinutes = Math.round((eventConfig.selfboothDurationSeconds || 60) / 60)

  return (
    <div className="idle-screen" id="idle-screen">
      {/* Decorative background orbs */}
      <div className="idle-bg-orb idle-bg-orb--1" />
      <div className="idle-bg-orb idle-bg-orb--2" />
      <div className="idle-bg-orb idle-bg-orb--3" />

      {/* Floating decorative photo strips on sides */}
      <div className="idle-side-strip idle-side-strip--left">
        <div className="idle-strip-card">
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #ffd1dc, #fbcfe8)' }}>🌸</div>
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #fbcfe8, #f4729a)' }}>✨</div>
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #f4729a, #d94f78)' }}>💖</div>
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #d94f78, #b8325c)' }}>📸</div>
          <div className="idle-strip-footer">JOYBOOTH • 2026</div>
        </div>
      </div>

      <div className="idle-side-strip idle-side-strip--right">
        <div className="idle-strip-card">
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #bae6fd, #7dd3fc)' }}>🫧</div>
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #7dd3fc, #38bdf8)' }}>🎀</div>
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #fde047, #facc15)' }}>⭐️</div>
          <div className="idle-strip-photo" style={{ background: 'linear-gradient(135deg, #fed7aa, #fb923c)' }}>🧸</div>
          <div className="idle-strip-footer">PHOTO STUDIO</div>
        </div>
      </div>

      {/* Top Header with prominent Admin Button */}
      <header className="idle-top-header">
        <div className="idle-header-badge">
          <span>✨</span>
          <span>PHOTOBOOTH HÀN QUỐC CAO CẤP</span>
        </div>

        {/* Nút Quản Trị Hệ Thống rõ ràng ngay màn hình chính */}
        <button
          className="idle-admin-pill-btn"
          id="idle-admin-btn"
          onClick={(e) => {
            e.stopPropagation()
            setScreen('admin')
          }}
          title="Vào cài đặt hệ thống (PIN: 1234)"
        >
          <span className="admin-icon">⚙️</span>
          <span className="admin-text">Quản Trị Hệ Thống</span>
        </button>
      </header>

      {/* Center main attract content */}
      <div className="idle-content fade-in">
        {/* Brand & Event Title */}
        <div className="idle-logo">
          {eventConfig.eventLogo ? (
            <img src={eventConfig.eventLogo} alt="Event Logo" />
          ) : (
            <h1 className="idle-logo-title">JoyBooth</h1>
          )}
        </div>

        <p className="idle-event-subtitle">
          {eventConfig.eventName || 'FUN STUDIO PHOTOBOOTH'}
        </p>

        <p className="idle-mode-prompt">
          Chạm vào 1 trong 2 chế độ chụp bên dưới để bắt đầu:
        </p>

        {/* ── 2 Chế Độ Chụp Tại Màn Hình Chính ── */}
        <div className="idle-modes-container">
          {/* Chế độ 1: PHOTOBOOTH CỔ ĐIỂN */}
          <div
            className="idle-mode-card card-photobooth"
            id="mode-photobooth-card"
            onClick={() => handleSelectMode('photobooth')}
          >
            <div className="mode-card-badge badge-photobooth">
              <span>⭐️</span>
              <span>PHỔ BIẾN NHẤT</span>
            </div>

            <div className="mode-card-icon">📸</div>

            <h2 className="mode-card-title">Photobooth Cổ Điển</h2>
            <p className="mode-card-subtitle">
              Chụp lần lượt theo số ô khung hình
            </p>

            <ul className="mode-card-features">
              <li>✨ Hỗ trợ chụp dải Strip 2x6 & Postcard 4x6</li>
              <li>🔄 Cho phép xóa ảnh chưa đẹp để chụp lại (Retake)</li>
              <li>🎨 Tự chọn theme viền và sticker dễ thương</li>
            </ul>

            <div className="mode-card-action btn-action-photobooth">
              <span>Bắt Đầu Chụp Photobooth</span>
              <span className="action-arrow">➔</span>
            </div>
          </div>

          {/* Chế độ 2: SELFBOOTH HÀN QUỐC */}
          <div
            className="idle-mode-card card-selfbooth"
            id="mode-selfbooth-card"
            onClick={() => handleSelectMode('selfbooth')}
          >
            <div className="mode-card-badge badge-selfbooth">
              <span>🔥</span>
              <span>HOT TREND K-STUDIO</span>
            </div>

            <div className="mode-card-icon">⏱️</div>

            <h2 className="mode-card-title">Selfbooth Tự Do</h2>
            <p className="mode-card-subtitle">
              Chụp không giới hạn trong {selfboothMinutes} phút
            </p>

            <ul className="mode-card-features">
              <li>⏱️ Thả ga tạo dáng bấm chụp liên tục trong {eventConfig.selfboothDurationSeconds || 60}s</li>
              <li>🖼️ Tự tay chọn các bức ảnh đẹp nhất đưa vào khung</li>
              <li>☁️ Tự động tạo thư mục và đẩy lên Google Drive</li>
            </ul>

            <div className="mode-card-action btn-action-selfbooth">
              <span>Bắt Đầu Chụp Selfbooth</span>
              <span className="action-arrow">➔</span>
            </div>
          </div>
        </div>

        {/* Features row */}
        <div className="idle-features-row">
          <div className="idle-feature-item">
            <span className="idle-feat-icon">🎞️</span>
            <span>Khung Strip & Grid</span>
          </div>
          <div className="idle-feature-dot">•</div>
          <div className="idle-feature-item">
            <span className="idle-feat-icon">🫧</span>
            <span>Làn Da K-Beauty</span>
          </div>
          <div className="idle-feature-dot">•</div>
          <div className="idle-feature-item">
            <span className="idle-feat-icon">⚡</span>
            <span>In Nhiệt Lấy Ngay</span>
          </div>
          <div className="idle-feature-dot">•</div>
          <div className="idle-feature-item">
            <span className="idle-feat-icon">📲</span>
            <span>Google Drive QR Tức Thì</span>
          </div>
        </div>
      </div>
    </div>
  )
}
