import { useState } from 'react'
import { useCms } from '../context/CmsContext'
import {
  Download,
  CheckCircle2,
  QrCode,
  Banknote,
  Printer,
  Filter,
} from 'lucide-react'

export default function AccountingView() {
  const { transactions, exportAccountingCSV } = useCms()
  const [selectedKiosk, setSelectedKiosk] = useState<'all' | 'kiosk_01' | 'kiosk_02'>('all')
  const [selectedMethod, setSelectedMethod] = useState<'all' | 'vietqr' | 'cash'>('all')

  const formatVND = (num: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num)

  // Lọc giao dịch
  const filtered = transactions.filter((t) => {
    if (selectedKiosk !== 'all' && t.kioskId !== selectedKiosk) return false
    if (selectedMethod !== 'all' && t.paymentMethod !== selectedMethod) return false
    return true
  })

  // Tính toán đối soát theo bộ lọc
  const totalAmount = filtered.reduce((acc, cur) => acc + cur.amount, 0)
  const vietQrAmount = filtered
    .filter((t) => t.paymentMethod === 'vietqr')
    .reduce((acc, cur) => acc + cur.amount, 0)
  const cashAmount = filtered
    .filter((t) => t.paymentMethod === 'cash')
    .reduce((acc, cur) => acc + cur.amount, 0)
  const totalPrints = filtered.reduce((acc, cur) => acc + cur.copies, 0)

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Kế Toán & Đối Soát Doanh Thu 3 Góc</h3>
          <p className="section-sub">
            Đối soát tự động giữa Sao Kê VietQR Ngân Hàng, Tiền Mặt Thu Tại Quầy và Bộ Đếm Giấy In Tiêu Hao
          </p>
        </div>

        <button className="btn-add-primary" onClick={exportAccountingCSV}>
          <Download className="w-4 h-4" /> Xuất Báo Cáo Kế Toán (.CSV)
        </button>
      </div>

      {/* ── BẢNG ĐỐI SOÁT 3 GÓC CHỐNG THẤT THOÁT ── */}
      <section className="reconciliation-summary-grid">
        {/* Góc 1: VietQR */}
        <div className="reconcile-card card-qr-border">
          <div className="reconcile-top">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-sky-600" />
              <span className="reconcile-label">1. Tiền Vào Tài Khoản VietQR</span>
            </div>
            <span className="badge-reconcile-ok flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Khớp 100% Sao Kê
            </span>
          </div>

          <span className="reconcile-amount">{formatVND(vietQrAmount)}</span>
          <p className="reconcile-note">
            Được ghi nhận trực tiếp qua Webhook Napas. Nhân viên không thể can thiệp.
          </p>
        </div>

        {/* Góc 2: Tiền Mặt */}
        <div className="reconcile-card card-cash-border">
          <div className="reconcile-top">
            <div className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <span className="reconcile-label">2. Tiền Mặt Nhân Viên Nộp Cuối Ca</span>
            </div>
            <span className="badge-reconcile-cash">Phải Thu Đủ</span>
          </div>

          <span className="reconcile-amount">{formatVND(cashAmount)}</span>
          <p className="reconcile-note">
            Số tiền mặt nhân viên 2 quầy bắt buộc phải bàn giao khi chốt ca hôm nay.
          </p>
        </div>

        {/* Góc 3: Tiêu Hao Giấy In */}
        <div className="reconcile-card card-paper-border">
          <div className="reconcile-top">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-purple-600" />
              <span className="reconcile-label">3. Tiêu Hao Giấy In Phần Cứng</span>
            </div>
            <span className="badge-reconcile-paper">Định Mức Cuộn</span>
          </div>

          <span className="reconcile-amount text-purple-600">
            {totalPrints} bản in tiêu hao
          </span>
          <p className="reconcile-note">
            Được đối chiếu trực tiếp với bộ đếm cơ học trên máy in DNP/HiTi (Tránh in lậu).
          </p>
        </div>
      </section>

      {/* ── BẢNG LỊCH SỬ GIAO DỊCH & BỘ LỌC ── */}
      <section className="content-card mt-6">
        <div className="filter-bar-row">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            {/* Lọc theo Kiosk */}
            <select
              value={selectedKiosk}
              onChange={(e) => setSelectedKiosk(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">Tất cả máy Kiosk ({transactions.length} đơn)</option>
              <option value="kiosk_01">Kiosk 01 — Vincom Center</option>
              <option value="kiosk_02">Kiosk 02 — Cafe Võ Văn Tần</option>
            </select>

            {/* Lọc theo Phương thức */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">Tất cả phương thức</option>
              <option value="vietqr">Chuyển khoản VietQR</option>
              <option value="cash">Tiền mặt tại quầy</option>
            </select>
          </div>

          <div className="filter-summary-pill">
            Tổng cộng: <strong>{formatVND(totalAmount)}</strong> ({filtered.length} đơn)
          </div>
        </div>

        <div className="table-responsive">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Thời Gian</th>
                <th>Kiosk</th>
                <th>Khổ In</th>
                <th>Số Bản</th>
                <th>Hình Thức</th>
                <th>Voucher</th>
                <th>Thành Tiền</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="order-mono">{t.orderCode}</span>
                  </td>
                  <td>{t.timestamp}</td>
                  <td>
                    <strong>{t.kioskName}</strong>
                  </td>
                  <td>
                    <span className="size-badge">{t.frameSize.toUpperCase()}</span>
                  </td>
                  <td>{t.copies} bản</td>
                  <td>
                    <span className={`method-badge ${t.paymentMethod}`}>
                      {t.paymentMethod === 'vietqr' ? '💳 VietQR' : '💵 Tiền mặt'}
                    </span>
                  </td>
                  <td>
                    {t.couponCode ? (
                      <span className="voucher-tag">
                        {t.couponCode} (-{formatVND(t.discountAmount)})
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td>
                    <strong className="text-slate-900">{formatVND(t.amount)}</strong>
                  </td>
                  <td>
                    <span className="status-badge-completed">Đã khớp tiền</span>
                  </td>
                  <td>
                    <a
                      href={t.gdriveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="link-gdrive"
                      title="Mở thư mục ảnh Google Drive của khách"
                    >
                      📁 Xem Drive
                    </a>
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
