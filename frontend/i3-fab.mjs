import { chromium } from 'playwright';
const [email, pass, who] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
const r = await p.evaluate(async ([email, pass]) => {
  const c = await fetch('/api/auth/csrf', { credentials: 'include' }).then(r => r.json());
  await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': c.csrfToken }, body: JSON.stringify({ email, password: pass }) });
  const list = await fetch('/api/campaigns', { credentials: 'include' }).then(r => r.json());
  return (list.campaigns || []).map(x => ({ id: x.id, name: x.name, members: (x.members||[]).length, role: x.role || x.isDM }));
}, [email, pass]);
console.log(JSON.stringify(r));
await p.reload({ waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Campanhas/ }).first().click(); await p.waitForTimeout(1500);
const target = r.find(c => c.name === (process.argv[5] || 'Reino Esquecido')) || r[0];
await p.getByText(target.name).first().click(); await p.waitForTimeout(2500);

const check = async (label) => {
  const res = await p.evaluate(() => {
    const fab = document.querySelector('.dice-fab');
    if (!fab || fab.classList.contains('is-hidden')) return { fab: null };
    const fr = fab.getBoundingClientRect();
    const bad = [];
    const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const sel = 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], .grp-stats > div, label, h1, h2, h3, p, dd, dt, .chip, img';
    const bar = document.querySelector('.shell-bottom-bar');
    const br = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect() : null;
    // Encaixado na barra: o que está atrás dele já estaria atrás da barra; só os botões da barra contam.
    const docked = br && fr.top >= br.top - 1;
    for (const el of document.querySelectorAll(sel)) {
      if (el.closest('.dice-fab, .dice-sheet')) continue;
      if (docked && !el.closest('.shell-bottom-bar')) continue;
      if (br && !docked && el.getBoundingClientRect().top >= br.top) continue;
      const rc = el.getBoundingClientRect();
      if (!rc.width || !rc.height) continue;
      const x = rc.left + rc.width / 2, y = rc.top + rc.height / 2;
      const hit = (y >= 0 && y <= innerHeight && x >= 0 && x <= innerWidth) ? document.elementFromPoint(x, y) : null;
      const covered = (hit && hit.closest('.dice-fab')) || (inter(rc, fr) > 4 && !el.contains(fab) && !fab.contains(el) && !el.matches('.shell-bottom-bar, nav, main, body'));
      if (covered) bad.push(el.tagName + ':' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30));
    }
    return { docked, fab: [Math.round(fr.top), Math.round(fr.bottom), Math.round(fr.left)], bad, sw: document.documentElement.scrollWidth };
  });
  console.log(label, JSON.stringify(res));
  return res;
};
const sweep = async (name) => {
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  await check(name + '@top');
  const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 300; y < H + 300; y += 300) {
    // desce e sobe um pouco: o botão reaparece (ele some ao descer)
    await p.evaluate(yy => scrollTo(0, yy + 40), Math.min(y, H)); await p.waitForTimeout(150);
    await p.evaluate(yy => scrollTo(0, yy), Math.min(y, H) - 20); await p.waitForTimeout(500);
    await check(name + '@' + Math.min(y, H));
  }
};
const tabs = await p.locator('.shell-bottom-bar .shell-bottom-btn').allTextContents();
console.log('tabs', tabs);
const n = await p.locator('.shell-bottom-bar .shell-bottom-btn').count();
for (let i = 0; i < n - 1; i++) {
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.locator('.shell-bottom-bar .shell-bottom-btn').nth(i).click(); await p.waitForTimeout(1800);
  await sweep(tabs[i]);
  console.log('bar after', tabs[i], await p.locator('.shell-bottom-bar').count(), await p.evaluate(() => location.href));
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
  await p.screenshot({ path: `/tmp/claude-1000/i3/${who}-${i}.png` });
}
console.log('errs', errs);
await b.close();
