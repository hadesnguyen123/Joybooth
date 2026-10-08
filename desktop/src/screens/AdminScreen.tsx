import { useState } from 'react'
import { useAppStore, THEME_OPTIONS } from '../store/appStore'
import { joyBoothApi, isBrowser, mockApi } from '../lib/api'
import './AdminScreen.css'

type AdminTab = 'event' | 'frames' | 'hardware' | 'cloud' | 'payment' | 'stats'

export default function AdminScreen() {
  const {
    setScreen,
    eventConfig,
    setEventConfig,
    boothMode,
    setBoothMode,
    availableCameras,
    selectedCameraId,
    selectCamera,
  } = useAppStore()

  // PIN Lock State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [pinCode, setPinCode] = useState<string>('')
  const [pinError, setPinError] = useState<boolean>(false)

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('event')

  // Mock stats
  const sessionCount = 42
  const printCount = 68

  function handlePinInput(digit: string) {
    if (pinCode.length >= 4) return
    const newPin = pinCode + digit
    setPinCode(newPin)

    if (newPin.length === 4) {
      if (newPin === '1234') {
        setIsAuthenticated(true)
        setPinError(false)
      } else {
        setPinError(true)
        setTimeout(() => {
          setPinCode('')
          setPinError(false)
        }, 600)
      }
    }
  }

  function handlePinClear() {
    setPinCode('')
  }

  // Nếu chưa nhập đúng PIN, hiển thị PIN Pad
  if (!isAuthenticated) {
    return (
      <div className="admin-screen" id="admin-screen">
        <div className="admin-lock-screen">
          <div className="pin-pad-card">
            <h2 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-primary)' }}>
              🔒 Quản Trị JoyBooth
            </h2>
            <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>
              Nhập mã PIN để truy cập cài đặt (Mặc định: 1234)
            </p>

            <div className="pin-display">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`pin-dot ${idx < pinCode.length ? 'filled' : ''}`}
                  style={pinError ? { borderColor: '#ef4444', background: '#ef4444' } : {}}
                />
              ))}
            </div>

            <div className="pin-grid">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '←'].map((key) => (
                <button
                  key={key}
                  className="pin-btn"
                  onClick={() => {
                    if (key === 'C') handlePinClear()
                    else if (key === '←') setPinCode((p) => p.slice(0, -1))
                    else handlePinInput(key)
                  }}
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.85rem', marginTop: 8 }}
              onClick={() => setScreen('idle')}
            >
              ← Quay lại Màn hình chính
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-screen" id="admin-screen">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-title">
          <span>⚙️</span>
          <span>JoyBooth Control Panel</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn btn-primary"
            onClick={() => setScreen('capture')}
            style={{ fontSize: '0.85rem' }}
          >
            📸 Vào Chế Độ Chụp
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setScreen('idle')}
            style={{ fontSize: '0.85rem' }}
          >
            ✕ Thoát Admin
          </button>
        </div>
      </header>

      {/* Main 2-Pane Admin Body */}
      <div className="admin-body">
        {/* Navigation Sidebar */}
        <nav className="admin-sidebar">
          <div
            className={`admin-nav-item ${activeTab === 'event' ? 'active' : ''}`}
            onClick={() => setActiveTab('event')}
          >
            <span>📅</span>
            <span>Cấu Hình Sự Kiện</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'frames' ? 'active' : ''}`}
            onClick={() => setActiveTab('frames')}
          >
            <span>🖼️</span>
            <span>Quản Lý Khung Hình</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'hardware' ? 'active' : ''}`}
            onClick={() => setActiveTab('hardware')}
          >
            <span>📷</span>
            <span>Thiết Bị & Máy In</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            <span>☁️</span>
            <span>Google Drive & Timelapse</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            <span>💳</span>
            <span>Thanh Toán Kiosk (VietQR)</span>
          </div>

          <div
            className={`admin-nav-item ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <span>📊</span>
            <span>Thống Kê & Báo Cáo</span>
          </div>
        </nav>

        {/* Tab Content Panes */}
        <main className="admin-main">
          {activeTab === 'event' && (
            <div>
              <h2 className="tab-pane-title">Cấu Hình Sự Kiện</h2>
              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">Tên Sự Kiện</label>
                  <input
                    type="text"
                    className="form-input"
                    value={eventConfig.eventName}
                    onChange={(e) => setEventConfig({ eventName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Người Vận Hành (Operator)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={eventConfig.operatorName}
                    placeholder="VD: JoyBooth Team"
                    onChange={(e) => setEventConfig({ operatorName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Chế Độ Chụp Chính</label>
                  <select
                    className="form-input"
                    value={eventConfig.captureMode || 'photobooth'}
                    onChange={(e) => setEventConfig({ captureMode: e.target.value as any })}
                  >
                    <option value="photobooth">📸 Photobooth Cổ Điển (Chụp theo số khung hình, hỗ trợ xóa & chụp lại)</option>
                    <option value="selfbooth">⏱️ Selfbooth Tự Do (Chụp không giới hạn trong thời gian quy định)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Thời Gian Giới Hạn Selfbooth (Mặc định: 1 phút)
                  </label>
                  <select
                    className="form-input"
                    value={eventConfig.selfboothDurationSeconds || 60}
                    onChange={(e) => setEventConfig({ selfboothDurationSeconds: Number(e.target.value) })}
                  >
                    <option value={30}>30 Giây (Chụp nhanh thử nghiệm)</option>
                    <option value={60}>1 Phút (60 giây - Khuyên Dùng)</option>
                    <option value={90}>1 Phút 30 Giây (90 giây)</option>
                    <option value={120}>2 Phút (120 giây)</option>
                    <option value={180}>3 Phút (180 giây)</option>
                    <option value={300}>5 Phút (300 giây)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 4, display: 'block' }}>
                    Khách có thể bấm chụp liên tục không giới hạn ảnh trong thời gian này, sau đó tự chọn ảnh đẹp nhất vào khung.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Chế Độ Vận Hành</label>
                  <select
                    className="form-input"
                    value={boothMode}
                    onChange={(e) => setBoothMode(e.target.value as any)}
                  >
                    <option value="unattended">Tự Động (Unattended - Khách tự chụp)</option>
                    <option value="attended">Có Người Hỗ Trợ (Attended - Operator)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Thời Gian Đếm Ngược (Giây)</label>
                  <select
                    className="form-input"
                    value={eventConfig.countdownSeconds}
                    onChange={(e) => setEventConfig({ countdownSeconds: Number(e.target.value) })}
                  >
                    <option value={3}>3 Giây</option>
                    <option value={5}>5 Giây</option>
                    <option value={10}>10 Giây</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Số Lượng Bản In Tối Đa / Lần</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={10}
                    value={eventConfig.printCopies}
                    onChange={(e) => setEventConfig({ printCopies: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Thời Gian Chờ Màn Hình Review (Giây)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={15}
                    max={120}
                    value={eventConfig.idleTimeoutSeconds}
                    onChange={(e) => setEventConfig({ idleTimeoutSeconds: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'frames' && (
            <div>
              <h2 className="tab-pane-title">Quản Lý Khung Hình & Chủ Đề ({THEME_OPTIONS.length} mẫu)</h2>
              <div className="admin-frames-grid">
                {THEME_OPTIONS.map((theme) => (
                  <div key={theme.id} className="admin-frame-card" style={{ borderTop: `4px solid ${theme.borderColor}` }}>
                    <span style={{ fontSize: '1.8rem' }}>{theme.decorations ? theme.decorations[0] : '🎨'}</span>
                    <span style={{ fontWeight: 700 }}>{theme.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-pink-primary)' }}>
                      Danh mục: {theme.category}
                    </span>
                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', width: '100%' }}>
                      Đang Kích Hoạt
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div>
              <h2 className="tab-pane-title">Thiết Bị Ngoại Vi</h2>
              <div className="admin-form-grid">
                <div className="form-group">
                  <label className="form-label">Camera Sử Dụng ({availableCameras.length} thiết bị phát hiện)</label>
                  <select
                    className="form-input"
                    value={selectedCameraId || ''}
                    onChange={(e) => selectCamera(e.target.value)}
                  >
                    {availableCameras.length > 0 ? (
                      availableCameras.map((cam) => (
                        <option key={cam.id} value={cam.id}>
                          📷 {cam.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Integrated Camera / Laptop Webcam (Mặc định)</option>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Máy In Ảnh Mặc Định</label>
                  <select className="form-input">
                    <option>HiTi P525L Photo Printer (Khổ 4x6 / 2x6 Strip)</option>
                    <option>DNP DS-RX1HS High-Speed Dye Sub</option>
                    <option>Canon Selphy CP1500 (USB/WiFi)</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">📁 Thư Mục Lưu Ảnh Mặc Định (Downloads)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, backgroundColor: '#f8fafc' }}
                      value={eventConfig.saveDirectory || 'Downloads/JoyBooth'}
                      onChange={(e) => setEventConfig({ saveDirectory: e.target.value })}
                      placeholder="Downloads/JoyBooth"
                    />
                    <button
                      className="btn btn-pink"
                      style={{ padding: '10px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const api = isBrowser ? mockApi : joyBoothApi
                        api.storage.openFolder()
                      }}
                      title="Mở thư mục Downloads trong Finder / File Explorer"
                    >
                      📂 Mở Thư Mục
                    </button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 6 }}>
                    ⚡ <strong>Mặc định:</strong> Ảnh chụp đơn và dải ảnh in hoàn chỉnh sẽ được tự động lưu trực tiếp vào thư mục <strong>Downloads/JoyBooth</strong> của máy tính này.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div>
              <h2 className="tab-pane-title">Google Drive & Video Timelapse</h2>

              {/* Card 1: Video Timelapse */}
              <div
                style={{
                  marginBottom: 20,
                  padding: 20,
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1.5px solid rgba(45, 36, 38, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-pink-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🎬</span>
                      <span>Video Timelapse Tự Động</span>
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
                      Quay video hậu trường tua nhanh trong suốt buổi chụp bằng 1 camera duy nhất.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={eventConfig.timelapseEnabled}
                      onChange={(e) => setEventConfig({ timelapseEnabled: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--color-pink-primary)' }}
                    />
                    <span>{eventConfig.timelapseEnabled ? 'Đang Bật' : 'Tắt'}</span>
                  </label>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Tốc Độ Tua Nhanh (Playback Speed)</label>
                    <select
                      className="form-input"
                      value={eventConfig.timelapseSpeed || 2.5}
                      onChange={(e) => setEventConfig({ timelapseSpeed: Number(e.target.value) })}
                      disabled={!eventConfig.timelapseEnabled}
                    >
                      <option value={1.5}>1.5x (Chuyển động nhẹ nhàng)</option>
                      <option value={2.0}>2.0x (Tiêu chuẩn)</option>
                      <option value={2.5}>2.5x (Khuyên dùng - Nhanh vừa & Vui nhộn)</option>
                      <option value={3.0}>3.0x (Tua nhanh sống động)</option>
                      <option value={4.0}>4.0x (Siêu nhanh / Boomerang style)</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, marginTop: 14, borderLeft: '4px solid #3b82f6' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                    💡 Cơ chế hoạt động với 1 Camera duy nhất:
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    Trong khi khách hàng chụp, JoyBooth tận dụng trực tiếp luồng stream video liên tục của camera thông qua phần cứng (MediaRecorder). Tại mỗi lần đếm ngược chụp ảnh, khung hình tĩnh chất lượng cao được lưu độc lập mà không hề làm gián đoạn việc ghi video liên tục.
                  </p>
                </div>
              </div>

              {/* Card 2: Google Drive Cloud Sync */}
              <div
                style={{
                  padding: 20,
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1.5px solid rgba(45, 36, 38, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-pink-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>☁️</span>
                      <span>Đồng Bộ Google Drive (Cloud Storage)</span>
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
                      Tự động đưa toàn bộ ảnh đơn, ảnh strip và video timelapse lên Google Drive để khách quét QR tải về.
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={eventConfig.gdriveEnabled}
                      onChange={(e) => setEventConfig({ gdriveEnabled: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--color-pink-primary)' }}
                    />
                    <span>{eventConfig.gdriveEnabled ? 'Đang Bật' : 'Tắt'}</span>
                  </label>
                </div>

                <div className="admin-form-grid">
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label">Đường Dẫn Thư Mục Google Drive (Folder URL)</label>
                      {eventConfig.gdriveFolderUrl && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '2px 10px', color: 'var(--color-pink-primary)' }}
                          onClick={() => window.open(eventConfig.gdriveFolderUrl, '_blank')}
                        >
                          🔗 Mở Trên Trình Duyệt
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.gdriveFolderUrl || ''}
                      placeholder="https://drive.google.com/drive/folders/1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU"
                      onChange={(e) => setEventConfig({ gdriveFolderUrl: e.target.value })}
                      disabled={!eventConfig.gdriveEnabled}
                    />
                    <small style={{ color: '#888', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                      Thư mục cha chứa các folder con theo ngày & giờ chụp (JoyBooth_YYYY-MM-DD_HH-mm).
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mã Thư Mục Cha (Parent Folder ID)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.gdriveFolderId || ''}
                      placeholder="1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU"
                      onChange={(e) => setEventConfig({ gdriveFolderId: e.target.value })}
                      disabled={!eventConfig.gdriveEnabled}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tự Động Tạo Subfolder & Đẩy Lên Drive</label>
                    <select
                      className="form-input"
                      value={eventConfig.gdriveAutoSync ? 'yes' : 'no'}
                      onChange={(e) => setEventConfig({ gdriveAutoSync: e.target.value === 'yes' })}
                      disabled={!eventConfig.gdriveEnabled}
                    >
                      <option value="yes">Bật (Tạo folder JoyBooth_YYYY-MM-DD_HH-mm & Đẩy lên)</option>
                      <option value="no">Tắt (Chỉ lưu cục bộ trên máy)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">
                      Google Apps Script Webhook URL (Tùy chọn - Cloud Auto-Create)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.gdriveWebhookUrl || ''}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      onChange={(e) => setEventConfig({ gdriveWebhookUrl: e.target.value })}
                      disabled={!eventConfig.gdriveEnabled}
                    />
                    <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                      Nếu có Webhook, JoyBooth sẽ tự động gọi Google Drive API tạo folder con thật sự trên Cloud và sinh link chia sẻ trực tiếp cho mã QR.
                    </small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 className="tab-pane-title" style={{ marginBottom: 4 }}>💳 Cổng Thanh Toán Kiosk (VietQR Tự Động)</h2>
                  <p style={{ fontSize: '0.85rem', color: '#666' }}>
                    Tự động tạo mã QR động ngân hàng chuẩn NAPAS 24/7 để thu tiền trước khi cho khách chụp ảnh.
                  </p>
                </div>

                <button
                  className="btn btn-pill-white"
                  style={{ fontSize: '0.85rem', padding: '8px 18px', borderColor: 'var(--color-pink-primary)', color: 'var(--color-pink-primary)', fontWeight: 700 }}
                  onClick={() => setScreen('payment')}
                  title="Chuyển đến màn hình thanh toán để xem trước giao diện"
                >
                  👁️ Xem Trước Màn Hình Thanh Toán
                </button>
              </div>

              {/* Status Notice Box */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: eventConfig.paymentQrEnabled ? '#f0fdf4' : '#fff1f2',
                  border: `1.5px solid ${eventConfig.paymentQrEnabled ? '#86efac' : '#fecdd3'}`,
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      background: eventConfig.paymentQrEnabled ? '#16a34a' : '#e11d48',
                      color: '#ffffff',
                      marginBottom: 6,
                    }}
                  >
                    {eventConfig.paymentQrEnabled ? '🟢 ĐANG BẬT (ACTIVE)' : '🔴 TẠM THỜI TẮT (DISABLED)'}
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, fontWeight: 500 }}>
                    {eventConfig.paymentQrEnabled
                      ? 'Kiosk đang yêu cầu khách quét mã QR thanh toán trước khi vào chụp.'
                      : 'Đang tắt theo cấu hình: Khách hàng sẽ vào thẳng màn hình chụp sau khi chọn layout (Bỏ qua bước thanh toán).'}
                  </p>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem' }}>
                  <input
                    type="checkbox"
                    checked={eventConfig.paymentQrEnabled}
                    onChange={(e) => setEventConfig({ paymentQrEnabled: e.target.checked })}
                    style={{ width: 22, height: 22, accentColor: 'var(--color-pink-primary)' }}
                  />
                  <span>{eventConfig.paymentQrEnabled ? 'Bật Thanh Toán' : 'Bật (Hiện Tắt)'}</span>
                </label>
              </div>

              {/* Bank Details Form Card */}
              <div
                style={{
                  padding: 22,
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1.5px solid rgba(45, 36, 38, 0.08)',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-dark-text)', marginBottom: 16 }}>
                  🏦 Thông Tin Tài Khoản Thụ Hưởng
                </h3>

                <div className="admin-form-grid">
                  <div className="form-group">
                    <label className="form-label">Ngân Hàng Thụ Hưởng</label>
                    <select
                      className="form-input"
                      value={eventConfig.bankBin || '970422'}
                      onChange={(e) => {
                        const bin = e.target.value
                        const bankNames: Record<string, string> = {
                          '970422': 'MB Bank (Quân Đội)',
                          '970436': 'Vietcombank (Ngoại Thương)',
                          '970407': 'Techcombank (Kỹ Thương)',
                          '970416': 'ACB (Á Châu)',
                          '970432': 'VPBank (Việt Nam Thịnh Vượng)',
                          '970423': 'TPBank (Tiên Phong)',
                          '970418': 'BIDV (Đầu Tư & Phát Triển)',
                          '970405': 'Agribank (Nông Nghiệp)',
                        }
                        setEventConfig({ bankBin: bin, bankName: bankNames[bin] || 'Ngân hàng' })
                      }}
                    >
                      <option value="970422">MB Bank (Quân Đội) - 970422</option>
                      <option value="970436">Vietcombank - 970436</option>
                      <option value="970407">Techcombank - 970407</option>
                      <option value="970416">ACB - 970416</option>
                      <option value="970432">VPBank - 970432</option>
                      <option value="970423">TPBank - 970423</option>
                      <option value="970418">BIDV - 970418</option>
                      <option value="970405">Agribank - 970405</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Số Tài Khoản</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.accountNumber || ''}
                      placeholder="VD: 0388889999"
                      onChange={(e) => setEventConfig({ accountNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tên Chủ Tài Khoản (Không dấu)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.accountHolder || ''}
                      placeholder="VD: NGUYEN VAN A"
                      onChange={(e) => setEventConfig({ accountHolder: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn Giá Gói Dải 2x6 Inch (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.price2x6 || 50000}
                      onChange={(e) => setEventConfig({ price2x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn Giá Gói Postcard 4x6 Inch (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.price4x6 || 70000}
                      onChange={(e) => setEventConfig({ price4x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giá In Thêm 2x6 Inch (+2 dải) (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.extraCopyPrice2x6 || 25000}
                      onChange={(e) => setEventConfig({ extraCopyPrice2x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giá In Thêm 4x6 Inch (+1 postcard) (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.extraCopyPrice4x6 || 35000}
                      onChange={(e) => setEventConfig({ extraCopyPrice4x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bắt Buộc Thanh Toán Cho Photobooth</label>
                    <select
                      className="form-input"
                      value={eventConfig.paymentRequiredForPhotobooth ? 'yes' : 'no'}
                      onChange={(e) => setEventConfig({ paymentRequiredForPhotobooth: e.target.value === 'yes' })}
                    >
                      <option value="yes">Bật (Chọn bố cục ➔ Thanh toán ➔ Chụp)</option>
                      <option value="no">Tắt (Vào chụp ngay không cần thanh toán)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Bắt Buộc Thanh Toán Cho Selfbooth</label>
                    <select
                      className="form-input"
                      value={eventConfig.paymentRequiredForSelfbooth ? 'yes' : 'no'}
                      onChange={(e) => setEventConfig({ paymentRequiredForSelfbooth: e.target.value === 'yes' })}
                    >
                      <option value="no">Tắt (Mặc định: Vào thẳng màn hình chụp tự do)</option>
                      <option value="yes">Bật (Yêu cầu thanh toán trước khi mở camera)</option>
                    </select>
                  </div>
                </div>

                {/* Danh sách mã giảm giá */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginBottom: 10 }}>
                    🏷️ Danh Sách Mã Giảm Giá / Voucher Ưu Đãi Đang Kích Hoạt:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {(eventConfig.discountCoupons || []).map((cp) => (
                      <div
                        key={cp.code}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 10,
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#db2777', fontSize: '0.9rem' }}>{cp.code}</strong>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#fce7f3', color: '#be185d', padding: '2px 6px', borderRadius: 6 }}>
                            {cp.type === 'percent' ? `-${cp.value}%` : `-${cp.value.toLocaleString()}đ`}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{cp.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h2 className="tab-pane-title">Thống Kê Hôm Nay</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    TỔNG LƯỢT CHỤP
                  </span>
                  <span className="stat-num">{sessionCount}</span>
                  <span style={{ fontSize: '0.75rem', color: '#10b981' }}>+12 lượt trong 1 giờ qua</span>
                </div>

                <div className="stat-card">
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    BẢN IN ĐÃ XUẤT
                  </span>
                  <span className="stat-num">{printCount}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-gold-dim)' }}>
                    Giấy còn lại trong khay: ~182 tờ
                  </span>
                </div>

                <div className="stat-card">
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                    LƯỢT QUÉT QR
                  </span>
                  <span className="stat-num">57</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    Tỷ lệ tải ảnh: 83.8%
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
