import { execSync } from 'child_process';

const TARGET_PROJECTS = [
  { name: 'vf-kim-son-trang-dai', url: 'https://vf-kim-son-trang-dai-amber.vercel.app' },
  { name: 'ordermanagement', url: 'https://ordermanagement-three.vercel.app' }
];

console.log('--- [DUAL-VERCEL DEPLOY GUARD] DEPLOY ĐỒNG THỜI CẢ 2 LINK ---');

for (const p of TARGET_PROJECTS) {
  console.log(`\n--------------------------------------------------`);
  console.log(`[Deploy Guard] 1. Liên kết Vercel tới: ${p.name}`);
  execSync(`npx vercel link --project ${p.name} --yes`, { stdio: 'inherit' });
  
  console.log(`[Deploy Guard] 2. Deploy Production cho: ${p.name} (${p.url})`);
  execSync('npx vercel --prod --yes', { stdio: 'inherit' });
  console.log(`[Deploy Guard] ✓ Hoàn tất deploy cho: ${p.url}`);
}

console.log('\n==================================================');
console.log('✓ TẤT CẢ CÁC LINK ĐÃ ĐƯỢC CẬP NHẬT ĐỒNG BỘ THÀNH CÔNG:');
TARGET_PROJECTS.forEach(p => console.log(`  ➔ ${p.url}`));
console.log('==================================================\n');
