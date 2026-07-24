import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle2, XCircle, Clock3,
  Plus, Trash2, RefreshCw, User,
  FileText, AlertCircle, Search, Info, X, Users, CheckSquare,
  ChevronRight, Calendar, UserCheck, ShieldAlert, Send, FileCheck, ArrowRight
} from 'lucide-react';
import { HrLeaveRequestRow, ProfileRow } from '../types';
import * as apiService from '../services/apiService';

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
    if (!reason.trim()) return setError('Vui lòng nhập lý do cụ thể.');
    setLoading(true); setError('');
    const { error: err } = await apiService.submitHrLeaveRequest({
      requester_name: profile.full_name,
      requester_username: username,
      requester_id: profile.id || null,
      type,
      start_date: startDate,
      end_date: type === 'nghi_phep' ? (endDate || startDate) : null,
      late_time: type === 'di_tre' ? lateTime : null,
      session: type === 'nghi_phep' ? session : null,
      reason: reason.trim()
    });
    setLoading(false);
    if (err) return setError('Lỗi gửi yêu cầu: ' + err.message);
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
  staffProfiles
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'nghi_phep' | 'di_tre'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

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
    if (isTPKD && currentProfile?.department) {
      const deptStaffUsernames = new Set(
        staffProfiles
          .filter(s => s.department === currentProfile.department)
          .map(s => s.email?.trim().toLowerCase() || s.id)
      );
      return requests.filter(r => deptStaffUsernames.has(r.requester_username.toLowerCase()));
    }
    return requests.filter(r => r.requester_username.toLowerCase() === currentUsername.toLowerCase());
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden', padding: '16px 24px' }}>
      
      {/* ── MAIN WORKSPACE MASTER-DETAIL 2-COLUMNS ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', minHeight: 0 }}>
        
        {/* LEFT COLUMN: REQUEST LIST TABLE */}
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Toolbar & Filters */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            
            {/* Segmented Filter Pills */}
            <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '10px' }}>
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  style={{
                    padding: '5px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: filter === tab.key ? 700 : 500,
                    background: filter === tab.key ? '#ffffff' : 'transparent',
                    color: filter === tab.key ? '#0f766e' : '#64748b',
                    boxShadow: filter === tab.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '4px'
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
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value as any)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#fff', color: '#0f172a', outline: 'none' }}
              >
                <option value="all">Tất cả loại</option>
                <option value="nghi_phep">Nghỉ phép</option>
                <option value="di_tre">Đi trễ</option>
              </select>

              {hasPrivilege && (
                <div style={{ position: 'relative', width: '160px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    value={searchQ} 
                    onChange={e => setSearchQ(e.target.value)} 
                    placeholder="Tìm tên, lý do..." 
                    style={{ width: '100%', padding: '6px 10px 6px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', background: '#fff', outline: 'none' }} 
                  />
                </div>
              )}

              <button onClick={handleReload} title="Tải lại dữ liệu" style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={14} className={isReloading ? "spin-animation" : ""} />
              </button>

              <button 
                onClick={() => setShowSubmit(true)} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', 
                  borderRadius: '8px', border: 'none', background: '#0f766e', color: '#fff', 
                  fontSize: '12.5px', fontWeight: 700, cursor: 'pointer', 
                  boxShadow: '0 2px 6px rgba(15, 118, 110, 0.2)' 
                }}
              >
                <Plus size={15} strokeWidth={2.5} /> Gửi yêu cầu mới
              </button>
            </div>
          </div>

          {/* List Rows */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
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
                      onClick={() => setSelectedId(req.id)}
                      style={{
                        padding: '14px 18px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        background: isSelected ? '#ecfdf5' : '#ffffff',
                        borderLeft: isSelected ? '4px solid #0f766e' : '4px solid transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '50%', 
                          background: isSelected ? '#0f766e' : '#f1f5f9', 
                          color: isSelected ? '#ffffff' : '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '14px', flexShrink: 0
                        }}>
                          {initial}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px', color: isSelected ? '#0f766e' : '#0f172a', fontWeight: 700 }}>{req.requester_name}</strong>
                            <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {TYPE_LABEL[req.type]}
                            </span>
                          </div>
                          <span style={{ fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                            "{req.reason}"
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                            {fmtDate(req.start_date)}
                            {req.end_date && req.end_date !== req.start_date ? ` → ${fmtDate(req.end_date)}` : ''}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {req.type === 'di_tre' ? `Đến: ${req.late_time}` : (req.session ? SESSION_LABEL[req.session] : 'Cả ngày')}
                          </span>
                        </div>

                        <StatusBadge status={req.status} />
                        <ChevronRight size={16} style={{ color: isSelected ? '#0f766e' : '#cbd5e1' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILS & APPROVAL PANEL */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                    <div style={{ 
                      width: '44px', height: '44px', borderRadius: '50%', 
                      background: '#ffffff', color: '#0f766e', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontSize: '18px', 
                      fontWeight: 700, flexShrink: 0
                    }}>
                      {selectedReq.requester_name.trim().charAt(0).toUpperCase()}
                    </div>
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

      </div>

      {/* ── MODALS ── */}
      {showSubmit && currentProfile && (
        <SubmitModal
          profile={currentProfile}
          username={currentUsername}
          onClose={() => setShowSubmit(false)}
          onSuccess={onReload}
        />
      )}
    </div>
  );
};
