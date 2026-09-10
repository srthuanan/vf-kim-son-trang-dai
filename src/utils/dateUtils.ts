export function parseMonthFromAnyDate(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === 'Chưa có' || s === '—' || s === 'null' || s === 'undefined') return null;

  // ISO: 2026-09-04 or 2026-09-04T08:14:46...
  const isoMatch = s.match(/(\d{4})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }

  // Định dạng VN: d/m/yyyy hoặc dd/mm/yyyy (ví dụ: 4/9/2026, 29/8/2026)
  const vnMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (vnMatch) {
    const month = vnMatch[2].padStart(2, '0');
    const year = vnMatch[3];
    return `${year}-${month}`;
  }

  return null;
}

export function normalizeToOperatingMonth(monthKey: string): string {
  if (!monthKey) return '2026-06';
  // Các tháng chuẩn vận hành thực tế
  if (['2026-06', '2026-07', '2026-08', '2026-09'].includes(monthKey)) {
    return monthKey;
  }
  // Các đơn cọc sớm trước tháng 6 hoặc gõ nhầm năm đều quy về kỳ khai trương tháng 06/2026
  if (monthKey.startsWith('2026-')) {
    const mNum = parseInt(monthKey.split('-')[1], 10);
    if (mNum < 6) return '2026-06';
    return monthKey;
  }
  return '2026-06';
}

export function extractMonthKey(item: any): string {
  if (!item) return '2026-06';

  // 1. Tính theo Ngày yêu cầu (yêu cầu XHĐ)
  const yeuCauVal = item.ngayYeuCau || item.ngay_yeu_cau;
  const mYeuCau = parseMonthFromAnyDate(yeuCauVal);
  if (mYeuCau) return normalizeToOperatingMonth(mYeuCau);

  // 2. Tính theo Ngày xuất hóa đơn
  const xhdVal = item.invoiceDate || item.ngay_xuat_hoa_don;
  const mXhd = parseMonthFromAnyDate(xhdVal);
  if (mXhd) return normalizeToOperatingMonth(mXhd);

  // 3. Tính theo Ngày cọc
  const cocVal = item.depositDate || item.ngay_coc;
  const mCoc = parseMonthFromAnyDate(cocVal);
  if (mCoc) return normalizeToOperatingMonth(mCoc);

  // Fallback theo ngày tạo hệ thống nếu có
  const createdAtVal = item.createdAt || item.created_at;
  const mCreated = parseMonthFromAnyDate(createdAtVal);
  if (mCreated) return normalizeToOperatingMonth(mCreated);

  return '2026-06';
}

export function formatMonthDisplay(monthKey: string): string {
  if (!monthKey || monthKey === 'all') return 'Tất cả các tháng';
  const parts = monthKey.split('-');
  if (parts.length === 2) {
    return 'Tháng ' + parts[1] + '/' + parts[0];
  }
  return monthKey;
}

export function getDefaultCurrentMonth(availableMonths?: string[]): string {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (availableMonths && availableMonths.length > 0) {
    if (availableMonths.includes(currentKey)) {
      return currentKey;
    }
    return availableMonths[0];
  }
  if (currentKey.startsWith('2026-')) {
    return currentKey;
  }
  return '2026-09';
}

