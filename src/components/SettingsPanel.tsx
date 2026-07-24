import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, Car, PaintBucket, Armchair, 
  BadgeDollarSign, Pencil, Check, X, Tag, ChevronRight, Search
} from 'lucide-react';
import { VehicleConfigRow, SalesPolicyRow } from '../types';
import * as apiService from '../services/apiService';

interface SettingsPanelProps {
  configs: VehicleConfigRow[];
  onRefresh: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ configs, onRefresh }) => {
  // Main Tab Navigation
  const [activeTab, setActiveTab] = useState<'lines' | 'exteriors' | 'interiors' | 'policies'>('lines');

  // Car lines master-detail state
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [newLine, setNewLine] = useState('');
  const [newVersion, setNewVersion] = useState('');
  
  // Colors state
  const [newExterior, setNewExterior] = useState('');
  const [newInterior, setNewInterior] = useState('');
  const [colorSearch, setColorSearch] = useState('');

  // Policies state
  const [policies, setPolicies] = useState<SalesPolicyRow[]>([]);
  const [newPolicyName, setNewPolicyName] = useState('');
  const [newPolicyLine, setNewPolicyLine] = useState('');
  const [newPolicyStatus, setNewPolicyStatus] = useState('Hoạt động');
  const [newPolicyExpiry, setNewPolicyExpiry] = useState('');
  const [editingPolicyIndex, setEditingPolicyIndex] = useState<number | null>(null);

  // Edit config inline
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
  const versions = configs.filter(c => c.type === 'version' && c.parent_value === selectedLine).sort((a, b) => a.value.localeCompare(b.value));
  const exteriors = configs.filter(c => c.type === 'exterior').sort((a, b) => a.value.localeCompare(b.value));
  const interiors = configs.filter(c => c.type === 'interior').sort((a, b) => a.value.localeCompare(b.value));

  // Default selected line to first item if not set
  React.useEffect(() => {
    if (lines.length > 0 && (!selectedLine || !lines.some(l => l.value === selectedLine))) {
      setSelectedLine(lines[0].value);
    }
  }, [lines, selectedLine]);

  React.useEffect(() => {
    if (activeTab === 'policies') {
      loadPolicies();
    }
  }, [activeTab]);

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
    setSelectedLine(val);
    onRefresh();
  };

  const handleAddVersion = async () => {
    const val = newVersion.trim();
    if (!val || !selectedLine) return;
    if (versions.some(v => v.value.toLowerCase() === val.toLowerCase())) {
      alert('Phiên bản đã tồn tại cho dòng xe này!');
      return;
    }
    const { error } = await apiService.createVehicleConfig({ type: 'version', value: val, parent_value: selectedLine });
    if (error) {
      alert(`Lỗi thêm phiên bản: ${error.message}`);
      return;
    }
    setNewVersion('');
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
      if (selectedLine === config.value) setSelectedLine(val);
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

  const filteredExteriors = exteriors.filter(e => e.value.toLowerCase().includes(colorSearch.toLowerCase()));
  const filteredInteriors = interiors.filter(i => i.value.toLowerCase().includes(colorSearch.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* APP HEADER */}
      <div style={{ 
        background: '#ffffff', padding: '20px 24px 0 24px', borderBottom: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Cấu hình hệ thống
            </h1>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Quản lý danh mục Dòng xe, Màu sắc và Chính sách ưu mại</span>
          </div>
        </div>

        {/* TOP SEGMENTED CONTROL TABS */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', width: 'fit-content' }}>
          {[
            { key: 'lines', label: 'Dòng xe & Phiên bản', icon: Car, count: lines.length },
            { key: 'exteriors', label: 'Màu ngoại thất', icon: PaintBucket, count: exteriors.length },
            { key: 'interiors', label: 'Màu nội thất', icon: Armchair, count: interiors.length },
            { key: 'policies', label: 'Chính sách bán hàng', icon: BadgeDollarSign, count: policies.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px',
                  borderRadius: '9px', border: 'none', cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500, fontSize: '13.5px',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#0f766e' : '#64748b',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} style={{ color: isActive ? '#0f766e' : '#94a3b8' }} />
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? '#ccfbf1' : '#e2e8f0',
                  color: isActive ? '#0f766e' : '#64748b',
                  fontSize: '11px', padding: '1px 7px', borderRadius: '999px', fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN WORKSPACE CONTENT */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* ================= TAB 1: DÒNG XE & PHIÊN BẢN (CLEAN MASTER-DETAIL 2 COLUMNS) ================= */}
        {activeTab === 'lines' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
            
            {/* LEFT COLUMN: MASTER DÒNG XE LIST */}
            <div style={{ 
              background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
              display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>Danh sách Dòng xe ({lines.length})</span>
              </div>

              {/* Add New Line Input */}
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  placeholder="+ Thêm dòng xe (VD: VF 3)..." 
                  value={newLine} 
                  onChange={(e) => setNewLine(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                  style={{ flex: 1, padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
                <button 
                  onClick={handleAddLine} 
                  disabled={!newLine.trim()}
                  style={{ padding: '7px 12px', borderRadius: '8px', border: 'none', background: newLine.trim() ? '#0f766e' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
                >
                  Thêm
                </button>
              </div>

              {/* Vertical Scroll List of Lines */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
                {lines.map(line => {
                  const isSelected = selectedLine === line.value;
                  const versionCount = configs.filter(c => c.type === 'version' && c.parent_value === line.value).length;

                  return (
                    <div 
                      key={line.id} 
                      onClick={() => setSelectedLine(line.value)}
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px',
                        background: isSelected ? '#f0fdf4' : 'transparent',
                        borderLeft: isSelected ? '4px solid #0f766e' : '4px solid transparent',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {editingConfigId === line.id ? (
                        <div style={{ display: 'flex', flex: 1, gap: '6px' }} onClick={e => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={editConfigValue} 
                            onChange={(e) => setEditConfigValue(e.target.value)} 
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(line)}
                            autoFocus
                            style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #0f766e', fontSize: '13px' }}
                          />
                          <button onClick={() => handleSaveEditConfig(line)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}><Check size={13} /></button>
                          <button onClick={() => setEditingConfigId(null)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}><X size={13} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <Car size={16} style={{ color: isSelected ? '#0f766e' : '#94a3b8' }} />
                          <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#0f766e' : '#1e293b', fontSize: '14px' }}>
                            {line.value}
                          </span>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', background: isSelected ? '#ccfbf1' : '#f1f5f9', color: isSelected ? '#0f766e' : '#64748b', padding: '2px 7px', borderRadius: '999px', fontWeight: 600 }}>
                          {versionCount}
                        </span>
                        <button title="Sửa tên" onClick={(e) => { e.stopPropagation(); setEditingConfigId(line.id!); setEditConfigValue(line.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}>
                          <Pencil size={14} />
                        </button>
                        <button title="Xóa" onClick={(e) => { e.stopPropagation(); handleDelete(line.id!, line.value); }} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}>
                          <Trash2 size={14} />
                        </button>
                        {isSelected && <ChevronRight size={16} style={{ color: '#0f766e' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: DETAILS & VERSIONS OF SELECTED DÒNG XE */}
            <div style={{ 
              background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
              display: 'flex', flexDirection: 'column', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', pb: '12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={20} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                      Phiên bản của <span style={{ color: '#0f766e' }}>{selectedLine || '...'}</span>
                    </h2>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>{versions.length} phiên bản đang hoạt động</span>
                  </div>
                </div>

                {/* Add Version Input Top */}
                <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px 6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="text" 
                    placeholder={`+ Thêm phiên bản cho ${selectedLine}...`} 
                    value={newVersion} 
                    onChange={(e) => setNewVersion(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddVersion()}
                    style={{ width: '240px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                  <button 
                    onClick={handleAddVersion} 
                    disabled={!newVersion.trim() || !selectedLine}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: (newVersion.trim() && selectedLine) ? '#0284c7' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Thêm phiên bản
                  </button>
                </div>
              </div>

              {/* Version Grid / Table */}
              <div style={{ overflowY: 'auto', flex: 1 }}>
                {versions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <Car size={40} style={{ opacity: 0.3, marginBottom: '10px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>Chưa có phiên bản nào cho dòng xe <b>{selectedLine}</b>.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {versions.map(ver => (
                      <div 
                        key={ver.id}
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', 
                          border: '1px solid #e2e8f0'
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Tag size={15} style={{ color: '#0284c7' }} />
                            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{ver.value}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button title="Sửa" onClick={() => { setEditingConfigId(ver.id!); setEditConfigValue(ver.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', padding: '4px' }}><Pencil size={15} /></button>
                          <button title="Xóa" onClick={() => handleDelete(ver.id!, ver.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><Trash2 size={15} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 2: MÀU NGOẠI THẤT ================= */}
        {activeTab === 'exteriors' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Danh mục Màu Ngoại thất ({exteriors.length})</h2>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Bảng màu sơn ngoài áp dụng trên toàn hệ thống</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Lọc màu..." 
                    value={colorSearch}
                    onChange={e => setColorSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="text" 
                    placeholder="+ Thêm màu ngoại thất mới..." 
                    value={newExterior} 
                    onChange={(e) => setNewExterior(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
                    style={{ width: '250px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                  <button onClick={handleAddExterior} disabled={!newExterior.trim()} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: newExterior.trim() ? '#16a34a' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    Thêm
                  </button>
                </div>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {filteredExteriors.map(ext => (
                <div key={ext.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  {editingConfigId === ext.id ? (
                    <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                      <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ext)} autoFocus style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #16a34a', fontSize: '13px' }} />
                      <button onClick={() => handleSaveEditConfig(ext)} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '4px', padding: '4px 8px' }}><Check size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#16a34a' }} />
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{ext.value}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => { setEditingConfigId(ext.id!); setEditConfigValue(ext.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(ext.id!, ext.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: MÀU NỘI THẤT ================= */}
        {activeTab === 'interiors' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Danh mục Màu Nội thất ({interiors.length})</h2>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Tùy chọn chất liệu & màu sắc khoang nội thất</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Lọc màu..." 
                    value={colorSearch}
                    onChange={e => setColorSearch(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="text" 
                    placeholder="+ Thêm màu nội thất mới..." 
                    value={newInterior} 
                    onChange={(e) => setNewInterior(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
                    style={{ width: '250px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                  <button onClick={handleAddInterior} disabled={!newInterior.trim()} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: newInterior.trim() ? '#d97706' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                    Thêm
                  </button>
                </div>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', alignContent: 'start' }}>
              {filteredInteriors.map(int => (
                <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  {editingConfigId === int.id ? (
                    <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                      <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(int)} autoFocus style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #d97706', fontSize: '13px' }} />
                      <button onClick={() => handleSaveEditConfig(int)} style={{ border: 'none', background: '#d97706', color: '#fff', borderRadius: '4px', padding: '4px 8px' }}><Check size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Armchair size={16} style={{ color: '#d97706' }} />
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{int.value}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => { setEditingConfigId(int.id!); setEditConfigValue(int.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(int.id!, int.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 4: CHÍNH SÁCH BÁN HÀNG ================= */}
        {activeTab === 'policies' && (
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Chính sách bán hàng ({policies.length})</h2>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Thiết lập gói ưu mãi khuyến mãi áp dụng theo từng dòng xe</span>
              </div>
            </div>

            {/* Add Policy Row */}
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
                        <input type="checkbox" checked={!newPolicyLine} readOnly />
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
                            <input type="checkbox" checked={isSelected} readOnly />
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
                      display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', 
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

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.04em' }}>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Tên chính sách</th>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Dòng xe áp dụng</th>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Hạn sử dụng</th>
                    <th style={{ textAlign: 'left', padding: '14px 16px', fontWeight: 700 }}>Trạng thái</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontWeight: 700 }}>Thao tác</th>
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
                                    <input type="checkbox" checked={!editPolicyData.line} readOnly />
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
                                        <input type="checkbox" checked={isSelected} readOnly />
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
                        <td style={{ padding: '14px 16.px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
        )}
      </div>
    </div>
  );
};
