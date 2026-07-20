const fs = require('fs');
const p = 'src/components/InvoiceRequestsPanel.tsx';
let content = fs.readFileSync(p, 'utf8');

// 1. Add Props
const propsTarget = `  onDelete?: (req: YeucauxhdRow) => void;
  onReload?: () => void;
  isAdmin?: boolean;
}`;
const propsReplacement = `  onDelete?: (req: YeucauxhdRow) => void;
  onBulkUpdateStatus?: (ids: string[], newStatus: string) => Promise<boolean>;
  onBulkDelete?: (ids: string[]) => Promise<boolean>;
  onReload?: () => void;
  isAdmin?: boolean;
}`;
content = content.replace(propsTarget, propsReplacement);

const destructureTarget = `  onDelete,
  onReload,
  isAdmin
}) => {`;
const destructureReplacement = `  onDelete,
  onBulkUpdateStatus,
  onBulkDelete,
  onReload,
  isAdmin
}) => {`;
content = content.replace(destructureTarget, destructureReplacement);

// 2. Add selectedRequestIds state
const stateTarget = `  const [selectedFolder, setSelectedFolder] = useState('pending_approval');
  const [query, setQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);`;
const stateReplacement = `  const [selectedFolder, setSelectedFolder] = useState('pending_approval');
  const [query, setQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('');`;
content = content.replace(stateTarget, stateReplacement);

// Clear selection on folder/query change
const useEffectSelection = `  useEffect(() => {
    // Không tự động chọn yêu cầu đầu tiên nữa, để drawer luôn đóng lúc đầu.
  }, [filtered, selectedFolder]);`;
const useEffectReplacement = `  useEffect(() => {
    setSelectedRequestIds([]);
  }, [filtered, selectedFolder, query]);`;
content = content.replace(useEffectSelection, useEffectReplacement);

// 3. Render Bulk Action Toolbar (Insert after DATA GRID </div> before SLIDE-OVER)
const tableEndTarget = `            </tbody>
          </table>
        </div>
      </div>`;
const tableEndReplacement = `            </tbody>
          </table>
        </div>
      </div>
      
      {/* BULK ACTION BAR */}
      {selectedRequestIds.length > 0 && isAdmin && (
        <div style={{
          position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', padding: '12px 24px', borderRadius: '100px',
          display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 90
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Đã chọn {selectedRequestIds.length} yêu cầu</span>
          
          <div style={{ width: '1px', height: '20px', background: '#334155' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select 
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '20px', background: '#0f172a', color: '#fff', border: '1px solid #334155', outline: 'none' }}
            >
              <option value="">-- Chọn Trạng Thái --</option>
              <option value="Chờ phê duyệt">Chờ phê duyệt</option>
              <option value="Đã phê duyệt">Đã phê duyệt</option>
              <option value="Yêu cầu bổ sung">Yêu cầu bổ sung</option>
              <option value="Đã bổ sung">Đã bổ sung</option>
              <option value="Chờ ký hóa đơn">Chờ ký hóa đơn</option>
              <option value="Đã xuất hóa đơn">Đã xuất hóa đơn</option>
              <option value="Từ chối">Từ chối</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
            
            <button
              disabled={!bulkStatus || isProcessing}
              onClick={async () => {
                if (window.confirm(\`Xác nhận chuyển \${selectedRequestIds.length} yêu cầu sang trạng thái "\${bulkStatus}"?\`)) {
                  if (onBulkUpdateStatus) {
                    await onBulkUpdateStatus(selectedRequestIds, bulkStatus);
                    setSelectedRequestIds([]);
                    setBulkStatus('');
                  }
                }
              }}
              style={{
                background: bulkStatus ? '#3b82f6' : '#334155', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: bulkStatus && !isProcessing ? 'pointer' : 'not-allowed', transition: 'all 0.2s'
              }}
            >
              {isProcessing ? 'Đang xử lý...' : 'Áp dụng'}
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: '#334155' }}></div>
          
          <button 
            disabled={isProcessing}
            onClick={async () => {
               if (window.confirm(\`Xác nhận XÓA \${selectedRequestIds.length} yêu cầu này? Hành động này không thể hoàn tác.\`)) {
                  if (onBulkDelete) {
                    await onBulkDelete(selectedRequestIds);
                    setSelectedRequestIds([]);
                  }
               }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: '#f87171', border: 'none', fontSize: '13px', fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer' }}
          >
            <Trash2 size={14} /> Xóa
          </button>
        </div>
      )}`;
content = content.replace(tableEndTarget, tableEndReplacement);

// 4. Update Header Checkbox
const theadTarget = `            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Mã ĐH</th>`;
const theadReplacement = `            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <tr>
                <th style={{ padding: '16px 12px 16px 20px', width: '40px', borderBottom: '1px solid #e2e8f0' }}>
                  {isAdmin && (
                    <input 
                      type="checkbox" 
                      checked={filtered.length > 0 && selectedRequestIds.length === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedRequestIds(filtered.map(r => r.id));
                        else setSelectedRequestIds([]);
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0f766e' }}
                    />
                  )}
                </th>
                <th style={{ padding: '16px', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>Mã ĐH</th>`;
content = content.replace(theadTarget, theadReplacement);

// 5. Update Row Checkbox
const trTarget = `                  return (
                    <tr 
                      key={r.id}
                      onClick={() => { setSelectedRequestId(r.id); }}
                      style={{
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: isSelected ? '#f0f9ff' : '#fff',
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      className="hover-bg-slate"
                    >
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{r.so_don_hang}</td>`;
const trReplacement = `                  return (
                    <tr 
                      key={r.id}
                      onClick={() => { setSelectedRequestId(r.id); }}
                      style={{
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: selectedRequestIds.includes(r.id) ? '#f0fdf4' : (isSelected ? '#f0f9ff' : '#fff'),
                        borderBottom: '1px solid #f1f5f9'
                      }}
                      className="hover-bg-slate"
                    >
                      <td style={{ padding: '16px 12px 16px 20px' }} onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <input 
                            type="checkbox" 
                            checked={selectedRequestIds.includes(r.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRequestIds(prev => [...prev, r.id]);
                              else setSelectedRequestIds(prev => prev.filter(id => id !== r.id));
                            }}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#0f766e' }}
                          />
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', fontWeight: 700, color: '#0284c7', fontFamily: 'monospace' }}>{r.so_don_hang}</td>`;
content = content.replace(trTarget, trReplacement);

// Change colSpan from 6 to 7
content = content.replace(
  `<tr><td colSpan={6} style={{ padding: '60px'`,
  `<tr><td colSpan={7} style={{ padding: '60px'`
);

fs.writeFileSync(p, content, 'utf8');
