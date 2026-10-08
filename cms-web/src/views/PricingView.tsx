import { useState } from 'react'
import { useCms } from '../context/CmsContext'
import { Save, CheckCircle2 } from 'lucide-react'

export default function PricingView() {
  const { pricing, updatePricing } = useCms()
  const [p2x6, setP2x6] = useState(pricing.price2x6)
  const [p4x6, setP4x6] = useState(pricing.price4x6)
  const [extra2x6, setExtra2x6] = useState(pricing.extraCopyPrice2x6)
  const [extra4x6, setExtra4x6] = useState(pricing.extraCopyPrice4x6)
  const [savedSuccess, setSavedSuccess] = useState(false)

  function handleSave() {
    updatePricing({
      price2x6: p2x6,
      price4x6: p4x6,
      extraCopyPrice2x6: extra2x6,
      extraCopyPrice4x6: extra4x6,
    })
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 2000)
  }

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Bảng Giá Gói Chụp & Bản In Thêm</h3>
          <p className="section-sub">
            Thay đổi giá trên Cloud sẽ tự động đồng bộ xuống 2 máy Kiosk trong vòng 1 giây
          </p>
        </div>

        <button className="btn-add-primary" onClick={handleSave}>
          <Save className="w-4 h-4" /> {savedSuccess ? 'Đã Lưu Thành Công!' : 'Lưu Thay Đổi Bảng Giá'}
        </button>
      </div>

      {savedSuccess && (
        <div className="alert-success-pill flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Bảng giá mới đã được phát lệnh đồng bộ xuống Kiosk 01 và Kiosk 02!</span>
        </div>
      )}

      <div className="pricing-cards-grid">
        {/* Card 1: Gói 2x6 */}
        <div className="pricing-box-card border-pink-200">
          <div className="pricing-header-pill bg-pink-50 text-pink-700">
            🎞️ KHỔ STRIP ĐÔI 2X6 INCH
          </div>

          <div className="pricing-field-group">
            <label>Giá gói cơ bản (Đã gồm 2 dải in):</label>
            <div className="input-with-unit">
              <input
                type="number"
                step={5000}
                value={p2x6}
                onChange={(e) => setP2x6(Number(e.target.value))}
                className="pricing-input"
              />
              <span className="unit-tag">VND</span>
            </div>
            <span className="preview-val">Xem trước: {formatVND(p2x6)} / 2 dải</span>
          </div>

          <div className="pricing-field-group">
            <label>Giá in thêm mỗi cặp dải (+2 dải):</label>
            <div className="input-with-unit">
              <input
                type="number"
                step={5000}
                value={extra2x6}
                onChange={(e) => setExtra2x6(Number(e.target.value))}
                className="pricing-input"
              />
              <span className="unit-tag">VND</span>
            </div>
            <span className="preview-val">Xem trước: +{formatVND(extra2x6)} / cặp</span>
          </div>
        </div>

        {/* Card 2: Gói 4x6 */}
        <div className="pricing-box-card border-sky-200">
          <div className="pricing-header-pill bg-sky-50 text-sky-700">
            🖼️ KHỔ POSTCARD 4X6 INCH
          </div>

          <div className="pricing-field-group">
            <label>Giá gói cơ bản (Đã gồm 1 bưu thiếp):</label>
            <div className="input-with-unit">
              <input
                type="number"
                step={5000}
                value={p4x6}
                onChange={(e) => setP4x6(Number(e.target.value))}
                className="pricing-input"
              />
              <span className="unit-tag">VND</span>
            </div>
            <span className="preview-val">Xem trước: {formatVND(p4x6)} / tấm</span>
          </div>

          <div className="pricing-field-group">
            <label>Giá in thêm mỗi tấm postcard (+1 tấm):</label>
            <div className="input-with-unit">
              <input
                type="number"
                step={5000}
                value={extra4x6}
                onChange={(e) => setExtra4x6(Number(e.target.value))}
                className="pricing-input"
              />
              <span className="unit-tag">VND</span>
            </div>
            <span className="preview-val">Xem trước: +{formatVND(extra4x6)} / tấm</span>
          </div>
        </div>
      </div>
    </div>
  )
}
