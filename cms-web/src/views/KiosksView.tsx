import { useCms } from '../context/CmsContext'
import {
  Monitor,
  Printer,
  Camera,
  RotateCcw,
  Lock,
  Unlock,
  AlertTriangle,
  MapPin,
  Cpu,
  Wifi,
} from 'lucide-react'

export default function KiosksView() {
  const { kiosks, toggleKioskLock, refillPaper } = useCms()

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Danh Sách Máy Kiosk ({kiosks.length} Máy)</h3>
          <p className="section-sub">
            Quản lý từ xa tình trạng phần cứng, kết nối mạng và cuộn giấy in cho từng chi nhánh
          </p>
        </div>
      </div>

      <div className="kiosks-detail-list">
        {kiosks.map((kiosk) => {
          const paperPercent = Math.round(
            (kiosk.paperRemaining / kiosk.paperCapacity) * 100
          )
          const isLow = kiosk.paperRemaining < 50

          return (
            <div key={kiosk.id} className="kiosk-detail-card">
              <div className="detail-card-header">
                <div className="flex items-center gap-3">
                  <div className="kiosk-avatar-box">
                    <Monitor className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="badge-kiosk-id">{kiosk.id.toUpperCase()}</span>
                      <h4 className="detail-kiosk-title">{kiosk.name}</h4>
                    </div>
                    <span className="detail-kiosk-loc flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {kiosk.location}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`kiosk-badge-status ${kiosk.status}`}>
                    {kiosk.status === 'online' ? '🟢 Đang hoạt động' : '🔴 Mất kết nối'}
                  </span>
                  {kiosk.isLocked && (
                    <span className="locked-badge">🔒 Đang khóa từ xa</span>
                  )}
                </div>
              </div>

              {/* Grid thông số phần cứng */}
              <div className="specs-hardware-grid">
                <div className="spec-card">
                  <Printer className="w-4 h-4 text-slate-500" />
                  <div className="spec-text">
                    <span className="spec-title">Máy In Nhiệt</span>
                    <strong>{kiosk.printerModel}</strong>
                  </div>
                </div>

                <div className="spec-card">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <div className="spec-text">
                    <span className="spec-title">Camera Chụp</span>
                    <strong>{kiosk.cameraModel}</strong>
                  </div>
                </div>

                <div className="spec-card">
                  <Cpu className="w-4 h-4 text-slate-500" />
                  <div className="spec-text">
                    <span className="spec-title">Nhiệt Độ Thùng Máy</span>
                    <strong>{kiosk.temperature}°C (Bình thường)</strong>
                  </div>
                </div>

                <div className="spec-card">
                  <Wifi className="w-4 h-4 text-slate-500" />
                  <div className="spec-text">
                    <span className="spec-title">Địa Chỉ IP Mạng</span>
                    <strong>{kiosk.ipAddress}</strong>
                  </div>
                </div>
              </div>

              {/* Khối quản lý cuộn giấy in */}
              <div className="paper-management-box">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm text-slate-700">
                    Trạng thái cuộn giấy in Dye-Sub:
                  </span>
                  <span
                    className={`font-bold text-sm ${
                      isLow ? 'text-amber-600' : 'text-slate-800'
                    }`}
                  >
                    Còn {kiosk.paperRemaining} / {kiosk.paperCapacity} tờ ({paperPercent}%)
                  </span>
                </div>

                <div className="progress-track h-3">
                  <div
                    className={`progress-fill ${
                      isLow ? 'fill-warning' : 'fill-good'
                    }`}
                    style={{ width: `${paperPercent}%` }}
                  />
                </div>

                {isLow && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Cuộn giấy còn dưới 50 tờ. Hãy thông báo nhân viên phụ trách thay cuộn mới trước giờ cao điểm!
                    </span>
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="detail-actions-bar">
                <button
                  className="btn-action-primary"
                  onClick={() => refillPaper(kiosk.id, 400)}
                >
                  <RotateCcw className="w-4 h-4" /> Đã Thay Cuộn Mới (Đặt Lại 400 Tờ)
                </button>

                <button
                  className={`btn-action-secondary ${
                    kiosk.isLocked ? 'text-emerald-700' : 'text-red-700'
                  }`}
                  onClick={() => toggleKioskLock(kiosk.id)}
                >
                  {kiosk.isLocked ? (
                    <>
                      <Unlock className="w-4 h-4" /> Mở Khóa Cho Khách Chụp
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Khóa Kiosk Tạm Thời
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
