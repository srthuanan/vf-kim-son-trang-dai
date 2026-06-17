const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';

const supabase = createClient(url, key);

async function run() {
  const { data } = await supabase.from('donhang').select('id, chinh_sach').not('chinh_sach', 'is', null).limit(10);
  console.log(data);
}
run();
