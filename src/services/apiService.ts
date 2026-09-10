import { supabase } from './supabaseClient';
import {
  CustomerRow,
  DonhangRow,
  KhoxeRow,
  ProfileRow,
  Order,
  InventoryItem,
  CarActivityRow,
  SalesPolicyRow,
  VehicleLocationRow,
  UpdateOrderInput,
  DeliveryDocStatus
} from '../types';
import { defaultSalesPolicies, DEFAULT_ARCHIVE_WEBHOOK_URL } from '../constants';

let autoSyncDebounceTimer: any = null;
let lastAutoSyncTimestamp = 0;

/**
 * Tự động đồng bộ ngầm đơn hàng tháng hiện tại sang Google Sheet
 * Có cơ chế Debounce 3s và chống spam (tối thiểu 15s giữa 2 lần)
 */
export const triggerAutoSyncCurrentOrders = (force = false) => {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (!force && now - lastAutoSyncTimestamp < 15000) {
    return;
  }
  if (autoSyncDebounceTimer) clearTimeout(autoSyncDebounceTimer);
  autoSyncDebounceTimer = setTimeout(async () => {
    try {
      const webhookUrl = localStorage.getItem('archive_webhook_url') || DEFAULT_ARCHIVE_WEBHOOK_URL;
      if (!webhookUrl) return;
      lastAutoSyncTimestamp = Date.now();
      await syncCurrentOrdersToSheet(webhookUrl);
      console.log('[AutoSync] Đã tự động đồng bộ đơn hàng tháng hiện tại sang Google Sheet');
    } catch (e) {
      console.warn('[AutoSync] Lỗi đồng bộ ngầm đơn hàng:', e);
    }
  }, 2500);
};

export const logSystemActivity = async (action: string, orderId: string | null, detail: string) => {
  if (!supabase) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const fullName = userData?.user?.user_metadata?.full_name || 'Hệ thống';
    const email = userData?.user?.email || 'system';
    
    // Fallback: ghi log bằng RPC hoặc insert trực tiếp (nếu schema hỗ trợ)
    await supabase.from('car_hold_activities').insert({
      action,
      so_don_hang: orderId,
      actor_name: fullName,
      actor_username: email,
      detail
    });
  } catch (e) {
    console.warn('Lỗi ghi activity log:', e);
  }
};

export const notifyAdminAction = async (actionDesc: string) => {
  if (!supabase) return;
  try {
    const { data: userData } = await supabase.auth.getUser();
    const fullName = userData?.user?.user_metadata?.full_name || 'TVBH';
    await supabase.from('admin_notifications').insert({
      type: 'tvbh_action',
      message: `${fullName} ${actionDesc}`
    });
  } catch (e) {
    console.warn('Lỗi tạo thông báo admin:', e);
  }
};

export function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function isInvoiceFromSept2026(invoiceDateStr?: string | null): boolean {
  if (!invoiceDateStr) return false;
  const str = invoiceDateStr.trim();
  if (!str || str === 'Chưa có' || str === '—') return false;

  // Check ISO format YYYY-MM-DD...
  if (/^\d{4}-\d{2}/.test(str)) {
    const year = parseInt(str.slice(0, 4), 10);
    const month = parseInt(str.slice(5, 7), 10);
    if (year > 2026) return true;
    if (year === 2026 && month >= 9) return true;
    return false;
  }

  // Check DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    const year = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    if (year > 2026) return true;
    if (year === 2026 && month >= 9) return true;
    return false;
  }

  // Fallback to Date parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed: 9 = Sept
    if (year > 2026) return true;
    if (year === 2026 && month >= 9) return true;
  }

  return false;
}

export function mapOrderRow(row: DonhangRow, customerMap: Map<string, CustomerRow>, invoiceMap?: Map<string, any>): Order {
  const customer = customerMap.get(row.ten_khach_hang.toLowerCase());
  const normalized = row.ket_qua.trim().toLowerCase();
  const status: Order['status'] = normalized.includes('hủy')
    ? 'Đã hủy'
    : normalized.includes('xuất hóa đơn')
      ? 'Đã xuất hóa đơn'
      : normalized.includes('chờ phê duyệt')
        ? 'Chờ phê duyệt'
        : normalized.includes('đã phê duyệt')
          ? 'Đã phê duyệt'
          : normalized.includes('yêu cầu bổ sung')
            ? 'Yêu cầu bổ sung'
            : normalized.includes('đã bổ sung')
              ? 'Đã bổ sung'
              : normalized.includes('chờ ký hóa đơn')
                ? 'Chờ ký hóa đơn'
                : normalized.includes('đã ghép')
                  ? 'Đã ghép'
                  : 'Chưa ghép';

  let pairedDays: number | undefined = undefined;
  const isWarning = (() => {
    if (status === 'Đã ghép' && row.thoi_gian_ghep) {
      const pairedTime = new Date(row.thoi_gian_ghep).getTime();
      const now = new Date().getTime();
      const diffDays = Math.floor((now - pairedTime) / (1000 * 60 * 60 * 24));
      pairedDays = diffDays;
      return diffDays >= 3;
    }
    return false;
  })();

  const warningMessage = (() => {
    if (isWarning && pairedDays !== undefined) {
      return `Đã phân bổ xe ${pairedDays} ngày chưa có động thái XHĐ!`;
    }
    return undefined;
  })();

  const rawDoc = row.ho_so_giao_xe;
  const hoSoGiaoXe: DeliveryDocStatus | null = rawDoc && typeof rawDoc === 'object' ? {
    da_thu_du: Boolean(rawDoc.da_thu_du),
    bbbg: Boolean(rawDoc.bbbg),
    dang_ky: Boolean(rawDoc.dang_ky),
    hop_dong_goc: Boolean(rawDoc.hop_dong_goc),
    bao_hiem: Boolean(rawDoc.bao_hiem),
    note: String(rawDoc.note || ''),
    ngay_cap_nhat: rawDoc.ngay_cap_nhat,
    nguoi_cap_nhat: rawDoc.nguoi_cap_nhat
  } : null;

  const invoiceDateStr = row.ngay_xuat_hoa_don ?? invoiceMap?.get(row.so_don_hang)?.ngay_xuat_hoa_don ?? null;
  const isInvoiceIssued = Boolean(invoiceDateStr);

  let docDebtDays: number | undefined = undefined;
  let docDebtLevel: 'clean' | 'normal' | 'warning' | 'danger' | undefined = undefined;

  // Yêu cầu:
  // 1. Đối với đơn hàng ghi nhận ngày xuất hóa đơn thì mới tính (phải có invoiceDateStr)
  // 2. Đối với các đơn hàng từ tháng 8 về trước bỏ phần này đi, tính từ tháng 9 thôi (>= 2026-09-01)
  if (isInvoiceIssued && isInvoiceFromSept2026(invoiceDateStr)) {
    if (hoSoGiaoXe?.da_thu_du) {
      docDebtLevel = 'clean';
      docDebtDays = 0;
    } else {
      const invTime = new Date(invoiceDateStr!).getTime();
      if (!isNaN(invTime)) {
        const now = new Date().getTime();
        docDebtDays = Math.max(0, Math.floor((now - invTime) / (1000 * 60 * 60 * 24)));
      } else {
        docDebtDays = 0;
      }

      if (docDebtDays >= 6) {
        docDebtLevel = 'danger';
      } else if (docDebtDays >= 3) {
        docDebtLevel = 'warning';
      } else {
        docDebtLevel = 'normal';
      }
    }
  }

  return {
    id: row.so_don_hang,
    customer: row.ten_khach_hang,
    phone: customer?.phone ?? 'Chưa có SĐT',
    area: customer?.area ?? 'Chưa có khu vực',
    line: row.dong_xe,
    version: row.phien_ban || row.dong_xe,
    exterior: row.ngoai_that || 'Chưa có màu',
    interior: row.noi_that || 'Chưa có nội thất',
    staff: row.ten_tu_van_ban_hang,
    status,
    vin: row.vin ?? '',
    createdAt: formatLocalDateTime(new Date(row.thoi_gian_nhap)),
    depositDate: row.ngay_coc ? new Intl.DateTimeFormat('vi-VN').format(new Date(row.ngay_coc)) : 'Chưa có',
    needDate: row.thoi_gian_can_xe ? new Intl.DateTimeFormat('vi-VN').format(new Date(row.thoi_gian_can_xe)) : 'Chưa có',
    needDateIso: row.thoi_gian_can_xe ?? null,
    pairedAt: row.thoi_gian_ghep ? formatLocalDateTime(new Date(row.thoi_gian_ghep)) : 'Chưa ghép',
    policy: row.chinh_sach ?? '',
    cancelNote: row.ghi_chu_huy ?? '',
    engineNo: row.so_may ?? '',
    depositAmount: row.so_tien_coc ?? row.so_tien_khach_da_dong ?? null,
    soTienKhachDaDong: row.so_tien_khach_da_dong ?? row.so_tien_coc ?? null,
    ngayKyHopDong: row.ngay_ky_hop_dong ?? null,
    invoiceAddress: row.dia_chi ?? null,
    invoiceDate: invoiceDateStr,
    ngayYeuCau: invoiceMap?.get(row.so_don_hang)?.ngay_yeu_cau ?? null,
    contractCode: row.so_hop_dong ?? null,
    paymentMethod: row.hinh_thuc_tt ?? null,
    linkHopDong: row.link_hop_dong ?? null,
    linkDeNghiXhd: row.link_de_nghi_xhd ?? null,
    linkHoaDonDaXuat: row.link_hoa_don_da_xuat ?? null,
    nguonKhach: row.nguon_khach ?? null,
    muaBaoHiem: row.mua_bao_hiem ?? null,
    dangKyXe: row.dang_ky_xe ?? null,
    xeXangVin: row.xe_xang_vin ?? null,
    xeXangHang: row.xe_xang_hang ?? null,
    xeXangModel: row.xe_xang_model ?? null,
    giaCongBo: row.gia_cong_bo ?? null,
    ghiChu: row.ghi_chu ?? null,
    maAmis: row.ma_amis ?? null,
    isWarning,
    warningMessage,
    pairedDays,
    hoSoGiaoXe,
    docDebtDays,
    docDebtLevel
  };
}

export function mapKhoxeRows(rows: KhoxeRow[]): InventoryItem[] {
  return rows.map((row) => ({
    vin: row.vin,
    line: row.dong_xe,
    version: row.phien_ban || row.dong_xe,
    exterior: row.ngoai_that || 'Chưa có màu',
    interior: row.noi_that || 'Chưa có nội thất',
    status: row.trang_thai as InventoryItem['status'],
    holder: row.nguoi_giu_xe ?? '',
    holderUsername: row.username_giu_xe ?? '',
    holdExpiry: row.thoi_gian_het_han_giu ?? '',
    location: row.vi_tri ?? '',
    engineNo: row.so_may ?? '',
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    is_extension_requested: row.is_extension_requested || false,
    extension_reason: row.extension_reason ?? null,
    extension_evidence_url: row.extension_evidence_url ?? null,
    extension_count: row.extension_count || 0,
    ma_dms: row.ma_dms ?? null
  }));
}

type VehicleLocationDbRow = {
  vin: string;
  vi_tri: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

export function mapVehicleLocationRows(rows: VehicleLocationDbRow[]): VehicleLocationRow[] {
  return rows
    .map((row) => ({
      vin: row.vin,
      location: row.vi_tri ?? '',
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
    .filter((row) => row.latitude !== null && row.longitude !== null);
}

function normalizeVin(value: string) {
  return value.trim().toUpperCase();
}

type VehicleMatchInput = {
  line: string;
  version: string;
  exterior: string;
  interior: string;
};

type VehicleMatchRow = {
  vin: string;
  dong_xe: string;
  phien_ban: string | null;
  ngoai_that: string | null;
  noi_that: string | null;
  trang_thai: string;
  nguoi_giu_xe: string | null;
  username_giu_xe: string | null;
  ngay_nhap: string | null;
};

function canUseVehicleForPairRow(
  item: VehicleMatchRow,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) {
  if (item.trang_thai === 'Đã ghép') {
    return false;
  }

  if (item.trang_thai === 'Chưa ghép') {
    return true;
  }

  return canOverrideHeldVehicle || item.username_giu_xe === currentUsername;
}

async function findBestMatchingVehicle(
  config: VehicleMatchInput,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { data, error } = await supabase
    .from('khoxe')
    .select('vin,dong_xe,phien_ban,ngoai_that,noi_that,trang_thai,nguoi_giu_xe,username_giu_xe,ngay_nhap')
    .eq('dong_xe', config.line)
    .eq('phien_ban', config.version)
    .eq('ngoai_that', config.exterior)
    .eq('noi_that', config.interior)
    .order('ngay_nhap', { ascending: true });

  if (error) {
    return { data: null, error };
  }

  const match = (data || []).find((item: VehicleMatchRow) => canUseVehicleForPairRow(item, currentUsername, canOverrideHeldVehicle));
  return { data: match ? { vin: match.vin } : null, error: null };
}

// --- Authentication & Profiles ---
export const getProfile = async (userId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
};

export const getProfiles = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('get_staff_directory');
};

const invokeStaffFunction = async (body: Record<string, unknown>) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!accessToken) {
    throw new Error('Phiên đăng nhập không hợp lệ.');
  }

  if (!supabaseUrl) {
    throw new Error('Thiếu cấu hình Supabase URL.');
  }

  if (!supabasePublishableKey) {
    throw new Error('Thiếu cấu hình Supabase key.');
  }

  const functionBaseUrl = new URL(supabaseUrl);
  functionBaseUrl.hostname = functionBaseUrl.hostname.replace('.supabase.co', '.functions.supabase.co');
  functionBaseUrl.pathname = '/manage-staff';
  functionBaseUrl.search = '';
  functionBaseUrl.hash = '';
  const functionUrl = functionBaseUrl.toString();
  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabasePublishableKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const rawBody = await response.text();
  let parsedBody: any = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const message =
      typeof parsedBody === 'object' && parsedBody?.error
        ? parsedBody.error
        : typeof parsedBody === 'string' && parsedBody.trim()
          ? parsedBody.trim()
          : `Edge Function returned ${response.status}`;
    throw new Error(message);
  }

  return { data: parsedBody, error: null };
};

export const inviteStaffMember = async (input: { email: string; fullName: string; role: 'sales' | 'manager'; department?: string | null; managerId?: string | null }) => {
  const result = await invokeStaffFunction({
    action: 'invite',
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    department: input.department ?? null,
    managerId: input.managerId ?? null
  });
  if (!result.error) {
    await logSystemActivity('system_action', null, `Đã mời nhân sự: ${input.fullName} (${input.email})`);
  }
  return result;
};

export const resendStaffInvite = async (input: { email: string; fullName: string; role: 'sales' | 'manager'; department?: string | null; managerId?: string | null; staffId?: string }) => {
  const result = await invokeStaffFunction({
    action: 'resend',
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    department: input.department ?? null,
    managerId: input.managerId ?? null
  });
  if (!result.error) {
    await logSystemActivity('system_action', null, `Đã gửi lại lời mời cho: ${input.fullName}`);
  }
  return result;
};

export const cancelStaffInvite = async (input: { email: string; fullName: string; role: 'sales' | 'manager'; department?: string | null; managerId?: string | null; staffId?: string }) => {
  const result = await invokeStaffFunction({
    action: 'cancel',
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    department: input.department ?? null,
    managerId: input.managerId ?? null,
    staffId: input.staffId
  });
  if (!result.error) {
    await logSystemActivity('system_action', null, `Đã hủy lời mời/xóa nhân sự: ${input.fullName}`);
  }
  return result;
};

export const updateStaffPermission = async (input: {
  staffId: string;
  email?: string | null;
  fullName: string;
  role: 'sales' | 'manager';
  department?: string | null;
  managerId?: string | null;
}) => {
  const result = await invokeStaffFunction({
    action: 'update',
    staffId: input.staffId,
    email: input.email ?? null,
    fullName: input.fullName,
    role: input.role,
    department: input.department ?? null,
    managerId: input.managerId ?? null
  });
  if (!result.error) {
    await logSystemActivity('system_action', null, `Cập nhật phân quyền nhân sự: ${input.fullName}`);
  }
  return result;
};

// --- Queries ---
export const getCustomers = async (): Promise<{ data: CustomerRow[], error: any }> => {
  return { data: [], error: null };
};

export const getOrders = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('donhang')
    .select('*')
    .order('thoi_gian_nhap', { ascending: false })
    .limit(200);
};

export const getInventory = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const cacheBuster = `cb-${Date.now()}-${Math.random()}`;

  const khoxeResult = await supabase
    .from('khoxe')
    .select('*')
    .neq('vin', cacheBuster) // Bypass browser cache
    .order('ngay_nhap', { ascending: false });

  if (khoxeResult.error) {
    return khoxeResult;
  }

  return { data: (khoxeResult.data || []) as KhoxeRow[], error: null };
};

export const getVehicleLocations = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('vehicle_locations')
    .select('*')
    .order('updated_at', { ascending: false });
};

export const expireHoldVehicles = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('expire_khoxe_holds');
};

export const getCarHoldActivities = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('car_hold_activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
};

// --- Actions & Mutations ---
export const createCustomer = async (customer: CustomerRow) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.from('customers').upsert(customer, { onConflict: 'phone' });
  if (!result.error) {
    await logSystemActivity('system_action', null, `Cập nhật khách hàng: ${customer.full_name}`);
  }
  return result;
};

export const createOrder = async (order: any) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.from('donhang').insert(order).select('*');
  if (!result.error) {
    await notifyAdminAction(`vừa tạo đơn hàng mới cho khách ${order.ten_khach_hang || ''}.`);
    await logSystemActivity('create_order', order.so_don_hang, `Khách hàng: ${order.ten_khach_hang || ''}`);
    triggerAutoSyncCurrentOrders();
  }
  return result;
};

export const cancelOrder = async (
  orderId: string,
  notes: string,
  unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)',
  needDate?: string
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: order, error: fetchError } = await supabase
    .from('donhang')
    .select('*')
    .eq('so_don_hang', orderId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const result = await supabase.rpc('cancel_order_donhang', {
    p_order_id: orderId,
    p_note: notes,
    p_unmatch_type: unmatchType,
    p_thoi_gian_can_xe: needDate || null,
    p_order_updated_at: order?.updated_at ?? null
  });

  if (!result.error) {
    await notifyAdminAction(`vừa hủy đơn hàng (Mã DMS: ${orderId}).`);
    const { data: updatedRecord } = await supabase.from('donhang').select('*').eq('so_don_hang', orderId).single();
    supabase.functions.invoke('send-email', {
      body: { 
        actionId: 'order_self_cancelled', 
        record: { 
          ...(order || {}),
          so_don_hang: orderId,
          ghi_chu_admin: notes
        }
      }
    }).catch(e => console.warn('Lỗi gọi gửi email hủy đơn:', e));

    // Notify Admin
    const { error: notifyErr } = await supabase.from('admin_notifications').insert({
      type: 'order_canceled',
      message: `Đơn hàng ${orderId} vừa bị hủy. Lý do: ${notes}`,
      link: orderId
    });
    if (notifyErr) console.warn('Lỗi tạo thông báo hủy đơn:', notifyErr);
    triggerAutoSyncCurrentOrders();
  }

  return result;
};

export const getSalesPolicies = async (): Promise<{ data: SalesPolicyRow[]; error: any }> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { data, error } = await supabase
    .from('chinhsach')
    .select('ten_chinh_sach, dong_xe')
    .eq('trang_thai', 'Hoạt động')
    .order('ten_chinh_sach', { ascending: true });

  if (error) {
    return {
      data: defaultSalesPolicies.map((name) => ({ ten_chinh_sach: name, dong_xe: 'Tất cả' })),
      error
    };
  }

  return { data: (data || []) as SalesPolicyRow[], error: null };
};

export const getAllSalesPolicies = async (): Promise<{ data: SalesPolicyRow[]; error: any }> => {
  if (!supabase) return { data: [], error: new Error('Supabase chưa được cấu hình') };

  const { data, error } = await supabase
    .from('chinhsach')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { data: [], error };
  }

  const policies = (data || []) as SalesPolicyRow[];
  const now = new Date();

  const parseDate = (str: string) => {
    const lower = str.toLowerCase();
    if (lower.includes('thông báo mới') || lower.includes('không quy định')) {
      return null;
    }
    const matches = [...str.matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)];
    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      return new Date(parseInt(lastMatch[3]), parseInt(lastMatch[2]) - 1, parseInt(lastMatch[1]), 23, 59, 59);
    }
    return null;
  };

  const expiredIds: string[] = [];

  for (const p of policies) {
    if (p.trang_thai === 'Hoạt động' && p.han_su_dung) {
      const expiryDate = parseDate(p.han_su_dung);
      if (expiryDate && expiryDate < now) {
        if (p.id) {
          expiredIds.push(p.id);
        } else {
          // If no ID, we try to update by name
          updateSalesPolicy('', { trang_thai: 'Ngừng hoạt động' }, p.ten_chinh_sach).catch(console.error);
        }
        p.trang_thai = 'Ngừng hoạt động';
      }
    }
  }

  if (expiredIds.length > 0) {
    Promise.all(expiredIds.map(id => updateSalesPolicy(id, { trang_thai: 'Ngừng hoạt động' }))).catch(console.error);
  }

  return { data: policies, error: null };
};

export const createSalesPolicy = async (payload: Omit<SalesPolicyRow, 'id' | 'created_at'>): Promise<{ error: any }> => {
  if (!supabase) return { error: new Error('Supabase chưa được cấu hình') };

  const { error } = await supabase
    .from('chinhsach')
    .insert([{
      ...payload,
      created_at: new Date().toISOString()
    }]);

  if (!error) {
    await logSystemActivity('update_config', null, `Đã tạo chính sách: ${payload.ten_chinh_sach}`);
  }

  return { error };
};

export const updateSalesPolicy = async (id: string, payload: Partial<Omit<SalesPolicyRow, 'id' | 'created_at'>>, oldName?: string): Promise<{ error: any }> => {
  if (!supabase) return { error: new Error('Supabase chưa được cấu hình') };

  let query = supabase.from('chinhsach').update(payload);
  if (id) {
    query = query.eq('id', id);
  } else if (oldName) {
    query = query.eq('ten_chinh_sach', oldName);
  } else {
    return { error: new Error('Thiếu thông tin để cập nhật (không có ID và tên cũ)') };
  }

  const { error } = await query;
  if (!error) {
    await logSystemActivity('update_config', null, `Đã cập nhật chính sách: ${payload.ten_chinh_sach || oldName || id}`);
  }
  return { error };
};

export const deleteSalesPolicy = async (id: string, oldName?: string): Promise<{ error: any }> => {
  if (!supabase) return { error: new Error('Supabase chưa được cấu hình') };

  let query = supabase.from('chinhsach').delete();
  if (id) {
    query = query.eq('id', id);
  } else if (oldName) {
    query = query.eq('ten_chinh_sach', oldName);
  } else {
    return { error: new Error('Thiếu thông tin để xóa') };
  }

  const { error } = await query;
  if (!error) {
    await logSystemActivity('update_config', null, `Đã xóa chính sách: ${oldName || id}`);
  }
  return { error };
};

export const updateOrderPolicy = async (orderId: string, policy: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { error: orderError } = await supabase
    .from('donhang')
    .update({
      chinh_sach: policy,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', orderId);

  if (orderError) return { data: null, error: orderError };

  // Đồng bộ sang yeucauxhd nếu có
  await supabase
    .from('yeucauxhd')
    .update({ chinh_sach: policy, updated_at: new Date().toISOString() })
    .eq('so_don_hang', orderId);

  await logSystemActivity('update_order', orderId, `Cập nhật chính sách đơn hàng thành: ${policy}`);
  triggerAutoSyncCurrentOrders();

  return { data: { status: 'SUCCESS' }, error: null };
};

export const findAutoPairVehicle = async (
  config: VehicleMatchInput,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) => {
  return await findBestMatchingVehicle(config, currentUsername, canOverrideHeldVehicle);
};

export const updateOrderDetails = async (
  input: UpdateOrderInput,
  currentUsername: string,
  canOverrideHeldVehicle: boolean
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');

  const { data: currentOrder, error: orderFetchError } = await supabase
    .from('donhang')
    .select('*')
    .eq('so_don_hang', input.orderId)
    .single();
  if (orderFetchError) {
    return { data: null, error: orderFetchError };
  }

  const criticalChanged =
    (currentOrder.dong_xe || '') !== input.line ||
    (currentOrder.phien_ban || '') !== input.version ||
    (currentOrder.ngoai_that || '') !== input.exterior ||
    (currentOrder.noi_that || '') !== input.interior;

  // Nếu đổi cấu hình mà đang có VIN thì nhả xe cũ trước
  if (criticalChanged && currentOrder.vin) {
    await supabase
      .from('khoxe')
      .update({
        trang_thai: 'Chưa ghép',
        nguoi_giu_xe: null,
        username_giu_xe: null,
        thoi_gian_het_han_giu: null,
        hold_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('vin', currentOrder.vin);
  }

  const updateData: Record<string, any> = {
    ten_khach_hang: input.customer,
    ten_tu_van_ban_hang: input.staff,
    dong_xe: input.line,
    phien_ban: input.version,
    ngoai_that: input.exterior,
    noi_that: input.interior,
    ngay_coc: input.depositDate || null,
    thoi_gian_can_xe: input.needDate || null,
    updated_at: new Date().toISOString(),
    so_tien_coc: input.depositAmount || null,
    so_tien_khach_da_dong: input.soTienKhachDaDong ?? input.depositAmount ?? null,
    ngay_ky_hop_dong: input.ngayKyHopDong || null,
    chinh_sach: input.policy?.join('; ') || null,
    dia_chi_xhd: input.invoiceAddress || null,
    dia_chi: input.invoiceAddress || null,
    ma_hop_dong: input.contractCode || null,
    so_hop_dong: input.contractCode || null,
    tm_vay: input.paymentMethod || null,
    hinh_thuc_tt: input.paymentMethod || null,
    nguon_khach: input.nguonKhach?.trim() || null,
    mua_bao_hiem: input.muaBaoHiem ?? null,
    dang_ky_xe: input.dangKyXe ?? null,
    xe_xang_vin: input.xeXangVin?.trim() || null,
    xe_xang_hang: input.xeXangHang?.trim() || null,
    xe_xang_model: input.xeXangModel?.trim() || null,
    gia_cong_bo: input.giaCongBo ?? null,
    ghi_chu: input.ghiChu?.trim() || null,
    ma_amis: input.maAmis?.trim() || null
  };

  if (input.status) {
    updateData.ket_qua = input.status;
    if (['Đã phê duyệt', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].includes(input.status)) {
      updateData.ngay_xuat_hoa_don = currentOrder.ngay_xuat_hoa_don || new Date().toISOString().split('T')[0];
    }
  }

  if (input.newOrderId && input.newOrderId !== input.orderId) {
    updateData.so_don_hang = input.newOrderId.trim();
  }

  if (criticalChanged) {
    updateData.ket_qua = 'Chưa ghép';
    updateData.vin = null;
    updateData.so_may = null;
    updateData.thoi_gian_ghep = null;
  }

  const { error: updateError } = await supabase
    .from('donhang')
    .update(updateData)
    .eq('so_don_hang', input.orderId);
  if (updateError) {
    return { data: null, error: updateError };
  }

  // Đồng bộ thông tin cơ bản cho yeucauxhd (nếu có)
  await supabase
    .from('yeucauxhd')
    .update({
      ten_khach_hang: input.customer,
      so_tien_khach_da_dong: input.soTienKhachDaDong ?? input.depositAmount ?? null,
      ngay_ky_hop_dong: input.ngayKyHopDong || null,
      dia_chi: input.invoiceAddress || null,
      so_hop_dong: input.contractCode || null,
      hinh_thuc_tt: input.paymentMethod || null,
      nguon_khach: input.nguonKhach?.trim() || null,
      mua_bao_hiem: input.muaBaoHiem ?? null,
      dang_ky_xe: input.dangKyXe ?? null,
      xe_xang_vin: input.xeXangVin?.trim() || null,
      xe_xang_hang: input.xeXangHang?.trim() || null,
      xe_xang_model: input.xeXangModel?.trim() || null,
      gia_cong_bo: input.giaCongBo ?? null,
      ghi_chu: input.ghiChu?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', input.newOrderId ? input.newOrderId.trim() : input.orderId);

  // Tự ghép lại theo FIFO nếu đổi cấu hình
  let autoMatchedVin = '';
  if (criticalChanged) {
    const { data: candidateCar } = await findBestMatchingVehicle(
      {
        line: input.line,
        version: input.version,
        exterior: input.exterior,
        interior: input.interior
      },
      currentUsername,
      canOverrideHeldVehicle
    );

    if (candidateCar?.vin) {
      autoMatchedVin = candidateCar.vin;

      await supabase
        .from('donhang')
        .update({
          ket_qua: 'Đã ghép',
          vin: autoMatchedVin,
          thoi_gian_ghep: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('so_don_hang', input.orderId);

      await supabase
        .from('khoxe')
        .update({
          trang_thai: 'Đã ghép',
          nguoi_giu_xe: input.staff,
          thoi_gian_het_han_giu: 'Vô thời hạn',
          updated_at: new Date().toISOString()
        })
        .eq('vin', autoMatchedVin);

      await supabase
        .from('car_hold_activities')
        .delete()
        .eq('vin', autoMatchedVin)
        .eq('type', 'QUEUE');

      // CHỦ ĐỘNG GỌI ROBOT THÔNG BÁO GÁN VIN TỰ ĐỘNG
      const { data: fullOrder } = await supabase.from('donhang').select('*').eq('so_don_hang', input.orderId).single();
      supabase.functions.invoke('send-email', {
        body: { 
          actionId: 'match_success', 
          record: fullOrder || { so_don_hang: input.orderId, vin: autoMatchedVin, ...updateData } 
        }
      }).catch(e => console.warn('Lỗi gọi gửi email ghép xe tự động:', e));
    }
  }

  await logSystemActivity('update_order', input.orderId, `Cập nhật thông tin cho khách hàng: ${input.customer}`);
  triggerAutoSyncCurrentOrders();

  return {
    data: {
      status: 'SUCCESS',
      autoMatched: !!autoMatchedVin,
      vin: autoMatchedVin
    },
    error: null
  };
};

export const updateInvoiceInfo = async (
  orderId: string,
  invoiceLink: string,
  contractLink: string,
  policy: string
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase
    .from('donhang')
    .update({
      ket_qua: 'Đã xuất hóa đơn',
      link_hoa_don_da_xuat: invoiceLink,
      link_hop_dong: contractLink,
      chinh_sach: policy,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', orderId);

  if (!result.error) {
    triggerAutoSyncCurrentOrders();
    await logSystemActivity('update_order', orderId, 'Cập nhật TT xuất hóa đơn');
  }
  return result;
};

// --- Safe Inventory / Pairing Actions (Optimistic Transaction RPCs) ---
export const holdVehicle = async (vin: string, username: string, fullName: string): Promise<{ data: any, error: any }> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

  const url = supabaseUrl.replace('.supabase.co', '.functions.supabase.co') + '/hold-car';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken || supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({ p_vin: vin.trim(), p_username: username, p_full_name: fullName })
  });
  const data = await res.json();
  
  try {
    await supabase.from('activity_logs').insert({
      vin: vin.trim(),
      action_type: 'hold',
      performed_by: username,
      performed_by_name: fullName,
      details: 'Giữ xe trên hệ thống'
    });
  } catch (e) {
    console.warn('Lỗi ghi log giữ xe:', e);
  }

  // Notify Admin
  await notifyAdminAction(`vừa thao tác Giữ xe cho VIN ${vin}.`);

  return { data, error: null };
};

export const releaseVehicle = async (vin: string, outcome: 'released' | 'expired' | 'matched' = 'released') => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.rpc('rpc_release_car', {
    p_vin: vin.trim(),
    p_outcome: outcome
  });
  if (!result.error && outcome !== 'matched') {
    await notifyAdminAction(`vừa nhả (bỏ giữ) xe số VIN ${vin}.`);
  }
  return result;
};

export const joinHoldQueue = async (vin: string, username: string, fullName: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.rpc('rpc_join_hold_queue', {
    p_vin: vin.trim(),
    p_username: username,
    p_full_name: fullName
  });
  if (!result.error) {
    await notifyAdminAction(`vừa đăng ký xếp hàng chờ giữ xe số VIN ${vin}.`);
  }
  return result;
};

export const leaveHoldQueue = async (vin: string, username: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('rpc_leave_hold_queue', {
    p_vin: vin.trim(),
    p_username: username
  });
};

export const getMyQueuedVins = async (username: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data, error } = await supabase.rpc('rpc_get_my_queued_vins', {
    p_username: username
  });
  if (error) {
    return { data: [], error };
  }

  const vins = (data || []).map((row: any) => String(row.vin || '').trim()).filter(Boolean);
  return { data: vins, error: null };
};

export const pairVehicle = async (orderId: string, vin: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const [{ data: order, error: orderError }, { data: vehicle, error: vehicleError }] = await Promise.all([
    supabase.from('donhang').select('updated_at').eq('so_don_hang', orderId).single(),
    supabase.from('khoxe').select('updated_at').eq('vin', vin.trim()).single()
  ]);

  if (orderError) {
    return { data: null, error: orderError };
  }
  if (vehicleError) {
    return { data: null, error: vehicleError };
  }

  const result = await supabase.rpc('pair_donhang_with_khoxe_safe', {
    p_order_id: orderId,
    p_vin: vin.trim(),
    p_order_updated_at: order?.updated_at ?? null,
    p_vehicle_updated_at: vehicle?.updated_at ?? null
  });

  if (!result.error) {
    await notifyAdminAction(`vừa ghép xe số VIN ${vin} vào đơn hàng ${orderId}.`);
    triggerAutoSyncCurrentOrders();
    const { data: fullOrder } = await supabase.from('donhang').select('*').eq('so_don_hang', orderId).single();
    supabase.functions.invoke('send-email', {
      body: { 
        actionId: 'match_success', 
        record: fullOrder || { so_don_hang: orderId, vin: vin.trim() } 
      }
    }).catch(e => console.warn('Lỗi gọi gửi email ghép xe thủ công:', e));
  }

  return result;
};

export const unpairVehicle = async (orderId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data: order, error: fetchError } = await supabase
    .from('donhang')
    .select('updated_at')
    .eq('so_don_hang', orderId)
    .single();

  if (fetchError) {
    return { data: null, error: fetchError };
  }

  const result = await supabase.rpc('unpair_donhang_with_khoxe_safe', {
    p_order_id: orderId,
    p_order_updated_at: order?.updated_at ?? null
  });

  if (!result.error) {
    await notifyAdminAction(`vừa hủy ghép xe khỏi đơn hàng ${orderId}.`);
    triggerAutoSyncCurrentOrders();
  }
  return result;
};

export const deleteOrder = async (orderId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  
  const { data: order } = await supabase
    .from('donhang')
    .select('vin')
    .eq('so_don_hang', orderId)
    .single();

  if (order?.vin) {
    await unpairVehicle(orderId);
  }

  // Delete related records in car_hold_activities and yeucauxhd to satisfy foreign keys
  await supabase.from('car_hold_activities').delete().eq('so_don_hang', orderId);
  await supabase.from('yeucauxhd').delete().eq('so_don_hang', orderId);

  const result = await supabase
    .from('donhang')
    .delete()
    .eq('so_don_hang', orderId);

  if (!result.error) {
    await notifyAdminAction(`vừa xóa vĩnh viễn đơn hàng ${orderId}.`);
    triggerAutoSyncCurrentOrders();
  }
  return result;
};

export const addNewVehicle = async (vehicle: KhoxeRow) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.from('khoxe').insert(vehicle);
  if (!result.error) {
    await logSystemActivity('system_action', null, `Đã thêm mới xe VIN: ${vehicle.vin}`);
  }
  return result;
};

export const checkExistingVins = async (vins: string[]): Promise<{ data: { vin: string }[] | null; error: any }> => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  if (!vins.length) return { data: [], error: null };

  const { data, error } = await supabase
    .from('khoxe')
    .select('vin')
    .in('vin', vins);

  return { data: data ?? null, error };
};

export const bulkUpsertVehicles = async (
  vehicles: Array<{
    vin: string;
    dong_xe?: string;
    phien_ban?: string;
    ngoai_that?: string;
    noi_that?: string;
    vi_tri?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    ngay_nhap?: string | null;
    ma_dms?: string | null;
  }>
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const syncedAt = new Date().toISOString();

  const rows = vehicles.map((item) => ({
    vin: normalizeVin(item.vin),
    dong_xe: item.dong_xe?.trim() || 'Chưa xác định',
    phien_ban: item.phien_ban?.trim() || '',
    ngoai_that: item.ngoai_that?.trim() || '',
    noi_that: item.noi_that?.trim() || '',
    vi_tri: item.vi_tri?.trim() || null,
    latitude: item.latitude ?? null,
    longitude: item.longitude ?? null,
    ngay_nhap: item.ngay_nhap || null,
    ma_dms: item.ma_dms?.trim() || null,
    trang_thai: 'Chưa ghép',
    updated_at: syncedAt
  }));

  const vehicleResult = await supabase
    .from('khoxe')
    .upsert(rows, { onConflict: 'vin' })
    .select('vin');

  if (vehicleResult.error) {
    return vehicleResult;
  }

  const locationRows = rows
    .filter((item) => item.vi_tri || item.latitude !== null || item.longitude !== null)
    .map((item) => ({
      vin: item.vin,
      vi_tri: item.vi_tri,
      latitude: item.latitude,
      longitude: item.longitude,
      updated_at: syncedAt
    }));

  if (locationRows.length > 0) {
    const locationResult = await supabase
      .from('vehicle_locations')
      .upsert(locationRows, { onConflict: 'vin' })
      .select('vin');

    if (locationResult.error) {
      return locationResult;
    }
  }

  return vehicleResult;
};

export const updateVehicleLocation = async (
  vin: string,
  location: {
    vi_tri: string;
    latitude: number | null;
    longitude: number | null;
  }
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const syncedAt = new Date().toISOString();

  const vehicleResult = await supabase
    .from('khoxe')
    .update({
      vi_tri: location.vi_tri.trim() || null,
      latitude: location.latitude,
      longitude: location.longitude,
      updated_at: syncedAt
    })
    .eq('vin', vin.trim().toUpperCase())
    .select('vin')
    .maybeSingle();

  if (vehicleResult.error) {
    return vehicleResult;
  }

  const locationResult = await supabase
    .from('vehicle_locations')
    .upsert(
      [
        {
          vin: vin.trim().toUpperCase(),
          vi_tri: location.vi_tri.trim() || null,
          latitude: location.latitude,
          longitude: location.longitude,
          updated_at: syncedAt
        }
      ],
      { onConflict: 'vin' }
    )
    .select('vin')
    .maybeSingle();

  return locationResult.error ? locationResult : vehicleResult;
};

// --- 2-Stage Invoicing ---
type RequestInvoiceInput = {
  order: Order;
  hsXhdFile: File;
  cdxFile: File | null;
  transactionImages: File[];
  policy: string;
  soTienKhachDaDong?: number | null;
  diaChi?: string;
  aiNote?: string;
  xeXangVin?: string;
  xeXangHang?: string;
  xeXangModel?: string;
  nguonKhach?: string;
  ngayKyHopDong?: string;
  soHopDong?: string;
  hinhThucTT?: string;
  muaBaoHiem?: boolean;
  dangKyXe?: boolean;
  giaCongBo?: string | number | null;
  ghiChu?: string;
  requesterName: string;
  requesterUsername: string;
};

function serviceError(message: string) {
  return { data: null, error: { message } };
}

function safeStorageName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return normalized.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function maybeDate(value?: string | null) {
  if (!value || value === 'Chưa có') return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
}

function maybeNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/\./g, '').replace(/,/g, '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function uploadInvoiceFile(orderId: string, kind: string, file: File) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const randomStr = Math.random().toString(36).substring(2, 8);
  const path = `yeucauxhd/${orderId}/${kind}_${Date.now()}_${randomStr}_${safeStorageName(file.name)}`;
  const { error } = await supabase.storage
    .from('yeucauxhd-files')
    .upload(path, file, { upsert: false });

  if (error) return { url: '', error };

  const { data } = supabase.storage.from('yeucauxhd-files').getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function getOrderRow(orderId: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('donhang')
    .select('*')
    .eq('so_don_hang', orderId)
    .single();
}

async function getVehicleMetadata(vin: string) {
  if (!supabase || !vin) return { so_may: null };
  const { data } = await supabase
    .from('khoxe')
    .select('so_may')
    .eq('vin', vin)
    .maybeSingle();
  if (data?.so_may) {
    return {
      so_may: data?.so_may ?? null
    };
  }

  return { so_may: null };
}

export const getYeucauxhd = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase
    .from('yeucauxhd')
    .select('*')
    .order('ngay_yeu_cau', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
};

export const requestInvoiceDonhang = async (input: RequestInvoiceInput) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return serviceError('Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng tải lại trang (F5) và đăng nhập lại.');
  }

  const orderId = input.order.id;
  const { data: orderRow, error: fetchError } = await getOrderRow(orderId);

  if (fetchError) {
    // Check for 400 No API key found which usually means session expired + invalid anon key
    if (fetchError.message?.includes('No API key') || fetchError.code === '400') {
      return serviceError('Lỗi xác thực: Không tìm thấy API key. Vui lòng tải lại trang và đăng nhập lại.');
    }
    return { data: null, error: fetchError };
  }

  if (!orderRow?.vin && !input.order.vin) {
    return serviceError('Đơn hàng chưa có VIN, không thể yêu cầu xuất hóa đơn.');
  }

  const existingRequest = await supabase
    .from('yeucauxhd')
    .select('id, status')
    .eq('so_don_hang', orderId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingRequest.error) {
    if (existingRequest.error.message?.includes('No API key') || existingRequest.error.code === '400') {
      return serviceError('Lỗi xác thực: Không tìm thấy API key hoặc phiên đăng nhập bị lỗi. Vui lòng F5 và đăng nhập lại.');
    }
    return { data: null, error: existingRequest.error };
  }

  if (existingRequest.data) {
    return serviceError('Đơn hàng này đang có yêu cầu xuất hóa đơn chờ duyệt.');
  }

  const requestedGasVin = input.xeXangVin?.trim() || '';
  if (requestedGasVin) {
    const { data: duplicateGasVin, error: duplicateError } = await supabase
      .from('yeucauxhd')
      .select('so_don_hang')
      .eq('xe_xang_vin', requestedGasVin)
      .limit(1);

    if (duplicateError) return { data: null, error: duplicateError };
    if (duplicateGasVin && duplicateGasVin.length > 0) {
      return serviceError(`VIN xe xăng ${requestedGasVin} đã được khai báo ở đơn ${duplicateGasVin[0].so_don_hang}.`);
    }
  }

  const uploadPromises = [
    uploadInvoiceFile(orderId, 'hop_dong', input.hsXhdFile),
    input.cdxFile ? uploadInvoiceFile(orderId, 'de_nghi_xhd', input.cdxFile) : Promise.resolve({ url: null, error: null }),
    ...input.transactionImages.map(img => uploadInvoiceFile(orderId, 'anh_giao_dich', img))
  ];

  const uploadResults = await Promise.all(uploadPromises);

  const hsXhdUpload = uploadResults[0];
  const cdxUpload = uploadResults[1];
  const transImgUploads = uploadResults.slice(2);

  if (hsXhdUpload.error) return { data: null, error: hsXhdUpload.error };
  if (cdxUpload.error) return { data: null, error: cdxUpload.error };
  const firstImgError = transImgUploads.find(u => u.error);
  if (firstImgError) return { data: null, error: firstImgError.error };

  const transImgUrls = transImgUploads.map(u => u.url).filter(Boolean).join(',');

  const vin = orderRow.vin || input.order.vin;
  const vehicleMeta = await getVehicleMetadata(vin);
  const { data: userData } = await supabase.auth.getUser();
  const requestedBy = userData.user?.id ?? null;
  const invoiceAddress = input.diaChi?.trim() || orderRow.dia_chi_xhd || input.order.invoiceAddress || null;
  const contractCode = orderRow.ma_hop_dong || input.order.contractCode || null;
  const paymentMethod = orderRow.tm_vay || input.order.paymentMethod || null;
  const ngayKyHopDong = maybeDate(input.ngayKyHopDong) || maybeDate(input.order.needDateIso) || maybeDate(input.order.depositDate);
  const soTienKhachDaDong = maybeNumber(input.soTienKhachDaDong) ?? orderRow.so_tien_khach_da_dong ?? input.order.soTienKhachDaDong ?? input.order.depositAmount ?? null;
  const diaChi = invoiceAddress || orderRow.dia_chi || null;
  const soHopDong = input.soHopDong?.trim() || orderRow.so_hop_dong || contractCode || null;
  const hinhThucTT = input.hinhThucTT?.trim() || orderRow.hinh_thuc_tt || paymentMethod || null;
  const nguonKhach = input.nguonKhach?.trim() || orderRow.nguon_khach || input.order.nguonKhach || null;
  const muaBaoHiem = input.muaBaoHiem ?? orderRow.mua_bao_hiem ?? input.order.muaBaoHiem ?? null;
  const dangKyXe = input.dangKyXe ?? orderRow.dang_ky_xe ?? input.order.dangKyXe ?? null;
  const xeXangVin = input.xeXangVin?.trim() || orderRow.xe_xang_vin || input.order.xeXangVin || null;
  const xeXangHang = input.xeXangHang?.trim() || orderRow.xe_xang_hang || input.order.xeXangHang || null;
  const xeXangModel = input.xeXangModel?.trim() || orderRow.xe_xang_model || input.order.xeXangModel || null;
  const giaCongBo = maybeNumber(input.giaCongBo) ?? orderRow.gia_cong_bo ?? input.order.giaCongBo ?? null;
  const ghiChu = input.ghiChu?.trim() || orderRow.ghi_chu || input.order.ghiChu || input.aiNote?.trim() || null;

  const invoiceRow = {
    so_don_hang: orderId,
    ten_khach_hang: orderRow.ten_khach_hang || input.order.customer,
    vin,
    tvbh: orderRow.ten_tu_van_ban_hang || input.order.staff || null,
    dong_xe: orderRow.dong_xe || input.order.line || null,
    phien_ban: orderRow.phien_ban || input.order.version || null,
    ngoai_that: orderRow.ngoai_that || input.order.exterior || null,
    noi_that: orderRow.noi_that || input.order.interior || null,
    ngay_coc: orderRow.ngay_coc || input.order.depositDate || null,
    so_may: vehicleMeta.so_may || orderRow.so_may || input.order.engineNo || null,
    requested_by_name: input.requesterName,
    requested_by_username: input.requesterUsername,
    url_hop_dong: hsXhdUpload.url,
    url_de_nghi_xhd: cdxUpload.url || null,
    ghi_chu_ai: transImgUrls || null,
    link_hoa_don_da_xuat: null,
    chinh_sach: input.policy || orderRow.chinh_sach || input.order.policy,
    so_tien_khach_da_dong: soTienKhachDaDong,
    dia_chi: diaChi,
    so_hop_dong: soHopDong,
    ngay_ky_hop_dong: ngayKyHopDong,
    hinh_thuc_tt: hinhThucTT,
    nguon_khach: nguonKhach,
    ma_vso: input.order.id || null,
    mua_bao_hiem: muaBaoHiem,
    dang_ky_xe: dangKyXe,
    xe_xang_vin: xeXangVin,
    xe_xang_hang: xeXangHang,
    xe_xang_model: xeXangModel,
    ma_amis: input.order.maAmis?.trim() || null,
    gia_cong_bo: giaCongBo,
    ghi_chu: ghiChu,
    coc: soTienKhachDaDong !== null || Boolean(orderRow.ngay_coc || input.order.depositDate),
    status: 'pending',
    ngay_yeu_cau: new Date().toISOString(),
    note: 'Chờ phê duyệt xuất hóa đơn'
  };

  const { error: insertError } = await supabase.from('yeucauxhd').insert(invoiceRow);
  if (insertError) return { data: null, error: insertError };

  // Notify Admin
  await supabase.from('admin_notifications').insert({
    type: 'invoice_request',
    message: `TVBH ${input.requesterName || 'Ai đó'} vừa gửi yêu cầu xuất hóa đơn cho đơn hàng ${orderId}.`,
    link: orderId
  });

  const { error: orderUpdateError } = await supabase
    .from('donhang')
    .update({
      ket_qua: 'Chờ phê duyệt',
      chinh_sach: input.policy,
      dia_chi_xhd: invoiceAddress,
      dia_chi: diaChi,
      link_hoa_don_da_xuat: null,
      so_may: invoiceRow.so_may,
      so_tien_coc: input.order.depositAmount ?? orderRow.so_tien_coc ?? null,
      so_tien_khach_da_dong: soTienKhachDaDong,
      so_hop_dong: soHopDong,
      ngay_ky_hop_dong: ngayKyHopDong,
      hinh_thuc_tt: hinhThucTT,
      nguon_khach: nguonKhach,
      mua_bao_hiem: muaBaoHiem,
      dang_ky_xe: dangKyXe,
      xe_xang_vin: xeXangVin,
      xe_xang_hang: xeXangHang,
      xe_xang_model: xeXangModel,
      ma_amis: input.order.maAmis?.trim() || null,
      gia_cong_bo: giaCongBo,
      ghi_chu: ghiChu,
      updated_at: new Date().toISOString()
    })
    .eq('so_don_hang', orderId);

  if (orderUpdateError) return { data: null, error: orderUpdateError };

  if (vin) {
    await supabase.from('khoxe').delete().eq('vin', vin);
  }

  await supabase.from('car_hold_activities').insert({
    action: 'request_invoice',
    so_don_hang: orderId,
    vin,
    actor_name: input.requesterName,
    actor_username: input.requesterUsername,
    detail: `Gửi hồ sơ xuất hóa đơn: ${input.policy}`
  });

  supabase.functions.invoke('send-email', {
    body: {
      actionId: 'invoice_request_submitted',
      record: {
        ...invoiceRow,
        so_don_hang: orderId,
        ten_ban_hang: invoiceRow.tvbh || input.requesterName,
        url_hop_dong: invoiceRow.url_hop_dong,
        url_de_nghi_xhd: invoiceRow.url_de_nghi_xhd
      }
    }
  }).catch(e => console.warn('Lỗi gọi gửi email yêu cầu XHĐ:', e));

  triggerAutoSyncCurrentOrders();
  return { data: { status: 'SUCCESS' }, error: null };
};

export const uploadSupplementaryInvoiceFiles = async (
  orderId: string,
  contractFile: File | null,
  proposalFile: File | null,
  aiNote: string,
  actorName: string,
  actorUsername: string
) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  if (!contractFile && !proposalFile && !aiNote.trim()) {
    return serviceError('Chưa có nội dung bổ sung.');
  }

  const updates: Record<string, any> = {
    status: 'pending',
    trang_thai_xu_ly: 'Đã bổ sung',
    note: 'Đã bổ sung hồ sơ',
    updated_at: new Date().toISOString()
  };

  if (aiNote.trim()) updates.ghi_chu_ai = aiNote.trim();

  if (contractFile) {
    const upload = await uploadInvoiceFile(orderId, 'hop_dong', contractFile);
    if (upload.error) return { data: null, error: upload.error };
    updates.url_hop_dong = upload.url;
  }

  if (proposalFile) {
    const upload = await uploadInvoiceFile(orderId, 'de_nghi_xhd', proposalFile);
    if (upload.error) return { data: null, error: upload.error };
    updates.url_de_nghi_xhd = upload.url;
    updates.link_de_nghi_xhd = upload.url;
  }

  const { error: reqError } = await supabase
    .from('yeucauxhd')
    .update(updates)
    .eq('so_don_hang', orderId)
    .neq('status', 'approved');

  if (reqError) return { data: null, error: reqError };

  const orderUpdates: Record<string, any> = {
    ket_qua: 'Đã bổ sung',
    updated_at: new Date().toISOString()
  };
  if (updates.url_hop_dong) orderUpdates.link_hop_dong = updates.url_hop_dong;
  if (updates.url_de_nghi_xhd) orderUpdates.link_de_nghi_xhd = updates.url_de_nghi_xhd;

  const { error: orderError } = await supabase
    .from('donhang')
    .update(orderUpdates)
    .eq('so_don_hang', orderId);

  if (orderError) return { data: null, error: orderError };

  await supabase.from('car_hold_activities').insert({
    action: 'request_invoice',
    so_don_hang: orderId,
    vin: null,
    actor_name: actorName,
    actor_username: actorUsername,
    detail: 'Bổ sung hồ sơ xuất hóa đơn'
  });

  const { data: updatedRecord } = await supabase.from('yeucauxhd').select('*').eq('so_don_hang', orderId).single();
  supabase.functions.invoke('send-email', {
    body: {
      actionId: 'invoice_supplement_submitted',
      record: { ...(updatedRecord || {}), filesInfo: [contractFile?.name, proposalFile?.name].filter(Boolean).join(', ') }
    }
  }).catch(e => console.warn('Lỗi gọi gửi email bổ sung XHĐ:', e));

  return { data: { status: 'SUCCESS' }, error: null };
};

export const finalizeInvoiceDonhang = async (requestId: string, linkHoaDon: string, linkHopDong: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('finalize_invoice_donhang', {
    p_request_id: requestId,
    p_link_hoa_don_da_xuat: linkHoaDon,
    p_link_hop_dong: linkHopDong,
    p_mail_status: 'Đã gửi'
  });
};

export const approveInvoiceRequest = async (requestId: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('approve_invoice_request', {
    p_request_id: requestId
  });
};

export const updateInvoiceRequestStatus = async (requestIds: string[], newStatus: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  if (!requestIds || requestIds.length === 0) return { error: null };

  let baseStatus = 'pending';
  if (['Đã phê duyệt', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].includes(newStatus)) baseStatus = 'approved';
  else if (['Từ chối', 'Đã hủy'].includes(newStatus)) baseStatus = 'rejected';

  const isApprovedStage = ['Đã phê duyệt', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].includes(newStatus);
  const todayStr = new Date().toISOString().split('T')[0];

  const reqUpdatePayload: any = {
    trang_thai_xu_ly: newStatus,
    status: baseStatus,
    updated_at: new Date().toISOString()
  };
  if (isApprovedStage) {
    reqUpdatePayload.ngay_xuat_hoa_don = todayStr;
  }

  // Cập nhật nhiều yêu cầu XHĐ
  const { error: reqError } = await supabase
    .from('yeucauxhd')
    .update(reqUpdatePayload)
    .in('id', requestIds);

  if (reqError) return { error: reqError };

  // Lấy các mã đơn hàng để đồng bộ
  const { data: reqs } = await supabase.from('yeucauxhd').select('so_don_hang').in('id', requestIds);
  if (reqs && reqs.length > 0) {
    const orderIds = reqs.map(r => r.so_don_hang).filter(Boolean);
    if (orderIds.length > 0) {
      const orderUpdatePayload: any = { ket_qua: newStatus, updated_at: new Date().toISOString() };
      if (isApprovedStage) {
        orderUpdatePayload.ngay_xuat_hoa_don = todayStr;
      }
      await supabase.from('donhang').update(orderUpdatePayload).in('so_don_hang', orderIds);
    }
  }

  triggerAutoSyncCurrentOrders();
  return { error: null };
};

export const deleteMultipleInvoiceRequests = async (requestIds: string[]) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  if (!requestIds || requestIds.length === 0) return { error: null };

  // 1. Phục hồi xe và trạng thái đơn hàng (Mô phỏng lại logic deleteInvoiceRequest)
  const { data: requestsToDelete } = await supabase.from('yeucauxhd').select('*').in('id', requestIds);
  
  if (requestsToDelete && requestsToDelete.length > 0) {
    const orderIds = requestsToDelete.map(r => r.so_don_hang).filter(Boolean);
    if (orderIds.length > 0) {
      await supabase.from('donhang').update({ ket_qua: 'Đã ghép' }).in('so_don_hang', orderIds);
    }
    
    for (const request of requestsToDelete) {
      if (request.vin) {
        const { data: existingVehicle } = await supabase.from('khoxe').select('vin').eq('vin', request.vin).single();
        if (!existingVehicle) {
          await supabase.from('khoxe').insert({
            vin: request.vin,
            dong_xe: request.dong_xe,
            phien_ban: request.phien_ban,
            ngoai_that: request.ngoai_that,
            noi_that: request.noi_that,
            so_may: request.so_may,
            gia_cong_bo: request.gia_cong_bo,
            da_ghep: true,
            status: 'held',
            held_by: request.requested_by,
            held_at: new Date().toISOString()
          });
        }
      }
    }
  }

  // 2. Xóa các yêu cầu
  const delRes = await supabase.from('yeucauxhd').delete().in('id', requestIds);
  triggerAutoSyncCurrentOrders();
  return delRes;
};

export const requestInvoiceSupplement = async (requestId: string, reason: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.rpc('request_invoice_supplement', {
    p_request_id: requestId,
    p_reason: reason
  });

  if (!result.error) {
    const { data: reqData } = await supabase.from('yeucauxhd').select('*').eq('id', requestId).single();
    if (reqData) {
      supabase.functions.invoke('send-email', {
        body: {
          actionId: 'invoice_supplement_requested',
          record: { ...reqData, ghi_chu_admin: reason }
        }
      }).catch(e => console.warn('Lỗi gọi gửi email yêu cầu bổ sung XHĐ:', e));
    }
  }

  return result;
};

export const markInvoicePendingSignature = async (requestId: string, invoiceDate?: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const res = await supabase.rpc('mark_invoice_pending_signature', {
    p_request_id: requestId,
    p_ngay_xuat_hoa_don: invoiceDate || null
  });
  if (!res.error) {
    triggerAutoSyncCurrentOrders();
  }
  return res;
};

export const uploadIssuedInvoice = async (requestId: string, orderId: string, customerName: string, file: File) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const safeCustomer = safeStorageName(customerName || 'KH').toUpperCase();
  const path = `yeucauxhd/${orderId}/HOADON_${safeCustomer}_${Date.now()}_${safeStorageName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from('yeucauxhd-files')
    .upload(path, file, { upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const { data } = supabase.storage.from('yeucauxhd-files').getPublicUrl(path);
  const result = await supabase.rpc('complete_issued_invoice', {
    p_request_id: requestId,
    p_invoice_url: data.publicUrl,
    p_mail_status: 'Chưa gửi mail'
  });

  if (!result.error) {
    triggerAutoSyncCurrentOrders();
    const { data: reqData } = await supabase.from('yeucauxhd').select('*').eq('id', requestId).single();
    if (reqData) {
      supabase.functions.invoke('send-email', {
        body: {
          actionId: 'invoice_issued',
          record: reqData
        }
      }).catch(e => console.warn('Lỗi gọi gửi email hóa đơn đã xuất:', e));
    }
  }

  return result;
};

// --- Vehicle Configs ---
export const getVehicleConfigs = async () => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.from('vehicle_configs').select('*').order('created_at', { ascending: true });
};

export const createVehicleConfig = async (config: Omit<import('../types').VehicleConfigRow, 'id' | 'created_at' | 'updated_at'>) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.from('vehicle_configs').insert(config).select();
  if (!result.error) {
    await logSystemActivity('update_config', null, `Đã tạo cấu hình xe: ${config.type} ${config.value}`);
  }
  return result;
};

export const updateVehicleConfig = async (id: string, updates: Partial<Omit<import('../types').VehicleConfigRow, 'id' | 'created_at' | 'updated_at'>>) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.from('vehicle_configs').update(updates).eq('id', id).select();
  if (!result.error) {
    await logSystemActivity('update_config', null, `Đã cập nhật cấu hình xe (ID: ${id})`);
  }
  return result;
};

export const deleteVehicleConfig = async (id: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const { data } = await supabase.from('vehicle_configs').select('type, value').eq('id', id).single();
  if (data?.type === 'line') {
    await supabase.from('vehicle_configs').delete().eq('parent_value', data.value);
  }
  const result = await supabase.from('vehicle_configs').delete().eq('id', id);
  if (!result.error) {
    await logSystemActivity('update_config', null, `Đã xóa cấu hình xe (ID: ${id})`);
  }
  return result;
};

export const deleteVehicle = async (vin: string) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  const result = await supabase.from('khoxe').delete().eq('vin', vin.trim());
  if (!result.error) {
    await logSystemActivity('delete_vehicle', null, `Đã xóa xe (VIN: ${vin})`);
  }
  return result;
};

export const updateVehicle = async (vin: string, updates: Partial<import('../types').InventoryItem> & { newVin?: string }) => {
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  
  const dbUpdates: any = {};
  if (updates.newVin && updates.newVin !== vin) dbUpdates.vin = updates.newVin.trim().toUpperCase();
  if (updates.line !== undefined) dbUpdates.dong_xe = updates.line;
  if (updates.version !== undefined) dbUpdates.phien_ban = updates.version;
  if (updates.exterior !== undefined) dbUpdates.ngoai_that = updates.exterior;
  if (updates.interior !== undefined) dbUpdates.noi_that = updates.interior;
  if (updates.location !== undefined) dbUpdates.vi_tri = updates.location;
  if (updates.engineNo !== undefined) dbUpdates.so_may = updates.engineNo;
  if (updates.ma_dms !== undefined) dbUpdates.ma_dms = updates.ma_dms;
  dbUpdates.updated_at = new Date().toISOString();

  const result = await supabase.from('khoxe').update(dbUpdates).eq('vin', vin.trim());

  if (updates.newVin && updates.newVin !== vin && !result.error) {
    // Đồng bộ số VIN mới sang đơn hàng nếu xe này đang được ghép
    const { data: updatedOrders } = await supabase.from('donhang').update({ vin: dbUpdates.vin }).eq('vin', vin.trim()).select('*');
    
    // Gửi email thông báo đổi VIN cho các đơn hàng liên quan
    if (updatedOrders && updatedOrders.length > 0) {
      for (const order of updatedOrders) {
        supabase.functions.invoke('send-email', {
          body: {
            actionId: 'vin_replaced',
            record: {
              ...order,
              old_vin: vin.trim(),
              new_vin: dbUpdates.vin
            }
          }
        }).catch(e => console.warn('Lỗi gọi gửi email vin_replaced:', e));
      }
    }
  }

  return result;
};

// =========================================================
// HR LEAVE REQUESTS API
// =========================================================

export const getHrLeaveRequests = async () => {
  if (!supabase) return { data: [], error: null };
  const res = await supabase
    .from('hr_leave_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (res.data) {
    res.data = res.data.map((req: any) => {
      if (req.status === 'pending' && req.reviewer_note && req.reviewer_note.startsWith('[TPKD_APPROVED]')) {
        return {
          ...req,
          status: 'pending_director',
          reviewer_note: req.reviewer_note.replace('[TPKD_APPROVED] ', '').replace('[TPKD_APPROVED]', '')
        };
      }
      return req;
    });
  }
  return res;
};

export const submitHrLeaveRequest = async (payload: {
  requester_name: string;
  requester_username: string;
  requester_id: string | null;
  type: 'nghi_phep' | 'di_tre';
  start_date: string;
  end_date?: string | null;
  late_time?: string | null;
  session?: 'sang' | 'chieu' | 'ca_ngay' | null;
  reason: string;
  status?: string;
}) => {
  if (!supabase) return { data: null, error: new Error('Supabase chưa cấu hình') };
  const cleanRequesterId = (payload.requester_id && payload.requester_id.trim() && payload.requester_id.trim() !== 'null')
    ? payload.requester_id.trim()
    : null;
  const insertPayload = {
    ...payload,
    requester_name: (payload.requester_name && payload.requester_name.trim()) ? payload.requester_name.trim() : (payload.requester_username || 'Nhân viên'),
    requester_username: (payload.requester_username && payload.requester_username.trim()) ? payload.requester_username.trim() : 'nhanvien',
    requester_id: cleanRequesterId,
    end_date: payload.end_date || payload.start_date,
    status: payload.status || 'pending'
  };
  return supabase.from('hr_leave_requests').insert(insertPayload).select().single();
};

export const reviewHrLeaveRequest = async (
  id: string,
  status: 'pending_director' | 'approved' | 'rejected',
  reviewer_note: string,
  reviewed_by: string
) => {
  if (!supabase) return { data: null, error: new Error('Supabase chưa cấu hình') };
  
  let dbStatus: any = status;
  let dbNote = reviewer_note;
  
  if (status === 'pending_director') {
    dbStatus = 'pending';
    dbNote = reviewer_note ? `[TPKD_APPROVED] ${reviewer_note}` : '[TPKD_APPROVED]';
  }

  return supabase
    .from('hr_leave_requests')
    .update({
      status: dbStatus,
      reviewer_note: dbNote,
      reviewed_by,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
};

export const deleteHrLeaveRequest = async (id: string) => {
  if (!supabase) return { error: new Error('Supabase chưa cấu hình') };
  return supabase.from('hr_leave_requests').delete().eq('id', id);
};

export const deleteInvoiceRequest = async (id: string) => {
  if (!supabase) throw new Error('Supabase chưa cấu hình');
  
  // Lấy thông tin yêu cầu để biết số đơn hàng và thông tin xe
  const { data: request, error: fetchError } = await supabase
    .from('yeucauxhd')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !request) {
    return { error: fetchError || new Error('Không tìm thấy yêu cầu') };
  }

  // Xóa yêu cầu
  const deleteResult = await supabase.from('yeucauxhd').delete().eq('id', id);
  if (deleteResult.error) return deleteResult;

  // Cập nhật trạng thái đơn hàng về lại 'Đã ghép'
  const updateResult = await supabase
    .from('donhang')
    .update({ ket_qua: 'Đã ghép' })
    .eq('so_don_hang', request.so_don_hang);

  // Phục hồi lại xe vào kho xe nếu xe đã bị xóa (do lúc yêu cầu xuất hóa đơn xe bị xóa khỏi kho)
  if (request.vin) {
    const { data: existingVehicle } = await supabase.from('khoxe').select('vin').eq('vin', request.vin).single();
    if (!existingVehicle) {
      await supabase.from('khoxe').insert({
        vin: request.vin,
        dong_xe: request.dong_xe,
        phien_ban: request.phien_ban,
        ngoai_that: request.ngoai_that,
        noi_that: request.noi_that,
        so_may: request.so_may,
        trang_thai: 'Đã ghép'
      });
    }
  }

  return updateResult;
};

export interface StorageUsageResult {
  totalFiles: number;
  totalBytes: number;
  totalMB: number;
  percentUsed: number;
}

export const getStorageUsage = async (): Promise<StorageUsageResult> => {
  if (!supabase) return { totalFiles: 0, totalBytes: 0, totalMB: 0, percentUsed: 0 };
  const BUCKET = 'yeucauxhd-files';
  let totalFiles = 0;
  let totalBytes = 0;

  async function listRecursive(folder = '') {
    if (!supabase) return;
    const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 500 });
    if (!data) return;
    for (const item of data) {
      const fullPath = folder ? `${folder}/${item.name}` : item.name;
      if (item.id === null) {
        await listRecursive(fullPath);
      } else {
        totalFiles++;
        totalBytes += (item.metadata?.size || 0);
      }
    }
  }

  await listRecursive('');
  const totalMB = Number((totalBytes / (1024 * 1024)).toFixed(2));
  const percentUsed = Math.min(100, Number(((totalMB / 1024) * 100).toFixed(1)));
  return { totalFiles, totalBytes, totalMB, percentUsed };
};

export const executeMonthArchive = async (
  month: string,
  webhookUrl: string,
  onProgress?: (status: string) => void
): Promise<{ success: boolean; message: string; ordersCount?: number; filesCount?: number }> => {
  if (!supabase) throw new Error('Supabase chưa cấu hình');
  const BUCKET = 'yeucauxhd-files';

  onProgress?.(`Đang lấy danh sách đơn hàng tháng ${month}...`);
  const { data: allRequests, error: reqErr } = await supabase.from('yeucauxhd').select('*');
  if (reqErr) throw reqErr;

  const targetRequests = (allRequests || []).filter(r => {
    const d = r.ngay_xuat_hoa_don || r.created_at;
    return d && d.startsWith(month);
  });

  if (targetRequests.length === 0) {
    return { success: false, message: `Không tìm thấy đơn hàng nào trong tháng ${month}.` };
  }

  const batchSize = 5;
  const allArchivedFiles: any[] = [];
  const totalBatches = Math.ceil(targetRequests.length / batchSize);

  for (let i = 0; i < targetRequests.length; i += batchSize) {
    const batch = targetRequests.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize) + 1;
    onProgress?.(`Đang lưu đợt ${batchIndex}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, targetRequests.length)}/${targetRequests.length} đơn) lên Google Drive...`);

    const archiveRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'ARCHIVE_ORDERS',
        month,
        orders: batch
      })
    });

    const archiveJson = await archiveRes.json();
    if (!archiveJson.success) {
      throw new Error(`Lỗi từ Google Apps Script: ${archiveJson.error || 'Không rõ nguyên nhân'}`);
    }

    if (archiveJson.archivedFiles) {
      allArchivedFiles.push(...archiveJson.archivedFiles);
    }
  }

  onProgress?.(`Đang cập nhật link Google Drive vào CSDL và xóa file Supabase...`);
  const filesToDeleteFromSupabase: string[] = [];
  const ghiChuAiByOrder: Record<string, string[]> = {};

  for (const item of allArchivedFiles) {
    const marker = 'yeucauxhd-files/';
    const idx = item.supabaseUrl.indexOf(marker);
    if (idx !== -1) {
      const storagePath = decodeURIComponent(item.supabaseUrl.substring(idx + marker.length).split('?')[0]);
      filesToDeleteFromSupabase.push(storagePath);
    }

    if (item.field === 'url_hop_dong') {
      await supabase.from('yeucauxhd').update({ url_hop_dong: item.driveUrl }).eq('so_don_hang', item.orderId);
      await supabase.from('donhang').update({ link_hop_dong: item.driveUrl }).eq('so_don_hang', item.orderId);
    } else if (item.field === 'url_de_nghi_xhd') {
      await supabase.from('yeucauxhd').update({ url_de_nghi_xhd: item.driveUrl }).eq('so_don_hang', item.orderId);
      await supabase.from('donhang').update({ link_de_nghi_xhd: item.driveUrl }).eq('so_don_hang', item.orderId);
    } else if (item.field === 'ghi_chu_ai') {
      if (!ghiChuAiByOrder[item.orderId]) ghiChuAiByOrder[item.orderId] = [];
      ghiChuAiByOrder[item.orderId].push(item.driveUrl);
    }
  }

  for (const [orderId, driveUrls] of Object.entries(ghiChuAiByOrder)) {
    await supabase.from('yeucauxhd').update({ ghi_chu_ai: driveUrls.join(',') }).eq('so_don_hang', orderId);
  }

  if (filesToDeleteFromSupabase.length > 0) {
    for (let i = 0; i < filesToDeleteFromSupabase.length; i += 50) {
      const chunk = filesToDeleteFromSupabase.slice(i, i + 50);
      await supabase.storage.from(BUCKET).remove(chunk);
    }
  }

  return {
    success: true,
    message: `Đã lưu trữ thành công tháng ${month}!`,
    ordersCount: targetRequests.length,
    filesCount: allArchivedFiles.length
  };
};

export const syncCurrentOrdersToSheet = async (
  webhookUrl: string,
  targetMonth?: string
): Promise<{ success: boolean; message: string; ordersCount?: number; sheetName?: string }> => {
  if (!supabase) throw new Error('Supabase chưa cấu hình');

  const now = new Date();
  const currentMonth = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data: allOrders, error: orderErr } = await supabase.from('donhang').select('*');
  if (orderErr) throw orderErr;

  const monthOrders = (allOrders || []).filter(o => {
    const d = o.ngay_xuat_hoa_don || o.ngay_coc || o.thoi_gian_nhap || o.created_at || '';
    return d.includes(currentMonth) || (o.so_don_hang && o.so_don_hang.includes(`-${currentMonth.split('-')[1]}-`));
  });

  if (monthOrders.length === 0) {
    return { success: false, message: `Không có đơn hàng nào trong tháng ${currentMonth} để đồng bộ.` };
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'SYNC_CURRENT_ORDERS',
      month: currentMonth,
      orders: monthOrders
    })
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Lỗi khi gửi dữ liệu sang Google Sheet');
  }

  return {
    success: true,
    message: `Đồng bộ thành công ${json.ordersCount} đơn hàng vào tab "${json.sheetName}"!`,
    ordersCount: json.ordersCount,
    sheetName: json.sheetName
  };
};

export const sendDeliveryDocsWarningEmail = async (
  order: Order,
  docs: DeliveryDocStatus,
  adminName: string
): Promise<{ success: boolean; tvbhEmail?: string; error?: any }> => {
  if (!supabase) return { success: false, error: 'Chưa cấu hình Supabase' };

  try {
    let tvbhEmail = '';
    const staffName = (order.staff || '').trim();

    if (staffName) {
      const { data: staffList } = await supabase.rpc('get_staff_directory');
      if (staffList && Array.isArray(staffList)) {
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
        const target = norm(staffName);
        for (const s of staffList) {
          if (norm(s.full_name || '') === target || String(s.email || '').toLowerCase() === staffName.toLowerCase()) {
            tvbhEmail = s.email;
            break;
          }
        }
      }
    }

    if (!tvbhEmail) {
      const { data: reqData } = await supabase
        .from('yeucauxhd')
        .select('requested_by_username')
        .eq('so_don_hang', order.id)
        .maybeSingle();
      if (reqData?.requested_by_username && reqData.requested_by_username.includes('@')) {
        tvbhEmail = reqData.requested_by_username;
      }
    }

    if (!tvbhEmail) {
      return { success: false, error: `Không tìm thấy địa chỉ email của TVBH ${order.staff}` };
    }

    const debtDays = order.docDebtDays || 0;
    const isOverdue = debtDays >= 6;
    const statusBadgeText = docs.da_thu_du
      ? 'ĐÃ THU ĐỦ HỒ SƠ'
      : isOverdue
        ? `🚨 QUÁ HẠN NỘP HỒ SƠ (${debtDays} NGÀY)`
        : `⚠️ CẢNH BÁO NỢ HỒ SƠ (${debtDays} NGÀY)`;

    const subject = `[CẢNH BÁO NỢ HỒ SƠ] Đơn hàng ${order.id} - KH ${order.customer} (${order.staff})`;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #1e293b;">
        <div style="background: ${isOverdue ? '#b91c1c' : '#d97706'}; padding: 20px 24px; color: #ffffff;">
          <h2 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 800; text-transform: uppercase;">
            ${isOverdue ? '🚨 Cảnh Báo Quá Hạn Hồ Sơ Giao Xe' : '⚠️ Cảnh Báo Nợ Hồ Sơ Giao Xe'}
          </h2>
          <p style="margin: 0; font-size: 13px; opacity: 0.95;">Hệ thống Điều Hành Bán Hàng VinFast Kim Sơn - Trảng Dài</p>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 14px; margin-top: 0;">Kính gửi Tư vấn bán hàng <strong>${order.staff}</strong>,</p>
          <p style="font-size: 13.5px; line-height: 1.5; color: #334155;">
            Ban Quản Trị gửi thông báo cảnh báo và đôn đốc hoàn thiện hồ sơ giao xe bổ sung sau khi xuất hóa đơn đối với đơn hàng sau:
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; border: 1px solid #e2e8f0;">
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px; font-weight: 600; color: #64748b; width: 35%; background: #f8fafc;">Mã đơn hàng:</td>
                <td style="padding: 9px 12px; font-weight: 700; color: #0f172a;">${order.id} ${order.contractCode ? `(${order.contractCode})` : ''}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px; font-weight: 600; color: #64748b; background: #f8fafc;">Khách hàng:</td>
                <td style="padding: 9px 12px; font-weight: 700; color: #0f172a;">${order.customer}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px; font-weight: 600; color: #64748b; background: #f8fafc;">Dòng xe:</td>
                <td style="padding: 9px 12px; color: #0f172a;">${order.line} / ${order.version}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px; font-weight: 600; color: #64748b; background: #f8fafc;">Số VIN:</td>
                <td style="padding: 9px 12px; font-weight: 700; font-family: monospace; color: #0369a1;">${order.vin || 'Chưa cấp'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px; font-weight: 600; color: #64748b; background: #f8fafc;">Ngày xuất HĐ:</td>
                <td style="padding: 9px 12px; color: #0f172a; font-weight: 600;">${order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString('vi-VN') : '—'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 9px 12px; font-weight: 600; color: #64748b; background: #f8fafc;">Thời gian nợ hồ sơ:</td>
                <td style="padding: 9px 12px; font-weight: 700; color: ${isOverdue ? '#b91c1c' : '#d97706'}; font-size: 14px;">
                  ${debtDays} ngày (${statusBadgeText})
                </td>
              </tr>
            </tbody>
          </table>

          <div style="background: #fffbeb; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: 800; color: #b45309; text-transform: uppercase; margin-bottom: 6px;">
              📝 Hồ sơ còn thiếu & Ghi chú chỉ đạo từ Admin (${adminName}):
            </div>
            <div style="font-size: 14px; font-weight: 600; color: #78350f; white-space: pre-wrap; line-height: 1.6;">
              ${docs.note ? docs.note : '(Admin yêu cầu TVBH nhanh chóng nộp đầy đủ hồ sơ giao xe còn thiếu theo quy định)'}
            </div>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-bottom: 24px;">
            Đề nghị TVBH khẩn trương liên hệ khách hàng để hoàn tất các chứng từ trên và nộp về Kế Toán / Ban Quản Trị showroom để khóa hồ sơ giao xe đúng hạn quy định.
          </p>

          <div style="text-align: center; margin: 24px 0 12px 0;">
            <a href="https://ordermanagement-three.vercel.app" style="background: #0284c7; color: #ffffff; padding: 12px 28px; text-decoration: none; font-size: 13.5px; font-weight: 700; border-radius: 6px; display: inline-block;">
              Xem chi tiết đơn hàng
            </a>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 14px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
          Email tự động được gửi từ Hệ thống Điều Hành Bán Hàng VinFast Kim Sơn - Trảng Dài.<br/>
          Người thực hiện cảnh báo: <strong>${adminName}</strong>
        </div>
      </div>
    `;

    const res = await supabase.functions.invoke('send-email', {
      body: {
        actionId: 'raw',
        recipient_email: tvbhEmail,
        subject,
        html: htmlContent
      }
    });

    if (res.error) {
      console.warn('Lỗi gọi send-email cảnh báo nợ hồ sơ:', res.error);
      return { success: false, tvbhEmail, error: res.error };
    }

    return { success: true, tvbhEmail };
  } catch (err: any) {
    console.error('Error in sendDeliveryDocsWarningEmail:', err);
    return { success: false, error: err?.message || err };
  }
};

export const updateDeliveryDocs = async (
  orderId: string,
  docs: Partial<DeliveryDocStatus>,
  options?: {
    order?: Order;
    sendEmailAlert?: boolean;
  }
): Promise<{ success: boolean; emailSent?: boolean; tvbhEmail?: string; error?: any }> => {
  if (!supabase) return { success: false, error: 'Chưa cấu hình Supabase' };
  try {
    const { data: currentOrder, error: fetchErr } = await supabase
      .from('donhang')
      .select('ho_so_giao_xe')
      .eq('so_don_hang', orderId)
      .single();

    if (fetchErr) {
      console.error('Fetch ho_so_giao_xe error:', fetchErr);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const updater = sessionData?.session?.user?.user_metadata?.full_name || sessionData?.session?.user?.email || 'Admin';

    const merged: DeliveryDocStatus = {
      da_thu_du: false,
      bbbg: false,
      dang_ky: false,
      hop_dong_goc: false,
      bao_hiem: false,
      note: '',
      ...(currentOrder?.ho_so_giao_xe || {}),
      ...docs,
      ngay_cap_nhat: new Date().toISOString(),
      nguoi_cap_nhat: updater
    };

    const { error: updateErr } = await supabase
      .from('donhang')
      .update({ ho_so_giao_xe: merged })
      .eq('so_don_hang', orderId);

    if (updateErr) {
      return { success: false, error: updateErr };
    }

    let emailSent = false;
    let tvbhEmail: string | undefined = undefined;

    if (options?.sendEmailAlert && options?.order && !merged.da_thu_du) {
      const mailRes = await sendDeliveryDocsWarningEmail(options.order, merged, updater);
      if (mailRes.success) {
        emailSent = true;
        tvbhEmail = mailRes.tvbhEmail;
      }
    }

    await logSystemActivity(
      'CẬP NHẬT HỒ SƠ GIAO XE',
      orderId,
      `Cập nhật hồ sơ giao xe: ${merged.da_thu_du ? 'Đã thu đủ hồ sơ' : 'Còn nợ hồ sơ'}${merged.note ? ' - Note: ' + merged.note : ''}${emailSent ? ` (Đã gửi mail cảnh báo tới ${tvbhEmail})` : ''}`
    );
    triggerAutoSyncCurrentOrders();
    return { success: true, emailSent, tvbhEmail };
  } catch (err: any) {
    return { success: false, error: err?.message || err };
  }
};

