import { useState, useEffect } from 'react'
import { useAppStore, type DiscountCoupon } from '../store/appStore'
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

  const [orderCode] = useState(() => `JB${Date.now().toString().slice(-6)}`)
  const [secondsLeft, setSecondsLeft] = useState(120)
  const [isProcessing, setIsProcessing] = useState(false)

  // 1. Tính giá cơ bản và giá bản in thêm
  const basePrice = selectedFrameSize === '2x6' ? (eventConfig.price2x6 || 50000) : (eventConfig.price4x6 || 70000)
  const extraCopies = Math.max(0, copies - minCopies)
  const extraPricePerUnit = selectedFrameSize === '2x6'
    ? ((eventConfig.extraCopyPrice2x6 || 25000) / 2) // giá mỗi dải thêm
    : (eventConfig.extraCopyPrice4x6 || 35000)      // giá mỗi postcard thêm
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
  const vietQrImageUrl = `https://img.vietqr.io/image/${eventConfig.bankBin || '970422'}-${eventConfig.accountNumber || '0388889999'}-compact2.png?amount=${finalAmount}&addInfo=${orderCode}&accountName=${encodeURIComponent(eventConfig.accountHolder || 'JOYBOOTH VIETNAM')}`

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
      setCouponError('Mã ưu đãi không hợp lệ hoặc đã hết hạn!')
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCouponInput('')
    setCouponError(null)
  }

  // Tăng giảm số lượng in
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

  // Xác nhận thanh toán & chuyển vào màn hình chụp
  function handleConfirmPaid(methodUsed: 'vietqr' | 'cash' | 'free' = paymentMethod) {
    setIsProcessing(true)
    setSelectedCopies(copies)
    setSessionPayment({
      paidAmount: finalAmount,
      paidCopies: copies,
      paymentMethod: finalAmount === 0 ? 'free' : methodUsed,
      discountCodeUsed: appliedCoupon ? appliedCoupon.code : null,
      discountAmount,
    })

    setTimeout(() => {
      setScreen('capture')
    }, 600)
  }

  return (
    <div className="payment-screen-container" id="payment-kiosk-screen">
      {/* Title */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">THANH TOÁN DỊCH VỤ PHOTOBOOTH</div>
      </div>

      <div className="payment-main-stage">
        {/* CỘT TRÁI: Chi tiết gói, Số lượng in & Mã giảm giá */}
        <div className="order-summary-card">
          <div className="summary-badge-top">1. CHI TIẾT ĐƠN HÀNG</div>

          <div className="summary-info-row">
            <span className="summary-label">Khổ ảnh in:</span>
            <span className="summary-val highlight">
              {selectedFrameSize === '2x6' ? '🎞️ Dải Strip (2x6 inch)' : '🖼️ Bưu Thiếp Postcard (4x6 inch)'}
            </span>
          </div>

          <div className="summary-info-row">
            <span className="summary-label">Bố cục chọn:</span>
            <span className="summary-val">{selectedLayout.name}</span>
          </div>

          <div className="summary-info-row">
            <span className="summary-label">Mã giao dịch:</span>
            <span className="summary-val mono-badge">{orderCode}</span>
          </div>

          {/* CHỌN SỐ LƯỢNG ẢNH IN */}
          <div className="copies-selector-box">
            <div className="copies-label-wrap">
              <span className="copies-title">Số bản in nhận được:</span>
              <span className="copies-subtext">
                {selectedFrameSize === '2x6'
                  ? `(Gói cơ bản gồm 2 dải in)`
                  : `(Gói cơ bản gồm 1 ảnh 4x6)`}
              </span>
            </div>

            <div className="copies-counter-controls">
              <button
                className="counter-btn"
                onClick={handleDecreaseCopies}
                disabled={copies <= minCopies}
              >
                −
              </button>
              <div className="counter-display">
                <span className="counter-number">{copies}</span>
                <span className="counter-unit">{selectedFrameSize === '2x6' ? 'dải' : 'tấm'}</span>
              </div>
              <button
                className="counter-btn"
                onClick={handleIncreaseCopies}
                disabled={copies >= 12}
              >
                +
              </button>
            </div>
          </div>

          {/* NHẬP MÃ GIẢM GIÁ */}
          <div className="coupon-input-section">
            <label className="coupon-label">Mã giảm giá / Voucher ưu đãi:</label>
            {!appliedCoupon ? (
              <div className="coupon-input-group">
                <input
                  type="text"
                  placeholder="Nhập mã (VD: JOYBOOTH10, GIAM20K)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  className="coupon-text-field"
                />
                <button className="btn-apply-coupon" onClick={handleApplyCoupon}>
                  Áp Dụng
                </button>
              </div>
            ) : (
              <div className="coupon-applied-pill">
                <div className="coupon-applied-info">
                  <span className="coupon-code-badge">🏷️ {appliedCoupon.code}</span>
                  <span className="coupon-desc">{appliedCoupon.description}</span>
                </div>
                <button className="btn-remove-coupon" onClick={handleRemoveCoupon}>
                  ✕ Hủy
                </button>
              </div>
            )}
            {couponError && <p className="coupon-error-text">{couponError}</p>}
          </div>

          <hr className="summary-divider" />

          {/* CHI TIẾT TÍNH TIỀN */}
          <div className="cost-breakdown-list">
            <div className="cost-row">
              <span>Gói chụp cơ bản:</span>
              <span>{formatVND(basePrice)}</span>
            </div>
            {extraTotal > 0 && (
              <div className="cost-row">
                <span>In thêm (+{extraCopies} {selectedFrameSize === '2x6' ? 'dải' : 'tấm'}):</span>
                <span>+{formatVND(extraTotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="cost-row discount">
                <span>Giảm giá ({appliedCoupon?.code}):</span>
                <span>-{formatVND(discountAmount)}</span>
              </div>
            )}
          </div>

          <div className="summary-total-box">
            <span className="total-label">TỔNG THANH TOÁN</span>
            <span className="total-amount-display">{formatVND(finalAmount)}</span>
          </div>
        </div>

        {/* CỘT PHẢI: LỰA CHỌN PHƯƠNG THỨC THANH TOÁN (VIETQR / TIỀN MẶT) */}
        <div className="payment-action-card">
          {/* Method Tabs */}
          <div className="method-switcher-tabs">
            <button
              className={`method-tab-btn ${paymentMethod === 'vietqr' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('vietqr')}
            >
              💳 Quét Mã QR (Napas 24/7)
            </button>
            <button
              className={`method-tab-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('cash')}
            >
              💵 Tiền Mặt / Quầy
            </button>
          </div>

          {/* View Quét VietQR */}
          {paymentMethod === 'vietqr' ? (
            <div className="vietqr-view-content">
              <div className="vietqr-box-frame">
                {finalAmount === 0 ? (
                  <div className="free-experience-box">
                    <span style={{ fontSize: '3rem' }}>🎉</span>
                    <b>Miễn phí trải nghiệm (0đ)</b>
                    <p>Bấm xác nhận để bắt đầu chụp ngay!</p>
                  </div>
                ) : (
                  <>
                    <img
                      src={vietQrImageUrl}
                      alt="Mã VietQR Thanh Toán"
                      className="vietqr-real-image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="qr-scan-line-anim"></div>
                  </>
                )}
              </div>

              {/* Chi tiết tài khoản ngân hàng */}
              <div className="bank-meta-details">
                <div className="bank-meta-row">
                  <span>Ngân hàng:</span>
                  <b>{eventConfig.bankName || 'MB Bank (Quân Đội)'}</b>
                </div>
                <div className="bank-meta-row">
                  <span>Số tài khoản:</span>
                  <b className="copy-num">{eventConfig.accountNumber || '0388889999'}</b>
                </div>
                <div className="bank-meta-row">
                  <span>Chủ tài khoản:</span>
                  <b>{eventConfig.accountHolder || 'JOYBOOTH VIETNAM'}</b>
                </div>
                <div className="bank-meta-row">
                  <span>Số tiền:</span>
                  <b style={{ color: '#e11d48' }}>{formatVND(finalAmount)}</b>
                </div>
                <div className="bank-meta-row">
                  <span>Nội dung chuyển khoản:</span>
                  <b className="code-tag">{orderCode}</b>
                </div>
              </div>

              {/* Đồng hồ đếm ngược */}
              <div className="payment-timer-bar">
                {secondsLeft > 0 ? (
                  <span className="timer-text">
                    ⏳ Thời gian thanh toán còn lại: <b>{secondsLeft}s</b>
                  </span>
                ) : (
                  <span className="timer-expired">Hết hạn thanh toán — Vui lòng thử lại</span>
                )}
                <div className="timer-progress-track">
                  <div
                    className="timer-progress-fill"
                    style={{ width: `${(secondsLeft / 120) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            /* View Tiền Mặt */
            <div className="cash-view-content">
              <div className="cash-instruction-illustration">
                <div className="cash-icon-circle">💵</div>
                <h3>Thanh Toán Bằng Tiền Mặt</h3>
                <p>
                  Vui lòng chuẩn bị đúng số tiền: <strong style={{ color: '#e11d48', fontSize: '1.2rem' }}>{formatVND(finalAmount)}</strong>
                </p>
                <div className="cash-steps-list">
                  <div className="cash-step-item">
                    <span className="step-num">1</span>
                    <span>Đưa tiền cho nhân viên trực booth hoặc đưa vào khe nhận tiền tự động.</span>
                  </div>
                  <div className="cash-step-item">
                    <span className="step-num">2</span>
                    <span>Nhân viên kiểm tra và bấm nút xác nhận bên dưới để mở camera chụp ảnh.</span>
                  </div>
                </div>
              </div>

              <div className="cash-operator-confirm-box">
                <button
                  className="btn-cash-confirm"
                  onClick={() => handleConfirmPaid('cash')}
                  disabled={isProcessing}
                >
                  {isProcessing ? '⏳ Đang Xử Lý...' : '✅ Nhân Viên Xác Nhận Đã Nhận Tiền'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <footer className="payment-bottom-bar">
        <button
          className="btn btn-pill-white"
          style={{ padding: '12px 28px', color: '#4b5563', borderColor: '#d1d5db' }}
          onClick={() => setScreen('select-layout')}
        >
          ← Quay Lại Chọn Bố Cục
        </button>

        <div style={{ display: 'flex', gap: 14 }}>
          {paymentMethod === 'vietqr' && (
            <button
              className={`btn btn-pink ${isProcessing ? 'btn-success-anim' : ''}`}
              style={{ padding: '14px 38px', fontSize: '1.1rem' }}
              onClick={() => handleConfirmPaid('vietqr')}
            >
              {isProcessing
                ? '✅ Đã Xác Nhận! Đang Vào Chụp...'
                : finalAmount === 0
                ? '🎉 Trải Nghiệm Miễn Phí → Chụp Ngay'
                : '✅ Tôi Đã Chuyển Khoản Xong'}
            </button>
          )}

          {/* Nút kiểm thử nhanh cho Kiosk Operator */}
          <button
            className="btn btn-pill-white"
            style={{ padding: '12px 20px', fontSize: '0.88rem', color: '#6b7280' }}
            onClick={() => handleConfirmPaid('free')}
          >
            ⚡ Test Mode (Bỏ qua)
          </button>
        </div>
      </footer>
    </div>
  )
}
