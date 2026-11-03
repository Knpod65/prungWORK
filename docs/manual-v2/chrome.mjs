import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** Finds a headless Chrome: CHROME env var, else a Playwright headless shell, else Google Chrome. */
export function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const shells = [], full = [];
  for (const base of [path.join(os.homedir(), 'Library/Caches/ms-playwright'), path.join(os.homedir(), '.cache/ms-playwright')]) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base)) {
      for (const sub of ['chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-linux64/chrome-headless-shell']) {
        const p = path.join(base, d, sub); if (fs.existsSync(p)) shells.push(p);
      }
    }
  }
  full.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  const hit = [...shells, ...full].find(p => fs.existsSync(p));
  if (!hit) throw new Error('No Chrome found. Set CHROME=/path/to/chrome (a chrome-headless-shell or Google Chrome)');
  return hit;
}
