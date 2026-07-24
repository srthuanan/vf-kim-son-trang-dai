import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, Car, PaintBucket, Armchair, 
  BadgeDollarSign, Pencil, Check, X, Tag, SlidersHorizontal, Layers, Palette, Sparkles, FolderPlus 
} from 'lucide-react';
import { VehicleConfigRow, SalesPolicyRow } from '../types';
import * as apiService from '../services/apiService';

interface SettingsPanelProps {
  configs: VehicleConfigRow[];
  onRefresh: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ configs, onRefresh }) => {
  // Level 1 Tab: 'vehicles' | 'colors' | 'policies'
  const [mainTab, setMainTab] = useState<'vehicles' | 'colors' | 'policies'>('vehicles');

  // Level 2 Tabs for Vehicles: selected Line value ('all' or specific line name)
  const [selectedLineTab, setSelectedLineTab] = useState<string>('all');

  // Level 2 Tabs for Colors: 'exteriors' | 'interiors'
  const [colorSubTab, setColorSubTab] = useState<'exteriors' | 'interiors'>('exteriors');

  // Level 2 Tabs for Policies: 'list' | 'create'
  const [policySubTab, setPolicySubTab] = useState<'list' | 'create'>('list');

  // Form states
  const [newLine, setNewLine] = useState('');
  const [isAddingLineModal, setIsAddingLineModal] = useState(false);
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

  // Set default selected line tab if current selection is invalid
  React.useEffect(() => {
    if (selectedLineTab !== 'all' && lines.length > 0 && !lines.some(l => l.value === selectedLineTab)) {
      setSelectedLineTab('all');
    }
  }, [lines, selectedLineTab]);

  React.useEffect(() => {
    if (mainTab === 'policies') {
      loadPolicies();
    }
  }, [mainTab]);

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
    setSelectedLineTab(val);
    setIsAddingLineModal(false);
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
      if (selectedLineTab === config.value) setSelectedLineTab(val);
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
    setPolicySubTab('list');
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

  const filteredLinesToDisplay = selectedLineTab === 'all' 
    ? lines 
    : lines.filter(l => l.value === selectedLineTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>
      
      {/* HEADER LEVEL 1: TOP MAIN TABS */}
      <div style={{ 
        background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px 0 24px', 
        display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Cấu hình hệ thống
              </h1>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>Phân chia danh mục phân cấp đa tầng (Nested Tabs)</span>
            </div>
          </div>
        </div>

        {/* Level 1 Tabs (Main Sections) */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { id: 'vehicles', label: 'Dòng xe & Phiên bản', icon: Car, badge: lines.length },
            { id: 'colors', label: 'Bảng màu sắc', icon: Palette, badge: exteriors.length + interiors.length },
            { id: 'policies', label: 'Chính sách ưu đãi', icon: BadgeDollarSign, badge: policies.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as any)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px',
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontWeight: isActive ? 700 : 500, fontSize: '14px',
                  color: isActive ? '#0f766e' : '#64748b',
                  borderBottom: isActive ? '3px solid #0f766e' : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon size={18} style={{ color: isActive ? '#0f766e' : '#94a3b8' }} />
                <span>{tab.label}</span>
                <span style={{ 
                  background: isActive ? '#ccfbf1' : '#f1f5f9', color: isActive ? '#0f766e' : '#64748b',
                  fontSize: '11.5px', padding: '2px 8px', borderRadius: '999px', fontWeight: 700
                }}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BODY CONTENT DEPENDING ON LEVEL 1 TAB */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ==================== LEVEL 1: DÒNG XE & PHIÊN BẢN ==================== */}
        {mainTab === 'vehicles' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* LEVEL 2 SUB-TABS (Line Selector Pills) */}
            <div style={{ 
              background: '#ffffff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flex: 1, paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '6px' }}>Chọn xe:</span>
                
                {/* Option All */}
                <button
                  onClick={() => setSelectedLineTab('all')}
                  style={{
                    padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    fontSize: '13px', fontWeight: selectedLineTab === 'all' ? 700 : 500,
                    background: selectedLineTab === 'all' ? '#0f766e' : '#f1f5f9',
                    color: selectedLineTab === 'all' ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Tất cả dòng xe ({lines.length})
                </button>

                {/* Individual Line Tabs */}
                {lines.map((line) => {
                  const versionCount = configs.filter(c => c.type === 'version' && c.parent_value === line.value).length;
                  const isSelected = selectedLineTab === line.value;

                  return (
                    <button
                      key={line.id}
                      onClick={() => setSelectedLineTab(line.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        borderRadius: '10px', border: isSelected ? '1px solid #0f766e' : '1px solid transparent', cursor: 'pointer',
                        fontSize: '13px', fontWeight: isSelected ? 700 : 500,
                        background: isSelected ? '#e6fffa' : '#f1f5f9',
                        color: isSelected ? '#0f766e' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Car size={14} style={{ color: isSelected ? '#0f766e' : '#94a3b8' }} />
                      <span>{line.value}</span>
                      <span style={{ fontSize: '11px', background: isSelected ? '#0f766e' : '#cbd5e1', color: '#fff', padding: '1px 6px', borderRadius: '999px' }}>
                        {versionCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Add New Line Button */}
              <button
                onClick={() => setIsAddingLineModal(!isAddingLineModal)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                  borderRadius: '10px', border: 'none', background: '#0f766e', color: '#fff',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Plus size={15} /> Thêm dòng xe mới
              </button>
            </div>

            {/* Quick Add Line Bar if toggled */}
            {isAddingLineModal && (
              <div style={{ background: '#f0fdf4', padding: '14px 18px', borderRadius: '14px', border: '1px solid #bbf7d0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#166534' }}>Tên dòng xe mới:</span>
                <input 
                  type="text" 
                  placeholder="Nhập tên dòng xe (VD: VF 3, VF 7)..." 
                  value={newLine} 
                  onChange={(e) => setNewLine(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                  autoFocus
                  style={{ width: '280px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '13px', outline: 'none' }}
                />
                <button onClick={handleAddLine} disabled={!newLine.trim()} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                  Xác nhận thêm
                </button>
                <button onClick={() => setIsAddingLineModal(false)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>
                  Hủy
                </button>
              </div>
            )}

            {/* LEVEL 2 CONTENT: DISPLAY VEHICLE LINE CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {filteredLinesToDisplay.map(line => {
                const lineVersions = configs.filter(c => c.type === 'version' && c.parent_value === line.value).sort((a, b) => a.value.localeCompare(b.value));

                return (
                  <div 
                    key={line.id}
                    style={{ 
                      background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Header */}
                    <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Car size={20} />
                        </div>
                        {editingConfigId === line.id ? (
                          <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                            <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(line)} autoFocus style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #0f766e', fontSize: '14px' }} />
                            <button onClick={() => handleSaveEditConfig(line)} style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}><Check size={14} /></button>
                          </div>
                        ) : (
                          <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{line.value}</h3>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{lineVersions.length} phiên bản</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button title="Sửa tên" onClick={() => { setEditingConfigId(line.id!); setEditConfigValue(line.value); }} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fff', color: '#2563eb', cursor: 'pointer' }}><Pencil size={14} /></button>
                        <button title="Xóa dòng xe" onClick={() => handleDelete(line.id!, line.value)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: '#fff', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {/* Versions list */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: '120px' }}>
                      {lineVersions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                          Chưa có phiên bản nào cho {line.value}.
                        </div>
                      ) : (
                        lineVersions.map(ver => (
                          <div key={ver.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9', fontSize: '13.5px', fontWeight: 600 }}>
                            {editingConfigId === ver.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                                <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ver)} autoFocus style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #0284c7', fontSize: '13px' }} />
                                <button onClick={() => handleSaveEditConfig(ver)} style={{ border: 'none', background: '#0284c7', color: '#fff', borderRadius: '4px', padding: '4px 8px' }}><Check size={13} /></button>
                              </div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Tag size={14} style={{ color: '#0284c7' }} />
                                  <span>{ver.value}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button onClick={() => { setEditingConfigId(ver.id!); setEditConfigValue(ver.value); }} style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={13} /></button>
                                  <button onClick={() => handleDelete(ver.id!, ver.value)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Inline Add Version */}
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
                          color: '#fff', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer'
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
        )}

        {/* ==================== LEVEL 1: BẢNG MÀU SẮC ==================== */}
        {mainTab === 'colors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* LEVEL 2 SUB-TABS (Color Type Selector) */}
            <div style={{ display: 'flex', gap: '10px', background: '#ffffff', padding: '6px', borderRadius: '14px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
              <button
                onClick={() => setColorSubTab('exteriors')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontWeight: colorSubTab === 'exteriors' ? 700 : 500, fontSize: '13.5px',
                  background: colorSubTab === 'exteriors' ? '#16a34a' : 'transparent',
                  color: colorSubTab === 'exteriors' ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                <PaintBucket size={16} />
                <span>Màu ngoại thất</span>
                <span style={{ background: colorSubTab === 'exteriors' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: colorSubTab === 'exteriors' ? '#fff' : '#64748b', padding: '2px 8px', borderRadius: '999px', fontSize: '11px' }}>
                  {exteriors.length}
                </span>
              </button>

              <button
                onClick={() => setColorSubTab('interiors')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontWeight: colorSubTab === 'interiors' ? 700 : 500, fontSize: '13.5px',
                  background: colorSubTab === 'interiors' ? '#d97706' : 'transparent',
                  color: colorSubTab === 'interiors' ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                <Armchair size={16} />
                <span>Màu nội thất</span>
                <span style={{ background: colorSubTab === 'interiors' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: colorSubTab === 'interiors' ? '#fff' : '#64748b', padding: '2px 8px', borderRadius: '999px', fontSize: '11px' }}>
                  {interiors.length}
                </span>
              </button>
            </div>

            {/* LEVEL 2 CONTENT: EXTERIORS */}
            {colorSubTab === 'exteriors' && (
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', maxWidth: '500px' }}>
                  <input 
                    type="text" 
                    placeholder="Thêm màu ngoại thất mới (VD: Trắng CE18)..." 
                    value={newExterior} 
                    onChange={(e) => setNewExterior(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                  />
                  <button onClick={handleAddExterior} disabled={!newExterior.trim()} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: newExterior.trim() ? '#16a34a' : '#cbd5e1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Thêm
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {exteriors.map(ext => (
                    <div key={ext.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      {editingConfigId === ext.id ? (
                        <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                          <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ext)} autoFocus style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #16a34a' }} />
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

            {/* LEVEL 2 CONTENT: INTERIORS */}
            {colorSubTab === 'interiors' && (
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', maxWidth: '500px' }}>
                  <input 
                    type="text" 
                    placeholder="Thêm màu nội thất mới (VD: Đen, Nâu)..." 
                    value={newInterior} 
                    onChange={(e) => setNewInterior(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                  />
                  <button onClick={handleAddInterior} disabled={!newInterior.trim()} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: newInterior.trim() ? '#d97706' : '#cbd5e1', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                    Thêm
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                  {interiors.map(int => (
                    <div key={int.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      {editingConfigId === int.id ? (
                        <div style={{ display: 'flex', flex: 1, gap: '4px' }}>
                          <input type="text" value={editConfigValue} onChange={(e) => setEditConfigValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(int)} autoFocus style={{ flex: 1, padding: '4px 8px', borderRadius: '4px', border: '1px solid #d97706' }} />
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
          </div>
        )}

        {/* ==================== LEVEL 1: CHÍNH SÁCH BÁN HÀNG ==================== */}
        {mainTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* LEVEL 2 SUB-TABS (Policy Action Selector) */}
            <div style={{ display: 'flex', gap: '10px', background: '#ffffff', padding: '6px', borderRadius: '14px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
              <button
                onClick={() => setPolicySubTab('list')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontWeight: policySubTab === 'list' ? 700 : 500, fontSize: '13.5px',
                  background: policySubTab === 'list' ? '#2563eb' : 'transparent',
                  color: policySubTab === 'list' ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                <BadgeDollarSign size={16} />
                <span>Danh sách chính sách</span>
                <span style={{ background: policySubTab === 'list' ? 'rgba(255,255,255,0.2)' : '#f1f5f9', color: policySubTab === 'list' ? '#fff' : '#64748b', padding: '2px 8px', borderRadius: '999px', fontSize: '11px' }}>
                  {policies.length}
                </span>
              </button>

              <button
                onClick={() => setPolicySubTab('create')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer',
                  fontWeight: policySubTab === 'create' ? 700 : 500, fontSize: '13.5px',
                  background: policySubTab === 'create' ? '#2563eb' : 'transparent',
                  color: policySubTab === 'create' ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={16} />
                <span>Thêm chính sách mới</span>
              </button>
            </div>

            {/* LEVEL 2 CONTENT: CREATE FORM */}
            {policySubTab === 'create' && (
              <div style={{ background: '#ffffff', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)', maxWidth: '800px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Tạo chương trình ưu đãi mới</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Tên chính sách *</label>
                    <input 
                      type="text" 
                      placeholder="VD: Chương trình Mùa Hè Rực Rỡ 2%..." 
                      value={newPolicyName} 
                      onChange={(e) => setNewPolicyName(e.target.value)} 
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                    />
                  </div>

                  <div ref={lineDropdownRef} style={{ position: 'relative' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Dòng xe áp dụng</label>
                    <div 
                      onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', minHeight: '40px', display: 'flex', alignItems: 'center' }}
                    >
                      <span style={{ color: newPolicyLine ? '#0f172a' : '#64748b', fontSize: '13.5px', fontWeight: 500 }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Hạn sử dụng</label>
                      <input 
                        type="text" 
                        placeholder="VD: Đến 30/06/2026" 
                        value={newPolicyExpiry} 
                        onChange={(e) => setNewPolicyExpiry(e.target.value)} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Trạng thái</label>
                      <select 
                        value={newPolicyStatus} 
                        onChange={(e) => setNewPolicyStatus(e.target.value)} 
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff' }}
                      >
                        <option value="Hoạt động">Hoạt động</option>
                        <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    <button 
                      onClick={handleAddPolicy} 
                      disabled={!newPolicyName.trim()} 
                      style={{ 
                        padding: '10px 24px', borderRadius: '8px', border: 'none', 
                        background: newPolicyName.trim() ? '#2563eb' : '#cbd5e1', 
                        color: '#fff', fontWeight: 600, fontSize: '13.5px', cursor: 'pointer' 
                      }}
                    >
                      Lưu chính sách
                    </button>
                    <button onClick={() => setPolicySubTab('list')} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', fontSize: '13.5px', cursor: 'pointer' }}>
                      Quay lại danh sách
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL 2 CONTENT: POLICY LIST TABLE */}
            {policySubTab === 'list' && (
              <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)' }}>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};
