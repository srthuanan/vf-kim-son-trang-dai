const fs = require('fs');
const p = 'src/services/apiService.ts';
let content = fs.readFileSync(p, 'utf8');
content = content.replace(
`  // 2. Xóa các yêu cầu
  return await supabase.from('yeucauxhd').delete().in('id', requestIds);
};
  if (!supabase) throw new Error('Supabase chưa được cấu hình');
  return await supabase.rpc('approve_invoice_request', {
    p_request_id: requestId
  });
};`,
`  // 2. Xóa các yêu cầu
  return await supabase.from('yeucauxhd').delete().in('id', requestIds);
};`
);
fs.writeFileSync(p, content, 'utf8');
