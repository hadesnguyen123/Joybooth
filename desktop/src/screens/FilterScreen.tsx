import { useAppStore, COLOR_FILTERS, type ColorFilterItem } from '../store/appStore'
import { DEFAULT_EVENT_NAME } from '../lib/constants'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import './FilterScreen.css'

export default function FilterScreen() {
  const {
    session,
    setScreen,
    selectedTheme,
    selectedLayout,
    selectedFrameSize,
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
      {/* ── Top Header: Single Left Back Arrow + Center Title ── */}
      <header className="filter-screen-header">
        <button
          className="screen-back-btn"
          onClick={() => setScreen('select-theme')}
          title="Quay lại chọn frame"
          aria-label="Quay lại"
        >
          <ArrowLeft size={28} strokeWidth={2} />
        </button>

        <div className="filter-header-center">
          <h1 className="filter-header-title">Bộ Lọc Màu</h1>
          <p className="filter-header-subtitle">Chọn tông màu nghệ thuật cho bức ảnh của bạn</p>
        </div>

        <div className="header-placeholder" />
      </header>

      {/* ── Main Split: CỐ ĐỊNH KÍCH THƯỚC DẢI STRIP (Trái) + Bộ Lọc (Phải) ── */}
      <div className="filter-main-split">
        {/* Left Side: CỐ ĐỊNH KÍCH THƯỚC DẢI STRIP PREVIEW (Giống hệt màn Chọn Frame) */}
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

        {/* Right Side: Chỉ giữ lại 3 bộ lọc: Gốc, Cổ Điển, Retro ── */}
        <div className="filter-selector-panel">
          <div className="filter-selector-header">
            <span className="filter-selector-title">Tông Màu Khả Dụng</span>
            <span className="filter-selector-count">({COLOR_FILTERS.length} bộ lọc)</span>
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
                    {isSelected && (
                      <Check size={18} strokeWidth={3} color={filter.id === 'vintage_noir' ? '#fff' : '#502A1D'} />
                    )}
                  </div>

                  <div className="filter-card-meta">
                    <span className="filter-card-name">{filter.name}</span>
                    <span className="filter-card-desc">
                      {filter.id === 'normal'
                        ? 'Ảnh màu gốc tự nhiên'
                        : filter.id === 'vintage_noir'
                        ? 'Trắng đen điện ảnh hoài niệm'
                        : 'Sắc vàng ấm áp phong cách thập niên 90'}
                    </span>
                  </div>

                  <span className="filter-card-tag">{filter.tag}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar: Only Single Primary Action ── */}
      <footer className="filter-bottom-bar">
        <button
          className="btn-proceed-filter"
          onClick={() => setScreen('review')}
        >
          <span>Tiếp Tục & In Ảnh</span>
          <ArrowRight size={22} strokeWidth={2.2} />
        </button>
      </footer>
    </div>
  )
}
