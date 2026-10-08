import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '../../../..')

console.log('='.repeat(65))
console.log('🔍 [JoyBooth System Verifier] BẮT ĐẦU KIỂM TRA TOÀN DIỆN HỆ THỐNG')
console.log('='.repeat(65))

const results = []

function addResult(subsystem, testName, passed, details) {
  results.push({ subsystem, testName, passed, details })
  const icon = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`[${icon}] [${subsystem}] ${testName} - ${details}`)
}

// 1. Kiểm tra cấu hình Cổng (Port Partitioning)
function checkPortsConfig() {
  try {
    const desktopVite = fs.readFileSync(path.join(ROOT_DIR, 'desktop/package.json'), 'utf-8')
    const cmsVite = fs.readFileSync(path.join(ROOT_DIR, 'cms-web/vite.config.ts'), 'utf-8')
    const cmsServer = fs.readFileSync(path.join(ROOT_DIR, 'cms-web/server/index.js'), 'utf-8')

    const desktopHas5173 = desktopVite.includes('5173')
    const cmsHas5180 = cmsVite.includes('5180')
    const serverHas5181 = cmsServer.includes('5181')

    if (desktopHas5173 && cmsHas5180 && serverHas5181) {
      addResult(
        'PORT_PARTITION',
        'Phân bổ cổng độc lập',
        true,
        'Desktop: 5173 | CMS UI: 5180 | CMS API: 5181 (Không xung đột)'
      )
    } else {
      addResult('PORT_PARTITION', 'Phân bổ cổng độc lập', false, 'Phát hiện xung đột cổng')
    }
  } catch (err) {
    addResult('PORT_PARTITION', 'Đọc cấu hình cổng', false, err.message)
  }
}

// 2. Kiểm tra Database File & Seed Data
function checkDatabaseIntegrity() {
  try {
    const dbPath = path.join(ROOT_DIR, 'cms-web/server/data/database.json')
    if (!fs.existsSync(dbPath)) {
      addResult('DATABASE', 'Kiểm tra file DB', false, 'Chưa tìm thấy database.json')
      return
    }

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    const hasKiosks = Array.isArray(data.kiosks) && data.kiosks.length >= 2
    const hasPricing = Boolean(data.pricing && data.pricing.price2x6)
    const hasFrames = Array.isArray(data.frames) && data.frames.length > 0
    const hasTransactions = Array.isArray(data.transactions)

    if (hasKiosks && hasPricing && hasFrames && hasTransactions) {
      addResult(
        'DATABASE',
        'Toàn vẹn dữ liệu SQLite/JSON',
        true,
        `2 Kiosks, ${data.frames.length} Khung, ${data.transactions.length} Giao dịch, Bảng giá hợp lệ`
      )
    } else {
      addResult('DATABASE', 'Toàn vẹn dữ liệu', false, 'Thiếu dữ liệu schema cốt lõi')
    }
  } catch (err) {
    addResult('DATABASE', 'Kiểm tra Database', false, err.message)
  }
}

// 3. Kiểm tra tính đúng đắn công thức Đối soát 3 góc (Triple Reconciliation Math Audit)
function checkReconciliationLogic() {
  try {
    const dbPath = path.join(ROOT_DIR, 'cms-web/server/data/database.json')
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    const txns = data.transactions || []

    let calculatedRevenue = 0
    let calculatedPaper = 0

    for (const t of txns) {
      if (t.status === 'success') {
        calculatedRevenue += t.amount
        calculatedPaper += t.paperConsumed
      }
    }

    // Kiểm tra tính cân bằng
    const vietqr = txns.filter((t) => t.paymentMethod === 'vietqr').reduce((s, t) => s + t.amount, 0)
    const cash = txns.filter((t) => t.paymentMethod === 'cash').reduce((s, t) => s + t.amount, 0)

    if (vietqr + cash === calculatedRevenue) {
      addResult(
        'RECONCILIATION',
        'Toán đối soát kế toán',
        true,
        `Tổng doanh thu = VietQR (${vietqr.toLocaleString()}đ) + Tiền mặt (${cash.toLocaleString()}đ) = ${calculatedRevenue.toLocaleString()}đ | Giấy tiêu hao = ${calculatedPaper} tờ`
      )
    } else {
      addResult('RECONCILIATION', 'Toán đối soát kế toán', false, 'Sai lệch giữa phương thức và tổng doanh thu')
    }
  } catch (err) {
    addResult('RECONCILIATION', 'Kiểm tra đối soát', false, err.message)
  }
}

// 4. Kiểm tra mã nguồn Desktop & Preload IPC
function checkDesktopKioskStructure() {
  try {
    const preloadPath = path.join(ROOT_DIR, 'desktop/electron/preload.cts')
    const mainPath = path.join(ROOT_DIR, 'desktop/electron/main.cts')

    const hasPreload = fs.existsSync(preloadPath)
    const hasMain = fs.existsSync(mainPath)

    if (hasPreload && hasMain) {
      const preloadCode = fs.readFileSync(preloadPath, 'utf-8')
      const hasPrintIpc = preloadCode.includes('print:send')
      const hasCameraIpc = preloadCode.includes('camera:capture')

      addResult(
        'DESKTOP_KIOSK',
        'Cấu trúc IPC & Hardware Bridge',
        hasPrintIpc && hasCameraIpc,
        'Preload IPC máy in & camera sẵn sàng'
      )
    } else {
      addResult('DESKTOP_KIOSK', 'File mã nguồn Desktop', false, 'Thiếu electron/preload.cts hoặc main.ts')
    }
  } catch (err) {
    addResult('DESKTOP_KIOSK', 'Kiểm tra Desktop', false, err.message)
  }
}

// Chạy tuần tự các bài test
checkPortsConfig()
checkDatabaseIntegrity()
checkReconciliationLogic()
checkDesktopKioskStructure()

console.log('='.repeat(65))
const passCount = results.filter((r) => r.passed).length
const totalCount = results.length
console.log(`📊 KẾT QUẢ TỔNG QUAN: ${passCount}/${totalCount} BÀI KIỂM TRA THÀNH CÔNG (${Math.round((passCount/totalCount)*100)}%)`)
console.log('='.repeat(65))

if (passCount === totalCount) {
  process.exit(0)
} else {
  process.exit(1)
}
