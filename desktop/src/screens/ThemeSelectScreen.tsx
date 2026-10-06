import { useState } from 'react'
import { useAppStore, THEME_OPTIONS, type ThemeCategory } from '../store/appStore'
import './ThemeSelectScreen.css'

export default function ThemeSelectScreen() {
  const {
    session,
    setScreen,
    selectedTheme,
    selectTheme,
    selectedLayout,
    eventConfig,
  } = useAppStore()

  const categories: ThemeCategory[] = ['Một màu', 'Khác', 'Ngày lễ', 'Thời trang', 'Trào lưu']
  const [activeCategory, setActiveCategory] = useState<ThemeCategory>('Một màu')

  const photos = session?.photos || []
  const displayedPhotos = photos.slice(0, selectedLayout.photosCount)

  const filteredThemes = THEME_OPTIONS.filter((t) => t.category === activeCategory)
  const isGrid = selectedLayout.previewType === '4_grid' || selectedLayout.previewType === '6_grid' || selectedLayout.previewType === '8_grid'

  return (
    <div className="theme-screen-container" id="theme-select-screen">
      {/* Title */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">CHỌN CHỦ ĐỀ</div>
      </div>

      <div className="theme-main-split">
        {/* Left Side: Live Strip Preview with Selected Theme */}
        <div className="theme-strip-preview-column">
          <div
            className="theme-composite-frame"
            style={{
              background: selectedTheme.bgGradient || selectedTheme.bgColor,
              borderColor: selectedTheme.borderColor,
            }}
          >
            {/* Top theme decor */}
            {selectedTheme.decorations && (
              <div style={{ fontSize: '1.2rem', display: 'flex', gap: 6, margin: '2px 0' }}>
                {selectedTheme.decorations.map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>
            )}

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
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  letterSpacing: '1px',
                  color: selectedTheme.textColor,
                  textTransform: 'uppercase',
                }}
              >
                {eventConfig.eventName}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Theme Category Tabs & Grid of Theme Cards */}
        <div className="theme-selector-panel">
          <div className="theme-category-nav">
            <button className="theme-nav-arrow" onClick={() => {
              const idx = categories.indexOf(activeCategory)
              setActiveCategory(categories[(idx - 1 + categories.length) % categories.length])
            }}>
              ‹
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                className={`theme-cat-pill ${activeCategory === cat ? 'active' : ''}`}
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

          <div className="themes-grid-cards">
            {filteredThemes.map((theme) => {
              const isSelected = selectedTheme.id === theme.id
              return (
                <div
                  key={theme.id}
                  className={`theme-card-item ${isSelected ? 'selected' : ''}`}
                  style={{ background: theme.bgGradient || theme.bgColor }}
                  onClick={() => selectTheme(theme)}
                >
                  <span className="theme-card-name" style={{ color: theme.textColor }}>
                    {theme.name}
                  </span>
                  {theme.decorations && (
                    <div className="theme-card-decor">
                      {theme.decorations.slice(0, 3).map((item, i) => (
                        <span key={i}>{item}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <footer className="theme-bottom-bar">
        <button
          className="btn btn-pill-white"
          style={{ padding: '12px 28px', color: 'var(--color-dark-text)', borderColor: 'var(--color-border-pink)' }}
          onClick={() => setScreen('capture')}
        >
          ← Chụp Lại
        </button>

        <button
          className="btn btn-pink"
          style={{ padding: '14px 44px', fontSize: '1.15rem' }}
          onClick={() => setScreen('select-sticker')}
        >
          ✨ Tiếp Tục Chọn Sticker
        </button>
      </footer>
    </div>
  )
}
