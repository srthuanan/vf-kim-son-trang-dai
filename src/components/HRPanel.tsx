import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Clock3,
  Plus, Trash2, RefreshCw, User,
  FileText, AlertCircle, Search, Info, X, Users, CheckSquare,
  ChevronRight, Calendar, UserCheck, ShieldAlert, Send, FileCheck, ArrowRight,
  Trophy, Award, Medal, Sparkles, Filter
} from 'lucide-react';
import { HrLeaveRequestRow, ProfileRow, Order, YeucauxhdRow } from '../types';
import * as apiService from '../services/apiService';
import { MultiavatarView } from '../utils/avatarUtils';

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  nghi_phep: 'Nghỉ phép',
  di_tre: 'Đi trễ'
};

const SESSION_LABEL: Record<string, string> = {
  sang: 'Buổi sáng',
  chieu: 'Buổi chiều',
  ca_ngay: 'Cả ngày'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  pending: { label: 'Chờ TPKD thẩm định', color: '#d97706', bg: '#fffbeb', border: '#fef3c7', icon: <Clock3 size={12} /> },
  pending_director: { label: 'Chờ GĐ phê duyệt', color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe', icon: <Clock3 size={12} /> },
  approved: { label: 'Đã phê duyệt', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle2 size={12} /> },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: <XCircle size={12} /> }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtDateTime = (d: string | null | undefined) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const daysBetween = (start: string, end: string | null) => {
  if (!end) return 1;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / 86400000) + 1);
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface HRPanelProps {
  requests: HrLeaveRequestRow[];
  currentProfile: ProfileRow | null;
  currentUsername: string;
  onReload: () => void;
  staffProfiles: ProfileRow[];
  orders?: Order[];
  invoiceRequests?: YeucauxhdRow[];
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 9px', borderRadius: '999px',
      fontSize: '11.5px', fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Submit Modal ─────────────────────────────────────────────────────────────

interface SubmitModalProps {
  profile: ProfileRow;
  username: string;
  onClose: () => void;
  onSuccess: () => void;
}

const SubmitModal: React.FC<SubmitModalProps> = ({ profile, username, onClose, onSuccess }) => {
  const [type, setType] = useState<'nghi_phep' | 'di_tre'>('nghi_phep');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [session, setSession] = useState<'sang' | 'chieu' | 'ca_ngay'>('ca_ngay');
  const [lateTime, setLateTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!startDate) return setError('Vui lòng chọn ngày.');
    if (type === 'nghi_phep' && endDate && endDate < startDate) {
      return setError('Ngày kết thúc không được trước ngày bắt đầu.');
    }
    if (!reason.trim()) return setError('Vui lòng nhập lý do cụ thể.');
    setLoading(true); setError('');
    const { error: err } = await apiService.submitHrLeaveRequest({
      requester_name: profile.full_name,
      requester_username: username,
      requester_id: profile.id || null,
      type,
      start_date: startDate,
      end_date: type === 'nghi_phep' ? (endDate || startDate) : startDate,
      late_time: type === 'di_tre' ? lateTime : null,
      session: type === 'nghi_phep' ? session : null,
      reason: reason.trim()
    });
    setLoading(false);
    if (err) return setError('Lỗi gửi yêu cầu: ' + (err.message || 'Không thể tạo đơn xin phép'));
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ccfbf1', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarDays size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Tạo đơn Nghỉ phép / Đi trễ</h2>
          </div>
          <button onClick={onClose} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {error && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            {(['nghi_phep', 'di_tre'] as const).map(t => (
              <button 
                key={t} 
                onClick={() => setType(t)} 
                style={{
                  padding: '9px', borderRadius: '8px', border: 'none',
                  background: type === t ? '#ffffff' : 'transparent', 
                  color: type === t ? '#0f766e' : '#64748b',
                  fontWeight: type === t ? 700 : 500, fontSize: '13px', 
                  cursor: 'pointer', boxShadow: type === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: type === 'nghi_phep' ? '1fr 1fr' : '1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                {type === 'di_tre' ? 'Ngày xin đi trễ' : 'Từ ngày'}
              </label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }} />
            </div>
            {type === 'nghi_phep' && (
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Đến ngày</label>
                <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }} />
              </div>
            )}
          </div>

          {type === 'nghi_phep' && (
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Ca xin nghỉ</label>
              <select value={session} onChange={e => setSession(e.target.value as any)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}>
                <option value="ca_ngay">Cả ngày</option>
                <option value="sang">Buổi sáng</option>
                <option value="chieu">Buổi chiều</option>
              </select>
            </div>
          )}

          {type === 'di_tre' && (
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Giờ dự kiến đến</label>
              <input type="time" value={lateTime} onChange={e => setLateTime(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }} />
            </div>
          )}

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Lý do xin phép *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập chi tiết lý do..." rows={3}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'none', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
            <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
              Hủy
            </button>
            <button onClick={handleSubmit} disabled={loading} style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: 'none', background: '#0f766e', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              {loading ? 'Đang gửi...' : <><Send size={15} /> Gửi yêu cầu</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const HRPanel: React.FC<HRPanelProps> = ({
  requests,
  currentProfile,
  currentUsername,
  onReload,
  staffProfiles,
  orders = [],
  invoiceRequests = []
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'nghi_phep' | 'di_tre'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const role = currentProfile?.role || 'sales';
  const isAdmin = role === 'admin';
  const isTPKD = role === 'manager';
  const isDirector = role === 'admin';
  const hasPrivilege = isAdmin || isTPKD;

  const handleReload = async () => {
    setIsReloading(true);
    await onReload();
    setTimeout(() => setIsReloading(false), 300);
  };

  const visibleRequests = useMemo(() => {
    if (isAdmin) return requests;
    const lowerUser = currentUsername.trim().toLowerCase();
    const lowerName = (currentProfile?.full_name || '').trim().toLowerCase();
    if (isTPKD && currentProfile?.department) {
      const deptStaffUsernames = new Set(
        staffProfiles
          .filter(s => s.department === currentProfile.department)
          .map(s => s.email?.trim().toLowerCase() || s.id)
      );
      deptStaffUsernames.add(lowerUser);
      return requests.filter(r => 
        deptStaffUsernames.has(r.requester_username.toLowerCase()) ||
        r.requester_name.toLowerCase() === lowerName
      );
    }
    return requests.filter(r => 
      r.requester_username.toLowerCase() === lowerUser ||
      r.requester_name.toLowerCase() === lowerName
    );
  }, [requests, isAdmin, isTPKD, currentProfile, staffProfiles, currentUsername]);

  const filtered = useMemo(() => {
    return visibleRequests.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (searchQ.trim()) {
        const q = searchQ.trim().toLowerCase();
        const nameMatch = r.requester_name.toLowerCase().includes(q);
        const reasonMatch = r.reason.toLowerCase().includes(q);
        if (!nameMatch && !reasonMatch) return false;
      }
      return true;
    });
  }, [visibleRequests, filter, typeFilter, searchQ]);

  const [subView, setSubView] = useState<'requests' | 'kpi'>('requests');
  const [kpiMonth, setKpiMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [kpiDept, setKpiDept] = useState<string>('all');
  const [kpiSearch, setKpiSearch] = useState<string>('');
  const [kpiCacheVersion, setKpiCacheVersion] = useState(0);

  useEffect(() => {
    const handleRankUpdate = () => {
      setKpiCacheVersion(v => v + 1);
    };
    window.addEventListener('kpi-rank-updated', handleRankUpdate);
    return () => window.removeEventListener('kpi-rank-updated', handleRankUpdate);
  }, []);

  // Danh sách các tháng có dữ liệu yêu cầu
  const availableKpiMonths = useMemo(() => {
    const set = new Set<string>();
    const now = new Date();
    const curM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    set.add(curM);
    requests.forEach(r => {
      const d = r.start_date || r.created_at;
      if (d) {
        const dateObj = new Date(d);
        if (!isNaN(dateObj.getTime())) {
          set.add(`${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [requests]);

  // Danh sách nhân sự thi đua chuyên cần: Bỏ giám đốc và admin ra
  const kpiStaffProfiles = useMemo(() => {
    return staffProfiles.filter(staff => {
      // 1. Bỏ role admin
      if (staff.role === 'admin') return false;

      // 2. Bỏ Ban Giám Đốc, Sale Admin, Phòng IT hoặc không có phòng ban
      const dept = (staff.department || '').trim().toLowerCase();
      if (!dept || dept.includes('giám đốc') || dept.includes('giam doc') ||
          dept.includes('ban giám đốc') || dept.includes('sale admin') || dept.includes('it')) {
        return false;
      }

      // 3. Bỏ theo tên nếu có Giám Đốc hoặc Admin
      const name = staff.full_name.trim().toLowerCase();
      if (name.includes('giám đốc') || name.includes('giam doc') || name.includes('admin')) {
        return false;
      }

      return true;
    });
  }, [staffProfiles]);

  // Danh sách các phòng ban tham gia thi đua (ưu tiên các phòng kinh doanh lên trước)
  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    kpiStaffProfiles.forEach(s => {
      if (s.department?.trim()) depts.add(s.department.trim());
    });
    return Array.from(depts).sort((a, b) => {
      const aIsPkd = a.toLowerCase().includes('pkd') || a.toLowerCase().includes('kinh doanh');
      const bIsPkd = b.toLowerCase().includes('pkd') || b.toLowerCase().includes('kinh doanh');
      if (aIsPkd && !bIsPkd) return -1;
      if (!aIsPkd && bIsPkd) return 1;
      return a.localeCompare(b, 'vi');
    });
  }, [kpiStaffProfiles]);

  // Tính toán bảng thống kê KPI chuyên cần theo tháng đã chọn - TÍNH RIÊNG THEO TỪNG PHÒNG KINH DOANH
  const kpiStats = useMemo(() => {
    const mappedList = kpiStaffProfiles.map(staff => {
      const staffEmail = (staff.email || '').trim().toLowerCase();
      const staffName = staff.full_name.trim().toLowerCase();

      // Lọc các đơn của nhân viên này trong tháng đã chọn và đã được duyệt
      const approvedMonthRequests = requests.filter(r => {
        if (r.status !== 'approved') return false;
        const rUser = r.requester_username.trim().toLowerCase();
        const rName = r.requester_name.trim().toLowerCase();
        const matchesStaff = (staffEmail && rUser === staffEmail) || (staffName && rName === staffName);
        if (!matchesStaff) return false;

        const d = r.start_date || r.created_at;
        if (!d) return false;
        const mKey = d.substring(0, 7);
        return mKey === kpiMonth;
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

      // Tiêu chuẩn chấm điểm chuyên cần:
      // Tối đa 100 điểm: mỗi ngày nghỉ phép trừ 5 điểm, mỗi lần đi trễ trừ 3 điểm
      const score = Math.max(0, 100 - (leaveDays * 5) - (lateCount * 3));

      // Đếm số đơn Xuất Hóa Đơn (XHĐ) và Đơn Cọc của nhân sự trong tháng đã chọn
      const invoicedOrderIds = new Set<string>();
      const depositOrderIds = new Set<string>();

      (orders || []).forEach(o => {
        const oStaff = (o.staff || '').trim().toLowerCase();
        const matchesStaff = (staffEmail && oStaff.includes(staffEmail)) ||
                             (staffName && (oStaff.includes(staffName) || staffName.includes(oStaff)));
        if (!matchesStaff) return;

        // 1. Kiểm tra đơn Xuất Hóa Đơn
        const invDate = o.invoiceDate || '';
        const createdDate = o.createdAt || '';
        const isInvThisMonth = invDate.substring(0, 7) === kpiMonth ||
          (o.status === 'Đã xuất hóa đơn' && createdDate.substring(0, 7) === kpiMonth);

        if (isInvThisMonth && (o.status === 'Đã xuất hóa đơn' || o.linkHoaDonDaXuat || o.invoiceDate)) {
          invoicedOrderIds.add(o.id || o.customer);
        }

        // 2. Kiểm tra đơn Cọc trong tháng
        let isDepositThisMonth = false;
        if (o.depositDate && o.depositDate !== 'Chưa có') {
          if (o.depositDate.includes('/')) {
            const parts = o.depositDate.split('/');
            if (parts.length === 3) {
              const dMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
              if (dMonth === kpiMonth) isDepositThisMonth = true;
            }
          } else if (o.depositDate.substring(0, 7) === kpiMonth) {
            isDepositThisMonth = true;
          }
        }
        if (!isDepositThisMonth && createdDate && createdDate.substring(0, 7) === kpiMonth) {
          isDepositThisMonth = true;
        }

        if (isDepositThisMonth) {
          depositOrderIds.add(o.id || o.customer);
        }
      });

      (invoiceRequests || []).forEach(r => {
        const rStaff = (r.tvbh || '').trim().toLowerCase();
        const matchesStaff = (staffEmail && rStaff.includes(staffEmail)) ||
                             (staffName && (rStaff.includes(staffName) || staffName.includes(rStaff)));
        if (!matchesStaff) return;

        const invDate = r.ngay_xuat_hoa_don || r.ngay_yeu_cau || '';
        if (invDate.substring(0, 7) === kpiMonth) {
          if (r.trang_thai_xu_ly === 'Đã xuất hóa đơn' || r.url_hoa_don_da_xuat || r.ngay_xuat_hoa_don) {
            invoicedOrderIds.add(r.so_don_hang || r.id);
          }
        }

        const cocDate = r.ngay_coc || r.ngay_yeu_cau || '';
        if (cocDate.substring(0, 7) === kpiMonth) {
          depositOrderIds.add(r.so_don_hang || r.id);
        }
      });

      const xhdCount = invoicedOrderIds.size;
      const depositCount = depositOrderIds.size;

      return {
        staff,
        department: staff.department?.trim() || 'Chưa phân bổ',
        leaveDays,
        lateCount,
        xhdCount,
        depositCount,
        approvedRequestsCount: approvedMonthRequests.length,
        score
      };
    });

    // Sắp xếp thứ tự ưu tiên:
    // 1. Điểm chuyên cần (Score)
    // 2. NẾU TRÙNG ĐIỂM -> SO SÁNH AI CÓ NHIỀU ĐƠN XUẤT HÓA ĐƠN (XHĐ) HƠN!
    // 3. NẾU VẪN TRÙNG ĐƠN XHĐ -> SO SÁNH AI CÓ NHIỀU ĐƠN CỌC HƠN!
    // 4. Số lần đi trễ ít hơn
    // 5. Số ngày nghỉ phép ít hơn
    // 6. Theo thứ tự họ tên A-Z
    const sortFn = (a: any, b: any) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.xhdCount !== a.xhdCount) return b.xhdCount - a.xhdCount;
      if (b.depositCount !== a.depositCount) return b.depositCount - a.depositCount;
      if (a.lateCount !== b.lateCount) return a.lateCount - b.lateCount;
      if (a.leaveDays !== b.leaveDays) return a.leaveDays - b.leaveDays;
      return a.staff.full_name.localeCompare(b.staff.full_name, 'vi');
    };

    // Phân nhóm theo từng phòng ban
    const deptMap: Record<string, typeof mappedList> = {};
    mappedList.forEach(item => {
      const d = item.department;
      if (!deptMap[d]) deptMap[d] = [];
      deptMap[d].push(item);
    });

    const sortedDeptNames = Object.keys(deptMap).sort((a, b) => {
      const aIsPkd = a.toLowerCase().includes('pkd') || a.toLowerCase().includes('kinh doanh');
      const bIsPkd = b.toLowerCase().includes('pkd') || b.toLowerCase().includes('kinh doanh');
      if (aIsPkd && !bIsPkd) return -1;
      if (!aIsPkd && bIsPkd) return 1;
      return a.localeCompare(b, 'vi');
    });

    const finalStats: ((typeof mappedList)[0] & { rankInDept: number; autoRank: 'gold' | 'silver' | 'bronze' | null; currentAward: 'gold' | 'silver' | 'bronze' | null })[] = [];
    const autoAwardsMap: Record<string, { rank: 'gold' | 'silver' | 'bronze'; month: string; dept?: string }> = {};

    sortedDeptNames.forEach(deptName => {
      const group = deptMap[deptName].sort(sortFn);
      const isSalesDept = deptName.toLowerCase().includes('pkd') || deptName.toLowerCase().includes('kinh doanh');

      group.forEach((item, idx) => {
        let currentAward: 'gold' | 'silver' | 'bronze' | null = null;
        // Gán Top 1 (🥇 Vàng), Top 2 (🥈 Bạc), Top 3 (🥉 Đồng) riêng cho từng phòng kinh doanh
        if (item.score > 0 && (isSalesDept || group.length >= 3)) {
          if (idx === 0) currentAward = 'gold';
          else if (idx === 1) currentAward = 'silver';
          else if (idx === 2) currentAward = 'bronze';
        }

        const enriched = {
          ...item,
          rankInDept: idx + 1,
          autoRank: currentAward,
          currentAward
        };

        if (currentAward) {
          autoAwardsMap[item.staff.id] = { rank: currentAward, month: kpiMonth, dept: deptName };
        }

        finalStats.push(enriched);
      });
    });

    // Tự động lưu cache Top 3 của từng phòng kinh doanh vào localStorage để hiển thị trên thẻ Profile / Sidebar của TVBH
    try {
      localStorage.setItem(`kpi_awards_${kpiMonth}`, JSON.stringify(autoAwardsMap));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kpi-rank-updated'));
      }
    } catch {}

    return finalStats;
  }, [staffProfiles, requests, orders, invoiceRequests, kpiMonth]);

  // Lọc danh sách KPI theo phòng ban và từ khóa tìm kiếm
  const filteredKpiStats = useMemo(() => {
    return kpiStats.filter(item => {
      if (kpiDept !== 'all' && item.department !== kpiDept) return false;
      if (kpiSearch.trim()) {
        const q = kpiSearch.trim().toLowerCase();
        const nameMatch = item.staff.full_name.toLowerCase().includes(q);
        const emailMatch = (item.staff.email || '').toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [kpiStats, kpiDept, kpiSearch]);

  // Phân nhóm hiển thị theo từng phòng ban
  const kpiDepartmentGroups = useMemo(() => {
    const groups: { department: string; items: typeof filteredKpiStats; isSalesDept: boolean }[] = [];
    const deptMap: Record<string, typeof filteredKpiStats> = {};

    filteredKpiStats.forEach(item => {
      const dept = item.department;
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(item);
    });

    const sortedDepts = Object.keys(deptMap).sort((a, b) => {
      const aIsPkd = a.toLowerCase().includes('pkd') || a.toLowerCase().includes('kinh doanh');
      const bIsPkd = b.toLowerCase().includes('pkd') || b.toLowerCase().includes('kinh doanh');
      if (aIsPkd && !bIsPkd) return -1;
      if (!aIsPkd && bIsPkd) return 1;
      return a.localeCompare(b, 'vi');
    });

    sortedDepts.forEach(dept => {
      groups.push({
        department: dept,
        items: deptMap[dept],
        isSalesDept: dept.toLowerCase().includes('pkd') || dept.toLowerCase().includes('kinh doanh')
      });
    });

    return groups;
  }, [filteredKpiStats]);

  // Default select first item if none selected
  useEffect(() => {
    if (filtered.length > 0 && (!selectedId || !filtered.some(r => r.id === selectedId))) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedReq = useMemo(() => {
    return requests.find(r => r.id === selectedId) || filtered[0] || null;
  }, [requests, selectedId, filtered]);

  useEffect(() => {
    setReviewNote('');
  }, [selectedId]);

  const pendingCount = useMemo(() => visibleRequests.filter(r => r.status === 'pending').length, [visibleRequests]);
  const pendingDirectorCount = useMemo(() => visibleRequests.filter(r => r.status === 'pending_director').length, [visibleRequests]);
  const approvedCount = useMemo(() => visibleRequests.filter(r => r.status === 'approved').length, [visibleRequests]);
  const rejectedCount = useMemo(() => visibleRequests.filter(r => r.status === 'rejected').length, [visibleRequests]);

  const handleReview = async (req: HrLeaveRequestRow, newStatus: 'pending_director' | 'approved' | 'rejected') => {
    if (!currentProfile) return;
    setProcessing(true);
    const { error: err } = await apiService.reviewHrLeaveRequest(
      req.id,
      newStatus,
      reviewNote.trim() || '',
      currentProfile.full_name
    );
    setProcessing(false);
    if (err) {
      alert('Lỗi phê duyệt: ' + err.message);
      return;
    }
    onReload();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa yêu cầu này?')) return;
    const { error: err } = await apiService.deleteHrLeaveRequest(id);
    if (err) {
      alert('Lỗi xóa yêu cầu: ' + err.message);
      return;
    }
    onReload();
  };

  const FILTER_TABS = [
    { key: 'all', label: 'Tất cả', count: visibleRequests.length },
    { key: 'pending', label: 'Chờ TPKD', count: pendingCount },
    { key: 'pending_director', label: 'Chờ GĐ', count: pendingDirectorCount },
    { key: 'approved', label: 'Đã duyệt', count: approvedCount },
    { key: 'rejected', label: 'Từ chối', count: rejectedCount },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden', padding: isMobile ? '8px' : '16px 24px', gap: '12px' }}>
      
      {/* ── TOP SWITCHER: DANH SÁCH ĐƠN vs BẢNG VÀNG THI ĐUA KPI ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#ffffff', borderRadius: '14px', padding: '6px 10px',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        flexShrink: 0, flexWrap: 'wrap', gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
          <button
            onClick={() => setSubView('requests')}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12.5px', fontWeight: subView === 'requests' ? 700 : 500,
              background: subView === 'requests' ? '#ffffff' : 'transparent',
              color: subView === 'requests' ? '#0f766e' : '#64748b',
              boxShadow: subView === 'requests' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
            }}
          >
            <CalendarDays size={15} />
            <span>Danh sách đơn phép</span>
            <span style={{ fontSize: '10.5px', background: subView === 'requests' ? '#ccfbf1' : '#e2e8f0', color: subView === 'requests' ? '#0f766e' : '#64748b', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
              {visibleRequests.length}
            </span>
          </button>

          <button
            onClick={() => setSubView('kpi')}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12.5px', fontWeight: subView === 'kpi' ? 700 : 500,
              background: subView === 'kpi' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: subView === 'kpi' ? '#ffffff' : '#b45309',
              boxShadow: subView === 'kpi' ? '0 2px 8px rgba(245, 158, 11, 0.3)' : 'none',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s'
            }}
          >
            <Trophy size={15} />
            <span>Bảng Vàng Thi Đua KPI</span>
            <span style={{ fontSize: '10px', background: subView === 'kpi' ? 'rgba(255,255,255,0.25)' : '#fef3c7', color: subView === 'kpi' ? '#ffffff' : '#b45309', padding: '1px 6px', borderRadius: '999px', fontWeight: 800 }}>
              Mới 🏆
            </span>
          </button>
        </div>

        {subView === 'kpi' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Lọc Tháng */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Tháng:</span>
              <select
                value={kpiMonth}
                onChange={e => setKpiMonth(e.target.value)}
                style={{
                  padding: '5px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '12px', fontWeight: 700, background: '#fff', color: '#0f172a', outline: 'none'
                }}
              >
                {availableKpiMonths.map(m => (
                  <option key={m} value={m}>
                    📅 Tháng {m.split('-')[1]}/{m.split('-')[0]}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc Phòng Ban */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>Phòng ban:</span>
              <select
                value={kpiDept}
                onChange={e => setKpiDept(e.target.value)}
                style={{
                  padding: '5px 8px', borderRadius: '8px', border: '1px solid #cbd5e1',
                  fontSize: '12px', background: '#fff', color: '#0f172a', outline: 'none'
                }}
              >
                <option value="all">Tất cả ({kpiStaffProfiles.length})</option>
                {availableDepts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Tìm kiếm */}
            <div style={{ position: 'relative', width: isMobile ? '110px' : '140px' }}>
              <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={kpiSearch}
                onChange={e => setKpiSearch(e.target.value)}
                placeholder="Tìm bạn..."
                style={{
                  width: '100%', padding: '5px 8px 5px 26px', borderRadius: '8px',
                  border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', outline: 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── SUB VIEW 2: BẢNG VÀNG THI ĐUA & THỐNG KÊ KPI CHUYÊN CẦN (CHIA THEO PHÒNG KINH DOANH) ── */}
      {subView === 'kpi' ? (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
          
          {/* Thanh phân nhóm nhanh theo từng Phòng Kinh Doanh */}
          <div style={{
            display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap',
            background: '#ffffff', padding: '10px 14px', borderRadius: '12px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px' }}>
              <Users size={14} /> Phân nhóm:
            </span>

            <button
              onClick={() => setKpiDept('all')}
              style={{
                padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                borderColor: kpiDept === 'all' ? '#0f766e' : '#cbd5e1',
                background: kpiDept === 'all' ? '#0f766e' : '#fff',
                color: kpiDept === 'all' ? '#fff' : '#475569',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s'
              }}
            >
              🏢 Tất cả phòng ban
              <span style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '999px',
                background: kpiDept === 'all' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: kpiDept === 'all' ? '#fff' : '#64748b'
              }}>
                {kpiStaffProfiles.length}
              </span>
            </button>

            {availableDepts.map(d => {
              const count = kpiStaffProfiles.filter(s => s.department?.trim() === d).length;
              const isSelected = kpiDept === d;
              const isPkd = d.toLowerCase().includes('pkd') || d.toLowerCase().includes('kinh doanh');
              return (
                <button
                  key={d}
                  onClick={() => setKpiDept(d)}
                  style={{
                    padding: '5px 12px', borderRadius: '8px', border: '1px solid',
                    borderColor: isSelected ? (isPkd ? '#d97706' : '#0f766e') : '#cbd5e1',
                    background: isSelected ? (isPkd ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#0f766e') : '#fff',
                    color: isSelected ? '#fff' : '#475569',
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s',
                    boxShadow: isSelected && isPkd ? '0 2px 6px rgba(245, 158, 11, 0.25)' : 'none'
                  }}
                >
                  {isPkd ? '🚗' : '💼'} {d}
                  <span style={{
                    fontSize: '10px', padding: '1px 6px', borderRadius: '999px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                    color: isSelected ? '#fff' : '#64748b'
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* DANH SÁCH BẢNG THI ĐUA CHIA THEO TỪNG PHÒNG KINH DOANH */}
          {kpiDepartmentGroups.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <Users size={36} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Không có dữ liệu nhân sự phù hợp với bộ lọc hiện tại.</div>
            </div>
          ) : (
            kpiDepartmentGroups.map(group => {
              const top1 = group.items.find(i => i.rankInDept === 1);

              return (
                <div key={group.department} style={{
                  background: '#ffffff', borderRadius: '16px',
                  border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  overflow: 'hidden', display: 'flex', flexDirection: 'column'
                }}>
                  {/* Header của phòng ban */}
                  <div style={{
                    padding: '14px 18px', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '10px',
                    background: group.isSalesDept ? 'linear-gradient(to right, #fffbeb, #fef3c7)' : '#f8fafc'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: group.isSalesDept ? '#92400e' : '#0f172a' }}>
                          {group.isSalesDept ? '🚗' : '🏢'} {group.department}
                        </h3>
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                          background: group.isSalesDept ? '#fef3c7' : '#e2e8f0',
                          color: group.isSalesDept ? '#b45309' : '#475569',
                          border: `1px solid ${group.isSalesDept ? '#fde68a' : '#cbd5e1'}`
                        }}>
                          {group.items.length} nhân sự
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                        Tiêu chuẩn: Tối đa 100đ chuyên cần. <strong>Trùng điểm xét Đơn XHĐ ➔ Trùng đơn XHĐ xét Đơn Cọc</strong>.
                      </span>
                    </div>

                    {top1 && top1.score > 0 && group.isSalesDept && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: '#ffffff', padding: '6px 12px', borderRadius: '10px',
                        border: '1px solid #fde68a', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        <span style={{ fontSize: '20px', lineHeight: 1 }}>🥇</span>
                        <div>
                          <span style={{ fontSize: '10px', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>
                            Quán quân {group.department}
                          </span>
                          <strong style={{ fontSize: '13px', color: '#0f172a' }}>{top1.staff.full_name}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bảng Chi Tiết Của Phòng Ban Này */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '760px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', fontSize: '11.5px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <th style={{ padding: '10px 14px', width: '50px', textAlign: 'center' }}>Top</th>
                          <th style={{ padding: '10px 14px' }}>Nhân viên</th>
                          <th style={{ padding: '10px 14px' }}>Phòng ban</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Nghỉ phép</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Đi trễ</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }} title="Số lượng đơn hàng đã Xuất Hóa Đơn trong tháng (tiêu chí phụ khi trùng điểm chuyên cần)">Đơn XHĐ 🚗</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }} title="Số lượng đơn cọc phát sinh trong tháng (tiêu chí phụ khi trùng cả điểm chuyên cần và đơn XHĐ)">Đơn Cọc 📝</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Điểm chuyên cần</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Xếp hạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map(item => {
                          const isTop1 = item.rankInDept === 1 && item.currentAward === 'gold';
                          const isTop2 = item.rankInDept === 2 && item.currentAward === 'silver';
                          const isTop3 = item.rankInDept === 3 && item.currentAward === 'bronze';

                          return (
                            <tr
                              key={item.staff.id}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                background: isTop1 ? '#fffbeb' : isTop2 ? '#f8fafc' : isTop3 ? '#fff7ed' : '#ffffff',
                                transition: 'background 0.15s'
                              }}
                            >
                              {/* Thứ tự trong phòng ban */}
                              <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800 }}>
                                {isTop1 ? (
                                  <span style={{ fontSize: '18px' }}>🥇</span>
                                ) : isTop2 ? (
                                  <span style={{ fontSize: '18px' }}>🥈</span>
                                ) : isTop3 ? (
                                  <span style={{ fontSize: '18px' }}>🥉</span>
                                ) : (
                                  <span style={{ color: '#94a3b8', fontSize: '13px' }}>#{item.rankInDept}</span>
                                )}
                              </td>

                              {/* Nhân viên */}
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    padding: isTop1 || isTop2 || isTop3 ? '2px' : '0',
                                    background: isTop1
                                      ? 'linear-gradient(135deg, #f59e0b, #fef08a, #d97706)'
                                      : isTop2
                                      ? 'linear-gradient(135deg, #94a3b8, #f8fafc, #64748b)'
                                      : isTop3
                                      ? 'linear-gradient(135deg, #ea580c, #fed7aa, #9a3412)'
                                      : '#e2e8f0',
                                    boxShadow: isTop1 ? '0 2px 6px rgba(217, 119, 6, 0.35)' : 'none',
                                    flexShrink: 0,
                                    position: 'relative'
                                  }}>
                                    <MultiavatarView
                                      seed={item.staff.id || item.staff.email || item.staff.full_name}
                                      size="100%"
                                      style={{ background: '#ffffff' }}
                                    />
                                    {isTop1 && (
                                      <span style={{
                                        position: 'absolute', top: '-6px', right: '-4px', fontSize: '11px',
                                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))'
                                      }}>
                                        👑
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <strong style={{ fontSize: '13.5px', color: '#0f172a', display: 'block' }}>
                                      {item.staff.full_name}
                                    </strong>
                                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                      {item.staff.email || 'Chưa có email'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Phòng ban */}
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>
                                  {item.department}
                                </span>
                              </td>

                              {/* Nghỉ phép */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                  background: item.leaveDays === 0 ? '#f0fdf4' : '#fff1f2',
                                  color: item.leaveDays === 0 ? '#16a34a' : '#e11d48'
                                }}>
                                  {item.leaveDays} ngày
                                </span>
                              </td>

                              {/* Đi trễ */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                                  background: item.lateCount === 0 ? '#f0fdf4' : '#fef3c7',
                                  color: item.lateCount === 0 ? '#16a34a' : '#b45309'
                                }}>
                                  {item.lateCount} lần
                                </span>
                              </td>

                              {/* Đơn XHĐ */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800,
                                  background: item.xhdCount > 0 ? '#eff6ff' : '#f8fafc',
                                  color: item.xhdCount > 0 ? '#2563eb' : '#94a3b8',
                                  border: `1px solid ${item.xhdCount > 0 ? '#bfdbfe' : '#e2e8f0'}`
                                }}
                                title={`Số lượng đơn hàng đã Xuất Hóa Đơn trong tháng ${kpiMonth}: ${item.xhdCount} xe`}
                                >
                                  🚗 {item.xhdCount} đơn
                                </span>
                              </td>

                              {/* Đơn Cọc */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '3px',
                                  padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800,
                                  background: item.depositCount > 0 ? '#f0fdf4' : '#f8fafc',
                                  color: item.depositCount > 0 ? '#16a34a' : '#94a3b8',
                                  border: `1px solid ${item.depositCount > 0 ? '#bbf7d0' : '#e2e8f0'}`
                                }}
                                title={`Số lượng đơn cọc phát sinh trong tháng ${kpiMonth}: ${item.depositCount} hợp đồng`}
                                >
                                  📝 {item.depositCount} đơn
                                </span>
                              </td>

                              {/* Điểm chuyên cần */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <strong style={{
                                  fontSize: '14px',
                                  color: item.score >= 95 ? '#16a34a' : item.score >= 80 ? '#0284c7' : '#e11d48'
                                }}>
                                  {item.score} đ
                                </strong>
                              </td>

                              {/* Xếp hạng */}
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                {item.currentAward ? (
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                                    padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 800,
                                    background: item.currentAward === 'gold' ? '#fef3c7' : item.currentAward === 'silver' ? '#f1f5f9' : '#ffedd5',
                                    color: item.currentAward === 'gold' ? '#b45309' : item.currentAward === 'silver' ? '#475569' : '#9a3412',
                                    border: `1px solid ${item.currentAward === 'gold' ? '#fde68a' : item.currentAward === 'silver' ? '#cbd5e1' : '#fed7aa'}`,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                  }}>
                                    {item.currentAward === 'gold' ? '🥇 Hạng Vàng' : item.currentAward === 'silver' ? '🥈 Hạng Bạc' : '🥉 Hạng Đồng'}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ── MAIN WORKSPACE MASTER-DETAIL ── */
        <div style={{ 
          flex: 1, 
          overflow: 'hidden', 
          display: isMobile ? 'flex' : 'grid', 
          flexDirection: isMobile ? 'column' : 'row',
          gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', 
          gap: isMobile ? '12px' : '20px', 
          minHeight: 0 
        }}>
        
        {/* LEFT COLUMN: REQUEST LIST TABLE */}
        {(!isMobile || mobileView === 'list') && (
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            
            {/* Toolbar & Filters */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              
              {/* Segmented Filter Pills */}
              <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '10px', overflowX: 'auto', maxWidth: '100%' }}>
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    style={{
                      padding: '5px 9px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                      fontSize: '12px', fontWeight: filter === tab.key ? 700 : 500,
                      background: filter === tab.key ? '#ffffff' : 'transparent',
                      color: filter === tab.key ? '#0f766e' : '#64748b',
                      boxShadow: filter === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                      display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '999px', background: filter === tab.key ? '#ccfbf1' : '#e2e8f0', color: filter === tab.key ? '#0f766e' : '#64748b', fontWeight: 700 }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Type, Search & Action Buttons */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <select 
                  value={typeFilter} 
                  onChange={e => setTypeFilter(e.target.value as any)}
                  style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', color: '#0f172a', outline: 'none' }}
                >
                  <option value="all">Tất cả loại</option>
                  <option value="nghi_phep">Nghỉ phép</option>
                  <option value="di_tre">Đi trễ</option>
                </select>

                {hasPrivilege && (
                  <div style={{ position: 'relative', width: isMobile ? '120px' : '150px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      value={searchQ} 
                      onChange={e => setSearchQ(e.target.value)} 
                      placeholder="Tìm..." 
                      style={{ width: '100%', padding: '5px 8px 5px 26px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', background: '#fff', outline: 'none' }} 
                    />
                  </div>
                )}

                <button onClick={handleReload} title="Tải lại dữ liệu" style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={14} className={isReloading ? "spin-animation" : ""} />
                </button>

                <button 
                  onClick={() => setShowSubmit(true)} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', 
                    borderRadius: '8px', border: 'none', background: '#0f766e', color: '#fff', 
                    fontSize: '12px', fontWeight: 700, cursor: 'pointer', 
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.2)', whiteSpace: 'nowrap'
                  }}
                >
                  <Plus size={15} strokeWidth={2.5} /> {isMobile ? 'Tạo đơn' : 'Gửi yêu cầu mới'}
                </button>
              </div>
            </div>

            {/* List Rows */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  <FileText size={36} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                  <p style={{ fontWeight: 600, margin: 0, fontSize: '14px' }}>Không có đơn xin phép nào</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filtered.map(req => {
                    const isSelected = selectedReq?.id === req.id;
                    const initial = req.requester_name.trim().charAt(0).toUpperCase();

                    return (
                      <div
                        key={req.id}
                        onClick={() => {
                          setSelectedId(req.id);
                          if (isMobile) setMobileView('detail');
                        }}
                        style={{
                          padding: '12px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                          background: isSelected ? '#ecfdf5' : '#ffffff',
                          borderLeft: isSelected ? '4px solid #0f766e' : '4px solid transparent',
                          display: 'flex', flexDirection: isMobile ? 'column' : 'row', 
                          alignItems: isMobile ? 'flex-start' : 'center', 
                          justifyContent: 'space-between', gap: isMobile ? '8px' : '12px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', minWidth: 0 }}>
                          <MultiavatarView
                            seed={req.requester_username || req.requester_name}
                            size={34}
                            style={{
                              background: '#ffffff',
                              border: isSelected ? '2px solid #0f766e' : '1px solid #e2e8f0'
                            }}
                          />

                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <strong style={{ fontSize: '13.5px', color: isSelected ? '#0f766e' : '#0f172a', fontWeight: 700 }}>{req.requester_name}</strong>
                              <span style={{ fontSize: '10.5px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                {TYPE_LABEL[req.type]}
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                              "{req.reason}"
                            </span>
                          </div>

                          <StatusBadge status={req.status} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '11.5px', color: '#64748b', borderTop: isMobile ? '1px dashed #f1f5f9' : 'none', paddingTop: isMobile ? '6px' : 0 }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {fmtDate(req.start_date)}
                            {req.end_date && req.end_date !== req.start_date ? ` → ${fmtDate(req.end_date)}` : ''}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: '#94a3b8' }}>
                              {req.type === 'di_tre' ? `Đến: ${req.late_time}` : (req.session ? SESSION_LABEL[req.session] : 'Cả ngày')}
                            </span>
                            <ChevronRight size={16} style={{ color: isSelected ? '#0f766e' : '#cbd5e1' }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: DETAILS & APPROVAL PANEL */}
        {(!isMobile || mobileView === 'detail') && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Mobile Back Button */}
            {isMobile && (
              <button
                onClick={() => setMobileView('list')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px',
                  borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff',
                  color: '#0f766e', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  marginBottom: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                ← Quay lại danh sách đơn
              </button>
            )}

            {selectedReq ? (
              <div style={{ 
                background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', height: '100%' 
              }}>
              
              {/* Header Banner */}
              <div style={{ 
                background: '#0f766e', padding: '20px', color: '#ffffff',
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <MultiavatarView
                      seed={selectedReq.requester_username || selectedReq.requester_name}
                      size={46}
                      style={{
                        background: '#ffffff',
                        border: '2px solid rgba(255,255,255,0.85)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                      }}
                    />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#ffffff' }}>{selectedReq.requester_name}</h3>
                      <span style={{ fontSize: '12px', color: '#ccfbf1' }}>{selectedReq.requester_username}</span>
                    </div>
                  </div>

                  <StatusBadge status={selectedReq.status} />
                </div>
              </div>

              {/* Body Details */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1 }}>
                
                {/* Details Summary */}
                <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Thông tin xin phép
                  </span>

                  {selectedReq.type === 'nghi_phep' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Ngày nghỉ:</span>
                        <strong style={{ color: '#0f172a' }}>
                          {fmtDate(selectedReq.start_date)}
                          {selectedReq.end_date && selectedReq.end_date !== selectedReq.start_date ? ` → ${fmtDate(selectedReq.end_date)}` : ''}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Ca & Thời lượng:</span>
                        <strong style={{ color: '#0f172a' }}>
                          {selectedReq.session ? SESSION_LABEL[selectedReq.session] : 'Cả ngày'} ({daysBetween(selectedReq.start_date, selectedReq.end_date)} ngày)
                        </strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Ngày xin đi trễ:</span>
                        <strong style={{ color: '#0f172a' }}>{fmtDate(selectedReq.start_date)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#64748b' }}>Giờ đến dự kiến:</span>
                        <strong style={{ color: '#d97706' }}>{selectedReq.late_time}</strong>
                      </div>
                    </>
                  )}
                </div>

                {/* Reason Text */}
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Lý do xin phép</span>
                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', color: '#0f172a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedReq.reason}
                  </div>
                </div>

                {/* Approval Review Section */}
                {(() => {
                  const isOwnRequest = selectedReq.requester_username === currentUsername;
                  const canThamdinh = isTPKD && !isDirector && !isOwnRequest && selectedReq.status === 'pending';
                  const canPheduyet = isDirector && !isOwnRequest && (selectedReq.status === 'pending' || selectedReq.status === 'pending_director');
                  const showReviewArea = canThamdinh || canPheduyet;

                  if (showReviewArea) {
                    return (
                      <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>Xét duyệt đơn này</span>
                        <textarea
                          value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                          placeholder="Ghi chú thẩm định / phê duyệt..."
                          rows={2}
                          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleReview(selectedReq, 'rejected')} 
                            disabled={processing} 
                            style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                          >
                            Từ chối
                          </button>
                          <button 
                            onClick={() => handleReview(selectedReq, canPheduyet ? 'approved' : 'pending_director')} 
                            disabled={processing} 
                            style={{ flex: 1.5, padding: '9px', borderRadius: '8px', border: 'none', background: '#0f766e', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                          >
                            {canPheduyet ? 'Duyệt đơn này' : 'Chuyển GĐ duyệt'}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (selectedReq.status === 'approved' || selectedReq.status === 'rejected') {
                    return (
                      <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Kết quả xét duyệt</span>
                        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#475569' }}>
                            Đã được {selectedReq.status === 'approved' ? 'duyệt' : 'từ chối'} bởi <strong>{selectedReq.reviewed_by}</strong> lúc {fmtDateTime(selectedReq.reviewed_at)}
                          </p>
                          <p style={{ margin: 0, fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>
                            {selectedReq.reviewer_note || 'Không có ghi chú thêm.'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* Footer Action */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>Khởi tạo: {fmtDateTime(selectedReq.created_at)}</span>
                  {(isAdmin || (selectedReq.requester_username === currentUsername && selectedReq.status === 'pending')) && (
                    <button 
                      onClick={() => handleDelete(selectedReq.id)} 
                      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <Trash2 size={13} /> {isAdmin ? 'Xóa đơn' : 'Rút đơn'}
                    </button>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              <FileText size={36} style={{ marginBottom: '10px' }} />
              <strong style={{ display: 'block', fontSize: '14px' }}>Vui lòng chọn đơn xin phép từ danh sách</strong>
            </div>
          )}
        </div>
      )}

      </div>
      )}

      {/* ── MODALS ── */}
      {showSubmit && (
        <SubmitModal
          profile={currentProfile || {
            id: '',
            full_name: currentUsername || 'Nhân viên',
            role: 'sales',
            department: '',
            manager_id: null,
            created_at: new Date().toISOString()
          }}
          username={currentUsername}
          onClose={() => setShowSubmit(false)}
          onSuccess={onReload}
        />
      )}
    </div>
  );
};
