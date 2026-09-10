import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://txcivsdgjkmlrjxramos.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ';
const BUCKET = 'yeucauxhd-files';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function archiveMonth(targetMonth, webhookUrl) {
  console.log('\n======================================================');
  console.log('=== TIẾN HÀNH LƯU TRỮ THÁNG: ' + targetMonth + ' SANG GOOGLE DRIVE & SHEET ===');
  console.log('======================================================');

  // 1. Lấy dữ liệu từ Supabase
  const { data: allRequests, error: reqErr } = await supabase.from('yeucauxhd').select('*');
  if (reqErr) throw reqErr;

  const targetRequests = (allRequests || []).filter(r => {
    const d = r.ngay_xuat_hoa_don || r.created_at;
    return d && d.startsWith(targetMonth);
  });

  console.log('Tìm thấy ' + targetRequests.length + ' đơn hàng / yêu cầu XHĐ trong tháng ' + targetMonth + '.');
  if (targetRequests.length === 0) {
    console.log('Không có bản ghi nào trong tháng ' + targetMonth + ' để lưu trữ.');
    return;
  }

  // 2. Xử lý theo từng batch 5 đơn
  const batchSize = 5;
  const allArchivedFiles = [];

  for (let i = 0; i < targetRequests.length; i += batchSize) {
    const batch = targetRequests.slice(i, i + batchSize);
    console.log('-> Đang gửi đợt ' + (Math.floor(i / batchSize) + 1) + '/' + Math.ceil(targetRequests.length / batchSize) + ' (' + (i + 1) + ' đến ' + Math.min(i + batchSize, targetRequests.length) + '/' + targetRequests.length + ' đơn)...');

    const archiveRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ARCHIVE_ORDERS',
        month: targetMonth,
        orders: batch
      })
    });

    const archiveJson = await archiveRes.json();
    if (!archiveJson.success) {
      console.error('Lỗi khi lưu trữ đợt ' + (i / batchSize + 1) + ':', archiveJson.error);
      continue;
    }

    if (archiveJson.archivedFiles) {
      allArchivedFiles.push(...archiveJson.archivedFiles);
    }
    console.log('   ✓ Đã lưu ' + batch.length + ' đơn và ' + (archiveJson.archivedFilesCount || 0) + ' file lên Google Drive.');
  }

  console.log('\n=> Google đã lưu trữ thành công ' + targetRequests.length + ' đơn và ' + allArchivedFiles.length + ' tệp tin cho tháng ' + targetMonth + '!');

  // 3. Cập nhật link Google Drive vào Supabase và Xóa file trên Supabase Storage
  console.log('Đang cập nhật link mới vào Database và giải phóng Supabase Storage...');
  const filesToDeleteFromSupabase = [];
  const ghiChuAiByOrder = {};

  for (const item of allArchivedFiles) {
    const marker = 'yeucauxhd-files/';
    const idx = item.supabaseUrl.indexOf(marker);
    if (idx !== -1) {
      const storagePath = decodeURIComponent(item.supabaseUrl.substring(idx + marker.length).split('?')[0]);
      filesToDeleteFromSupabase.push(storagePath);
    }

    if (item.field === 'url_hop_dong') {
      await supabase.from('yeucauxhd').update({ url_hop_dong: item.driveUrl }).eq('so_don_hang', item.orderId);
      await supabase.from('donhang').update({ link_hop_dong: item.driveUrl }).eq('so_don_hang', item.orderId);
    } else if (item.field === 'url_de_nghi_xhd') {
      await supabase.from('yeucauxhd').update({ url_de_nghi_xhd: item.driveUrl }).eq('so_don_hang', item.orderId);
      await supabase.from('donhang').update({ link_de_nghi_xhd: item.driveUrl }).eq('so_don_hang', item.orderId);
    } else if (item.field === 'ghi_chu_ai') {
      if (!ghiChuAiByOrder[item.orderId]) ghiChuAiByOrder[item.orderId] = [];
      ghiChuAiByOrder[item.orderId].push(item.driveUrl);
    }
  }

  // Cập nhật các ảnh giao dịch ghi_chu_ai
  for (const [orderId, driveUrls] of Object.entries(ghiChuAiByOrder)) {
    await supabase.from('yeucauxhd').update({ ghi_chu_ai: driveUrls.join(',') }).eq('so_don_hang', orderId);
  }

  if (filesToDeleteFromSupabase.length > 0) {
    for (let i = 0; i < filesToDeleteFromSupabase.length; i += 50) {
      const chunk = filesToDeleteFromSupabase.slice(i, i + 50);
      await supabase.storage.from(BUCKET).remove(chunk);
    }
    console.log('✓ Đã xóa ' + filesToDeleteFromSupabase.length + ' file cũ trên Supabase Storage.');
  }

  console.log('🎉 HOÀN TẤT LƯU TRỮ THÁNG ' + targetMonth + '!');
}

async function main() {
  const args = process.argv.slice(2);
  const monthIdx = args.indexOf('--month');
  const urlIdx = args.indexOf('--url');

  const webhookUrl = urlIdx !== -1 ? args[urlIdx + 1] : 'https://script.google.com/macros/s/AKfycbwAjr7xXZz3-HrXiF5jKFgrTqKsy-m_1Y69fRJ0Caop6dKsX4_qNpykult5HSmCtBh55w/exec';
  const targetMonth = monthIdx !== -1 ? args[monthIdx + 1] : 'all';

  // 1. Kiểm tra kết nối
  console.log('Đang kiểm tra kết nối Google Apps Script Webhook...');
  const testRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'TEST_CONNECTION' })
  });
  const testJson = await testRes.json();
  if (!testJson.success) {
    throw new Error('Kết nối Webhook thất bại: ' + JSON.stringify(testJson));
  }
  console.log('=> Kết nối Google Apps Script thành công!');

  const monthsToProcess = targetMonth === 'all' || targetMonth === 'both' ? ['2026-07', '2026-08'] : [targetMonth];

  for (const m of monthsToProcess) {
    await archiveMonth(m, webhookUrl);
  }

  // Thống kê cuối cùng
  let finalFiles = 0;
  let finalBytes = 0;
  async function checkFinal(folder = '') {
    const { data } = await supabase.storage.from(BUCKET).list(folder, { limit: 500 });
    if (!data) return;
    for (const item of data) {
      const fullPath = folder ? (folder + '/' + item.name) : item.name;
      if (item.id === null) {
        await checkFinal(fullPath);
      } else {
        finalFiles++;
        finalBytes += (item.metadata?.size || 0);
      }
    }
  }
  await checkFinal('');
  const finalMB = (finalBytes / (1024 * 1024)).toFixed(2);
  console.log('\n======================================================');
  console.log('📊 TỔNG KẾT TÌNH TRẠNG SUPABASE STORAGE HIỆN TẠI:');
  console.log('- Số file còn lại trong Supabase: ' + finalFiles + ' file');
  console.log('- Dung lượng Storage còn lại: ' + finalMB + ' MB');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
