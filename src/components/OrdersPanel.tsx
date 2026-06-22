import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Eye, PackageCheck, X, FileCheck, Ban, Pencil, ScrollText, User, Car, CreditCard, ArrowLeft, Info, Copy, TriangleAlert, Download } from 'lucide-react';
import { Order, OrderStatus, InventoryItem, ProfileRow } from '../types';
import { statusTone, staffNames } from '../constants';
import { matchesVehicleConfig, canUseVehicleForPair } from '../utils/matching';
import { copyToClipboard } from '../utils/clipboard';
import { getPolicyNames, parseSmartPolicy } from '../utils/policyParser';
import { QueueRankingModal } from './modals/QueueRankingModal';
import { InlineOrderEditForm } from './InlineOrderEditForm';
import { VehicleConfigRow, UpdateOrderInput } from '../types';
import * as XLSX from 'xlsx';

const viDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function parseDetailDate(value?: string) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoCandidate = new Date(trimmed);
  if (!Number.isNaN(isoCandidate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return isoCandidate;
  }

  const parseWithPattern = (
    pattern: RegExp,
    map: (matches: RegExpExecArray) => { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }
  ) => {
    const matches = pattern.exec(trimmed);
    if (!matches) return null;

    const parts = map(matches);
    const parsed = new Date(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour ?? 0,
      parts.minute ?? 0,
      parts.second ?? 0
    );

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isoTimeDate = parseWithPattern(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
    m => ({ year: +m[1], month: +m[2], day: +m[3], hour: +m[4], minute: +m[5], second: +m[6] })
  );
  if (isoTimeDate) return isoTimeDate;

  const vnFullPattern = parseWithPattern(
    /^(\d{2}):(\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4})$/,
    m => ({ year: +m[6], month: +m[5], day: +m[4], hour: +m[1], minute: +m[2], second: +m[3] })
  );
  if (vnFullPattern) return vnFullPattern;

  const vnShortPattern = parseWithPattern(
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    m => ({ year: +m[3], month: +m[2], day: +m[1] })
  );
  if (vnShortPattern) return vnShortPattern;

  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const parsed = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return null;
}

const formatDetailDate = (value?: string | null) => {
  const parsed = parseDetailDate(value || undefined);
  if (!parsed) return value || '—';
  return viDateTimeFormatter.format(parsed);
};

interface OrdersPanelProps {
  staffProfiles?: ProfileRow[];
  orders: Order[];
  allOrders?: Order[];
  inventory: InventoryItem[];
  currentUsername: string;
  canOverrideHeldVehicle: boolean;
  canPairOrder: boolean;
  canManageOrderActions: boolean;
  isUnpairingOrderId: string;
  isUpdatingPolicy: boolean;
  query: string;
  status: OrderStatus | 'Tất cả' | 'Chờ xử lý';
  onQueryChange: (value: string) => void;
  onStatusChange: (value: OrderStatus | 'Tất cả' | 'Chờ xử lý') => void;
  onViewOrder: (order: Order) => void;
  onPairOrderSubmit: (orderId: string, vin: string) => Promise<boolean>;
  onUnpairOrder: (orderId: string) => void;
  onInvoiceOrder: (order: Order) => void;
  onCancelOrderSubmit: (orderId: string, note: string, unmatchType: string, needDate?: string) => Promise<{ success: boolean; error?: string }>;
  onEditOrder?: (order: Order) => void; // Made optional since we use inline now
  onUpdateOrder: (input: UpdateOrderInput) => Promise<boolean>;
  onSelectPolicy: (order: Order) => void;
  showStaffColumn?: boolean;
  isAdmin?: boolean;
  vehicleConfigs: VehicleConfigRow[];
  isUpdatingOrder: boolean;
  onViewLog?: (orderId: string) => void;
}

export const OrdersPanel: React.FC<OrdersPanelProps> = ({
  staffProfiles = [],
  orders,
  allOrders,
  inventory,
  currentUsername,
  canOverrideHeldVehicle,
  canPairOrder,
  canManageOrderActions,
  isUnpairingOrderId,
  isUpdatingPolicy,
  query,
  status,
  onQueryChange,
  onStatusChange,
  onViewOrder,
  onPairOrderSubmit,
  onUnpairOrder,
  onInvoiceOrder,
  onCancelOrderSubmit,
  onEditOrder,
  onUpdateOrder,
  onSelectPolicy,
  showStaffColumn,
  isAdmin,
  vehicleConfigs,
  isUpdatingOrder
}) => {
  const [knownPolicies, setKnownPolicies] = useState<string[]>([]);
  
  useEffect(() => {
    getPolicyNames().then(setKnownPolicies).catch(console.error);
  }, []);

  const reviewStatuses: OrderStatus[] = ['Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn'];
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  const dynamicStaffNames = useMemo(() => {
    if (!staffProfiles || staffProfiles.length === 0) return staffNames;
    const names = staffProfiles
      .map(p => p.full_name || p.email)
      .filter((n): n is string => Boolean(n));
    return Array.from(new Set([...names, ...staffNames]));
  }, [staffProfiles]);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [isMobile, setIsMobile] = useState(false);
  const [showPolicyTooltip, setShowPolicyTooltip] = useState(false);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [isPairingInline, setIsPairingInline] = useState(false);
  const [isCancelingInline, setIsCancelingInline] = useState(false);
  const [isPairingSubmit, setIsPairingSubmit] = useState(false);
  const [isCancelingSubmit, setIsCancelingSubmit] = useState(false);
  
  // Pair inline form state
  const [pairVin, setPairVin] = useState('');
  const [pairError, setPairError] = useState('');
  
  // Cancel inline form state
  const [cancelNote, setCancelNote] = useState('');
  const [cancelType, setCancelType] = useState<'cancel' | 'wait'>('cancel');
  const [cancelNeedDate, setCancelNeedDate] = useState('');
  const [cancelError, setCancelError] = useState('');

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  const candidates = useMemo(() => {
    if (!selectedOrder) return [];
    return inventory.filter(
      (item) =>
        matchesVehicleConfig(selectedOrder, item) &&
        canUseVehicleForPair(item, currentUsername, canOverrideHeldVehicle)
    );
  }, [selectedOrder, inventory, currentUsername, canOverrideHeldVehicle]);

  // Reset states when order changes
  useEffect(() => {
    setIsEditingInline(false);
    setIsPairingInline(false);
    setIsCancelingInline(false);
    setPairVin(candidates[0]?.vin ?? '');
    setPairError('');
    if (selectedOrder) {
      setCancelNeedDate(selectedOrder.needDate || '');
    }
    setCancelNote('');
    setCancelType('cancel');
    setCancelError('');
  }, [selectedOrder, candidates]);

  const handlePairInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !pairVin) return;
    setIsPairingSubmit(true);
    setPairError('');
    const success = await onPairOrderSubmit(selectedOrder.id, pairVin);
    if (success) {
      setIsPairingInline(false);
    } else {
      setPairError('Lỗi ghép xe. Vui lòng thử lại.');
    }
    setIsPairingSubmit(false);
  };

  const handleCancelInlineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!cancelNote.trim()) {
      setCancelError('Bắt buộc nhập lý do hủy để lưu vết hệ thống.');
      return;
    }
    if (cancelType === 'wait' && !cancelNeedDate) {
      setCancelError('Vui lòng nhập thời gian cần xe khi chọn chế độ chờ xe.');
      return;
    }
    setIsCancelingSubmit(true);
    setCancelError('');
    const result = await onCancelOrderSubmit(
      selectedOrder.id,
      cancelNote.trim(),
      cancelType === 'wait' ? 'Hủy ghép & Đợi xe khác (Chờ xe)' : 'Hủy luôn đơn hàng (Hủy đơn)',
      cancelType === 'wait' ? cancelNeedDate : undefined
    );
    if (result.success) {
      setIsCancelingInline(false);
    } else {
      setCancelError(result.error || 'Giao dịch không thành công, vui lòng thử lại.');
    }
    setIsCancelingSubmit(false);
  };

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(media.matches);
    update();

    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!orders.length) {
      if (selectedOrderId) {
        setSelectedOrderId('');
      }
      setMobileView('list');
      return;
    }

    if (!selectedOrderId || !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const queryMatchedOrders = useMemo(() => {
    if (!allOrders) return orders;
    const normQuery = query.trim().toLowerCase();
    if (!normQuery) return allOrders;
    return allOrders.filter(order => (
      order.id.toLowerCase().includes(normQuery) ||
      order.customer.toLowerCase().includes(normQuery) ||
      (order.phone && order.phone.includes(normQuery)) ||
      (order.vin && order.vin.toLowerCase().includes(normQuery)) ||
      order.line.toLowerCase().includes(normQuery) ||
      order.version.toLowerCase().includes(normQuery) ||
      order.exterior.toLowerCase().includes(normQuery) ||
      order.interior.toLowerCase().includes(normQuery)
    ));
  }, [allOrders, orders, query]);

  const totalOrders = queryMatchedOrders.length;
  const unpairedOrders = queryMatchedOrders.filter((order) => order.status === 'Chưa ghép').length;
  const pairedOrders = queryMatchedOrders.filter((order) => order.status === 'Đã ghép').length;
  const reviewOrders = queryMatchedOrders.filter((order) => reviewStatuses.includes(order.status)).length;
  const issuedOrders = queryMatchedOrders.filter((order) => order.status === 'Đã xuất hóa đơn').length;
  const canceledOrders = queryMatchedOrders.filter((order) => order.status === 'Đã hủy').length;

  const selectedCandidates = selectedOrder
    ? inventory.filter(
        (item) =>
          matchesVehicleConfig(selectedOrder, item) &&
          canUseVehicleForPair(item, currentUsername, canOverrideHeldVehicle)
      )
    : [];

  const selectedCanPair =
    Boolean(selectedOrder) &&
    canPairOrder &&
    selectedOrder.status === 'Chưa ghép' &&
    selectedCandidates.length > 0;
  const selectedCanUnpair = Boolean(selectedOrder) && canManageOrderActions && selectedOrder.status === 'Đã ghép';
  const selectedCanInvoice = Boolean(selectedOrder) && canManageOrderActions && selectedOrder.status === 'Đã ghép';
  const selectedCanCancel =
    Boolean(selectedOrder) &&
    canManageOrderActions &&
    selectedOrder.status !== 'Đã hủy' &&
    selectedOrder.status !== 'Đã xuất hóa đơn';
  const selectedCanEdit =
    Boolean(selectedOrder) &&
    canManageOrderActions &&
    !['Đã xuất hóa đơn', 'Đã hủy', 'Chờ ký hóa đơn'].includes(selectedOrder.status);
  const selectedCanPolicy = Boolean(selectedOrder) && canManageOrderActions && selectedOrder.status !== 'Đã hủy';

  useEffect(() => {
    if (!isMobile) {
      setMobileView('list');
    }
  }, [isMobile]);

  const handleExportOrders = () => {
    const data = orders.map((o, index) => ({
      'STT': index + 1,
      'TVBH': o.staff || '',
      'Tên Khách Hàng': o.customer || '',
      'Số tiền khách đã đóng': o.soTienKhachDaDong ? o.soTienKhachDaDong.toLocaleString() : '',
      'Địa chỉ': o.area || '',
      'Số Hợp Đồng': o.contractCode || '',
      'Ngày Ký Hợp Đồng': o.ngayKyHopDong || '',
      'Hình thức TT': o.paymentMethod || '',
      'Nguồn khách': o.nguonKhach || '',
      'Mã VSO': o.id || '',
      'Ngày XHĐ': o.needDate || '',
      'Mua Bảo Hiểm': o.muaBaoHiem ? 'Có' : (o.muaBaoHiem === false ? 'Không' : ''),
      'Đăng ký xe': o.dangKyXe ? 'Có' : (o.dangKyXe === false ? 'Không' : ''),
      'Vin': o.vin || '',
      'Model': o.version || o.line || '',
      'Màu Xe': o.exterior || '',
      'Giá công bố': o.giaCongBo ? o.giaCongBo.toLocaleString() : '',
      'Ghi chú': o.ghiChu || '',
      'CỌC': o.depositAmount ? o.depositAmount.toLocaleString() : ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DonHang');
    XLSX.writeFile(workbook, 'Danh_Sach_Don_Hang.xlsx');
  };

  return (
    <section
      className={isMobile ? `panel orders-panel ${mobileView === 'detail' ? 'orders-mobile-detail' : 'orders-mobile-list'}` : 'panel orders-panel'}
    >
      <div className="orders-modular-workspace" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Cánh trái: Bảng dữ liệu đơn hàng & Bộ lọc */}
        <div className="orders-data-side">
          {/* Header: Metrics và Controls ngang hàng */}
          <div style={{ 
            padding: '4px 0 8px 0', 
            background: '#ffffff', 
            display: 'flex', 
            flexWrap: 'wrap', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            gap: '12px' 
          }}>
            {/* 1. Hàng Metrics */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: '1 1 auto' }}>
              <button onClick={() => onStatusChange('Tất cả')} className="tag hover-bg-slate" style={{ fontSize: '10.5px', padding: '3px 8px', background: status === 'Tất cả' ? '#e2e8f0' : '#f1f5f9', color: '#334155', borderRadius: '6px', border: status === 'Tất cả' ? '1px solid #cbd5e1' : '1px solid #e2e8f0', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                Tổng: <strong>{totalOrders}</strong>
              </button>
              <button onClick={() => onStatusChange('Chưa ghép')} className="tag hover-bg-slate" style={{ fontSize: '10.5px', padding: '3px 8px', background: status === 'Chưa ghép' ? '#d1fae5' : '#ecfdf5', color: '#047857', borderRadius: '6px', border: status === 'Chưa ghép' ? '1px solid #6ee7b7' : '1px solid #a7f3d0', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                Chưa ghép: <strong>{unpairedOrders}</strong>
              </button>
              <button onClick={() => onStatusChange('Đã ghép')} className="tag hover-bg-slate" style={{ fontSize: '10.5px', padding: '3px 8px', background: status === 'Đã ghép' ? '#e0e7ff' : '#eef2ff', color: '#4338ca', borderRadius: '6px', border: status === 'Đã ghép' ? '1px solid #818cf8' : '1px solid #c7d2fe', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                Đã ghép: <strong>{pairedOrders}</strong>
              </button>
              <button onClick={() => onStatusChange('Chờ xử lý')} className="tag hover-bg-slate" style={{ fontSize: '10.5px', padding: '3px 8px', background: status === 'Chờ xử lý' ? '#fef3c7' : '#fffbeb', color: '#b45309', borderRadius: '6px', border: status === 'Chờ xử lý' ? '1px solid #fcd34d' : '1px solid #fde68a', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                Chờ xử lý: <strong>{reviewOrders}</strong>
              </button>
              <button onClick={() => onStatusChange('Đã xuất hóa đơn')} className="tag hover-bg-slate" style={{ fontSize: '10.5px', padding: '3px 8px', background: status === 'Đã xuất hóa đơn' ? '#dbeafe' : '#eff6ff', color: '#1d4ed8', borderRadius: '6px', border: status === 'Đã xuất hóa đơn' ? '1px solid #93c5fd' : '1px solid #bfdbfe', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                Đã xuất HĐ: <strong>{issuedOrders}</strong>
              </button>
              <button onClick={() => onStatusChange('Đã hủy')} className="tag hover-bg-slate" style={{ fontSize: '10.5px', padding: '3px 8px', background: status === 'Đã hủy' ? '#ffe4e6' : '#fff1f2', color: '#be123c', borderRadius: '6px', border: status === 'Đã hủy' ? '1px solid #fda4af' : '1px solid #fecdd3', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                Đã hủy: <strong>{canceledOrders}</strong>
              </button>
            </div>

            {/* 2. Thanh công cụ tìm kiếm & nút */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', flex: '1 1 auto', justifyContent: 'flex-end' }}>
              <label className="search-box" style={{ flex: '1 1 200px', maxWidth: '300px', minHeight: '32px', height: '32px', padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: '6px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} style={{ color: '#64748b' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Tìm nhanh số đơn, KH, VIN..."
                style={{ fontSize: '12px', border: 'none', outline: 'none', width: '100%', color: '#1e293b' }}
              />
            </label>

            {isAdmin && (
              <button
                type="button"
                className="ghost-button hover-bg-slate"
                onClick={handleExportOrders}
                style={{ flex: '0 0 auto', height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff', color: '#059669', fontWeight: 500, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s', cursor: 'pointer' }}
                title="Xuất danh sách ra file Excel"
              >
                <Download size={13} />
                <span className="hide-on-mobile">Xuất Excel</span>
              </button>
            )}

            <button
              type="button"
              className="ghost-button hover-bg-slate"
              onClick={() => setShowQueueModal(true)}
              style={{ flex: '0 0 auto', height: '32px', padding: '0 12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff', color: '#2563eb', fontWeight: 500, fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s', cursor: 'pointer' }}
            >
              <Car size={13} />
              Xếp hạng chờ ghép xe
            </button>
            </div>
          </div>

          {/* 3. Bảng dữ liệu DATA TABLE chuyên nghiệp */}
          <div className="table-wrap" style={{ marginTop: '4px' }}>
            {isMobile ? (
              <div className="orders-mobile-card-list">
                {orders.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 16px', textAlign: 'center' }}>
                    Không tìm thấy đơn hàng phù hợp.
                  </div>
                ) : (
                  orders.map((order) => {
                    const isActive = selectedOrder?.id === order.id;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        className={isActive ? 'orders-mobile-card active' : 'orders-mobile-card'}
                        onClick={() => {
                          setSelectedOrderId(order.id);
                          setIsDetailPanelOpen(true);
                          setMobileView('detail');
                        }}
                      >
                        <div className="orders-mobile-card-header">
                          <div className="orders-mobile-card-headings">
                            <p className="orders-mobile-card-title" style={{ textTransform: 'uppercase' }}>{order.customer}</p>
                            <p className="orders-mobile-card-subtitle">{order.id}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={statusTone[order.status]} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                              {order.status}
                            </span>
                            {(() => {
                              if (order.vin) return null;
                              const matchCount = inventory.filter(v => matchesVehicleConfig(order, v) && canUseVehicleForPair(v, currentUsername, canOverrideHeldVehicle)).length;
                              if (matchCount > 0 && canManageOrderActions) {
                                return (
                                  <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                    Có {matchCount} xe rảnh
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <div className="orders-mobile-card-divider" />

                        <div className="orders-mobile-card-bottom">
                          <div className="orders-mobile-card-meta">
                            <span>Dòng xe</span>
                            <strong>{order.line}</strong>
                          </div>
                          <div className="orders-mobile-card-meta orders-mobile-card-meta-right">
                            <span>Tư vấn bán hàng</span>
                            <strong>{order.staff}</strong>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Khách hàng</th>
                    {showStaffColumn && <th>Tên TVBH</th>}
                    <th>Cấu hình xe</th>
                    <th>VIN ghép</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontStyle: 'italic' }}>
                        Không tìm thấy đơn hàng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const isActive = selectedOrder?.id === order.id;
                      return (
                        <tr
                          key={order.id}
                          onClick={() => {
                            setSelectedOrderId(order.id);
                            setIsDetailPanelOpen(true);
                            if (isMobile) {
                              setMobileView('detail');
                            }
                          }}
                          className={`${isActive ? 'active-row' : ''} ${order.isWarning ? 'warning-row' : ''}`}
                          style={{ cursor: 'pointer', transition: 'background 0.15s', backgroundColor: order.isWarning ? '#fff1f2' : undefined }}
                        >
                          <td style={{ fontWeight: 700, color: order.isWarning ? '#e11d48' : '#0f766e', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: 'none' }}>
                            {order.id}
                            {order.isWarning && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#e11d48', fontSize: '11px', fontWeight: 700, backgroundColor: '#ffe4e6', padding: '2px 4px', borderRadius: '4px' }} title={order.warningMessage}>
                                <TriangleAlert size={12} />
                                <span>{order.pairedDays} ngày</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#1e293b', textTransform: 'uppercase' }}>{order.customer}</div>
                          </td>
                          {showStaffColumn && (
                            <td>
                              <div style={{ fontWeight: 600, color: '#475569' }}>{order.staff}</div>
                            </td>
                          )}
                          <td>
                            <div style={{ fontWeight: 600, color: '#334155' }}>{order.line} {order.version}</div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{order.exterior} · {order.interior}</div>
                          </td>
                          <td>
                            {order.vin ? (
                              <strong style={{ color: '#0284c7', fontSize: '12.5px', letterSpacing: '0.02em' }}>{order.vin}</strong>
                            ) : (() => {
                              const matchCount = inventory.filter(v => matchesVehicleConfig(order, v) && canUseVehicleForPair(v, currentUsername, canOverrideHeldVehicle)).length;
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{ color: '#94a3b8', fontSize: '11.5px', fontStyle: 'italic' }}>Chưa ghép</span>
                                  {matchCount > 0 && canManageOrderActions && (
                                    <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, width: 'fit-content' }}>Có {matchCount} xe rảnh</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <span className={statusTone[order.status]}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Cánh phải: Chi tiết đơn hàng & Các nút hành động */}
        {isDetailPanelOpen && (
          <div className="slide-over-overlay" onClick={() => setIsDetailPanelOpen(false)}>
            <div className="slide-over-panel" onClick={(e) => e.stopPropagation()}>
              {!isMobile && (
                <button 
                  onClick={() => setIsDetailPanelOpen(false)} 
                  style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: '#e2e8f0', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                >
                  <X size={20} />
                </button>
              )}
              <div className="orders-visual-side" style={{ height: '100%' }}>
          <div className="order-detail-widget-container">
            {selectedOrder ? (
              (() => {
                const selectedVehicleSummary = `${selectedOrder.line} / ${selectedOrder.version}`;
                const selectedFinishSummary = `${selectedOrder.exterior} · ${selectedOrder.interior}`;

                return (
                  <>
                    {isMobile ? (
                      <button
                        type="button"
                        className="ghost-button orders-mobile-back"
                        onClick={() => { setMobileView('list'); setIsDetailPanelOpen(false); }}
                        style={{ alignSelf: 'flex-start', height: '32px', padding: '0 10px', fontSize: '12px' }}
                      >
                        <ArrowLeft size={14} />
                        <span>Danh sách</span>
                      </button>
                    ) : null}
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                      <div className="orders-detail-pane__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', marginBottom: '16px', borderBottom: '2px solid #1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ fontSize: '20px', margin: 0, fontWeight: 700, color: '#111827' }}>Hồ sơ: {selectedOrder.id}</h3>
                          <button className="ghost-button" title="Copy mã đơn" onClick={() => copyToClipboard(selectedOrder.id, 'Mã đơn')} style={{ padding: '4px', height: 'auto', color: '#64748b' }}><Copy size={14} /></button>
                        </div>
                        <span className={statusTone[selectedOrder.status]} style={{ padding: '4px 8px', border: '1px solid currentColor', fontSize: '12px', fontWeight: 600 }}>{selectedOrder.status}</span>
                      </div>

                      {isEditingInline ? (
                        <InlineOrderEditForm
                          order={selectedOrder}
                          isSubmitting={isUpdatingOrder}
                          vehicleConfigs={vehicleConfigs}
                          staffNames={dynamicStaffNames}
                          onCancel={() => setIsEditingInline(false)}
                          onSubmit={async (input) => {
                            const ok = await onUpdateOrder(input);
                            if (ok) setIsEditingInline(false);
                            return ok;
                          }}
                        />
                      ) : (
                        <>
                          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                            <tbody>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Khách hàng</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500, width: '32%' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.customer, 'Tên khách')}>{selectedOrder.customer}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569', width: '18%' }}>Tư vấn viên</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500, width: '32%' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.staff, 'Tên TVBH')}>{selectedOrder.staff}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Dòng xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>{selectedVehicleSummary}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Màu (Ngoại/Nội)</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedFinishSummary}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Số VIN định danh</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 700, letterSpacing: '0.05em' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.vin || '', 'Số VIN')}>{selectedOrder.vin || <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>Chưa cấp</span>}</td>
                                <td style={{ backgroundColor: '#fef3c7', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 700, color: '#92400e' }}>Ngày ghép xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 600 }}>
                                    {selectedOrder.pairedAt !== 'Chưa ghép' ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>{selectedOrder.pairedAt}</span>
                                        {selectedOrder.pairedDays !== undefined && (
                                          <span style={{ padding: '2px 8px', backgroundColor: selectedOrder.pairedDays >= 3 ? '#fee2e2' : '#e0f2fe', color: selectedOrder.pairedDays >= 3 ? '#b91c1c' : '#0369a1', borderRadius: '12px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            {selectedOrder.pairedDays} ngày
                                          </span>
                                        )}
                                      </div>
                                    ) : '—'}
                                  </td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày cần xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{formatDetailDate(selectedOrder.needDateIso || selectedOrder.needDate) || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày đặt cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.depositDate || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Tiền đã cọc</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#b91c1c', fontWeight: 700 }} colSpan={3}>{selectedOrder.depositAmount ? new Intl.NumberFormat('vi-VN').format(selectedOrder.depositAmount) + ' ₫' : '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Thanh toán</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.paymentMethod || 'Tiền mặt'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Nguồn khách</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.nguonKhach || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Hợp Đồng</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.contractCode || '', 'Mã HĐ')}>{selectedOrder.contractCode || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mã Amis</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.maAmis || '', 'Mã Amis')}>{selectedOrder.maAmis || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ngày ký HĐ</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{formatDetailDate(selectedOrder.ngayKyHopDong) || '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Giá công bố</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.giaCongBo ? new Intl.NumberFormat('vi-VN').format(selectedOrder.giaCongBo) + ' ₫' : '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Đăng ký xe</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.dangKyXe === true ? 'Có' : selectedOrder.dangKyXe === false ? 'Không' : '—'}</td>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Mua bảo hiểm</td>
                                <td style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>{selectedOrder.muaBaoHiem === true ? 'Có' : selectedOrder.muaBaoHiem === false ? 'Không' : '—'}</td>
                              </tr>
                              {selectedOrder.xeXangVin || selectedOrder.xeXangModel || selectedOrder.xeXangHang ? (
                                <tr>
                                  <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Xe xăng thu cũ</td>
                                  <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>
                                    {[selectedOrder.xeXangVin, selectedOrder.xeXangHang, selectedOrder.xeXangModel].filter(Boolean).join(' - ')}
                                  </td>
                                </tr>
                              ) : null}
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Chính sách</td>
                                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500 }}>
                                  {(() => {
                                    if (!selectedOrder.policy) return 'Mặc định';
                                    const policies = parseSmartPolicy(selectedOrder.policy, knownPolicies);
                                    if (policies.length === 0) return 'Mặc định';
                                    
                                    if (policies.length <= 3) {
                                      return (
                                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                          {policies.map((p, i) => <li key={i}>{p}</li>)}
                                        </ul>
                                      );
                                    }

                                    const mid = Math.ceil(policies.length / 2);
                                    const col1 = policies.slice(0, mid);
                                    const col2 = policies.slice(mid);

                                    return (
                                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '0 24px' }}>
                                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', wordBreak: 'break-word' }}>
                                          {col1.map((p, i) => <li key={i}>{p}</li>)}
                                        </ul>
                                        <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px', wordBreak: 'break-word' }}>
                                          {col2.map((p, i) => <li key={i}>{p}</li>)}
                                        </ul>
                                      </div>
                                    );
                                  })()}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Địa chỉ XHD</td>
                                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }} className="clickable-copy-field" onClick={() => copyToClipboard(selectedOrder.invoiceAddress || '', 'Địa chỉ XHD')}>{selectedOrder.invoiceAddress || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Ghi chú</td>
                                <td colSpan={3} style={{ border: '1px solid #cbd5e1', padding: '8px 12px', color: '#0f172a', fontWeight: 500, whiteSpace: 'pre-wrap' }}>{selectedOrder.ghiChu || '—'}</td>
                              </tr>
                            </tbody>
                          </table>
                          </div>

                          <div style={{ paddingTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {canPairOrder && !isPairingInline && !isCancelingInline && (
                              <button
                                disabled={!selectedCanPair}
                                onClick={() => setIsPairingInline(true)}
                                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: selectedCanPair ? '#f1f5f9' : '#ffffff', color: selectedCanPair ? '#0f172a' : '#94a3b8', cursor: selectedCanPair ? 'pointer' : 'not-allowed', borderRadius: 0 }}
                              >
                                Ghép xe
                              </button>
                            )}
                            {!isPairingInline && !isCancelingInline && (
                              <button
                                disabled={!selectedCanInvoice}
                                onClick={() => onInvoiceOrder(selectedOrder)}
                                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: selectedCanInvoice ? '#f1f5f9' : '#ffffff', color: selectedCanInvoice ? '#0f172a' : '#94a3b8', cursor: selectedCanInvoice ? 'pointer' : 'not-allowed', borderRadius: 0 }}
                              >
                                Xuất HĐ
                              </button>
                            )}
                            {!isPairingInline && !isCancelingInline && (
                              <button
                                disabled={!selectedCanEdit}
                                onClick={() => setIsEditingInline(true)}
                                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#ffffff', color: selectedCanEdit ? '#0f172a' : '#94a3b8', cursor: selectedCanEdit ? 'pointer' : 'not-allowed', borderRadius: 0 }}
                              >
                                Sửa
                              </button>
                            )}
                            {!isPairingInline && !isCancelingInline && (
                              <button
                                disabled={!selectedCanUnpair || isUnpairingOrderId === selectedOrder.id}
                                onClick={() => onUnpairOrder(selectedOrder.id)}
                                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #cbd5e1', background: '#ffffff', color: selectedCanUnpair ? '#0f172a' : '#94a3b8', cursor: selectedCanUnpair ? 'pointer' : 'not-allowed', borderRadius: 0 }}
                              >
                                {isUnpairingOrderId === selectedOrder.id ? 'Đang hủy...' : 'Hủy ghép'}
                              </button>
                            )}
                            {canManageOrderActions && !isPairingInline && !isCancelingInline && (
                              <button
                                disabled={!selectedCanCancel}
                                onClick={() => setIsCancelingInline(true)}
                                style={{ flex: 1, padding: '10px', fontSize: '13px', fontWeight: 600, border: '1px solid #fecaca', background: selectedCanCancel ? '#fef2f2' : '#ffffff', color: selectedCanCancel ? '#ef4444' : '#fca5a5', cursor: selectedCanCancel ? 'pointer' : 'not-allowed', borderRadius: 0 }}
                              >
                                Hủy đơn
                              </button>
                            )}
                          </div>

                          {isPairingInline && (
                            <form onSubmit={handlePairInlineSubmit} style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Liên kết ghép xe</h4>
                              <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#475569' }}>Số khung (VIN) phù hợp *</span>
                                <select
                                  value={pairVin}
                                  onChange={(e) => setPairVin(e.target.value)}
                                  disabled={isPairingSubmit || candidates.length === 0}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px', color: '#0f172a' }}
                                >
                                  {candidates.length === 0 ? <option value="">Không tìm thấy xe trống phù hợp cấu hình</option> : null}
                                  {candidates.map((item) => (
                                    <option key={item.vin} value={item.vin}>
                                      {item.vin} · Vị trí: {item.location || 'Chưa có'}
                                      {item.latitude !== null && item.longitude !== null ? ` · GPS: ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}` : ''}
                                      · Trạng thái: {item.status}
                                      {item.holder ? ` · Giữ bởi ${item.holder}` : ''}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {pairError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{pairError}</div>}
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsPairingInline(false)} disabled={isPairingSubmit} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569' }}>Hủy</button>
                                <button type="submit" disabled={isPairingSubmit || !pairVin} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{isPairingSubmit ? 'Đang xử lý...' : 'Xác nhận ghép'}</button>
                              </div>
                            </form>
                          )}

                          {isCancelingInline && (
                            <form onSubmit={handleCancelInlineSubmit} style={{ marginTop: '16px', padding: '16px', background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px' }}>
                              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Hủy đơn hàng</h4>
                              <p style={{ fontSize: '12px', color: '#991b1b', marginBottom: '12px' }}>
                                Hành động này sẽ giải phóng số khung (VIN) của đơn hàng (nếu đã ghép) về trạng thái trống và hủy kích hoạt quy trình bán hàng. Không thể đảo ngược hành động.
                              </p>
                              <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#991b1b' }}>Kiểu hủy *</span>
                                <select
                                  value={cancelType}
                                  onChange={(e) => setCancelType(e.target.value as 'cancel' | 'wait')}
                                  disabled={isCancelingSubmit}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '13px', color: '#991b1b', background: '#fff' }}
                                >
                                  <option value="cancel">Hủy luôn đơn hàng (Hủy đơn)</option>
                                  <option value="wait">Hủy ghép & Đợi xe khác (Chờ xe)</option>
                                </select>
                              </label>

                              {cancelType === 'wait' && (
                                <label style={{ display: 'block', marginBottom: '12px' }}>
                                  <span style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#991b1b' }}>Thời gian cần xe *</span>
                                  <input
                                    type="date"
                                    value={cancelNeedDate}
                                    onChange={(e) => setCancelNeedDate(e.target.value)}
                                    required
                                    disabled={isCancelingSubmit}
                                    style={{ width: '100%', padding: '8px', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '13px', color: '#991b1b', background: '#fff' }}
                                  />
                                </label>
                              )}

                              <label style={{ display: 'block', marginBottom: '12px' }}>
                                <span style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#991b1b' }}>Lý do hủy đơn hàng *</span>
                                <textarea
                                  value={cancelNote}
                                  onChange={(e) => setCancelNote(e.target.value)}
                                  placeholder="Nhập chi tiết lý do khách trả cọc, đổi nhu cầu..."
                                  rows={3}
                                  required
                                  disabled={isCancelingSubmit}
                                  style={{ width: '100%', padding: '8px', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '13px', color: '#991b1b', background: '#fff', resize: 'vertical' }}
                                />
                              </label>

                              {cancelError && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{cancelError}</div>}
                              
                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setIsCancelingInline(false)} disabled={isCancelingSubmit} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', color: '#991b1b' }}>Quay lại</button>
                                <button type="submit" disabled={isCancelingSubmit} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 500, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>{isCancelingSubmit ? 'Đang thực thi hủy...' : 'Xác nhận hủy đơn'}</button>
                              </div>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  </>
                );
              })()
            ) : null}
            </div>
          </div>
            </div>
          </div>
        )}
        </div>
        {showQueueModal && (
          <QueueRankingModal
            orders={allOrders || orders}
            onClose={() => setShowQueueModal(false)}
          />
        )}
      </section>
    );
  };
