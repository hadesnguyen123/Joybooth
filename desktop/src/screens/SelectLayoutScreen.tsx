import { useAppStore, ALL_LAYOUTS, type LayoutCategory, type GridLayoutItem } from '../store/appStore'
import './SelectLayoutScreen.css'

export default function SelectLayoutScreen() {
  const {
    setScreen,
    selectedCategory,
    selectCategory,
    selectedLayout,
    selectLayout,
    eventConfig,
  } = useAppStore()

  const categories: LayoutCategory[] = [1, 3, 4, 6, 8]
  const currentCategoryLayouts = ALL_LAYOUTS[selectedCategory] || ALL_LAYOUTS[4]

  const categoryPrices: Record<LayoutCategory, string> = {
    1: '40.000 đ',
    3: '60.000 đ',
    4: '70.000 đ',
    6: '80.000 đ',
    8: '90.000 đ',
  }

  function handleChooseLayout(layout: GridLayoutItem) {
    selectLayout(layout)
  }

  function handleProceedToCapture() {
    // Tạm thời nếu paymentQrEnabled = false thì nhảy thẳng vào chụp ảnh
    if (eventConfig.paymentQrEnabled) {
      setScreen('payment')
    } else {
      setScreen('capture')
    }
  }

  return (
    <div className="layout-screen-container" id="select-layout-screen">
      {/* Title */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">CHỌN BỐ CỤC</div>
      </div>

      {/* Category Tabs: 1 ảnh, 3 ảnh, 4 ảnh, 6 ảnh, 8 ảnh */}
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
              {isActive && (
                <span className="cat-price-sub">{categoryPrices[cat]}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Layout Options Stage */}
      <div className="layout-options-stage">
        {currentCategoryLayouts.map((layout) => {
          const isSelected = selectedLayout.id === layout.id
          return (
            <div
              key={layout.id}
              className={`layout-preview-card ${isSelected ? 'selected' : ''}`}
              onClick={() => handleChooseLayout(layout)}
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
      </div>

      {/* Bottom bar */}
      <footer className="layout-bottom-bar">
        <button
          className="btn btn-pill-white"
          style={{ padding: '12px 28px', fontSize: '1rem', color: '#2563eb', borderColor: '#93c5fd' }}
          onClick={() => setScreen('select-size')}
        >
          ← Quay Lại
        </button>

        <button
          className="btn btn-pink"
          style={{ padding: '14px 44px', fontSize: '1.15rem' }}
          onClick={handleProceedToCapture}
        >
          📷 Tiếp Tục Chụp
        </button>
      </footer>
    </div>
  )
}
