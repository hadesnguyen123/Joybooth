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
      {/* Decorative background */}
      <div className="idle-bg-orb idle-bg-orb--1" />
      <div className="idle-bg-orb idle-bg-orb--2" />

      <div className="idle-content fade-in">
        {/* Logo */}
        <div className="idle-logo">
          {eventConfig.eventLogo
            ? <img src={eventConfig.eventLogo} alt="Event Logo" />
            : <div className="idle-logo-placeholder text-display">JoyBooth</div>
          }
        </div>

        {/* Event name */}
        <h1 className="idle-event-name text-display text-gold">
          {eventConfig.eventName}
        </h1>

        {/* CTA */}
        <div className="idle-cta">
          <div className="idle-cta-dot pulse-glow" />
          <p className="idle-cta-text">Chạm để bắt đầu</p>
        </div>
      </div>

      {/* Admin trigger — hidden corner button */}
      <button
        className="idle-admin-trigger"
        id="idle-admin-btn"
        onClick={(e) => { e.stopPropagation(); setScreen('admin') }}
        title="Admin"
      >
        ⚙
      </button>
    </div>
  )
}
