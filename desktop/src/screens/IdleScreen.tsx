import { useAppStore } from '../store/appStore'
import './IdleScreen.css'

/**
 * IdleScreen — Màn hình chờ / Attract screen
 * Hiện khi không có khách. Click bất kỳ để vào màn hình chụp.
 *
 * 🔴 REVIEW NEEDED: Cần thiết kế UI thực tế từ bạn
 *    - Logo/brand của event hiển thị ở đâu?
 *    - Có slideshow ảnh không? (ảnh mẫu từ sự kiện trước)
 *    - Animation/motion như thế nào?
 *    - Text "Chạm để bắt đầu" vị trí và style?
 */
export default function IdleScreen() {
  const { setScreen, startNewSession, eventConfig } = useAppStore()

  function handleStart() {
    startNewSession()
    setScreen('select-size')
  }

  return (
    <div className="idle-screen" onClick={handleStart} id="idle-screen">
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

      {/* Center main attract content */}
      <div className="idle-content fade-in">
        {/* Logo & Brand badge */}
        <div className="idle-badge-pill">
          <span>✨</span>
          <span>PHOTOBOOTH HÀN QUỐC CAO CẤP</span>
          <span>✨</span>
        </div>

        <div className="idle-logo">
          {eventConfig.eventLogo ? (
            <img src={eventConfig.eventLogo} alt="Event Logo" />
          ) : (
            <h1 className="idle-logo-title">JoyBooth</h1>
          )}
        </div>

        {/* Event name */}
        <p className="idle-event-subtitle">
          {eventConfig.eventName || 'FUN STUDIO PHOTOBOOTH'}
        </p>

        {/* CTA Button */}
        <div className="idle-cta-container">
          <div className="idle-cta-button">
            <span className="idle-cta-dot" />
            <span className="idle-cta-text">CHẠM ĐỂ BẮT ĐẦU</span>
            <span className="idle-cta-sparkle">📸</span>
          </div>
          <p className="idle-cta-hint">Nhấp bất kỳ vị trí nào trên màn hình</p>
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
            <span>Filter Da Sáng</span>
          </div>
          <div className="idle-feature-dot">•</div>
          <div className="idle-feature-item">
            <span className="idle-feat-icon">⚡</span>
            <span>In Lấy Ngay</span>
          </div>
          <div className="idle-feature-dot">•</div>
          <div className="idle-feature-item">
            <span className="idle-feat-icon">📲</span>
            <span>Mã QR Tải Ảnh</span>
          </div>
        </div>
      </div>

      {/* Admin trigger — hidden corner button */}
      <button
        className="idle-admin-trigger"
        id="idle-admin-btn"
        onClick={(e) => {
          e.stopPropagation()
          setScreen('admin')
        }}
        title="Quản trị"
      >
        ⚙️
      </button>
    </div>
  )
}
