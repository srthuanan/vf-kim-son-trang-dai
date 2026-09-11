import React, { useState } from 'react';
import { LockKeyhole, AlertTriangle, CheckCircle2, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { isMidAutumnSeason } from './layout/Sidebar';

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const isMidAutumn = isMidAutumnSeason();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (forgotMode) {
        if (!email.trim()) {
          setError('Vui lòng nhập email công việc để nhận link đặt lại mật khẩu.');
          return;
        }

        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectTo = new URL('/reset-password', appUrl).toString();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo
        });

        if (resetError) {
          throw resetError;
        }

        setMessage('Đã gửi link đặt lại mật khẩu vào email của bạn.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        setError('Đăng nhập thất bại. Tài khoản phải do admin tạo và cấp quyền.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống không mong muốn.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={`auth-shell ${isMidAutumn ? 'auth-shell-midautumn' : ''}`}>
      {/* ── BỐ CỤC DẠ NGUYỆT TRUNG THU NỀN MÀN HÌNH (BACKGROUND DECORATION) ── */}
      {isMidAutumn && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
          {/* Vầng trăng rằm hoàng kim toả sáng góc phải */}
          <div style={{ position: 'absolute', top: '5%', right: '8%', width: '180px', height: '180px', opacity: 0.85 }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <radialGradient id="auth-moon-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#fef08a" stopOpacity="0.6" />
                  <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="50" cy="50" r="48" fill="url(#auth-moon-glow)" className="ma-anim-moon" />
              <circle cx="50" cy="50" r="32" fill="#fffbeb" opacity="0.8" filter="drop-shadow(0 0 18px rgba(245, 158, 11, 0.45))" />
              <circle cx="44" cy="44" r="10" fill="#fef08a" opacity="0.3" />
            </svg>
          </div>

          {/* Dải mây ngũ sắc lượn nhẹ qua trăng */}
          <div style={{ position: 'absolute', top: '12%', right: '5%', width: '160px', opacity: 0.55 }} className="ma-anim-cloud1">
            <svg viewBox="0 0 120 30" width="100%" height="28">
              <path d="M10 20 Q30 5 60 15 Q80 8 105 18 Q115 25 90 25 Q40 25 10 20 Z" fill="#fed7aa" opacity="0.5" />
            </svg>
          </div>

          {/* ── CỤM ĐÈN LỒNG ÔNG SAO TRUNG THU TRUYỀN THỐNG TREO GÓC TRÊN TRÁI ── */}
          <div 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: '5%', 
              width: '180px', 
              height: '320px', 
              zIndex: 2,
              pointerEvents: 'none'
            }} 
            className="ma-sway-lantern-1"
          >
            <svg viewBox="0 0 180 320" width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                {/* Vòng hào quang đèn ông sao */}
                <radialGradient id="star-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="35%" stopColor="#fef08a" stopOpacity="0.8" />
                  <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>

                {/* Giấy bóng kính đỏ trong suốt ánh sáng */}
                <radialGradient id="star-glass-red" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="45%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#b91c1c" />
                </radialGradient>

                {/* Giấy kính màu vàng & cam các cánh bên */}
                <radialGradient id="star-glass-yellow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#ea580c" />
                </radialGradient>

                <linearGradient id="star-bamboo" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </linearGradient>

                <filter id="star-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="4" stdDeviation="10" floodColor="#f59e0b" floodOpacity="0.55" />
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#dc2626" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* 1. Sợi dây treo từ mép trần đung đưa */}
              <line x1="90" y1="0" x2="90" y2="70" stroke="#b45309" strokeWidth="2" strokeDasharray="3 2" />
              {/* Nơ đỏ / Khuyên treo */}
              <circle cx="90" cy="70" r="4.5" fill="#dc2626" stroke="#fef08a" strokeWidth="1.5" />

              {/* 2. Cán tre ngang trang trí */}
              <line x1="72" y1="70" x2="108" y2="70" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />

              {/* 3. Vầng sáng hào quang đèn ông sao */}
              <circle cx="90" cy="150" r="76" fill="url(#star-halo)" />

              {/* 4. Vòng tròn tre bọc ngoài đặc trưng của Đèn Ông Sao */}
              <circle cx="90" cy="150" r="56" fill="none" stroke="url(#star-bamboo)" strokeWidth="3.5" opacity="0.95" />
              <circle cx="90" cy="150" r="52" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.8" />

              {/* 5. CÁC TUA HOA GIẤY NGŨ SẮC TRÊN VÒNG TRÒN TRE */}
              <circle cx="90" cy="94" r="3.5" fill="#f43f5e" />
              <circle cx="146" cy="150" r="3.5" fill="#f43f5e" />
              <circle cx="90" cy="206" r="3.5" fill="#f43f5e" />
              <circle cx="34" cy="150" r="3.5" fill="#f43f5e" />
              <circle cx="130" cy="110" r="3" fill="#fbbf24" />
              <circle cx="50" cy="110" r="3" fill="#fbbf24" />
              <circle cx="130" cy="190" r="3" fill="#fbbf24" />
              <circle cx="50" cy="190" r="3" fill="#fbbf24" />

              {/* 6. NGÔI SAO 5 CÁNH CHÍNH (Đèn ông sao 3D lộng lẫy) */}
              <g filter="url(#star-glow-filter)" transform="translate(90, 150)">
                {/* 5 Cánh tam giác chính tỏa ra từ tâm */}
                {/* Cánh đỉnh (Top) */}
                <polygon points="0,0 -16,-18 0,-62" fill="url(#star-glass-red)" />
                <polygon points="0,0 16,-18 0,-62" fill="#ef4444" opacity="0.9" />

                {/* Cánh phải trên (Top Right) */}
                <polygon points="0,0 16,-18 58,-19" fill="url(#star-glass-yellow)" />
                <polygon points="0,0 24,10 58,-19" fill="#f59e0b" opacity="0.9" />

                {/* Cánh phải dưới (Bottom Right) */}
                <polygon points="0,0 24,10 36,50" fill="url(#star-glass-red)" />
                <polygon points="0,0 0,22 36,50" fill="#dc2626" opacity="0.9" />

                {/* Cánh trái dưới (Bottom Left) */}
                <polygon points="0,0 0,22 -36,50" fill="url(#star-glass-yellow)" />
                <polygon points="0,0 -24,10 -36,50" fill="#ea580c" opacity="0.9" />

                {/* Cánh trái trên (Top Left) */}
                <polygon points="0,0 -24,10 -58,-19" fill="url(#star-glass-red)" />
                <polygon points="0,0 -16,-18 -58,-19" fill="#ef4444" opacity="0.9" />

                {/* Khung nan tre viền các cánh ngôi sao */}
                <polygon 
                  points="0,-62 16,-18 58,-19 24,10 36,50 0,22 -36,50 -24,10 -58,-19 -16,-18" 
                  fill="none" 
                  stroke="#fef08a" 
                  strokeWidth="2.2" 
                />

                {/* Tâm đèn lồng phát sáng tròn */}
                <circle cx="0" cy="0" r="14" fill="url(#star-halo)" />
                <circle cx="0" cy="0" r="9" fill="#ffffff" />
                <circle cx="0" cy="0" r="14" fill="none" stroke="#d97706" strokeWidth="1.6" />
                {/* Chữ Phúc tâm sao */}
                <text x="0" y="4" textAnchor="middle" fontSize="9" fontWeight="900" fill="#b91c1c" fontFamily="serif">福</text>
              </g>

              {/* 7. DẢI TUA RUA ĐỎ & VÀNG ĐUNG ĐƯA DƯỚI ĐÁY ĐÈN ÔNG SAO */}
              <g transform="translate(90, 206)">
                {/* Hạt ngọc bội lục bảo */}
                <circle cx="0" cy="6" r="3.5" fill="#10b981" stroke="#fef08a" strokeWidth="1" />
                {/* Tua rua chính giữa */}
                <line x1="0" y1="10" x2="0" y2="76" stroke="#dc2626" strokeWidth="2.8" strokeLinecap="round" />
                <line x1="-5" y1="10" x2="-8" y2="60" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="5" y1="10" x2="8" y2="60" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="-10" y1="10" x2="-14" y2="48" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="10" y1="10" x2="14" y2="48" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            </svg>
          </div>

          {/* Dải mây ngũ sắc lượn nhẹ quanh đèn ông sao */}
          <div style={{ position: 'absolute', top: '16%', left: '2%', width: '220px', opacity: 0.45, pointerEvents: 'none' }} className="ma-anim-cloud1">
            <svg viewBox="0 0 160 40" width="100%" height="auto">
              <path d="M10 25 Q35 10 70 20 Q105 8 140 22 Q155 30 130 32 Q60 32 10 25 Z" fill="#fed7aa" opacity="0.6" />
            </svg>
          </div>

          {/* Cánh thiên đăng lơ lửng bay từ góc dưới bên trái */}
          <div style={{ position: 'absolute', bottom: '15%', left: '8%' }} className="ma-lantern-ascend-1">
            <svg viewBox="0 0 20 26" width="22" height="28">
              <defs>
                <linearGradient id="auth-lt-1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="45%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <path d="M4 4 Q10 1 16 4 L17 19 Q10 23 3 19 Z" fill="url(#auth-lt-1)" filter="drop-shadow(0 0 8px rgba(245, 158, 11, 0.7))" />
              <circle cx="10" cy="17" r="3" fill="#ffffff" />
            </svg>
          </div>

          {/* Cánh thiên đăng thứ 2 bay bên phải */}
          <div style={{ position: 'absolute', bottom: '25%', right: '12%' }} className="ma-lantern-ascend-2">
            <svg viewBox="0 0 20 26" width="18" height="24">
              <path d="M4 4 Q10 1 16 4 L17 19 Q10 23 3 19 Z" fill="url(#auth-lt-1)" filter="drop-shadow(0 0 6px rgba(245, 158, 11, 0.6))" opacity="0.85" />
              <circle cx="10" cy="17" r="2.4" fill="#ffffff" />
            </svg>
          </div>

          {/* Đốm sáng đom đóm / tinh tú vàng dạ nguyệt */}
          <div style={{ position: 'absolute', top: '35%', left: '15%' }} className="ma-firefly-1">
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #f59e0b' }} />
          </div>
          <div style={{ position: 'absolute', top: '55%', right: '18%' }} className="ma-firefly-2">
            <div style={{ width: '3.5px', height: '3.5px', borderRadius: '50%', background: '#fef08a', boxShadow: '0 0 6px #fbbf24' }} />
          </div>
        </div>
      )}

      {/* ── CARD ĐĂNG NHẬP CHÍNH (SPLIT DUAL-PANEL KHI MÙA TRUNG THU) ── */}
      {isMidAutumn ? (
        <section className="auth-card auth-card-split">
          {/* ══════ CỘT TRÁI: BỨC TRANH NGHỆ THUẬT TRUNG THU 3D ══════ */}
          <div className="auth-split-art" style={{ position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* Ảnh minh họa 3D sắc nét cao cấp */}
            <img 
              src="/mid-autumn-art.jpg" 
              alt="Tết Trung Thu VinFast Kim Sơn Trảng Dài" 
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top'
              }} 
            />

            {/* Lớp phủ chuyển màu gradient dịu mắt để tôn chữ và huy hiệu */}
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(10, 15, 30, 0.45) 0%, rgba(10, 15, 30, 0.05) 40%, rgba(10, 15, 30, 0.2) 70%, rgba(10, 15, 30, 0.85) 100%)',
                pointerEvents: 'none'
              }} 
            />

            {/* 1. Header: Huy hiệu Đoàn Viên */}
            <div style={{ position: 'relative', zIndex: 2, padding: '24px 20px 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 18px', borderRadius: '999px', background: 'rgba(15, 23, 42, 0.65)', border: '1px solid rgba(251, 191, 36, 0.6)', backdropFilter: 'blur(10px)', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
                <span style={{ fontSize: '13px' }}>🏮</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#fef08a', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                  TẾT TRUNG THU ĐOÀN VIÊN
                </span>
                <span style={{ fontSize: '13px' }}>🥮</span>
              </div>
            </div>

            {/* 2. Khoảng trống trung tâm để chiêm ngưỡng trăng rằm, cậu bé và thỏ ngọc */}
            <div style={{ flex: 1 }} />

            {/* 3. Footer: Khung thư pháp dát vàng trang trọng */}
            <div style={{ position: 'relative', zIndex: 2, padding: '20px 24px 24px', width: '100%', textAlign: 'center', backdropFilter: 'blur(4px)', background: 'linear-gradient(to top, rgba(10, 15, 30, 0.92), rgba(10, 15, 30, 0.3) 80%, transparent)' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#fef08a', letterSpacing: '0.12em', fontFamily: 'serif', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                ✦ Đoàn Viên Thưởng Nguyệt ✦
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#fed7aa', letterSpacing: '0.04em', opacity: 0.95, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
                Vạn Dặm Bình An &middot; VinFast Kim Sơn Trảng Dài
              </p>
            </div>
          </div>

          {/* ══════ CỘT PHẢI: FORM ĐĂNG NHẬP DOANH NGHIỆP TINH TẾ & SANG TRỌNG ══════ */}
          <div className="auth-split-form" style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* LỒNG ĐÈN TRUNG THU TREO GÓC TRÊN BÊN PHẢI (ĐÈN CHỮ PHÚC DÁT VÀNG ĐUNG ĐƯA) */}
            <div 
              className="ma-sway-lantern-1"
              style={{
                position: 'absolute',
                top: 0,
                right: '28px',
                width: '38px',
                pointerEvents: 'none',
                zIndex: 3
              }}
            >
              <svg viewBox="0 0 38 70" width="38" height="70" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="frm-lt-red" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="40%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#991b1b" />
                  </linearGradient>
                  <linearGradient id="frm-lt-gold" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <radialGradient id="frm-lt-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {/* Sợi dây treo vàng từ mép trên */}
                <line x1="19" y1="0" x2="19" y2="18" stroke="#d97706" strokeWidth="1.2" strokeDasharray="1.5 1.5" />
                {/* Nắp lồng đèn trên */}
                <rect x="13" y="18" width="12" height="3" rx="1.2" fill="url(#frm-lt-gold)" />
                {/* Quầng sáng đèn lồng */}
                <circle cx="19" cy="32" r="16" fill="url(#frm-lt-glow)" />
                {/* Thân đèn lồng đỏ truyền thống */}
                <ellipse cx="19" cy="32" rx="13" ry="14" fill="url(#frm-lt-red)" filter="drop-shadow(0 4px 10px rgba(220, 38, 38, 0.4))" />
                {/* Nan đèn vàng thanh thoát */}
                <ellipse cx="19" cy="32" rx="13" ry="14" fill="none" stroke="#fef08a" strokeWidth="0.9" opacity="0.85" />
                <path d="M19 18 Q26 32 19 46" fill="none" stroke="#fef08a" strokeWidth="0.8" opacity="0.75" />
                <path d="M19 18 Q12 32 19 46" fill="none" stroke="#fef08a" strokeWidth="0.8" opacity="0.75" />
                {/* Chữ Phúc thư pháp vàng */}
                <text x="19" y="35" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fef08a" fontFamily="serif">福</text>
                {/* Nắp lồng đèn dưới */}
                <rect x="14" y="45" width="10" height="2.5" rx="1" fill="url(#frm-lt-gold)" />
                {/* Hạt ngọc bội */}
                <circle cx="19" cy="50" r="2.2" fill="#10b981" stroke="#fef08a" strokeWidth="0.8" />
                {/* Tua rua đỏ dài đung đưa */}
                <line x1="19" y1="52" x2="19" y2="68" stroke="#dc2626" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="16.5" y1="52" x2="16" y2="64" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
                <line x1="21.5" y1="52" x2="22" y2="64" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>

            {/* LỒNG ĐÈN THỨ 2 NHỎ HƠN TREO PHỤ BÊN CẠNH */}
            <div 
              className="ma-sway-lantern-2"
              style={{
                position: 'absolute',
                top: 0,
                right: '68px',
                width: '26px',
                pointerEvents: 'none',
                zIndex: 3
              }}
            >
              <svg viewBox="0 0 26 54" width="26" height="54" style={{ overflow: 'visible' }}>
                <line x1="13" y1="0" x2="13" y2="12" stroke="#d97706" strokeWidth="1" strokeDasharray="1.5 1.5" />
                <rect x="9" y="12" width="8" height="2" rx="0.8" fill="url(#frm-lt-gold)" />
                <circle cx="13" cy="22" r="10" fill="url(#frm-lt-glow)" />
                <ellipse cx="13" cy="22" rx="9" ry="10" fill="url(#frm-lt-red)" filter="drop-shadow(0 2px 6px rgba(220, 38, 38, 0.3))" />
                <ellipse cx="13" cy="22" rx="9" ry="10" fill="none" stroke="#fef08a" strokeWidth="0.7" opacity="0.8" />
                <rect x="9.5" y="31.5" width="7" height="1.8" rx="0.8" fill="url(#frm-lt-gold)" />
                <line x1="13" y1="33" x2="13" y2="48" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>

            {/* Header: Logo thương hiệu + Họa tiết nguyệt quế vàng nhẹ */}
            <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative', zIndex: 2 }}>
              <div className="brand auth-brand" style={{ justifyContent: 'center', alignItems: 'center', gap: '10px', margin: '0 0 16px 0', padding: 0 }}>
                <div style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg viewBox="0 0 46 46" width="42" height="42" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="split-vf-silver" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="30%" stopColor="#e2e8f0" />
                        <stop offset="70%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                      </linearGradient>
                      <linearGradient id="split-vf-dark" x1="100%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f1f5f9" />
                        <stop offset="40%" stopColor="#64748b" />
                        <stop offset="80%" stopColor="#334155" />
                        <stop offset="100%" stopColor="#0f172a" />
                      </linearGradient>
                      <linearGradient id="split-vf-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="45%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#0369a1" />
                      </linearGradient>
                      <linearGradient id="split-vf-gold" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fffbeb" />
                        <stop offset="30%" stopColor="#fef08a" />
                        <stop offset="70%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <filter id="split-vf-shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.2" />
                      </filter>
                    </defs>

                    {/* Vầng trăng vàng ôm cánh trái */}
                    <g className="vf-anim-moon-pure">
                      <path
                        d="M 18,6 C 10,11 6,20 7,29 C 8,34 11,39 16,42 C 12,38 9,31 10,24 C 10,17 14,10 19,7 Z"
                        fill="url(#split-vf-gold)"
                      />
                      <circle cx="9" cy="13" r="1.8" fill="#f59e0b" />
                      <circle cx="9" cy="13" r="0.8" fill="#fef08a" />
                    </g>

                    {/* Cánh chim VinFast chữ V Chrome 3D */}
                    <g className="vf-anim-wing-pure" filter="url(#split-vf-shadow)">
                      <path d="M 23,41 L 4,10 Q 11,11 17,19 L 23,31 Z" fill="url(#split-vf-silver)" />
                      <path d="M 23,41 L 42,10 Q 35,11 29,19 L 23,31 Z" fill="url(#split-vf-dark)" />
                      <line x1="23" y1="31" x2="23,41" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" />
                      <path d="M 4,10 L 23,41" stroke="#ffffff" strokeWidth="0.6" opacity="0.85" />
                      <path d="M 23,36 L 9,15 Q 15,16 19,22 L 23,28 L 27,22 Q 31,16 37,15 L 23,36 Z" fill="url(#split-vf-blue)" />
                      <path d="M 23,36 L 23,28" stroke="#bae6fd" strokeWidth="0.8" />
                    </g>
                  </svg>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <strong style={{ fontSize: '15.5px', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em', display: 'block', lineHeight: 1.15 }}>
                    VF KIM SƠN
                  </strong>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block' }}>
                    TRẢNG DÀI
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '6px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                  {forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}
                </h1>
              </div>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} style={{ margin: 0 }}>
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={{ display: 'block' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Email công việc</span>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b45309', opacity: 0.85 }} />
                    <input
                      type="email"
                      value={email}
                      placeholder="nhanvien@vinfast.com"
                      onChange={(event) => setEmail(event.target.value)}
                      style={{ 
                        width: '100%',
                        height: '42px',
                        paddingLeft: '42px',
                        paddingRight: '14px',
                        fontSize: '13px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        background: '#f8fafc',
                        color: '#0f172a',
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#f59e0b';
                        e.target.style.background = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.style.background = '#f8fafc';
                        e.target.style.boxShadow = 'none';
                      }}
                      required
                    />
                  </div>
                </label>

                {!forgotMode ? (
                  <label style={{ display: 'block' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.02em', textTransform: 'uppercase' }}>Mật khẩu</span>
                    <div style={{ position: 'relative', marginTop: '6px' }}>
                      <LockKeyhole size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#b45309', opacity: 0.85 }} />
                      <input
                        type="password"
                        value={password}
                        placeholder="••••••••"
                        onChange={(event) => setPassword(event.target.value)}
                        style={{ 
                          width: '100%',
                          height: '42px',
                          paddingLeft: '42px',
                          paddingRight: '14px',
                          fontSize: '13px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          color: '#0f172a',
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#f59e0b';
                          e.target.style.background = '#ffffff';
                          e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.12)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e2e8f0';
                          e.target.style.background = '#f8fafc';
                          e.target.style.boxShadow = 'none';
                        }}
                        minLength={6}
                        required
                      />
                    </div>
                  </label>
                ) : null}
              </div>

              {error ? (
                <div className="form-error" style={{ background: '#fff1f2', color: '#e11d48', padding: '10px 12px', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12.5px', fontWeight: 600, marginTop: '12px', border: '1px solid #fecdd3' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              ) : null}
              
              {message ? (
                <div className="form-success" style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 12px', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12.5px', fontWeight: 600, marginTop: '12px', border: '1px solid #bbf7d0' }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{message}</span>
                </div>
              ) : null}

              <div style={{ display: 'grid', gap: '8px', marginTop: '18px' }}>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    height: '42px', 
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    border: '1px solid rgba(251, 191, 36, 0.4)',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';
                    e.currentTarget.style.borderColor = '#f59e0b';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(217, 119, 6, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';
                    e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.4)';
                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.18)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {loading ? (
                    <Loader2 className="vin-spinner-wrap" size={16} />
                  ) : forgotMode ? (
                    <Mail size={16} />
                  ) : (
                    <LockKeyhole size={16} />
                  )}
                  <span>{loading ? 'Đang xác thực...' : forgotMode ? 'Gửi liên kết khôi phục' : 'Đăng nhập hệ thống'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessage('');
                    setForgotMode((value) => !value);
                  }}
                  disabled={loading}
                  style={{ 
                    height: '34px',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '6px', 
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#b45309';
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#64748b';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {!forgotMode ? <AlertTriangle size={13} /> : <ArrowLeft size={13} />}
                  <span>{forgotMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}</span>
                </button>
              </div>
            </form>

            {!forgotMode && (
              <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '14px', marginTop: '18px' }}>
                <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0, letterSpacing: '0.02em' }}>
                  © 2026 VinFast Kim Sơn Trảng Dài &middot; Bảo mật nội bộ
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        /* GIAO DIỆN TIÊU CHUẨN KHI HẾT MÙA TRUNG THU */
        <section className="auth-card">
          <div style={{ textAlign: 'center', display: 'grid', gap: '16px' }}>
            <div className="brand auth-brand" style={{ justifyContent: 'center' }}>
              <div className="brand-mark" style={{ width: '52px', height: '52px', fontSize: '18px', borderRadius: '14px', background: '#0f172a', color: '#fff' }}>VF</div>
              <div style={{ textAlign: 'left' }}>
                <strong style={{ fontSize: '18px', letterSpacing: '0.05em' }}>VF KIM SƠN</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>TRẢNG DÀI</span>
              </div>
            </div>

            <div style={{ marginTop: '8px' }}>
              <p className="eyebrow" style={{ color: '#0d9488', fontSize: '11px', letterSpacing: '0.15em' }}>
                {forgotMode ? 'KHÔI PHỤC TRUY CẬP' : 'CỔNG NỘI BỘ'}
              </p>
              <h1>{forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}</h1>
              <p className="auth-note">
                {forgotMode 
                  ? 'Nhập email công việc để nhận liên kết thiết lập lại mật khẩu.' 
                  : 'Hệ thống dành riêng cho nhân sự. Vui lòng đăng nhập để tiếp tục.'}
              </p>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <label>
                <span>Email công việc</span>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    value={email}
                    placeholder="nhanvien@vinfast.com"
                    onChange={(event) => setEmail(event.target.value)}
                    style={{ paddingLeft: '48px' }}
                    required
                  />
                </div>
              </label>

              {!forgotMode ? (
                <label>
                  <span>Mật khẩu</span>
                  <div style={{ position: 'relative' }}>
                    <LockKeyhole size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="password"
                      value={password}
                      placeholder="••••••••"
                      onChange={(event) => setPassword(event.target.value)}
                      style={{ paddingLeft: '48px' }}
                      minLength={6}
                      required
                    />
                  </div>
                </label>
              ) : null}
            </div>

            {error ? (
              <div className="form-error" style={{ background: '#fff1f2', color: '#e11d48', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            ) : null}
            
            {message ? (
              <div className="form-success" style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
                <CheckCircle2 size={18} />
                <span>{message}</span>
              </div>
            ) : null}

            <div style={{ display: 'grid', gap: '12px', marginTop: '8px' }}>
              <button className="primary-button auth-submit" type="submit" disabled={loading} style={{ background: '#0f172a', color: '#fff' }}>
                {loading ? (
                  <Loader2 className="vin-spinner-wrap" size={18} />
                ) : forgotMode ? (
                  <Mail size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}
                <span>{loading ? 'Đang xử lý...' : forgotMode ? 'Gửi link khôi phục' : 'Đăng nhập ngay'}</span>
              </button>

              <button
                type="button"
                className="auth-switch"
                onClick={() => {
                  setError('');
                  setMessage('');
                  setForgotMode((value) => !value);
                }}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              >
                {!forgotMode ? <AlertTriangle size={16} /> : <ArrowLeft size={16} />}
                <span>{forgotMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}</span>
              </button>
            </div>
          </form>

          {!forgotMode && (
            <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                © 2026 Kim Sơn Trảng Dài &middot; VinFast
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
};
