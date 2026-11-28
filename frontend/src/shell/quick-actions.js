import { parseDiceAst, evalDiceAst, formatAstBreakdown } from '../dice/dice-ast.js';
import { getActiveChar } from '../dice/active-char.js';
import { CONDITION_IDS } from '../sheet/condition-rules.js';
import { tName } from '../../data/i18n.js';

const L = (lang, pt, en) => (lang === 'pt' ? pt : en);

export function parseSlashQuery(rawQuery, { lang = 'pt', activeChar = getActiveChar(), dispatch = null } = {}) {
  const raw = String(rawQuery || '').trim();
  if (!raw.startsWith('/')) return [];
  const pt = lang === 'pt';
  const [cmdRaw, ...rest] = raw.slice(1).trim().split(/\s+/);
  const cmd = (cmdRaw || '').toLowerCase();
  const arg = rest.join(' ').trim();

  if (!cmd) {
    return [
      { id: 'slash-hint-r', kind: 'nav', icon: '🎲', label: '/r 2d6+3', sub: L(lang, 'Rolar expressão rápida via Dice AST', 'Quick roll via Dice AST'), go: ['play', 'checks', {}] },
      { id: 'slash-hint-cond', kind: 'nav', icon: '🛡️', label: '/cond poisoned', sub: L(lang, 'Alternar condição na ficha aberta', 'Toggle condition on active sheet'), go: ['play', 'scene', {}] },
      { id: 'slash-hint-cast', kind: 'nav', icon: '✨', label: '/cast fireball', sub: L(lang, 'Abrir/buscar magia da ficha ativa', 'Open/search active sheet spell'), go: ['play', 'scene', {}] },
    ];
  }

  if (cmd === 'r' || cmd === 'roll' || cmd === 'rolar') {
    const parsed = arg ? parseDiceAst(arg) : null;
    if (!parsed || !parsed.ok) {
      return [{
        id: 'slash-roll-bad', kind: 'nav', icon: '🎲',
        label: arg ? `/r ${arg}` : '/r 1d20+5',
        sub: L(lang, 'Digite uma fórmula válida (ex.: 2d6+3, 4d6kh3)', 'Type a valid formula (e.g. 2d6+3, 4d6kh3)'),
        run: () => {},
      }];
    }
    const diceRoll = dispatch?.diceRoll || (typeof window !== 'undefined' ? window.__diceRoll : null);
    const diceShow = dispatch?.diceShow || (typeof window !== 'undefined' ? window.__diceShow : null);
    return [{
      id: `slash-roll-${parsed.normalized}`,
      kind: 'nav',
      icon: '🎲',
      label: `${L(lang, 'Rolar', 'Roll')} ${parsed.normalized}`,
      sub: L(lang, 'Pressione Enter para rolar agora', 'Press Enter to roll now'),
      run: () => {
        if (diceRoll) {
          const rolled = diceRoll({ formula: parsed.normalized, label: parsed.normalized });
          if (rolled != null) return null;
        }
        const res = evalDiceAst(parsed.ast);
        const breakdown = formatAstBreakdown(res);
        if (diceShow) {
          const groups = (res.terms || []).map(tm => ({ die: tm.sides, sign: 1, rolls: tm.keptRolls }));
          const diceSum = (res.terms || []).reduce((acc, tm) => acc + tm.subtotal, 0);
          diceShow({
            label: parsed.normalized,
            formula: parsed.normalized,
            groups,
            mod: res.total - diceSum,
            total: res.total,
            source: 'local',
          });
        }
        return { total: res.total, breakdown };
      },
    }];
  }

  if (cmd === 'cond' || cmd === 'condicao' || cmd === 'condition') {
    const term = arg.toLowerCase();
    const updater = dispatch?.updateChar || (typeof window !== 'undefined' ? window.__updateChar : null);
    const activeSet = new Set(activeChar?.conditions || []);
    return CONDITION_IDS
      .map(id => ({ id, label: tName('condition', id, lang) || id }))
      .filter(c => !term || c.id.includes(term) || c.label.toLowerCase().includes(term))
      .slice(0, 8)
      .map(c => {
        const isOn = activeSet.has(c.id);
        return {
          id: `slash-cond-${c.id}`,
          kind: 'nav',
          icon: isOn ? '✓' : '○',
          label: `${isOn ? (pt ? 'Remover' : 'Clear') : (pt ? 'Aplicar' : 'Apply')} ${c.label}`,
          sub: activeChar ? `${activeChar.name || ''}` : L(lang, 'Abra uma ficha primeiro', 'Open a sheet first'),
          run: () => {
            if (!activeChar || !updater) return false;
            const cur = Array.isArray(activeChar.conditions) ? activeChar.conditions : [];
            const next = cur.includes(c.id) ? cur.filter(x => x !== c.id) : [...cur, c.id];
            updater({ conditions: next }, 'condition');
            return true;
          },
        };
      });
  }

  if (cmd === 'cast' || cmd === 'magia' || cmd === 'spell') {
    const term = arg.toLowerCase();
    const spells = Array.isArray(activeChar?.spells) ? activeChar.spells : [];
    const diceRoll = dispatch?.diceRoll || (typeof window !== 'undefined' ? window.__diceRoll : null);
    return spells
      .map(s => (typeof s === 'string' ? { id: s } : s))
      .filter(s => s?.id)
      .map(s => ({ id: s.id, name: s.name || tName('spellName', s.id, lang) || s.id }))
      .filter(s => !term || s.id.toLowerCase().includes(term) || String(s.name).toLowerCase().includes(term))
      .slice(0, 8)
      .map(s => ({
        id: `slash-cast-${s.id}`,
        kind: 'nav',
        icon: '✨',
        label: `${L(lang, 'Lançar', 'Cast')} ${s.name}`,
        sub: activeChar?.name || L(lang, 'Ficha ativa', 'Active sheet'),
        run: () => {
          if (diceRoll) diceRoll({ die: 20, mod: 0, label: s.name, isAttack: true });
          return s.id;
        },
      }));
  }

  return [];
}
