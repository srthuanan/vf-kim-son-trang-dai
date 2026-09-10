/**
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG SAO LƯU DỮ LIỆU & FILE HỢP ĐỒNG SANG GOOGLE DRIVE + SHEET
 * 
 * Hướng dẫn:
 * 1. Mở Google Sheet của Showroom -> Tiện ích mở rộng (Extensions) -> Apps Script.
 * 2. Xóa hết code cũ trong file Code.gs, dán toàn bộ đoạn code này vào.
 * 3. Bấm nút "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment).
 * 4. Chọn loại: "Ứng dụng web" (Web app).
 *    - Thực thi dưới quyền: "Tôi" (Me).
 *    - Ai có quyền truy cập: "Bất kỳ ai" (Anyone).
 * 5. Bấm "Triển khai" (Authorize access nếu có) -> Sao chép URL ứng dụng web (Web app URL).
 */

function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    if (action === "TEST_CONNECTION") {
      return jsonResponse({ success: true, message: "Kết nối thành công với Google Sheet & Drive!" });
    }

    if (action === "ARCHIVE_ORDERS") {
      var month = requestData.month; // Ví dụ: "2026-06" hoặc "Tháng 06/2026"
      var orders = requestData.orders || [];

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = "Lưu Trữ " + month;
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        var headers = [
          "Mã Đơn Hàng", "Tên Khách Hàng", "Dòng Xe", "Phiên Bản", "Màu Ngoại Thất",
          "Màu Nội Thất", "Số Khung (VIN)", "Số Máy", "Ngày Cọc", "Ngày Xuất HĐ",
          "Tư Vấn Bán Hàng", "Số Hợp Đồng", "Số Tiền Đã Đóng", "Giá Công Bố",
          "Hợp Đồng (Google Drive)", "Đề Nghị XHĐ (Google Drive)", "Ảnh Chuyển Khoản (Google Drive)"
        ];
        sheet.appendRow(headers);
        var headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setBackground("#1e293b");
        headerRange.setFontColor("#ffffff");
        headerRange.setFontWeight("bold");
        headerRange.setHorizontalAlignment("center");
        sheet.setFrozenRows(1);
      }

      // Tạo thư mục trên Google Drive: [Lưu Trữ VinFast] / [Năm-Tháng]
      var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), "Luu_Tru_VinFast_Showroom");
      var monthFolder = getOrCreateFolder(rootFolder, month);

      var archivedFiles = [];

      for (var i = 0; i < orders.length; i++) {
        var ord = orders[i];
        var orderCode = ord.so_don_hang || ("ORD-" + (i + 1));
        var custName = ord.ten_khach_hang || "";
        var orderFolder = getOrCreateFolder(monthFolder, orderCode + " - " + custName);

        // Chuyển file Hợp Đồng
        var driveHopDongUrl = "";
        if (ord.url_hop_dong && ord.url_hop_dong.indexOf("http") === 0) {
          driveHopDongUrl = transferFileToDrive(ord.url_hop_dong, orderFolder, "HopDong");
          if (driveHopDongUrl) {
            archivedFiles.push({ supabaseUrl: ord.url_hop_dong, driveUrl: driveHopDongUrl, orderId: ord.so_don_hang, field: "url_hop_dong" });
          }
        }

        // Chuyển file Đề Nghị XHĐ
        var driveDeNghiUrl = "";
        if (ord.url_de_nghi_xhd && ord.url_de_nghi_xhd.indexOf("http") === 0) {
          driveDeNghiUrl = transferFileToDrive(ord.url_de_nghi_xhd, orderFolder, "DeNghiXHD");
          if (driveDeNghiUrl) {
            archivedFiles.push({ supabaseUrl: ord.url_de_nghi_xhd, driveUrl: driveDeNghiUrl, orderId: ord.so_don_hang, field: "url_de_nghi_xhd" });
          }
        }

        // Chuyển các ảnh chuyển khoản / giao dịch
        var driveAnhGiaoDichUrls = [];
        if (ord.ghi_chu_ai) {
          var imgUrls = ord.ghi_chu_ai.split(",");
          for (var j = 0; j < imgUrls.length; j++) {
            var imgUrl = imgUrls[j].trim();
            if (imgUrl.indexOf("http") === 0) {
              var dUrl = transferFileToDrive(imgUrl, orderFolder, "GiaoDich_" + (j + 1));
              if (dUrl) {
                driveAnhGiaoDichUrls.push(dUrl);
                archivedFiles.push({ supabaseUrl: imgUrl, driveUrl: dUrl, orderId: ord.so_don_hang, field: "ghi_chu_ai" });
              }
            }
          }
        }

        // Ghi dòng vào Sheet
        sheet.appendRow([
          orderCode,
          custName,
          ord.dong_xe || "",
          ord.phien_ban || "",
          ord.ngoai_that || "",
          ord.noi_that || "",
          ord.vin || "",
          ord.so_may || "",
          ord.ngay_coc || "",
          ord.ngay_xuat_hoa_don || "",
          ord.tvbh || "",
          ord.so_hop_dong || "",
          ord.so_tien_khach_da_dong || 0,
          ord.gia_cong_bo || 0,
          driveHopDongUrl,
          driveDeNghiUrl,
          driveAnhGiaoDichUrls.join(", ")
        ]);
      }

      sheet.autoResizeColumns(1, 14);

      return jsonResponse({
        success: true,
        month: month,
        ordersCount: orders.length,
        archivedFilesCount: archivedFiles.length,
        archivedFiles: archivedFiles
      });
    }

    return jsonResponse({ success: false, error: "Hành động không hợp lệ" });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doGet() {
  return HtmlService.createHtmlOutput("<h3>Google Apps Script Backup Webhook đang hoạt động tốt!</h3>");
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  var newFolder = parentFolder.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function transferFileToDrive(fileUrl, folder, prefix) {
  try {
    var response = UrlFetchApp.fetch(fileUrl, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return "";
    var blob = response.getBlob();
    var origName = fileUrl.split("/").pop().split("?")[0];
    blob.setName(prefix + "_" + origName);
    var driveFile = folder.createFile(blob);
    driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return driveFile.getUrl();
  } catch (e) {
    return "";
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
