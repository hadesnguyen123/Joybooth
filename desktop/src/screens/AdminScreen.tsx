import { useState } from 'react'
import { useAppStore, THEME_OPTIONS } from '../store/appStore'
import { joyBoothApi, isBrowser, mockApi } from '../lib/api'
import './AdminScreen.css'

type AdminTab = 'event' | 'frames' | 'hardware' | 'cloud' | 'stats'

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
                  <label className="form-label">Chế Độ Hoạt Động</label>
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
                    <label className="form-label">Đường Dẫn Thư Mục Google Drive (Folder URL)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.gdriveFolderUrl || ''}
                      placeholder="https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp..."
                      onChange={(e) => setEventConfig({ gdriveFolderUrl: e.target.value })}
                      disabled={!eventConfig.gdriveEnabled}
                    />
                    <small style={{ color: '#888', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                      Mã QR ở màn hình kết thúc sẽ dẫn trực tiếp khách hàng đến thư mục này.
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mã Thư Mục (Folder ID)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.gdriveFolderId || ''}
                      placeholder="1JoyBooth_Guest_Gallery_2026"
                      onChange={(e) => setEventConfig({ gdriveFolderId: e.target.value })}
                      disabled={!eventConfig.gdriveEnabled}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tự Động Đồng Bộ (Auto-Sync)</label>
                    <select
                      className="form-input"
                      value={eventConfig.gdriveAutoSync ? 'yes' : 'no'}
                      onChange={(e) => setEventConfig({ gdriveAutoSync: e.target.value === 'yes' })}
                      disabled={!eventConfig.gdriveEnabled}
                    >
                      <option value="yes">Bật (Tự động tải lên ngay sau khi chụp)</option>
                      <option value="no">Tắt (Chỉ lưu cục bộ trên máy)</option>
                    </select>
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
