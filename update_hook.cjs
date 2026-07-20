const fs = require('fs');
const p = 'src/hooks/useOrderOperations.ts';
let content = fs.readFileSync(p, 'utf8');

const targetToReplace = `  async function handleDeleteInvoiceRequest(requestId: string) {
    setIsDeletingInvoice(true);
    try {`;

const replacement = `  async function handleBulkUpdateInvoiceStatus(requestIds: string[], newStatus: string) {
    setIsAdvancingInvoice(true);
    try {
      const { error } = await apiService.updateInvoiceRequestStatus(requestIds, newStatus);
      if (error) {
        setSyncState('error');
        setSyncMessage(\`Lỗi cập nhật trạng thái hàng loạt: \${error.message}\`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsAdvancingInvoice(false);
    }
  }

  async function handleBulkDeleteInvoiceRequests(requestIds: string[]) {
    setIsDeletingInvoice(true);
    try {
      const { error } = await apiService.deleteMultipleInvoiceRequests(requestIds);
      if (error) {
        setSyncState('error');
        setSyncMessage(\`Lỗi xóa yêu cầu hàng loạt: \${error.message}\`);
        return false;
      }
      await loadWorkspace({ showLoading: false });
      return true;
    } finally {
      setIsDeletingInvoice(false);
    }
  }

  async function handleDeleteInvoiceRequest(requestId: string) {
    setIsDeletingInvoice(true);
    try {`;

content = content.replace(targetToReplace, replacement);

const exportTarget = `    handleDeleteInvoiceRequest
  };`;

const exportReplacement = `    handleDeleteInvoiceRequest,
    handleBulkUpdateInvoiceStatus,
    handleBulkDeleteInvoiceRequests
  };`;

content = content.replace(exportTarget, exportReplacement);

fs.writeFileSync(p, content, 'utf8');
