// E2E do convite (I2): rota /join/<código>, bloco do Começo e criação já entrando na mesa.
import { chromium } from 'playwright';
import fs from 'node:fs';
const CODE = process.argv[2] || 'E4TWND';
const OUT = '/tmp/claude-1000/i2';
const pregens = JSON.parse(fs.readFileSync('data/pregens.json', 'utf8'));
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const shot = (n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: false });
const sw = () => p.evaluate(() => document.documentElement.scrollWidth);

// 1) Rota sem login → tela de entrada com aviso
await p.goto(`http://localhost:5174/join/${CODE.toLowerCase()}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
console.log('url after route', p.url());
await shot('1-auth');
await p.fill('input[type=email]', 'renan@forja.local');
await p.fill('input[type=password]', 'thalion-druida-2026');
await p.locator('form button[type=submit]').first().click();
await p.waitForTimeout(2000);
await shot('2-choice');
console.log('choice visible', await p.getByText('Criar personagem para esta mesa').isVisible(), 'sw', await sw());

// 2) Criar personagem para esta mesa
await p.getByText('Criar personagem para esta mesa').click();
await p.waitForTimeout(800);
// rascunho antigo? começa de novo
if (await p.getByText('Começar de novo').isVisible().catch(() => false)) await p.getByText('Começar de novo').click();
await shot('3-wizard-joined');
console.log('confirmed card', await p.locator('.join-card.is-confirmed').count(), 'sw', await sw());

// 3) Tirar a mesa e testar o bloco: código errado e certo
await p.getByText('Trocar ou tirar a mesa').click();
await p.fill('.join-input', 'zzzzzz');
await p.getByRole('button', { name: 'Verificar' }).click();
await p.waitForTimeout(800);
await shot('4-wrong-code');
console.log('error', await p.locator('.join-error').textContent());
await p.fill('.join-input', CODE);
await p.getByRole('button', { name: 'Verificar' }).click();
await p.waitForTimeout(800);
await p.locator('.join-card').scrollIntoViewIfNeeded();
await shot('5-found');
await p.getByText('É essa! Entrar nesta mesa').click();
await p.waitForTimeout(300);
console.log('confirmed again', await p.locator('.join-card.is-confirmed').count());

// 4) Criar de verdade: rascunho com uma ficha pronta completa + a mesa, direto na revisão
const draftChar = await p.evaluate(() => JSON.parse(localStorage.getItem('forja:creator-draft')).char);
const pg = pregens.find(x => x.character?.className === 'fighter') || pregens[0];
const char = { ...pg.character, avatar: '', name: 'Teste Convite I2', creation: { join: draftChar.creation.join }, levelingMode: draftChar.levelingMode };
await p.evaluate((c) => localStorage.setItem('forja:creator-draft', JSON.stringify({ v: 1, savedAt: Date.now(), stepId: 'review', visited: ['welcome','class','origin','species','background','abilities','equipment','details','review'], char: c })), char);
await p.reload({ waitUntil: 'networkidle' });
await p.getByRole('button', { name: /^Campanhas$/ }).first().waitFor();
await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Novo Personagem/i }).first().click();
await p.waitForTimeout(800);
if (await p.getByText('Continuar de onde parei').isVisible().catch(() => false)) await p.getByText('Continuar de onde parei').click();
await p.waitForTimeout(800);
await shot('6-review');
const btn = p.getByRole('button', { name: /Criar e entrar na mesa/ });
console.log('create btn', await btn.count(), await btn.isEnabled().catch(() => 'n/a'));
if (await btn.isEnabled().catch(() => false)) {
  await btn.click();
  await p.waitForTimeout(3000);
  await shot('7-campaign');
  console.log('toast', await p.locator('.toast').textContent().catch(() => null));
}
console.log('errors', errs);
await b.close();
