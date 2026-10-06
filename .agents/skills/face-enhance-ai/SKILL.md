---
name: face-enhance-ai
description: Hướng dẫn tích hợp AI làm đẹp khuôn mặt, phục hồi nét (GFPGAN/CodeFormer), làm mịn da và chỉnh sáng Glam Photobooth.
---

# 🤖 Face Enhance AI Skill — JoyBooth

## Mục tiêu
Cung cấp pipeline làm đẹp ảnh chân dung tức thì (< 3 giây offline):
- **Skin Smoothing:** Giảm khuyết điểm da, giữ nguyên viền mắt, chân mày và tóc (Bilateral Filter / Guided Filter).
- **Face Restoration (GFPGAN / CodeFormer):** Tái tạo nét mắt, nụ cười và răng sắc nét trong điều kiện thiếu sáng.
- **Tone & Glow:** Tinh chỉnh ánh sáng, độ tương phản nhẹ phong cách Glam Booth.

## Tích hợp & Config
- **Backend Service:** `ai-service/api/routes/enhance.py`
- **Endpoint:** `POST /enhance`
  ```json
  {
    "imagePath": "f:/JoyBooth/data/raw/capture_xxx.jpg",
    "beautyLevel": 70
  }
  ```
- **Weights:** Các file trọng số checkpoint (`GFPGANv1.4.pth`) được lưu tại `ai-service/models/`.

## Quy tắc Tối ưu Hiệu năng
1. Nếu có GPU NVIDIA (CUDA): Chạy inference với TensorRT hoặc Torch CUDA (< 1s).
2. Nếu CPU-only: Sử dụng OpenCV Bilateral Filter kết hợp ONNX Runtime INT8 để đảm bảo phản hồi dưới 2.5s.
