import { useAppStore, type FrameSize } from '../store/appStore'
import { DEFAULT_PRICE_2X6, DEFAULT_PRICE_4X6 } from '../lib/constants'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import './SelectFrameSizeScreen.css'

export default function SelectFrameSizeScreen() {
  const { setScreen, selectFrameSize, selectedFrameSize, eventConfig } = useAppStore()

  const price2x6 = eventConfig.price2x6 || DEFAULT_PRICE_2X6
  const price4x6 = eventConfig.price4x6 || DEFAULT_PRICE_4X6

  const price2x6Formatted = new Intl.NumberFormat('vi-VN').format(price2x6) + 'đ'
  const price4x6Formatted = new Intl.NumberFormat('vi-VN').format(price4x6) + 'đ'

  function handleChooseSize(size: FrameSize) {
    selectFrameSize(size)
    setScreen('select-layout')
  }

  return (
    <div className="size-screen-container" id="select-frame-size-screen">
      {/* ── Top Header: Single Left Back Arrow + Center Title ── */}
      <header className="size-screen-header">
        <button
          className="screen-back-btn"
          onClick={() => setScreen('idle')}
          title="Quay lại"
          aria-label="Quay lại"
        >
          <ArrowLeft size={28} strokeWidth={2} />
        </button>

        <div className="size-header-center">
          <h1 className="size-header-title">Chọn Khổ In</h1>
          <p className="size-header-subtitle">Chọn định dạng dải ảnh bạn muốn in</p>
        </div>

        <div className="header-placeholder" />
      </header>

      {/* ── 2-Option Cards Grid (Tối giản, Sang trọng, Touch-First) ── */}
      <main className="size-cards-grid">
        {/* Option 1: Strip 2x6 */}
        <div
          className={`size-option-card ${selectedFrameSize === '2x6' ? 'selected' : ''}`}
          onClick={() => handleChooseSize('2x6')}
          role="button"
          tabIndex={0}
        >
          <div className="size-card-header">
            <h2 className="card-title-header">Khung 2×6 inch</h2>
            <span className="card-price-pill">{price2x6Formatted}</span>
          </div>

          <div className="size-mockup-wrapper">
            <div className="mockup-strip-2x6">
              <div className="mockup-strip-slot" />
              <div className="mockup-strip-slot" />
              <div className="mockup-strip-slot" />
              <div className="mockup-strip-slot" />
            </div>
            <div className="mockup-strip-2x6 tilted">
              <div className="mockup-strip-slot" />
              <div className="mockup-strip-slot" />
              <div className="mockup-strip-slot" />
              <div className="mockup-strip-slot" />
            </div>
          </div>

          <p className="size-card-desc">Gồm 2 dải in Strip đôi tiện lợi</p>

          <button className="btn-select-size" onClick={() => handleChooseSize('2x6')}>
            <span>Chọn khổ này</span>
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* Option 2: Postcard 4x6 */}
        <div
          className={`size-option-card ${selectedFrameSize === '4x6' ? 'selected' : ''}`}
          onClick={() => handleChooseSize('4x6')}
          role="button"
          tabIndex={0}
        >
          <div className="size-card-header">
            <h2 className="card-title-header">Khung 4×6 inch</h2>
            <span className="card-price-pill">{price4x6Formatted}</span>
          </div>

          <div className="size-mockup-wrapper">
            <div className="mockup-postcard-4x6">
              <div className="mockup-grid-slot" />
              <div className="mockup-grid-slot" />
              <div className="mockup-grid-slot" />
              <div className="mockup-grid-slot" />
            </div>
          </div>

          <p className="size-card-desc">Gồm 1 bưu thiếp Postcard lớn sắc nét</p>

          <button className="btn-select-size" onClick={() => handleChooseSize('4x6')}>
            <span>Chọn khổ này</span>
            <ArrowRight size={20} strokeWidth={2.2} />
          </button>
        </div>
      </main>
    </div>
  )
}
