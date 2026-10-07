import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import './PaymentScreen.css'

export default function PaymentScreen() {
  const {
    setScreen,
    selectedFrameSize,
    selectedLayout,
    eventConfig,
  } = useAppStore()

  const [orderCode] = useState(() => `JB${Date.now().toString().slice(-6)}`)
  const [secondsLeft, setSecondsLeft] = useState(90)
  const [isSimulatingSuccess, setIsSimulatingSuccess] = useState(false)

  const amount = selectedFrameSize === '2x6' ? (eventConfig.price2x6 || 50000) : (eventConfig.price4x6 || 70000)
  const formattedAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  // Link ảnh VietQR tự động sinh chuẩn NAPAS 24/7
  const vietQrImageUrl = `https://img.vietqr.io/image/${eventConfig.bankBin || '970422'}-${eventConfig.accountNumber || '0388889999'}-compact2.png?amount=${amount}&addInfo=${orderCode}&accountName=${encodeURIComponent(eventConfig.accountHolder || 'JOYBOOTH VIETNAM')}`

  // Đếm ngược phiên thanh toán (90 giây)
  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [secondsLeft])

  // Chuyển sang màn hình chụp ảnh khi thanh toán thành công
  function handleConfirmPaid() {
    setIsSimulatingSuccess(true)
    setTimeout(() => {
      setScreen('capture')
    }, 800)
  }

  return (
    <div className="payment-screen-container" id="payment-kiosk-screen">
      {/* Title */}
      <div className="screen-title-banner">
        <div className="title-bubble-badge">THANH TOÁN DỊCH VỤ PHOTOBOOTH</div>
      </div>

      <div className="payment-main-stage">
        {/* Cột trái: Tóm tắt đơn hàng */}
        <div className="order-summary-card">
          <div className="summary-badge-top">CHI TIẾT GÓI CHỤP</div>

          <div className="summary-info-row">
            <span className="summary-label">Khổ ảnh in:</span>
            <span className="summary-val highlight">
              {selectedFrameSize === '2x6' ? '🎞️ Dải Strip Đôi (2x6 inch)' : '🖼️ Bưu Thiếp Postcard (4x6 inch)'}
            </span>
          </div>

          <div className="summary-info-row">
            <span className="summary-label">Bố cục:</span>
            <span className="summary-val">{selectedLayout.name}</span>
          </div>

          <div className="summary-info-row">
            <span className="summary-label">Số ảnh chụp:</span>
            <span className="summary-val">{selectedLayout.photosCount} ảnh</span>
          </div>

          <div className="summary-info-row">
            <span className="summary-label">Mã giao dịch:</span>
            <span className="summary-val mono-badge">{orderCode}</span>
          </div>

          <hr className="summary-divider" />

          <div className="summary-total-box">
            <span className="total-label">TỔNG THANH TOÁN</span>
            <span className="total-amount-display">{formattedAmount}</span>
          </div>

          <div className="payment-instructions-pill">
            <p>1. Mở App Ngân hàng hoặc Ví MoMo/ZaloPay</p>
            <p>2. Quét mã VietQR trên màn hình</p>
            <p>3. Xác nhận chuyển tiền (Hệ thống tự động kích hoạt chụp)</p>
          </div>

          <div className="kiosk-status-notice">
            * Tính năng đang trong chế độ thử nghiệm (Testing Mode). Bạn có thể bấm nút "Bỏ qua & Vào chụp" bên dưới để test ngay!
          </div>
        </div>

        {/* Cột phải: Mã VietQR động & Trạng thái thanh toán */}
        <div className="vietqr-display-card">
          <div className="vietqr-box-frame">
            <img
              src={vietQrImageUrl}
              alt="Mã VietQR Thanh Toán"
              className="vietqr-real-image"
              onError={(e) => {
                // Fallback nếu máy tính không có internet để load từ img.vietqr.io
                e.currentTarget.style.display = 'none'
              }}
            />
            {/* Hiệu ứng tia quét radar */}
            <div className="qr-scan-line-anim"></div>
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
              <span>Nội dung:</span>
              <b className="code-tag">{orderCode}</b>
            </div>
          </div>

          {/* Thanh trạng thái đếm ngược */}
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
                style={{ width: `${(secondsLeft / 90) * 100}%` }}
              ></div>
            </div>
          </div>
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

        <button
          className={`btn btn-pink ${isSimulatingSuccess ? 'btn-success-anim' : ''}`}
          style={{ padding: '14px 44px', fontSize: '1.15rem' }}
          onClick={handleConfirmPaid}
        >
          {isSimulatingSuccess ? '✅ Đã Xác Nhận! Đang Vào Chụp...' : '⚡ Bỏ Qua & Vào Chụp (Test)'}
        </button>
      </footer>
    </div>
  )
}
