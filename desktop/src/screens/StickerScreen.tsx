import { useState } from 'react'
import { useAppStore, STICKER_LIBRARY, type StickerCategory } from '../store/appStore'
import './StickerScreen.css'

export default function StickerScreen() {
  const {
    session,
    setScreen,
    selectedTheme,
    selectedLayout,
    eventConfig,
    placedStickers,
    addSticker,
    removeSticker,
    clearStickers,
  } = useAppStore()

  const categories: StickerCategory[] = ['Heart', 'Cute', 'Emoji', 'Event', 'Styles']
  const [activeCategory, setActiveCategory] = useState<StickerCategory>('Heart')

  const photos = session?.photos || []
  const displayedPhotos = photos.slice(0, selectedLayout.photosCount)
  const filteredStickers = STICKER_LIBRARY.filter((s) => s.category === activeCategory)
  const isGrid = selectedLayout.previewType === '4_grid' || selectedLayout.previewType === '6_grid' || selectedLayout.previewType === '8_grid'

  return (
    <div className="sticker-screen-container" id="sticker-select-screen">
      {/* Title */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">CHỌN STICKER</div>
      </div>

      <div className="sticker-main-split">
        {/* Left Side: Photo Strip with placed Stickers */}
        <div className="sticker-canvas-column">
          <div
            className="sticker-interactive-frame"
            style={{
              background: selectedTheme.bgGradient || selectedTheme.bgColor,
              borderColor: selectedTheme.borderColor,
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
                }}
                onClick={() => removeSticker(st.id)}
                title="Bấm để xóa sticker"
              >
                {st.icon}
              </div>
            ))}

            <div className={isGrid ? 'grid-preview-slots' : 'strip-preview-slots'}>
              {displayedPhotos.map((photo, index) => (
                <div key={photo.id || index} className="theme-slot-photo">
                  {photo.compositedPath ? (
                    <img src={photo.compositedPath} alt={`Photo ${index + 1}`} />
                  ) : (
                    <div style={{ color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      📸 Ảnh {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strip Branding Footer */}
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  letterSpacing: '1px',
                  color: selectedTheme.textColor,
                  textTransform: 'uppercase',
                }}
              >
                {eventConfig.eventName}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
            <span className="video-notice-text">* File video sẽ không hiển thị sticker</span>
            {placedStickers.length > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                onClick={clearStickers}
              >
                Xóa hết sticker ({placedStickers.length})
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Sticker Categories & Cards Grid */}
        <div className="sticker-selector-panel">
          <div className="sticker-tabs-nav">
            <button className="theme-nav-arrow" onClick={() => {
              const idx = categories.indexOf(activeCategory)
              setActiveCategory(categories[(idx - 1 + categories.length) % categories.length])
            }}>
              ‹
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                className={`sticker-tab-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}

            <button className="theme-nav-arrow" onClick={() => {
              const idx = categories.indexOf(activeCategory)
              setActiveCategory(categories[(idx + 1) % categories.length])
            }}>
              ›
            </button>
          </div>

          <div className="stickers-grid-cards">
            {filteredStickers.map((st) => (
              <div
                key={st.id}
                className="sticker-option-card"
                onClick={() => addSticker(st.icon)}
                title="Bấm để dán vào ảnh"
              >
                <span className="sticker-big-icon">{st.icon}</span>
                <span className="sticker-label-text">{st.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <footer className="sticker-bottom-bar">
        <button
          className="btn btn-pill-white"
          style={{ padding: '12px 28px', color: 'var(--color-dark-text)', borderColor: 'var(--color-border-pink)' }}
          onClick={() => setScreen('select-theme')}
        >
          ← Đổi Chủ Đề
        </button>

        <button
          className="btn btn-pink"
          style={{ padding: '14px 44px', fontSize: '1.15rem' }}
          onClick={() => setScreen('review')}
        >
          🎉 Tiếp Tục & In Ảnh
        </button>
      </footer>
    </div>
  )
}
