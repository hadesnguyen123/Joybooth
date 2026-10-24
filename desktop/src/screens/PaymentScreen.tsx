import { useState, useEffect } from 'react'
import { useAppStore, type DiscountCoupon } from '../store/appStore'
import {
  DEFAULT_ACCOUNT_HOLDER,
  DEFAULT_COUPON_CODE,
  DEFAULT_BANK_BIN,
  DEFAULT_ACCOUNT_NUMBER,
  DEFAULT_PRICE_2X6,
  DEFAULT_PRICE_4X6,
  DEFAULT_EXTRA_COPY_PRICE_2X6,
  DEFAULT_EXTRA_COPY_PRICE_4X6,
} from '../lib/constants'
import { ArrowLeft } from 'lucide-react'
import './PaymentScreen.css'

export default function PaymentScreen() {
  const {
    setScreen,
    selectedFrameSize,
    selectedLayout,
    eventConfig,
    selectedCopies,
    setSelectedCopies,
    setSessionPayment,
  } = useAppStore()

  // Base copies: 2x6 mặc định 2 bản, 4x6 mặc định 1 bản
  const minCopies = selectedFrameSize === '2x6' ? 2 : 1
  const copyStep = selectedFrameSize === '2x6' ? 2 : 1

  const [copies, setCopies] = useState(() => Math.max(selectedCopies || minCopies, minCopies))
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<DiscountCoupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'vietqr' | 'cash'>('vietqr')

  const [orderCode] = useState(() => `FTL${Date.now().toString().slice(-6)}`)
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. Tính giá cơ bản và giá bản in thêm
  const basePrice =
    selectedFrameSize === '2x6'
      ? eventConfig.price2x6 || DEFAULT_PRICE_2X6
      : eventConfig.price4x6 || DEFAULT_PRICE_4X6
  const extraCopies = Math.max(0, copies - minCopies)
  const extraPricePerUnit =
    selectedFrameSize === '2x6'
      ? (eventConfig.extraCopyPrice2x6 || DEFAULT_EXTRA_COPY_PRICE_2X6) / 2
      : eventConfig.extraCopyPrice4x6 || DEFAULT_EXTRA_COPY_PRICE_4X6
  const extraTotal = extraCopies * extraPricePerUnit

  const subTotal = basePrice + extraTotal

  // 2. Tính tiền giảm giá
  let discountAmount = 0
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      discountAmount = Math.round((subTotal * appliedCoupon.value) / 100)
    } else {
      discountAmount = appliedCoupon.value
    }
  }
  const finalAmount = Math.max(0, subTotal - discountAmount)

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)

  // Link ảnh VietQR động chuẩn NAPAS 24/7
  const vietQrImageUrl = `https://img.vietqr.io/image/${eventConfig.bankBin || DEFAULT_BANK_BIN}-${eventConfig.accountNumber || DEFAULT_ACCOUNT_NUMBER}-compact2.png?amount=${finalAmount}&addInfo=${orderCode}&accountName=${encodeURIComponent(eventConfig.accountHolder || DEFAULT_ACCOUNT_HOLDER)}`

  // Đếm ngược phiên thanh toán (120 giây)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  // Xử lý áp dụng mã giảm giá
  function handleApplyCoupon() {
    setCouponError(null)
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    const availableCoupons = eventConfig.discountCoupons || []
    const found = availableCoupons.find((c) => c.code.toUpperCase() === code)
    if (found) {
      setAppliedCoupon(found)
      setCouponError(null)
    } else {
      setCouponError('Mã không hợp lệ hoặc đã hết hạn')
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  function handleIncreaseCopies() {
    const next = copies + copyStep
    if (next <= 12) {
      setCopies(next)
      setSelectedCopies(next)
    }
  }

  function handleDecreaseCopies() {
    const next = copies - copyStep
    if (next >= minCopies) {
      setCopies(next)
      setSelectedCopies(next)
    }
  }

  function handleConfirmPaid(methodUsed: 'vietqr' | 'cash' | 'free') {
    setIsProcessing(true)

    setSessionPayment({
      paidAmount: finalAmount,
      paidCopies: copies,
      paymentMethod: methodUsed,
      discountCodeUsed: appliedCoupon?.code || null,
      discountAmount,
    })

    setTimeout(() => {
      setScreen('capture')
    }, 600)
  }

  return (
    <div className="payment-screen-container" id="payment-kiosk-screen">
      {/* ── Top Header Navigation Bar ── */}
      <header className="payment-header">
        {/* Nút Quay Lại dạng Icon-Only tối giản, không chữ */}
        <button
          className="screen-back-btn"
          onClick={() => setScreen('select-layout')}
          aria-label="Quay lại"
          title="Quay lại"
        >
          <ArrowLeft size={28} strokeWidth={2} />
        </button>

        <div className="payment-header-center">
          <h1 className="payment-header-title">Thanh Toán</h1>
          <p className="payment-header-subtitle">
            {selectedFrameSize === '2x6' ? 'Strip 2x6' : 'Postcard 4x6'} • {selectedLayout.name}
          </p>
        </div>

        <div className="payment-header-meta">
          <span className="payment-order-pill">#{orderCode}</span>
        </div>
      </header>

      {/* ── Main Stage: 2 Tối Giản Nhất Có Thể ── */}
      <main className="payment-main-stage">
        {/* CỘT TRÁI: Chi tiết gói, Số lượng in & Mã giảm giá */}
        <section className="payment-order-card" aria-label="Chi tiết đơn hàng">
          <div className="card-heading-row">
            <span className="card-heading-title">Đơn Hàng</span>
            <span className="card-heading-badge">
              {selectedFrameSize === '2x6' ? 'Strip 2x6' : 'Postcard 4x6'}
            </span>
          </div>

          {/* CHỌN SỐ LƯỢNG ẢNH IN (Touch First, Siêu gọn gàng) */}
          <div className="copies-control-card">
            <div className="copies-info">
              <span className="copies-title">Số bản in</span>
              <span className="copies-note">
                {selectedFrameSize === '2x6' ? '(Gốc: 2 dải)' : '(Gốc: 1 tấm)'}
              </span>
            </div>

            <div className="copies-stepper">
              <button
                className="stepper-btn"
                onClick={handleDecreaseCopies}
                disabled={copies <= minCopies}
                aria-label="Giảm"
              >
                −
              </button>
              <div className="stepper-display">
                <span className="stepper-count">{copies}</span>
                <span className="stepper-unit">{selectedFrameSize === '2x6' ? 'dải' : 'tấm'}</span>
              </div>
              <button
                className="stepper-btn"
                onClick={handleIncreaseCopies}
                disabled={copies >= 12}
                aria-label="Tăng"
              >
                +
              </button>
            </div>
          </div>

          {/* NHẬP MÃ GIẢM GIÁ */}
          <div className="coupon-card-section">
            {!appliedCoupon ? (
              <div className="coupon-input-wrap">
                <input
                  type="text"
                  placeholder={`Mã ưu đãi (VD: ${DEFAULT_COUPON_CODE})`}
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  className="coupon-input"
                  aria-label="Mã giảm giá"
                />
                <button
                  type="button"
                  className="coupon-apply-btn"
                  onClick={handleApplyCoupon}
                >
                  Áp dụng
                </button>
              </div>
            ) : (
              <div className="coupon-active-pill">
                <span className="coupon-active-code">{appliedCoupon.code}</span>
                <span className="coupon-active-desc">(-{formatVND(discountAmount)})</span>
                <button
                  type="button"
                  className="coupon-remove-btn"
                  onClick={handleRemoveCoupon}
                  aria-label="Hủy mã"
                >
                  ✕
                </button>
              </div>
            )}
            {couponError && <p className="coupon-error-msg">{couponError}</p>}
          </div>

          <div className="order-price-divider" />

          {/* CHI TIẾT TÍNH TIỀN */}
          <div className="cost-breakdown">
            <div className="cost-item">
              <span className="cost-label">Gói cơ bản</span>
              <span className="cost-value">{formatVND(basePrice)}</span>
            </div>
            {extraTotal > 0 && (
              <div className="cost-item">
                <span className="cost-label">
                  In thêm (+{extraCopies} {selectedFrameSize === '2x6' ? 'dải' : 'tấm'})
                </span>
                <span className="cost-value highlight">+{formatVND(extraTotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="cost-item discount">
                <span className="cost-label">Giảm giá ({appliedCoupon?.code})</span>
                <span className="cost-value">-{formatVND(discountAmount)}</span>
              </div>
            )}
          </div>

          <div className="order-total-banner">
            <span className="total-title">TỔNG CỘNG</span>
            <span className="total-amount">{formatVND(finalAmount)}</span>
          </div>
        </section>

        {/* CỘT PHẢI: LỰA CHỌN PHƯƠNG THỨC THANH TOÁN (VIETQR / TIỀN MẶT) */}
        <section className="payment-method-card" aria-label="Phương thức thanh toán">
          {/* Method Segmented Switcher */}
          <div className="method-switcher">
            <button
              className={`method-switch-btn ${paymentMethod === 'vietqr' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('vietqr')}
            >
              Quét Mã QR
            </button>
            <button
              className={`method-switch-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              Tiền Mặt
            </button>
          </div>

          {/* View Quét VietQR */}
          {paymentMethod === 'vietqr' ? (
            <div className="vietqr-stage">
              <div className="vietqr-frame-wrapper">
                {finalAmount === 0 ? (
                  <div className="vietqr-free-prompt">
                    <span className="free-icon">✨</span>
                    <h3 className="free-title">Miễn phí trải nghiệm</h3>
                    <p className="free-sub">Bấm xác nhận bên dưới để bắt đầu chụp ảnh</p>
                  </div>
                ) : (
                  <div className="vietqr-canvas-box">
                    <img
                      src={vietQrImageUrl}
                      alt="Mã VietQR"
                      className="vietqr-code-img"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Chi tiết tài khoản ngân hàng */}
              <div className="bank-details-box">
                <div className="bank-detail-item">
                  <span className="detail-name">Ngân hàng</span>
                  <span className="detail-value">{eventConfig.bankName || 'MB Bank'}</span>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-name">Số tài khoản</span>
                  <span className="detail-value highlight-num">{eventConfig.accountNumber || '0388889999'}</span>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-name">Chủ tài khoản</span>
                  <span className="detail-value">{eventConfig.accountHolder || DEFAULT_ACCOUNT_HOLDER}</span>
                </div>
                <div className="bank-detail-item">
                  <span className="detail-name">Nội dung CK</span>
                  <span className="detail-value tag-code">{orderCode}</span>
                </div>
              </div>

              {/* Countdown timer progress */}
              <div className="payment-timer-wrap">
                <div className="timer-info-row">
                  {secondsLeft > 0 ? (
                    <span className="timer-label">Thời gian còn lại: <b>{secondsLeft}s</b></span>
                  ) : (
                    <span className="timer-expired-label">Hết hạn thanh toán</span>
                  )}
                </div>
                <div className="timer-progress-track">
                  <div
                    className="timer-progress-fill"
                    style={{ width: `${(secondsLeft / 120) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* View Tiền Mặt */
            <div className="cash-stage">
              <div className="cash-guide-card">
                <h3 className="cash-title">Thanh Toán Tiền Mặt</h3>
                <p className="cash-amount-hint">
                  Số tiền cần trả:{' '}
                  <strong className="cash-amount-bold">{formatVND(finalAmount)}</strong>
                </p>

                <div className="cash-steps">
                  <div className="cash-step">
                    <span className="step-badge">1</span>
                    <span className="step-desc">Đưa tiền cho nhân viên tại quầy.</span>
                  </div>
                  <div className="cash-step">
                    <span className="step-badge">2</span>
                    <span className="step-desc">Nhân viên xác nhận để bắt đầu chụp.</span>
                  </div>
                </div>
              </div>

              <button
                className="cash-confirm-btn"
                onClick={() => handleConfirmPaid('cash')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Đang Xử Lý...' : 'Xác Nhận Đã Nhận Tiền'}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* ── Footer Navigation Bar ── */}
      <footer className="payment-footer">
        {/* Nút Quay Lại dạng Icon-Only ở chân trang */}
        <button
          className="payment-footer-back-btn"
          onClick={() => setScreen('select-layout')}
          aria-label="Quay lại"
          title="Quay lại"
        >
          <svg
            className="payment-back-icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        <div className="payment-footer-actions">
          {paymentMethod === 'vietqr' && (
            <button
              className={`payment-cta-btn ${isProcessing ? 'processing' : ''}`}
              onClick={() => handleConfirmPaid('vietqr')}
            >
              <span>
                {isProcessing
                  ? 'ĐANG MỞ CAMERA...'
                  : finalAmount === 0
                  ? 'BẮT ĐẦU CHỤP'
                  : 'XÁC NHẬN ĐÃ THANH TOÁN'}
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}

          <button
            className="payment-test-btn"
            onClick={() => handleConfirmPaid('free')}
            title="Bỏ qua"
          >
            Bỏ qua
          </button>
        </div>
      </footer>
    </div>
  )
}
