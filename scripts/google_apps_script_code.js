/**
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG LƯU TRỮ VÀ ĐỒNG BỘ ĐƠN HÀNG SHOWROOM VINFAST
 */

function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;

    if (action === "TEST_CONNECTION") {
      return jsonResponse({ success: true, message: "Kết nối thành công với Google Sheet & Drive!" });
    }

    // =========================================================================
    // HÀNH ĐỘNG 1: ĐỒNG BỘ TOÀN BỘ ĐƠN HÀNG THÁNG HIỆN TẠI VỚI ĐẦY ĐỦ THÔNG TIN
    // =========================================================================
    if (action === "SYNC_CURRENT_ORDERS") {
      var month = requestData.month || "Hiện Tại";
      var orders = requestData.orders || [];

      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetName = "Đơn Hàng Hiện Tại (" + month + ")";
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName, 0); // Đưa lên đầu tiên
      } else {
        sheet.clear(); // Xóa sạch dữ liệu cũ để đồng bộ mới nhất
      }

      var headers = [
        "STT",
        "Mã Đơn Hàng",
        "Tên Khách Hàng",
        "Số Điện Thoại",
        "Địa Chỉ",
        "Dòng Xe",
        "Phiên Bản",
        "Màu Ngoại Thất",
        "Màu Nội Thất",
        "Trạng Thái",
        "Số Khung (VIN)",
        "Số Máy",
        "Tư Vấn Bán Hàng",
        "Ngày Cọc",
        "Thời Gian Cần Xe",
        "Ngày Ghép Xe",
        "Ngày Xuất HĐ",
        "Số Tiền Cọc",
        "Tiền Khách Đã Đóng",
        "Giá Công Bố",
        "Hình Thức TT",
        "Nguồn Khách",
        "Bảo Hiểm",
        "Đăng Ký Xe",
        "Số Hợp Đồng",
        "Ngày Ký HĐ",
        "Mã AMIS / DMS",
        "Chính Sách Bán Hàng",
        "Ghi Chú",
        "Link Hợp Đồng",
        "Link Hóa Đơn / Đề Nghị",
        "Thời Gian Đồng Bộ"
      ];

      sheet.appendRow(headers);
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#047857"); // Màu xanh VinFast sang trọng
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 35);
      sheet.setFrozenRows(1);

      var nowStr = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      var rows = [];

      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        rows.push([
          i + 1,
          o.so_don_hang || "",
          o.ten_khach_hang || "",
          o.phone || o.so_dien_thoai || "",
          o.dia_chi || o.dia_chi_xhd || "",
          o.dong_xe || "",
          o.phien_ban || "",
          o.ngoai_that || "",
          o.noi_that || "",
          o.ket_qua || o.status || "Chờ xử lý",
          o.vin || "",
          o.so_may || "",
          o.ten_tu_van_ban_hang || o.tvbh || "",
          o.ngay_coc || "",
          o.thoi_gian_can_xe || "",
          o.thoi_gian_ghep || "",
          o.ngay_xuat_hoa_don || "",
          o.so_tien_coc || 0,
          o.so_tien_khach_da_dong || 0,
          o.gia_cong_bo || 0,
          o.hinh_thuc_tt || "",
          o.nguon_khach || "",
          o.mua_bao_hiem ? "Có" : "Không",
          o.dang_ky_xe ? "Có" : "Không",
          o.so_hop_dong || o.ma_hop_dong || "",
          o.ngay_ky_hop_dong || "",
          (o.ma_amis || "") + (o.ma_dms ? " / " + o.ma_dms : ""),
          o.chinh_sach || "",
          o.ghi_chu || o.ghi_chu_huy || "",
          o.link_hop_dong || o.url_hop_dong || "",
          o.link_hoa_don_da_xuat || o.url_hoa_don_da_xuat || o.link_de_nghi_xhd || o.url_de_nghi_xhd || "",
          nowStr
        ]);
      }

      if (rows.length > 0) {
        var dataRange = sheet.getRange(2, 1, rows.length, headers.length);
        dataRange.setValues(rows);

        // Định dạng số tiền (cột 18, 19, 20)
        sheet.getRange(2, 18, rows.length, 3).setNumberFormat("#,##0 \"₫\"");
        dataRange.setVerticalAlignment("middle");
      }

      sheet.autoResizeColumns(1, headers.length);

      return jsonResponse({
        success: true,
        sheetName: sheetName,
        ordersCount: orders.length,
        updatedAt: nowStr
      });
    }

    // =========================================================================
    // HÀNH ĐỘNG 2: LƯU TRỮ ĐÓNG SỔ THÁNG CŨ (CHUYỂN FILE SANG DRIVE & XÓA SUPABASE)
    // =========================================================================
    if (action === "ARCHIVE_ORDERS") {
      var month = requestData.month;
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

      var rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), "Luu_Tru_VinFast_Showroom");
      var monthFolder = getOrCreateFolder(rootFolder, month);
      var archivedFiles = [];

      for (var i = 0; i < orders.length; i++) {
        var ord = orders[i];
        var orderCode = ord.so_don_hang || ("ORD-" + (i + 1));
        var custName = ord.ten_khach_hang || "";
        var orderFolder = getOrCreateFolder(monthFolder, orderCode + " - " + custName);

        var driveHopDongUrl = "";
        if (ord.url_hop_dong && ord.url_hop_dong.indexOf("http") === 0) {
          driveHopDongUrl = transferFileToDrive(ord.url_hop_dong, orderFolder, "HopDong");
          if (driveHopDongUrl) {
            archivedFiles.push({ supabaseUrl: ord.url_hop_dong, driveUrl: driveHopDongUrl, orderId: ord.so_don_hang, field: "url_hop_dong" });
          }
        }

        var driveDeNghiUrl = "";
        if (ord.url_de_nghi_xhd && ord.url_de_nghi_xhd.indexOf("http") === 0) {
          driveDeNghiUrl = transferFileToDrive(ord.url_de_nghi_xhd, orderFolder, "DeNghiXHD");
          if (driveDeNghiUrl) {
            archivedFiles.push({ supabaseUrl: ord.url_de_nghi_xhd, driveUrl: driveDeNghiUrl, orderId: ord.so_don_hang, field: "url_de_nghi_xhd" });
          }
        }

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
  return HtmlService.createHtmlOutput("<h3>Google Apps Script Backup Webhook hoạt động tốt!</h3>");
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
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
