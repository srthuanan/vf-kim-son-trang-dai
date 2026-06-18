import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';

console.log('URL:', url.substring(0, 20) + '...');

const supabase = createClient(url, key);

async function run() {
  const { data: policies, error: polErr } = await supabase.from('chinhsach').select('ten_chinh_sach');
  console.log('PolErr:', polErr, 'Policies count:', policies?.length);
  const policyNames = policies?.map(p => p.ten_chinh_sach) || [];
  
  // Sort by length descending to match longest first
  policyNames.sort((a, b) => b.length - a.length);

  const { data: orders, error: ordErr } = await supabase.from('donhang').select('id, chinh_sach');
  console.log('OrdErr:', ordErr, 'Orders count:', orders?.length);

  for (const order of orders || []) {
    if (!order.chinh_sach || !order.chinh_sach.includes(',')) continue;
    if (order.chinh_sach.includes(';')) continue;

    console.log('Found order to migrate:', order.id, order.chinh_sach);

    let remaining = order.chinh_sach;
    const found = [];
    for (const pName of policyNames) {
      if (remaining.includes(pName)) {
        found.push(pName);
        remaining = remaining.replace(pName, '');
      }
    }
    
    if (found.length > 0) {
      // Restore original order by finding occurrences in the original string
      found.sort((a, b) => order.chinh_sach.indexOf(a) - order.chinh_sach.indexOf(b));
      
      const newPolicy = found.join('; ');
      console.log(`Order ${order.id}: ${newPolicy}`);
      await supabase.from('donhang').update({ chinh_sach: newPolicy }).eq('id', order.id);
    }
  }
}
run().then(() => console.log('Done'));
