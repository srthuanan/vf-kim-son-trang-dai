import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, ChevronRight, Bell, CheckCircle2, type LucideIcon } from 'lucide-react';
import { useNotifications, AdminNotification } from '../../hooks/useNotifications';
import { isMidAutumnSeason } from './Sidebar';

interface HeaderProps {
  canCreateOrder: boolean;
  isAdmin?: boolean;
  setSidebarOpen: (val: boolean) => void;
  setCreateOpen: (val: boolean) => void;
  activeTabLabel?: string;
  activeTabIcon?: LucideIcon;
}

// Dây Lồng Đèn Trung Thu 9 Mẫu Truyền Thống - Cung Đình Cát Tường (Cân Đối & Tinh Xảo)
const MidAutumnLanternGarland: React.FC = () => (
  <div className="desktop-only ma-lantern-garland-wrapper" title="Phố Lồng Đèn Trung Thu ✦ VinFast Kim Sơn">
    <svg 
      viewBox="0 0 1000 54" 
      className="ma-lantern-garland-svg"
      style={{ width: '100%', height: '54px', overflow: 'visible', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="ma-rope-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="30%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="ma-ltn-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="40%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
        <linearGradient id="ma-ltn-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="ma-ltn-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id="ma-ltn-rose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fecdd3" />
          <stop offset="40%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id="ma-ltn-teal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="40%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#115e59" />
        </linearGradient>
      </defs>

      {/* Sợi Dây Lụa Vàng Uốn Lượn Qua 9 Điểm Treo */}
      <path 
        d="M 35,8 Q 81.5,13.5 128,9 Q 174.5,13.5 221,9 Q 267.5,13.5 314,9 Q 360.5,13.5 407,9 Q 453.5,14.5 500,10 Q 546.5,14.5 593,9 Q 639.5,13.5 686,9 Q 732.5,13.5 779,9 Q 825.5,13.5 872,9 Q 918.5,13.5 965,8" 
        fill="none" 
        stroke="url(#ma-rope-grad)" 
        strokeWidth="1.4" 
        opacity="0.95" 
      />

      {/* Điểm Neo Trái: Chốt Móc Mạ Vàng & Nút Thắt Đồng Tâm Cát Tường */}
      <g className="ma-anchor-left">
        <circle cx="35" cy="8" r="5.2" fill="url(#ma-ltn-gold)" stroke="#b45309" strokeWidth="1" />
        <circle cx="35" cy="8" r="2.5" fill="#fef08a" stroke="#d97706" strokeWidth="0.7" />
        <circle cx="35" cy="2.5" r="1.3" fill="#f59e0b" />
        <circle cx="35" cy="13.5" r="1.3" fill="#f59e0b" />
        <circle cx="29.5" cy="8" r="1.3" fill="#f59e0b" />
        <circle cx="40.5" cy="8" r="1.3" fill="#f59e0b" />
        <polygon points="35,12 40,16.5 35,21 30,16.5" fill="#dc2626" stroke="#fbbf24" strokeWidth="0.9" />
        <circle cx="35" cy="16.5" r="1.5" fill="#fef08a" />
        <line x1="33" y1="21" x2="31" y2="45" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="37" y1="21" x2="39" y2="45" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="35" y1="21" x2="35" y2="47" stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" />
      </g>

      {/* 1. Đèn Lồng Cung Đình Đỏ (X = 128) */}
      <g transform="translate(104, 0)">
        <g className="ma-sway-node-1">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="13.5" stroke="#b45309" strokeWidth="1.2" />
          <rect x="20" y="13.5" width="8" height="2" rx="1" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <ellipse cx="24" cy="22.5" rx="9.5" ry="9" fill="url(#ma-ltn-red)" stroke="#991b1b" strokeWidth="1.1" />
          <ellipse cx="24" cy="22.5" rx="5" ry="9" fill="none" stroke="#7f1d1d" strokeWidth="0.9" opacity="0.8" />
          <line x1="24" y1="13.5" x2="24" y2="31.5" stroke="#fef08a" strokeWidth="0.8" opacity="0.85" />
          <circle cx="24" cy="22.5" r="3.5" fill="#fef08a" opacity="0.75" />
          <circle cx="24" cy="22.5" r="1.6" fill="#ffffff" opacity="0.9" />
          <rect x="20.5" y="31.5" width="7" height="1.8" rx="0.9" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <line x1="24" y1="33.3" x2="24" y2="46" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="33.3" x2="20.5" y2="42" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
          <line x1="26" y1="33.3" x2="27.5" y2="42" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* 2. Đèn Cá Chép Vàng (X = 221) */}
      <g transform="translate(197, 0)">
        <g className="ma-sway-node-2">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="14" stroke="#b45309" strokeWidth="1.2" />
          <path d="M 21.5,14 Q 25,10.5 28.5,14 Z" fill="#ea580c" stroke="#9a3412" strokeWidth="0.7" />
          <path d="M 14,22.5 Q 17,15.5 25,16.5 Q 32,18 34,22.5 Q 32,27.5 25,28 Q 17,27 14,22.5 Z" fill="url(#ma-ltn-orange)" stroke="#9a3412" strokeWidth="1.1" />
          <path d="M 19.5,19 Q 22,21.5 24.5,19 M 23,22.5 Q 25.5,25 28,22.5" fill="none" stroke="#fef08a" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M 21.5,27.5 Q 25,31 27.5,28.5 Z" fill="#ea580c" stroke="#9a3412" strokeWidth="0.7" />
          <path d="M 14,22.5 Q 8,17 10,25 Q 11.5,23.5 14,22.5 Z" fill="url(#ma-ltn-red)" stroke="#991b1b" strokeWidth="0.9" />
          <circle cx="30" cy="20.5" r="1.8" fill="#ffffff" stroke="#9a3412" strokeWidth="0.6" />
          <circle cx="30.4" cy="20.5" r="1" fill="#0f172a" />
          <circle cx="30.8" cy="20" r="0.4" fill="#ffffff" />
          <line x1="24" y1="29" x2="24" y2="45" stroke="#ea580c" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="22" y1="29" x2="20" y2="40" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" />
          <line x1="26" y1="29" x2="28" y2="40" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </g>

      {/* 3. Đèn Kéo Quân Lục Giác (X = 314) */}
      <g transform="translate(290, 0)">
        <g className="ma-sway-node-3">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="13.5" stroke="#b45309" strokeWidth="1.2" />
          <path d="M 15,15 Q 24,11.5 33,15 L 31.5,17.5 L 16.5,17.5 Z" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
          <line x1="14" y1="14" x2="16" y2="16" stroke="#fbbf24" strokeWidth="0.8" />
          <line x1="34" y1="14" x2="32" y2="16" stroke="#fbbf24" strokeWidth="0.8" />
          <rect x="17" y="17.5" width="14" height="12.5" rx="1.2" fill="url(#ma-ltn-orange)" stroke="#9a3412" strokeWidth="1.1" />
          <rect x="19.5" y="19.5" width="9" height="8.5" rx="0.8" fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.7" />
          <circle cx="24" cy="23.5" r="2.2" fill="#b45309" opacity="0.8" />
          <path d="M 22.5,25.5 L 24,23 L 25.5,25.5 Z" fill="#b45309" opacity="0.8" />
          <rect x="16.5" y="30" width="15" height="2.2" rx="0.8" fill="#b45309" stroke="#78350f" strokeWidth="0.8" />
          <line x1="24" y1="32.2" x2="24" y2="46" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="19.5" y1="32.2" x2="18" y2="41" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
          <line x1="28.5" y1="32.2" x2="30" y2="41" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* 4. Đèn Hoa Sen Nở (X = 407) */}
      <g transform="translate(383, 0)">
        <g className="ma-sway-node-4">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="13.5" stroke="#b45309" strokeWidth="1.2" />
          <path d="M 24,13.5 Q 28,20 24,28 Q 20,20 24,13.5 Z" fill="url(#ma-ltn-rose)" stroke="#be123c" strokeWidth="1.1" />
          <path d="M 24,17.5 Q 15,19 17,28 Q 21,26.5 24,28 Z" fill="url(#ma-ltn-rose)" stroke="#be123c" strokeWidth="0.9" opacity="0.95" />
          <path d="M 24,17.5 Q 33,19 31,28 Q 27,26.5 24,28 Z" fill="url(#ma-ltn-rose)" stroke="#be123c" strokeWidth="0.9" opacity="0.95" />
          <path d="M 21.5,22.5 Q 12.5,24 15,30 Q 19,30 21.5,28 Z" fill="#fb7185" stroke="#be123c" strokeWidth="0.8" />
          <path d="M 26.5,22.5 Q 35.5,24 33,30 Q 29,30 26.5,28 Z" fill="#fb7185" stroke="#be123c" strokeWidth="0.8" />
          <circle cx="24" cy="23.5" r="2.6" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.7" />
          <path d="M 19,29 Q 24,32.5 29,29 Z" fill="#0d9488" stroke="#042f2e" strokeWidth="0.9" />
          <line x1="24" y1="30.5" x2="24" y2="46" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20.5" y1="30.5" x2="19" y2="41" stroke="#fbbf24" strokeWidth="0.9" strokeLinecap="round" />
          <line x1="27.5" y1="30.5" x2="29" y2="41" stroke="#fbbf24" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </g>

      {/* 5. Đèn Ông Sao 5 Cánh (Tâm Điểm, X = 500) */}
      <g transform="translate(476, 0)">
        <g className="ma-sway-node-5">
          <circle cx="24" cy="10" r="2.4" fill="#fef08a" stroke="#b45309" strokeWidth="1.1" />
          <line x1="24" y1="12.4" x2="24" y2="14" stroke="#b45309" strokeWidth="1.3" />
          <polygon 
            points="24,14 26.8,20.8 33.5,21.5 28.5,26 30.5,33 24,29 17.5,33 19.5,26 14.5,21.5 21.2,20.8" 
            fill="url(#ma-ltn-gold)" 
            stroke="#dc2626" 
            strokeWidth="1.3" 
          />
          <circle cx="24" cy="24" r="8" fill="none" stroke="#dc2626" strokeWidth="1" strokeDasharray="1.8,1" />
          <line x1="24" y1="14" x2="24" y2="24" stroke="#b91c1c" strokeWidth="0.8" />
          <line x1="33.5" y1="21.5" x2="24" y2="24" stroke="#b91c1c" strokeWidth="0.8" />
          <line x1="30.5" y1="33" x2="24" y2="24" stroke="#b91c1c" strokeWidth="0.8" />
          <line x1="17.5" y1="33" x2="24" y2="24" stroke="#b91c1c" strokeWidth="0.8" />
          <line x1="14.5" y1="21.5" x2="24" y2="24" stroke="#b91c1c" strokeWidth="0.8" />
          <circle cx="24" cy="24" r="3" fill="#ffffff" stroke="#f59e0b" strokeWidth="1" />
          <circle cx="24" cy="24" r="1.5" fill="#fef08a" />
          <line x1="21.5" y1="32" x2="19" y2="47" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="26.5" y1="32" x2="29" y2="47" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="24" y1="30" x2="24" y2="45" stroke="#e11d48" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* 6. Đèn Thỏ Ngọc (X = 593) */}
      <g transform="translate(569, 0)">
        <g className="ma-sway-node-6">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="14" stroke="#b45309" strokeWidth="1.2" />
          <path d="M 16,30 Q 24,33.5 32,28.5 Q 25,30 18,27 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="0.9" />
          <ellipse cx="23" cy="24.5" rx="7.2" ry="6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
          <circle cx="27.2" cy="20.5" r="3.6" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.9" />
          <ellipse cx="28.8" cy="15" rx="1.3" ry="3.6" transform="rotate(12 28.8 15)" fill="#ffffff" stroke="#f43f5e" strokeWidth="0.7" />
          <ellipse cx="28.8" cy="15" rx="0.6" ry="2.4" transform="rotate(12 28.8 15)" fill="#fecdd3" />
          <ellipse cx="25.5" cy="15" rx="1.3" ry="3.6" transform="rotate(-15 25.5 15)" fill="#ffffff" stroke="#f43f5e" strokeWidth="0.7" />
          <ellipse cx="25.5" cy="15" rx="0.6" ry="2.4" transform="rotate(-15 25.5 15)" fill="#fecdd3" />
          <circle cx="28.8" cy="20" r="0.8" fill="#ef4444" />
          <circle cx="29" cy="19.8" r="0.3" fill="#ffffff" />
          <circle cx="16" cy="25" r="1.8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="24" y1="31.5" x2="24" y2="45" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="20.5" y1="30.5" x2="19" y2="40" stroke="#ef4444" strokeWidth="0.9" strokeLinecap="round" />
          <line x1="27.5" y1="30.5" x2="29" y2="40" stroke="#ef4444" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </g>

      {/* 7. Đèn Hội An Quả Trám (X = 686) */}
      <g transform="translate(662, 0)">
        <g className="ma-sway-node-7">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="13.5" stroke="#b45309" strokeWidth="1.2" />
          <rect x="20" y="13.5" width="8" height="2" rx="1" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <polygon 
            points="24,14.5 33,20.5 33,26.5 24,32.5 15,26.5 15,20.5" 
            fill="url(#ma-ltn-gold)" 
            stroke="#b45309" 
            strokeWidth="1.1" 
          />
          <line x1="24" y1="14.5" x2="24" y2="32.5" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
          <line x1="19.5" y1="17.5" x2="19.5" y2="29.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
          <line x1="28.5" y1="17.5" x2="28.5" y2="29.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.75" />
          <circle cx="24" cy="23.5" r="2.8" fill="#ffffff" opacity="0.85" />
          <circle cx="24" cy="23.5" r="1.3" fill="#fef08a" />
          <rect x="20.5" y="32.5" width="7" height="1.8" rx="0.9" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <line x1="24" y1="34.3" x2="24" y2="46" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="34.3" x2="20.5" y2="42" stroke="#dc2626" strokeWidth="1" strokeLinecap="round" />
          <line x1="26" y1="34.3" x2="27.5" y2="42" stroke="#dc2626" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* 8. Đèn Bướm Đa Sắc (X = 779) */}
      <g transform="translate(755, 0)">
        <g className="ma-sway-node-8">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="15" stroke="#b45309" strokeWidth="1.2" />
          <path d="M 24,19 Q 13,12 13,19 Q 13,25 24,22.5 Z" fill="url(#ma-ltn-orange)" stroke="#9a3412" strokeWidth="1.1" />
          <path d="M 24,19 Q 35,12 35,19 Q 35,25 24,22.5 Z" fill="url(#ma-ltn-orange)" stroke="#9a3412" strokeWidth="1.1" />
          <path d="M 24,22.5 Q 16.5,24 18,30 Q 22,30 24,24.5 Z" fill="url(#ma-ltn-red)" stroke="#991b1b" strokeWidth="1" />
          <path d="M 24,22.5 Q 31.5,24 30,30 Q 26,30 24,24.5 Z" fill="url(#ma-ltn-red)" stroke="#991b1b" strokeWidth="1" />
          <circle cx="18" cy="18.5" r="1.4" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.5" />
          <circle cx="30" cy="18.5" r="1.4" fill="#fef08a" stroke="#f59e0b" strokeWidth="0.5" />
          <circle cx="20.5" cy="27" r="1" fill="#fef08a" />
          <circle cx="27.5" cy="27" r="1" fill="#fef08a" />
          <line x1="24" y1="16" x2="24" y2="26" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 24,16 Q 21.5,12.5 19.5,13.5 M 24,16 Q 26.5,12.5 28.5,13.5" stroke="#78350f" strokeWidth="0.8" strokeLinecap="round" fill="none" />
          <line x1="24" y1="26" x2="24" y2="45" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="22" y1="27" x2="20" y2="39" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" />
          <line x1="26" y1="27" x2="28" y2="39" stroke="#f59e0b" strokeWidth="0.9" strokeLinecap="round" />
        </g>
      </g>

      {/* 9. Đèn Lồng Tròn Ngọc Bích VinFast (X = 872) */}
      <g transform="translate(848, 0)">
        <g className="ma-sway-node-9">
          <circle cx="24" cy="9" r="2.2" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
          <line x1="24" y1="11.2" x2="24" y2="13.5" stroke="#b45309" strokeWidth="1.2" />
          <rect x="20" y="13.5" width="8" height="2" rx="1" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <circle cx="24" cy="23" r="9.2" fill="url(#ma-ltn-teal)" stroke="#0f766e" strokeWidth="1.1" />
          <path d="M 16,20.5 Q 24,23.5 32,20.5" fill="none" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
          <path d="M 17,23.5 Q 24,26.5 31,23.5" fill="none" stroke="#5eead4" strokeWidth="0.8" strokeLinecap="round" />
          <path d="M 18,26.5 Q 24,29 30,26.5" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
          <circle cx="24" cy="23" r="2.6" fill="#ffffff" opacity="0.85" />
          <rect x="20.5" y="32.2" width="7" height="1.8" rx="0.9" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
          <line x1="24" y1="34" x2="24" y2="46" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="22" y1="34" x2="20.5" y2="42" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
          <line x1="26" y1="34" x2="27.5" y2="42" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* Điểm Neo Phải: Chốt Móc Mạ Vàng & Nút Thắt Bình An Cát Tường */}
      <g className="ma-anchor-right">
        <circle cx="965" cy="8" r="5.2" fill="url(#ma-ltn-gold)" stroke="#b45309" strokeWidth="1" />
        <circle cx="965" cy="8" r="2.5" fill="#fef08a" stroke="#d97706" strokeWidth="0.7" />
        <circle cx="965" cy="2.5" r="1.3" fill="#f59e0b" />
        <circle cx="965" cy="13.5" r="1.3" fill="#f59e0b" />
        <circle cx="959.5" cy="8" r="1.3" fill="#f59e0b" />
        <circle cx="970.5" cy="8" r="1.3" fill="#f59e0b" />
        <polygon points="965,12 970,16.5 965,21 960,16.5" fill="#dc2626" stroke="#fbbf24" strokeWidth="0.9" />
        <circle cx="965" cy="16.5" r="1.5" fill="#fef08a" />
        <line x1="963" y1="21" x2="961" y2="45" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="967" y1="21" x2="969" y2="45" stroke="#dc2626" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="965" y1="21" x2="965" y2="47" stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </svg>

    {/* Tooltip Thiệp Chúc Mừng */}
    <div className="ma-garland-tooltip">
      <div style={{ fontWeight: 700, color: '#fef08a' }}>🏮 Phố Lồng Đèn Trung Thu 2026</div>
      <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginTop: '2px' }}>VinFast Kim Sơn ✦ Đoàn Viên Thưởng Nguyệt ✦ Vạn Dặm Bình An</div>
    </div>
  </div>
);

export const Header: React.FC<HeaderProps> = ({
  canCreateOrder,
  isAdmin = false,
  setSidebarOpen,
  setCreateOpen,
  activeTabLabel,
  activeTabIcon: ActiveIcon
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(isAdmin);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMidAutumn = isMidAutumnSeason();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Removed toastNotif state and listener per user request

  return (
    <header className="topbar" style={{ 
      minHeight: '54px', 
      height: '54px', 
      padding: '0 20px', 
      background: 'rgba(255, 255, 255, 0.85)', 
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #cbd5e1',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative'
    }}>
      {/* Mobile Open Button & Active Tab Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} title="Mở menu" style={{ padding: '6px', height: '32px', width: '32px' }}>
          <Menu size={18} />
        </button>
        
        {/* High-end Dynamic Title Breadcrumb */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 500 }}>
          <span>Hệ thống</span>
          <ChevronRight size={12} strokeWidth={2.5} style={{ color: '#94a3b8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', color: '#0f172a', fontWeight: 700, border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
            {ActiveIcon && <ActiveIcon size={14} className="text-primary" style={{ color: '#0f766e' }} />}
            <span>{activeTabLabel || 'Bảng điều khiển'}</span>
          </div>
        </div>

        <div className="mobile-only" style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
          {activeTabLabel || 'Trang chủ'}
        </div>
      </div>

      {/* Dây Lồng Đèn Trung Thu Trải Dài Khắp Nhịp Giữa với 2 Điểm Neo Cung Đình */}
      {isMidAutumn && (
        <div className="desktop-only" style={{ 
          flex: 1, 
          minWidth: 0, 
          height: '54px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 8px',
          overflow: 'hidden' 
        }}>
          <MidAutumnLanternGarland />
        </div>
      )}

      {/* Compact Global Actions */}
      <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        
        {/* Notification Bell */}
        {isAdmin && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="icon-button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              style={{ position: 'relative', border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', color: '#64748b' }}
              title="Thông báo"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div style={{
                position: 'absolute', top: '40px', right: '-10px', width: '320px',
                background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                maxHeight: '400px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>Thông báo</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      style={{ fontSize: '12px', color: '#0f766e', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Đánh dấu đã đọc tất cả
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Không có thông báo nào.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          if (!notif.is_read) markAsRead(notif.id);
                          // Đóng menu sau khi click
                          setIsNotifOpen(false);
                          
                          // Trích xuất mã đơn hàng từ tin nhắn (VD: G40107-VSO-26-05-0180)
                          const orderMatch = notif.message.match(/(G\d{5}-VSO-\d{2}-\d{2}-\d{4})/i);
                          if (orderMatch) {
                            const orderId = orderMatch[1];
                            // Nếu là yêu cầu hóa đơn thì qua tab Hóa đơn, ngược lại qua tab Đơn hàng
                            const isInvoiceNotif = notif.message.toLowerCase().includes('yêu cầu xuất hóa đơn');
                            const tab = isInvoiceNotif ? 'invoices' : 'orders';
                            window.dispatchEvent(new CustomEvent('navigate-to', {
                              detail: { tab, search: orderId }
                            }));
                          }
                        }}
                        style={{
                          padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                          background: notif.is_read ? '#fff' : '#f0fdfa',
                          cursor: 'pointer', transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <div style={{ marginTop: '2px' }}>
                            {notif.is_read ? (
                              <CheckCircle2 size={16} color="#94a3b8" />
                            ) : (
                              <div style={{ width: '8px', height: '8px', background: '#0ea5e9', borderRadius: '50%', marginTop: '4px' }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: notif.is_read ? 400 : 500, lineHeight: 1.4 }}>
                              {notif.message}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              {new Date(notif.created_at).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className="primary-button"
          onClick={() => setCreateOpen(true)}
          disabled={!canCreateOrder}
          title={canCreateOrder ? 'Tạo đơn' : 'Cần quyền Admin hoặc TVBH'}
          style={{ 
            height: '34px', 
            padding: '0 12px', 
            fontSize: '12px', 
            borderRadius: '8px', 
            gap: '4px',
            fontWeight: 600,
            boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)'
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Tạo đơn</span>
        </button>
      </div>

      {/* Real-time Toast Notification (Removed by user request) */}
    </header>
  );
};
