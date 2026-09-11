import React from 'react';
// @ts-ignore
import multiavatarModule from '@multiavatar/multiavatar/esm';

const multiavatar = (typeof multiavatarModule === 'function'
  ? multiavatarModule
  : (multiavatarModule as any)?.default || multiavatarModule) as (seed: string) => string;

/**
 * Tạo vector avatar cho người dùng mỗi khi truy cập (lưu trong sessionStorage của phiên đó)
 */
export function getUserSessionAvatar(userId: string, userName?: string): string {
  if (!userId) return multiavatar('guest');
  try {
    const storageKey = `avatar_seed_${userId}`;
    let seed = sessionStorage.getItem(storageKey);
    if (!seed) {
      // Tạo seed mới mỗi khi truy cập phiên làm việc mới
      const randomSuffix = Math.floor(Math.random() * 1000000);
      seed = `${userName || userId}_${randomSuffix}`;
      sessionStorage.setItem(storageKey, seed);
    }
    return multiavatar(seed);
  } catch {
    return multiavatar(userName || userId);
  }
}

/**
 * Đổi ngẫu nhiên diện mạo avatar mới cho người dùng hiện tại
 */
export function refreshUserSessionAvatar(userId: string, userName?: string): string {
  const storageKey = `avatar_seed_${userId}`;
  const newSeed = `${userName || userId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    sessionStorage.setItem(storageKey, newSeed);
  } catch {}
  return multiavatar(newSeed);
}

/**
 * Tạo vector avatar ổn định theo tên/id nhân sự cho danh sách nhân viên & bảng thi đua
 */
export function getStaffAvatar(seedStr: string): string {
  try {
    return multiavatar(seedStr || 'staff');
  } catch {
    return multiavatar('staff');
  }
}

/**
 * Component hiển thị avatar SVG từ multiavatar chuẩn xác và sắc nét
 */
export const MultiavatarView: React.FC<{
  seed?: string;
  svg?: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ seed, svg, size = '100%', className, style }) => {
  const content = svg || (seed ? multiavatar(seed) : multiavatar('staff'));
  return React.createElement('div', {
    className: `multiavatar-box ${className || ''}`,
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      ...style
    },
    dangerouslySetInnerHTML: { __html: content }
  });
};

