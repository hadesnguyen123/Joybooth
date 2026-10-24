import { useAppStore, THEME_OPTIONS, type ThemeItem } from '../store/appStore'
import { DEFAULT_EVENT_NAME } from '../lib/constants'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import './ThemeSelectScreen.css'

export default function ThemeSelectScreen() {
  const {
    session,
    setScreen,
    selectedTheme,
    selectTheme,
    selectedLayout,
    selectedFrameSize,
    eventConfig,
  } = useAppStore()

  const photos = session?.photos || []
  const displayedPhotos = photos.slice(0, selectedLayout.photosCount)
  const isGrid =
    selectedLayout.previewType === '4_grid' ||
    selectedLayout.previewType === '6_grid' ||
    selectedLayout.previewType === '8_grid'

  return (
    <div className="theme-screen-container" id="theme-select-screen">
      {/* ── Top Header: Single Left Back Arrow + Center Title ── */}
      <header className="theme-screen-header">
        <button
          className="screen-back-btn"
          onClick={() => setScreen('capture')}
          title="Quay lại chụp ảnh"
          aria-label="Quay lại"
        >
          <ArrowLeft size={28} strokeWidth={2} />
        </button>

        <div className="theme-header-center">
          <h1 className="theme-header-title">Chọn Frame</h1>
          <p className="theme-header-subtitle">Chọn mẫu khung viền cho dải ảnh của bạn</p>
        </div>

        <div className="header-placeholder" />
      </header>

      {/* ── Main Split: Fixed Strip Preview (Left) + Frame Options (Right) ── */}
      <div className="theme-main-split">
        {/* Left Side: CỐ ĐỊNH KÍCH THƯỚC DẢI STRIP PREVIEW */}
        <div className="strip-preview-fixed-column">
          <div
            className={`strip-preview-fixed-frame ${selectedFrameSize === '2x6' ? 'frame-size-2x6' : 'frame-size-4x6'}`}
            style={{
              background: selectedTheme.bgGradient || selectedTheme.bgColor,
              borderColor: selectedTheme.borderColor,
            }}
          >
            <div className={isGrid ? 'grid-preview-slots' : 'strip-preview-slots'}>
              {displayedPhotos.map((photo, index) => (
                <div key={photo.id || index} className="theme-slot-photo">
                  {photo.compositedPath ? (
                    <img src={photo.compositedPath} alt={`Photo ${index + 1}`} />
                  ) : (
                    <div className="theme-slot-placeholder">
                      📸 Ảnh {index + 1}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Strip Branding Footer */}
            <div className="strip-branding-footer">
              <span
                style={{
                  color: selectedTheme.textColor,
                }}
              >
                {eventConfig.eventName || DEFAULT_EVENT_NAME}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: 1-2 Frame Mặc Định (Tối giản, Sang trọng) */}
        <div className="frame-selector-panel">
          <div className="frame-selector-header">
            <span className="frame-selector-title">Mẫu Khung Khả Dụng</span>
            <span className="frame-selector-count">({THEME_OPTIONS.length} mẫu)</span>
          </div>

          <div className="frames-grid-cards">
            {THEME_OPTIONS.map((theme: ThemeItem) => {
              const isSelected = selectedTheme.id === theme.id
              return (
                <div
                  key={theme.id}
                  className={`frame-option-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => selectTheme(theme)}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className="frame-card-preview-thumb"
                    style={{
                      background: theme.bgGradient || theme.bgColor,
                      borderColor: theme.borderColor,
                    }}
                  >
                    <div className="frame-thumb-inner" />
                  </div>

                  <div className="frame-card-meta">
                    <span className="frame-card-name">{theme.name}</span>
                    <span className="frame-card-desc">
                      {theme.id.includes('white') ? 'Tinh khôi, thanh lịch' : 'Ấm áp, sang trọng'}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="frame-check-badge">
                      <Check size={20} strokeWidth={2.5} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar: Only Single Primary Action ── */}
      <footer className="theme-bottom-bar">
        <button
          className="btn-proceed-theme"
          onClick={() => setScreen('select-filter')}
        >
          <span>Tiếp Tục Chọn Bộ Lọc Màu</span>
          <ArrowRight size={22} strokeWidth={2.2} />
        </button>
      </footer>
    </div>
  )
}
