---
name: print-manager
description: Hướng dẫn quản lý máy in nhiệt dye-sub (DNP RX1HS, HiTi P525L, Canon Selphy), cấu hình khổ giấy Windows, hàng đợi in Spooler và đếm định mức giấy in Fotolism 3.0.
---

# 🖨️ Print Manager Skill — Fotolism 3.0

Hướng dẫn chuẩn hóa quy trình kết nối, cấu hình khổ giấy và gửi lệnh in tự động đến các dòng máy in nhiệt dye-sub chuyên dụng trong hệ thống Fotolism Photobooth.

---

## 1. Thiết Bị Hỗ Trợ & Quy Cách Khổ Giấy

| Dòng Máy In | Khổ In Chuẩn | Cơ Chế Cắt Giấy (Cutter) | Thời Gian In | Ứng Dụng |
| :--- | :--- | :--- | :--- | :--- |
| **DNP DS-RX1HS** | 4x6 inch (1200x1800 px) & 2x6 dải strip | Bật tính năng **2-inch Cut** trong Windows Driver để tự động chém đôi thành 2 dải 2x6 | ~12.4 giây / bản | Photobooth sự kiện, tiệc cưới, trung tâm thương mại |
| **DNP DS620A** | 4x6, 2x6, 6x8 inch | Tự động cắt đa khổ, tốc độ cao | ~8.4 giây / bản | Booth cao cấp, studio thương mại |
| **HiTi P525L** | 4x6 & 2x6 dải strip | Tích hợp dao cắt 2x6 cơ học | ~12.8 giây / bản | Gian hàng di động |
| **Canon Selphy CP1300/1500** | 4x6 inch postcard | Cắt thủ công viền răng cưa | ~47 giây / bản | Trạm backup, booth mini |

---

## 2. Kiến Trúc Điều Khiển & Giao Tiếp

```
┌────────────────────────────────────────────────────────┐
│           React UI (ReviewScreen / AdminScreen)        │
│    - Chọn số lượng bản in (1 - 6 bản)                  │
│    - Hiển thị tiến trình in & bộ đếm giấy còn lại      │
└───────────────────────────┬────────────────────────────┘
                            │ (IPC: printer:print-photo)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Electron Main Process (main.cts)           │
│  - Tạo file ảnh composite 300 DPI độ phân giải cao     │
│  - Gửi lệnh in qua Windows Print Spooler               │
│  - Ghi nhận lịch sử in vào SQLite SessionDB            │
└───────────────────────────┬────────────────────────────┘
                            │ (Win32 Spooler API / PowerShell)
                            ▼
┌────────────────────────────────────────────────────────┐
│              DNP / HiTi Dye-Sub Printer                │
│    - Nhận lệnh in & xuất bản in nhiệt bóng/mờ          │
│    - Trả về mã trạng thái giấy, mực qua driver         │
└────────────────────────────────────────────────────────┘
```

---

## 3. Các API & Lệnh Thực Thi

### Electron IPC Channels:
- `printer:get-status`:
  - Trả về danh sách máy in đã cài đặt trong Windows, máy in mặc định và trạng thái sẵn sàng.
  - Phản hồi: `{ success: true, data: { printers: [...], defaultPrinter: string, isOnline: bool } }`
- `printer:print-photo`:
  - Nhận payload: `{ filePath: string, copies: number, paperSize: '2x6' | '4x6' }`
  - Ghi nhận `PrintJob` vào SQLite `sessionDatabase.cts`.
  - Phản hồi: `{ success: true, data: { jobId: string, printedCopies: number } }`

### Kiểm tra máy in từ dòng lệnh Windows (PowerShell):
```powershell
# Xem danh sách máy in và trạng thái kết nối
Get-Printer | Select-Object Name, PrinterStatus, PortName, DriverName

# Kiểm tra hàng đợi in đang xử lý
Get-PrintJob -PrinterName "DNP DS-RX1HS" | Select-Object Id, DocumentName, JobStatus, TotalPages

# Hủy các lệnh in bị kẹt trong Spooler
Get-PrintJob -PrinterName "DNP DS-RX1HS" | Remove-PrintJob
```

---

## 4. Quản Lý Định Mức Giấy & Đối Soát Doanh Thu

1. **Định mức cuộn giấy tiêu chuẩn**:
   - DNP DS-RX1HS: 700 tờ khổ 4x6 (hoặc 1400 dải 2x6) mỗi cuộn media.
   - HiTi P525L: 500 tờ khổ 4x6 mỗi cuộn.
2. **Cơ chế đếm & Cảnh báo hao hụt**:
   - Mỗi lệnh in thành công được trừ trực tiếp vào trường `paper_remaining` của Kiosk trong cơ sở dữ liệu.
   - Khi lượng giấy còn lại dưới **50 tờ**, hệ thống kích hoạt cảnh báo vàng `WARN_PAPER_LOW` trên màn hình Admin và gửi thông báo lên CMS Cloud.
   - Khi lượng giấy về **0**, Kiosk tự động khóa lựa chọn in giấy và chỉ cho phép khách nhận ảnh qua mã QR code.
3. **Đối soát 3 góc (3-Way Reconciliation)**:
   - Dữ liệu `PrintJobs` từ SQLite được đối chiếu chéo với số tiền thu được (VietQR + Tiền mặt) trong báo cáo doanh thu cuối ngày.
