import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, Car, PaintBucket, Armchair, GitBranch, 
  BadgeDollarSign, Pencil, Check, X, Tag, Calendar, Layers, ChevronDown, ChevronRight, Search, Sparkles, SlidersHorizontal 
} from 'lucide-react';
import { VehicleConfigRow, SalesPolicyRow } from '../types';
import * as apiService from '../services/apiService';

interface SettingsPanelProps {
  configs: VehicleConfigRow[];
  onRefresh: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ configs, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'lines' | 'exteriors' | 'interiors' | 'policies'>('lines');
  
  const [newLine, setNewLine] = useState('');
  const [addingVersionForLine, setAddingVersionForLine] = useState<string | null>(null);
  const [newVersionInputs, setNewVersionInputs] = useState<Record<string, string>>({});
  const [searchFilter, setSearchFilter] = useState('');
  
  // Track open accordions for lines
  const [expandedLines, setExpandedLines] = useState<Record<string, boolean>>({});

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

  // Expand all lines by default on load if not set
  React.useEffect(() => {
    if (lines.length > 0 && Object.keys(expandedLines).length === 0) {
      const initial: Record<string, boolean> = {};
      lines.forEach(l => { initial[l.value] = true; });
      setExpandedLines(initial);
    }
  }, [lines]);

  React.useEffect(() => {
    if (activeSubTab === 'policies') {
      loadPolicies();
    }
  }, [activeSubTab]);

  const loadPolicies = async () => {
    const { data } = await apiService.getAllSalesPolicies();
    setPolicies(data);
  };

  const toggleLineExpand = (lineVal: string) => {
    setExpandedLines(prev => ({ ...prev, [lineVal]: !prev[lineVal] }));
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
    setExpandedLines(prev => ({ ...prev, [val]: true }));
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

  const filteredExteriors = exteriors.filter(e => e.value.toLowerCase().includes(searchFilter.toLowerCase()));
  const filteredInteriors = interiors.filter(i => i.value.toLowerCase().includes(searchFilter.toLowerCase()));
  const filteredLines = lines.filter(l => l.value.toLowerCase().includes(searchFilter.toLowerCase()));

  const subNavItems = [
    { key: 'lines', title: 'Dòng xe & Phiên bản', desc: 'Thiết lập các dòng xe & phiên bản con', icon: Car, count: lines.length, color: '#0f766e' },
    { key: 'exteriors', title: 'Màu ngoại thất', desc: 'Bảng màu sơn ngoài của xe', icon: PaintBucket, count: exteriors.length, color: '#16a34a' },
    { key: 'interiors', title: 'Màu nội thất', desc: 'Màu sắc chất liệu khoang xe', icon: Armchair, count: interiors.length, color: '#d97706' },
    { key: 'policies', title: 'Chính sách bán hàng', desc: 'Ưu đãi & chương trình áp dụng', icon: BadgeDollarSign, count: policies.length, color: '#2563eb' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', background: '#f1f5f9', overflow: 'hidden' }}>
      
      {/* LEFT SIDEBAR NAVIGATION */}
      <div style={{ 
        width: '300px', background: '#ffffff', borderRight: '1px solid #e2e8f0', 
        display: 'flex', flexDirection: 'column', padding: '20px 16px', gap: '8px', flexShrink: 0 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 16px 8px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#0f766e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.25)' }}>
            <Settings size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>Cấu hình hệ thống</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Quản lý danh mục & ưu đãi</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  setActiveSubTab(item.key as any);
                  setSearchFilter('');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 14px',
                  borderRadius: '12px', border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: isActive ? '#f0fdf4' : 'transparent',
                  borderLeft: isActive ? `4px solid ${item.color}` : '4px solid transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.04)' : 'none'
                }}
              >
                <div style={{ 
                  width: '34px', height: '34px', borderRadius: '8px', 
                  background: isActive ? item.color : '#f1f5f9', 
                  color: isActive ? '#ffffff' : '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: isActive ? 700 : 600, fontSize: '13.5px', color: isActive ? '#0f172a' : '#475569' }}>
                      {item.title}
                    </span>
                    <span style={{ 
                      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px',
                      background: isActive ? item.color : '#e2e8f0', color: isActive ? '#ffffff' : '#64748b'
                    }}>
                      {item.count}
                    </span>
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={18} style={{ color: '#0f766e' }} />
          <span style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
            Mọi thao tác thay đổi ở đây sẽ tự động cập nhật ngay trên toàn hệ thống.
          </span>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto' }}>
        
        {/* SUBTAB 1: Dòng xe & Phiên bản (Streamlined Tree/Accordion View) */}
        {activeSubTab === 'lines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            
            {/* Top Toolbar */}
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              background: '#ffffff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Danh mục Dòng xe & Phiên bản</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                  Xem và chỉnh sửa trực tiếp các phiên bản ngay dưới từng dòng xe
                </p>
              </div>

              {/* Add New Line Inline */}
              <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '4px 6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <input 
                  type="text" 
                  placeholder="+ Nhập thêm dòng xe mới (VD: VF 3)..." 
                  value={newLine} 
                  onChange={(e) => setNewLine(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                  style={{ width: '260px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                />
                <button 
                  onClick={handleAddLine} 
                  disabled={!newLine.trim()}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                    background: newLine.trim() ? '#0f766e' : '#cbd5e1', color: '#fff', fontWeight: 600, fontSize: '13px',
                    cursor: newLine.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
                  }}
                >
                  <Plus size={16} /> Thêm Dòng Xe
                </button>
              </div>
            </div>

            {/* Accordion Cards for each Line */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredLines.map(line => {
                const lineVersions = configs.filter(c => c.type === 'version' && c.parent_value === line.value).sort((a, b) => a.value.localeCompare(b.value));
                const isExpanded = expandedLines[line.value] ?? true;

                return (
                  <div 
                    key={line.id} 
                    style={{ 
                      background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', overflow: 'hidden',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Header line row */}
                    <div 
                      onClick={() => toggleLineExpand(line.value)}
                      style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '16px 20px', background: isExpanded ? '#f8fafc' : '#ffffff', 
                        cursor: 'pointer', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                        <div style={{ 
                          width: '36px', height: '36px', borderRadius: '10px', background: '#0f766e', 
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <Car size={20} />
                        </div>

                        {editingConfigId === line.id ? (
                          <div style={{ display: 'flex', flex: 1, gap: '8px', maxWidth: '300px' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="text" 
                              value={editConfigValue} 
                              onChange={(e) => setEditConfigValue(e.target.value)} 
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(line)}
                              autoFocus
                              style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #0f766e', fontSize: '14px', outline: 'none' }}
                            />
                            <button onClick={() => handleSaveEditConfig(line)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#0f766e', color: '#fff', cursor: 'pointer' }}><Check size={14} /></button>
                            <button onClick={() => setEditingConfigId(null)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>{line.value}</span>
                            <span style={{ 
                              background: '#e0f2fe', color: '#0369a1', fontSize: '12px', 
                              padding: '2px 10px', borderRadius: '999px', fontWeight: 600 
                            }}>
                              {lineVersions.length} phiên bản
                            </span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          title="Đổi tên dòng xe"
                          onClick={(e) => { e.stopPropagation(); setEditingConfigId(line.id!); setEditConfigValue(line.value); }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#f1f5f9', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                        >
                          <Pencil size={14} /> Sửa tên
                        </button>
                        <button 
                          title="Xóa dòng xe"
                          onClick={(e) => { e.stopPropagation(); handleDelete(line.id!, line.value); }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                        >
                          <Trash2 size={14} /> Xóa
                        </button>

                        <div style={{ width: '1px', height: '20px', background: '#cbd5e1', margin: '0 4px' }} />

                        <div style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Versions list & Add input inside card */}
                    {isExpanded && (
                      <div style={{ padding: '16px 20px', background: '#ffffff' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Phiên bản thuộc dòng {line.value}:
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                          {lineVersions.map(ver => (
                            <div 
                              key={ver.id}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: '8px', 
                                padding: '8px 14px', background: '#f8fafc', borderRadius: '10px', 
                                border: '1px solid #cbd5e1', fontSize: '13.5px', fontWeight: 600, color: '#1e293b'
                              }}
                            >
                              {editingConfigId === ver.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <input 
                                    type="text" 
                                    value={editConfigValue} 
                                    onChange={(e) => setEditConfigValue(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ver)}
                                    autoFocus
                                    style={{ width: '120px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #0284c7', fontSize: '13px' }}
                                  />
                                  <button onClick={() => handleSaveEditConfig(ver)} style={{ border: 'none', background: '#0284c7', color: '#fff', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><Check size={13} /></button>
                                  <button onClick={() => setEditingConfigId(null)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}><X size={13} /></button>
                                </div>
                              ) : (
                                <>
                                  <Tag size={14} style={{ color: '#0284c7' }} />
                                  <span>{ver.value}</span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                                    <button 
                                      title="Sửa phiên bản"
                                      onClick={() => { setEditingConfigId(ver.id!); setEditConfigValue(ver.value); }}
                                      style={{ border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button 
                                      title="Xóa phiên bản"
                                      onClick={() => handleDelete(ver.id!, ver.value)}
                                      style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}

                          {/* Quick inline add version button/input */}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <input 
                              type="text" 
                              placeholder={`+ Thêm phiên bản cho ${line.value}...`}
                              value={newVersionInputs[line.value] || ''}
                              onChange={(e) => setNewVersionInputs({ ...newVersionInputs, [line.value]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddVersionFor(line.value)}
                              style={{ 
                                padding: '8px 12px', borderRadius: '10px', border: '1px stroke #0f766e', 
                                borderStyle: 'dashed', fontSize: '13px', outline: 'none', background: '#f0fdf4',
                                width: '220px', color: '#0f766e', fontWeight: 500
                              }}
                            />
                            {(newVersionInputs[line.value] || '').trim() && (
                              <button 
                                onClick={() => handleAddVersionFor(line.value)}
                                style={{ 
                                  padding: '8px 14px', borderRadius: '10px', border: 'none', 
                                  background: '#0f766e', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' 
                                }}
                              >
                                Lưu
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBTAB 2: Màu ngoại thất */}
        {activeSubTab === 'exteriors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' 
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Danh mục Màu Ngoại thất</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>Quản lý màu sơn xe áp dụng chung</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Lọc màu..." 
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="text" 
                    placeholder="+ Thêm màu mới (VD: Trắng CE18)..." 
                    value={newExterior} 
                    onChange={(e) => setNewExterior(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
                    style={{ width: '260px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                  <button 
                    onClick={handleAddExterior} 
                    disabled={!newExterior.trim()}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', 
                      background: newExterior.trim() ? '#16a34a' : '#cbd5e1', 
                      color: '#fff', fontWeight: 600, fontSize: '13px', cursor: newExterior.trim() ? 'pointer' : 'not-allowed' 
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredExteriors.map(ext => (
                <div 
                  key={ext.id}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '14px 18px', background: '#ffffff', borderRadius: '14px', 
                    border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  {editingConfigId === ext.id ? (
                    <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                      <input 
                        type="text" 
                        value={editConfigValue} 
                        onChange={(e) => setEditConfigValue(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ext)}
                        autoFocus
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #16a34a', fontSize: '13px' }}
                      />
                      <button onClick={() => handleSaveEditConfig(ext)} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><Check size={14} /></button>
                      <button onClick={() => setEditingConfigId(null)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)' }} />
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{ext.value}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button title="Sửa" onClick={() => { setEditingConfigId(ext.id!); setEditConfigValue(ext.value); }} style={{ padding: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={15} /></button>
                    <button title="Xóa" onClick={() => handleDelete(ext.id!, ext.value)} style={{ padding: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 3: Màu nội thất */}
        {activeSubTab === 'interiors' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div style={{ 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
              background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' 
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Danh mục Màu Nội thất</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>Quản lý tùy chọn chất liệu & màu sắc khoang xe</p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '220px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="text" 
                    placeholder="Lọc màu nội thất..." 
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <input 
                    type="text" 
                    placeholder="+ Thêm màu nội thất (VD: Đen, Nâu)..." 
                    value={newInterior} 
                    onChange={(e) => setNewInterior(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
                    style={{ width: '260px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                  <button 
                    onClick={handleAddInterior} 
                    disabled={!newInterior.trim()}
                    style={{ 
                      padding: '8px 16px', borderRadius: '8px', border: 'none', 
                      background: newInterior.trim() ? '#d97706' : '#cbd5e1', 
                      color: '#fff', fontWeight: 600, fontSize: '13px', cursor: newInterior.trim() ? 'pointer' : 'not-allowed' 
                    }}
                  >
                    Thêm
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {filteredInteriors.map(int => (
                <div 
                  key={int.id}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '14px 18px', background: '#ffffff', borderRadius: '14px', 
                    border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  {editingConfigId === int.id ? (
                    <div style={{ display: 'flex', flex: 1, gap: '6px' }}>
                      <input 
                        type="text" 
                        value={editConfigValue} 
                        onChange={(e) => setEditConfigValue(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(int)}
                        autoFocus
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '13px' }}
                      />
                      <button onClick={() => handleSaveEditConfig(int)} style={{ border: 'none', background: '#d97706', color: '#fff', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><Check size={14} /></button>
                      <button onClick={() => setEditingConfigId(null)} style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <Armchair size={18} style={{ color: '#d97706' }} />
                      <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>{int.value}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button title="Sửa" onClick={() => { setEditingConfigId(int.id!); setEditConfigValue(int.value); }} style={{ padding: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer' }}><Pencil size={15} /></button>
                    <button title="Xóa" onClick={() => handleDelete(int.id!, int.value)} style={{ padding: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUBTAB 4: Chính sách bán hàng */}
        {activeSubTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <div style={{ 
              background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)' 
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Thêm Chính sách bán hàng mới</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Tên chương trình ưu đãi</label>
                  <input 
                    type="text" 
                    placeholder="VD: Mùa Hè Rực Rỡ 2%..." 
                    value={newPolicyName} 
                    onChange={(e) => setNewPolicyName(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                </div>

                <div ref={lineDropdownRef} style={{ position: 'relative' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Dòng xe áp dụng</label>
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
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Hạn sử dụng</label>
                  <input 
                    type="text" 
                    placeholder="VD: 30/06/2026" 
                    value={newPolicyExpiry} 
                    onChange={(e) => setNewPolicyExpiry(e.target.value)} 
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Trạng thái</label>
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

            {/* Policy Table */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
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
        )}
      </div>
    </div>
  );
};
