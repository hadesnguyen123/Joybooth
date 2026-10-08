import { useAppStore, ALL_LAYOUTS, type LayoutCategory, type GridLayoutItem } from '../store/appStore'
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

  const basePriceFormatted = new Intl.NumberFormat('vi-VN').format(
    selectedFrameSize === '2x6' ? eventConfig.price2x6 : eventConfig.price4x6
  )

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
      {/* Title */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">CHỌN BỐ CỤC KHUNG HÌNH</div>
        <p style={{ margin: '6px 0 0', fontSize: '0.95rem', color: '#64748b' }}>
          Định dạng: <strong>{selectedFrameSize === '2x6' ? 'Dải Strip 2x6 inch' : 'Bưu thiếp 4x6 inch'}</strong> • Gói cơ bản: <strong>{basePriceFormatted}đ</strong>
        </p>
      </div>

      {/* Category Tabs */}
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
          onClick={handleProceed}
        >
          {eventConfig.paymentRequiredForPhotobooth ? '💳 Tiếp Tục Thanh Toán →' : '📷 Tiếp Tục Chụp →'}
        </button>
      </footer>
    </div>
  )
}
