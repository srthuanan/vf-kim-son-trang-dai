import React from 'react';
import {
  BadgePlus,
  Mail,
  ShieldCheck,
  Trash2,
  RotateCw,
  Users,
  Search,
  Plus,
  X,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ProfileRow } from '../types';
import { cancelStaffInvite, inviteStaffMember, resendStaffInvite, updateStaffPermission } from '../services/apiService';
import { roleLabels } from '../constants';

type StaffPanelProps = {
  staff: ProfileRow[];
  currentProfile: ProfileRow | null;
  onReload: () => Promise<boolean>;
  onEditProfile?: () => void;
  onChangePassword?: () => void;
};

export const StaffPanel: React.FC<StaffPanelProps> = ({ staff, currentProfile, onReload }) => {
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'sales' | 'manager'>('sales');
  const [department, setDepartment] = React.useState('');
  const [inviteManagerId, setInviteManagerId] = React.useState('');
  
  const [permissionRole, setPermissionRole] = React.useState<'sales' | 'manager'>('sales');
  const [permissionDepartment, setPermissionDepartment] = React.useState('');
  const [permissionManagerId, setPermissionManagerId] = React.useState('');
  const [permissionLoading, setPermissionLoading] = React.useState(false);
  
  const [query, setQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');
  const [selectedEmail, setSelectedEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rowAction, setRowAction] = React.useState<{ email: string; action: 'resend' | 'cancel' } | null>(null);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const getStatusLabel = (item: ProfileRow) => {
    if (item.activated_at || item.invite_status === 'active') return 'Đã kích hoạt';
    if (item.invite_status === 'recovery_sent') return 'Đã gửi link';
    if (item.invite_status === 'invite_sent') return 'Đã gửi lời mời';
    if (item.invite_status === 'canceled') return 'Đã hủy mời';
    return 'Chưa kích hoạt';
  };

  const getRowEmail = (item: ProfileRow) => item.email?.trim().toLowerCase() || item.id;

  const isAdmin = currentProfile?.role === 'admin';
  const isManager = currentProfile?.role === 'manager';
  const isSales = currentProfile?.role === 'sales';
  const isPersonalView = isSales;

  const managerOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return staff
      .filter((item) => item.role === 'manager' && item.department?.trim())
      .map((item) => ({
        id: item.id,
        department: item.department!.trim(),
        label: `${item.full_name} · ${item.department!.trim()}`
      }))
      .filter((item) => {
        const key = item.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [staff]);

  const getManagerLabel = (managerId?: string | null) => {
    if (!managerId) return '';
    return managerOptions.find((item) => item.id === managerId)?.label || '';
  };

  const visibleStaff = React.useMemo(() => {
    const activeStaff = staff.filter(item => item.invite_status !== 'canceled');

    if (isAdmin) {
      return activeStaff;
    }

    if (isManager && currentProfile) {
      return activeStaff.filter(
        (item) =>
          item.department === currentProfile.department &&
          currentProfile.department !== null &&
          currentProfile.department !== ''
      );
    }

    if (isSales && currentProfile) {
      return activeStaff.filter((item) => item.id === currentProfile.id);
    }

    return [];
  }, [currentProfile, isAdmin, isManager, isSales, staff]);

  const filteredStaff = React.useMemo(() => {
    let result = visibleStaff;

    if (roleFilter !== 'all') {
      if (roleFilter === 'pending') {
        result = result.filter(item => !item.activated_at && item.invite_status !== 'active');
      } else {
        result = result.filter(item => item.role === roleFilter);
      }
    }

    const normalized = query.trim().toLowerCase();
    if (normalized) {
      result = result.filter((item) => {
        const email = item.email?.toLowerCase() || item.id.toLowerCase();
        return (
          item.full_name.toLowerCase().includes(normalized) ||
          (item.department || '').toLowerCase().includes(normalized) ||
          email.includes(normalized) ||
          roleLabels[item.role].toLowerCase().includes(normalized) ||
          getStatusLabel(item).toLowerCase().includes(normalized)
        );
      });
    }

    return result;
  }, [query, roleFilter, visibleStaff]);

  const selectedStaff = React.useMemo(
    () => filteredStaff.find((item) => getRowEmail(item) === selectedEmail) || filteredStaff[0] || null,
    [filteredStaff, selectedEmail]
  );

  React.useEffect(() => {
    if (!selectedStaff) return;
    setPermissionRole(selectedStaff.role === 'manager' ? 'manager' : 'sales');
    setPermissionDepartment(selectedStaff.department || '');
    setPermissionManagerId(selectedStaff.manager_id || '');
  }, [selectedStaff]);

  React.useEffect(() => {
    if (inviteRole === 'sales') {
      setDepartment('');
    } else {
      setInviteManagerId('');
    }
  }, [inviteRole]);

  React.useEffect(() => {
    if (!filteredStaff.length) {
      setSelectedEmail('');
      return;
    }
    if (!selectedEmail || !filteredStaff.some((item) => getRowEmail(item) === selectedEmail)) {
      setSelectedEmail(getRowEmail(filteredStaff[0]));
    }
  }, [filteredStaff, selectedEmail]);

  const runStaffAction = async (
    action: 'resend' | 'cancel',
    item: ProfileRow,
    handler: typeof resendStaffInvite
  ) => {
    const email = getRowEmail(item);
    setRowAction({ email, action });
    setSuccess('');
    setError('');

    try {
      const { data, error: actionError } = await handler({
        email: item.email || '',
        fullName: item.full_name || '',
        role: item.role === 'manager' ? 'manager' : 'sales',
        department: item.department || null,
        managerId: item.manager_id || null,
        staffId: item.id
      });

      if (actionError) {
        throw actionError;
      }

      const delivery = (data as any)?.delivery;
      const status = (data as any)?.status;
      if (status === 'canceled') {
        setSuccess('Đã hủy mời nhân sự.');
      } else {
        setSuccess(delivery === 'recovery' ? 'Đã gửi lại link đặt mật khẩu.' : 'Đã gửi lại email kích hoạt.');
      }
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể xử lý lời mời.');
    } finally {
      setRowAction(null);
    }
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const { data, error: inviteError } = await inviteStaffMember({
        email: email.trim(),
        fullName: fullName.trim(),
        role: inviteRole,
        department: inviteRole === 'manager' ? department.trim() || null : null,
        managerId: inviteRole === 'sales' ? inviteManagerId || null : null
      });

      if (inviteError) {
        throw inviteError;
      }

      setEmail('');
      setFullName('');
      setInviteManagerId('');
      setDepartment('');
      const delivery = (data as any)?.delivery;
      setSuccess(
        delivery === 'recovery'
          ? 'Email đã tồn tại, mình đã gửi link đặt mật khẩu.'
          : inviteRole === 'manager'
            ? 'Đã gửi email kích hoạt tài khoản TPKD.'
            : 'Đã gửi email kích hoạt tài khoản TVBH.'
      );
      setDrawerOpen(false);
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo tài khoản nhân sự.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSavePermission = async () => {
    if (!selectedStaff || selectedStaff.role === 'admin') return;

    setPermissionLoading(true);
    setSuccess('');
    setError('');

    try {
      const { error: updateError } = await updateStaffPermission({
        staffId: selectedStaff.id,
        email: selectedStaff.email || getRowEmail(selectedStaff),
        fullName: selectedStaff.full_name.trim(),
        role: permissionRole,
        department: permissionRole === 'manager' ? permissionDepartment.trim() || null : null,
        managerId: permissionRole === 'sales' ? permissionManagerId || null : null
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(`Đã cập nhật phân quyền cho ${selectedStaff.full_name}.`);
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật phân quyền.');
    } finally {
      setPermissionLoading(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', overflow: 'hidden', background: '#f8fafc', padding: '16px' }}>
      
      {/* STATUS NOTIFICATIONS */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} style={{ color: '#ef4444' }} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} style={{ color: '#16a34a' }} /> {success}
        </div>
      )}

      {/* PERSONAL VIEW FOR SALES ROLE */}
      {isPersonalView && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#0f766e', fontWeight: 700, textTransform: 'uppercase' }}>Hồ sơ nhân sự cá nhân</span>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '2px 0 0 0' }}>{currentProfile?.full_name || 'Đang tải...'}</h2>
            </div>
          </div>
          <div style={{ padding: '16px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Họ & Tên</span>
              <strong style={{ display: 'block', marginTop: '2px', color: '#0f172a', fontSize: '14px' }}>{currentProfile?.full_name || '---'}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Email</span>
              <strong style={{ display: 'block', marginTop: '2px', color: '#0f172a', fontSize: '14px' }}>{currentProfile?.email || '---'}</strong>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Phòng ban</span>
              <strong style={{ display: 'block', marginTop: '2px', color: '#0f172a', fontSize: '14px' }}>{currentProfile?.department || 'Chưa gán'}</strong>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN & MANAGER DUAL PANE WORKSPACE */}
      {!isPersonalView && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
          
          {/* LEFT PANEL: STAFF DATA TABLE */}
          <div style={{ 
            background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', 
            overflow: 'hidden'
          }}>
            
            {/* Clean Header Toolbar */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '260px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm tên, email..."
                    style={{ width: '100%', padding: '6px 10px 6px 30px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                {/* Role Filter Buttons */}
                <div style={{ display: 'flex', gap: '3px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                  {[
                    { key: 'all', label: 'Tất cả' },
                    { key: 'manager', label: 'TPKD' },
                    { key: 'sales', label: 'TVBH' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setRoleFilter(filter.key)}
                      style={{
                        padding: '4px 9px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: roleFilter === filter.key ? 700 : 500,
                        background: roleFilter === filter.key ? '#ffffff' : 'transparent',
                        color: roleFilter === filter.key ? '#0f766e' : '#64748b',
                        boxShadow: roleFilter === filter.key ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <button 
                  onClick={() => setDrawerOpen(true)}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', background: '#0f766e', 
                    color: '#ffffff', border: '0', borderRadius: '8px', padding: '7px 14px', 
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer' 
                  }}
                >
                  <Plus size={15} />
                  Mời nhân sự
                </button>
              )}
            </div>

            {/* Staff Data Table */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredStaff.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                  <Users size={30} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <p style={{ fontWeight: 600, margin: 0, fontSize: '13px' }}>Không có nhân sự nào</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.03em' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Họ & Tên</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Phòng ban</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Quyền hạn</th>
                      <th style={{ padding: '10px 14px', fontWeight: 700 }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((item) => {
                      const emailVal = getRowEmail(item);
                      const isSelected = selectedStaff?.id === item.id;
                      const initial = item.full_name.trim().charAt(0).toUpperCase();

                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedEmail(emailVal)}
                          style={{ 
                            borderBottom: '1px solid #f1f5f9', cursor: 'pointer', 
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            borderLeft: isSelected ? '3px solid #0f766e' : '3px solid transparent'
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', 
                                background: isSelected ? '#0f766e' : '#f1f5f9', 
                                color: isSelected ? '#ffffff' : '#475569',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '13px', flexShrink: 0
                              }}>
                                {initial}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <strong style={{ fontSize: '13.5px', color: isSelected ? '#0f766e' : '#0f172a', fontWeight: 600 }}>{item.full_name}</strong>
                                <span style={{ fontSize: '11.5px', color: '#64748b' }}>{emailVal}</span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>
                              {item.department || 'Chưa gán'}
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <span style={{
                              fontSize: '11.5px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                              background: item.role === 'admin' ? '#f3e8ff' : item.role === 'manager' ? '#e0f2fe' : '#ccfbf1',
                              color: item.role === 'admin' ? '#7e22ce' : item.role === 'manager' ? '#0369a1' : '#0f766e'
                            }}>
                              {roleLabels[item.role]}
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{
                                width: '6px', height: '6px', borderRadius: '50%',
                                background: (item.activated_at || item.invite_status === 'active') ? '#10b981' : item.invite_status === 'canceled' ? '#ef4444' : '#f59e0b'
                              }} />
                              <span style={{ fontSize: '12px', color: '#475569' }}>
                                {getStatusLabel(item)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: STAFF DETAILS CARD */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {selectedStaff ? (
              <div style={{ 
                background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', height: '100%' 
              }}>
                
                {/* Header Banner */}
                <div style={{ 
                  background: '#0f766e', padding: '16px', color: '#ffffff',
                  display: 'flex', flexDirection: 'column', gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '44px', height: '44px', borderRadius: '50%', 
                      background: '#ffffff', color: '#0f766e', display: 'flex', 
                      alignItems: 'center', justifyContent: 'center', fontSize: '18px', 
                      fontWeight: 700, flexShrink: 0
                    }}>
                      {selectedStaff.full_name.trim().charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedStaff.full_name}
                      </h3>
                      <div 
                        onClick={() => copyToClipboard(getRowEmail(selectedStaff))}
                        style={{ fontSize: '11.5px', color: '#ccfbf1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                      >
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getRowEmail(selectedStaff)}</span>
                        <Copy size={11} />
                      </div>
                    </div>
                  </div>

                  {/* Header Badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: (selectedStaff.activated_at || selectedStaff.invite_status === 'active') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                      color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600
                    }}>
                      {(selectedStaff.activated_at || selectedStaff.invite_status === 'active') ? '✓ Đã kích hoạt' : '⌛ Chờ kích hoạt'}
                    </span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                      {roleLabels[selectedStaff.role]}
                    </span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#ffffff', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600 }}>
                      {selectedStaff.department || 'Chưa gán phòng'}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
                  
                  {/* Section 1: Thông tin cá nhân */}
                  <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      Thông tin cá nhân
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Số điện thoại</div>
                        <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>{selectedStaff.phone || 'Chưa cập nhật'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Giới tính</div>
                        <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>{selectedStaff.gender || 'Chưa cập nhật'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Ngày sinh</div>
                        <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600 }}>
                          {selectedStaff.dob ? new Date(selectedStaff.dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Địa chỉ</div>
                        <div style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={selectedStaff.address || ''}>
                          {selectedStaff.address || 'Chưa cập nhật'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Sửa phân quyền (Admin Only) */}
                  {isAdmin && selectedStaff.role !== 'admin' ? (
                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 700, textTransform: 'uppercase' }}>Phân quyền</span>
                        <ShieldCheck size={14} style={{ color: '#0f766e' }} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600, marginBottom: '2px', display: 'block' }}>Vai trò</label>
                          <select
                            value={permissionRole}
                            onChange={(event) => {
                              const nextRole = event.target.value as 'sales' | 'manager';
                              setPermissionRole(nextRole);
                              if (nextRole === 'sales') {
                                setPermissionDepartment('');
                                setPermissionManagerId('');
                              }
                            }}
                            disabled={permissionLoading}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px', background: '#fff' }}
                          >
                            <option value="sales">TVBH</option>
                            <option value="manager">TPKD</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '10.5px', color: '#475569', fontWeight: 600, marginBottom: '2px', display: 'block' }}>
                            {permissionRole === 'sales' ? 'TPKD phụ trách' : 'Phòng ban'}
                          </label>
                          {permissionRole === 'sales' ? (
                            <select
                              value={permissionManagerId}
                              onChange={(event) => {
                                const nextManagerId = event.target.value;
                                setPermissionManagerId(nextManagerId);
                                const nextManager = managerOptions.find((item) => item.id === nextManagerId);
                                setPermissionDepartment(nextManager?.department || '');
                              }}
                              disabled={permissionLoading}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px', background: '#fff' }}
                            >
                              <option value="">Chọn TPKD</option>
                              {managerOptions.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={permissionDepartment}
                              onChange={(event) => setPermissionDepartment(event.target.value)}
                              disabled={permissionLoading}
                              placeholder="VD: PKD 1"
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12.5px' }}
                            />
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSavePermission}
                        disabled={permissionLoading}
                        style={{ 
                          width: '100%', border: 0, background: '#0f766e', color: '#fff', 
                          padding: '7px 10px', borderRadius: '6px', fontWeight: 600, 
                          fontSize: '12.5px', cursor: 'pointer'
                        }}
                      >
                        {permissionLoading ? 'Đang lưu...' : 'Lưu thay đổi phân quyền'}
                      </button>
                    </div>
                  ) : null}

                  {/* Section 3: Lịch sử tài khoản & Kích hoạt */}
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Gửi lời mời</span>
                      <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: 600, display: 'block', marginTop: '1px' }}>
                        {selectedStaff.invited_at ? new Date(selectedStaff.invited_at).toLocaleDateString('vi-VN') : '---'}
                      </span>
                    </div>
                    <div style={{ width: '1px', background: '#cbd5e1' }} />
                    <div style={{ flex: 1.2 }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Kích hoạt tài khoản</span>
                      <span style={{ fontSize: '12px', color: selectedStaff.activated_at ? '#16a34a' : '#64748b', fontWeight: 600, display: 'block', marginTop: '1px' }}>
                        {selectedStaff.activated_at ? `✅ ${new Date(selectedStaff.activated_at).toLocaleString('vi-VN')}` : '⌛ Chờ kích hoạt'}
                      </span>
                    </div>
                  </div>

                  {/* Section 3: Action Buttons */}
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {isAdmin && (
                      <>
                        {selectedStaff.invite_status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => runStaffAction('resend', selectedStaff, resendStaffInvite)}
                            disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend'}
                            style={{ 
                              width: '100%', background: '#ffffff', border: '1px solid #cbd5e1', 
                              borderRadius: '8px', padding: '8px', fontSize: '12.5px', 
                              color: '#0f172a', fontWeight: 600, display: 'flex', 
                              alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' 
                            }}
                          >
                            <RotateCw size={13} />
                            <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend' ? 'Đang gửi...' : 'Gửi lại Email kích hoạt'}</span>
                          </button>
                        )}

                        {selectedStaff.id !== currentProfile?.id && selectedStaff.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự ${selectedStaff.full_name}?`)) {
                                runStaffAction('cancel', selectedStaff, cancelStaffInvite);
                              }
                            }}
                            disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel'}
                            style={{ 
                              width: '100%', background: '#fef2f2', border: '1px solid #fecaca', 
                              borderRadius: '8px', padding: '8px', fontSize: '12.5px', 
                              color: '#dc2626', fontWeight: 600, display: 'flex', 
                              alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' 
                            }}
                          >
                            <Trash2 size={13} />
                            <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel' ? 'Đang xóa...' : 'Xóa tài khoản nhân sự'}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div style={{ border: '2px dashed #cbd5e1', borderRadius: '14px', padding: '30px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <Users size={28} style={{ marginBottom: '6px' }} />
                <strong style={{ display: 'block', fontSize: '13px' }}>Chọn một nhân sự từ danh sách</strong>
              </div>
            )}
          </div>

        </div>
      )}

      {/* DRAWER: MỜI NHÂN SỰ MỚI */}
      {drawerOpen && isAdmin && (
        <>
          <div 
            onClick={() => !loading && setDrawerOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
          />
          
          <div style={{ 
            position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: '400px', 
            background: '#ffffff', zIndex: 1001, boxShadow: '-5px 0 25px rgba(0,0,0,0.15)', 
            display: 'flex', flexDirection: 'column' 
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BadgePlus size={16} style={{ color: '#0f766e' }} />
                <strong style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>Mời nhân sự mới</strong>
              </div>
              <button onClick={() => setDrawerOpen(false)} disabled={loading} style={{ border: '0', background: 'transparent', cursor: 'pointer', padding: '4px', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Họ và Tên *</label>
                <input 
                  value={fullName} 
                  onChange={(event) => setFullName(event.target.value)} 
                  placeholder="VD: Nguyễn Anh Tuấn" 
                  required 
                  disabled={loading}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Email công việc *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="email"
                    value={email} 
                    onChange={(event) => setEmail(event.target.value)} 
                    placeholder="nhanvien@vinfast.vn" 
                    required 
                    disabled={loading}
                    style={{ width: '100%', padding: '8px 10px 8px 32px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>Vai trò</label>
                  <select
                    value={inviteRole}
                    onChange={(event) => {
                      const nextRole = event.target.value as 'sales' | 'manager';
                      setInviteRole(nextRole);
                      if (nextRole === 'sales') {
                        setDepartment('');
                        setInviteManagerId('');
                      }
                    }}
                    disabled={loading}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}
                  >
                    <option value="sales">TVBH</option>
                    <option value="manager">TPKD</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                    {inviteRole === 'sales' ? 'TPKD phụ trách' : 'Phòng ban'}
                  </label>
                  {inviteRole === 'sales' ? (
                    <select
                      value={inviteManagerId}
                      onChange={(event) => {
                        const nextManagerId = event.target.value;
                        setInviteManagerId(nextManagerId);
                        const nextManager = managerOptions.find((item) => item.id === nextManagerId);
                        setDepartment(nextManager?.department || '');
                      }}
                      disabled={loading}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#fff' }}
                    >
                      <option value="">Chọn TPKD</option>
                      {managerOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="VD: PKD 1"
                      disabled={loading}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                    />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setDrawerOpen(false)}
                  disabled={loading}
                  style={{ flex: 1, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', padding: '9px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ flex: 1.5, border: 0, background: '#0f766e', color: '#fff', padding: '9px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {loading ? 'Đang gửi...' : <><Send size={14} /> Gửi lời mời</>}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

    </section>
  );
};
