import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, Car, PaintBucket, Armchair, GitBranch, 
  BadgeDollarSign, Pencil, Check, X, Tag, Calendar, Layers, Search, Sparkles, SlidersHorizontal, Eye
} from 'lucide-react';
import { VehicleConfigRow, SalesPolicyRow } from '../types';
import * as apiService from '../services/apiService';

interface SettingsPanelProps {
  configs: VehicleConfigRow[];
  onRefresh: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ configs, onRefresh }) => {
  const [newLine, setNewLine] = useState('');
  const [newVersionInputs, setNewVersionInputs] = useState<Record<string, string>>({});
  
  const [newExterior, setNewExterior] = useState('');
  const [newInterior, setNewInterior] = useState('');

  const [policies, setPolicies] = useState<SalesPolicyRow[]>([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyLine, setNewPolicyLine] = useState('');
  const [newPolicyStatus, setNewPolicyStatus] = useState('Hoạt động');
  const [newPolicyExpiry, setNewPolicyExpiry] = useState('');
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(null);

  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [editConfigValue, setEditConfigValue] = useState('');

  const [editPolicyData, setEditPolicyData] = useState({ name: '', line: '', expiry: '', status: 'Hoạt động' });

  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [isInlineDropdownOpen, setIsInlineDropdownOpen] = useState(false);
  const lineDropdownRef = React.useRef<HTMLDivElement>(null);
  const inlineDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (lineDropdownRef.current && !lineDropdownRef.current.contains(event.target as Node)) {
        setIsAddDropdownOpen(false);
      }
      if (inlineDropdownRef.current && !inlineDropdownRef.current.contains(event.target as Node)) {
        setIsInlineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const lines = configs.filter(c => c.type === 'line').sort((a, b) => a.value.localeCompare(b.value));
  const exteriors = configs.filter(c => c.type === 'exterior').sort((a, b) => a.value.localeCompare(b.value));
  const interiors = configs.filter(c => c.type === 'interior').sort((a, b) => a.value.localeCompare(b.value));

  React.useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    const { data } = await apiService.getAllSalesPolicies();
    setPolicies(data);
  };

  const handleAddLine = async () => {
    const val = newLine.trim();
    if (!val) return;
    if (lines.some(l => l.value.toLowerCase() === val.toLowerCase())) {
      alert('Dòng xe đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'line', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm dòng xe: ${error.message}`);
      return;
    }
    setNewLine('');
    onRefresh();
  };

  const handleAddVersionFor = async (lineVal: string) => {
    const val = (newVersionInputs[lineVal] || '').trim();
    if (!val) return;
    
    const existingVersions = configs.filter(c => c.type === 'version' && c.parent_value === lineVal);
    if (existingVersions.some(v => v.value.toLowerCase() === val.toLowerCase())) {
      alert('Phiên bản đã tồn tại cho dòng xe này!');
      return;
    }
    
    const { error } = await apiService.createVehicleConfig({ type: 'version', value: val, parent_value: lineVal });
    if (error) {
      alert(`Lỗi thêm phiên bản: ${error.message}`);
      return;
    }

    setNewVersionInputs(prev => ({ ...prev, [lineVal]: '' }));
    onRefresh();
  };

  const handleAddExterior = async () => {
    const val = newExterior.trim();
    if (!val) return;
    if (exteriors.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Màu ngoại thất đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'exterior', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm màu ngoại thất: ${error.message}`);
      return;
    }
    setNewExterior('');
    onRefresh();
  };

  const handleAddInterior = async () => {
    const val = newInterior.trim();
    if (!val) return;
    if (interiors.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Màu nội thất đã tồn tại!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'interior', value: val, parent_value: null });
    if (error) {
      alert(`Lỗi thêm màu nội thất: ${error.message}`);
      return;
    }
    setNewInterior('');
    onRefresh();
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) {
      const { error } = await apiService.deleteVehicleConfig(id);
      if (error) {
        alert(`Lỗi xóa: ${error.message}`);
        return;
      }
      onRefresh();
    }
  };

  const handleSaveEditConfig = async (config: VehicleConfigRow) => {
    const val = editConfigValue.trim();
    if (!val || val === config.value) {
      setEditingConfigId(null);
      return;
    }

    const siblings = configs.filter(c => c.type === config.type && c.parent_value === config.parent_value && c.id !== config.id);
    if (siblings.some(c => c.value.toLowerCase() === val.toLowerCase())) {
      alert('Giá trị này đã tồn tại!');
      return;
    }

    const { error } = await apiService.updateVehicleConfig(config.id!, { value: val });
    if (error) {
      alert(`Lỗi cập nhật: ${error.message}`);
      return;
    }

    if (config.type === 'line') {
      const children = configs.filter(c => c.type === 'version' && c.parent_value === config.value);
      for (const child of children) {
        await apiService.updateVehicleConfig(child.id!, { parent_value: val });
      }
    }

    setEditingConfigId(null);
    onRefresh();
  };

  const handleAddPolicy = async () => {
    const val = newPolicyName.trim();
    if (!val) return;
    
    const { error } = await apiService.createSalesPolicy({
      ten_chinh_sach: val,
      dong_xe: newPolicyLine.trim() || 'Tất cả',
      trang_thai: newPolicyStatus,
      han_su_dung: newPolicyExpiry.trim() || null
    });
    if (error) {
      alert(`Lỗi thêm chính sách: ${error.message}`);
      return;
    }
    
    setNewPolicyName('');
    setNewPolicyLine('');
    setNewPolicyExpiry('');
    setNewPolicyStatus('Hoạt động');
    loadPolicies();
  };

  const handleSaveInlinePolicy = async () => {
    if (!editPolicyData.name.trim() || editingPolicyIndex === null) return;
    const p = policies[editingPolicyIndex];
    if (!p) return;
    
    const { error } = await apiService.updateSalesPolicy(p.id || '', {
      ten_chinh_sach: editPolicyData.name,
      dong_xe: editPolicyData.line.trim() || 'Tất cả',
      trang_thai: editPolicyData.status,
      han_su_dung: editPolicyData.expiry.trim() || null
    }, p.ten_chinh_sach);
    if (error) {
      alert(`Lỗi cập nhật chính sách: ${error.message}`);
      return;
    }
    setEditingPolicyIndex(null);
    loadPolicies();
  };

  const handleEditPolicy = (p: SalesPolicyRow, index: number) => {
    setEditingPolicyIndex(index);
    setEditPolicyData({ name: p.ten_chinh_sach, line: p.dong_xe || '', expiry: p.han_su_dung || '', status: p.trang_thai || 'Hoạt động' });
  };

  const handleCancelEditPolicy = () => {
    setEditingPolicyIndex(null);
  };

  const handleDeletePolicy = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${name}"?`)) {
      const { error } = await apiService.deleteSalesPolicy(id || '', name);
      if (error) {
        alert(`Lỗi xóa chính sách: ${error.message}`);
        return;
      }
      loadPolicies();
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflowY: 'auto', padding: '24px', gap: '28px' }}>
      
      {/* HEADER DASHBOARD BANNER */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', 
        borderRadius: '20px', padding: '24px 30px', color: '#ffffff',
        boxShadow: '0 10px 25px -5px rgba(15, 118, 110, 0.25)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
            <SlidersHorizontal size={28} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Quản lý Cấu hình & Ưu đãi Hệ thống
            </h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13.5px', color: '#ccfbf1' }}>
              Trang tổng quan Tất-cả-trong-1: Tùy chỉnh Dòng xe, Phiên bản, Màu sắc & Chính sách trực tiếp
            </p>
          </div>
        </div>

        {/* Quick Nav Anchors */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'section-cars', label: 'Dòng xe & Phiên bản', icon: Car, count: lines.length },
            { id: 'section-colors', label: 'Màu Ngoại/Nội thất', icon: PaintBucket, count: exteriors.length + interiors.length },
            { id: 'section-policies', label: 'Chính sách bán hàng', icon: BadgeDollarSign, count: policies.length },
          ].map((nav) => {
            const Icon = nav.icon;
            return (
              <button
                key={nav.id}
                onClick={() => scrollToSection(nav.id)}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', 
                  borderRadius: '10px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)', 
                  color: '#fff', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s', backdropFilter: 'blur(4px)'
                }}
              >
                <Icon size={15} />
                <span>{nav.label}</span>
                <span style={{ background: '#ffffff', color: '#0f766e', fontSize: '11px', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                  {nav.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: VISUAL CAR CARDS (DÒNG XE & PHIÊN BẢN) */}
      <div id="section-cars" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>1. Danh mục Dòng xe & Phiên bản</h2>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>Mỗi dòng xe được thiết kế dạng Thẻ độc lập, có sẵn ô thêm phiên bản trực tiếp</span>
            </div>
          </div>

          {/* Add New Line Header Input */}
          <div style={{ display: 'flex', gap: '8px', background: '#ffffff', padding: '6px 8px', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <input 
              type="text" 
              placeholder="+ Nhập dòng xe mới (VD: VF 3)..." 
              value={newLine} 
              onChange={(e) => setNewLine(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
              style={{ width: '250px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
            />
            <button 
              onClick={handleAddLine} 
              disabled={!newLine.trim()}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: newLine.trim() ? '#0f766e' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px',
                cursor: newLine.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              <Plus size={16} /> Thêm dòng xe
            </button>
          </div>
        </div>

        {/* Grid of Car Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {lines.map(line => {
            const lineVersions = configs.filter(c => c.type === 'version' && c.parent_value === line.value).sort((a, b) => a.value.localeCompare(b.value));

            return (
              <div 
                key={line.id} 
                style={{ 
                  background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', 
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column',
                  overflow: 'hidden', transition: 'all 0.2s ease'
                }}
              >
                {/* Car Card Header */}
                <div style={{ 
                  padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                  borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Car size={20} />
                    </div>

                    {editingConfigId === line.id ? (
                      <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                        <input 
                          type="text" 
                          value={editConfigValue} 
                          onChange={(e) => setEditConfigValue(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(line)}
                          autoFocus
                          style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '14px', outline: 'none' }}
                        />
                        <button onClick={() => handleSaveEditConfig(line)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer' }}><Check size={14} /></button>
                        <button onClick={() => setEditingConfigId(null)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{line.value}</h3>
                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>{lineVersions.length} phiên bản</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      title="Đổi tên dòng xe" 
                      onClick={() => { setEditingConfigId(line.id!); setEditConfigValue(line.value); }} 
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#ffffff', color: '#2563eb', cursor: 'pointer', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      title="Xóa dòng xe" 
                      onClick={() => handleDelete(line.id!, line.value)} 
                      style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#ffffff', color: '#dc2626', cursor: 'pointer', display: 'flex', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Versions Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: '130px' }}>
                  {lineVersions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px 10px', color: '#94a3b8', fontSize: '13px' }}>
                      Chưa có phiên bản. Gõ bên dưới để thêm nhanh!
                    </div>
                  ) : (
                    lineVersions.map(ver => (
                      <div 
                        key={ver.id}
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', 
                          border: '1px solid #f1f5f9', fontSize: '13.5px', fontWeight: 600, color: '#334155'
                        }}
                      >
                        {editingConfigId === ver.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <input 
                              type="text" 
                              value={editConfigValue} 
                              onChange={(e) => setEditConfigValue(e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ver)}
                              autoFocus
                              style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #0284c7', fontSize: '13px' }}
                            />
                            <button onClick={() => handleSaveEditConfig(ver)} style={{ border: 'none', background: '#0284c7', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><Check size={13} /></button>
                            <button onClick={() => setEditingConfigId(null)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><X size={13} /></button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Tag size={14} style={{ color: '#0284c7' }} />
                              <span>{ver.value}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => { setEditingConfigId(ver.id!); setEditConfigValue(ver.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}><Pencil size={13} /></button>
                              <button onClick={() => handleDelete(ver.id!, ver.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={13} /></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Add Version Footer */}
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    placeholder={`+ Thêm phiên bản cho ${line.value}...`}
                    value={newVersionInputs[line.value] || ''}
                    onChange={(e) => setNewVersionInputs({ ...newVersionInputs, [line.value]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddVersionFor(line.value)}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', outline: 'none', background: '#fff' }}
                  />
                  <button 
                    onClick={() => handleAddVersionFor(line.value)}
                    disabled={!(newVersionInputs[line.value] || '').trim()}
                    style={{ 
                      padding: '7px 12px', borderRadius: '8px', border: 'none', 
                      background: (newVersionInputs[line.value] || '').trim() ? '#0f766e' : '#cbd5e1', 
                      color: '#fff', fontWeight: 600, fontSize: '12.5px', cursor: (newVersionInputs[line.value] || '').trim() ? 'pointer' : 'not-allowed'
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: MÀU NGOẠI THẤT & NỘI THẤT (SIDE BY SIDE) */}
      <div id="section-colors" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* Card Ngoại thất */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PaintBucket size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>2. Màu Ngoại thất ({exteriors.length})</h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="Thêm màu ngoại thất (VD: Trắng CE18)..." 
              value={newExterior} 
              onChange={(e) => setNewExterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
            />
            <button 
              onClick={handleAddExterior} 
              disabled={!newExterior.trim()}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: newExterior.trim() ? '#16a34a' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: newExterior.trim() ? 'pointer' : 'not-allowed' }}
            >
              Thêm
            </button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '280px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {exteriors.map(ext => (
              <div key={ext.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                {editingConfigId === ext.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                    <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ext)} autoFocus style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid #16a34a', fontSize: '13px' }} />
                    <button onClick={() => handleSaveEditConfig(ext)} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '4px', padding: '4px 6px' }}><Check size={12} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#16a34a' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{ext.value}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button onClick={() => { setEditingConfigId(ext.id!); setEditConfigValue(ext.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(ext.id!, ext.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Nội thất */}
        <div style={{ background: '#ffffff', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Armchair size={18} />
              </div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>3. Màu Nội thất ({interiors.length})</h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="Thêm màu nội thất (VD: Đen, Nâu)..." 
              value={newInterior} 
              onChange={(e) => setNewInterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
            />
            <button 
              onClick={handleAddInterior} 
              disabled={!newInterior.trim()}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: newInterior.trim() ? '#d97706' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: newInterior.trim() ? 'pointer' : 'not-allowed' }}
            >
              Thêm
            </button>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '280px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {interiors.map(int => (
              <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                {editingConfigId === int.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                    <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(int)} autoFocus style={{ flex: 1, padding: '4px 6px', borderRadius: '4px', border: '1px solid #d97706', fontSize: '13px' }} />
                    <button onClick={() => handleSaveEditConfig(int)} style={{ border: 'none', background: '#d97706', color: '#fff', borderRadius: '4px', padding: '4px 6px' }}><Check size={12} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Armchair size={14} style={{ color: '#d97706' }} />
                    <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>{int.value}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '2px' }}>
                  <button onClick={() => { setEditingConfigId(int.id!); setEditConfigValue(int.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(int.id!, int.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 3: CHÍNH SÁCH BÁN HÀNG */}
      <div id="section-policies" style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BadgeDollarSign size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>4. Quản lý Chính sách bán hàng ({policies.length})</h3>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>Tùy chỉnh các gói khuyến mãi & chính sách áp dụng theo dòng xe</span>
          </div>
        </div>

        {/* Add Policy Form Row */}
        <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Tên chính sách</label>
              <input 
                type="text" 
                placeholder="VD: Mùa Hè Rực Rỡ 2%..." 
                value={newPolicyName} 
                onChange={(e) => setNewPolicyName(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
              />
            </div>

            <div ref={lineDropdownRef} style={{ position: 'relative' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Dòng xe áp dụng</label>
              <div 
                onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', minHeight: '38px', display: 'flex', alignItems: 'center' }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: newPolicyLine ? '#0f172a' : '#64748b', fontSize: '13px', fontWeight: 500 }}>
                  {newPolicyLine || 'Tất cả các dòng xe'}
                </span>
              </div>
              
              {isAddDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                  <div 
                    onClick={() => setNewPolicyLine('')}
                    style={{ padding: '8px 12px', cursor: 'pointer', background: !newPolicyLine ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}
                  >
                    <input type="checkbox" checked={!newPolicyLine} readOnly style={{ cursor: 'pointer' }} />
                    <span style={{ fontWeight: 600 }}>Tất cả các dòng xe</span>
                  </div>
                  {lines.map(l => {
                    const currentLines = newPolicyLine ? newPolicyLine.split(',').map(s => s.trim()).filter(Boolean) : [];
                    const isSelected = currentLines.includes(l.value);
                    return (
                      <div 
                        key={l.id} 
                        onClick={() => {
                          let updated = [...currentLines];
                          if (isSelected) {
                            updated = updated.filter(item => item !== l.value);
                          } else {
                            updated.push(l.value);
                          }
                          setNewPolicyLine(updated.join(', '));
                        }}
                        style={{ padding: '8px 12px', cursor: 'pointer', background: isSelected ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                      >
                        <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                        <span>{l.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Hạn sử dụng</label>
              <input 
                type="text" 
                placeholder="VD: 30/06/2026" 
                value={newPolicyExpiry} 
                onChange={(e) => setNewPolicyExpiry(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>Trạng thái</label>
              <select 
                value={newPolicyStatus} 
                onChange={(e) => setNewPolicyStatus(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
              >
                <option value="Hoạt động">Hoạt động</option>
                <option value="Ngừng hoạt động">Ngừng hoạt động</option>
              </select>
            </div>

            <div>
              <button 
                onClick={handleAddPolicy} 
                disabled={!newPolicyName.trim()} 
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', 
                  borderRadius: '8px', border: 'none', 
                  background: newPolicyName.trim() ? '#2563eb' : '#cbd5e1', 
                  color: '#fff', fontWeight: 600, fontSize: '13px', 
                  cursor: newPolicyName.trim() ? 'pointer' : 'not-allowed', height: '38px' 
                }}
              >
                <Plus size={16} /> Thêm mới
              </button>
            </div>
          </div>
        </div>

        {/* Policy Table */}
        <div style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.04em' }}>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Tên chính sách</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Dòng xe áp dụng</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Hạn sử dụng</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight 700 }}>Trạng thái</th>
                <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight 700 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p, index) => {
                if (editingPolicyIndex === index) {
                  return (
                    <tr key={p.id || index} style={{ borderBottom: '1px solid #e2e8f0', background: '#eff6ff' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <input type="text" value={editPolicyData.name} onChange={e => setEditPolicyData({...editPolicyData, name: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #2563eb' }} />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div ref={inlineDropdownRef} style={{ position: 'relative' }}>
                          <div 
                            onClick={() => setIsInlineDropdownOpen(!isInlineDropdownOpen)}
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #2563eb', cursor: 'pointer', background: '#fff', minHeight: '34px', display: 'flex', alignItems: 'center' }}
                          >
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: editPolicyData.line ? '#0f172a' : '#64748b', fontSize: '13px' }}>
                              {editPolicyData.line || 'Tất cả'}
                            </span>
                          </div>
                          {isInlineDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', marginTop: '4px', zIndex: 9999, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                              <div 
                                onClick={() => setEditPolicyData({...editPolicyData, line: ''})}
                                style={{ padding: '8px 12px', cursor: 'pointer', background: !editPolicyData.line ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', fontSize: '13px' }}
                              >
                                <input type="checkbox" checked={!editPolicyData.line} readOnly style={{ cursor: 'pointer' }} />
                                <span style={{ fontWeight: 600 }}>Tất cả các dòng xe</span>
                              </div>
                              {lines.map(l => {
                                const currentLines = editPolicyData.line ? editPolicyData.line.split(',').map(s => s.trim()).filter(Boolean) : [];
                                const isSelected = currentLines.includes(l.value);
                                return (
                                  <div 
                                    key={l.id} 
                                    onClick={() => {
                                      let updated = [...currentLines];
                                      if (isSelected) {
                                        updated = updated.filter(item => item !== l.value);
                                      } else {
                                        updated.push(l.value);
                                      }
                                      setEditPolicyData({...editPolicyData, line: updated.join(', ')});
                                    }}
                                    style={{ padding: '8px 12px', cursor: 'pointer', background: isSelected ? '#f1f5f9' : '#fff', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                                  >
                                    <input type="checkbox" checked={isSelected} readOnly style={{ cursor: 'pointer' }} />
                                    <span>{l.value}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <input type="text" value={editPolicyData.expiry} onChange={e => setEditPolicyData({...editPolicyData, expiry: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #2563eb' }} />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <select value={editPolicyData.status} onChange={e => setEditPolicyData({...editPolicyData, status: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #2563eb' }}>
                          <option value="Hoạt động">Hoạt động</option>
                          <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button onClick={handleSaveInlinePolicy} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Lưu</button>
                        <button onClick={handleCancelEditPolicy} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Hủy</button>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={p.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{p.ten_chinh_sach}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 500 }}>
                        {p.dong_xe || 'Tất cả'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                      {p.han_su_dung || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
                        background: p.trang_thai === 'Hoạt động' ? '#dcfce7' : '#f1f5f9',
                        color: p.trang_thai === 'Hoạt động' ? '#15803d' : '#64748b'
                      }}>
                        {p.trang_thai || 'Hoạt động'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button title="Sửa" onClick={() => handleEditPolicy(p, index)} style={{ padding: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}>
                        <Pencil size={16} />
                      </button>
                      <button title="Xóa" onClick={() => handleDeletePolicy(p.id || '', p.ten_chinh_sach)} style={{ padding: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
