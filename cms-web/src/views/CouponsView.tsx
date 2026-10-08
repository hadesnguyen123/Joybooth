import { useState } from 'react'
import { useCms } from '../context/CmsContext'
import { Plus, Check, PowerOff, Trash2, Tag } from 'lucide-react'
import type { DiscountCoupon } from '../types'

export default function CouponsView() {
  const { coupons, addCoupon, toggleCoupon, deleteCoupon } = useCms()
  const [showAddModal, setShowAddModal] = useState(false)
  const [code, setCode] = useState('')
  const [type, setType] = useState<'percent' | 'fixed'>('percent')
  const [value, setValue] = useState(10)
  const [desc, setDesc] = useState('')

  function handleCreate() {
    if (!code.trim()) return
    const newCoupon: DiscountCoupon = {
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      description: desc.trim() || `Giảm ${type === 'percent' ? `${value}%` : `${value.toLocaleString()}đ`}`,
      isActive: true,
      usageCount: 0,
      maxUsage: 500,
      expiryDate: '2026-12-31',
    }
    addCoupon(newCoupon)
    setCode('')
    setDesc('')
    setShowAddModal(false)
  }

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Quản Lý Mã Giảm Giá & Voucher ({coupons.length} Mã)</h3>
          <p className="section-sub">
            Mã voucher tạo tại đây sẽ có hiệu lực ngay lập tức khi khách nhập tại màn hình thanh toán Kiosk
          </p>
        </div>

        <button className="btn-add-primary" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" /> Tạo Mã Ưu Đãi Mới
        </button>
      </div>

      <div className="coupons-cards-grid">
        {coupons.map((c) => (
          <div
            key={c.code}
            className={`coupon-box-card ${!c.isActive ? 'coupon-disabled' : ''}`}
          >
            <div className="coupon-card-top">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-pink-500" />
                <h4 className="coupon-code-heading">{c.code}</h4>
              </div>

              <span className="coupon-discount-badge">
                {c.type === 'percent' ? `-${c.value}%` : `-${c.value.toLocaleString()}đ`}
              </span>
            </div>

            <p className="coupon-desc-text">{c.description}</p>

            <div className="coupon-stats-row">
              <span>Đã dùng: <strong>{c.usageCount} lượt</strong></span>
              <span>Hạn dùng: <strong>{c.expiryDate}</strong></span>
            </div>

            <div className="coupon-action-row">
              <button
                className={`btn-toggle-coupon ${
                  c.isActive ? 'btn-active' : 'btn-inactive'
                }`}
                onClick={() => toggleCoupon(c.code)}
              >
                {c.isActive ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Đang Kích Hoạt
                  </>
                ) : (
                  <>
                    <PowerOff className="w-3.5 h-3.5" /> Tạm Tắt
                  </>
                )}
              </button>

              <button
                className="btn-delete-coupon"
                onClick={() => deleteCoupon(c.code)}
                title="Xóa mã voucher này"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal tạo Voucher mới */}
      {showAddModal && (
        <div className="cms-modal-backdrop">
          <div className="cms-modal-card">
            <h4 className="modal-title">Tạo Mã Giảm Giá Mới</h4>
            <p className="modal-sub">Mã sẽ được đồng bộ tức thì xuống 2 máy Kiosk</p>

            <div className="modal-form-group">
              <label>Mã Voucher (Không dấu, viết liền):</label>
              <input
                type="text"
                placeholder="VD: KHAI_TRUONG20, TIKTOK20K"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="modal-input uppercase"
              />
            </div>

            <div className="modal-form-row">
              <div className="modal-form-group flex-1">
                <label>Loại giảm giá:</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
                  className="modal-select"
                >
                  <option value="percent">Giảm theo phần trăm (%)</option>
                  <option value="fixed">Giảm số tiền cố định (VND)</option>
                </select>
              </div>

              <div className="modal-form-group flex-1">
                <label>Giá trị giảm:</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value))}
                  className="modal-input"
                  min={1}
                />
              </div>
            </div>

            <div className="modal-form-group">
              <label>Mô tả hiển thị:</label>
              <input
                type="text"
                placeholder="VD: Giảm 20% cho khách hàng check-in"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="modal-input"
              />
            </div>

            <div className="modal-action-row">
              <button
                className="btn-modal-cancel"
                onClick={() => setShowAddModal(false)}
              >
                Hủy Bỏ
              </button>
              <button className="btn-modal-submit" onClick={handleCreate}>
                Kích Hoạt Mã Ưu Đãi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
