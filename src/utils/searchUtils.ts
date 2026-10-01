import { Order, InventoryItem } from '../types';

/**
 * Chuẩn hóa chuỗi tìm kiếm:
 * - Bỏ dấu tiếng Việt (NFD)
 * - Chuyển chữ hoa sang thường
 * - Đổi đ/Đ sang d/D
 * - Xóa khoảng trắng thừa
 */
export function removeVietnameseTones(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Chuẩn hóa số (loại bỏ dấu chấm, phẩy, khoảng trắng, gạch ngang)
 * để tiện so khớp số tiền, số điện thoại, số VIN, mã...
 */
export function stripNumberDelimiters(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[\s.,_\-]/g, '').toLowerCase();
}

/**
 * Kiểm tra xem một Order có khớp với từ khóa tìm kiếm (query) hay không.
 * Hỗ trợ tìm kiếm bằng BẤT CỨ trường dữ liệu nào:
 * - Mã đơn hàng, Số hồ sơ, Mã HĐ, Mã Amis
 * - Tên khách hàng (có dấu hoặc không dấu), SĐT, Địa chỉ
 * - Tên TVBH (có dấu hoặc không dấu)
 * - Số VIN, số máy, đuôi VIN
 * - Dòng xe, phiên bản, màu ngoại thất, màu nội thất
 * - Trạng thái đơn hàng (Chưa ghép, Đã ghép, Đã xuất hóa đơn, Đã hủy,...)
 * - Chính sách bán hàng
 * - Số tiền cọc, số tiền đã đóng, giá công bố (dạng số hoặc dạng format có chấm/phẩy)
 * - Hình thức thanh toán (Tiền mặt, Vay ngân hàng,...)
 * - Nguồn khách
 * - Ghi chú, lý do hủy, ghi chú hồ sơ giao xe
 * - Ngày tháng (ngày cọc, ngày cần xe, ngày ký HĐ, ngày XHĐ, ngày nhập...)
 * - Thông tin xe cũ / xe xăng thu mua (VIN, hãng, model)
 */
export function matchOrderWithQuery(order: Order, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const rawNorm = rawQuery.trim().toLowerCase();
  const unaccentedQuery = removeVietnameseTones(rawQuery);
  const numericQuery = stripNumberDelimiters(rawQuery);

  // Danh sách các từ khóa con (tokens)
  const tokens = unaccentedQuery.split(/\s+/).filter(Boolean);

  // Tập hợp các trường tìm kiếm tổng hợp cho đơn hàng
  const directFields: (string | number | null | undefined)[] = [
    order.id,
    order.contractCode,
    order.maAmis,
    order.customer,
    order.phone,
    order.staff,
    order.vin,
    order.engineNo,
    order.line,
    order.version,
    order.exterior,
    order.interior,
    order.status,
    order.policy,
    order.invoiceAddress,
    order.area,
    order.paymentMethod,
    order.nguonKhach,
    order.ghiChu,
    order.cancelNote,
    order.xeXangVin,
    order.xeXangHang,
    order.xeXangModel,
    order.depositAmount,
    order.depositAmount ? order.depositAmount.toLocaleString('vi-VN') : '',
    order.soTienKhachDaDong,
    order.soTienKhachDaDong ? order.soTienKhachDaDong.toLocaleString('vi-VN') : '',
    order.giaCongBo,
    order.giaCongBo ? order.giaCongBo.toLocaleString('vi-VN') : '',
    order.depositDate,
    order.needDate,
    order.needDateIso,
    order.ngayKyHopDong,
    order.invoiceDate,
    order.createdAt,
    order.pairedAt,
    order.hoSoGiaoXe?.note,
    order.warningMessage
  ];

  // Ghép toàn bộ chuỗi có dấu và không dấu
  const directString = directFields.filter(Boolean).join(' ').toLowerCase();
  const unaccentedString = removeVietnameseTones(directString);
  const strippedNumericString = stripNumberDelimiters(directString);

  // 1. Kiểm tra nhanh trực tiếp (toàn chuỗi)
  if (
    directString.includes(rawNorm) ||
    unaccentedString.includes(unaccentedQuery) ||
    (numericQuery.length >= 3 && strippedNumericString.includes(numericQuery))
  ) {
    return true;
  }

  // 2. Kiểm tra tất cả các token từ khóa con (AND match)
  const allTokensMatch = tokens.every((token) => {
    const tokenNum = stripNumberDelimiters(token);
    return (
      unaccentedString.includes(token) ||
      directString.includes(token) ||
      (tokenNum.length >= 3 && strippedNumericString.includes(tokenNum))
    );
  });

  return allTokensMatch;
}

/**
 * Kiểm tra xem một InventoryItem có khớp với từ khóa tìm kiếm hay không.
 */
export function matchInventoryWithQuery(item: InventoryItem, rawQuery: string): boolean {
  if (!rawQuery || !rawQuery.trim()) return true;

  const rawNorm = rawQuery.trim().toLowerCase();
  const unaccentedQuery = removeVietnameseTones(rawQuery);
  const numericQuery = stripNumberDelimiters(rawQuery);
  const tokens = unaccentedQuery.split(/\s+/).filter(Boolean);

  const directFields = [
    item.vin,
    item.engineNo,
    item.line,
    item.version,
    item.exterior,
    item.interior,
    item.status,
    item.location,
    item.holder,
    item.holderUsername,
    item.ma_dms
  ];

  const directString = directFields.filter(Boolean).join(' ').toLowerCase();
  const unaccentedString = removeVietnameseTones(directString);
  const strippedNumericString = stripNumberDelimiters(directString);

  if (
    directString.includes(rawNorm) ||
    unaccentedString.includes(unaccentedQuery) ||
    (numericQuery.length >= 3 && strippedNumericString.includes(numericQuery))
  ) {
    return true;
  }

  return tokens.every((token) => {
    const tokenNum = stripNumberDelimiters(token);
    return (
      unaccentedString.includes(token) ||
      directString.includes(token) ||
      (tokenNum.length >= 3 && strippedNumericString.includes(tokenNum))
    );
  });
}
