const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'styles.css');
let content = fs.readFileSync(cssPath, 'utf8');

const startMarker = '/* INVENTORY DASHBOARD MODULAR LAYOUT (OPTION 2) */';
const endMarker = '/* ORDERS MODULAR LAYOUT (SYNCED WITH INVENTORY) */';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Markers not found!');
    process.exit(1);
}

const newCss = `/* INVENTORY DASHBOARD MODULAR LAYOUT (OPTION 2) */
/* ========================================== */
/* INVENTORY DASHBOARD PREMIUM UI REDESIGN */
/* ========================================== */
.inventory-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 24px;
}

.main-content:has(.inventory-dashboard) {
  overflow: hidden !important;
}

.inventory-modular-workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
  align-items: stretch;
  overflow: hidden;
  padding: 8px;
}

.inventory-data-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 24px -8px rgba(15, 23, 42, 0.05);
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.inventory-data-side .table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
  padding-right: 8px;
}

.inventory-data-side .table-wrap::-webkit-scrollbar {
  width: 6px;
}
.inventory-data-side .table-wrap::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.inventory-data-side table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 8px;
}

.inventory-data-side th {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(248, 250, 252, 0.85);
  backdrop-filter: blur(8px);
  border: none;
  position: sticky;
  top: 0;
  z-index: 10;
  text-align: left;
}

.inventory-data-side th:first-child { border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
.inventory-data-side th:last-child { border-top-right-radius: 12px; border-bottom-right-radius: 12px; text-align: right; }

.inventory-data-side tbody tr {
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
}

.inventory-data-side tbody tr:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px -6px rgba(15, 23, 42, 0.1);
}

.inventory-data-side td {
  padding: 16px;
  font-size: 13px;
  color: #334155;
  border: none;
  border-top: 1px solid transparent;
  border-bottom: 1px solid transparent;
  vertical-align: middle;
}

.inventory-data-side td:first-child { 
  border-top-left-radius: 16px; 
  border-bottom-left-radius: 16px; 
  border-left: 1px solid transparent; 
}
.inventory-data-side td:last-child { 
  border-top-right-radius: 16px; 
  border-bottom-right-radius: 16px; 
  border-right: 1px solid transparent; 
}

.inventory-data-side .row-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.2s ease-out;
}

.inventory-data-side tbody tr:hover .row-actions {
  opacity: 1;
  transform: translateX(0);
}

.inventory-data-side .row-action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  transition: all 0.2s ease;
  cursor: pointer;
  background: #f1f5f9;
  color: #64748b;
}

.inventory-data-side .action-btn-hold { background: #ecfdf5; color: #059669; }
.inventory-data-side .action-btn-hold:hover:not(:disabled) { background: #d1fae5; color: #047857; }

.inventory-data-side .action-btn-create { background: #f0fdfa; color: #0f766e; }
.inventory-data-side .action-btn-create:hover:not(:disabled) { background: #ccfbf1; color: #0f766e; }

.inventory-data-side .action-btn-release,
.inventory-data-side .action-btn-delete { background: #fff1f2; color: #e11d48; }
.inventory-data-side .action-btn-release:hover:not(:disabled),
.inventory-data-side .action-btn-delete:hover:not(:disabled) { background: #ffe4e6; color: #be123c; }

.inventory-data-side .action-btn-edit { background: #eff6ff; color: #2563eb; }
.inventory-data-side .action-btn-edit:hover:not(:disabled) { background: #dbeafe; color: #1d4ed8; }

.inventory-data-side .action-btn-queue { background: #fffbeb; color: #d97706; }
.inventory-data-side .action-btn-queue:hover:not(:disabled) { background: #fef3c7; color: #b45309; }

.inventory-data-side .row-action-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(1);
}

.inventory-visual-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.mini-map-widget-container {
  flex: 1;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 16px;
  box-shadow: 0 4px 24px -8px rgba(15, 23, 42, 0.05);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.mini-map-widget-container .interactive-map-wrapper {
  flex: 1;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.mini-map-widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px 16px;
  margin-bottom: 0;
  border-bottom: none;
}

.mini-map-widget-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
}

.visual-side-tip {
  margin-top: 16px;
  background: rgba(248, 250, 252, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  padding: 16px;
}

.visual-side-tip h5 {
  margin: 0 0 6px 0;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}
.visual-side-tip p {
  margin: 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

@media (max-width: 1200px) {
  .main-content:has(.inventory-dashboard) {
    overflow: auto !important;
  }
  .inventory-dashboard {
    height: auto;
    overflow: visible;
  }
  .inventory-modular-workspace {
    grid-template-columns: 1fr;
    overflow: visible;
    height: auto;
  }
  .inventory-data-side {
    height: auto;
    overflow: visible;
  }
  .inventory-data-side .table-wrap {
    overflow-y: visible;
  }
  .inventory-visual-side {
    overflow: visible;
    height: auto;
  }
  .mini-map-widget-container {
    height: 500px;
    overflow: visible;
  }
  .inventory-data-side .row-actions {
    opacity: 1;
    transform: none;
  }
}

`;

const pre = content.substring(0, startIndex);
const post = content.substring(endIndex);

fs.writeFileSync(cssPath, pre + newCss + post);
console.log('CSS updated successfully!');
