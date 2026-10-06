---
name: print-manager
description: Hướng dẫn quản lý kết nối máy in dye-sub nhiệt (HiTi, DNP, Canon), hàng đợi in và cấu hình khổ giấy Windows.
---

# 🖨️ Print Manager Skill — JoyBooth

## Mục tiêu
Tích hợp giao tiếp trực tiếp với hệ điều hành Windows để gửi lệnh in ảnh tự động, quản lý hàng đợi và theo dõi số lượt in:
- Kết nối thông qua Windows Print Spooler (`win32print`, `win32api`).
- Tự động cắt giấy (cutter command) đối với máy in dải strip 2x6 kép.
- Lưu trữ lịch sử in và số lượng bản in vào cơ sở dữ liệu SQLite cục bộ.

## Danh sách Máy in Phổ biến
- **HiTi:** P525L, S420
- **DNP:** DS-RX1HS, DS620A
- **Citizen:** CY-02, OP900II
- **Canon Selphy:** CP1300, CP1500 (khổ 4x6 phổ thông)

## Endpoints
- `GET /print/printers`: Liệt kê các máy in khả dụng trong Windows.
- `POST /print`: Gửi file ảnh đến máy in với số lượng bản chỉ định.
