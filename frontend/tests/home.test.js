/* Tela inicial (src/home/home-utils.js): busca, ordem "Recentes", estado do PV e linha do cartão. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fold, filterCharacters, sortRecent, hpState, hpStateLabel, heroLine, portraitOf, subclassName,
} from '../src/home/home-utils.js';

const bruna = { id: 'a', name: 'Bruna Ferrocampo', className: 'fighter', subclass: 'champion', race: 'human', level: 5 };
const elarion = { id: 'b', name: 'Elarion Folhaclara', className: 'wizard', race: 'elf', level: 3 };
const kaelor = { id: 'c', name: 'Kaelor', className: 'paladin', race: 'dragonborn', level: 5, multiclass: [{ id: 'warlock' }],
  classSequence: ['paladin', 'paladin', 'paladin', 'warlock', 'warlock'] };
const all = [bruna, elarion, kaelor];

test('fold: minúsculas e sem acento', () => {
  assert.equal(fold('Campeão'), 'campeao');
  assert.equal(fold('ÁÉÍÓÚ çã'), 'aeiou ca');
  assert.equal(fold(null), '');
});

test('busca: subclasse traduzida, com e sem acento, e o id cru continua achando', () => {
  const ids = (q, lang = 'pt') => filterCharacters(all, q, lang).map(c => c.id);
  assert.deepEqual(ids('Campeão'), ['a']);
  assert.deepEqual(ids('campeao'), ['a']);
  assert.deepEqual(ids('champion'), ['a']);          // como hoje (id cru)
  assert.deepEqual(ids('Champion', 'en'), ['a']);
  assert.deepEqual(ids('  '), ['a', 'b', 'c']);       // vazio: todos, na mesma ordem
  assert.deepEqual(ids('xyzzy'), []);
});

test('busca: nome, espécie, classe, "Nível N" e a multiclasse', () => {
  const ids = (q, lang = 'pt') => filterCharacters(all, q, lang).map(c => c.id);
  assert.deepEqual(ids('folha'), ['b']);
  assert.deepEqual(ids('elfo'), ['b']);
  assert.deepEqual(ids('mago'), ['b']);
  assert.deepEqual(ids('nivel 3'), ['b']);
  assert.deepEqual(ids('Nível 5'), ['a', 'c']);
  assert.deepEqual(ids('bruxo'), ['c']);              // 2ª classe da multiclasse (antes não achava)
  assert.deepEqual(ids('warlock', 'en'), ['c']);
});

test('ordem "Recentes": updatedAt decrescente (número local ou ISO remoto); sem data no fim, na ordem guardada', () => {
  const list = [
    { id: 1, updatedAt: 1000 },
    { id: 2 },
    { id: 3, updatedAt: '2026-10-01T10:00:00Z' },
    { id: 4, updatedAt: 5000 },
    { id: 5 },
    { id: 6, updatedAt: 'não é data' },
    { id: 7, updatedAt: 5000 },
  ];
  assert.deepEqual(sortRecent(list).map(c => c.id), [3, 4, 7, 1, 2, 5, 6]);
  assert.equal(sortRecent(list).length, list.length);
  assert.deepEqual(list.map(c => c.id), [1, 2, 3, 4, 5, 6, 7]); // não altera a lista original
});

test('hpState: limites do plano da ficha (ok > 50%, warn > 25%, crit > 0, down = 0)', () => {
  assert.equal(hpState(44, 44), 'ok');
  assert.equal(hpState(23, 44), 'ok');
  assert.equal(hpState(22, 44), 'warn');   // 50% exatos
  assert.equal(hpState(12, 44), 'warn');
  assert.equal(hpState(11, 44), 'crit');   // 25% exatos
  assert.equal(hpState(1, 44), 'crit');
  assert.equal(hpState(0, 44), 'down');
  assert.equal(hpState(-3, 44), 'down');
  assert.equal(hpState(undefined, 44), 'ok'); // sem currentHp conta como cheio
  assert.equal(hpState(null, 10), 'ok');
  assert.equal(hpState(5, 0), null);          // sem maxHp não há barra
  assert.equal(hpStateLabel('down', 'pt'), 'Caído');
  assert.equal(hpStateLabel('crit', 'en'), 'Near death');
  assert.equal(hpStateLabel(null, 'pt'), '');
});

test('linha do cartão: "Classe (Subclasse) · Espécie", multiclasse como hoje, "—" sem classe', () => {
  assert.equal(heroLine(bruna, 'pt'), 'Guerreiro (Campeão) · Humano');
  assert.equal(heroLine(bruna, 'en'), 'Fighter (Champion) · Human');
  assert.equal(heroLine(elarion, 'pt'), 'Mago · Elfo');
  assert.equal(heroLine(kaelor, 'pt'), 'Paladino 3 / Bruxo 2 · Draconato');
  assert.equal(heroLine({ race: 'elf' }, 'pt'), '— · Elfo');
  assert.equal(heroLine({}, 'pt'), '—');
  // subclasse sem tradução (id cru) não entra na linha
  assert.equal(subclassName({ subclass: 'minhaSubclasseCaseira' }, 'pt'), '');
});

test('retrato: foto, senão espécie, senão classe, senão nada', () => {
  assert.equal(portraitOf({ avatar: 'data:image/jpeg;base64,x', race: 'elf' }), 'data:image/jpeg;base64,x');
  assert.equal(portraitOf({ race: 'elf', className: 'wizard' }), '/art/species/elf.webp');
  assert.equal(portraitOf({ race: 'raça-inventada', className: 'wizard' }), '/art/classes/wizard.webp');
  assert.equal(portraitOf({}), null);
});

// ---------- Contratos da tela (lidos do código, sem renderizar) ----------
const src = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('CharacterList: mantém as props de hoje e o mesmo input de arquivo (JSON ou PDF), sem alert()', () => {
  const s = src('../components/CharacterList.jsx');
  for (const p of ['lang', 'characters', 'onOpen', 'onNew', 'onImport', 'onImportPdf', 'onExportAll', 'onBlankPdf', 'onPickPregen']) {
    assert.match(s, new RegExp(`\\b${p}\\b`), p);
  }
  assert.match(s, /accept="application\/json,\.json,application\/pdf,\.pdf"/);
  assert.equal((s.match(/type="file"/g) || []).length, 1);
  assert.doesNotMatch(s, /\balert\(/);
  assert.match(s, /aria-label=\{L\(lang, 'Filtrar personagens', 'Filter characters'\)\}/);
  assert.match(s, /n > 4 &&/); // a busca continua só com mais de 4 fichas
});

test('cartão: abrir a ficha é a única ação e não há botão dentro de botão', () => {
  const s = src('../src/home/HeroCard.jsx');
  assert.equal((s.match(/<button/g) || []).length, 1);
  assert.match(s, /onClick=\{\(\) => onOpen\(c\.id\)\}/);
  assert.match(s, /<article/);
});

test('app.jsx: a lista só volta a "carregando" fora do estado pronto (sem piscar ao salvar)', () => {
  const s = src('../app.jsx');
  assert.match(s, /if \(listStateRef\.current !== 'ready'\) setList\('loading'\)/);
  assert.match(s, /setList\('error'\)/);
  assert.match(s, /listState=\{listState\}/);
});

test('menu da conta fecha com clique fora, Esc e troca de tela; cabeçalho com as correções de encaixe', () => {
  const s = src('../app.jsx');
  assert.match(s, /useEffect\(\(\) => \{ setUserMenuOpen\(false\); \}, \[screen\]\)/);
  assert.match(s, /addEventListener\('pointerdown', onDown\)/);
  assert.match(s, /e\.key === 'Escape'\) setOpen\(false\)/);
  assert.match(src('../components/Shared.jsx'), /import '\.\/header\.css';/);
  assert.match(src('../components/header.css'), /@media \(min-width: 521px\) and \(max-width: 860px\)/);
});
