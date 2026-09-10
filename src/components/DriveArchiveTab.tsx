import React, { useState, useEffect } from 'react';
import { 
  HardDrive, Cloud, ExternalLink, RefreshCw, CheckCircle2, 
  AlertTriangle, FileSpreadsheet, FolderCheck, Loader2, ArrowRight, Save, ShieldCheck,
  Zap, Table
} from 'lucide-react';
import * as apiService from '../services/apiService';
import { DEFAULT_ARCHIVE_WEBHOOK_URL } from '../constants';
import { supabase } from '../services/supabaseClient';

export const DriveArchiveTab: React.FC = () => {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('archive_webhook_url') || DEFAULT_ARCHIVE_WEBHOOK_URL;
  });
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [loadingUsage, setLoadingUsage] = useState(true);
  const [storageUsage, setStorageUsage] = useState<apiService.StorageUsageResult | null>(null);

  const [loadingMonths, setLoadingMonths] = useState(true);
  const [currentMonthOrderCount, setCurrentMonthOrderCount] = useState<number>(0);
  const [isSyncingCurrent, setIsSyncingCurrent] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(() => {
    return localStorage.getItem('last_sync_current_result') || null;
  });

  const [monthList, setMonthList] = useState<Array<{
    month: string;
    label: string;
    totalOrders: number;
    supabaseFiles: number;
    driveFiles: number;
    isArchived: boolean;
  }>>([]);

  const [isArchiving, setIsArchiving] = useState(false);
  const [archivingMonth, setArchivingMonth] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthLabel = `Tháng ${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const loadData = async () => {
    setLoadingUsage(true);
    setLoadingMonths(true);
    try {
      const usage = await apiService.getStorageUsage();
      setStorageUsage(usage);

      if (supabase) {
        // Đếm đơn hàng tháng hiện tại trong donhang
        const { data: allOrders } = await supabase.from('donhang').select('id, so_don_hang, ngay_xuat_hoa_don, ngay_coc, thoi_gian_nhap, created_at');
        if (allOrders) {
          const mPart = currentMonthStr.split('-')[1];
          const cnt = allOrders.filter(o => {
            const d = o.ngay_xuat_hoa_don || o.ngay_coc || o.thoi_gian_nhap || o.created_at || '';
            return d.includes(currentMonthStr) || (o.so_don_hang && o.so_don_hang.includes(`-${mPart}-`));
          }).length;
          setCurrentMonthOrderCount(cnt);
        }

        const { data: requests } = await supabase.from('yeucauxhd').select('*');
        if (requests) {
          const map: Record<string, { totalOrders: number; supabaseFiles: number; driveFiles: number }> = {};
          
          for (const r of requests) {
            const d = r.ngay_xuat_hoa_don || r.created_at;
            if (!d) continue;
            const m = d.substring(0, 7);
            if (!map[m]) {
              map[m] = { totalOrders: 0, supabaseFiles: 0, driveFiles: 0 };
            }
            map[m].totalOrders++;

            const urls = [r.url_hop_dong, r.url_de_nghi_xhd, r.url_hoa_don_da_xuat].filter(Boolean);
            if (r.ghi_chu_ai) {
              urls.push(...r.ghi_chu_ai.split(',').map((u: string) => u.trim()));
            }

            for (const u of urls) {
              if (u.includes('drive.google.com')) {
                map[m].driveFiles++;
              } else if (u.includes('yeucauxhd-files')) {
                map[m].supabaseFiles++;
              }
            }
          }

          const sortedMonths = Object.keys(map).sort().reverse().map(m => {
            const parts = m.split('-');
            const label = `Tháng ${parts[1]}/${parts[0]}`;
            const item = map[m];
            const isArchived = item.supabaseFiles === 0 && item.driveFiles > 0;
            return {
              month: m,
              label,
              totalOrders: item.totalOrders,
              supabaseFiles: item.supabaseFiles,
              driveFiles: item.driveFiles,
              isArchived
            };
          });

          setMonthList(sortedMonths);
        }
      }
    } catch (e) {
      console.error('Lỗi tải dữ liệu lưu trữ:', e);
    } finally {
      setLoadingUsage(false);
      setLoadingMonths(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveUrl = () => {
    localStorage.setItem('archive_webhook_url', webhookUrl.trim());
    setIsUrlSaved(true);
    setTimeout(() => setIsUrlSaved(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'TEST_CONNECTION' })
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: 'Kết nối thành công với Google Sheet & Drive!' });
      } else {
        setTestResult({ success: false, message: data.error || 'Lỗi phản hồi từ Google Apps Script' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Không thể kết nối đến Webhook URL' });
    } finally {
      setIsTesting(false);
    }
  };

  // Đồng bộ đơn hàng tháng hiện tại sang tab riêng trên Google Sheet
  const handleSyncCurrentMonth = async () => {
    setIsSyncingCurrent(true);
    try {
      const result = await apiService.syncCurrentOrdersToSheet(webhookUrl.trim(), currentMonthStr);
      if (result.success) {
        const timeStr = Utilities_formatTime();
        const msg = `✓ Đã đồng bộ ${result.ordersCount} đơn vào tab "${result.sheetName}" lúc ${timeStr}`;
        setLastSyncResult(msg);
        localStorage.setItem('last_sync_current_result', msg);
        alert(`🎉 ${result.message}\n\nSheet đã được ghi đè danh sách đơn mới nhất với đầy đủ 32 cột thông tin.`);
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      alert(`Lỗi khi đồng bộ đơn hàng: ${err.message}\n\n(Lưu ý: Hãy đảm bảo bạn đã cập nhật đoạn mã mới nhất vào Google Apps Script).`);
    } finally {
      setIsSyncingCurrent(false);
    }
  };

  const Utilities_formatTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ngày ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}`;
  };

  const handleArchiveMonth = async (month: string, label: string) => {
    const confirmMsg = `Bạn có chắc chắn muốn Đóng sổ và chuyển toàn bộ hồ sơ của ${label} sang Google Drive & Google Sheet?\n\n- File sẽ được chuyển vào Google Drive của Showroom\n- Dòng dữ liệu được điền vào Google Sheet\n- File trên Supabase Storage sẽ được xóa để giải phóng dung lượng.`;
    if (!window.confirm(confirmMsg)) return;

    setIsArchiving(true);
    setArchivingMonth(month);
    setProgressMsg(`Đang khởi động tiến trình lưu trữ ${label}...`);

    try {
      const result = await apiService.executeMonthArchive(month, webhookUrl.trim(), (msg) => {
        setProgressMsg(msg);
      });

      if (result.success) {
        alert(`🎉 Chúc mừng! Đã lưu trữ thành công ${label} sang Google Drive & Google Sheet!\n\n- Số đơn hàng: ${result.ordersCount}\n- Số file đã chuyển: ${result.filesCount}`);
        await loadData();
      } else {
        alert(`Thông báo: ${result.message}`);
      }
    } catch (err: any) {
      alert(`Đã xảy ra lỗi khi lưu trữ: ${err.message}`);
    } finally {
      setIsArchiving(false);
      setArchivingMonth(null);
      setProgressMsg('');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
      
      {/* HEADER CARD */}
      <div style={{ 
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
        padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '46px', height: '46px', borderRadius: '12px', 
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', 
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
          }}>
            <Cloud size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              Tự Động Lưu Trữ Hàng Tháng (Google Drive & Sheets)
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Tự động đóng sổ theo tháng, chuyển hợp đồng scan sang Google Drive và giải phóng 100% dung lượng Supabase Storage.
            </p>
          </div>
        </div>

        <button 
          onClick={loadData}
          disabled={loadingUsage || isArchiving}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px',
            borderRadius: '9px', border: '1px solid #cbd5e1', background: '#ffffff',
            color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} className={loadingUsage ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* FEATURE 1: ĐỒNG BỘ ĐƠN HÀNG THÁNG HIỆN TẠI VÀO 1 SHEET RIÊNG */}
      <div style={{ 
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)', 
        borderRadius: '16px', border: '1px solid #86efac', 
        padding: '20px 24px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ 
              width: '42px', height: '42px', borderRadius: '10px', 
              background: '#059669', color: '#fff', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 
            }}>
              <Table size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Đồng Bộ Đơn Hàng {currentMonthLabel} Sang Google Sheet
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#059669', color: '#fff' }}>
                  Đầy đủ 32 cột
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569' }}>
                Tự động tạo hoặc ghi đè tab <strong>"Đơn Hàng Hiện Tại ({currentMonthStr})"</strong> trên Google Sheet với toàn bộ <strong>{currentMonthOrderCount} đơn hàng</strong> của tháng (Khách hàng, VIN, Giá, Tiền cọc, Hợp đồng, AMIS...).
              </p>
              {lastSyncResult && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> {lastSyncResult}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSyncCurrentMonth}
            disabled={isSyncingCurrent}
            style={{ 
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              color: '#fff', fontSize: '13.5px', fontWeight: 700, cursor: isSyncingCurrent ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)',
              whiteSpace: 'nowrap'
            }}
          >
            {isSyncingCurrent ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Đang đồng bộ...
              </>
            ) : (
              <>
                <Zap size={16} /> Đồng bộ sang Google Sheet ngay
              </>
            )}
          </button>
        </div>
      </div>

      {/* STORAGE USAGE STATUS BAR */}
      <div style={{ 
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
        padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} style={{ color: '#059669' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Dung lượng Supabase Storage hiện tại
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: storageUsage && storageUsage.percentUsed > 80 ? '#dc2626' : '#059669' }}>
              {storageUsage ? `${storageUsage.totalMB} MB / 1,024 MB (${storageUsage.percentUsed}%)` : 'Đang tính...'}
            </span>
            <span style={{ 
              fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
              background: storageUsage && storageUsage.percentUsed > 80 ? '#fee2e2' : '#dcfce7',
              color: storageUsage && storageUsage.percentUsed > 80 ? '#b91c1c' : '#15803d'
            }}>
              {storageUsage && storageUsage.percentUsed > 80 ? 'Cảnh báo quá tải' : 'An toàn tuyệt đối'}
            </span>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', 
            width: `${storageUsage ? Math.max(2, storageUsage.percentUsed) : 0}%`, 
            background: storageUsage && storageUsage.percentUsed > 80 ? '#ef4444' : 'linear-gradient(90deg, #10b981, #059669)',
            borderRadius: '999px',
            transition: 'width 0.4s ease'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
          <span>Số tệp còn lại trên Supabase: <strong>{storageUsage ? storageUsage.totalFiles : 0} files</strong> (Chỉ còn đơn của tháng đang hoạt động)</span>
          <span>Hạn mức gói miễn phí: <strong>1,024 MB (1 GB)</strong></span>
        </div>
      </div>

      {/* WEBHOOK CONFIGURATION CARD */}
      <div style={{ 
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
        padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
              Cấu hình Google Apps Script Webhook
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a 
              href="https://sheets.google.com" 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '12.5px', color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              Mở Google Sheets <ExternalLink size={13} />
            </a>
            <a 
              href="https://drive.google.com" 
              target="_blank" 
              rel="noreferrer"
              style={{ fontSize: '12.5px', color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
            >
              Mở Google Drive <ExternalLink size={13} />
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input 
            type="text" 
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="Nhập URL Google Apps Script (https://script.google.com/macros/s/.../exec)"
            style={{ 
              flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', 
              fontSize: '13px', outline: 'none', background: '#f8fafc', fontFamily: 'monospace' 
            }}
          />
          <button 
            onClick={handleSaveUrl}
            style={{ 
              padding: '9px 14px', borderRadius: '8px', border: 'none', 
              background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 600, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
            }}
          >
            <Save size={14} />
            {isUrlSaved ? 'Đã lưu!' : 'Lưu URL'}
          </button>
          <button 
            onClick={handleTestConnection}
            disabled={isTesting}
            style={{ 
              padding: '9px 14px', borderRadius: '8px', border: '1px solid #059669', 
              background: '#f0fdf4', color: '#059669', fontSize: '13px', fontWeight: 600, 
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
            }}
          >
            {isTesting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            Kiểm tra kết nối
          </button>
        </div>

        {testResult && (
          <div style={{ 
            marginTop: '10px', padding: '8px 12px', borderRadius: '8px', 
            background: testResult.success ? '#dcfce7' : '#fee2e2', 
            color: testResult.success ? '#15803d' : '#b91c1c', 
            fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' 
          }}>
            {testResult.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            {testResult.message}
          </div>
        )}
      </div>

      {/* MONTHLY ARCHIVE LIST */}
      <div style={{ 
        background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
        padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
            Danh sách các tháng & Trạng thái lưu trữ đóng sổ
          </h3>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            Khi một tháng đã hoàn tất xuất hóa đơn, bấm "Đóng sổ & Chuyển sang Drive" để tự động giải phóng bộ nhớ.
          </span>
        </div>

        {isArchiving && (
          <div style={{ 
            marginBottom: '16px', padding: '14px 18px', borderRadius: '12px', 
            background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af',
            display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <Loader2 size={20} className="animate-spin" style={{ color: '#2563eb' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px' }}>Đang thực hiện lưu trữ tự động...</div>
              <div style={{ fontSize: '12.5px', color: '#3b82f6', marginTop: '2px' }}>{progressMsg}</div>
            </div>
          </div>
        )}

        {loadingMonths ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '13px' }}>
            <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            Đang phân tích dữ liệu các tháng...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {monthList.map((m) => {
              const isCurrentAction = isArchiving && archivingMonth === m.month;

              return (
                <div 
                  key={m.month}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderRadius: '12px',
                    background: m.isArchived ? '#f8fafc' : '#ffffff',
                    border: '1px solid',
                    borderColor: m.isArchived ? '#e2e8f0' : '#bbf7d0',
                    boxShadow: m.isArchived ? 'none' : '0 2px 5px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: m.isArchived ? '#e2e8f0' : '#dcfce7',
                      color: m.isArchived ? '#64748b' : '#15803d',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {m.isArchived ? <FolderCheck size={18} /> : <Cloud size={18} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {m.label} ({m.month})
                        {m.isArchived ? (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#dcfce7', color: '#15803d' }}>
                            Đã lưu trữ Google Drive ✓
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: '#fef3c7', color: '#92400e' }}>
                            Đang hoạt động trên Supabase
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Tổng số: <strong>{m.totalOrders} đơn hàng</strong> | File trên Drive: <strong>{m.driveFiles}</strong> | File trên Supabase: <strong>{m.supabaseFiles}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {m.isArchived ? (
                      <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={16} /> An toàn
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleArchiveMonth(m.month, m.label)}
                        disabled={isArchiving}
                        style={{ 
                          padding: '8px 14px', borderRadius: '8px', border: 'none',
                          background: isCurrentAction ? '#94a3b8' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                          color: '#fff', fontSize: '12.5px', fontWeight: 700, cursor: isArchiving ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        {isCurrentAction ? (
                          <>
                            <Loader2 size={14} className="animate-spin" /> Đang lưu trữ...
                          </>
                        ) : (
                          <>
                            Đóng sổ & Chuyển sang Drive <ArrowRight size={14} />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
