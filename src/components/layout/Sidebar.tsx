import React from 'react';
import { UserRound, LogOut, LockKeyhole, User, Calculator, type LucideIcon } from 'lucide-react';
import { TabKey, getVisibleTabs, roleLabels } from '../../constants';
import { ProfileRow } from '../../types';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (key: TabKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  profile: ProfileRow | null;
  visibleTabs: { key: TabKey; label: string; icon: LucideIcon }[];
  userEmail?: string;
  onSignOut: () => void;
  onChangePassword: () => void;
  onEditProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  profile,
  visibleTabs,
  userEmail,
  onSignOut
}) => {
  const tabs = visibleTabs.length ? visibleTabs : getVisibleTabs(profile?.role ?? 'sales');

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="brand-icon">
            <path d="M4 7l8 10 8-10" />
            <path d="M12 2v20" />
            <path d="M8 7h8" />
          </svg>
        </div>
        <div className="brand-text">
          <strong className="brand-title">VF KIM SƠN</strong>
          <span className="brand-subtitle">TRẢNG DÀI</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Điều hướng chính">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={isActive ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setActiveTab(tab.key as TabKey);
                setSidebarOpen(false);
              }}
              title={tab.label}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
        {/* User Profile Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)' }}>
            <UserRound size={19} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name ?? userEmail ?? 'Người dùng'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7', marginTop: '1px' }}>
              {profile ? roleLabels[profile.role] : 'Hỗ Trợ Web'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button 
          onClick={onSignOut}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px 12px', borderRadius: '12px', border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', outline: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.borderColor = '#fda4af'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fecdd3'; }}
        >
          <LogOut size={16} strokeWidth={2.2} /> Đăng xuất
        </button>
      </div>
    </aside>
  );
};
