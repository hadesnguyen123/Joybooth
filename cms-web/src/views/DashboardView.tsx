import { useCms } from '../context/CmsContext'
import {
  Camera,
  Layers,
  Columns,
  Image as ImageIcon,
  HardDrive,
  AlertTriangle,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'

export default function DashboardView() {
  const { kpis, kiosks, transactions, toggleKioskLock, refillPaper } = useCms()

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)

  // Tính tỷ lệ dung lượng
  const storagePercent = Math.round((kpis.usedStorageGB / kpis.totalStorageGB) * 100)

  return (
    <div className="view-content fade-in">
      {/* ── 4 KPI CARDS (Matching Image 2 - Hera Booth) ── */}
      <section className="kpi-grid">
        {/* Card 1: Tổng số ảnh chụp */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Tổng số ảnh chụp</span>
            <div className="kpi-icon-wrap icon-pink">
              <Camera className="w-5 h-5 text-pink-500" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number">{kpis.totalPhotos.toLocaleString()}</span>
          </div>
          <span className="kpi-subtext text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> +28 ảnh trong hôm nay
          </span>
        </div>

        {/* Card 2: Tổng số phiên chụp */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Tổng số phiên chụp</span>
            <div className="kpi-icon-wrap icon-blue">
              <Layers className="w-5 h-5 text-sky-500" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number text-emerald-600">{kpis.totalSessions.toLocaleString()}</span>
          </div>
          <span className="kpi-subtext">Tổng số phiên chụp toàn hệ thống</span>
        </div>

        {/* Card 3: Tổng số layout */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Tổng số layout</span>
            <div className="kpi-icon-wrap icon-green">
              <Columns className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number text-emerald-600">{kpis.totalLayouts}</span>
          </div>
          <span className="kpi-subtext">Khổ dải Strip 2x6 & Postcard 4x6</span>
        </div>

        {/* Card 4: Tổng số khung hình */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Tổng số khung hình</span>
            <div className="kpi-icon-wrap icon-purple">
              <ImageIcon className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-number text-emerald-600">{kpis.totalFrames}</span>
          </div>
          <span className="kpi-subtext">Chủ đề: Pastel, Sinh nhật, Y2K, Wedding</span>
        </div>
      </section>

      {/* ── ROW 2: DUNG LƯỢNG HỆ THỐNG & DOANH THU ── */}
      <section className="dashboard-double-row">
        {/* Dung lượng hệ thống (Matching Image 2) */}
        <div className="content-card storage-card">
          <div className="card-header-line">
            <div>
              <h3 className="card-title flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-sky-500" /> Dung lượng hệ thống
              </h3>
              <p className="card-desc">
                Biểu đồ dung lượng đã sử dụng trên tổng {kpis.totalStorageGB} GB (Google Drive & Cloud)
              </p>
            </div>
            <span className="pill-badge">{storagePercent}% Đã dùng</span>
          </div>

          <div className="storage-donut-wrap">
            {/* Vòng tròn tỉ lệ trực quan */}
            <div
              className="donut-circle"
              style={{
                background: `conic-gradient(#0284c7 0% ${storagePercent}%, #e2e8f0 ${storagePercent}% 100%)`,
              }}
            >
              <div className="donut-hole">
                <span className="donut-num">{kpis.usedStorageGB} GB</span>
                <span className="donut-label">Đã dùng / {kpis.totalStorageGB} GB</span>
              </div>
            </div>

            <div className="storage-legend">
              <div className="legend-item">
                <span className="legend-color bg-sky-600"></span>
                <span>Ảnh dải Render & Video: <strong>{kpis.usedStorageGB} GB</strong></span>
              </div>
              <div className="legend-item">
                <span className="legend-color bg-slate-300"></span>
                <span>Dung lượng còn trống: <strong>{(kpis.totalStorageGB - kpis.usedStorageGB).toFixed(2)} GB</strong></span>
              </div>
              <div className="cleanup-notice">
                💡 Hệ thống tự động tối ưu và nén ảnh RAW sau 30 ngày để tiết kiệm dung lượng.
              </div>
            </div>
          </div>
        </div>

        {/* Doanh thu hôm nay */}
        <div className="content-card revenue-card">
          <div className="card-header-line">
            <div>
              <h3 className="card-title">Doanh thu & Dòng tiền hôm nay</h3>
              <p className="card-desc">Đối soát thời gian thực giữa VietQR và Tiền mặt</p>
            </div>
            <span className="total-amount-pill">{formatVND(kpis.totalRevenueVND)}</span>
          </div>

          <div className="revenue-split-grid">
            <div className="split-box vietqr-box">
              <div className="split-top">
                <span>Chuyển khoản VietQR</span>
                <span className="method-tag tag-qr">NAPAS 24/7</span>
              </div>
              <span className="split-num">{formatVND(kpis.vietQrRevenueVND)}</span>
              <span className="split-note text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Tiền đã vào tài khoản ngân hàng
              </span>
            </div>

            <div className="split-box cash-box">
              <div className="split-top">
                <span>Tiền mặt thu tại quầy</span>
                <span className="method-tag tag-cash">TIỀN MẶT</span>
              </div>
              <span className="split-num">{formatVND(kpis.cashRevenueVND)}</span>
              <span className="split-note text-amber-600">
                Nhân viên 2 ca nộp cuối ngày
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROW 3: TRẠNG THÁI 2 MÁY KIOSK THỜI GIAN THỰC ── */}
      <section className="content-card kiosks-status-card">
        <div className="card-header-line">
          <div>
            <h3 className="card-title">Giám sát 2 Máy Kiosk Thời Gian Thực</h3>
            <p className="card-desc">
              Theo dõi kết nối, cuộn giấy in nhiệt, nhiệt độ và điều khiển từ xa
            </p>
          </div>
          <span className="status-live-pill">🟢 2/2 Máy Hoạt Động Bình Thường</span>
        </div>

        <div className="kiosks-grid-live">
          {kiosks.map((kiosk) => {
            const paperPercent = Math.round((kiosk.paperRemaining / kiosk.paperCapacity) * 100)
            const isLowPaper = kiosk.paperRemaining < 50

            return (
              <div
                key={kiosk.id}
                className={`kiosk-card-item ${isLowPaper ? 'border-amber-300' : ''}`}
              >
                <div className="kiosk-item-top">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="kiosk-id-tag">{kiosk.id.toUpperCase()}</span>
                      <h4 className="kiosk-name">{kiosk.name}</h4>
                    </div>
                    <span className="kiosk-loc">{kiosk.location}</span>
                  </div>

                  <span className={`kiosk-badge-status ${kiosk.status}`}>
                    {kiosk.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>

                {/* Paper Status Track */}
                <div className="paper-status-block">
                  <div className="paper-info-line">
                    <span className="paper-title">
                      Cuộn giấy in ({kiosk.printerModel}):
                    </span>
                    <strong className={isLowPaper ? 'text-amber-600' : 'text-slate-800'}>
                      {kiosk.paperRemaining} / {kiosk.paperCapacity} tờ ({paperPercent}%)
                    </strong>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${isLowPaper ? 'fill-warning' : 'fill-good'}`}
                      style={{ width: `${paperPercent}%` }}
                    />
                  </div>

                  {isLowPaper && (
                    <div className="paper-warning-pill">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Cảnh báo: Sắp hết giấy cuộn! Cần chuẩn bị cuộn thay thế.</span>
                    </div>
                  )}
                </div>

                {/* Specs row */}
                <div className="specs-meta-row">
                  <span>📸 Camera: <strong>{kiosk.cameraModel}</strong></span>
                  <span>🌡️ Nhiệt độ: <strong>{kiosk.temperature}°C</strong></span>
                  <span>⏱️ Ping: <strong>{kiosk.lastHeartbeat}</strong></span>
                </div>

                {/* Remote Actions */}
                <div className="kiosk-action-row">
                  <button
                    className="btn-kiosk-action btn-refill"
                    onClick={() => refillPaper(kiosk.id, 400)}
                    title="Đặt lại bộ đếm sau khi nhân viên thay cuộn giấy mới"
                  >
                    <RotateCcw className="w-4 h-4" /> Thay Cuộn Mới (Reset 400)
                  </button>

                  <button
                    className={`btn-kiosk-action ${kiosk.isLocked ? 'btn-unlock' : 'btn-lock'}`}
                    onClick={() => toggleKioskLock(kiosk.id)}
                  >
                    {kiosk.isLocked ? (
                      <>
                        <Unlock className="w-4 h-4" /> Mở Khóa Máy
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" /> Khóa Tạm Thời
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── ROW 4: PHIÊN CHỤP GẦN ĐÂY ── */}
      <section className="content-card">
        <div className="card-header-line">
          <div>
            <h3 className="card-title">Giao dịch chụp ảnh gần đây</h3>
            <p className="card-desc">Cập nhật tự động từ 2 máy Kiosk</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Thời gian</th>
                <th>Máy Kiosk</th>
                <th>Khổ ảnh</th>
                <th>Số bản</th>
                <th>Phương thức</th>
                <th>Voucher</th>
                <th>Thành tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map((tx) => (
                <tr key={tx.id}>
                  <td>
                    <span className="order-mono">{tx.orderCode}</span>
                  </td>
                  <td>{tx.timestamp}</td>
                  <td>
                    <strong>{tx.kioskName}</strong>
                  </td>
                  <td>
                    <span className="size-badge">{tx.frameSize.toUpperCase()}</span>
                  </td>
                  <td>{tx.copies} bản</td>
                  <td>
                    <span className={`method-badge ${tx.paymentMethod}`}>
                      {tx.paymentMethod === 'vietqr' ? '💳 VietQR' : '💵 Tiền mặt'}
                    </span>
                  </td>
                  <td>
                    {tx.couponCode ? (
                      <span className="voucher-tag">{tx.couponCode}</span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td>
                    <strong>{formatVND(tx.amount)}</strong>
                  </td>
                  <td>
                    <span className="status-badge-completed">Thành công</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
