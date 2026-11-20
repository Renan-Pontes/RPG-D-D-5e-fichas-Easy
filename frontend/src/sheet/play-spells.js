// Truques de ataque na aba Jogar (components/Sheet.jsx, painel Ataques): os truques prontos
// da ficha que pedem uma jogada de ataque mágico ou um teste de resistência do alvo.
// Só apresentação: os números são os mesmos da aba Magias (components/SheetTabs.jsx,
// AllSpellsList/SpellRow) — ataque = proficiência + atributo de conjuração da classe (ou do
// talento/espécie que deu o truque) e CD = 8 + esse ataque. Nenhum dado de dano é inventado:
// o dano do truque fica no texto dele, na aba Magias.
// Magias de círculo (que gastam espaço) não entram aqui: conjurar desconta o espaço e, em
// campanha, passa pelo servidor — isso continua no botão "Conjurar" da aba Magias.
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';
import { grantedSpells } from '../creator/spell-helpers.js';
import { computeProgression } from '../progression/engine.js';
import { spellMechanics } from './spell-text.js';
import SPELL_TAGS from '../../data/spell-tags.json';

const idOf = (s) => (typeof s === 'string' ? s : s?.id);
const isGrantEntry = (s) => !!s && typeof s === 'object' && s.auto && (s.feat || s.species);

/**
 * → [{ id, name, school, atk, dc, saveAb, src }]
 *   atk: bônus da jogada de ataque mágico (null quando o truque pede resistência)
 *   saveAb: 'dex' | 'wis' | … | null (resistência sem atributo conhecido) | undefined (é de ataque)
 *   src: classe (multiclasse) ou a origem (talento/espécie), para dizer de onde vem
 */
export function playCantrips(char, lang) {
  const out = [];
  let catalog = [];
  try { catalog = Utils.spellCatalog(char) || []; } catch { return out; }
  const multi = Utils.isMulticlass(char);
  let casters = [];
  try {
    const single = !!Utils.spellcastingAbility(char) && (Utils.casterViews(char).length > 0 || Utils.spellSlots(char).some(Boolean));
    casters = multi ? Utils.casterViews(char) : (single ? [char] : []);
  } catch { casters = []; }
  const pb = Utils.profBonus(char);
  const seen = new Set();
  const push = (id, ability, src) => {
    if (!id || seen.has(id) || !ability) return;
    const def = catalog.find(x => x.id === id);
    if (!def || def.level !== 0) return;
    const mech = spellMechanics(id);
    const tags = (def.rulesVersion === '2024' || !SPELL_TAGS.legacy?.[id]) ? SPELL_TAGS.spells?.[id] : SPELL_TAGS.legacy[id];
    const isAtk = !!(mech?.atk || (!mech && tags?.atk));
    const saveAb = mech?.save || (tags?.save ? null : undefined);
    if (!isAtk && saveAb === undefined) return;      // truque sem ataque nem resistência (Luz, Mão Mágica…)
    seen.add(id);
    const atk = pb + Utils.abilityMod(char, ability);
    out.push({ id, name: tName('spellName', id, lang), school: def.school, atk: isAtk ? atk : null, dc: 8 + atk, saveAb: isAtk ? undefined : saveAb, src });
  };

  let granted = [];
  try { granted = grantedSpells(char) || []; } catch { granted = []; }
  casters.forEach(v => {
    // em multiclasse cada classe só vê as próprias magias (as sem `cls` são da classe inicial)
    const mine = (s) => !multi || ((typeof s === 'object' && s.cls) || char.className) === v.className;
    const view = multi ? { ...v, spells: (char.spells || []).filter(mine) } : char;
    let ability = null;
    try { ability = Utils.spellcastingAbilityOfClass(view); } catch { ability = null; }
    let prog = null;
    try { prog = computeProgression(view); } catch { prog = null; }
    const ids = [
      ...(view.spells || []).filter(s => !isGrantEntry(s)).map(idOf),
      ...(prog?.autoCantrips || []),
    ];
    const src = multi ? tName('class', v.className, lang) : null;
    ids.forEach(id => push(id, ability, src));
  });
  // truques de talento/espécie: atributo da própria origem
  granted.filter(g => g.source === 'feat' || g.source === 'species').forEach(g => {
    push(g.id, g.ability, g.from?.[lang] || (lang === 'pt' ? 'Talento/espécie' : 'Feat/species'));
  });
  return out;
}
