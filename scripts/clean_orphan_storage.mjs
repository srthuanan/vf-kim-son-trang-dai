import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://txcivsdgjkmlrjxramos.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4Y2l2c2RnamttbHJqeHJhbW9zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY1MDYwOCwiZXhwIjoyMDk0MjI2NjA4fQ.zJhHCyEvpJQF3yKoxokYpJlY4dJY96sJBpB3IdQ5WcQ';
const BUCKET = 'yeucauxhd-files';

const BACKUP_DIR = path.resolve(process.cwd(), 'backup_orphan_files');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('=== BƯỚC 1: QUÉT TOÀN BỘ CƠ SỞ DỮ LIỆU ĐỂ TÌM LINK FILE ĐANG DÙNG ===');
  
  const referencedSet = new Set();

  function addPathIfValid(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return;
    const marker = 'yeucauxhd-files/';
    const idx = urlOrPath.indexOf(marker);
    let p = idx !== -1 ? urlOrPath.substring(idx + marker.length) : urlOrPath;
    p = p.split('?')[0].trim();
    if (!p) return;
    
    referencedSet.add(p);
    try { referencedSet.add(decodeURIComponent(p)); } catch (e) {}
    try { referencedSet.add(encodeURI(p)); } catch (e) {}
  }

  const { data: orders, error: orderErr } = await supabase.from('donhang').select('*');
  if (orderErr) throw orderErr;
  for (const o of orders || []) {
    addPathIfValid(o.link_hoa_don_da_xuat);
    addPathIfValid(o.link_hop_dong);
    addPathIfValid(o.link_de_nghi_xhd);
  }

  const { data: requests, error: reqErr } = await supabase.from('yeucauxhd').select('*');
  if (reqErr) throw reqErr;
  for (const r of requests || []) {
    addPathIfValid(r.url_hop_dong);
    addPathIfValid(r.url_de_nghi_xhd);
    addPathIfValid(r.url_hoa_don_da_xuat);
    if (r.ghi_chu_ai) {
      r.ghi_chu_ai.split(',').forEach(u => addPathIfValid(u.trim()));
    }
  }

  console.log('Tìm thấy ' + referencedSet.size + ' biến thể đường dẫn file đang được dùng trong hệ thống.');

  console.log('\n=== BƯỚC 2: QUÉT TOÀN BỘ TỆP TIN TRONG STORAGE ===');
  const allFiles = [];

  async function listRecursive(folder = '') {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 500 });
    if (error) {
      console.error('Lỗi khi quét thư mục [' + folder + ']:', error.message);
      return;
    }
    if (!data) return;

    for (const item of data) {
      const fullPath = folder ? (folder + '/' + item.name) : item.name;
      if (item.id === null) {
        await listRecursive(fullPath);
      } else {
        allFiles.push({
          name: item.name,
          path: fullPath,
          size: item.metadata?.size || 0
        });
      }
    }
  }

  await listRecursive('');
  console.log('Tổng số tệp trong Storage: ' + allFiles.length + ' file.');

  const activeFiles = [];
  const orphanFiles = [];

  for (const f of allFiles) {
    if (referencedSet.has(f.path) || referencedSet.has(decodeURIComponent(f.path))) {
      activeFiles.push(f);
    } else {
      orphanFiles.push(f);
    }
  }

  const orphanSizeMB = (orphanFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2);
  const activeSizeMB = (activeFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024)).toFixed(2);

  console.log('- File đang dùng: ' + activeFiles.length + ' file (' + activeSizeMB + ' MB)');
  console.log('- File rác mồ côi: ' + orphanFiles.length + ' file (' + orphanSizeMB + ' MB)');

  if (orphanFiles.length === 0) {
    console.log('Không có file rác nào cần dọn dẹp.');
    return;
  }

  console.log('\n=== BƯỚC 3: TẢI BACKUP ' + orphanFiles.length + ' FILE RÁC VỀ MÁY TÍNH ===');
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  let downloadedCount = 0;
  let downloadedBytes = 0;
  const verifiedOrphanPathsToDelete = [];

  for (let i = 0; i < orphanFiles.length; i++) {
    const f = orphanFiles[i];
    const localFilePath = path.join(BACKUP_DIR, ...f.path.split('/'));
    const localFileDir = path.dirname(localFilePath);
    if (!fs.existsSync(localFileDir)) {
      fs.mkdirSync(localFileDir, { recursive: true });
    }

    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(f.path);
    if (dlErr || !blob) {
      console.error('[' + (i + 1) + '/' + orphanFiles.length + '] Lỗi tải file: ' + f.path + ' - ' + dlErr?.message);
      continue;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync(localFilePath, buffer);
    downloadedCount++;
    downloadedBytes += buffer.length;
    verifiedOrphanPathsToDelete.push(f.path);

    if ((i + 1) % 25 === 0 || i + 1 === orphanFiles.length) {
      console.log('Đã sao lưu [' + (i + 1) + '/' + orphanFiles.length + '] file (' + (downloadedBytes / (1024 * 1024)).toFixed(1) + ' MB)...');
    }
  }

  console.log('\n=> SAO LƯU THÀNH CÔNG: ' + downloadedCount + '/' + orphanFiles.length + ' file vào: ' + BACKUP_DIR);

  console.log('\n=== BƯỚC 4: XÓA ' + verifiedOrphanPathsToDelete.length + ' FILE RÁC TRÊN SUPABASE STORAGE ===');
  
  const chunkSize = 50;
  let deletedCount = 0;
  for (let i = 0; i < verifiedOrphanPathsToDelete.length; i += chunkSize) {
    const chunk = verifiedOrphanPathsToDelete.slice(i, i + chunkSize);
    const { data: delResult, error: delErr } = await supabase.storage.from(BUCKET).remove(chunk);
    if (delErr) {
      console.error('Lỗi xóa batch ' + (i + 1) + '-' + (i + chunk.length) + ':', delErr.message);
    } else {
      deletedCount += (delResult?.length || chunk.length);
      console.log('Đã xóa ' + deletedCount + '/' + verifiedOrphanPathsToDelete.length + ' file...');
    }
  }

  console.log('\n=== BƯỚC 5: KIỂM TRA LẠI DUNG LƯỢNG STORAGE SAU DỌN DẸP ===');
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
  const finalGB = (finalBytes / (1024 * 1024 * 1024)).toFixed(3);

  console.log('Kết quả sau dọn dẹp:');
  console.log('- Tổng số file còn lại: ' + finalFiles + ' file');
  console.log('- Tổng dung lượng Storage còn lại: ' + finalMB + ' MB (' + finalGB + ' GB)');
  if (finalBytes <= 1024 * 1024 * 1024) {
    console.log('=> THÀNH CÔNG RỰC RỠ: Dung lượng đã nằm dưới 1 GB (Gói Free an toàn)!');
  } else {
    console.log('=> Cảnh báo: Vẫn còn trên 1 GB, cần nén tiếp các file cũ.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
