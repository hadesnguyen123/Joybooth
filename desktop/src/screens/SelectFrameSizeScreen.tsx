import { useAppStore, type FrameSize } from '../store/appStore'
import './SelectFrameSizeScreen.css'

export default function SelectFrameSizeScreen() {
  const { setScreen, selectFrameSize, selectedFrameSize } = useAppStore()

  function handleChooseSize(size: FrameSize) {
    selectFrameSize(size)
    setScreen('select-layout')
  }

  return (
    <div className="size-screen-container" id="select-frame-size-screen">
      {/* Title Banner */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">CHỌN KHUNG HÌNH</div>
      </div>

      {/* 2-Option Cards Grid */}
      <div className="size-cards-grid">
        {/* Option 1: 2x6 INCH */}
        <div
          className={`size-option-card ${selectedFrameSize === '2x6' ? 'selected' : ''}`}
          onClick={() => handleChooseSize('2x6')}
        >
          <div className="price-sticker-tag">50k</div>
          <h2 className="card-title-header">KHUNG 2X6 INCH</h2>

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

          <p className="size-card-desc">
            Gồm 2 dải in Strip đôi
          </p>

          <button className="btn-select-size">CHỌN KHUNG NÀY ➔</button>
        </div>

        {/* Option 2: 4x6 INCH */}
        <div
          className={`size-option-card ${selectedFrameSize === '4x6' ? 'selected' : ''}`}
          onClick={() => handleChooseSize('4x6')}
        >
          <div className="price-sticker-tag">70k</div>
          <h2 className="card-title-header">KHUNG 4X6 INCH</h2>

          <div className="size-mockup-wrapper">
            <div className="mockup-postcard-4x6">
              <div className="mockup-grid-slot" />
              <div className="mockup-grid-slot" />
              <div className="mockup-grid-slot" />
              <div className="mockup-grid-slot" />
            </div>
          </div>

          <p className="size-card-desc">
            Gồm 1 bưu thiếp Postcard lớn
          </p>

          <button className="btn-select-size">CHỌN KHUNG NÀY ➔</button>
        </div>
      </div>

      {/* Bottom bar */}
      <footer className="size-bottom-bar">
        <button
          className="btn btn-pill-white"
          style={{ padding: '12px 28px', fontSize: '1rem' }}
          onClick={() => setScreen('idle')}
        >
          ← Quay Lại
        </button>
      </footer>
    </div>
  )
}
