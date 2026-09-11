import { ProfileRow, HrLeaveRequestRow, Order, YeucauxhdRow } from '../types';

export interface KpiAwardInfo {
  rank: 'gold' | 'silver' | 'bronze';
  month: string;
  dept?: string;
}

const daysBetween = (startStr: string, endStr: string | null): number => {
  if (!endStr) return 1;
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 1;
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 1;
  }
};

/**
 * Tính toán danh hiệu thi đua chuyên cần & doanh số tự động theo từng Phòng Kinh Doanh
 * Loại trừ Giám Đốc và Admin
 */
export function computeKpiAwards(
  staffProfiles: ProfileRow[],
  requests: HrLeaveRequestRow[],
  orders: Order[],
  invoiceRequests: YeucauxhdRow[],
  monthKey: string
): Record<string, KpiAwardInfo> {
  // 1. Loại trừ Giám đốc và Admin
  const eligibleStaff = staffProfiles.filter(staff => {
    if (staff.role === 'admin') return false;
    const dept = (staff.department || '').trim().toLowerCase();
    if (!dept || dept.includes('giám đốc') || dept.includes('giam doc') ||
        dept.includes('ban giám đốc') || dept.includes('sale admin') || dept.includes('it')) {
      return false;
    }
    const name = staff.full_name.trim().toLowerCase();
    if (name.includes('giám đốc') || name.includes('giam doc') || name.includes('admin')) {
      return false;
    }
    return true;
  });

  const mappedList = eligibleStaff.map(staff => {
    const staffEmail = (staff.email || '').trim().toLowerCase();
    const staffName = staff.full_name.trim().toLowerCase();

    // Đơn nghỉ phép / đi trễ trong tháng đã duyệt
    const approvedMonthRequests = requests.filter(r => {
      if (r.status !== 'approved') return false;
      const rUser = r.requester_username.trim().toLowerCase();
      const rName = r.requester_name.trim().toLowerCase();
      const matchesStaff = (staffEmail && rUser === staffEmail) || (staffName && rName === staffName);
      if (!matchesStaff) return false;

      const d = r.start_date || r.created_at;
      if (!d) return false;
      return d.substring(0, 7) === monthKey;
    });

    let leaveDays = 0;
    let lateCount = 0;

    approvedMonthRequests.forEach(r => {
      if (r.type === 'di_tre') {
        lateCount += 1;
      } else if (r.type === 'nghi_phep') {
        const days = daysBetween(r.start_date, r.end_date);
        if (r.session === 'sang' || r.session === 'chieu') {
          leaveDays += 0.5;
        } else {
          leaveDays += days;
        }
      }
    });

    const score = Math.max(0, 100 - (leaveDays * 5) - (lateCount * 3));

    // Đếm đơn XHĐ và Đơn Cọc
    const invoicedOrderIds = new Set<string>();
    const depositOrderIds = new Set<string>();

    orders.forEach(o => {
      const oStaff = (o.staff || '').trim().toLowerCase();
      const matchesStaff = (staffEmail && oStaff.includes(staffEmail)) ||
                           (staffName && (oStaff.includes(staffName) || staffName.includes(oStaff)));
      if (!matchesStaff) return;

      const invDate = o.invoiceDate || '';
      const createdDate = o.createdAt || '';
      const isInvThisMonth = invDate.substring(0, 7) === monthKey ||
        (o.status === 'Đã xuất hóa đơn' && createdDate.substring(0, 7) === monthKey);

      if (isInvThisMonth && (o.status === 'Đã xuất hóa đơn' || o.linkHoaDonDaXuat || o.invoiceDate)) {
        invoicedOrderIds.add(o.id || o.customer);
      }

      let isDepositThisMonth = false;
      if (o.depositDate && o.depositDate !== 'Chưa có') {
        if (o.depositDate.includes('/')) {
          const parts = o.depositDate.split('/');
          if (parts.length === 3) {
            const dMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
            if (dMonth === monthKey) isDepositThisMonth = true;
          }
        } else if (o.depositDate.substring(0, 7) === monthKey) {
          isDepositThisMonth = true;
        }
      }
      if (!isDepositThisMonth && createdDate && createdDate.substring(0, 7) === monthKey) {
        isDepositThisMonth = true;
      }

      if (isDepositThisMonth) {
        depositOrderIds.add(o.id || o.customer);
      }
    });

    invoiceRequests.forEach(r => {
      const rStaff = (r.tvbh || '').trim().toLowerCase();
      const matchesStaff = (staffEmail && rStaff.includes(staffEmail)) ||
                           (staffName && (rStaff.includes(staffName) || staffName.includes(rStaff)));
      if (!matchesStaff) return;

      const invDate = r.ngay_xuat_hoa_don || r.ngay_yeu_cau || '';
      if (invDate.substring(0, 7) === monthKey) {
        if (r.trang_thai_xu_ly === 'Đã xuất hóa đơn' || r.url_hoa_don_da_xuat || r.ngay_xuat_hoa_don) {
          invoicedOrderIds.add(r.so_don_hang || r.id);
        }
      }

      const cocDate = r.ngay_coc || r.ngay_yeu_cau || '';
      if (cocDate.substring(0, 7) === monthKey) {
        depositOrderIds.add(r.so_don_hang || r.id);
      }
    });

    return {
      staff,
      department: staff.department?.trim() || 'Chưa phân bổ',
      leaveDays,
      lateCount,
      xhdCount: invoicedOrderIds.size,
      depositCount: depositOrderIds.size,
      score
    };
  });

  const sortFn = (a: any, b: any) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.xhdCount !== a.xhdCount) return b.xhdCount - a.xhdCount;
    if (b.depositCount !== a.depositCount) return b.depositCount - a.depositCount;
    if (a.lateCount !== b.lateCount) return a.lateCount - b.lateCount;
    if (a.leaveDays !== b.leaveDays) return a.leaveDays - b.leaveDays;
    return a.staff.full_name.localeCompare(b.staff.full_name, 'vi');
  };

  const deptMap: Record<string, typeof mappedList> = {};
  mappedList.forEach(item => {
    const d = item.department;
    if (!deptMap[d]) deptMap[d] = [];
    deptMap[d].push(item);
  });

  const autoAwardsMap: Record<string, KpiAwardInfo> = {};

  Object.keys(deptMap).forEach(deptName => {
    const group = deptMap[deptName].sort(sortFn);
    const isSalesDept = deptName.toLowerCase().includes('pkd') || deptName.toLowerCase().includes('kinh doanh');

    group.forEach((item, idx) => {
      let currentAward: 'gold' | 'silver' | 'bronze' | null = null;
      if (item.score > 0 && (isSalesDept || group.length >= 3)) {
        if (idx === 0) currentAward = 'gold';
        else if (idx === 1) currentAward = 'silver';
        else if (idx === 2) currentAward = 'bronze';
      }

      if (currentAward) {
        autoAwardsMap[item.staff.id] = { rank: currentAward, month: monthKey, dept: deptName };
      }
    });
  });

  return autoAwardsMap;
}
