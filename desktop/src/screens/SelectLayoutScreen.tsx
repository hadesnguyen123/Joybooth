import { useAppStore, ALL_LAYOUTS, type LayoutCategory, type GridLayoutItem } from '../store/appStore'
import { DEFAULT_PRICE_2X6, DEFAULT_PRICE_4X6 } from '../lib/constants'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import './SelectLayoutScreen.css'

export default function SelectLayoutScreen() {
  const {
    setScreen,
    selectedFrameSize,
    selectedCategory,
    selectCategory,
    selectedLayout,
    selectLayout,
    eventConfig,
  } = useAppStore()

  // 2x6 Strip chỉ cho phép 3 ảnh hoặc 4 ảnh strip
  // 4x6 Postcard cho phép 1, 4, 6, 8 ảnh
  const categories: LayoutCategory[] =
    selectedFrameSize === '2x6' ? [3, 4] : [1, 4, 6, 8]

  // Đảm bảo selectedCategory hợp lệ với frameSize
  if (!categories.includes(selectedCategory)) {
    selectCategory(4)
  }

  const currentCategoryLayouts = ALL_LAYOUTS[selectedCategory] || ALL_LAYOUTS[4]

  const basePrice =
    selectedFrameSize === '2x6'
      ? eventConfig.price2x6 || DEFAULT_PRICE_2X6
      : eventConfig.price4x6 || DEFAULT_PRICE_4X6

  const basePriceFormatted = new Intl.NumberFormat('vi-VN').format(basePrice)

  function handleChooseLayout(layout: GridLayoutItem) {
    selectLayout(layout)
  }

  function handleProceed() {
    if (eventConfig.paymentRequiredForPhotobooth) {
      setScreen('payment')
    } else {
      setScreen('capture')
    }
  }

  return (
    <div className="layout-screen-container" id="select-layout-screen">
      {/* ── Top Header: Single Left Back Arrow + Center Title ── */}
      <header className="layout-screen-header">
        <button
          className="screen-back-btn"
          onClick={() => setScreen('select-size')}
          title="Quay lại chọn khổ in"
          aria-label="Quay lại"
        >
          <ArrowLeft size={28} strokeWidth={2} />
        </button>

        <div className="layout-header-center">
          <h1 className="layout-header-title">Chọn Bố Cục</h1>
          <p className="layout-header-subtitle">
            {selectedFrameSize === '2x6' ? 'Dải Strip 2×6' : 'Postcard 4×6'} • {basePriceFormatted}đ
          </p>
        </div>

        <div className="header-placeholder" />
      </header>

      {/* ── Category Tabs (Touch-First Pills) ── */}
      <div className="category-tabs-row">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat
          return (
            <button
              key={cat}
              className={`cat-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => selectCategory(cat)}
            >
              <span>{cat} ảnh</span>
            </button>
          )
        })}
      </div>

      {/* ── Layout Options Stage ── */}
      <main className="layout-options-stage">
        {currentCategoryLayouts.map((layout) => {
          const isSelected = selectedLayout.id === layout.id
          return (
            <div
              key={layout.id}
              className={`layout-preview-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleChooseLayout(layout)}
              role="button"
              tabIndex={0}
            >
              <div className="layout-card-sheet">
                {layout.strip ? (
                  // Dải Strip đứng
                  <div
                    style={{
                      width: 140,
                      height: 280,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    {Array.from({ length: layout.photosCount }).map((_, i) => (
                      <div
                        key={i}
                        className="mockup-slot-photo"
                        style={{ flex: 1, width: '100%' }}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                ) : (
                  // Lưới Grid (2x2, 2x3, 2x4)
                  <div
                    className="slots-container-grid"
                    style={{
                      gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
                      width: layout.cols === 3 ? 320 : 240,
                      height: 260,
                    }}
                  >
                    {Array.from({ length: layout.photosCount }).map((_, i) => (
                      <div key={i} className="mockup-slot-photo">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <span className="layout-card-title">{layout.name}</span>
            </div>
          )
        })}
      </main>

      {/* ── Bottom Bar: Only Single Primary Action ── */}
      <footer className="layout-bottom-bar">
        <button
          className="btn-proceed-layout"
          onClick={handleProceed}
        >
          <span>{eventConfig.paymentRequiredForPhotobooth ? 'Tiếp Tục Thanh Toán' : 'Bắt Đầu Chụp'}</span>
          <ArrowRight size={22} strokeWidth={2.2} />
        </button>
      </footer>
    </div>
  )
}
