
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const run = cmd => new Promise(resolve => {
  const p = spawn(cmd, { shell:true, stdio:'inherit' });
  p.on('close', code => resolve(code));
});

console.log('=== U SPORTS V34 data build ===');
console.log('Refreshing roster cache...');
const rosterCode = await run('node scripts/sync-rosters.mjs');
console.log(`Roster sync exited ${rosterCode}. Deployment continues even if individual schools blocked access.`);

console.log('Refreshing logo cache...');
const logoCode = await run('node scripts/cache-logos.mjs');
console.log(`Logo sync exited ${logoCode}. Deployment continues with existing/fallback logo data.`);

// guarantee directories/files exist so the browser never hits a missing folder
await fs.mkdir(path.join(process.cwd(),'data','rosters'), {recursive:true});
await fs.mkdir(path.join(process.cwd(),'assets','teams'), {recursive:true});

try {
  await fs.access(path.join(process.cwd(),'data','rosters','all.json'));
} catch {
  await fs.writeFile(path.join(process.cwd(),'data','rosters','all.json'),
    JSON.stringify({generated_at:new Date().toISOString(),teams:{}},null,2));
}

console.log('Static site ready.');
