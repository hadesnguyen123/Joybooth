/**
 * Google Apps Script Webhook để kết nối JoyBooth với Google Drive
 * Folder ID đích: 1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU
 * 
 * HƯỚNG DẪN CÀI ĐẶT (Chỉ mất 1 phút):
 * 1. Mở https://script.google.com/
 * 2. Bấm "Dự án mới" (New project)
 * 3. Xóa code cũ và dán toàn bộ đoạn code dưới đây vào.
 * 4. Bấm "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment).
 * 5. Chọn loại: "Ứng dụng web" (Web app).
 * 6. Mục "Người có quyền truy cập" (Who has access): Chọn "Bất kỳ ai" (Anyone).
 * 7. Bấm "Triển khai" và sao chép Web App URL (dạng https://script.google.com/macros/s/.../exec).
 * 8. Dán URL vào mục Quản Trị > Google Drive & Timelapse > Webhook URL trong JoyBooth!
 */

export const GOOGLE_APPS_SCRIPT_SAMPLE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var parentId = data.parentFolderId || '1FcgyAe79bpnZnYgxR4i4b4qM_42oB5eU';
    var parentFolder = DriveApp.getFolderById(parentId);
    
    // Tự động tạo tên folder theo ngày giờ (VD: JoyBooth_2026-10-08_22h35)
    var now = new Date();
    var pad = function(n) { return (n < 10 ? '0' : '') + n; };
    var timeStamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '_' + pad(now.getHours()) + 'h' + pad(now.getMinutes());
    
    var folderName = data.folderName || ('JoyBooth_' + timeStamp);
    var newFolder = parentFolder.createFolder(folderName);
    
    // Đặt quyền truy cập công khai xem ảnh cho người quét mã QR
    newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Đẩy từng file ảnh lên folder con
    if (data.files && Array.isArray(data.files)) {
      for (var i = 0; i < data.files.length; i++) {
        var fileItem = data.files[i];
        if (!fileItem || !fileItem.dataUrl) continue;
        
        var parts = fileItem.dataUrl.split(';base64,');
        if (parts.length === 2) {
          var contentType = parts[0].replace('data:', '');
          var decoded = Utilities.base64Decode(parts[1]);
          var blob = Utilities.newBlob(decoded, contentType, fileItem.name);
          newFolder.createFile(blob);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      folderId: newFolder.getId(),
      folderUrl: newFolder.getUrl(),
      folderName: folderName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`
