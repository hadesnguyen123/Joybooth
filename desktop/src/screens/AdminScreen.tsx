import { useState, useEffect } from 'react'
import { useAppStore, THEME_OPTIONS, BEAUTY_PRESETS } from '../store/appStore'
import { fotolismApi, isBrowser, mockApi } from '../lib/api'
import {
  BRAND_NAME,
  SAVE_FOLDER_NAME,
  SAVE_ROOT_DIR,
  SESSION_FOLDER_PREFIX,
  DEFAULT_ADMIN_PIN,
  DEFAULT_BANK_BIN,
  DEFAULT_ACCOUNT_NUMBER,
  DEFAULT_ACCOUNT_HOLDER,
  DEFAULT_PRICE_2X6,
  DEFAULT_PRICE_4X6,
  DEFAULT_EXTRA_COPY_PRICE_2X6,
  DEFAULT_EXTRA_COPY_PRICE_4X6,
  DEFAULT_GDRIVE_FOLDER_ID,
  DEFAULT_GDRIVE_FOLDER_URL,
} from '../lib/constants'
import { BeautyCameraView } from '../components/BeautyCameraView'
import { ArrowLeft } from 'lucide-react'
import './AdminScreen.css'

type AdminTab = 'event' | 'beauty' | 'frames' | 'hardware' | 'cloud' | 'payment' | 'stats'

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
    slimFace,
    setSlimFace,
    skinSmoothing,
    setSkinSmoothing,
    whiteningTone,
    setWhiteningTone,
    rosyTone,
    setRosyTone,
    glowClarity,
    setGlowClarity,
    brightnessAdjust,
    setBrightnessAdjust,
    contrastAdjust,
    setContrastAdjust,
    saveBeautyConfig,
    resetAdjustments,
    applyBeautyPreset,
    selectedBeautyPreset,
    mirrorCamera,
    setMirrorCamera,
  } = useAppStore()

  // PIN Lock State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [pinCode, setPinCode] = useState<string>('')
  const [pinError, setPinError] = useState<boolean>(false)
  const [saveBeautySuccess, setSaveBeautySuccess] = useState<boolean>(false)
  const [adminStream, setAdminStream] = useState<MediaStream | null>(null)

  // Active Tab
  const [activeTab, setActiveTab] = useState<AdminTab>('event')

  // Camera & Driver Status (EOS Webcam Utility + digiCamControl)
  const [cameraDriverStatus, setCameraDriverStatus] = useState<{
    bundled: boolean
    installed: boolean
    cameraConnected: boolean
    cameraModel?: string
    setupPath?: string
    digiCamInstalled?: boolean
    digiCamBundled?: boolean
  } | null>(null)
  const [isInstallingDriver, setIsInstallingDriver] = useState<boolean>(false)
  const [isInstallingDigiCam, setIsInstallingDigiCam] = useState<boolean>(false)
  const [driverInstallNotice, setDriverInstallNotice] = useState<string | null>(null)
  const [isTestingShutter, setIsTestingShutter] = useState<boolean>(false)
  const [shutterTestResult, setShutterTestResult] = useState<string | null>(null)

  // Fotolism 2.2 Diagnostics & Multi-Monitor Overhead (FR-08, FR-09)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [overheadDisplays, setOverheadDisplays] = useState<any[]>([])
  const [overheadActive, setOverheadActive] = useState<boolean>(false)
  const [selectedDisplayId, setSelectedDisplayId] = useState<number | undefined>(undefined)
  const [isTogglingOverhead, setIsTogglingOverhead] = useState<boolean>(false)

  async function handleTestShutter() {
    setIsTestingShutter(true)
    setShutterTestResult(null)
    try {
      const api = isBrowser ? mockApi : fotolismApi
      const timestamp = Date.now()
      const testPath = `${SAVE_ROOT_DIR}/test_r100_${timestamp}.jpg`
      const res = await api.camera.edsdkCapture(testPath, 1)
      if (res?.success && res.data) {
        setShutterTestResult(`🎉 Thành công! Màn trập đã nảy, ảnh gốc 24MP lưu tại: ${res.data.savedPath}`)
      } else {
        setShutterTestResult(`❌ ${res?.error || 'Không kích hoạt được màn trập máy ảnh.'}`)
      }
    } catch (err: any) {
      setShutterTestResult(`❌ Lỗi: ${err.message}`)
    } finally {
      setIsTestingShutter(false)
    }
  }

  async function handleToggleOverhead() {
    setIsTogglingOverhead(true)
    try {
      const api = isBrowser ? mockApi : fotolismApi
      const nextActive = !overheadActive
      const res = await api.overhead.toggle(nextActive, selectedDisplayId)
      if (res?.success && res.data) {
        setOverheadActive(res.data.active)
      }
    } catch (err: any) {
      console.warn('Toggle overhead error:', err)
    } finally {
      setIsTogglingOverhead(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'hardware' && isAuthenticated) {
      const api = isBrowser ? mockApi : fotolismApi
      api.camera.getDriverStatus?.().then((res) => {
        if (res?.success && res.data) {
          setCameraDriverStatus(res.data)
        }
      }).catch(console.warn)

      const pollData = () => {
        api.camera.canonDiagnostics?.().then((res) => {
          if (res?.success && res.data) setDiagnostics(res.data)
        }).catch(console.warn)

        api.overhead.getDisplays?.().then((res) => {
          if (res?.success && res.data) setOverheadDisplays(res.data)
        }).catch(console.warn)

        api.overhead.status?.().then((res) => {
          if (res?.success && res.data) setOverheadActive(res.data.active)
        }).catch(console.warn)
      }

      pollData()
      const pollTimer = setInterval(pollData, 1800)
      return () => clearInterval(pollTimer)
    }
  }, [activeTab, isAuthenticated])

  async function handleInstallCanonDriver() {
    setIsInstallingDriver(true)
    setDriverInstallNotice(null)
    try {
      const api = isBrowser ? mockApi : fotolismApi
      const res = await api.camera.installCanonDriver()
      if (res?.success) {
        setDriverInstallNotice('✅ Đã mở trình cài đặt Canon EOS Webcam Utility. Vui lòng hoàn tất cài đặt theo hướng dẫn trên màn hình.')
        setTimeout(() => {
          api.camera.getDriverStatus?.().then((s) => {
            if (s?.success && s.data) setCameraDriverStatus(s.data)
          })
        }, 5000)
      } else {
        setDriverInstallNotice(`❌ ${res?.error || 'Không mở được bộ cài driver Canon.'}`)
      }
    } catch (err: any) {
      setDriverInstallNotice(`❌ ${err.message}`)
    } finally {
      setIsInstallingDriver(false)
    }
  }

  async function handleInstallDigiCam() {
    setIsInstallingDigiCam(true)
    setDriverInstallNotice(null)
    try {
      const api = isBrowser ? mockApi : fotolismApi
      const res = await api.camera.installDigiCam?.()
      if (res?.success) {
        setDriverInstallNotice('✅ Trình cài đặt digiCamControl đã mở trên màn hình! Vui lòng bấm Install/Next để hoàn tất cài đặt (khoảng 30 giây).')
        setTimeout(() => {
          api.camera.getDriverStatus?.().then((s) => {
            if (s?.success && s.data) setCameraDriverStatus(s.data)
          })
        }, 6000)
      } else {
        setDriverInstallNotice(`❌ ${res?.error || 'Không mở được bộ cài digiCamControl.'}`)
      }
    } catch (err: any) {
      setDriverInstallNotice(`❌ ${err.message}`)
    } finally {
      setIsInstallingDigiCam(false)
    }
  }

  // Khởi động camera preview khi vào tab Làm Đẹp
  useEffect(() => {
    let activeStream: MediaStream | null = null
    if (activeTab === 'beauty' && isAuthenticated) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: {
            deviceId: selectedCameraId ? { exact: selectedCameraId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        .then((s) => {
          activeStream = s
          setAdminStream(s)
        })
        .catch((err) => console.warn('Admin camera preview error:', err))
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop())
      }
      setAdminStream(null)
    }
  }, [activeTab, isAuthenticated, selectedCameraId])

  // Mock stats
  const sessionCount = 42
  const printCount = 68

  function handlePinInput(digit: string) {
    if (pinCode.length >= 4) return
    const newPin = pinCode + digit
    setPinCode(newPin)

    if (newPin.length === 4) {
      const validPin = eventConfig.adminPin || DEFAULT_ADMIN_PIN
      if (newPin === validPin) {
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
            <h2 className="pin-pad-title">
              🔒 Quản Trị {BRAND_NAME}
            </h2>
            <p className="pin-pad-sub">
              Nhập mã PIN để truy cập cài đặt (Mặc định: {DEFAULT_ADMIN_PIN})
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
              className="screen-back-btn"
              style={{ marginTop: 12 }}
              onClick={() => setScreen('idle')}
              title="Quay lại"
              aria-label="Quay lại"
            >
              <ArrowLeft size={24} strokeWidth={2} />
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
          <span>{BRAND_NAME} Control Panel</span>
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
            className={`admin-nav-item ${activeTab === 'beauty' ? 'active' : ''}`}
            onClick={() => setActiveTab('beauty')}
          >
            <span>✨</span>
            <span>Làm Đẹp & Camera</span>
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
            <span>🎬</span>
            <span>Video Timelapse & Google Drive</span>
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
                    placeholder={`VD: ${BRAND_NAME} Team`}
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

                <div className="form-group">
                  <label className="form-label">🔐 Mã PIN Quản Trị Hệ Thống (Bảo Mật)</label>
                  <input
                    type="password"
                    maxLength={8}
                    className="form-input"
                    value={eventConfig.adminPin || ''}
                    placeholder="Mã PIN riêng (Mặc định: 8888)"
                    onChange={(e) => setEventConfig({ adminPin: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 4, display: 'block' }}>
                    Thiết lập mã PIN riêng để bảo vệ các cài đặt kiosk Fotolism.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">🎬 Quay Video Timelapse Hậu Trường</label>
                  <select
                    className="form-input"
                    value={eventConfig.timelapseEnabled ? 'yes' : 'no'}
                    onChange={(e) => setEventConfig({ timelapseEnabled: e.target.value === 'yes' })}
                  >
                    <option value="yes">🟢 Bật (Tự động quay video hậu trường & xuất WebM)</option>
                    <option value="no">⚪ Tắt (Không quay video hậu trường)</option>
                  </select>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 4, display: 'block' }}>
                    Tự động ghi lại quá trình tạo dáng trong lúc đếm ngược và tạo video tua nhanh cho khách.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">⚡ Tốc Độ Tua Nhanh Timelapse</label>
                  <select
                    className="form-input"
                    value={eventConfig.timelapseSpeed || 2.5}
                    onChange={(e) => setEventConfig({ timelapseSpeed: Number(e.target.value) })}
                    disabled={!eventConfig.timelapseEnabled}
                  >
                    <option value={1.5}>1.5x (Chậm, xem rõ biểu cảm)</option>
                    <option value={2.0}>2.0x (Tự nhiên)</option>
                    <option value={2.5}>2.5x (Mặc định - Chuẩn Hàn Quốc Haru/Life4Cuts)</option>
                    <option value={3.0}>3.0x (Nhanh & Sôi động)</option>
                    <option value={4.0}>4.0x (Siêu tốc - TikTok / Reels Vibe)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'beauty' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 className="tab-pane-title" style={{ marginBottom: 4 }}>
                    ✨ Cấu Hình Làm Đẹp Mặc Định (Mặt Nhỏ & Da Mịn Trắng)
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                    Tự động áp dụng trực tiếp lên camera và mọi ảnh chụp của máy Kiosk. Lưu vĩnh viễn vào thiết bị.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: '0.82rem', padding: '8px 16px' }}
                    onClick={resetAdjustments}
                  >
                    🔄 Khôi Phục Mặc Định
                  </button>
                  <button
                    className="btn btn-pink"
                    style={{ fontSize: '0.85rem', padding: '8px 20px', fontWeight: 800 }}
                    onClick={() => {
                      saveBeautyConfig()
                      setSaveBeautySuccess(true)
                      setTimeout(() => setSaveBeautySuccess(false), 2500)
                    }}
                  >
                    {saveBeautySuccess ? '✅ Đã Lưu Thành Công!' : '💾 Lưu Mặc Định Cho Máy'}
                  </button>
                </div>
              </div>

              {saveBeautySuccess && (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1.5px solid #10b981',
                    borderRadius: 10,
                    padding: '10px 16px',
                    color: '#065f46',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    marginBottom: 16,
                  }}
                >
                  🎉 Đã lưu cấu hình làm đẹp mặc định (Thon gọn mặt {slimFace}%, Da mịn {skinSmoothing}%, Trắng sáng {whiteningTone}%) cho máy Kiosk!
                </div>
              )}

              {/* Presets Nhanh */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: 8 }}>
                  🌸 CHỌN NHANH PRESET LÀM ĐẸP CHUẨN:
                </span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {BEAUTY_PRESETS.map((preset) => {
                    const isActive = selectedBeautyPreset === preset.id
                    return (
                      <button
                        key={preset.id}
                        className={`beauty-preset-pill ${isActive ? 'active' : ''}`}
                        onClick={() => applyBeautyPreset(preset.id)}
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                      >
                        <span style={{ marginRight: 6 }}>{preset.icon}</span>
                        <span>{preset.name}</span>
                        {isActive && <span style={{ marginLeft: 6 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Cột Trái: Các thanh trượt tinh chỉnh chi tiết */}
                <div className="beauty-section-box" style={{ margin: 0 }}>
                  <div className="beauty-section-header">
                    <span>🎛️ THÔNG SỐ LÀM ĐẸP KHUÔN MẶT & LÀN DA</span>
                  </div>

                  <div className="beauty-slider-row">
                    <div className="beauty-slider-label">
                      <span>🌸 Thon Gọn Mặt (Mặt nhỏ / V-Line)</span>
                      <span className="beauty-val-badge">{slimFace}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={slimFace}
                      onChange={(e) => setSlimFace(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      Bóp nhẹ tỷ lệ bề ngang và kéo dài cằm V-line tự nhiên (Khuyên dùng: 25% - 45%)
                    </small>
                  </div>

                  <div className="beauty-slider-row">
                    <div className="beauty-slider-label">
                      <span>🌸 Làm Mịn Da (Skin Smoothing)</span>
                      <span className="beauty-val-badge">{skinSmoothing}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skinSmoothing}
                      onChange={(e) => setSkinSmoothing(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      Micro-blur làm mờ nếp nhăn và thu nhỏ lỗ chân lông (Khuyên dùng: 40% - 60%)
                    </small>
                  </div>

                  <div className="beauty-slider-row">
                    <div className="beauty-slider-label">
                      <span>🌸 Nâng Tone Trắng Sáng (Whitening)</span>
                      <span className="beauty-val-badge">{whiteningTone}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={whiteningTone}
                      onChange={(e) => setWhiteningTone(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      Tăng độ sáng bừng tự nhiên cho làn da trắng sứ (Khuyên dùng: 35% - 55%)
                    </small>
                  </div>

                  <div className="beauty-slider-row">
                    <div className="beauty-slider-label">
                      <span>🌸 Trắng Hồng Tự Nhiên (Rosy Tone)</span>
                      <span className="beauty-val-badge">{rosyTone}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={rosyTone}
                      onChange={(e) => setRosyTone(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      Tươi tắn sắc tố môi và má đào rạng rỡ (Khuyên dùng: 25% - 35%)
                    </small>
                  </div>

                  <div className="beauty-slider-row">
                    <div className="beauty-slider-label">
                      <span>🌸 Sáng Nét Chi Tiết (Clarity)</span>
                      <span className="beauty-val-badge">{glowClarity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={glowClarity}
                      onChange={(e) => setGlowClarity(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                    />
                    <small style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      Tăng tương phản viền mắt, sống mũi và chân mày (Khuyên dùng: 20% - 30%)
                    </small>
                  </div>
                </div>

                {/* Cột Phải: Ánh Sáng Cơ Bản & Mô Tả Trực Quan */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="beauty-section-box" style={{ margin: 0 }}>
                    <div className="beauty-section-header">
                      <span>💡 TINH CHỈNH ÁNH SÁNG STUDIO</span>
                    </div>

                    <div className="beauty-slider-row">
                      <div className="beauty-slider-label">
                        <span>Độ Sáng Gốc (Brightness)</span>
                        <span className="beauty-val-badge">{brightnessAdjust}%</span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="130"
                        value={brightnessAdjust}
                        onChange={(e) => setBrightnessAdjust(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                      />
                    </div>

                    <div className="beauty-slider-row">
                      <div className="beauty-slider-label">
                        <span>Độ Tương Phản Gốc (Contrast)</span>
                        <span className="beauty-val-badge">{contrastAdjust}%</span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="130"
                        value={contrastAdjust}
                        onChange={(e) => setContrastAdjust(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--color-pink-primary)' }}
                      />
                    </div>
                  </div>

                  {/* Live WebGL Mirror Preview */}
                  <div
                    style={{
                      background: '#18181b',
                      borderRadius: 14,
                      overflow: 'hidden',
                      height: 230,
                      position: 'relative',
                      border: '2px solid rgba(244, 114, 154, 0.45)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    {adminStream ? (
                      <BeautyCameraView
                        stream={adminStream}
                        mirrorCamera={mirrorCamera}
                        slimFace={slimFace}
                        skinSmoothing={skinSmoothing}
                        whiteningTone={whiteningTone}
                        rosyTone={rosyTone}
                        glowClarity={glowClarity}
                        brightnessAdjust={brightnessAdjust}
                        contrastAdjust={contrastAdjust}
                      />
                    ) : (
                      <div
                        style={{
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#9ca3af',
                          fontSize: '0.85rem',
                        }}
                      >
                        📷 Đang nạp camera xem trước...
                      </div>
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        fontSize: '0.72rem',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 700,
                        backdropFilter: 'blur(4px)',
                      }}
                    >
                      ✨ Xem Trực Tiếp Live View (WebGL Shader 60 FPS)
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        zIndex: 10,
                      }}
                    >
                      <button
                        type="button"
                        style={{
                          fontSize: '0.72rem',
                          padding: '4px 10px',
                          borderRadius: 6,
                          background: mirrorCamera ? 'var(--brand-primary, #502A1D)' : 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                        onClick={() => setMirrorCamera(!mirrorCamera)}
                        title="Bấm để bật/tắt lật gương camera"
                      >
                        🪞 Lật Gương: {mirrorCamera ? 'Bật (Mặc định)' : 'Tắt'}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#fdf2f8',
                      border: '1.5px solid #f4729a',
                      borderRadius: 14,
                      padding: 16,
                      fontSize: '0.85rem',
                      lineHeight: '1.6',
                      color: '#831843',
                    }}
                  >
                    <p style={{ fontWeight: 800, marginBottom: 8, fontSize: '0.95rem' }}>
                      ✨ Cơ chế hoạt động tự động:
                    </p>
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      <li>
                        <b>Mặt nhỏ (V-Line):</b> Tự động thon gọn tỷ lệ khuôn mặt khi khách đứng trước camera mà không gây méo khung nền.
                      </li>
                      <li>
                        <b>Da mịn & Trắng sáng:</b> Tự động xử lý da căng bóng mờ khuyết điểm và nâng tone rực rỡ trực tiếp trên live camera và file ảnh lưu.
                      </li>
                      <li>
                        Bấm <b>"Lưu Mặc Định Cho Máy"</b> để lưu cấu hình này vào bộ nhớ Kiosk, mọi lượt chụp kế tiếp sẽ tự động áp dụng.
                      </li>
                    </ul>
                  </div>
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
              <h2 className="tab-pane-title">Thiết Bị Ngoại Vi & Điều Khiển Camera</h2>

              {/* CARD: DRIVER & CAMERA TETHERING STATUS */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f4729a', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📷</span>
                      <span>Máy Ảnh Canon EOS & Bộ Điều Khiển Shutter 24MP</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: '4px 0 0 0' }}>
                      Kích hoạt màn trập máy ảnh thật để chụp ảnh gốc độ phân giải cao 24MP (thay vì cắt khung webcam).
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {!cameraDriverStatus?.digiCamInstalled && (
                      <button
                        className="btn btn-pink"
                        style={{
                          padding: '10px 18px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: '0 4px 18px rgba(244, 114, 154, 0.45)',
                          cursor: isInstallingDigiCam ? 'not-allowed' : 'pointer',
                          opacity: isInstallingDigiCam ? 0.7 : 1,
                        }}
                        disabled={isInstallingDigiCam}
                        onClick={handleInstallDigiCam}
                      >
                        {isInstallingDigiCam ? <>⏳ Đang mở...</> : <>⚡ Cài Đặt digiCamControl (24MP)</>}
                      </button>
                    )}
                    {!cameraDriverStatus?.installed && (
                      <button
                        className="btn btn-ghost"
                        style={{
                          padding: '10px 18px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          border: '1px solid rgba(255,255,255,0.2)',
                          color: '#fff',
                        }}
                        disabled={isInstallingDriver}
                        onClick={handleInstallCanonDriver}
                      >
                        {isInstallingDriver ? <>⏳ Đang mở...</> : <>Cài Driver Live View</>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Thông báo kết quả cài đặt */}
                {driverInstallNotice && (
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      marginBottom: 14,
                      background: driverInstallNotice.startsWith('✅') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: driverInstallNotice.startsWith('✅') ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      color: driverInstallNotice.startsWith('✅') ? '#4ade80' : '#f87171',
                    }}
                  >
                    {driverInstallNotice}
                  </div>
                )}

                {/* Grid trạng thái thiết bị */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    background: 'rgba(0,0,0,0.3)',
                    padding: 14,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Cáp USB Máy Ảnh
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cameraDriverStatus?.cameraConnected ? '#22c55e' : '#eab308' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: cameraDriverStatus?.cameraConnected ? '#4ade80' : '#fde047' }}>
                        {cameraDriverStatus?.cameraConnected ? (cameraDriverStatus.cameraModel || 'Canon EOS (Đã kết nối)') : 'Chưa cắm cáp USB'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Live View (Màn Hình Chờ)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cameraDriverStatus?.installed ? '#22c55e' : '#f97316' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: cameraDriverStatus?.installed ? '#4ade80' : '#fb923c' }}>
                        {cameraDriverStatus?.installed ? 'Đã sẵn sàng' : 'Chưa cài EOS Webcam'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Chụp Shutter 24MP Thật
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cameraDriverStatus?.digiCamInstalled ? '#22c55e' : '#ef4444' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: cameraDriverStatus?.digiCamInstalled ? '#4ade80' : '#f87171' }}>
                        {cameraDriverStatus?.digiCamInstalled ? 'Sẵn Sàng (24MP)' : 'Chưa cài digiCamControl'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nút Test Bấm Màn Trập Canon R100 Trực Tiếp */}
                <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={isTestingShutter}
                    onClick={handleTestShutter}
                    style={{
                      fontSize: '0.88rem',
                      padding: '10px 20px',
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      border: 'none',
                      cursor: isTestingShutter ? 'not-allowed' : 'pointer',
                      fontWeight: 800,
                    }}
                  >
                    {isTestingShutter ? '⏳ Đang gửi lệnh TakePicture()...' : '📸 Bấm Thử Màn Trập Canon R100 (24MP)'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '8px 14px' }}
                    onClick={() => {
                      const api = isBrowser ? mockApi : fotolismApi
                      api.camera.getDriverStatus?.().then((s) => {
                        if (s?.success && s.data) setCameraDriverStatus(s.data)
                      })
                    }}
                  >
                    🔄 Làm mới trạng thái
                  </button>
                </div>

                {shutterTestResult && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontSize: '0.82rem',
                      background: shutterTestResult.startsWith('🎉') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: shutterTestResult.startsWith('🎉') ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                      color: shutterTestResult.startsWith('🎉') ? '#4ade80' : '#f87171',
                      fontWeight: 600,
                      lineHeight: 1.5,
                    }}
                  >
                    {shutterTestResult}
                  </div>
                )}
              </div>

              {/* CARD: FOTOLISM 2.2 LIVE CAMERA DIAGNOSTICS & TELEMETRY (FR-09) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #18181b 0%, #1e1e24 100%)',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  color: '#fff',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>📊</span>
                      <span>Fotolism 2.2 — Giám Sát Trạng Thái & Telemetry Thời Gian Thực</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                      Theo dõi Camera State Machine, FPS Live View, độ trễ p95 và nhật ký kết nối PTP/USB-C.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        padding: '6px 14px',
                        borderRadius: 9999,
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background:
                          diagnostics?.cameraState === 'READY' || diagnostics?.cameraState === 'LIVEVIEW'
                            ? 'rgba(34, 197, 94, 0.2)'
                            : diagnostics?.cameraState === 'CAPTURING' || diagnostics?.cameraState === 'TRANSFERRING'
                            ? 'rgba(56, 189, 248, 0.2)'
                            : 'rgba(239, 68, 68, 0.2)',
                        border:
                          diagnostics?.cameraState === 'READY' || diagnostics?.cameraState === 'LIVEVIEW'
                            ? '1px solid rgba(34, 197, 94, 0.4)'
                            : diagnostics?.cameraState === 'CAPTURING' || diagnostics?.cameraState === 'TRANSFERRING'
                            ? '1px solid rgba(56, 189, 248, 0.4)'
                            : '1px solid rgba(239, 68, 68, 0.4)',
                        color:
                          diagnostics?.cameraState === 'READY' || diagnostics?.cameraState === 'LIVEVIEW'
                            ? '#4ade80'
                            : diagnostics?.cameraState === 'CAPTURING' || diagnostics?.cameraState === 'TRANSFERRING'
                            ? '#38bdf8'
                            : '#f87171',
                      }}
                    >
                      Trạng thái: {diagnostics?.cameraState || 'DISCONNECTED'}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 10,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Live View FPS</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8', marginTop: 2 }}>
                      {diagnostics?.evfFps ? diagnostics.evfFps.toFixed(1) : '0.0'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Độ Trễ Frame</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#4ade80', marginTop: 2 }}>
                      {diagnostics?.evfLatencyMs || 0} ms
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tổng Lần Chụp</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#facc15', marginTop: 2 }}>
                      {diagnostics?.totalCaptures || 0}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Thời Gian Chụp TB</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a78bfa', marginTop: 2 }}>
                      {diagnostics?.averageCaptureLatencyMs ? diagnostics.averageCaptureLatencyMs.toFixed(0) : 0} ms
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Tái Kết Nối USB</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fb923c', marginTop: 2 }}>
                      {diagnostics?.reconnectCount || 0}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Clients Stream</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#e879f9', marginTop: 2 }}>
                      {diagnostics?.activeLiveViewClients || 0}
                    </div>
                  </div>
                </div>

                {/* Structured Logs Viewer */}
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>
                    📜 Nhật Ký Sự Kiện Hệ Thống Gần Nhất (Ring Buffer)
                  </div>
                  <div
                    style={{
                      maxHeight: 140,
                      overflowY: 'auto',
                      background: '#09090b',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: '0.72rem',
                      fontFamily: 'Consolas, monospace',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {diagnostics?.recentLogs && diagnostics.recentLogs.length > 0 ? (
                      diagnostics.recentLogs.slice(-12).reverse().map((log: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: 4, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#64748b' }}>{log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) : ''}</span>
                          <span
                            style={{
                              color: log.level === 'ERROR' ? '#f87171' : log.level === 'WARN' ? '#fbbf24' : '#38bdf8',
                              fontWeight: 700,
                            }}
                          >
                            [{log.event}]
                          </span>
                          <span style={{ color: '#cbd5e1' }}>{log.details || ''}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#64748b' }}>Chưa có sự kiện nào được ghi nhận.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD: MULTI-MONITOR OVERHEAD DISPLAY MANAGER (FR-08) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #18181b 0%, #201a24 100%)',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  color: '#fff',
                  border: '1px solid rgba(232, 121, 249, 0.25)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#e879f9', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🖥️</span>
                      <span>Màn Hình Phụ Treo Cao (Overhead Display)</span>
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: '4px 0 0 0' }}>
                      Mở cửa sổ Live View tràn viền độc lập trên màn hình thứ hai (HDMI/DP) cho khách tạo dáng từ xa.
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn"
                      disabled={isTogglingOverhead}
                      onClick={handleToggleOverhead}
                      style={{
                        padding: '10px 20px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        borderRadius: 10,
                        background: overheadActive
                          ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                          : 'linear-gradient(135deg, #d946ef, #c026d3)',
                        color: '#fff',
                        border: 'none',
                        cursor: isTogglingOverhead ? 'not-allowed' : 'pointer',
                        boxShadow: overheadActive
                          ? '0 4px 16px rgba(239, 68, 68, 0.4)'
                          : '0 4px 16px rgba(217, 70, 239, 0.4)',
                      }}
                    >
                      {overheadActive ? '⏹️ Tắt Màn Hình Phụ Overhead' : '▶️ Bật Màn Hình Phụ Overhead'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <label style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', marginBottom: 4 }}>
                      Chọn Màn Hình Hiển Thị ({overheadDisplays.length} màn hình kết nối):
                    </label>
                    <select
                      className="form-input"
                      value={selectedDisplayId || ''}
                      onChange={(e) => setSelectedDisplayId(e.target.value ? Number(e.target.value) : undefined)}
                      style={{ background: '#09090b', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}
                    >
                      <option value="">Tự động (Ưu tiên màn hình phụ HDMI/DP)</option>
                      {overheadDisplays.map((disp) => (
                        <option key={disp.id} value={disp.id}>
                          {disp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: overheadActive ? '#22c55e' : '#71717a',
                        boxShadow: overheadActive ? '0 0 10px #22c55e' : 'none',
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: overheadActive ? '#4ade80' : '#a1a1aa' }}>
                      {overheadActive ? 'Đang phát sóng Overhead (Full HD MJPEG)' : 'Đang tắt'}
                    </span>
                  </div>
                </div>
              </div>

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
                  <label className="form-label">📁 Thư Mục Lưu Ảnh Mặc Định (Ổ D:\)</label>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1, backgroundColor: '#f8fafc' }}
                      value={eventConfig.saveDirectory || SAVE_ROOT_DIR}
                      onChange={(e) => setEventConfig({ saveDirectory: e.target.value })}
                      placeholder={SAVE_ROOT_DIR}
                    />
                    <button
                      className="btn btn-pink"
                      style={{ padding: '10px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const api = isBrowser ? mockApi : fotolismApi
                        api.storage.openFolder()
                      }}
                      title="Mở thư mục lưu ảnh trong File Explorer"
                    >
                      📂 Mở Thư Mục
                    </button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 6 }}>
                    ⚡ <strong>Mặc định:</strong> Ảnh chụp đơn và dải ảnh in hoàn chỉnh sẽ được tự động lưu trực tiếp vào thư mục <strong>D:\{SAVE_FOLDER_NAME}</strong> của máy tính này.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div>
              <h2 className="tab-pane-title">🎬 Video Timelapse & Google Drive</h2>

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
                      <span>Video Timelapse Tự Động Hậu Trường</span>
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#666', marginTop: 4 }}>
                      Tự động ghi lại quá trình tạo dáng vui nhộn của khách trong lúc đếm ngược và tạo video tua nhanh (.webm).
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={eventConfig.timelapseEnabled}
                      onChange={(e) => setEventConfig({ timelapseEnabled: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: 'var(--color-pink-primary)' }}
                    />
                    <span style={{ color: eventConfig.timelapseEnabled ? '#16a34a' : '#64748b', fontWeight: 800 }}>
                      {eventConfig.timelapseEnabled ? '🟢 ĐANG BẬT' : '⚪ ĐANG TẮT'}
                    </span>
                  </label>
                </div>

                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 12,
                    marginBottom: 16,
                    background: eventConfig.timelapseEnabled ? '#f0fdf4' : '#fff1f2',
                    border: `1.5px solid ${eventConfig.timelapseEnabled ? '#86efac' : '#fecdd3'}`,
                  }}
                >
                  <p style={{ fontSize: '0.84rem', margin: 0, color: eventConfig.timelapseEnabled ? '#166534' : '#9f1239', fontWeight: 600 }}>
                    {eventConfig.timelapseEnabled
                      ? '✅ Video hậu trường sẽ tự động ghi hình xuyên suốt phiên chụp (hỗ trợ cả Canon EOS EDSDK và Webcam), hiển thị ngay tại màn hình Đánh Giá và đồng bộ lên Google Drive.'
                      : '⏸️ Tính năng Timelapse đang tắt. Hệ thống sẽ chỉ tạo ảnh in tĩnh.'}
                  </p>
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
                      <option value={1.5}>1.5x (Chậm, chuyển động nhẹ nhàng)</option>
                      <option value={2.0}>2.0x (Tiêu chuẩn vừa phải)</option>
                      <option value={2.5}>2.5x (Khuyên dùng - Chuẩn Photobooth Hàn Quốc)</option>
                      <option value={3.0}>3.0x (Tua nhanh sôi động)</option>
                      <option value={4.0}>4.0x (Siêu nhanh - TikTok / Reels Vibe)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Định Dạng & Lưu Trữ</label>
                    <input
                      type="text"
                      className="form-input"
                      value="WebM (VP8/VP9) • F:\Fotolism_image\fotolism_timelapse_*.webm"
                      disabled
                      style={{ background: '#f8fafc', color: '#475569', fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: 14, borderRadius: 12, marginTop: 14, borderLeft: '4px solid #3b82f6' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>
                    💡 Cơ chế hoạt động với 1 Camera duy nhất:
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                    Trong khi khách hàng tạo dáng, hệ thống tự động ghi lại luồng video liên tục. Khi màn trập nổ, khung hình tĩnh chất lượng cao được lưu độc lập mà không hề làm gián đoạn việc ghi video hậu trường.
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
                      placeholder={DEFAULT_GDRIVE_FOLDER_URL}
                      onChange={(e) => setEventConfig({ gdriveFolderUrl: e.target.value })}
                      disabled={!eventConfig.gdriveEnabled}
                    />
                    <small style={{ color: '#888', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                      Thư mục cha chứa các folder con theo ngày & giờ chụp ({SESSION_FOLDER_PREFIX}_YYYY-MM-DD_HH-mm).
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mã Thư Mục Cha (Parent Folder ID)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.gdriveFolderId || ''}
                      placeholder={DEFAULT_GDRIVE_FOLDER_ID}
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
                      <option value="yes">Bật (Tạo folder {SESSION_FOLDER_PREFIX}_YYYY-MM-DD_HH-mm & Đẩy lên)</option>
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
                      Nếu có Webhook, Fotolism sẽ tự động gọi Google Drive API tạo folder con thật sự trên Cloud và sinh link chia sẻ trực tiếp cho mã QR.
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
                      value={eventConfig.bankBin || DEFAULT_BANK_BIN}
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
                      placeholder={`VD: ${DEFAULT_ACCOUNT_NUMBER}`}
                      onChange={(e) => setEventConfig({ accountNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Tên Chủ Tài Khoản (Không dấu)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={eventConfig.accountHolder || ''}
                      placeholder={`VD: ${DEFAULT_ACCOUNT_HOLDER}`}
                      onChange={(e) => setEventConfig({ accountHolder: e.target.value.toUpperCase() })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn Giá Gói Dải 2x6 Inch (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.price2x6 || DEFAULT_PRICE_2X6}
                      onChange={(e) => setEventConfig({ price2x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Đơn Giá Gói Postcard 4x6 Inch (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.price4x6 || DEFAULT_PRICE_4X6}
                      onChange={(e) => setEventConfig({ price4x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giá In Thêm 2x6 Inch (+2 dải) (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.extraCopyPrice2x6 || DEFAULT_EXTRA_COPY_PRICE_2X6}
                      onChange={(e) => setEventConfig({ extraCopyPrice2x6: Number(e.target.value) })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giá In Thêm 4x6 Inch (+1 postcard) (VND)</label>
                    <input
                      type="number"
                      step={5000}
                      className="form-input"
                      value={eventConfig.extraCopyPrice4x6 || DEFAULT_EXTRA_COPY_PRICE_4X6}
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
