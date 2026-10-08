import { useState } from 'react'
import { Save, CheckCircle2, Shield, Key, Cloud } from 'lucide-react'

export default function SettingsView() {
  const [bankBin, setBankBin] = useState('970422')
  const [accountNumber, setAccountNumber] = useState('0388889999')
  const [accountHolder, setAccountHolder] = useState('JOYBOOTH VIETNAM')
  const [cassoApiKey, setCassoApiKey] = useState('casso_sec_live_9981248012')
  const [gdriveFolderId, setGdriveFolderId] = useState('1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU')
  const [isSaved, setIsSaved] = useState(false)

  function handleSave() {
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="view-content fade-in">
      <div className="section-header-row">
        <div>
          <h3 className="section-title">Cấu Hình Kết Nối & Tích Hợp Hệ Thống</h3>
          <p className="section-sub">
            Cấu hình cổng VietQR ngân hàng, Webhook nhận tiền tự động và lưu trữ đám mây
          </p>
        </div>

        <button className="btn-add-primary" onClick={handleSave}>
          <Save className="w-4 h-4" /> {isSaved ? 'Đã Lưu Thành Công!' : 'Lưu Cấu Hình'}
        </button>
      </div>

      {isSaved && (
        <div className="alert-success-pill flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Cấu hình tích hợp mới đã được đồng bộ xuống Kiosk 01 và Kiosk 02!</span>
        </div>
      )}

      <div className="settings-grid">
        {/* Card 1: Cổng VietQR & Ngân Hàng */}
        <div className="content-card">
          <h4 className="settings-card-title flex items-center gap-2">
            <Shield className="w-5 h-5 text-pink-500" /> Tài Khoản Thụ Hưởng VietQR (Napas 24/7)
          </h4>
          <p className="settings-card-desc">
            Thông tin hiển thị trên mã QR của 2 máy Kiosk khi khách hàng thanh toán
          </p>

          <div className="settings-form-group">
            <label>Ngân hàng nhận tiền:</label>
            <select
              value={bankBin}
              onChange={(e) => setBankBin(e.target.value)}
              className="settings-input"
            >
              <option value="970422">MB Bank (Quân Đội) — 970422</option>
              <option value="970436">Vietcombank (Ngoại Thương) — 970436</option>
              <option value="970407">Techcombank — 970407</option>
              <option value="970416">ACB (Á Châu) — 970416</option>
              <option value="970432">VPBank — 970432</option>
            </select>
          </div>

          <div className="settings-form-group">
            <label>Số tài khoản ngân hàng:</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="settings-input"
            />
          </div>

          <div className="settings-form-group">
            <label>Tên chủ tài khoản (Viết hoa không dấu):</label>
            <input
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
              className="settings-input uppercase"
            />
          </div>
        </div>

        {/* Card 2: Webhook Báo Tiền Tự Động */}
        <div className="content-card">
          <h4 className="settings-card-title flex items-center gap-2">
            <Key className="w-5 h-5 text-sky-500" /> Webhook Báo Tiền Tự Động (Casso / SeAPay)
          </h4>
          <p className="settings-card-desc">
            Nhận diện biến động số dư ngân hàng và kích hoạt máy chụp ảnh sau 1–3 giây
          </p>

          <div className="settings-form-group">
            <label>Casso Secret API Key:</label>
            <input
              type="password"
              value={cassoApiKey}
              onChange={(e) => setCassoApiKey(e.target.value)}
              className="settings-input"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Trạng thái Webhook: <strong className="text-emerald-600">🟢 Đang hoạt động (Listening 24/7)</strong>
            </span>
          </div>

          <div className="settings-form-group">
            <label>Webhook Callback URL (Cung cấp cho Casso):</label>
            <input
              type="text"
              readOnly
              value="https://api.joybooth.vn/webhooks/casso-payment"
              className="settings-input bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Card 3: Lưu Trữ Google Drive & Cloud */}
        <div className="content-card">
          <h4 className="settings-card-title flex items-center gap-2">
            <Cloud className="w-5 h-5 text-purple-500" /> Đám Mây Lưu Trữ Ảnh Khách Hàng (Google Drive)
          </h4>
          <p className="settings-card-desc">
            Thư mục cha chứa các folder ảnh và video timelapse của từng phiên chụp
          </p>

          <div className="settings-form-group">
            <label>Google Drive Parent Folder ID:</label>
            <input
              type="text"
              value={gdriveFolderId}
              onChange={(e) => setGdriveFolderId(e.target.value)}
              className="settings-input font-mono text-sm"
            />
            <span className="text-xs text-slate-400 mt-1 block">
              Mỗi lượt chụp sẽ tự động tạo thư mục con dạng <code>JoyBooth_YYYY-MM-DD_HHhMM</code> bên trong folder này.
            </span>
          </div>

          <div className="settings-form-group">
            <label>Chế độ lưu trữ bổ sung (Cloudflare R2 CDN):</label>
            <select className="settings-input" defaultValue="hybrid">
              <option value="hybrid">Kết hợp (Google Drive cho khách + Cloudflare R2 backup)</option>
              <option value="gdrive_only">Chỉ dùng Google Drive</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
