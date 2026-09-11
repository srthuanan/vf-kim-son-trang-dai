import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, LockKeyhole, User, Calculator, type LucideIcon } from 'lucide-react';
import { TabKey, getVisibleTabs, roleLabels } from '../../constants';
import { ProfileRow } from '../../types';
import { getUserSessionAvatar, refreshUserSessionAvatar } from '../../utils/avatarUtils';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (key: TabKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  profile: ProfileRow | null;
  visibleTabs: { key: TabKey; label: string; icon: LucideIcon }[];
  userEmail?: string;
  pendingInvoicesCount?: number;
  onSignOut: () => void;
  onChangePassword: () => void;
  onEditProfile: () => void;
}

/**
 * Kiểm tra xem ngày hiện tại có nằm trong mùa Tết Trung Thu hay không.
 * Mùa Trung Thu 2026: Từ 01/09/2026 đến hết 05/10/2026.
 * Khi hết thời gian này, toàn bộ giao diện sẽ TỰ ĐỘNG trở về bình thường 100%.
 */
export const isMidAutumnSeason = (): boolean => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const date = now.getDate();

  if (year === 2026) {
    if (month === 9) return true; // Toàn bộ tháng 9
    if (month === 10 && date <= 5) return true; // Đến hết ngày 05/10
  }
  return false;
};

// SVG Vầng Trăng Rằm Mini
export const SvgMiniMoon: React.FC = () => (
  <svg viewBox="0 0 20 20" width="14" height="14" style={{ overflow: 'visible', verticalAlign: 'middle', display: 'inline-block' }}>
    <defs>
      <radialGradient id="mini-moon-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="35%" stopColor="#fef08a" />
        <stop offset="80%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </radialGradient>
    </defs>
    <circle cx="10" cy="10" r="7.5" fill="url(#mini-moon-glow)" filter="drop-shadow(0 0 4px #fbbf24)" />
    <path d="M4 12 C6 10 9 10 11 12" fill="none" stroke="#fed7aa" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

// SVG Bánh Trung Thu Hoàng Kim 8 Cánh
export const SvgMooncake: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" width="19" height="19" className={className} style={{ overflow: 'visible', flexShrink: 0 }}>
    <defs>
      <radialGradient id="mc-crust" cx="50%" cy="45%" r="50%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#f59e0b" />
        <stop offset="85%" stopColor="#b45309" />
        <stop offset="100%" stopColor="#78350f" />
      </radialGradient>
      <linearGradient id="mc-line" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef3c7" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" fill="url(#mc-crust)" stroke="#78350f" strokeWidth="0.6" filter="drop-shadow(0 2px 4px rgba(120,53,15,0.4))" />
    <circle cx="12" cy="12" r="8" fill="none" stroke="url(#mc-line)" strokeWidth="0.8" strokeDasharray="2.5 1.5" />
    <path d="M12 5 C10 8 10 9 12 12 C14 9 14 8 12 5 Z" fill="#d97706" opacity="0.85" />
    <path d="M12 19 C10 16 10 15 12 12 C14 15 14 16 12 19 Z" fill="#d97706" opacity="0.85" />
    <path d="M5 12 C8 10 9 10 12 12 C9 14 8 14 5 12 Z" fill="#d97706" opacity="0.85" />
    <path d="M19 12 C16 10 15 10 12 12 C15 14 16 14 19 12 Z" fill="#d97706" opacity="0.85" />
    <circle cx="12" cy="12" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="0.6" />
  </svg>
);

// SVG Dải Lồng Đèn Cung Đình Treo Tinh Xảo
const SvgLanternGarland: React.FC = () => (
  <svg viewBox="0 0 180 30" width="100%" height="24" style={{ overflow: 'visible' }}>
    <defs>
      <linearGradient id="gg-wire" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.2" />
      </linearGradient>
      <linearGradient id="gg-red" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="60%" stopColor="#dc2626" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
      <linearGradient id="gg-gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <path d="M10 6 Q50 14 90 7 Q130 14 170 6" fill="none" stroke="url(#gg-wire)" strokeWidth="1" strokeDasharray="3 2" />
    
    <g transform="translate(48, 10)" className="ma-anim-lantern">
      <line x1="0" y1="0" x2="0" y2="4" stroke="#f59e0b" strokeWidth="1" />
      <rect x="-3" y="4" width="6" height="1.5" rx="0.5" fill="url(#gg-gold)" />
      <ellipse cx="0" cy="9" rx="4" ry="4.5" fill="url(#gg-gold)" />
      <rect x="-2.5" y="13.5" width="5" height="1" rx="0.5" fill="#78350f" />
      <line x1="0" y1="14.5" x2="0" y2="20" stroke="#ef4444" strokeWidth="1" />
    </g>

    <g transform="translate(90, 8)" className="ma-anim-lantern" style={{ animationDelay: '0.4s' }}>
      <line x1="0" y1="0" x2="0" y2="4" stroke="#f59e0b" strokeWidth="1.2" />
      <rect x="-4" y="4" width="8" height="1.8" rx="0.5" fill="url(#gg-gold)" />
      <ellipse cx="0" cy="11" rx="5.5" ry="5.5" fill="url(#gg-red)" filter="drop-shadow(0 0 4px rgba(220,38,38,0.5))" />
      <ellipse cx="0" cy="11" rx="2" ry="3" fill="#fef08a" opacity="0.8" className="ma-anim-candle" />
      <rect x="-3.5" y="16.5" width="7" height="1.5" rx="0.5" fill="url(#gg-gold)" />
      <line x1="0" y1="18" x2="0" y2="26" stroke="#ef4444" strokeWidth="1.2" />
      <circle cx="0" cy="19" r="1" fill="url(#gg-gold)" />
    </g>

    <g transform="translate(132, 10)" className="ma-anim-lantern" style={{ animationDelay: '0.8s' }}>
      <line x1="0" y1="0" x2="0" y2="4" stroke="#f59e0b" strokeWidth="1" />
      <rect x="-3" y="4" width="6" height="1.5" rx="0.5" fill="url(#gg-gold)" />
      <ellipse cx="0" cy="9" rx="4" ry="4.5" fill="url(#gg-gold)" />
      <rect x="-2.5" y="13.5" width="5" height="1" rx="0.5" fill="#78350f" />
      <line x1="0" y1="14.5" x2="0" y2="20" stroke="#ef4444" strokeWidth="1" />
    </g>
  </svg>
);

// Cậu Bé Trung Thu Hoạt Hình - cầm đèn lồng, nón lá, đung đưa vui tươi
const SvgMidAutumnBoy: React.FC = () => (
  <svg viewBox="0 0 88 62" width="80" height="56" style={{ overflow: 'visible' }}>
    <defs>
      {/* Gradients cậu bé */}
      <linearGradient id="mb-skin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fed7aa" />
        <stop offset="100%" stopColor="#fb923c" />
      </linearGradient>
      <linearGradient id="mb-shirt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#9a3412" />
      </linearGradient>
      <linearGradient id="mb-lantern" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <radialGradient id="mb-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </radialGradient>
      {/* Gradients thỏ */}
      <linearGradient id="rb-fur" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#e2e8f0" />
      </linearGradient>
      <linearGradient id="rb-ear" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fda4af" />
        <stop offset="100%" stopColor="#fecdd3" />
      </linearGradient>
      <filter id="mb-shadow">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#7c2d12" floodOpacity="0.2"/>
      </filter>
      <style>{`
        @keyframes mbBounce  { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-2px)} }
        @keyframes mbRabJump { 0%,100%{transform:translateY(0) rotate(0deg)} 40%{transform:translateY(-6px) rotate(-6deg)} 60%{transform:translateY(-4px) rotate(4deg)} }
        @keyframes mbEarWig  { 0%,100%{transform:rotate(0deg)}  50%{transform:rotate(10deg)} }
        @keyframes mbFlicker { 0%,100%{opacity:0.85} 50%{opacity:0.45} }
        @keyframes mbHatTilt { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
        @keyframes mbArmWave { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(4deg)} }
        @keyframes mbLanSwing{ 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(6deg)} }
        @keyframes mbStarPop { 0%,100%{opacity:0; transform:scale(0.5)} 50%{opacity:1; transform:scale(1)} }
        .mb-boy-body  { animation: mbBounce   1.2s ease-in-out infinite; transform-origin: 22px 45px; }
        .mb-hat-g     { animation: mbHatTilt  1.2s ease-in-out infinite; transform-origin: 22px 5px; }
        .mb-arm-l     { animation: mbArmWave  1.2s ease-in-out infinite 0.1s; transform-origin: 14px 29px; }
        .mb-lan-grp   { animation: mbLanSwing 1.2s ease-in-out infinite; transform-origin: 10px 12px; }
        .mb-flame     { animation: mbFlicker  0.8s ease-in-out infinite; }
        .mb-rab-grp   { animation: mbRabJump  1.4s ease-in-out infinite 0.15s; transform-origin: 68px 48px; }
        .mb-ear-l     { animation: mbEarWig   1.0s ease-in-out infinite 0.1s; transform-origin: 62px 36px; }
        .mb-ear-r     { animation: mbEarWig   1.0s ease-in-out infinite 0.25s; transform-origin: 68px 35px; }
        .mb-star-1    { animation: mbStarPop  1.5s ease-in-out infinite 0s; transform-origin: 44px 8px; }
        .mb-star-2    { animation: mbStarPop  1.5s ease-in-out infinite 0.5s; transform-origin: 48px 15px; }
        .mb-star-3    { animation: mbStarPop  1.5s ease-in-out infinite 0.9s; transform-origin: 40px 18px; }
      `}</style>
    </defs>

    {/* ===== CẬU BÉ TRUNG THU (bên trái, đang cúi giơ đèn về phía thỏ) ===== */}
    <g className="mb-boy-body" filter="url(#mb-shadow)">

      {/* Nón lá */}
      <g className="mb-hat-g">
        <ellipse cx="22" cy="10" rx="12" ry="3" fill="#f59e0b" opacity="0.9"/>
        <path d="M11 10 Q22 1 33 10" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6"/>
        <line x1="22" y1="1" x2="22" y2="13" stroke="#d97706" strokeWidth="0.55"/>
        <line x1="14" y1="4" x2="22" y2="13" stroke="#d97706" strokeWidth="0.45" opacity="0.5"/>
        <line x1="30" y1="4" x2="22" y2="13" stroke="#d97706" strokeWidth="0.45" opacity="0.5"/>
        <circle cx="22" cy="1" r="1.3" fill="#b45309"/>
      </g>

      {/* Đầu */}
      <ellipse cx="22" cy="18" rx="7" ry="7" fill="url(#mb-skin)"/>
      <circle cx="18" cy="20" r="1.8" fill="#fca5a5" opacity="0.5"/>
      <circle cx="26" cy="20" r="1.8" fill="#fca5a5" opacity="0.5"/>
      {/* Mắt híp cười */}
      <path d="M18.5 17.5 Q20 16.5 21.5 17.5" stroke="#1e293b" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M22.5 17.5 Q24 16.5 25.5 17.5" stroke="#1e293b" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      {/* Miệng cười to */}
      <path d="M19 21 Q22 24.5 25 21" stroke="#b45309" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <ellipse cx="14.5" cy="18" rx="1.6" ry="2" fill="url(#mb-skin)"/>
      <ellipse cx="29.5" cy="18" rx="1.6" ry="2" fill="url(#mb-skin)"/>

      {/* Cổ */}
      <rect x="20" y="24" width="4" height="3" rx="1" fill="url(#mb-skin)"/>

      {/* Áo dài */}
      <path d="M14 27 Q13 41 14 46 L22 47 L30 46 Q31 41 30 27 Q26 25 22 25 Q18 25 14 27Z" fill="url(#mb-shirt)"/>
      <path d="M19 26 L22 29 L25 26" stroke="#f97316" strokeWidth="0.7" fill="#fef3c7"/>
      <circle cx="22" cy="33" r="1" fill="#fef08a" opacity="0.5"/>
      <circle cx="22" cy="37" r="1" fill="#fef08a" opacity="0.5"/>

      {/* Tay phải (giơ đèn sang phải) */}
      <path d="M30 30 Q35 26 37 22" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <ellipse cx="37" cy="21" rx="2" ry="1.8" fill="url(#mb-skin)"/>

      {/* Tay trái */}
      <g className="mb-arm-l">
        <path d="M14 30 Q10 34 11 38" stroke="#fb923c" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <ellipse cx="11" cy="39" rx="2" ry="1.7" fill="url(#mb-skin)"/>
      </g>

      {/* Quần */}
      <rect x="16" y="45" width="5" height="7" rx="2" fill="#1e40af"/>
      <rect x="21" y="45" width="5" height="7" rx="2" fill="#1e40af"/>
      <ellipse cx="18.5" cy="53" rx="3.8" ry="1.4" fill="#7c2d12"/>
      <ellipse cx="23.5" cy="53" rx="3.8" ry="1.4" fill="#7c2d12"/>
    </g>

    {/* ===== DÂY + ĐÈN LỒNG (giữa, kết nối cậu bé với thỏ) ===== */}
    <g className="mb-lan-grp">
      {/* Dây từ tay cậu bé đến đèn */}
      <path d="M37 21 Q43 10 50 12" stroke="#d97706" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeDasharray="2,1.5"/>
      {/* Hào quang đèn */}
      <circle cx="50" cy="12" r="10" fill="url(#mb-glow)"/>
      {/* Thân đèn lồng */}
      <ellipse cx="50" cy="12" rx="6" ry="7" fill="url(#mb-lantern)" stroke="#b45309" strokeWidth="0.8"/>
      {/* Sườn dọc đèn */}
      <line x1="50" y1="5" x2="50" y2="19" stroke="#d97706" strokeWidth="0.6" opacity="0.6"/>
      <line x1="45" y1="8" x2="55" y2="16" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      <line x1="45" y1="16" x2="55" y2="8" stroke="#d97706" strokeWidth="0.5" opacity="0.4"/>
      {/* Vành đèn */}
      <rect x="46.5" y="4.5" width="7" height="2" rx="0.8" fill="#92400e"/>
      <rect x="46.5" y="18" width="7" height="2" rx="0.8" fill="#92400e"/>
      {/* Tua rua */}
      <line x1="48" y1="20" x2="47" y2="24.5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="50" y1="20.5" x2="50" y2="25.5" stroke="#f59e0b" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="52" y1="20" x2="53" y2="24.5" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round"/>
      {/* Ánh nến */}
      <g className="mb-flame">
        <ellipse cx="50" cy="12" rx="3" ry="3.5" fill="#fef08a" opacity="0.75"/>
        <ellipse cx="50" cy="11" rx="1.5" ry="2" fill="#ffffff" opacity="0.5"/>
      </g>
      {/* Chữ 福 mini trên đèn */}
      <text x="50" y="14" textAnchor="middle" fontSize="5" fill="#7c2d12" fontWeight="bold" opacity="0.7">福</text>
    </g>

    {/* Ngôi sao nhấp nháy giữa hai nhân vật */}
    <g className="mb-star-1"><text x="44" y="10" fontSize="5" fill="#fef08a">✦</text></g>
    <g className="mb-star-2"><text x="46" y="18" fontSize="4" fill="#fbbf24">✦</text></g>
    <g className="mb-star-3"><text x="38" y="20" fontSize="3.5" fill="#fef08a">✦</text></g>

    {/* ===== THỎ NGỌC (bên phải, đang nhảy lên đón đèn) ===== */}
    <g className="mb-rab-grp" filter="url(#mb-shadow)">
      {/* Tai trái */}
      <g className="mb-ear-l">
        <ellipse cx="62" cy="36" rx="2.5" ry="7" fill="url(#rb-fur)" transform="rotate(-18 62 36)"/>
        <ellipse cx="62" cy="36.5" rx="1.3" ry="5" fill="url(#rb-ear)" transform="rotate(-18 62 36.5)"/>
      </g>
      {/* Tai phải */}
      <g className="mb-ear-r">
        <ellipse cx="68" cy="35" rx="2.5" ry="7" fill="url(#rb-fur)" transform="rotate(12 68 35)"/>
        <ellipse cx="68" cy="35.5" rx="1.3" ry="5" fill="url(#rb-ear)" transform="rotate(12 68 35.5)"/>
      </g>
      {/* Đầu thỏ */}
      <circle cx="65" cy="42" r="8" fill="url(#rb-fur)"/>
      {/* Má hồng */}
      <circle cx="61" cy="44" r="2" fill="#fda4af" opacity="0.5"/>
      <circle cx="69" cy="44" r="2" fill="#fda4af" opacity="0.5"/>
      {/* Mắt thỏ ngọc — ánh trăng */}
      <circle cx="63" cy="41" r="2" fill="#fbbf24"/>
      <circle cx="67" cy="41" r="2" fill="#fbbf24"/>
      <circle cx="63" cy="41" r="1.2" fill="#7c2d12"/>
      <circle cx="67" cy="41" r="1.2" fill="#7c2d12"/>
      <circle cx="63.5" cy="40.5" r="0.6" fill="#ffffff"/>
      <circle cx="67.5" cy="40.5" r="0.6" fill="#ffffff"/>
      {/* Mũi + miệng */}
      <ellipse cx="65" cy="44" rx="1" ry="0.7" fill="#fda4af"/>
      <path d="M63.5 44.8 Q65 46.5 66.5 44.8" stroke="#fda4af" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
      {/* Râu thỏ */}
      <line x1="65" y1="44" x2="60" y2="43.5" stroke="#cbd5e1" strokeWidth="0.6"/>
      <line x1="65" y1="44" x2="70" y2="43.5" stroke="#cbd5e1" strokeWidth="0.6"/>
      <line x1="65" y1="44" x2="59" y2="45" stroke="#cbd5e1" strokeWidth="0.6"/>
      <line x1="65" y1="44" x2="71" y2="45" stroke="#cbd5e1" strokeWidth="0.6"/>
      {/* Thân thỏ */}
      <ellipse cx="65" cy="52" rx="8" ry="7" fill="url(#rb-fur)"/>
      {/* Bụng */}
      <ellipse cx="65" cy="54" rx="4.5" ry="4" fill="#f1f5f9" opacity="0.8"/>
      {/* Tay thỏ giơ lên phía đèn */}
      <path d="M57 47 Q53 42 55 38" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <circle cx="55" cy="37" r="2.2" fill="url(#rb-fur)"/>
      {/* Tay thỏ phải */}
      <path d="M73 47 Q76 44 75 42" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
      <circle cx="75" cy="41" r="2.2" fill="url(#rb-fur)"/>
      {/* Chân thỏ */}
      <ellipse cx="60" cy="58" rx="4.5" ry="2.5" fill="url(#rb-fur)"/>
      <ellipse cx="70" cy="58" rx="4.5" ry="2.5" fill="url(#rb-fur)"/>
      {/* Đuôi thỏ */}
      <circle cx="73" cy="51" r="2.5" fill="#ffffff"/>
      {/* Ngọc bội (jade pendant) */}
      <ellipse cx="65" cy="48" rx="2" ry="1.5" fill="#34d399" opacity="0.8" stroke="#059669" strokeWidth="0.5"/>
    </g>
  </svg>
);


// Bức Tranh Nền Động Toàn Cảnh Trung Thu Cho Sidebar
const SidebarMidAutumnBackground: React.FC = () => (
  <div 
    className="sidebar-art-bg"
    style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end'
    }}
  >
    {/* Vầng Trăng Rằm Hoàng Kim phát sáng ở khoảng trống phía dưới menu (không đè lên chữ) */}
    <div style={{ position: 'absolute', top: '60%', right: '-15px', width: '130px', height: '130px', opacity: 0.7 }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="sb-moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#fef08a" stopOpacity="0.5" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#sb-moon-glow)" className="ma-anim-moon" />
        <circle cx="50" cy="50" r="32" fill="#fffbeb" opacity="0.6" filter="drop-shadow(0 0 14px rgba(245, 158, 11, 0.35))" />
        <circle cx="45" cy="45" r="9" fill="#fef08a" opacity="0.25" />
      </svg>
    </div>

    {/* Mây ngũ sắc trôi lượn qua trăng */}
    <div style={{ position: 'absolute', top: '65%', left: '10px', width: '130px', opacity: 0.45 }} className="ma-anim-cloud1">
      <svg viewBox="0 0 120 30" width="100%" height="22">
        <path d="M10 20 Q30 5 60 15 Q80 8 105 18 Q115 25 90 25 Q40 25 10 20 Z" fill="#fed7aa" opacity="0.4" />
      </svg>
    </div>

    <div style={{ position: 'absolute', top: '73%', right: '10px', width: '110px', opacity: 0.4 }} className="ma-anim-cloud2">
      <svg viewBox="0 0 100 25" width="100%" height="18">
        <path d="M5 15 Q25 5 50 12 Q75 6 95 16 Q80 22 45 20 Q15 20 5 15 Z" fill="#fde68a" opacity="0.3" />
      </svg>
    </div>

    {/* Những cánh Thiên Đăng lơ lửng bay từ dưới lên */}
    <div style={{ position: 'absolute', bottom: '18%', left: '16%' }} className="ma-lantern-ascend-1">
      <svg viewBox="0 0 20 26" width="15" height="19">
        <defs>
          <linearGradient id="sb-lt-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <path d="M4 4 Q10 1 16 4 L17 19 Q10 23 3 19 Z" fill="url(#sb-lt-1)" filter="drop-shadow(0 0 5px rgba(245, 158, 11, 0.6))" />
        <ellipse cx="10" cy="19" rx="6" ry="2" fill="#d97706" />
        <circle cx="10" cy="17" r="2.6" fill="#ffffff" />
      </svg>
    </div>

    <div style={{ position: 'absolute', bottom: '26%', right: '22%' }} className="ma-lantern-ascend-2">
      <svg viewBox="0 0 20 26" width="12" height="16">
        <path d="M4 4 Q10 1 16 4 L17 19 Q10 23 3 19 Z" fill="url(#sb-lt-1)" filter="drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))" opacity="0.8" />
        <circle cx="10" cy="17" r="2" fill="#ffffff" />
      </svg>
    </div>

    <div style={{ position: 'absolute', bottom: '34%', left: '42%' }} className="ma-lantern-ascend-3">
      <svg viewBox="0 0 20 26" width="10" height="14">
        <path d="M4 4 Q10 1 16 4 L17 19 Q10 23 3 19 Z" fill="url(#sb-lt-1)" filter="drop-shadow(0 0 3px rgba(245, 158, 11, 0.4))" opacity="0.7" />
        <circle cx="10" cy="17" r="1.6" fill="#ffffff" />
      </svg>
    </div>

    {/* Các đốm sáng đom đóm / tinh tú vàng dạ nguyệt */}
    <div style={{ position: 'absolute', top: '62%', left: '16%' }} className="ma-firefly-1">
      <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 5px #f59e0b' }} />
    </div>
    <div style={{ position: 'absolute', top: '70%', right: '30%' }} className="ma-firefly-2">
      <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#fef08a', boxShadow: '0 0 4px #fbbf24' }} />
    </div>
    <div style={{ position: 'absolute', top: '78%', left: '30%' }} className="ma-firefly-3">
      <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 5px #f59e0b' }} />
    </div>

    {/* Đáy tranh: Dãy núi thuỷ mặc & Nhành trúc cổ kính */}
    <div style={{ width: '100%', height: '140px', marginTop: 'auto', opacity: 0.25 }}>
      <svg viewBox="0 0 250 140" width="100%" height="100%" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sb-mount-1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="sb-mount-2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {/* Lớp núi xa */}
        <path d="M0 140 L0 75 Q40 45 90 65 Q140 40 190 70 Q220 55 250 68 L250 140 Z" fill="url(#sb-mount-1)" />
        {/* Lớp núi gần */}
        <path d="M0 140 L0 95 Q60 60 130 85 Q180 65 250 90 L250 140 Z" fill="url(#sb-mount-2)" />
        {/* Nhành trúc vươn lên */}
        <path d="M25 140 Q35 100 45 80 M45 80 Q32 75 25 78 M45 80 Q55 72 65 76 M40 95 Q25 92 18 96 M40 95 Q52 90 60 94" fill="none" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <path d="M220 140 Q210 105 205 85 M205 85 Q195 80 188 84 M205 85 Q218 78 228 82 M210 102 Q198 98 190 102 M210 102 Q222 96 230 100" fill="none" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      </svg>
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  profile,
  visibleTabs,
  userEmail,
  pendingInvoicesCount = 0,
  onSignOut
}) => {
  const tabs = visibleTabs.length ? visibleTabs : getVisibleTabs(profile?.role ?? 'sales');
  const isMidAutumn = isMidAutumnSeason();

  const currentMonthKey = useMemo(() => new Date().toISOString().substring(0, 7), []);
  const [localRank, setLocalRank] = useState<'gold' | 'silver' | 'bronze' | null>(null);
  const [avatarCounter, setAvatarCounter] = useState(0);

  const userAvatarSvg = useMemo(() => {
    return getUserSessionAvatar(profile?.id || userEmail || 'user', profile?.full_name);
  }, [profile?.id, profile?.full_name, userEmail, avatarCounter]);

  const handleRefreshAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    refreshUserSessionAvatar(profile?.id || userEmail || 'user', profile?.full_name);
    setAvatarCounter(c => c + 1);
  };

  useEffect(() => {
    const checkLocalRank = () => {
      if (!profile?.id) return;
      try {
        const raw = localStorage.getItem(`kpi_awards_${currentMonthKey}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed[profile.id]?.rank) {
            setLocalRank(parsed[profile.id].rank);
          }
        }
      } catch {}
    };
    checkLocalRank();
    window.addEventListener('kpi-rank-updated', checkLocalRank);
    return () => window.removeEventListener('kpi-rank-updated', checkLocalRank);
  }, [profile?.id, currentMonthKey]);

  const isDemoAccount = Boolean(
    profile?.full_name?.toLowerCase().includes('hỗ trợ web') ||
    profile?.full_name?.toLowerCase().includes('hỗ trợ web')
  );
  const effectiveRank = profile?.kpi_rank || localRank || (isDemoAccount ? 'gold' : null);

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${isMidAutumn ? 'sidebar-midautumn-art' : ''}`}>
      {/* Bức Tranh Nền Động Toàn Cảnh Trung Thu Cho Sidebar */}
      {isMidAutumn && <SidebarMidAutumnBackground />}

      <div className="brand" style={{ position: 'relative', zIndex: 1 }}>
        {isMidAutumn ? (
          <>
            {/* ── BIỂU TƯỢNG VINFAST CHROME & TRĂNG VÀNG - HOÀN TOÀN KHÔNG NỀN (TRANSPARENT) ── */}
            <div 
              className="brand-mark-midautumn" 
              style={{ 
                width: '46px', 
                height: '46px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0,
                background: 'transparent'
              }}
            >
              <svg viewBox="0 0 46 46" width="46" height="46" style={{ overflow: 'visible' }}>
                <defs>
                  {/* Bạc Chrome mạ kim loại sắc nét trên nền sáng */}
                  <linearGradient id="vf-no-bg-light" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#e2e8f0" />
                    <stop offset="70%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  <linearGradient id="vf-no-bg-dark" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f1f5f9" />
                    <stop offset="40%" stopColor="#64748b" />
                    <stop offset="80%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>

                  {/* Cánh phụ lõm sâu màu xanh VinFast Electric Blue */}
                  <linearGradient id="vf-no-bg-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="45%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>

                  {/* Vầng trăng vàng kim Trung Thu thanh thoát */}
                  <linearGradient id="vf-no-bg-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fffbeb" />
                    <stop offset="30%" stopColor="#fef08a" />
                    <stop offset="70%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>

                  {/* Đổ bóng nhẹ nhàng tôn cánh chim trên nền sáng */}
                  <filter id="vf-pure-shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.22" />
                  </filter>

                  {/* Keyframes chuyển động mượt mà */}
                  <style>{`
                    @keyframes vfPureMoon {
                      0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.4)); }
                      50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.85)); }
                    }
                    @keyframes vfPureFloat {
                      0%, 100% { transform: translateY(0); }
                      50% { transform: translateY(-1.5px); }
                    }
                    @keyframes vfPureSweep {
                      0% { transform: translateX(-35px) translateY(-35px) rotate(35deg); opacity: 0; }
                      20% { opacity: 0.8; }
                      35% { transform: translateX(50px) translateY(50px) rotate(35deg); opacity: 0; }
                      100% { transform: translateX(50px) translateY(50px) rotate(35deg); opacity: 0; }
                    }
                    .vf-anim-moon-pure { animation: vfPureMoon 3.5s ease-in-out infinite; }
                    .vf-anim-wing-pure { animation: vfPureFloat 3s ease-in-out infinite; }
                    .vf-anim-sweep-pure { animation: vfPureSweep 4.5s ease-in-out infinite 1s; }
                  `}</style>

                  <clipPath id="vf-pure-wing-clip">
                    <path d="M 23,41 L 4,10 Q 11,11 17,19 L 23,31 L 29,19 Q 35,11 42,10 L 23,41 Z" />
                  </clipPath>
                </defs>

                {/* 1. VẦNG TRĂNG KHUYẾT VÀNG TRUNG THU ÔM CÁNH TRÁI (KHÔNG CÓ KHUNG NỀN) */}
                <g className="vf-anim-moon-pure">
                  <path
                    d="M 18,6 C 10,11 6,20 7,29 C 8,34 11,39 16,42 C 12,38 9,31 10,24 C 10,17 14,10 19,7 Z"
                    fill="url(#vf-no-bg-gold)"
                  />
                  {/* Chấm ngọc vàng tinh tú */}
                  <circle cx="9" cy="13" r="1.8" fill="#f59e0b" />
                  <circle cx="9" cy="13" r="0.8" fill="#fef08a" />
                </g>

                {/* 2. CÁNH CHIM VINFAST 3D CHROME - ĐỨNG TRỰC TIẾP TRÊN NỀN TRONG SUỐT */}
                <g className="vf-anim-wing-pure" filter="url(#vf-pure-shadow)">
                  {/* Cánh trái ngoài (mặt sáng mạ Chrome bóng) */}
                  <path d="M 23,41 L 4,10 Q 11,11 17,19 L 23,31 Z" fill="url(#vf-no-bg-light)" />
                  {/* Cánh phải ngoài (mặt tối tạo chiều sâu khối) */}
                  <path d="M 23,41 L 42,10 Q 35,11 29,19 L 23,31 Z" fill="url(#vf-no-bg-dark)" />
                  {/* Sống gờ nổi kim loại ở giữa */}
                  <line x1="23" y1="31" x2="23,41" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                  {/* Đường viền sắc cạnh mép ngoài */}
                  <path d="M 4,10 L 23,41" stroke="#ffffff" strokeWidth="0.6" opacity="0.85" />
                  <path d="M 42,10 L 23,41" stroke="#334155" strokeWidth="0.5" opacity="0.6" />

                  {/* Cánh phụ bên trong màu xanh Electric VinFast */}
                  <path d="M 23,36 L 9,15 Q 15,16 19,22 L 23,28 L 27,22 Q 31,16 37,15 L 23,36 Z" fill="url(#vf-no-bg-blue)" />
                  <path d="M 23,36 L 23,28" stroke="#bae6fd" strokeWidth="0.8" />

                  {/* Tia phản quang quét qua cánh kim loại */}
                  <g clipPath="url(#vf-pure-wing-clip)">
                    <rect x="-15" y="-10" width="10" height="60" fill="#ffffff" opacity="0.65" className="vf-anim-sweep-pure" />
                  </g>
                </g>
              </svg>
            </div>

            {/* ── PHẦN CHỮ GỌN GÀNG, KHÔNG BỊ TRÙNG LẶP ── */}
            <div className="brand-text" style={{ gap: '2px', marginLeft: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                  VF KIM SƠN
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', letterSpacing: '0.22em', textTransform: 'uppercase', lineHeight: 1 }}>
                TRẢNG DÀI
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path d="M4 5 L12 19 L20 5" stroke="#f1f5f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 5 L12 19 L20 5" stroke="url(#vmark-g)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                <defs>
                  <linearGradient id="vmark-g" x1="4" y1="5" x2="20" y2="19" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fbbf24"/>
                    <stop offset="100%" stopColor="#f59e0b"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-text">
              <strong className="brand-title">VF Kim Sơn</strong>
              <span className="brand-subtitle">Trảng Dài</span>
            </div>
          </>
        )}
      </div>

      <nav className="nav-list" aria-label="Điều hướng chính" style={{ position: 'relative', zIndex: 1 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              className={`${isActive ? 'nav-item active' : 'nav-item'} ${isMidAutumn && isActive ? 'nav-item-midautumn-active' : ''}`}
              onClick={() => {
                setActiveTab(tab.key as TabKey);
                setSidebarOpen(false);
              }}
              title={tab.label}
              style={{ display: 'flex', alignItems: 'center', position: 'relative' }}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span style={{ flex: 1, textAlign: 'left' }}>{tab.label}</span>
              {tab.key === 'invoices' && pendingInvoicesCount > 0 && (
                <span
                  style={{
                    background: isActive ? '#fff' : '#ef4444',
                    color: isActive ? '#dc2626' : '#fff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '12px',
                    minWidth: '20px',
                    textAlign: 'center',
                    lineHeight: '1.3',
                    boxShadow: isActive 
                      ? '0 2px 6px rgba(0,0,0,0.15)' 
                      : '0 2px 8px rgba(239, 68, 68, 0.45)',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    letterSpacing: '0.01em'
                  }}
                  title={`${pendingInvoicesCount} yêu cầu xuất hóa đơn đang chờ duyệt`}
                >
                  {pendingInvoicesCount > 99 ? '99+' : pendingInvoicesCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', borderTop: isMidAutumn ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid #f1f5f9', paddingTop: '14px', position: 'relative', zIndex: 1 }}>
        {/* Festive Lantern Garland SVG during Mid-Autumn */}
        {isMidAutumn && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '-4px 0 -2px 0' }}>
            <SvgLanternGarland />
          </div>
        )}

        {/* User Profile Card - Hoàn Toàn Không Khung Không Nền (Nền Trong Suốt Tự Nhiên) */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '11px', 
            padding: '10px 12px', 
            position: 'relative',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none'
          }}
        >
          {isMidAutumn && (
            <div 
              style={{ position: 'absolute', top: '-52px', right: '-4px', pointerEvents: 'none', zIndex: 10 }} 
              title="Chúc Tết Trung Thu! 🏮🐰"
            >
              <SvgMidAutumnBoy />
            </div>
          )}

          {/* Avatar với 3D Halo Ring và Vương miện Hoàng Gia (Multiavatar Vector) */}
          <div 
            onClick={handleRefreshAvatar}
            title="Nhấp để đổi diện mạo avatar mới 🎲"
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              padding: effectiveRank ? '2px' : '0',
              background: effectiveRank === 'gold'
                ? 'linear-gradient(135deg, #f59e0b, #fef08a, #d97706)'
                : effectiveRank === 'silver'
                ? 'linear-gradient(135deg, #94a3b8, #f8fafc, #64748b)'
                : effectiveRank === 'bronze'
                ? 'linear-gradient(135deg, #ea580c, #fed7aa, #9a3412)'
                : '#e2e8f0',
              boxShadow: effectiveRank === 'gold'
                ? '0 3px 8px rgba(217, 119, 6, 0.35)'
                : effectiveRank === 'silver'
                ? '0 3px 8px rgba(71, 85, 105, 0.25)'
                : effectiveRank === 'bronze'
                ? '0 3px 8px rgba(194, 65, 12, 0.25)'
                : 'none',
              flexShrink: 0,
              cursor: 'pointer',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <div 
              className="multiavatar-box"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              dangerouslySetInnerHTML={{ __html: userAvatarSvg }}
            />

            {/* Vương miện đính trên Avatar */}
            {effectiveRank === 'gold' && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-5px',
                fontSize: '13px',
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
                transform: 'rotate(12deg)',
                userSelect: 'none'
              }}>
                👑
              </span>
            )}
            {effectiveRank === 'silver' && (
              <span style={{
                position: 'absolute',
                top: '-7px',
                right: '-4px',
                fontSize: '12px',
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
                userSelect: 'none'
              }}>
                🥈
              </span>
            )}
            {effectiveRank === 'bronze' && (
              <span style={{
                position: 'absolute',
                top: '-7px',
                right: '-4px',
                fontSize: '12px',
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
                userSelect: 'none'
              }}>
                🥉
              </span>
            )}
          </div>

          {/* Thông tin nhân sự & Thẻ danh hiệu 3D Capsule */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', marginBottom: '2px' }}>
              <div style={{
                fontSize: '13.5px',
                fontWeight: 800,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {profile?.full_name ?? userEmail ?? 'Người dùng'}
              </div>
              {effectiveRank && (
                <span
                  style={{
                    fontSize: '12px',
                    lineHeight: 1,
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))'
                  }}
                  title={`Danh hiệu thi đua ${effectiveRank === 'gold' ? 'Hạng Vàng 🥇' : effectiveRank === 'silver' ? 'Hạng Bạc 🥈' : 'Hạng Đồng 🥉'}`}
                >
                  {effectiveRank === 'gold' ? '🥇' : effectiveRank === 'silver' ? '🥈' : '🥉'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: effectiveRank === 'gold' ? '#92400e' : effectiveRank === 'silver' ? '#475569' : effectiveRank === 'bronze' ? '#9a3412' : (isMidAutumn ? '#d97706' : '#0284c7')
              }}>
                {profile ? roleLabels[profile.role] : 'Hỗ Trợ Web'}
              </span>

              {effectiveRank && (
                <span style={{
                  fontSize: '9px',
                  fontWeight: 900,
                  padding: '1.5px 7px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  background: effectiveRank === 'gold'
                    ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                    : effectiveRank === 'silver'
                    ? 'linear-gradient(135deg, #64748b, #475569)'
                    : 'linear-gradient(135deg, #ea580c, #c2410c)',
                  color: '#ffffff',
                  boxShadow: effectiveRank === 'gold'
                    ? '0 2px 6px rgba(217, 119, 6, 0.4)'
                    : effectiveRank === 'silver'
                    ? '0 2px 6px rgba(71, 85, 105, 0.35)'
                    : '0 2px 6px rgba(194, 65, 12, 0.35)',
                  lineHeight: 1.3
                }}>
                  {effectiveRank === 'gold' ? '✦ TOP 1 VÀNG' : effectiveRank === 'silver' ? '✦ TOP 2 BẠC' : '✦ TOP 3 ĐỒNG'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.03em',
            cursor: 'pointer',
            transition: 'color 0.18s, background 0.18s',
            outline: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#e11d48';
            e.currentTarget.style.background = 'rgba(225,29,72,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={13} strokeWidth={2} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};
