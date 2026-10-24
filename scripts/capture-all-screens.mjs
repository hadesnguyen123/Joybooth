#!/usr/bin/env node
/**
 * Fotolism 3.0 — Automated Screen Capture Suite
 * Captures all Kiosk (1080x1920), Overhead (1920x1080), and Cloud CMS (1920x1080)
 * screens in Warm Minimal Luxury design system into the session image storage folder.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BROWSER_BIN = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

const TARGET_DIRS = [
  'F:\\Fotolism_image\\sessions\\ui_screens_capture',
  'F:\\Fotolism_image\\ui_screens_capture',
  path.resolve('f:\\JoyBooth\\design_export\\captured_screens')
];

// Ensure all destination directories exist
for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const SCREENS = [
  // Interactive Preview Overview
  {
    id: '00_interactive_preview_suite',
    title: 'Fotolism 3.0 — Interactive Design Preview Suite',
    url: 'file:///f:/JoyBooth/design_export/interactive_preview.html',
    width: 1920,
    height: 1080,
    category: 'Design Specification'
  },
  // Kiosk Touchscreen (1080x1920 Portrait)
  {
    id: '01_kiosk_idle_welcome',
    title: 'Màn Hình Chờ & Chào Mừng (Idle / Welcome Screen)',
    url: 'http://localhost:5173/?screen=idle',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '02_kiosk_select_frame_size',
    title: 'Chọn Khổ Giấy In (Select Frame Size — 2x6 / 4x6)',
    url: 'http://localhost:5173/?screen=select-size',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '03_kiosk_select_layout',
    title: 'Chọn Bố Cục Tạo Dáng (Select Layout — 4 Pô Dọc / 3 Pô / 2x2)',
    url: 'http://localhost:5173/?screen=select-layout',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '04_kiosk_vietqr_payment',
    title: 'Thanh Toán VietQR & Tiền Mặt (Payment Screen)',
    url: 'http://localhost:5173/?screen=payment',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '05_kiosk_liveview_capture',
    title: 'Sân Khấu Chụp Ảnh Canon Live View (Capture Screen)',
    url: 'http://localhost:5173/?screen=capture&noLiveStream=1',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '06_kiosk_select_theme',
    title: 'Chọn Khung Ảnh & Chủ Đề (Theme Select Screen)',
    url: 'http://localhost:5173/?screen=select-theme',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '07_kiosk_filter_and_stickers',
    title: 'Bộ Lọc Màu & Dán Sticker (Filter & Sticker Screen)',
    url: 'http://localhost:5173/?screen=select-filter',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '08_kiosk_review_qr_delivery',
    title: 'Xem Lại & In Ảnh Kép DNP (Review & QR Delivery Screen)',
    url: 'http://localhost:5173/?screen=review',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  {
    id: '09_kiosk_admin_settings',
    title: 'Bảng Điều Khiển Cài Đặt Quản Trị Viên Kiosk (Admin Settings)',
    url: 'http://localhost:5173/?screen=admin',
    width: 1080,
    height: 1920,
    category: 'Desktop Kiosk'
  },
  // Kiosk Overhead Display (1920x1080 Landscape)
  {
    id: '10_overhead_display_screen',
    title: 'Màn Hình Phụ Overhead Display Khách Đứng Ngoài (1920x1080)',
    url: 'http://localhost:5173/?mode=overhead&noLiveStream=1',
    width: 1920,
    height: 1080,
    category: 'Overhead Display'
  },
  // Cloud CMS (1920x1080 Landscape)
  {
    id: '11_cms_dashboard_overview',
    title: 'Cloud CMS — Tổng Quan Hoạt Động & Doanh Thu Realtime',
    url: 'http://localhost:3000/',
    width: 1920,
    height: 1080,
    category: 'Cloud CMS'
  },
  {
    id: '12_cms_sessions_cloud_gallery',
    title: 'Cloud CMS — Lịch Sử Phiên Chụp & Cloud Gallery',
    url: 'http://localhost:3000/sessions',
    width: 1920,
    height: 1080,
    category: 'Cloud CMS'
  },
  {
    id: '13_cms_pricing_sync_matrix',
    title: 'Cloud CMS — Cấu Hình Bảng Giá Dịch Vụ & Đồng Bộ Máy Trạm',
    url: 'http://localhost:3000/pricing',
    width: 1920,
    height: 1080,
    category: 'Cloud CMS'
  },
  {
    id: '14_cms_devices_monitor_paper',
    title: 'Cloud CMS — Giám Sát Thiết Bị Kiosk & Khay Giấy DNP',
    url: 'http://localhost:3000/devices',
    width: 1920,
    height: 1080,
    category: 'Cloud CMS'
  },
  {
    id: '15_cms_reconciliation_3way',
    title: 'Cloud CMS — Đối Soát Kế Toán 3 Góc Chống Thất Thoát',
    url: 'http://localhost:3000/reconciliation',
    width: 1920,
    height: 1080,
    category: 'Cloud CMS'
  },
  {
    id: '16_cms_audit_logs',
    title: 'Cloud CMS — Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)',
    url: 'http://localhost:3000/audit',
    width: 1920,
    height: 1080,
    category: 'Cloud CMS'
  }
];

function captureScreen(item) {
  return new Promise((resolve) => {
    const tempFile = path.join(TARGET_DIRS[0], `${item.id}.png`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--virtual-time-budget=2500`,
      `--window-size=${item.width},${item.height}`,
      `--screenshot=${tempFile}`,
      item.url
    ];

    const proc = spawn(BROWSER_BIN, args, { stdio: 'ignore' });
    const timer = setTimeout(() => {
      try { proc.kill(); } catch {}
    }, 16000);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (fs.existsSync(tempFile)) {
        const stats = fs.statSync(tempFile);
        console.log(`  [OK] ${item.id}.png (${stats.size.toLocaleString()} bytes) -> ${item.title}`);

        // Copy to other target directories
        for (let i = 1; i < TARGET_DIRS.length; i++) {
          const dest = path.join(TARGET_DIRS[i], `${item.id}.png`);
          fs.copyFileSync(tempFile, dest);
        }
        resolve({ success: true, item, size: stats.size });
      } else {
        console.error(`  [FAIL] Could not capture ${item.id} (exit code ${code})`);
        resolve({ success: false, item, size: 0 });
      }
    });
  });
}

async function main() {
  console.log('===============================================================');
  console.log('📸 [Fotolism 3.0] BẮT ĐẦU XUẤT CAPTURE TẤT CẢ MÀN HÌNH');
  console.log('   Định dạng: Warm Minimal Luxury (#502A1D / #FAF6F1)');
  console.log(`   Thư mục lưu ảnh session: ${TARGET_DIRS[0]}`);
  console.log('===============================================================');

  const results = [];
  for (const s of SCREENS) {
    process.stdout.write(`Đang chụp: ${s.title}... `);
    const res = await captureScreen(s);
    results.push(res);
  }

  // Create README.md Catalog
  const readmeContent = `# FOTOLISM 3.0 — BỘ ẢNH CAPTURE TẤT CẢ MÀN HÌNH GIAO DIỆN

**Thư mục lưu:** \`F:\\Fotolism_image\\sessions\\ui_screens_capture\`  
**Thời gian xuất:** ${new Date().toLocaleString('vi-VN')}  
**Ngôn ngữ thiết kế:** Warm Minimal Luxury (Nâu Espresso \`#502A1D\` · Kem Ấm \`#FAF6F1\` · Walnut \`#78452F\` · Caramel \`#A66A43\`)  

---

## Danh Sách 17 Màn Hình Đã Xuất

| STT | Tên file | Phân hệ | Độ phân giải | Kích thước | Mô tả màn hình |
|:---:|---|---|:---:|:---:|---|
${results.map((r, i) => `| ${i + 1} | **${r.item.id}.png** | ${r.item.category} | ${r.item.width}×${r.item.height} | ${(r.size / 1024).toFixed(1)} KB | ${r.item.title} |`).join('\n')}

---
*Ghi chú: Toàn bộ ảnh chụp màn hình được kết xuất trực tiếp từ mã nguồn thực tế đang chạy tại Desktop Kiosk (5173) và Cloud CMS (3000).*
`;

  for (const dir of TARGET_DIRS) {
    fs.writeFileSync(path.join(dir, 'README.md'), readmeContent, 'utf-8');
  }

  console.log('===============================================================');
  console.log(`✅ HOÀN TẤT XUẤT ${results.filter(r => r.success).length}/${SCREENS.length} MÀN HÌNH THÀNH CÔNG!`);
  console.log(`📂 Kiểm tra thư mục: ${TARGET_DIRS[0]}`);
  console.log('===============================================================');
}

main();
