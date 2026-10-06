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
const char = {
  ...draftChar, name: 'Teste Convite I2', player: 'Renan',
  className: 'fighter', background: 'soldier', race: 'dwarf',
  abilities: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 12 },
  raceBonus: { str: 2, con: 1 },
  skillProfs: ['perception', 'acrobatics'],
  languages: ['Elvish', 'Giant'],
  armor: 'chainMail',
  weapons: [{ id: 'greatsword' }, { id: 'javelin', qty: 8 }],
  toolProfs: ['diceSet'],
  feats: [{ id: 'savageAttacker', origin: 'background' }],
  equipment: [{ name: { pt: 'Pacote de Aventureiro', en: "Explorer's Pack" }, qty: 1 }],
  coins: { cp: 0, sp: 0, ep: 0, gp: 18, pp: 0 },
  creation: { ...draftChar.creation, classPack: 'A', backgroundPack: 'A', toolChoices: { background: ['diceSet'] }, abilityMethod: 'standard', bonusMode: '2-1' },
};
const built = await p.evaluate(async (c0) => {
  const AH = await import('/src/creator/ability-helpers.js');
  const EH = await import('/src/creator/equipment-helpers.js');
  const { STEPS } = await import('/src/creator/steps.js');
  const CR = await import('/src/creator/creation.js');
  let c = { ...c0, creation: { ...c0.creation } };
  delete c.creation.abilityMethod; delete c.creation.bonusMode;
  c = { ...c, ...AH.suggestionPatch(c) };
  c = { ...c, ...AH.bonusPatch(c, AH.recommendedBonus(c)) };
  c.classOptions = [{ classId: 'fighter', pool: 'fightingStyle', id: 'defense' },
    ...['greatsword', 'javelin', 'longsword'].map(id => ({ classId: 'fighter', pool: 'weaponMastery', id }))];
  c.creation.equipSig = EH.equipmentSignature(c);
  return { c, issues: CR.flatIssues(CR.collectIssues(STEPS, c)).map(i => i.pt) };
}, char);
console.log('built issues', built.issues);
await p.evaluate((c) => localStorage.setItem('forja:creator-draft', JSON.stringify({ v: 1, savedAt: Date.now(), stepId: 'review', visited: ['welcome','class','origin','species','background','abilities','equipment','details','review'], char: c })), built.c);
await p.reload({ waitUntil: 'networkidle' });
await p.getByRole('button', { name: /^Campanhas$/ }).first().waitFor();
await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await p.getByRole('button', { name: /Novo Personagem/i }).first().click();
await p.waitForTimeout(800);
if (await p.getByText('Continuar de onde parei').isVisible().catch(() => false)) await p.getByText('Continuar de onde parei').click();
await p.waitForTimeout(800);
await shot('6-review');
console.log('issues', await p.locator('.cr-issues').allTextContents());
const btn = p.getByRole('button', { name: /Criar e entrar na mesa/ });
console.log('create btn', await btn.count(), await btn.isEnabled().catch(() => 'n/a'));
// Entrada na mesa falha (servidor 500): a ficha fica salva e aparece o aviso com "Tentar de novo".
await p.route('**/api/campaigns/join', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server_error"}' }));
if (await btn.isEnabled().catch(() => false)) {
  await btn.click();
  await p.waitForTimeout(2500);
  await shot('7-join-failed');
  console.log('retry banner', await p.locator('.join-retry').textContent().catch(() => null));
  await p.getByRole('button', { name: 'Tentar de novo' }).click();
  await p.waitForTimeout(1200);
  console.log('still banner after failed retry', await p.locator('.join-retry').count());
}
await p.unroute('**/api/campaigns/join');
// limpa a ficha de teste
const del = await p.evaluate(async () => {
  const c = await fetch('/api/auth/csrf', { credentials: 'include' }).then(r => r.json());
  const list = await fetch('/api/characters', { credentials: 'include' }).then(r => r.json());
  const mine = (list.characters || []).filter(x => x.name === 'Teste Convite I2');
  for (const x of mine) await fetch(`/api/characters/${x.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRFToken': c.csrfToken } });
  return mine.length;
});
console.log('deleted test chars', del);

// "Usar um personagem que já tenho" via #join=
await p.goto(`http://localhost:5174/#join=${CODE}`, { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
await p.getByText('Usar um personagem que já tenho').click();
await p.waitForTimeout(1200);
await shot('8-use-existing');
console.log('prefilled', await p.locator('.modal input.input').inputValue(), 'chars', await p.locator('.join-char').count(), 'sw', await sw());
await p.getByRole('button', { name: 'Cancelar' }).click();
console.log('errors', errs);
await b.close();
