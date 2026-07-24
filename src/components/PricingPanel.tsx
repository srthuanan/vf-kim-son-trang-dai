import React from 'react';

export const PricingPanel: React.FC = () => {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 80px)', minHeight: '650px', borderRadius: '16px', overflow: 'hidden', background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <iframe
        src="/tinh-gia-xe.html"
        title="Công Cụ Tính Giá Xe VinFast - Kim Sơn Trảng Dài"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
};
