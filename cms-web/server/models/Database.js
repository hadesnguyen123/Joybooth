import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_FILE = path.resolve(__dirname, '../data/database.json')

// Dữ liệu mẫu khởi tạo ban đầu cho hệ sinh thái JoyBooth
const INITIAL_DB = {
  kpis: {
    totalPhotos: 456,
    totalSessions: 1725,
    activeLayouts: 2,
    totalFrames: 87,
    usedStorageGB: 3.24,
    totalStorageGB: 4.88,
  },
  kiosks: [
    {
      id: 'kiosk_01',
      name: 'Kiosk 01 — Vincom Mega Mall',
      location: 'Tầng 3, Khu Vui Chơi, Vincom',
      ip: '192.168.1.101',
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      paperRemaining: 284,
      paperCapacity: 400,
      printerModel: 'DNP DS-RX1HS',
      printerStatus: 'ready',
      printerTemperature: 38,
      cameraModel: 'Canon EOS 1500D (DSLR)',
      cameraStatus: 'connected',
      currentVersion: 'v2.4.1',
      isLocked: false,
    },
    {
      id: 'kiosk_02',
      name: 'Kiosk 02 — Phố Đi Bộ & Cafe Hub',
      location: 'Sảnh Trệt, Joy Coffee Hub',
      ip: '192.168.1.102',
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      paperRemaining: 98,
      paperCapacity: 400,
      printerModel: 'DNP DS-RX1HS',
      printerStatus: 'warning_low_paper',
      printerTemperature: 41,
      cameraModel: 'Logitech Brio 4K Ultra HD',
      cameraStatus: 'connected',
      currentVersion: 'v2.4.1',
      isLocked: false,
    },
  ],
  pricing: {
    price2x6: 50000,
    price4x6: 70000,
    extraPrintPrice: 20000,
    selfboothPrice: 0,
    currency: 'VND',
    updatedAt: new Date().toISOString(),
  },
  coupons: [
    {
      code: 'JOYBOOTH20K',
      discountType: 'fixed',
      discountValue: 20000,
      minOrder: 50000,
      usageCount: 142,
      maxUsage: 500,
      isActive: true,
      expiresAt: '2026-12-31',
      description: 'Giảm 20.000đ cho khách check-in TikTok / Instagram',
    },
    {
      code: 'GENZ30',
      discountType: 'percent',
      discountValue: 30,
      minOrder: 50000,
      usageCount: 88,
      maxUsage: 200,
      isActive: true,
      expiresAt: '2026-11-30',
      description: 'Ưu đãi học sinh sinh viên cuối tuần',
    },
    {
      code: 'FREESHIP',
      discountType: 'fixed',
      discountValue: 10000,
      minOrder: 40000,
      usageCount: 45,
      maxUsage: 100,
      isActive: false,
      expiresAt: '2026-10-15',
      description: 'Mã khuyến mãi thử nghiệm sự kiện',
    },
  ],
  frames: [
    {
      id: 'f-2x6-pink-y2k',
      name: 'Y2K Sweet Pink Pastel',
      type: '2x6',
      slots: 4,
      thumbnail: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=300&auto=format&fit=crop&q=60',
      theme: 'Y2K Vibe',
      isActive: true,
      usageCount: 540,
    },
    {
      id: 'f-2x6-retro-film',
      name: 'Retro Film Noir 1990s',
      type: '2x6',
      slots: 4,
      thumbnail: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=300&auto=format&fit=crop&q=60',
      theme: 'Vintage',
      isActive: true,
      usageCount: 382,
    },
    {
      id: 'f-2x6-cyberpunk',
      name: 'Cyberpunk Neon Glow',
      type: '2x6',
      slots: 3,
      thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&auto=format&fit=crop&q=60',
      theme: 'Neon Future',
      isActive: true,
      usageCount: 295,
    },
    {
      id: 'f-4x6-wedding-gold',
      name: 'Luxury Gold Wedding Elegance',
      type: '4x6',
      slots: 6,
      thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=300&auto=format&fit=crop&q=60',
      theme: 'Wedding',
      isActive: true,
      usageCount: 210,
    },
    {
      id: 'f-4x6-birthday-confetti',
      name: 'Happy Birthday Pastel Party',
      type: '4x6',
      slots: 4,
      thumbnail: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300&auto=format&fit=crop&q=60',
      theme: 'Birthday',
      isActive: true,
      usageCount: 175,
    },
    {
      id: 'f-4x6-minimalist-white',
      name: 'Clean Studio Minimalist',
      type: '4x6',
      slots: 1,
      thumbnail: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&auto=format&fit=crop&q=60',
      theme: 'Minimalism',
      isActive: true,
      usageCount: 123,
    },
  ],
  transactions: [
    {
      id: 'TXN-90214',
      sessionId: 'SES-0810-001',
      kioskId: 'kiosk_01',
      kioskName: 'Kiosk 01 (Vincom)',
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      layoutType: '2x6',
      copies: 2,
      amount: 50000,
      paymentMethod: 'vietqr',
      couponCode: null,
      status: 'success',
      paperConsumed: 2,
      driveLink: 'https://drive.google.com/drive/folders/joybooth_demo_1',
    },
    {
      id: 'TXN-90213',
      sessionId: 'SES-0810-002',
      kioskId: 'kiosk_01',
      kioskName: 'Kiosk 01 (Vincom)',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      layoutType: '4x6',
      copies: 2,
      amount: 70000,
      paymentMethod: 'vietqr',
      couponCode: null,
      status: 'success',
      paperConsumed: 2,
      driveLink: 'https://drive.google.com/drive/folders/joybooth_demo_2',
    },
    {
      id: 'TXN-90212',
      sessionId: 'SES-0810-003',
      kioskId: 'kiosk_02',
      kioskName: 'Kiosk 02 (Phố Đi Bộ)',
      createdAt: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
      layoutType: '2x6',
      copies: 4,
      amount: 70000,
      paymentMethod: 'cash',
      couponCode: 'JOYBOOTH20K',
      status: 'success',
      paperConsumed: 4,
      driveLink: 'https://drive.google.com/drive/folders/joybooth_demo_3',
    },
    {
      id: 'TXN-90211',
      sessionId: 'SES-0810-004',
      kioskId: 'kiosk_02',
      kioskName: 'Kiosk 02 (Phố Đi Bộ)',
      createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      layoutType: '4x6',
      copies: 2,
      amount: 70000,
      paymentMethod: 'cash',
      couponCode: null,
      status: 'success',
      paperConsumed: 2,
      driveLink: 'https://drive.google.com/drive/folders/joybooth_demo_4',
    },
    {
      id: 'TXN-90210',
      sessionId: 'SES-0810-005',
      kioskId: 'kiosk_01',
      kioskName: 'Kiosk 01 (Vincom)',
      createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      layoutType: '2x6',
      copies: 2,
      amount: 50000,
      paymentMethod: 'vietqr',
      couponCode: null,
      status: 'success',
      paperConsumed: 2,
      driveLink: 'https://drive.google.com/drive/folders/joybooth_demo_5',
    },
  ],
  auditLogs: [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      type: 'system',
      message: 'JoyBooth CMS MVC Backend đã khởi động trên cổng 5181',
    },
  ],
  settings: {
    bankBin: '970422',
    bankName: 'MB Bank (Quân Đội)',
    accountNumber: '0388889999',
    accountHolder: 'JOYBOOTH VIETNAM',
    cassoApiKey: 'casso_sec_live_9981248012',
    gdriveFolderId: '1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU',
  },
}

class DatabaseService {
  constructor() {
    this._ensureDbFile()
  }

  _ensureDbFile() {
    const dir = path.dirname(DB_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf-8')
    }
  }

  read() {
    try {
      this._ensureDbFile()
      const content = fs.readFileSync(DB_FILE, 'utf-8')
      return JSON.parse(content)
    } catch (err) {
      console.error('Lỗi đọc database:', err)
      return INITIAL_DB
    }
  }

  write(data) {
    try {
      this._ensureDbFile()
      // Ghi nguyên tử (atomic write) qua file tạm để tránh corrupt file nếu mất điện đột ngột
      const tempPath = `${DB_FILE}.tmp`
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8')
      fs.renameSync(tempPath, DB_FILE)
      return true
    } catch (err) {
      console.error('Lỗi ghi database:', err)
      return false
    }
  }

  appendLog(type, message) {
    const data = this.read()
    data.auditLogs = data.auditLogs || []
    data.auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      message,
    })
    // Giữ tối đa 200 logs
    if (data.auditLogs.length > 200) {
      data.auditLogs = data.auditLogs.slice(0, 200)
    }
    this.write(data)
  }
}

export const db = new DatabaseService()
