// Imagens em todo lugar: itemArt/monsterArt/ícones, filtro do seletor de itens e retrato por nome.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { itemArt, monsterArt, conditionIcon, damageIcon, schoolIcon, itemEmoji, monsterEmoji } from '../src/art.js';
import { filterItems, MAGIC_CATEGORIES } from '../src/items/item-filter.js';
import { baseName, buildNameIndex, portraitFor, needsNameIndex } from '../src/combat/monster-portrait.js';
import { ITEMS, instantiate } from '../data/items.js';
import { BESTIARY } from '../data/bestiary.js';

const exists = (src) => fs.existsSync(new URL(`../public${decodeURIComponent(src)}`, import.meta.url));

test('itemArt: catálogo, armas pelo id, objeto, instância e base', () => {
  assert.equal(itemArt('plate'), '/art/items/plate.webp');
  assert.equal(itemArt('longsword'), '/art/options/longsword.webp');
  assert.equal(itemArt({ id: 'longsword', name: 'Espada' }), '/art/options/longsword.webp'); // char.weapons
  assert.equal(itemArt(instantiate(ITEMS.find(i => i.sourceId === 'bagHolding'))), '/art/items/bagHolding.webp');
  assert.equal(itemArt({ sourceId: 'custom', base: 'mace' }), '/art/options/mace.webp');
  assert.equal(itemArt({ sourceId: 'campaign-3', artId: 'potionHealing' }), '/art/items/potionHealing.webp');
  assert.equal(itemArt({ sourceId: 'custom', name: 'Coisa' }), null);
  assert.equal(itemArt(null), null);
  assert.equal(itemArt('../../etc/passwd'), null);
  // '+' fica cru na URL (%2B cai no index.html do Vite)
  assert.equal(itemArt('weapon+1'), '/art/items/weapon+1.webp');
  assert.ok(exists(itemArt('weapon+1')));
});

test('itemArt aponta só para arquivos que existem', () => {
  let found = 0;
  for (const it of ITEMS) {
    const src = itemArt(it);
    if (!src) continue;
    found += 1;
    assert.ok(exists(src), `${it.sourceId} → ${src}`);
  }
  assert.ok(found > 200, `poucas ilustrações de itens: ${found}`);
});

test('monsterArt: ids do bestiário, antigos e camelCase', () => {
  const withArt = BESTIARY.filter(m => monsterArt(m.id));
  assert.ok(withArt.length > 200);
  for (const m of withArt) assert.ok(exists(monsterArt(m.id)), m.id);
  const own = JSON.parse(fs.readFileSync(new URL('../src/art-monsters.json', import.meta.url)));
  if (own.includes('goblin-warrior')) assert.equal(monsterArt('goblin'), '/art/monsters/goblin-warrior.webp');
  assert.equal(monsterArt('custom-123'), null);
  assert.equal(monsterArt(undefined), null);
});

test('ícones vazios hoje → null (a tela usa o emoji)', () => {
  const icons = JSON.parse(fs.readFileSync(new URL('../src/art-icons.json', import.meta.url)));
  if (!icons.includes('cond-poisoned')) assert.equal(conditionIcon('poisoned'), null);
  if (!icons.includes('dmg-fire')) assert.equal(damageIcon('fire'), null);
  if (!icons.includes('school-evocation')) assert.equal(schoolIcon('evocation'), null);
  assert.equal(conditionIcon(''), null);
});

test('emojis temáticos', () => {
  assert.equal(itemEmoji({ type: 'potion' }), '🧪');
  assert.equal(itemEmoji({ type: 'magic', magic: { category: 'ring' } }), '💍');
  assert.equal(itemEmoji({ type: 'armor', magic: { category: 'armor' } }), '🛡️');
  assert.equal(itemEmoji({}), '🎒');
  assert.equal(monsterEmoji('dragon'), '🐉');
  assert.equal(monsterEmoji('swarm of Tiny beasts'), '🐀');
  assert.equal(monsterEmoji(undefined), '👹');
});

test('filterItems: sem corte de 100, tipo, categoria, raridade e busca sem acento', () => {
  assert.equal(filterItems(ITEMS).length, ITEMS.length);
  assert.ok(ITEMS.length > 100);
  const rings = filterItems(ITEMS, { category: 'ring' });
  assert.ok(rings.length > 5 && rings.every(i => i.magic.category === 'ring'));
  const legend = filterItems(ITEMS, { rarity: 'legendary' });
  assert.ok(legend.length > 0 && legend.every(i => i.magic.rarity === 'legendary'));
  const mundane = filterItems(ITEMS, { rarity: 'mundane' });
  assert.ok(mundane.length > 0 && mundane.every(i => !i.magic));
  assert.ok(filterItems(ITEMS, { query: 'pocao' }).some(i => i.sourceId === 'potionHealing'));
  assert.ok(filterItems(ITEMS, { query: 'HOLDING' }).some(i => i.sourceId === 'bagHolding'));
  assert.deepEqual(filterItems(ITEMS, { type: 'weapon', category: 'scroll' }), []);
  for (const c of MAGIC_CATEGORIES) assert.ok(filterItems(ITEMS, { category: c }).length > 0, c);
});

test('retrato por nome: "Goblin #2" acha o retrato; nome disfarçado não', () => {
  assert.equal(baseName('Goblin #2'), 'goblin');
  const index = buildNameIndex(BESTIARY);
  const m = BESTIARY.find(b => monsterArt(b.id));
  assert.equal(portraitFor({ type: 'monster', name: `${m.name.pt} #3` }, index), monsterArt(m.id));
  assert.equal(portraitFor({ type: 'monster', name: m.name.en }, index), monsterArt(m.id));
  assert.equal(portraitFor({ type: 'monster', monster_id: m.id, name: 'Vulto' }, null), monsterArt(m.id));
  assert.equal(portraitFor({ type: 'monster', name: 'Vulto encapuzado' }, index), null);
  assert.equal(portraitFor({ type: 'pc', name: m.name.pt }, index), null);
  assert.equal(needsNameIndex([{ type: 'monster', name: 'x' }]), true);
  assert.equal(needsNameIndex([{ type: 'monster', name: 'x', sprite: 'data:x' }, { type: 'pc' }]), false);
});

test('formulário de item preserva campos mágicos do SRD e a referência ao catálogo', async () => {
  const { toForm, formToItem } = await import('../src/items/item-model.js');
  const staff = ITEMS.find(i => i.magic?.charges && typeof i.magic.attunement === 'object');
  const back = formToItem(toForm({ ...staff, name: staff.name.pt }, 'pt'));
  assert.equal(back.magic.charges, staff.magic.charges);
  assert.equal(back.magic.category, staff.magic.category);
  assert.deepEqual(back.magic.attunement, staff.magic.attunement);
  assert.equal(back.sourceId, staff.sourceId);
  const f = toForm({ ...staff, name: 'x' }, 'pt');
  assert.equal(formToItem({ ...f, attunement: false }).magic.attunement, false);
});

test('itemArtFor: itens dos pacotes da criação acham a arte pelo nome', async () => {
  const { itemArtFor, normName } = await import('../src/items/item-art.js');
  assert.equal(normName('Azagaia ×8'), 'azagaia');
  assert.equal(normName('Flechas (20)'), 'flechas');
  assert.equal(itemArtFor({ name: 'Kit de Curandeiro', qty: 1 }), itemArt('healersKit'));
  assert.equal(itemArtFor({ name: 'Flechas', qty: 20 }), itemArt('arrows20'));
  assert.equal(itemArtFor({ name: 'Pacote de Explorador de Masmorras' }), itemArt('dungeoneersPack'));
  assert.equal(itemArtFor({ name: 'Healer’s Kit' }), itemArt('healersKit'));
  assert.equal(itemArtFor({ name: 'Coisa inventada' }), null);
  assert.equal(itemArtFor({ sourceId: 'plate', name: 'Outro nome' }), itemArt('plate'));
});
