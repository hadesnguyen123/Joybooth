import { useAppStore, COLOR_FILTERS, type ColorFilterItem } from '../store/appStore'
import { DEFAULT_EVENT_NAME } from '../lib/constants'
import './FilterScreen.css'

export default function FilterScreen() {
  const {
    session,
    setScreen,
    selectedTheme,
    selectedLayout,
    eventConfig,
    selectedFilter,
    selectFilter,
  } = useAppStore()

  const photos = session?.photos || []
  const displayedPhotos = photos.slice(0, selectedLayout.photosCount)
  const isGrid =
    selectedLayout.previewType === '4_grid' ||
    selectedLayout.previewType === '6_grid' ||
    selectedLayout.previewType === '8_grid'

  return (
    <div className="filter-screen-container" id="filter-select-screen">
      {/* Title Banner */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">CHỌN BỘ LỌC MÀU HÀN QUỐC</div>
      </div>

      <div className="filter-main-split">
        {/* Left Side: Photo Strip Preview with dynamic filter applied */}
        <div className="filter-canvas-column">
          <div
            className="filter-interactive-frame"
            style={{
              background: selectedTheme.bgGradient || selectedTheme.bgColor,
              borderColor: selectedTheme.borderColor,
            }}
          >
            <div className={isGrid ? 'grid-preview-slots' : 'strip-preview-slots'}>
              {displayedPhotos.map((photo, index) => (
                <div key={photo.id || index} className="theme-slot-photo">
                  {photo.compositedPath || photo.enhancedPath || photo.rawPath ? (
                    <img
                      src={photo.compositedPath || photo.enhancedPath || photo.rawPath}
                      alt={`Photo ${index + 1}`}
                      draggable={false}
                      style={{
                        filter: selectedFilter.cssFilter,
                        transition: 'filter 0.25s ease',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                      }}
                    >
                      📸 Ảnh {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strip Branding Footer */}
            <div style={{ textAlign: 'center', marginTop: 4, pointerEvents: 'none' }}>
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
                {eventConfig.eventName || DEFAULT_EVENT_NAME}
              </span>
            </div>
          </div>

          {/* Quick guide hints */}
          <div className="filter-action-hints">
            <span className="filter-guide-text">
              ✨ <b>Chạm vào bộ lọc</b> bên phải để xem trước dải ảnh trực tiếp
            </span>
          </div>
        </div>

        {/* Right Side: Filter Selection Panel */}
        <div className="filter-selector-panel">
          <div className="filter-active-banner">
            <span>
              ✨ Đang dùng: <strong>{selectedFilter.name}</strong>
            </span>
            <span className="filter-active-tag">({selectedFilter.tag})</span>
          </div>

          <div className="filter-list-presets">
            {COLOR_FILTERS.map((filter: ColorFilterItem) => {
              const isSelected = selectedFilter.id === filter.id
              return (
                <div
                  key={filter.id}
                  className={`filter-preset-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectFilter(filter)}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className="filter-card-circle"
                    style={{ background: filter.previewColor }}
                  >
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

      {/* Bottom Bar */}
      <footer className="filter-bottom-bar">
        <button
          className="btn btn-pill-white"
          style={{
            padding: '12px 28px',
            color: 'var(--color-dark-text)',
            borderColor: 'var(--color-border-pink)',
          }}
          onClick={() => setScreen('select-theme')}
        >
          ← Đổi Chủ Đề
        </button>

        <button
          className="btn btn-pink"
          style={{ padding: '14px 44px', fontSize: '1.15rem' }}
          onClick={() => setScreen('review')}
        >
          🎉 Tiếp Tục & In Ảnh ➔
        </button>
      </footer>
    </div>
  )
}
