import React, { useState } from 'react';
import { 
  Settings, Plus, Trash2, Car, PaintBucket, Armchair, GitBranch, 
  BadgeDollarSign, Pencil, Check, X, Tag, Calendar, Layers, ChevronRight, Search, Sparkles 
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
  const [selectedLine, setSelectedLine] = useState('');
  const [newVersion, setNewVersion] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  
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
  const versions = configs.filter(c => c.type === 'version' && c.parent_value === selectedLine).sort((a, b) => a.value.localeCompare(b.value));
  const exteriors = configs.filter(c => c.type === 'exterior').sort((a, b) => a.value.localeCompare(b.value));
  const interiors = configs.filter(c => c.type === 'interior').sort((a, b) => a.value.localeCompare(b.value));

  // Set default selected line
  React.useEffect(() => {
    if (lines.length > 0 && (!selectedLine || !lines.some(l => l.value === selectedLine))) {
      setSelectedLine(lines[0].value);
    }
  }, [lines, selectedLine]);

  React.useEffect(() => {
    if (activeSubTab === 'policies') {
      loadPolicies();
    }
  }, [activeSubTab]);

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

  const filteredExteriors = exteriors.filter(e => e.value.toLowerCase().includes(searchFilter.toLowerCase()));
  const filteredInteriors = interiors.filter(i => i.value.toLowerCase().includes(searchFilter.toLowerCase()));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', padding: '24px', gap: '20px', overflowY: 'auto' }}>
      
      {/* Header Banner */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
        borderRadius: '16px', padding: '24px 28px', color: '#fff', 
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '12px', 
            background: 'rgba(255,255,255,0.1)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <Settings size={26} style={{ color: '#38bdf8' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>Cấu hình hệ thống</h1>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
              Quản lý danh mục Dòng xe, Phiên bản, Màu sắc & Chính sách ưu đãi bán hàng
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 16px', borderRadius: '10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Dòng xe</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8' }}>{lines.length}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 16px', borderRadius: '10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Màu ngoại thất</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#34d399' }}>{exteriors.length}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', padding: '8px 16px', borderRadius: '10px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Chính sách</span>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#fbbf24' }}>{policies.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{ 
        display: 'flex', gap: '8px', background: '#ffffff', padding: '6px', 
        borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' 
      }}>
        {[
          { key: 'lines', label: 'Dòng xe & Phiên bản', icon: Car, count: lines.length },
          { key: 'exteriors', label: 'Màu ngoại thất', icon: PaintBucket, count: exteriors.length },
          { key: 'interiors', label: 'Màu nội thất', icon: Armchair, count: interiors.length },
          { key: 'policies', label: 'Chính sách bán hàng', icon: BadgeDollarSign, count: policies.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSubTab(tab.key as any);
                setSearchFilter('');
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontWeight: isActive ? 600 : 500, fontSize: '13.5px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                background: isActive ? '#0f766e' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                boxShadow: isActive ? '0 4px 12px rgba(15, 118, 110, 0.25)' : 'none'
              }}
            >
              <Icon size={17} style={{ color: isActive ? '#ffffff' : '#94a3b8' }} />
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#64748b',
                fontSize: '11px', padding: '2px 8px', borderRadius: '999px', fontWeight: 600
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subtab Content 1: Dòng xe & Phiên bản */}
      {activeSubTab === 'lines' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
          {/* Card 1: Dòng xe */}
          <div style={{ 
            background: '#ffffff', borderRadius: '16px', padding: '20px', 
            border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)',
            display: 'flex', flexDirection: 'column' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={18} style={{ color: '#0f766e' }} />
                </div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Danh sách Dòng xe</h3>
              </div>
              <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', fontWeight: 500 }}>
                {lines.length} Dòng xe
              </span>
            </div>

            {/* Quick Add Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input 
                type="text" 
                placeholder="Nhập tên dòng xe mới (VD: VF 3)..." 
                value={newLine} 
                onChange={(e) => setNewLine(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                style={{ 
                  flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  fontSize: '13.5px', outline: 'none', background: '#ffffff', color: '#0f172a'
                }}
              />
              <button 
                onClick={handleAddLine} 
                disabled={!newLine.trim()}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
                  borderRadius: '8px', border: 'none', background: newLine.trim() ? '#0f766e' : '#cbd5e1', 
                  color: '#ffffff', fontWeight: 600, fontSize: '13px', cursor: newLine.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={16} /> Thêm
              </button>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {lines.map(line => {
                const isSelected = selectedLine === line.value;
                const versionCount = configs.filter(c => c.type === 'version' && c.parent_value === line.value).length;

                return (
                  <div 
                    key={line.id} 
                    onClick={() => setSelectedLine(line.value)}
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      background: isSelected ? '#ecfdf5' : '#ffffff',
                      border: isSelected ? '1.5px solid #10b981' : '1px solid #f1f5f9',
                      boxShadow: isSelected ? '0 2px 8px rgba(16, 185, 129, 0.12)' : 'none'
                    }}
                  >
                    {editingConfigId === line.id ? (
                      <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }} onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editConfigValue} 
                          onChange={(e) => setEditConfigValue(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(line)}
                          autoFocus
                          style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981', fontSize: '13.5px', outline: 'none' }}
                        />
                        <button 
                          onClick={() => handleSaveEditConfig(line)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer' }}
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingConfigId(null)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <Car size={16} style={{ color: isSelected ? '#059669' : '#94a3b8' }} />
                        <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#065f46' : '#1e293b', fontSize: '14px' }}>
                          {line.value}
                        </span>
                        <span style={{ 
                          fontSize: '11px', color: isSelected ? '#047857' : '#94a3b8', 
                          background: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#f1f5f9', 
                          padding: '2px 8px', borderRadius: '999px', fontWeight: 600 
                        }}>
                          {versionCount} bản
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isSelected && <ChevronRight size={16} style={{ color: '#10b981', marginRight: '4px' }} />}
                      <button 
                        title="Đổi tên"
                        onClick={(e) => { e.stopPropagation(); setEditingConfigId(line.id!); setEditConfigValue(line.value); }}
                        style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', display: 'flex' }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button 
                        title="Xóa"
                        onClick={(e) => { e.stopPropagation(); handleDelete(line.id!, line.value); }}
                        style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 2: Phiên bản */}
          <div style={{ 
            background: '#ffffff', borderRadius: '16px', padding: '20px', 
            border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03), 0 2px 4px -2px rgba(0,0,0,0.03)',
            display: 'flex', flexDirection: 'column' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GitBranch size={18} style={{ color: '#0284c7' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    Phiên bản của <span style={{ color: '#0284c7' }}>{selectedLine || '...'}</span>
                  </h3>
                </div>
              </div>
              <span style={{ fontSize: '12px', color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: '20px', fontWeight: 600 }}>
                {versions.length} Phiên bản
              </span>
            </div>

            {/* Quick Add Bar */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '6px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input 
                type="text" 
                placeholder={`Thêm phiên bản cho ${selectedLine || 'dòng xe'}...`}
                value={newVersion} 
                onChange={(e) => setNewVersion(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddVersion()}
                disabled={!selectedLine}
                style={{ 
                  flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', 
                  fontSize: '13.5px', outline: 'none', background: '#ffffff', color: '#0f172a'
                }}
              />
              <button 
                onClick={handleAddVersion} 
                disabled={!newVersion.trim() || !selectedLine}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', 
                  borderRadius: '8px', border: 'none', 
                  background: (newVersion.trim() && selectedLine) ? '#0284c7' : '#cbd5e1', 
                  color: '#ffffff', fontWeight: 600, fontSize: '13px', 
                  cursor: (newVersion.trim() && selectedLine) ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={16} /> Thêm
              </button>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {versions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  <GitBranch size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13.5px' }}>Chưa có phiên bản nào cho dòng <b>{selectedLine}</b>.</p>
                </div>
              ) : (
                versions.map(version => (
                  <div 
                    key={version.id} 
                    style={{ 
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                      padding: '12px 14px', borderRadius: '10px', background: '#f8fafc',
                      border: '1px solid #e2e8f0', transition: 'all 0.15s ease'
                    }}
                  >
                    {editingConfigId === version.id ? (
                      <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }}>
                        <input 
                          type="text" 
                          value={editConfigValue} 
                          onChange={(e) => setEditConfigValue(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(version)}
                          autoFocus
                          style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #0284c7', fontSize: '13.5px', outline: 'none' }}
                        />
                        <button 
                          onClick={() => handleSaveEditConfig(version)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', cursor: 'pointer' }}
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          onClick={() => setEditingConfigId(null)}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <Tag size={15} style={{ color: '#0284c7' }} />
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{version.value}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button 
                        title="Đổi tên"
                        onClick={() => { setEditingConfigId(version.id!); setEditConfigValue(version.value); }}
                        style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', display: 'flex' }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button 
                        title="Xóa"
                        onClick={() => handleDelete(version.id!, version.value)}
                        style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Subtab Content 2: Màu ngoại thất */}
      {activeSubTab === 'exteriors' && (
        <div style={{ 
          background: '#ffffff', borderRadius: '16px', padding: '24px', 
          border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
          flex: 1, display: 'flex', flexDirection: 'column' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PaintBucket size={20} style={{ color: '#16a34a' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Danh mục Màu Ngoại thất</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Quản lý bảng màu ngoại thất chuẩn áp dụng trên toàn bộ dòng xe</p>
              </div>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Tìm màu..." 
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Input Add */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', maxWidth: '540px', background: '#f8fafc', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="Nhập tên màu ngoại thất mới (VD: Trắng Brahminy CE18)..." 
              value={newExterior} 
              onChange={(e) => setNewExterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddExterior()}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff' }}
            />
            <button 
              onClick={handleAddExterior} 
              disabled={!newExterior.trim()}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
                borderRadius: '8px', border: 'none', background: newExterior.trim() ? '#16a34a' : '#cbd5e1', 
                color: '#fff', fontWeight: 600, fontSize: '13.5px', cursor: newExterior.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={16} /> Thêm mới
            </button>
          </div>

          {/* Color Grid */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', alignContent: 'start' }}>
            {filteredExteriors.map(ext => (
              <div 
                key={ext.id} 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '14px 16px', background: '#ffffff', borderRadius: '12px', 
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                {editingConfigId === ext.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }}>
                    <input 
                      type="text" 
                      value={editConfigValue} 
                      onChange={(e) => setEditConfigValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(ext)}
                      autoFocus
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #16a34a', fontSize: '13.5px', outline: 'none' }}
                    />
                    <button onClick={() => handleSaveEditConfig(ext)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#16a34a', color: '#fff', cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => setEditingConfigId(null)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '50%', 
                      border: '2px solid #e2e8f0', background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{ext.value}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button title="Sửa" onClick={() => { setEditingConfigId(ext.id!); setEditConfigValue(ext.value); }} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', display: 'flex' }}><Pencil size={15} /></button>
                  <button title="Xóa" onClick={() => handleDelete(ext.id!, ext.value)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab Content 3: Màu nội thất */}
      {activeSubTab === 'interiors' && (
        <div style={{ 
          background: '#ffffff', borderRadius: '16px', padding: '24px', 
          border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
          flex: 1, display: 'flex', flexDirection: 'column' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Armchair size={20} style={{ color: '#d97706' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Danh mục Màu Nội thất</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Quản lý tùy chọn màu sắc khoang nội thất</p>
              </div>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Tìm màu nội thất..." 
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Input Add */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', maxWidth: '540px', background: '#f8fafc', padding: '8px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="Nhập tên màu nội thất mới (VD: Đen, Nâu, Xám)..." 
              value={newInterior} 
              onChange={(e) => setNewInterior(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleAddInterior()}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', outline: 'none', background: '#fff' }}
            />
            <button 
              onClick={handleAddInterior} 
              disabled={!newInterior.trim()}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', 
                borderRadius: '8px', border: 'none', background: newInterior.trim() ? '#d97706' : '#cbd5e1', 
                color: '#fff', fontWeight: 600, fontSize: '13.5px', cursor: newInterior.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              <Plus size={16} /> Thêm mới
            </button>
          </div>

          {/* Grid */}
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', alignContent: 'start' }}>
            {filteredInteriors.map(int => (
              <div 
                key={int.id} 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '14px 16px', background: '#ffffff', borderRadius: '12px', 
                  border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                {editingConfigId === int.id ? (
                  <div style={{ display: 'flex', flex: 1, gap: '8px', marginRight: '8px' }}>
                    <input 
                      type="text" 
                      value={editConfigValue} 
                      onChange={(e) => setEditConfigValue(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveEditConfig(int)}
                      autoFocus
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #d97706', fontSize: '13.5px', outline: 'none' }}
                    />
                    <button onClick={() => handleSaveEditConfig(int)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', cursor: 'pointer' }}><Check size={14} /></button>
                    <button onClick={() => setEditingConfigId(null)} style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer' }}><X size={14} /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Armchair size={18} style={{ color: '#d97706' }} />
                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>{int.value}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button title="Sửa" onClick={() => { setEditingConfigId(int.id!); setEditConfigValue(int.value); }} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', display: 'flex' }}><Pencil size={15} /></button>
                  <button title="Xóa" onClick={() => handleDelete(int.id!, int.value)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab Content 4: Chính sách bán hàng */}
      {activeSubTab === 'policies' && (
        <div style={{ 
          background: '#ffffff', borderRadius: '16px', padding: '24px', 
          border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
          flex: 1, display: 'flex', flexDirection: 'column' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BadgeDollarSign size={20} style={{ color: '#b45309' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>Chính sách bán hàng & Chương trình ưu đãi</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Thiết lập các gói ưu đãi áp dụng cho từng dòng xe cụ thể</p>
            </div>
          </div>

          {/* Add Policy Form Card */}
          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>Tên chính sách ưu đãi</label>
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
                  placeholder="VD: Đến 30/06/2026" 
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
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', 
                    borderRadius: '8px', border: 'none', 
                    background: newPolicyName.trim() ? '#b45309' : '#cbd5e1', 
                    color: '#fff', fontWeight: 600, fontSize: '13px', 
                    cursor: newPolicyName.trim() ? 'pointer' : 'not-allowed', height: '38px' 
                  }}
                >
                  <Plus size={16} /> Thêm chính sách
                </button>
              </div>
            </div>
          </div>

          {/* Table Policies */}
          <div style={{ overflowY: 'auto', flex: 1, borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '11.5px', letterSpacing: '0.04em' }}>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>Tên chính sách</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>Dòng xe áp dụng</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>Hạn sử dụng</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700 }}>Trạng thái</th>
                  <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p, index) => {
                  if (editingPolicyIndex === index) {
                    return (
                      <tr key={p.id || index} style={{ borderBottom: '1px solid #e2e8f0', background: '#f0fdf4' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <input type="text" value={editPolicyData.name} onChange={e => setEditPolicyData({...editPolicyData, name: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981' }} />
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <div ref={inlineDropdownRef} style={{ position: 'relative' }}>
                            <div 
                              onClick={() => setIsInlineDropdownOpen(!isInlineDropdownOpen)}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981', cursor: 'pointer', background: '#fff', minHeight: '34px', display: 'flex', alignItems: 'center' }}
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
                          <input type="text" value={editPolicyData.expiry} onChange={e => setEditPolicyData({...editPolicyData, expiry: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981' }} />
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <select value={editPolicyData.status} onChange={e => setEditPolicyData({...editPolicyData, status: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #10b981' }}>
                            <option value="Hoạt động">Hoạt động</option>
                            <option value="Ngừng hoạt động">Ngừng hoạt động</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button onClick={handleSaveInlinePolicy} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Lưu</button>
                          <button onClick={handleCancelEditPolicy} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#64748b', cursor: 'pointer', fontSize: '13px' }}>Hủy</button>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={p.id || index} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>{p.ten_chinh_sach}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 500 }}>
                          {p.dong_xe || 'Tất cả'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '13px' }}>
                        {p.han_su_dung ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ color: '#94a3b8' }} /> {p.han_su_dung}
                          </span>
                        ) : '—'}
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
                        <button title="Sửa" onClick={() => handleEditPolicy(p, index)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#3b82f6', cursor: 'pointer', display: 'flex' }}>
                          <Pencil size={16} />
                        </button>
                        <button title="Xóa" onClick={() => handleDeletePolicy(p.id || '', p.ten_chinh_sach)} style={{ padding: '6px', borderRadius: '6px', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
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
  );
};
