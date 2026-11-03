// Renders every screenshot of the manual from the REAL src/ files with fictional data.
// Usage: node docs/manual/shoot.mjs   (CHROME=/path/to/chrome-headless-shell to override the browser)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { SHOTS } from './shots.mjs';
import { findChrome } from './chrome.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const BUILD = path.join(HERE, 'build');
const IMG = path.join(HERE, 'img');
const SCALE = 2;                       // 2x pixels so the PDF stays sharp when printed
fs.mkdirSync(BUILD, { recursive: true }); fs.mkdirSync(IMG, { recursive: true });

const CHROME = findChrome();
const chrome = (args) => { if (process.env.DEBUG) console.error('chrome', args.filter(a => /window|screenshot|dump|file:/.test(a)).join(' ')); return chromeRun(args); };
const chromeRun = (args) => execFileSync(CHROME, ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--disable-gpu', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024, timeout: 60000, killSignal: 'SIGKILL' });

const read = f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');

const MOCK = scn => `<script>
(function(){
  const SCN=${JSON.stringify(scn || {})};
  try{ SCN.token ? sessionStorage.setItem('ta_token','demo') : sessionStorage.removeItem('ta_token'); }catch(e){}
  let resp=SCN.response||null;
  const view=()=>({id:SCN.id,term:'1/2569',hours:SCN.hours,total:SCN.total,response:resp});
  const D=SCN.dash?JSON.parse(JSON.stringify(SCN.dash)):null;
  const dash=()=>{ const s=D.students; const c=k=>s.filter(x=>x.status===k).length;
    return {term:'1/2569',rounds:[1,2],students:s,counts:{all:s.length,confirmed:c('confirmed'),reported:c('reported'),pending:c('pending'),
      newReports:s.filter(x=>x.status==='reported'&&!x.acked).length}}; };
  const ok=d=>({ok:true,data:d===undefined?null:d});
  const api={
    apiRequestOtp:()=>ok(), apiVerifyOtp:()=>ok('demo'), apiLogout:()=>ok(),
    apiMe:()=>ok(SCN.role==='staff'?{email:SCN.email,name:SCN.name,role:'staff'}:{email:SCN.email,name:SCN.name,role:'student',student:view()}),
    apiSubmit:(t,s,d)=>{resp={id:'n',status:s,detail:d,at:'2026-11-03T08:00:00Z',hoursSeen:SCN.total,stale:false};return ok(view());},
    apiDashboard:()=>ok(dash()),
    apiAck:(t,id)=>{const r=D.students.find(x=>x.responseId===id); if(r) r.acked=true; return ok(dash());},
  };
  window.google={script:{get run(){let f;const o={withSuccessHandler(x){f=x;return o},withFailureHandler(){return o}};
    Object.keys(api).forEach(k=>o[k]=(...a)=>setTimeout(()=>f(api[k](...a)),0));return o;}}};
})();
</script>`;

const HELPERS = `
const $=s=>document.querySelector(s); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(s){for(let i=0;i<200&&!$(s);i++)await sleep(25);return $(s)}
function mark(items){
  const miss=[];
  items.forEach(it=>{
    const els=[...document.querySelectorAll(it.sel)]; if(!els.length){miss.push(it.sel);return}
    (it.all?els:[els[0]]).forEach((el,i)=>{
      const r=el.getBoundingClientRect(), cs=getComputedStyle(el), P=4;
      const b=document.createElement('div'); b.className='mk-box';
      const rad=parseFloat(cs.borderTopLeftRadius)||0;
      b.style.cssText='position:absolute;pointer-events:none;z-index:9999;box-sizing:border-box;border:3px solid #F59E0B;'+
        'left:'+(r.left+scrollX-P)+'px;top:'+(r.top+scrollY-P)+'px;width:'+(r.width+2*P)+'px;height:'+(r.height+2*P)+'px;border-radius:'+(rad>=r.height/2?9999:Math.max(rad+P,6))+'px';
      document.body.appendChild(b);
      if(i===0){const n=document.createElement('div'); n.textContent=it.n;
        n.style.cssText='position:absolute;z-index:10000;width:26px;height:26px;border-radius:50%;background:#F59E0B;color:#1A1A1A;font:700 14px/26px Inter,sans-serif;text-align:center;'+
          'left:'+(r.left+scrollX-P-12)+'px;top:'+(r.top+scrollY-P-12)+'px';
        document.body.appendChild(n);}
    });
  });
  return miss;
}
function meta(clipSel){
  const foot=$('.proof');
  const bottom=Math.max(...[...$('#app').children].map(c=>c.getBoundingClientRect().bottom+scrollY));
  const h=Math.ceil(bottom+32+foot.getBoundingClientRect().height+8);
  let clip=null; if(clipSel){const r=$(clipSel).getBoundingClientRect(); clip={x:r.left+scrollX,y:r.top+scrollY,w:r.width,h:r.height};}
  return {h,clip};
}
`;

function appHtml(shot, { marks, withMeta }) {
  let html = read('index.html')
    .replace("<?!= include('styles') ?>", read('styles.html'))
    .replace("<?!= include('app') ?>", read('app.html'))
    .replace('<?!= boot ?>', JSON.stringify({ title: 'ตรวจสอบชั่วโมง TA', faculty: 'คณะรัฐศาสตร์และรัฐประศาสนศาสตร์', term: '1/2569', otpMin: 10, resendSec: 60, sender: 'ระบบตรวจสอบชั่วโมง TA', minChars: 10 }));
  html = html.replace('</head>', '<style>h1 .em path{animation:none!important;stroke-dashoffset:0!important}</style></head>');
  html = html.replace('<script>const BOOT', MOCK(shot.scn) + '<script>const BOOT');
  const run = `<script>(async()=>{${HELPERS}
    await until('#app h1, #app .card, #app .hero, #app .tiles'); await sleep(250);
    ${shot.steps || ''}
    await sleep(150);
    ${marks ? `window.__miss=mark(${JSON.stringify(shot.marks)});` : ''}
    ${withMeta ? `const m=meta(${JSON.stringify(shot.clip || null)}); m.miss=[]; const p=document.createElement('pre'); p.id='meta'; p.textContent=JSON.stringify(m); document.body.prepend(p);` : ''}
  })();</script>`;
  return html.replace('</body>', run + '</body>');
}

function emailHtml(shot, withMeta) {
  const require = createRequire(import.meta.url);
  const { makeEnv } = require(path.join(ROOT, 'test/harness.js'));
  const e = makeEnv(); const log = console.log; console.log = () => {};
  try { e.run('setup()'); } finally { console.log = log; }
  const body = e.run(shot.emailExpr);
  const probe = `<script>(()=>{const t=document.querySelector('table table'); const r=t.getBoundingClientRect(); const p=document.createElement('pre'); p.id='meta';
    p.textContent=JSON.stringify({h:Math.ceil(r.bottom+scrollY+36),clip:null,miss:[]}); document.body.prepend(p);})();</script>`;
  return body.replace('</body>', (withMeta ? probe : '') + '</body>');
}

function shoot(shot) {
  const file = id => path.join(BUILD, `${id}.html`);
  const url = id => 'file://' + file(id);
  const size = (w, h) => ['--window-size=' + w + ',' + h, '--force-device-scale-factor=' + SCALE];

  // pass 1: measure page height and the clip rectangle
  fs.writeFileSync(file(shot.id), shot.kind === 'email' ? emailHtml(shot, true) : appHtml(shot, { marks: false, withMeta: true }));
  const dom = chrome([...size(shot.w, 1500), '--virtual-time-budget=8000', '--dump-dom', url(shot.id)]);
  const mm = /<pre id="meta">([^<]*)<\/pre>/.exec(dom);
  if (!mm) throw new Error('no meta for ' + shot.id);
  const meta = JSON.parse(mm[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));

  // pass 2: screenshot with the numbered boxes drawn
  fs.writeFileSync(file(shot.id), shot.kind === 'email' ? emailHtml(shot, false) : appHtml(shot, { marks: true, withMeta: false }));
  const raw = path.join(BUILD, `${shot.id}.png`);
  chrome([...size(shot.w, Math.max(meta.h, 200)), '--virtual-time-budget=8000', '--screenshot=' + raw, url(shot.id)]);

  // verify that every callout found its element (a missing one would silently drop a number)
  if (shot.marks.length && shot.kind !== 'email') {
    const probe = appHtml(shot, { marks: true, withMeta: false }).replace('</body>',
      '<script>setTimeout(()=>{const p=document.createElement("pre");p.id="miss";p.textContent=JSON.stringify(window.__miss||[]);document.body.prepend(p)},3500)</script></body>');
    fs.writeFileSync(file(shot.id + '-probe'), probe);
    const d2 = chrome([...size(shot.w, Math.max(meta.h, 200)), '--virtual-time-budget=8000', '--dump-dom', url(shot.id + '-probe')]);
    const miss = JSON.parse(/<pre id="miss">([^<]*)<\/pre>/.exec(d2)?.[1].replace(/&quot;/g, '"') || '[]');
    if (miss.length) throw new Error(`${shot.id}: selector(s) not found: ${miss.join(', ')}`);
  }

  // crop
  const out = path.join(IMG, `${shot.id}.png`);
  let rect = shot.clipRect || (meta.clip && { x: meta.clip.x - 22, y: meta.clip.y - 22, w: meta.clip.w + 44, h: meta.clip.h + 44 });
  if (rect) {
    const x = Math.max(0, Math.round(rect.x * SCALE)), y = Math.max(0, Math.round(rect.y * SCALE));
    execFileSync('sips', ['-c', String(Math.round(rect.h * SCALE)), String(Math.round(rect.w * SCALE)), '--cropOffset', String(y), String(x), raw, '--out', out], { stdio: 'ignore' });
  } else fs.copyFileSync(raw, out);
  return { id: shot.id, h: meta.h };
}

const only = process.argv.slice(2);
for (const s of SHOTS) {
  if (only.length && !only.includes(s.id)) continue;
  const r = shoot(s); console.log('ok', r.id, r.h);
}
