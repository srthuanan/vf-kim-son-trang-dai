export function extractMonthKey(item: any): string {
  if (!item) return '2026-06';
  const code = String(item.contractCode || item.id || item.so_don_hang || '').trim();
  const invoiceDate = String(item.invoiceDate || item.ngay_xuat_hoa_don || '').trim();
  const depositDate = String(item.depositDate || item.ngay_coc || '').trim();
  const createdAt = String(item.createdAt || item.created_at || '').trim();

  // 1. Don co ho so/coc trong thang 9
  if (code.includes('VSO-25-06-0009') || code.includes('26-09') || invoiceDate.includes('2026-09') || depositDate.includes('2026-09')) {
    if (depositDate.includes('2026-09') || invoiceDate.includes('2026-09') || code.includes('26-09')) {
      return '2026-09';
    }
  }

  // 2. Kiem tra ma VSO chuan (VSO-26-09, VSO-26-08, VSO-26-07, VSO-26-06)
  const vsoMatch = code.match(/VSO-26-(\d{2})/i);
  if (vsoMatch) {
    const monthNum = vsoMatch[1];
    if (['06', '07', '08', '09'].includes(monthNum)) {
      return '2026-' + monthNum;
    }
    // Cac don tien khoi tao truoc do (thang 5 hoac go nham 95) deu thuoc ky ban giao thang 6
    return '2026-06';
  }

  // 3. Theo cac moc thoi gian
  for (const dateVal of [invoiceDate, depositDate, createdAt]) {
    if (!dateVal) continue;
    if (dateVal.includes('2026-09')) return '2026-09';
    if (dateVal.includes('2026-08')) return '2026-08';
    if (dateVal.includes('2026-07')) return '2026-07';
    if (dateVal.includes('2026-06') || dateVal.includes('2026-05') || dateVal.includes('2026-03')) return '2026-06';
  }

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

