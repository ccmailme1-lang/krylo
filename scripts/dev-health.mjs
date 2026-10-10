#!/usr/bin/env node
// dev-health.mjs -- one-command check of the local environment (systemic plan item 5). Reports: Vite servers (state, port,
// whether suspended), duplicates, the engine, the build the served page would load, and what to do about each problem.
// Usage: node scripts/dev-health.mjs   (exit 1 when something needs attention)
import { execSync } from 'child_process';
const sh = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const get = async (url, ms = 4000) => { const t0 = Date.now(); try { const r = await fetch(url, { signal: AbortSignal.timeout(ms) }); return { ok: r.ok, status: r.status, ms: Date.now() - t0, text: await r.text() }; } catch (e) { return { ok: false, status: 0, ms: Date.now() - t0, error: e.name === 'TimeoutError' ? 'no answer (hung or suspended)' : 'refused' }; } };
const problems = [];

const vite = sh(`ps -eo pid,stat,etime,command | grep "[.]bin/vite"`).split('\n').filter(Boolean).map(l => { const m = l.trim().match(/^(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/); return m && { pid: m[1], stat: m[2], etime: m[3] }; }).filter(Boolean);
const listen = sh(`lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | grep -E "node" | awk '{print $2, $9}'`).split('\n').filter(Boolean).map(l => l.split(' '));
console.log('Vite processes:');
if (!vite.length) { console.log('  none running'); problems.push('No Vite server is running. Start it: npm run dev'); }
for (const v of vite) {
  const port = (listen.find(([pid]) => pid === v.pid)?.[1] ?? '?').split(':').pop();
  const suspended = v.stat.startsWith('T');
  console.log(`  pid ${v.pid}  port ${port}  state ${v.stat}${suspended ? '  SUSPENDED' : ''}  up ${v.etime}`);
  if (suspended) problems.push(`Vite pid ${v.pid} (port ${port}) is SUSPENDED: every request hangs. Resume it: kill -CONT ${v.pid}  (or fg in its terminal)`);
}
if (vite.length > 1) problems.push(`${vite.length} Vite servers are running: use one port and stop the others (check the address bar).`);

const ports = [...new Set(listen.map(([, a]) => a.split(':').pop()).filter(p => /^51\d\d$/.test(p)))];
for (const p of ports.length ? ports : ['5173']) {
  const r = await get(`http://localhost:${p}/__build.json`);
  if (r.ok) { const b = JSON.parse(r.text); console.log(`Port ${p}: answers in ${r.ms} ms, serving commit ${b.commit}${b.dirty ? '-dirty' : ''} (${b.time ?? 'no time'})`); }
  else { console.log(`Port ${p}: ${r.error ?? 'HTTP ' + r.status}`); problems.push(`Port ${p} does not answer (${r.error ?? 'HTTP ' + r.status}).`); }
}
const eng = await get('http://localhost:4000/');
console.log(`Engine :4000: ${eng.status ? 'up (HTTP ' + eng.status + ')' : eng.error}`);
if (!eng.status) problems.push('The engine is not answering on :4000. Start it: npm run engine');
const swap = sh('sysctl -n vm.swapusage');
const used = swap.match(/used = ([\d.]+)M/)?.[1], total = swap.match(/total = ([\d.]+)M/)?.[1];
if (used && total) { console.log(`Swap: ${used} of ${total} MB used`); if (+used / +total > 0.7) problems.push(`Memory pressure: swap is ${Math.round(100 * used / total)}% used; the app will feel slow. Close heavy apps or restart the browser.`); }

console.log(problems.length ? `\n${problems.length} thing(s) need attention:\n- ${problems.join('\n- ')}` : '\nEnvironment OK.');
process.exit(problems.length ? 1 : 0);
