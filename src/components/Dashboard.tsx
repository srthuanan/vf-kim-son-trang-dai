import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Clock3,
  Boxes,
  CheckCircle2,
  SlidersHorizontal,
  Archive,
  FileText,
  History,
  TrendingUp,
  AlertTriangle,
  User,
  Car,
  Layers,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Filter,
  Calendar,
  Zap,
  ShieldAlert,
  Award,
  Plus,
  RefreshCw,
  ExternalLink,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Table as TableIcon,
  CheckCircle,
  AlertCircle,
  Activity,
  ArrowUpRight,
  XCircle,
  Package,
  Users,
  Eye
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Order, CarActivityRow, ProfileRow, InventoryItem, YeucauxhdRow, OrderStatus } from '../types';
import { TabKey } from '../constants';
import { PendingOrdersMonthModal } from './modals/PendingOrdersMonthModal';
import { QueueRankingModal } from './modals/QueueRankingModal';
import { MultiavatarView } from '../utils/avatarUtils';

interface DashboardProps {
  orders: Order[];
  availableStock: number;
  auditLogs: CarActivityRow[];
  currentProfile: ProfileRow | null;
  staffProfiles: ProfileRow[];
  inventory?: InventoryItem[];
  invoiceRequests?: YeucauxhdRow[];
  pendingInvoicesCount?: number;
  onNavigateTab?: (tab: TabKey, orderStatusFilter?: OrderStatus | 'Tất cả' | 'Chờ xử lý') => void;
  onOpenCreateOrder?: () => void;
}

function formatActivityAction(log: CarActivityRow) {
  const actor = log.actor_name || 'Hệ thống';
  const orderPart = log.so_don_hang ? `đơn ${log.so_don_hang}` : '';
  const vinPart = log.vin ? `VIN ${log.vin}` : '';

  switch (log.action) {
    case 'hold':
      return <span><strong>{actor}</strong> đã giữ chỗ xe {vinPart}</span>;
    case 'release':
      return <span><strong>{actor}</strong> đã bỏ giữ chỗ xe {vinPart}</span>;
    case 'pair':
      return <span><strong>{actor}</strong> đã ghép <span style={{ color: '#0f766e', fontWeight: 700 }}>{vinPart}</span> vào {orderPart}</span>;
    case 'unpair':
      return <span><strong>{actor}</strong> đã hủy ghép {vinPart} khỏi {orderPart}</span>;
    case 'expire_hold':
      return <span style={{ color: '#dc2626' }}><strong>Hệ thống</strong> tự động giải phóng xe {vinPart}</span>;
    case 'request_invoice':
      return <span><strong>{actor}</strong> đã tạo yêu cầu hóa đơn cho {orderPart}</span>;
    case 'finalize_invoice':
      return <span style={{ color: '#16a34a' }}><strong>{actor}</strong> đã chốt xuất hóa đơn cho {orderPart}</span>;
    case 'cancel_order':
      return <span style={{ color: '#dc2626' }}><strong>{actor}</strong> đã hủy đơn {orderPart}</span>;
    case 'queue_join':
      return <span><strong>{actor}</strong> đã đăng ký hàng chờ cho {vinPart}</span>;
    case 'queue_leave':
      return <span><strong>{actor}</strong> đã hủy hàng chờ cho {vinPart}</span>;
    case 'queue_prioritized':
      return <span style={{ color: '#d97706' }}><strong>Hệ thống</strong> cấp ưu tiên 15 phút cho {vinPart}</span>;
    case 'create_order':
      return <span><strong style={{ color: '#059669' }}>{actor}</strong> đã tạo mới {orderPart}</span>;
    case 'update_order':
      return <span><strong style={{ color: '#2563eb' }}>{actor}</strong> đã cập nhật thông tin {orderPart}</span>;
    case 'update_config':
      return <span><strong style={{ color: '#9333ea' }}>{actor}</strong> đã cập nhật cấu hình/bảng giá</span>;
    case 'system_action':
      return <span><strong style={{ color: '#475569' }}>{actor}</strong>: {log.detail}</span>;
    default:
      return <span><strong>{actor}</strong>: {log.detail || 'Thực hiện thao tác hệ thống'}</span>;
  }
}

function parseDateForDashboard(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isoCandidate = new Date(trimmed);
  if (!Number.isNaN(isoCandidate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return isoCandidate;
  }
  const match1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (match1) return new Date(Number(match1[3]), Number(match1[2]) - 1, Number(match1[1]));
  const match2 = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(trimmed);
  if (match2) return new Date(Number(match2[1]), Number(match2[2]) - 1, Number(match2[3]));
  return null;
}

const VINFAST_MODEL_COLORS: Record<string, string> = {
  'VF 3': '#0284c7',
  'VF 5': '#0f766e',
  'VF 6': '#f59e0b',
  'VF 7': '#ea580c',
  'VF 8': '#8b5cf6',
  'VF 9': '#4338ca',
  'Limo': '#e11d48',
  'ECar': '#10b981',
  'Khác': '#64748b'
};

const PALETTE = ['#0284c7', '#0f766e', '#f59e0b', '#ea580c', '#8b5cf6', '#4338ca', '#e11d48', '#10b981', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({
  orders,
  availableStock,
  auditLogs,
  currentProfile,
  staffProfiles,
  inventory = [],
  invoiceRequests = [],
  pendingInvoicesCount = 0,
  onNavigateTab,
  onOpenCreateOrder
}) => {
  // ── States & Filters ───────────────────────────────────────────────────────
  const [selectedMonthOrders, setSelectedMonthOrders] = useState<{ month: string; orders: Order[] } | null>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  
  // Bộ lọc chu kỳ thời gian
  const [timeRange, setTimeRange] = useState<'this_month' | 'last_month' | 'q3_2026' | 'all'>('this_month');
  
  // Bộ lọc phòng ban (nếu là TPKD thì mặc định theo phòng kinh doanh của mình)
  const userRole = currentProfile?.role || 'sales';
  const isManager = userRole === 'manager';
  const userDept = (currentProfile?.department || '').trim();
  const isUserInSalesDept = userDept.toLowerCase().includes('pkd') || userDept.toLowerCase().includes('kinh doanh');
  const defaultDept = isManager && isUserInSalesDept ? userDept : 'all';
  const [deptFilter, setDeptFilter] = useState<string>(defaultDept);

  // Chế độ xem biểu đồ hay bảng ở Tỷ trọng dòng xe
  const [modelViewMode, setModelViewMode] = useState<'chart' | 'table'>('chart');

  // Bộ lọc thao tác ở nhật ký
  const [activityFilter, setActivityFilter] = useState<'all' | 'pair' | 'invoice' | 'order'>('all');

  // ── Danh sách chỉ đúng 2 Phòng Kinh Doanh (loại bỏ hoàn toàn Ban Giám Đốc, Sale Admin) ──
  const availableDepts = useMemo(() => ['PKD 1', 'PKD 2'], []);

  // Chuỗi tháng hiện tại & tháng trước
  const now = useMemo(() => new Date(), []);
  const currentMonthKey = useMemo(() => {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [now]);
  
  const lastMonthKey = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [now]);

  // ── Lọc danh sách đơn theo Thời gian & Phòng ban ──────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 1. Lọc theo phòng ban
      if (deptFilter !== 'all') {
        const staffObj = staffProfiles.find(s => 
          (s.full_name && o.staff && s.full_name.trim().toLowerCase() === o.staff.trim().toLowerCase()) ||
          (s.email && o.staff && o.staff.toLowerCase().includes(s.email.toLowerCase()))
        );
        const orderDept = (staffObj?.department || '').trim();
        const normDept = orderDept.toLowerCase();
        let isMatch = orderDept === deptFilter;
        if (!isMatch) {
          if (deptFilter === 'PKD 1' && (normDept === 'pkd 1' || normDept === 'pkd1' || normDept.includes('kinh doanh 1') || normDept.includes('kd 1'))) {
            isMatch = true;
          } else if (deptFilter === 'PKD 2' && (normDept === 'pkd 2' || normDept === 'pkd2' || normDept.includes('kinh doanh 2') || normDept.includes('kd 2'))) {
            isMatch = true;
          }
        }
        if (!isMatch) return false;
      }

      // 2. Lọc theo thời gian
      if (timeRange === 'all') return true;

      const dateStr = (o.depositDate && o.depositDate !== 'Chưa có') ? o.depositDate : o.createdAt;
      const d = parseDateForDashboard(dateStr);
      if (!d) return false;

      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (timeRange === 'this_month') return mKey === currentMonthKey;
      if (timeRange === 'last_month') return mKey === lastMonthKey;
      if (timeRange === 'q3_2026') {
        return d.getFullYear() === 2026 && (d.getMonth() + 1 >= 7 && d.getMonth() + 1 <= 9);
      }

      return true;
    });
  }, [orders, deptFilter, timeRange, staffProfiles, currentMonthKey, lastMonthKey]);

  // ── Thống kê chỉ số chính (KPI Stats) ────────────────────────────────────
  const totalOrders = filteredOrders.length;
  const pendingOrders = filteredOrders.filter(o => o.status === 'Chưa ghép').length;
  const pairedOrders = filteredOrders.filter(o => o.status === 'Đã ghép').length;
  const invoicedOrders = filteredOrders.filter(o => o.status === 'Đã xuất hóa đơn').length;
  const canceledOrders = filteredOrders.filter(o => o.status === 'Đã hủy' || o.status === 'Đã hoàn cọc').length;
  const activeOrders = filteredOrders.filter(o => !['Đã xuất hóa đơn', 'Đã hủy', 'Đã hoàn cọc'].includes(o.status)).length;

  // Tỷ lệ ghép và tiến độ pipeline
  const pairingRate = (pendingOrders + pairedOrders) > 0 
    ? Math.round((pairedOrders / (pendingOrders + pairedOrders)) * 100) 
    : 0;
  const pipelineFill = totalOrders > 0 
    ? Math.round(((pairedOrders + invoicedOrders) / totalOrders) * 100) 
    : 0;

  // ── Phân tích Đơn tồn theo tháng (Pending Insights) ──────────────────────
  const pendingInsights = useMemo(() => {
    let oldPendingCount = 0;
    let normalPendingCount = 0;
    let criticalPendingCount = 0;

    const pendingList = filteredOrders.filter(o => o.status === 'Chưa ghép');
    const pendingByMonthMap: Record<string, { total: number; models: Record<string, number>; orders: Order[] }> = {};

    pendingList.forEach(o => {
      const dateStr = (o.depositDate && o.depositDate !== 'Chưa có') ? o.depositDate : o.createdAt;
      const d = parseDateForDashboard(dateStr);

      let monthKey = 'Chưa xác định';
      if (d) {
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const y = d.getFullYear();
        monthKey = `Tháng ${m}/${y}`;

        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 14) {
          criticalPendingCount++;
          oldPendingCount++;
        } else if (diffDays >= 7) {
          oldPendingCount++;
        } else {
          normalPendingCount++;
        }
      }

      if (!pendingByMonthMap[monthKey]) {
        pendingByMonthMap[monthKey] = { total: 0, models: {}, orders: [] };
      }
      pendingByMonthMap[monthKey].total++;
      pendingByMonthMap[monthKey].orders.push(o);

      const model = o.line || 'Khác';
      pendingByMonthMap[monthKey].models[model] = (pendingByMonthMap[monthKey].models[model] || 0) + 1;
    });

    const pendingByMonth = Object.entries(pendingByMonthMap).map(([month, data]) => ({
      month,
      total: data.total,
      models: data.models,
      orders: data.orders
    })).sort((a, b) => {
      if (a.month === 'Chưa xác định') return 1;
      if (b.month === 'Chưa xác định') return -1;
      return b.month.localeCompare(a.month);
    });

    return { oldPendingCount, normalPendingCount, criticalPendingCount, pendingByMonth };
  }, [filteredOrders, now]);

  // ── Cơ cấu Dòng xe & So sánh Kho (Model Distribution) ────────────────────
  const modelDistribution = useMemo(() => {
    const counts: Record<string, { total: number; paired: number; invoiced: number }> = {};

    filteredOrders.forEach(o => {
      const model = o.line || 'Khác';
      if (!counts[model]) counts[model] = { total: 0, paired: 0, invoiced: 0 };
      counts[model].total++;
      if (o.status === 'Đã ghép') counts[model].paired++;
      if (o.status === 'Đã xuất hóa đơn') counts[model].invoiced++;
    });

    // Tính số xe khả dụng trong kho cho từng dòng xe
    const stockByModel: Record<string, number> = {};
    inventory.forEach(inv => {
      if (inv.status === 'Chưa ghép') {
        const m = inv.line || 'Khác';
        stockByModel[m] = (stockByModel[m] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => {
        const availableInStock = stockByModel[name] || 0;
        return {
          name,
          value: data.total,
          paired: data.paired,
          invoiced: data.invoiced,
          stock: availableInStock,
          color: VINFAST_MODEL_COLORS[name] || PALETTE[0]
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredOrders, inventory]);

  // ── Bảng Vàng TVBH Xuất Sắc (Sales Leaderboard) ───────────────────────────
  const salesLeaderboard = useMemo(() => {
    const map: Record<string, { name: string; total: number; invoiced: number; paired: number; profile?: ProfileRow }> = {};

    filteredOrders.forEach(o => {
      const saleName = (o.staff || 'Hệ thống').trim();
      if (!map[saleName]) {
        const p = staffProfiles.find(s => 
          (s.full_name && s.full_name.trim().toLowerCase() === saleName.toLowerCase()) ||
          (s.email && saleName.toLowerCase().includes(s.email.toLowerCase()))
        );
        map[saleName] = { name: saleName, total: 0, invoiced: 0, paired: 0, profile: p };
      }
      map[saleName].total++;
      if (o.status === 'Đã xuất hóa đơn') map[saleName].invoiced++;
      if (o.status === 'Đã ghép') map[saleName].paired++;
    });

    return Object.values(map)
      .filter(item => {
        const dept = (item.profile?.department || '').toLowerCase();
        const role = item.profile?.role;
        const name = (item.name || '').toLowerCase();
        if (role === 'admin') return false;
        if (dept.includes('giám đốc') || dept.includes('giam doc') || dept.includes('admin') || dept.includes('it')) return false;
        if (name.includes('hệ thống') || name.includes('admin') || name.includes('giám đốc')) return false;
        return true;
      })
      .sort((a, b) => {
        if (b.invoiced !== a.invoiced) return b.invoiced - a.invoiced;
        if (b.paired !== a.paired) return b.paired - a.paired;
        return b.total - a.total;
      })
      .slice(0, 5);
  }, [filteredOrders, staffProfiles]);

  // ── Trung Tâm Cảnh Báo Điều Hành Thông Minh (Actionable Insights) ────────
  const actionAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      level: 'critical' | 'warning' | 'info';
      title: string;
      message: string;
      actionText: string;
      onAction: () => void;
      icon: any;
    }> = [];

    // 1. Cảnh báo hóa đơn chờ duyệt
    const totalPendingInvoices = pendingInvoicesCount || invoiceRequests.filter(r => r.trang_thai_xu_ly === 'Chờ duyệt' || !r.ngay_xuat_hoa_don).length;
    if (totalPendingInvoices > 0) {
      list.push({
        id: 'invoices',
        level: 'critical',
        title: 'Yêu Cầu Xuất Hóa Đơn',
        message: `Có ${totalPendingInvoices} đơn hàng đang chờ duyệt xuất hóa đơn. Cần xử lý sớm để kịp tiến độ giao xe.`,
        actionText: 'Duyệt hóa đơn ngay',
        onAction: () => onNavigateTab && onNavigateTab('invoices'),
        icon: FileText
      });
    }

    // 2. Cảnh báo đơn tồn chờ ghép lâu (> 7 ngày)
    if (pendingInsights.oldPendingCount > 0) {
      list.push({
        id: 'old_pending',
        level: pendingInsights.criticalPendingCount > 0 ? 'critical' : 'warning',
        title: 'Đơn Tồn Chờ Lâu',
        message: `Có ${pendingInsights.oldPendingCount} đơn cọc đã chờ từ 7 ngày trở lên chưa có số VIN ghép (${pendingInsights.criticalPendingCount} đơn > 14 ngày).`,
        actionText: 'Xem hàng chờ ưu tiên',
        onAction: () => setShowQueueModal(true),
        icon: Clock3
      });
    }

    // 3. Cảnh báo đơn chưa ghép VIN
    if (pendingOrders > 0) {
      list.push({
        id: 'need_pair',
        level: 'warning',
        title: 'Tiến Độ Ghép Xe',
        message: `Đang có ${pendingOrders} đơn hàng đang đợi ghép số VIN phù hợp từ kho xe.`,
        actionText: 'Xem đơn chờ ghép',
        onAction: () => onNavigateTab && onNavigateTab('orders', 'Chưa ghép'),
        icon: Boxes
      });
    }

    // 4. Cảnh báo tồn kho xe trống
    if (availableStock === 0) {
      list.push({
        id: 'out_of_stock',
        level: 'critical',
        title: 'Kho Xe Khả Dụng',
        message: 'Kho xe hiện tại không còn xe trống (0 xe khả dụng). Cần nhập thêm xe từ nhà máy hoặc điều chuyển showroom.',
        actionText: 'Kiểm tra kho xe',
        onAction: () => onNavigateTab && onNavigateTab('inventory'),
        icon: Archive
      });
    } else if (availableStock < 5) {
      list.push({
        id: 'low_stock',
        level: 'warning',
        title: 'Kho Xe Sắp Hết',
        message: `Kho xe trống hiện chỉ còn ${availableStock} chiếc khả dụng. Cần theo dõi kế hoạch điều chuyển.`,
        actionText: 'Xem kho xe',
        onAction: () => onNavigateTab && onNavigateTab('inventory'),
        icon: Archive
      });
    }

    // 5. Cảnh báo bất đối xứng Cọc vs Kho cho dòng xe hot nhất
    const topModel = modelDistribution[0];
    if (topModel && topModel.value > 10 && topModel.stock === 0) {
      list.push({
        id: 'model_deficit',
        level: 'info',
        title: `Nhu Cầu Dòng Xe ${topModel.name}`,
        message: `${topModel.name} đang là dòng xe đặt cọc nhiều nhất (${topModel.value} đơn) nhưng kho hiện còn 0 xe trống.`,
        actionText: 'Xem chi tiết',
        onAction: () => onNavigateTab && onNavigateTab('orders'),
        icon: Zap
      });
    }

    return list;
  }, [pendingInvoicesCount, invoiceRequests, pendingInsights, pendingOrders, availableStock, modelDistribution, onNavigateTab]);

  // ── Nhật ký thao tác được lọc ───────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (activityFilter === 'all') return true;
      if (activityFilter === 'pair') return log.action.includes('pair') || log.action.includes('hold');
      if (activityFilter === 'invoice') return log.action.includes('invoice');
      if (activityFilter === 'order') return log.action.includes('order');
      return true;
    }).slice(0, 50);
  }, [auditLogs, activityFilter]);

  return (
    <div
      className="dashboard-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        paddingBottom: '40px',
        width: '100%'
      }}
    >
      
      {/* ── 1. THANH ĐIỀU HÀNH & BỘ LỌC TOÀN CỤC (EXECUTIVE COMMAND HEADER) ── */}
      <header style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '18px 24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px'
      }}>
        {/* Tiêu đề & Trạng thái thời gian thực */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Trung Tâm Điều Hành Doanh Số & Vận Hành
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '2px 9px',
              borderRadius: '999px',
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0',
              fontSize: '11.5px',
              fontWeight: 700
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', animation: 'pulse 1.5s infinite' }} />
              Thời gian thực
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            VinFast Kim Sơn Trảng Dài • Cập nhật ngày {now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

        {/* Bộ lọc chu kỳ & Phím tắt tác vụ nhanh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Bộ lọc chu kỳ thời gian */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
            <button
              onClick={() => setTimeRange('this_month')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: timeRange === 'this_month' ? '#ffffff' : 'transparent',
                color: timeRange === 'this_month' ? '#0f766e' : '#64748b',
                fontWeight: timeRange === 'this_month' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: timeRange === 'this_month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Tháng {now.getMonth() + 1}/{now.getFullYear()}
            </button>
            <button
              onClick={() => setTimeRange('last_month')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: timeRange === 'last_month' ? '#ffffff' : 'transparent',
                color: timeRange === 'last_month' ? '#0f766e' : '#64748b',
                fontWeight: timeRange === 'last_month' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: timeRange === 'last_month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Tháng trước
            </button>
            <button
              onClick={() => setTimeRange('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: 'none',
                background: timeRange === 'all' ? '#ffffff' : 'transparent',
                color: timeRange === 'all' ? '#0f766e' : '#64748b',
                fontWeight: timeRange === 'all' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: timeRange === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s'
              }}
            >
              Toàn bộ
            </button>
          </div>

          {/* Lọc theo Phòng Ban (cho Admin / Giám đốc) */}
          {!isManager && availableDepts.length > 0 && (
            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              style={{
                padding: '7px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '12.5px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">🏢 Toàn Showroom ({orders.length} đơn)</option>
              {availableDepts.map(d => (
                <option key={d} value={d}>🚗 {d}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* ── 2. HỆ THỐNG 5 THẺ CHỈ SỐ KPI THÔNG MINH (FINTECH / EXECUTIVE KPI DECK) ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Tổng đơn đang xử lý */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('orders')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(15, 118, 110, 0.1)';
            e.currentTarget.style.borderColor = '#0f766e';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Đơn đang hoạt động</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gauge size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1.1, marginBottom: '6px' }}>
            {activeOrders}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
            <span>Chờ: <strong>{pendingOrders}</strong> • Đã ghép: <strong>{pairedOrders}</strong></span>
            <ArrowUpRight size={15} style={{ color: '#0f766e' }} />
          </div>
        </div>

        {/* Card 2: Tiến độ ghép xe */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('orders', 'Đã ghép')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.1)';
            e.currentTarget.style.borderColor = '#0284c7';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Tỷ lệ đã ghép VIN</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f0f9ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#0284c7', lineHeight: 1.1, marginBottom: '6px' }}>
            {pairingRate}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
            <span>Đã có VIN: <strong>{pairedOrders}</strong> / {pendingOrders + pairedOrders} đơn</span>
            <ArrowUpRight size={15} style={{ color: '#0284c7' }} />
          </div>
        </div>

        {/* Card 3: Đã xuất hóa đơn */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('orders', 'Đã xuất hóa đơn')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.1)';
            e.currentTarget.style.borderColor = '#10b981';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Đã xuất hóa đơn</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: '#10b981', lineHeight: 1.1, marginBottom: '6px' }}>
            {invoicedOrders} <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>xe</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
            <span>Hoàn tất: <strong>{totalOrders > 0 ? Math.round((invoicedOrders / totalOrders) * 100) : 0}%</strong> pipeline</span>
            <ArrowUpRight size={15} style={{ color: '#10b981' }} />
          </div>
        </div>

        {/* Card 4: Xe trống trong kho */}
        <div
          onClick={() => onNavigateTab && onNavigateTab('inventory')}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.1)';
            e.currentTarget.style.borderColor = '#f59e0b';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Xe trống khả dụng</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fffbeb', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: availableStock === 0 ? '#ef4444' : '#d97706', lineHeight: 1.1, marginBottom: '6px' }}>
            {availableStock} <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>chiếc</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
            <span>{availableStock === 0 ? '⚠️ Kho đang hết xe trống' : 'Sẵn sàng ghép ngay'}</span>
            <ArrowUpRight size={15} style={{ color: '#d97706' }} />
          </div>
        </div>

        {/* Card 5: Đơn tồn chờ lâu */}
        <div
          onClick={() => setShowQueueModal(true)}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(225, 29, 72, 0.1)';
            e.currentTarget.style.borderColor = '#e11d48';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Chờ ghép &gt; 7 ngày</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock3 size={20} />
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 900, color: pendingInsights.oldPendingCount > 0 ? '#e11d48' : '#16a34a', lineHeight: 1.1, marginBottom: '6px' }}>
            {pendingInsights.oldPendingCount} <span style={{ fontSize: '15px', fontWeight: 600, color: '#64748b' }}>đơn</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
            <span>{pendingInsights.criticalPendingCount > 0 ? `🚨 ${pendingInsights.criticalPendingCount} đơn > 14 ngày` : 'Kiểm tra hàng chờ'}</span>
            <ArrowUpRight size={15} style={{ color: '#e11d48' }} />
          </div>
        </div>
      </section>

      {/* ── 3. KHỐI GIỮA: PIPELINE LUỒNG ĐƠN & TRUNG TÂM CẢNH BÁO ĐIỀU HÀNH ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        
        {/* CỘT TRÁI: LUỒNG TIẾN TRÌNH ĐƠN (INTERACTIVE FUNNEL PIPELINE) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Tiến Trình Chuyển Đổi
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Luồng Xử Lý Đơn Hàng (Pipeline)
              </h3>
            </div>
            <span style={{ fontSize: '12px', color: '#0f766e', background: '#ecfdf5', padding: '3px 9px', borderRadius: '999px', fontWeight: 700 }}>
              {pipelineFill}% đã đi qua khâu ghép/HĐ
            </span>
          </div>

          {/* 4 Chặng Pipeline Tương Tác */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {/* Chặng 1: Chờ ghép xe */}
            <div
              onClick={() => onNavigateTab && onNavigateTab('orders', 'Chưa ghép')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #fed7aa',
                background: '#fffaf5',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#fed7aa'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
                  Chờ ghép xe
                </span>
                <ExternalLink size={13} style={{ color: '#c2410c' }} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#9a3412', lineHeight: 1.1 }}>
                {pendingOrders} <span style={{ fontSize: '12px', fontWeight: 500, color: '#7c2d12' }}>đơn</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#ffedd5', borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${totalOrders > 0 ? (pendingOrders / totalOrders) * 100 : 0}%`, height: '100%', background: '#f97316' }} />
              </div>
            </div>

            {/* Chặng 2: Đã ghép VIN */}
            <div
              onClick={() => onNavigateTab && onNavigateTab('orders', 'Đã ghép')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                background: '#f0fdf4',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#16a34a'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#bbf7d0'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                  Đã ghép VIN
                </span>
                <ExternalLink size={13} style={{ color: '#166534' }} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#14532d', lineHeight: 1.1 }}>
                {pairedOrders} <span style={{ fontSize: '12px', fontWeight: 500, color: '#166534' }}>đơn</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#dcfce7', borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${totalOrders > 0 ? (pairedOrders / totalOrders) * 100 : 0}%`, height: '100%', background: '#22c55e' }} />
              </div>
            </div>

            {/* Chặng 3: Đã xuất hóa đơn */}
            <div
              onClick={() => onNavigateTab && onNavigateTab('orders', 'Đã xuất hóa đơn')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #bae6fd',
                background: '#f0f9ff',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#0284c7'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#bae6fd'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }} />
                  Đã xuất HĐ
                </span>
                <ExternalLink size={13} style={{ color: '#0369a1' }} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#075985', lineHeight: 1.1 }}>
                {invoicedOrders} <span style={{ fontSize: '12px', fontWeight: 500, color: '#0369a1' }}>đơn</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#e0f2fe', borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${totalOrders > 0 ? (invoicedOrders / totalOrders) * 100 : 0}%`, height: '100%', background: '#0284c7' }} />
              </div>
            </div>

            {/* Chặng 4: Đã hủy bỏ */}
            <div
              onClick={() => onNavigateTab && onNavigateTab('orders', 'Đã hủy')}
              style={{
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                background: '#fef2f2',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#fecaca'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                  Đã hủy bỏ
                </span>
                <ExternalLink size={13} style={{ color: '#b91c1c' }} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#991b1b', lineHeight: 1.1 }}>
                {canceledOrders} <span style={{ fontSize: '12px', fontWeight: 500, color: '#b91c1c' }}>đơn</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#fee2e2', borderRadius: '999px', marginTop: '8px', overflow: 'hidden' }}>
                <div style={{ width: `${totalOrders > 0 ? (canceledOrders / totalOrders) * 100 : 0}%`, height: '100%', background: '#ef4444' }} />
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            color: '#475569',
            marginTop: 'auto'
          }}>
            <TrendingUp size={16} style={{ color: '#0f766e', flexShrink: 0 }} />
            <span>Mẹo: Bạn có thể nhấp trực tiếp vào từng ô chặng ở trên để mở danh sách đơn tương ứng.</span>
          </div>
        </div>

        {/* CỘT PHẢI: TRUNG TÂM CẢNH BÁO ĐIỀU HÀNH & NÚT HÀNH ĐỘNG TRỰC TIẾP */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '22px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Trung Tâm Xử Lý
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                Cảnh Báo & Điểm Cần Chú Ý ({actionAlerts.length})
              </h3>
            </div>
            <AlertTriangle size={18} style={{ color: '#d97706' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
            {actionAlerts.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#16a34a', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                <CheckCircle size={28} style={{ marginBottom: '6px' }} />
                <strong style={{ display: 'block', fontSize: '14px' }}>Tuyệt vời!</strong>
                <span style={{ fontSize: '12.5px', color: '#15803d' }}>Mọi hoạt động vận hành và luồng đơn đều đang diễn ra thuận lợi.</span>
              </div>
            ) : (
              actionAlerts.map(alert => {
                const IconComponent = alert.icon;
                const isCritical = alert.level === 'critical';
                const isWarning = alert.level === 'warning';

                return (
                  <div
                    key={alert.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: `1px solid ${isCritical ? '#fecaca' : isWarning ? '#fed7aa' : '#e2e8f0'}`,
                      background: isCritical ? '#fff5f5' : isWarning ? '#fffaf5' : '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          background: isCritical ? '#fee2e2' : isWarning ? '#ffedd5' : '#e0f2fe',
                          color: isCritical ? '#dc2626' : isWarning ? '#ea580c' : '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <IconComponent size={14} />
                        </div>
                        <strong style={{ fontSize: '13px', color: isCritical ? '#991b1b' : isWarning ? '#9a3412' : '#0f172a' }}>
                          {alert.title}
                        </strong>
                      </div>
                      
                      <button
                        onClick={alert.onAction}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          background: isCritical ? '#dc2626' : isWarning ? '#ea580c' : '#0f766e',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexShrink: 0
                        }}
                      >
                        {alert.actionText} <ChevronRight size={12} />
                      </button>
                    </div>

                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                      {alert.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── 4. KHỐI PHÂN TÍCH CHUYÊN SÂU 3 CỘT (ANALYTICS & LEADERBOARD) ── */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        
        {/* CỘT 1: CƠ CẤU & TỶ TRỌNG DÒNG XE */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Cơ Cấu Thị Trường
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                Tỷ Trọng Dòng Xe Đặt Cọc
              </h3>
            </div>
            
            {/* Toggle Biểu đồ / Bảng */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '2px', borderRadius: '8px' }}>
              <button
                onClick={() => setModelViewMode('chart')}
                title="Xem Biểu đồ Donut"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: modelViewMode === 'chart' ? '#ffffff' : 'transparent',
                  color: modelViewMode === 'chart' ? '#0f766e' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: modelViewMode === 'chart' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <PieChartIcon size={14} />
              </button>
              <button
                onClick={() => setModelViewMode('table')}
                title="Xem Bảng số liệu"
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: modelViewMode === 'table' ? '#ffffff' : 'transparent',
                  color: modelViewMode === 'table' ? '#0f766e' : '#64748b',
                  cursor: 'pointer',
                  boxShadow: modelViewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <TableIcon size={14} />
              </button>
            </div>
          </div>

          {modelDistribution.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Chưa có dữ liệu đặt cọc trong chu kỳ này
            </div>
          ) : modelViewMode === 'chart' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '190px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {modelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any) => [`${val} đơn (${((val / totalOrders) * 100).toFixed(1)}%)`, name]}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Tâm biểu đồ tròn */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{totalOrders}</div>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Tổng đơn</div>
                </div>
              </div>

              {/* Legend trực quan bên dưới */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: '10px' }}>
                {modelDistribution.slice(0, 5).map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                    <span style={{ color: '#334155', fontWeight: 600 }}>{item.name}:</span>
                    <span style={{ color: '#64748b', fontWeight: 700 }}>{item.value} ({((item.value / totalOrders) * 100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Bảng số liệu chi tiết */
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '230px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Dòng xe</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Đơn cọc</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Tỷ trọng</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 600 }}>Kho trống</th>
                  </tr>
                </thead>
                <tbody>
                  {modelDistribution.map(item => (
                    <tr key={item.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                          {item.name}
                        </div>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.value}</td>
                      <td style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>
                        {((item.value / totalOrders) * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: item.stock > 0 ? '#ecfdf5' : '#fef2f2',
                          color: item.stock > 0 ? '#16a34a' : '#dc2626'
                        }}>
                          {item.stock} xe
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CỘT 2: ĐƠN TỒN THEO THÁNG & TUỔI ĐƠN */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Theo Dõi Tuổi Cọc
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                Đơn Tồn Chờ Ghép VIN
              </h3>
            </div>

            <button
              onClick={() => setShowQueueModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              <Zap size={13} /> Xếp hạng ưu tiên
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '230px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingInsights.pendingByMonth.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#16a34a', fontSize: '13px' }}>
                🎉 Tuyệt vời, không có đơn hàng nào chưa ghép!
              </div>
            ) : (
              pendingInsights.pendingByMonth.map(item => (
                <div
                  key={item.month}
                  onClick={() => setSelectedMonthOrders({ month: item.month, orders: item.orders })}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#0f766e';
                    e.currentTarget.style.background = '#f0fdfa';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>{item.month}</strong>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      fontWeight: 800,
                      fontSize: '11px'
                    }}>
                      {item.total} đơn chờ
                    </span>
                  </div>

                  {/* Phân bổ dòng xe */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Object.entries(item.models).sort((a, b) => b[1] - a[1]).map(([m, c]) => (
                      <span
                        key={m}
                        style={{
                          fontSize: '11px',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          color: '#334155'
                        }}
                      >
                        {m}: <strong style={{ color: '#e11d48' }}>{c}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CỘT 3: BẢNG VÀNG TVBH XUẤT SẮC (TOP SALES LEADERBOARD) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                Thi Đua Kinh Doanh
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                Top Nhân Viên Xuất Sắc
              </h3>
            </div>

            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('staff')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid #fde68a',
                  background: '#fffbeb',
                  color: '#b45309',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Award size={13} /> Bảng thi đua KPI
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '230px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {salesLeaderboard.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                Chưa có dữ liệu thành tích trong chu kỳ này
              </div>
            ) : (
              salesLeaderboard.map((item, idx) => {
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      background: isTop1 ? '#fffbeb' : isTop2 ? '#f8fafc' : isTop3 ? '#fff7ed' : '#ffffff',
                      border: `1px solid ${isTop1 ? '#fde68a' : isTop2 ? '#e2e8f0' : isTop3 ? '#fed7aa' : '#f1f5f9'}`
                    }}
                  >
                    {/* Thứ hạng */}
                    <div style={{ width: '22px', textAlign: 'center', fontSize: '14px', fontWeight: 900 }}>
                      {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                    </div>

                    {/* Multiavatar */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      padding: isTop1 || isTop2 || isTop3 ? '1.5px' : '0',
                      background: isTop1 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isTop2 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : isTop3 ? 'linear-gradient(135deg, #ea580c, #c2410c)' : 'transparent',
                      flexShrink: 0
                    }}>
                      <MultiavatarView
                        seed={item.profile?.id || item.profile?.email || item.name}
                        size="100%"
                        style={{ background: '#ffffff' }}
                      />
                    </div>

                    {/* Thông tin nhân viên & Tiến độ */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '13px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </strong>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f766e' }}>
                          {item.total} đơn ({item.invoiced} HĐ)
                        </span>
                      </div>
                      
                      <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '999px', marginTop: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${salesLeaderboard[0]?.total > 0 ? (item.total / salesLeaderboard[0].total) * 100 : 0}%`,
                          height: '100%',
                          background: isTop1 ? '#f59e0b' : '#0ea5e9'
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── 5. NHẬT KÝ HOẠT ĐỘNG THỜI GIAN THỰC (LIVE ACTIVITY STREAM) ── */}
      <section style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '22px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px'
        }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
              Dòng Thời Gian Giao Dịch
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Nhật Ký Hoạt Động Vận Hành Trực Tiếp
            </h3>
          </div>

          {/* Tabs lọc loại hành động */}
          <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '3px', borderRadius: '8px' }}>
            {(['all', 'pair', 'invoice', 'order'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivityFilter(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: activityFilter === tab ? '#ffffff' : 'transparent',
                  color: activityFilter === tab ? '#0f766e' : '#64748b',
                  fontSize: '12px',
                  fontWeight: activityFilter === tab ? 700 : 500,
                  cursor: 'pointer',
                  boxShadow: activityFilter === tab ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                {tab === 'all' ? 'Tất cả' : tab === 'pair' ? 'Ghép xe' : tab === 'invoice' ? 'Hóa đơn' : 'Đơn hàng'}
              </button>
            ))}
          </div>
        </div>

        {/* Danh sách nhật ký */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              Chưa có lịch sử giao dịch phù hợp
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              let dateStr = 'N/A';
              try {
                dateStr = new Intl.DateTimeFormat('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  day: '2-digit',
                  month: '2-digit'
                }).format(new Date(log.created_at));
              } catch {}

              return (
                <div
                  key={log.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: index % 2 === 0 ? '#f8fafc' : '#ffffff',
                    border: '1px solid #f1f5f9',
                    fontSize: '13px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: '11px',
                      color: '#94a3b8',
                      fontFamily: 'monospace',
                      background: '#e2e8f0',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      flexShrink: 0
                    }}>
                      #{filteredLogs.length - index}
                    </span>
                    <div style={{ color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatActivityAction(log)}
                    </div>
                  </div>

                  <span style={{ fontSize: '11.5px', color: '#94a3b8', marginLeft: '12px', flexShrink: 0 }}>
                    {dateStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── MODALS (Giữ trọn vẹn các tính năng nguyên bản) ── */}
      {selectedMonthOrders && (
        <PendingOrdersMonthModal
          month={selectedMonthOrders.month}
          orders={selectedMonthOrders.orders}
          onClose={() => setSelectedMonthOrders(null)}
        />
      )}

      {showQueueModal && (
        <QueueRankingModal
          orders={orders}
          onClose={() => setShowQueueModal(false)}
        />
      )}
    </div>
  );
};
