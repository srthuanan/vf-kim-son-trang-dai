import React, { Suspense, lazy, useMemo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { X, Users, CalendarDays, UserRound, ShieldCheck, TriangleAlert, Bell, FileText, ExternalLink, Sparkles } from 'lucide-react';

// Lớp Dữ liệu & API
import { supabase } from './services/supabaseClient';
import { getProfile } from './services/apiService';
import { useAppData } from './hooks/useAppData';
import { useOrderOperations } from './hooks/useOrderOperations';
import { TabKey } from './constants';
import { InventoryItem, Order, OrderStatus, YeucauxhdRow, ProfileRow } from './types';

// Giao diện Layout
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { AuthScreen } from './components/AuthScreen';
import { SetPasswordScreen } from './components/SetPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { CompleteProfileScreen } from './components/CompleteProfileScreen';
import { SettingsPanel } from './components/SettingsPanel';

// Lớp Giao diện Từng Tab Chức năng
const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const OrdersPanel = lazy(() => import('./components/OrdersPanel').then((module) => ({ default: module.OrdersPanel })));
const InventoryPanel = lazy(() => import('./components/InventoryPanel').then((module) => ({ default: module.InventoryPanel })));
const InvoiceRequestsPanel = lazy(() => import('./components/InvoiceRequestsPanel').then((module) => ({ default: module.InvoiceRequestsPanel })));
const StaffPanel = lazy(() => import('./components/StaffPanel').then((module) => ({ default: module.StaffPanel })));
const HRPanel = lazy(() => import('./components/HRPanel').then((module) => ({ default: module.HRPanel })));
const PricingPanel = lazy(() => import('./components/PricingPanel').then((module) => ({ default: module.PricingPanel })));

// Lớp Popup Modal
const CreateOrderModal = lazy(() => import('./components/modals/CreateOrderModal').then((module) => ({ default: module.CreateOrderModal })));
const PairVehicleModal = lazy(() => import('./components/modals/PairVehicleModal').then((module) => ({ default: module.PairVehicleModal })));
const VehicleGpsModal = lazy(() => import('./components/modals/VehicleGpsModal').then((module) => ({ default: module.VehicleGpsModal })));
const CancelOrderModal = lazy(() => import('./components/modals/CancelOrderModal').then((module) => ({ default: module.CancelOrderModal })));
const InvoiceRequestModal = lazy(() => import('./components/modals/InvoiceModal').then((module) => ({ default: module.InvoiceRequestModal })));
const ChangePasswordModal = lazy(() => import('./components/modals/ChangePasswordModal').then((module) => ({ default: module.ChangePasswordModal })));
const FinalizeInvoiceModal = lazy(() => import('./components/modals/FinalizeInvoiceModal').then((module) => ({ default: module.FinalizeInvoiceModal })));
const SupplementaryInvoiceModal = lazy(() => import('./components/modals/SupplementaryInvoiceModal').then((module) => ({ default: module.SupplementaryInvoiceModal })));
const RequestSupplementModal = lazy(() => import('./components/modals/RequestSupplementModal').then((module) => ({ default: module.RequestSupplementModal })));
const ImportInventoryModal = lazy(() => import('./components/modals/ImportInventoryModal').then((module) => ({ default: module.ImportInventoryModal })));
const EditOrderModal = lazy(() => import('./components/modals/EditOrderModal').then((module) => ({ default: module.EditOrderModal })));
const SelectPolicyModal = lazy(() => import('./components/modals/SelectPolicyModal').then((module) => ({ default: module.SelectPolicyModal })));
import {
  canApproveInvoice,
  canViewNotifications,
  canCreateOrder,
  canHoldVehicle,
  canManageInventory,
  canManageOrderActions,
  canOverrideHeldVehicle,
  canPairOrder,
  canAccessTab,
  getVisibleTabs,
  roleLabels
} from './constants';

import './styles.css';
import { computeKpiAwards } from './utils/kpiRankUtils';

function App() {
  const {
    session,
    profile,
    profiles,
    orders,
    allOrders,
    inventory,
    vehicleLocations,
    queuedVins,
    auditLogs,
    invoiceRequests,
    hrLeaveRequests,
    vehicleConfigs,
    authReady,
    syncState,
    syncMessage,
    setSyncState,
    setSyncMessage,
    setProfile,
    loadWorkspace,
    updateInventoryItem
  } = useAppData();

  // Derivations
  const currentUsername = session?.user.email ?? '';
  const currentFullName = profile?.full_name || currentUsername || 'Nhân viên';
  const userRole = profile?.role ?? 'sales';
  const visibleTabs = getVisibleTabs(userRole);

  const {
    isCreating,
    createError,
    setCreateError,
    handleCreateOrder,
    isHolding,
    isHoldingVin,
    holdError,
    setHoldError,
    handleHoldVehicle,
    isReleasingVin,
    handleReleaseVehicle,
    isQueueingVin,
    handleJoinQueue,
    handleLeaveQueue,
    isImportingStock,
    importStockError,
    setImportStockError,
    handleImportStock,
    isUpdatingVehicleLocation,
    handleUpdateVehicleLocation,
    isPairing,
    pairError,
    setPairError,
    handlePairVehicle,
    isUnpairingOrderId,
    handleUnpairVehicle,
    isCanceling,
    handleCancelOrder,
    handleDeleteOrder,
    isUpdatingOrder,
    handleUpdateOrder,
    isUpdatingPolicy,
    handleUpdatePolicy,
    isRequestingInvoice,
    handleRequestInvoice,
    isSupplementingInvoice,
    handleSupplementInvoice,
    isAdvancingInvoice,
    handleApproveInvoiceRequest,
    handleRequestInvoiceSupplement,
    handleMarkInvoicePendingSignature,
    isFinalizingInvoice,
    handleFinalizeInvoice,
    handleUploadIssuedInvoice,
    isDeletingInvoice,
    handleDeleteInvoiceRequest,
    handleBulkUpdateInvoiceStatus,
    handleBulkDeleteInvoiceRequests
  } = useOrderOperations({
    session,
    currentUsername,
    currentFullName,
    canOverrideHeldVehicle: canOverrideHeldVehicle(userRole),
    loadWorkspace,
    setSyncState,
    setSyncMessage,
    updateInventoryItem
  });

  // UI states
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<OrderStatus | 'Tất cả' | 'Chờ xử lý' | 'Nợ hồ sơ'>('Tất cả');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal toggle states
  const [createOpen, setCreateOpen] = useState(false);
  const [createFromVehicle, setCreateFromVehicle] = useState<InventoryItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [pairingOrder, setPairingOrder] = useState<Order | null>(null);
  const [gpsItem, setGpsItem] = useState<InventoryItem | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [invoicingOrder, setInvoicingOrder] = useState<Order | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(true);
  const [finalizingRequest, setFinalizingRequest] = useState<YeucauxhdRow | null>(null);
  const [supplementingRequest, setSupplementingRequest] = useState<YeucauxhdRow | null>(null);
  const [requestingSupplement, setRequestingSupplement] = useState<YeucauxhdRow | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [selectingPolicyOrder, setSelectingPolicyOrder] = useState<Order | null>(null);
  const [staffSubTab, setStaffSubTab] = useState<'system' | 'hr'>('hr');
  const isSetPasswordRoute = window.location.pathname === '/set-password';
  const isResetPasswordRoute = window.location.pathname === '/reset-password';
  
  // Thực thi Filter trên danh sách orders
  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      const matchesStatus = 
        status === 'Tất cả' || 
        (status === 'Nợ hồ sơ' && Boolean(order.docDebtLevel && order.docDebtLevel !== 'clean' && !order.hoSoGiaoXe?.da_thu_du)) ||
        order.status === status ||
        (status === 'Chờ xử lý' && ['Chờ phê duyệt', 'Đã phê duyệt', 'Yêu cầu bổ sung', 'Đã bổ sung', 'Chờ ký hóa đơn'].includes(order.status));
        
      if (!matchesStatus) return false;

      const normQuery = query.trim().toLowerCase();
      if (!normQuery) return true;

      return (
        order.id.toLowerCase().includes(normQuery) ||
        order.customer.toLowerCase().includes(normQuery) ||
        order.phone.includes(normQuery) ||
        order.vin.toLowerCase().includes(normQuery) ||
        order.line.toLowerCase().includes(normQuery) ||
        order.version.toLowerCase().includes(normQuery) ||
        order.exterior.toLowerCase().includes(normQuery) ||
        order.interior.toLowerCase().includes(normQuery)
      );
    });
    
    // SLA Warning: Đưa các đơn cảnh báo (chậm XHĐ hoặc quá hạn nợ hồ sơ) lên đầu
    result.sort((a, b) => {
      const aDanger = Boolean(a.isWarning || a.docDebtLevel === 'danger');
      const bDanger = Boolean(b.isWarning || b.docDebtLevel === 'danger');
      if (aDanger && !bDanger) return -1;
      if (!aDanger && bDanger) return 1;
      const aWarn = Boolean(a.docDebtLevel === 'warning');
      const bWarn = Boolean(b.docDebtLevel === 'warning');
      if (aWarn && !bWarn) return -1;
      if (!aWarn && bWarn) return 1;
      return 0;
    });

    return result;
  }, [orders, query, status]);

  // Lấy thống kê xe trống
    // Đếm số đơn cảnh báo
  const slaWarningCount = useMemo(() => {
    return orders.filter(o => o.isWarning).length;
  }, [orders]);

  const availableStock = useMemo(
    () => inventory.filter((item) => item.status === 'Chưa ghép').length,
    [inventory]
  );

  // Đếm số yêu cầu xuất hóa đơn đang chờ duyệt
  const pendingInvoicesCount = useMemo(() => {
    return invoiceRequests.filter((r) => {
      const s = (r.trang_thai_xu_ly || (r.status === 'approved' ? 'Đã phê duyệt' : r.status === 'rejected' ? 'Từ chối' : 'Chờ phê duyệt')).toLowerCase();
      return s === 'chờ phê duyệt' || r.status === 'pending';
    }).length;
  }, [invoiceRequests]);

  // Tự động tính toán & đồng bộ danh hiệu thi đua KPI theo thời gian thực cho Sidebar
  useEffect(() => {
    if (!profiles || !profiles.length) return;
    try {
      const now = new Date();
      const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const ordersToUse = allOrders.length ? allOrders : orders;
      const awards = computeKpiAwards(profiles, hrLeaveRequests, ordersToUse, invoiceRequests, currentMonthKey);
      localStorage.setItem(`kpi_awards_${currentMonthKey}`, JSON.stringify(awards));
      window.dispatchEvent(new CustomEvent('kpi-rank-updated'));
    } catch (e) {
      console.error('Lỗi tính KPI tự động:', e);
    }
  }, [profiles, hrLeaveRequests, orders, allOrders, invoiceRequests]);

  // Realtime Toast Alert khi có Yêu cầu XHĐ mới
  const [invoiceToast, setInvoiceToast] = useState<{
    id: string;
    orderId: string;
    customer: string;
    tvbh?: string;
    carLine?: string;
    time: string;
  } | null>(null);

  // Phát âm thanh nhẹ bằng Web Audio API khi có thông báo mới (không cần file âm thanh ngoài)
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      // Chuông 2 nốt ấm áp (C5 -> E5)
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Ignored if browser blocks audio autoplay
    }
  };

  useEffect(() => {
    const handleNewInvoiceRequest = (e: Event) => {
      const customEvent = e as CustomEvent;
      const req = customEvent.detail;
      if (!req) return;

      // TVBH chỉ nhận thông báo đơn của mình, Admin/TPKD nhận tất cả
      if (userRole === 'sales') {
        const myName = (profile?.full_name || '').toLowerCase();
        const reqTvbh = (req.tvbh || req.requested_by_name || '').toLowerCase();
        if (myName && reqTvbh && !reqTvbh.includes(myName) && !myName.includes(reqTvbh)) {
          return;
        }
      }

      const toastData = {
        id: req.id || String(Date.now()),
        orderId: req.so_don_hang || 'Chưa rõ',
        customer: req.ten_khach_hang || 'Khách hàng',
        tvbh: req.tvbh || req.requested_by_name || '',
        carLine: req.dong_xe ? `${req.dong_xe} ${req.phien_ban || ''}`.trim() : undefined,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };

      setInvoiceToast(toastData);
      playNotificationSound();
    };

    window.addEventListener('new-invoice-request', handleNewInvoiceRequest);
    return () => window.removeEventListener('new-invoice-request', handleNewInvoiceRequest);
  }, [userRole, profile]);

  // Tự động tắt toast sau 7.5 giây
  useEffect(() => {
    if (!invoiceToast) return;
    const timer = setTimeout(() => {
      setInvoiceToast(null);
    }, 7500);
    return () => clearTimeout(timer);
  }, [invoiceToast]);

  // Đăng xuất
  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  useEffect(() => {
    if (!canAccessTab(userRole, activeTab)) {
      setActiveTab(visibleTabs[0]?.key ?? 'dashboard');
    }
  }, [activeTab, userRole, visibleTabs]);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { tab, search } = customEvent.detail;
      if (tab) setActiveTab(tab);
      if (search) setQuery(search);
    };
    window.addEventListener('navigate-to', handleNavigate);
    return () => window.removeEventListener('navigate-to', handleNavigate);
  }, []);

  // Màn hình Loading cấu hình
  if (!authReady) {
    return (
      <div className="auth-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'white', opacity: 0.8 }}>
          <p>Đang khởi tạo cổng truy cập...</p>
        </div>
      </div>
    );
  }

  // Yêu cầu Login qua Supabase Auth nếu chưa có session
  if (!session) {
    if (isSetPasswordRoute) {
      return <SetPasswordScreen />;
    }
    if (isResetPasswordRoute) {
      return <ResetPasswordScreen />;
    }
    return <AuthScreen />;
  }

  if (isSetPasswordRoute) {
    return <SetPasswordScreen />;
  }

  if (isResetPasswordRoute) {
    return <ResetPasswordScreen />;
  }

  if (session && !profile && syncState === 'error') {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div>
            <p className="eyebrow">TRUY CẬP BỊ TỪ CHỐI</p>
            <h1>Tài khoản chưa được admin cấp quyền</h1>
            <p className="auth-note">{syncMessage}</p>
          </div>
          <button className="primary-button" type="button" onClick={handleSignOut}>
            Đăng xuất
          </button>
        </section>
              {/* Cảnh báo SLA Global */}
        {slaWarningCount > 0 && canViewNotifications(userRole) && (
          <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#ef4444', color: 'white', padding: '12px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', zIndex: 9999 }}>
            <TriangleAlert size={20} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Cảnh báo tiến độ!</span>
              <span style={{ fontSize: '12.5px', opacity: 0.9 }}>Có {slaWarningCount} đơn hàng bị quá hạn XHĐ.</span>
            </div>
            <button 
              onClick={() => {
                setActiveTab('orders');
                setSidebarOpen(false);
              }}
              style={{ background: 'white', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', marginLeft: '10px' }}>
              Xem ngay
            </button>
          </div>
        )}
      </main>
    );
  }

  const isProfileIncomplete = profile 
    && profile.role !== 'admin' 
    && (!profile.phone || !profile.dob || !profile.gender || !profile.address);
  
  if (profile && isProfileIncomplete && showProfileModal) {
    return (
      <CompleteProfileScreen
        profile={profile}
        onComplete={async () => {
          // Ẩn modal NGAY LẬP TỨC trước khi gọi bất kỳ async nào
          setShowProfileModal(false);
          try {
            const result = await getProfile(session.user.id);
            if (result.data) {
              setProfile(result.data as ProfileRow);
            }
            await loadWorkspace({ showLoading: false });
          } catch (err) {
            console.error('Lỗi khi tải lại workspace:', err);
          }
        }}
        onLogout={handleSignOut}
      />
    );
  }

  if (editProfileOpen && profile) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', overflow: 'auto', display: 'grid', placeItems: 'center', padding: '20px' }}>
        <CompleteProfileScreen
          profile={profile}
          onComplete={async () => {
            // Refresh profile after successful update
            const result = await getProfile(session.user.id);
            if (result.data) {
              setProfile(result.data as ProfileRow);
            }
            setEditProfileOpen(false);
          }}
          onLogout={() => {
            handleSignOut();
          }}
          onCancel={() => setEditProfileOpen(false)}
        />
      </div>
    );
  }

  const activeTabObj = visibleTabs.find((t) => t.key === activeTab);
  const panelFallback = (
    <div className="panel" style={{ minHeight: '20rem', display: 'grid', placeItems: 'center' }}>
      <p>Đang tải giao diện...</p>
    </div>
  );

  return (
    <div className="app-shell">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        profile={profile}
        visibleTabs={visibleTabs}
        userEmail={session.user.email}
        pendingInvoicesCount={pendingInvoicesCount}
        onSignOut={handleSignOut}
        onChangePassword={() => setChangePasswordOpen(true)}
        onEditProfile={() => setEditProfileOpen(true)}
      />

      <main className="main">
        <Header
          canCreateOrder={canCreateOrder(userRole)}
          isAdmin={canViewNotifications(userRole)}
          setSidebarOpen={setSidebarOpen}
          setCreateOpen={(open) => {
            if (open) setCreateFromVehicle(null);
            setCreateOpen(open);
          }}
          activeTabLabel={activeTabObj?.label}
          activeTabIcon={activeTabObj?.icon}
        />

        <nav className="mobile-tab-strip" aria-label="Điều hướng nhanh trên di động">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                className={isActive ? 'mobile-tab-chip active' : 'mobile-tab-chip'}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSidebarOpen(false);
                }}
                style={{ position: 'relative' }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.key === 'invoices' && pendingInvoicesCount > 0 && (
                  <span
                    style={{
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '10px',
                      lineHeight: '1.2',
                      marginLeft: '3px'
                    }}
                  >
                    {pendingInvoicesCount > 99 ? '99+' : pendingInvoicesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <button className="backdrop" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        )}

        <div className="main-content">
          <Suspense fallback={panelFallback}>
            {/* Render Tab Component */}
            {activeTab === 'dashboard' && (
              <Dashboard
                orders={orders}
                availableStock={availableStock}
                auditLogs={auditLogs}
                currentProfile={profile}
                staffProfiles={profiles}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersPanel
                staffProfiles={profiles}
                orders={filteredOrders}
                allOrders={allOrders}
                inventory={inventory}
                currentUsername={currentUsername}
                canOverrideHeldVehicle={canOverrideHeldVehicle(userRole)}
                canPairOrder={canPairOrder(userRole)}
                canManageOrderActions={canManageOrderActions(userRole)}
                showStaffColumn={userRole === 'admin' || userRole === 'manager'}
                isAdmin={userRole === 'admin'}
                isUnpairingOrderId={isUnpairingOrderId}
                isUpdatingPolicy={isUpdatingPolicy}
                query={query}
                status={status}
                onQueryChange={setQuery}
                onStatusChange={setStatus}
                onViewOrder={setSelectedOrder}
                onPairOrderSubmit={handlePairVehicle}
                onUnpairOrder={handleUnpairVehicle}
                onInvoiceOrder={setInvoicingOrder}
                onCancelOrderSubmit={handleCancelOrder}
                onDeleteOrderSubmit={handleDeleteOrder}
                onEditOrder={setEditingOrder}
                onUpdateOrder={handleUpdateOrder}
                isUpdatingOrder={isUpdatingOrder}
                vehicleConfigs={vehicleConfigs}
                onSelectPolicy={setSelectingPolicyOrder}
                onRefresh={() => loadWorkspace({ showLoading: false })}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryPanel
                items={inventory}
                vehicleLocations={vehicleLocations}
                canManageInventory={canManageInventory(userRole)}
                canHoldVehicle={canHoldVehicle(userRole)}
                currentUsername={currentUsername}
                canOverrideHeldVehicle={canOverrideHeldVehicle(userRole)}
                isAdmin={userRole === 'admin'}
                isReleasingVin={isReleasingVin}
                isHoldingVin={isHoldingVin}
                isQueueingVin={isQueueingVin}
                isUpdatingVehicleLocation={isUpdatingVehicleLocation}
                queuedVins={queuedVins}
                onOpenImport={() => {
                  setImportStockError('');
                  setImportOpen(true);
                }}
                onHoldItem={(item) => {
                  handleHoldVehicle(item.vin);
                }}
                onCreateOrderFromItem={(item) => {
                  setCreateError('');
                  setCreateFromVehicle(item);
                  setCreateOpen(true);
                }}
                onReleaseItem={handleReleaseVehicle}
                onJoinQueue={handleJoinQueue}
                onLeaveQueue={handleLeaveQueue}
                onUpdateVehicleLocation={(item) => {
                  setSyncState('idle');
                  setSyncMessage('');
                  setGpsItem(item);
                }}
                vehicleConfigs={vehicleConfigs}
                onRefresh={() => loadWorkspace({ showLoading: false })}
              />
            )}

            {activeTab === 'pricing' && (
              <PricingPanel />
            )}

            {activeTab === 'invoices' && (
              <div className="invoice-panel" style={{ height: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <InvoiceRequestsPanel
                  requests={invoiceRequests}
                  canApprove={canApproveInvoice(userRole)}
                  isAdmin={userRole === 'admin'}
                  isProcessing={isAdvancingInvoice || isDeletingInvoice}
                  onApprove={(request) => handleApproveInvoiceRequest(request.id)}
                  onRequestSupplement={setRequestingSupplement}
                  onPendingSignature={(request) => handleMarkInvoicePendingSignature(request.id)}
                  onUploadInvoice={setFinalizingRequest}
                  onSupplement={setSupplementingRequest}
                  onDelete={(request) => handleDeleteInvoiceRequest(request.id)}
                  onBulkUpdateStatus={handleBulkUpdateInvoiceStatus}
                  onBulkDelete={handleBulkDeleteInvoiceRequests}
                />
              </div>
            )}


            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setStaffSubTab('system')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
                        border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                        background: staffSubTab === 'system' ? '#eff6ff' : 'transparent',
                        color: staffSubTab === 'system' ? '#0284c7' : '#64748b'
                      }}
                    >
                      <Users size={16} /> Quản lý tài khoản
                    </button>
                    <button
                      onClick={() => setStaffSubTab('hr')}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
                        border: 'none', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                        background: staffSubTab === 'hr' ? '#eff6ff' : 'transparent',
                        color: staffSubTab === 'hr' ? '#0284c7' : '#64748b'
                      }}
                    >
                      <CalendarDays size={16} /> Chấm công & Phép
                      {hrLeaveRequests.filter(r => r.status === 'pending').length > 0 && userRole === 'admin' && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '999px', padding: '0 6px', fontSize: '10px' }}>
                          {hrLeaveRequests.filter(r => r.status === 'pending').length}
                        </span>
                      )}
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => setEditProfileOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                    >
                      <UserRound size={14} /> Cập nhật hồ sơ
                    </button>
                    <button 
                      onClick={() => setChangePasswordOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                    >
                      <ShieldCheck size={14} /> Đổi mật khẩu
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  {staffSubTab === 'system' && (
                    <StaffPanel 
                      staff={profiles} 
                      currentProfile={profile} 
                      onReload={loadWorkspace} 
                      onEditProfile={() => setEditProfileOpen(true)}
                      onChangePassword={() => setChangePasswordOpen(true)}
                    />
                  )}
                  {staffSubTab === 'hr' && (
                    <HRPanel
                      requests={hrLeaveRequests}
                      currentProfile={profile}
                      currentUsername={currentUsername}
                      staffProfiles={profiles}
                      onReload={() => loadWorkspace({ showLoading: false })}
                      orders={allOrders.length ? allOrders : orders}
                      invoiceRequests={invoiceRequests}
                    />
                  )}
                </div>
              </div>
            )}
            {activeTab === 'settings' && <SettingsPanel configs={vehicleConfigs} onRefresh={loadWorkspace} />}
          </Suspense>
        </div>

      </main>

      {/* === Render Modals === */}

      <Suspense fallback={null}>
        {createOpen && (
          <CreateOrderModal
            error={createError}
            isCreating={isCreating}
            initialVehicle={createFromVehicle}
            currentStaffName={currentFullName}
            vehicleConfigs={vehicleConfigs}
            onClose={() => {
              if (!isCreating) {
                setCreateOpen(false);
                setCreateFromVehicle(null);
                setCreateError('');
              }
            }}
            onSubmit={async (input) => {
              const success = await handleCreateOrder(input);
              if (success) {
                setCreateOpen(false);
                setCreateFromVehicle(null);
              }
            }}
          />
        )}

        {pairingOrder && (
          <PairVehicleModal
            order={pairingOrder}
            currentUsername={currentUsername}
            canOverrideHeldVehicle={canOverrideHeldVehicle(userRole)}
            error={pairError}
            inventory={inventory}
            isPairing={isPairing}
            onClose={() => {
              if (!isPairing) {
                setPairingOrder(null);
                setPairError('');
              }
            }}
            onSubmit={async (orderId, vin) => {
              const success = await handlePairVehicle(orderId, vin);
              if (success) {
                setPairingOrder(null);
              }
            }}
          />
        )}

        {gpsItem && (
          <VehicleGpsModal
            item={gpsItem}
            isSaving={isUpdatingVehicleLocation === gpsItem.vin}
            error={syncState === 'error' ? syncMessage : ''}
            onClose={() => {
              if (isUpdatingVehicleLocation !== gpsItem.vin) {
                setGpsItem(null);
              }
            }}
            onSubmit={async (input) => {
              const success = await handleUpdateVehicleLocation(gpsItem.vin, input);
              if (success) {
                setGpsItem(null);
              }
              return success;
            }}
          />
        )}

        {importOpen && (
          <ImportInventoryModal
            error={importStockError}
            isSubmitting={isImportingStock}
            vehicleConfigs={vehicleConfigs}
            onClose={() => {
              if (!isImportingStock) {
                setImportOpen(false);
                setImportStockError('');
              }
            }}
            onSubmit={handleImportStock}
          />
        )}

        {cancelingOrder && (
          <CancelOrderModal
            orderId={cancelingOrder.id}
            currentNeedDate={cancelingOrder.needDateIso ? cancelingOrder.needDateIso.slice(0, 10) : ''}
            isCanceling={isCanceling}
            onClose={() => setCancelingOrder(null)}
            onSubmit={handleCancelOrder}
          />
        )}

        {invoicingOrder && (
          <InvoiceRequestModal
            order={invoicingOrder}
            isSubmitting={isRequestingInvoice}
            onClose={() => setInvoicingOrder(null)}
            onSubmit={async (input) => {
              const success = await handleRequestInvoice(input);
              if (success) {
                setInvoicingOrder(null);
              }
              return success;
            }}
          />
        )}

        {changePasswordOpen && (
          <ChangePasswordModal
            onClose={() => {
              setChangePasswordOpen(false);
            }}
          />
        )}

        {finalizingRequest && (
          <FinalizeInvoiceModal
            requestId={finalizingRequest.id}
            orderId={finalizingRequest.so_don_hang}
            customerName={finalizingRequest.ten_khach_hang}
            isSubmitting={isFinalizingInvoice}
            onClose={() => setFinalizingRequest(null)}
            onSubmit={handleUploadIssuedInvoice}
          />
        )}

        {requestingSupplement && (
          <RequestSupplementModal
            request={requestingSupplement}
            isSubmitting={isAdvancingInvoice}
            onClose={() => setRequestingSupplement(null)}
            onSubmit={handleRequestInvoiceSupplement}
          />
        )}

        {supplementingRequest && (
          <SupplementaryInvoiceModal
            request={supplementingRequest}
            isSubmitting={isSupplementingInvoice}
            onClose={() => setSupplementingRequest(null)}
            onSubmit={handleSupplementInvoice}
          />
        )}

        {editingOrder && (
          <EditOrderModal
            staffProfiles={profiles}
            order={editingOrder}
            isSubmitting={isUpdatingOrder}
            vehicleConfigs={vehicleConfigs}
            onClose={() => setEditingOrder(null)}
            onSubmit={handleUpdateOrder}
          />
        )}

        {selectingPolicyOrder && (
          <SelectPolicyModal
            orderId={selectingPolicyOrder.id}
            orderLine={selectingPolicyOrder.line}
            currentPolicy={selectingPolicyOrder.policy}
            isSubmitting={isUpdatingPolicy}
            onClose={() => setSelectingPolicyOrder(null)}
            onSubmit={handleUpdatePolicy}
          />
        )}
      </Suspense>

      {/* REALTIME TOAST NOTIFICATION: Yêu cầu xuất hóa đơn mới */}
      {invoiceToast && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            maxWidth: '380px',
            width: 'calc(100vw - 32px)',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 158, 11, 0.2)',
            padding: '16px',
            color: '#fff',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'slideUpToast 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)'
                }}
              >
                <FileText size={18} strokeWidth={2.4} />
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} />
                  Yêu Cầu Xuất Hóa Đơn Mới
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  Lúc {invoiceToast.time}
                </div>
              </div>
            </div>
            <button
              onClick={() => setInvoiceToast(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#cbd5e1',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              title="Đóng thông báo"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '2px' }}>
              {invoiceToast.customer}
            </div>
            <div style={{ fontSize: '12px', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div>Đơn hàng: <strong style={{ color: '#38bdf8' }}>{invoiceToast.orderId}</strong></div>
              {invoiceToast.carLine && <div>Dòng xe: <span style={{ color: '#fed7aa' }}>{invoiceToast.carLine}</span></div>}
              {invoiceToast.tvbh && <div>TVBH phụ trách: <span style={{ color: '#86efac' }}>{invoiceToast.tvbh}</span></div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <button
              onClick={() => {
                const targetOrder = invoiceToast.orderId;
                setInvoiceToast(null);
                setActiveTab('invoices');
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('select-invoice-request', {
                    detail: { orderId: targetOrder, folder: 'pending_approval' }
                  }));
                }, 100);
              }}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)'
              }}
            >
              <span>Xem & Duyệt ngay</span>
              <ExternalLink size={13} />
            </button>
            <button
              onClick={() => setInvoiceToast(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94a3b8',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Bỏ qua
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

