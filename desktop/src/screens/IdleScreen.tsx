import { useAppStore, type CaptureMode } from '../store/appStore'
import {
  BRAND_NAME,
  DEFAULT_EVENT_NAME,
  DEFAULT_ADMIN_PIN,
} from '../lib/constants'
import { Settings, ArrowRight } from 'lucide-react'
import './IdleScreen.css'

export default function IdleScreen() {
  const { setScreen, startNewSession, eventConfig, setCaptureMode } = useAppStore()

  function handleSelectMode(mode: CaptureMode) {
    setCaptureMode(mode)
    startNewSession()
    if (mode === 'selfbooth') {
      // Selfbooth: Vào thẳng màn hình chụp tự do
      setScreen('capture')
    } else {
      // Photobooth: Bắt đầu chọn Khung (2x6 vs 4x6) -> Bố cục -> Thanh toán -> Chụp
      setScreen('select-size')
    }
  }

  return (
    <div className="idle-screen" id="idle-screen">
      {/* Top Header: Discreet, refined Admin access (Icon-only) */}
      <header className="idle-header">
        <div className="idle-header-spacer" />
        <button
          className="idle-admin-btn"
          id="idle-admin-btn"
          onClick={(e) => {
            e.stopPropagation()
            setScreen('admin')
          }}
          title={`Quản trị hệ thống (PIN: ${eventConfig.adminPin || DEFAULT_ADMIN_PIN})`}
          aria-label="Cài đặt hệ thống"
        >
          <Settings size={24} strokeWidth={1.8} />
        </button>
      </header>

      {/* Main Focus: Editorial Brand + Dual Experience Selection */}
      <main className="idle-main">
        {/* Brand Presentation */}
        <div className="idle-brand">
          {eventConfig.eventLogo ? (
            <img src={eventConfig.eventLogo} alt="Event Logo" className="idle-logo-img" />
          ) : (
            <h1 className="idle-brand-title">{BRAND_NAME}</h1>
          )}
          <p className="idle-brand-subtitle">
            {eventConfig.eventName || DEFAULT_EVENT_NAME}
          </p>
          <p className="idle-prompt">Chạm để chọn trải nghiệm chụp</p>
        </div>

        {/* ── Principle 2 & 3: Touch & Remote First — One Screen, One Action ── */}
        <div className="idle-modes" role="group" aria-label="Lựa chọn chế độ chụp">
          {/* Card 1: PHOTOBOOTH */}
          <div
            className="idle-mode-card card-photobooth"
            id="mode-photobooth-card"
            role="button"
            tabIndex={0}
            aria-label="Chọn Photobooth - Khung Strip và in ảnh lấy ngay"
            onClick={() => handleSelectMode('photobooth')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelectMode('photobooth')
              }
            }}
          >
            {/* Visual Over Text: Elegant Dual Strip Graphic */}
            <div className="mode-card-visual" aria-hidden="true">
              <svg width="130" height="130" viewBox="0 0 130 130" fill="none" className="visual-svg">
                {/* Background strip (slightly tilted left) */}
                <g transform="rotate(-6 52 65)">
                  <rect x="24" y="10" width="48" height="110" rx="8" fill="#F4ECE4" stroke="#D8C7B8" strokeWidth="1.5" />
                  <rect x="29" y="16" width="38" height="26" rx="4" fill="#E8DDD3" />
                  <rect x="29" y="46" width="38" height="26" rx="4" fill="#E8DDD3" />
                  <rect x="29" y="76" width="38" height="26" rx="4" fill="#E8DDD3" />
                  <circle cx="48" cy="111" r="2.5" fill="#C8B2A4" />
                </g>
                {/* Foreground strip (slightly tilted right) */}
                <g transform="rotate(4 75 65)">
                  <rect x="52" y="10" width="50" height="110" rx="8" fill="#FFFFFF" stroke="#502A1D" strokeWidth="2" />
                  <rect x="57" y="16" width="40" height="26" rx="4" fill="#F7F2EB" />
                  <rect x="57" y="46" width="40" height="26" rx="4" fill="#FAF6F1" />
                  <rect x="57" y="76" width="40" height="26" rx="4" fill="#F7F2EB" />
                  {/* Subtle portrait silhouette in center frame */}
                  <circle cx="77" cy="56" r="4.5" fill="#D8C7B8" />
                  <path d="M70 67 C70 62 84 62 84 67" fill="#D8C7B8" />
                  {/* Footer brand mark */}
                  <rect x="67" y="109" width="20" height="3" rx="1.5" fill="#502A1D" opacity="0.6" />
                </g>
              </svg>
            </div>

            <div className="mode-card-info">
              <h2 className="mode-card-title">PHOTOBOOTH</h2>
              <p className="mode-card-caption">Khung Strip & In Lấy Ngay</p>
            </div>

            <div className="mode-card-btn mode-card-btn--primary">
              <span>BẮT ĐẦU</span>
              <ArrowRight size={20} strokeWidth={2.2} />
            </div>
          </div>

          {/* Card 2: SELFBOOTH */}
          <div
            className="idle-mode-card card-selfbooth"
            id="mode-selfbooth-card"
            role="button"
            tabIndex={0}
            aria-label="Chọn Selfbooth - Chụp tự do với Remote"
            onClick={() => handleSelectMode('selfbooth')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleSelectMode('selfbooth')
              }
            }}
          >
            {/* Visual Over Text: Camera Shutter & Wireless Remote Graphic */}
            <div className="mode-card-visual" aria-hidden="true">
              <svg width="130" height="130" viewBox="0 0 130 130" fill="none" className="visual-svg">
                {/* Outer studio lens ring */}
                <circle cx="58" cy="65" r="46" stroke="#C8B2A4" strokeWidth="2" strokeDasharray="3 4" opacity="0.7" />
                <circle cx="58" cy="65" r="38" fill="#FBF8F4" stroke="#502A1D" strokeWidth="2" />
                <circle cx="58" cy="65" r="26" fill="#F0E6DC" stroke="#78452F" strokeWidth="1.5" />
                {/* Lens glass reflections */}
                <circle cx="58" cy="65" r="14" fill="#502A1D" />
                <circle cx="54" cy="61" r="4" fill="#FFFFFF" opacity="0.75" />
                {/* Wireless Remote Trigger */}
                <g transform="translate(14, 0)">
                  <rect x="76" y="38" width="28" height="54" rx="14" fill="#502A1D" stroke="#FAF6F1" strokeWidth="2" />
                  <circle cx="90" cy="53" r="6" fill="#FFFFFF" />
                  {/* Signal wave arcs */}
                  <path d="M107 46 A14 14 0 0 1 107 68" stroke="#A66A43" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M112 40 A22 22 0 0 1 112 74" stroke="#A66A43" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                </g>
              </svg>
            </div>

            <div className="mode-card-info">
              <h2 className="mode-card-title">SELFBOOTH</h2>
              <p className="mode-card-caption">Tự Do Chụp Với Remote</p>
            </div>

            <div className="mode-card-btn mode-card-btn--secondary">
              <span>BẮT ĐẦU</span>
              <ArrowRight size={20} strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </main>

      {/* Subtle bottom aesthetic anchor */}
      <footer className="idle-footer">
        <div className="idle-footer-line" />
      </footer>
    </div>
  )
}
