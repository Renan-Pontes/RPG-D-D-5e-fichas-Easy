import { useMemo, useState } from 'react';
import Utils from '../../utils.js';
import { tName } from '../../data/i18n.js';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);

function classifyCastingTime(timeStr = '') {
  const s = String(timeStr).toLowerCase();
  if (/bonus|b[oô]nus/.test(s)) return 'bonus';
  if (/react|rea[cç][aã]o/.test(s)) return 'reaction';
  return 'action';
}

export default function MyTurnView({
  char,
  lang = 'pt',
  atks = [],
  playWeapons = [],
  cantrips = [],
  rollD20,
  onOpenSpells,
}) {
  const [open, setOpen] = useState(false);
  const [spent, setSpent] = useState({ action: false, bonus: false, reaction: false, move: false });
  const speedFt = Utils.effectiveSpeed?.(char) ?? Utils.speed?.(char) ?? 30;
  const speedTxt = Utils.speedLabel ? Utils.speedLabel(speedFt, lang) : `${speedFt} ft`;

  const buckets = useMemo(() => {
    const out = { action: [], bonus: [], reaction: [], free: [] };
    playWeapons.forEach((w, i) => {
      const a = atks[i];
      if (!a) return;
      out.action.push({
        id: `wpn-${i}`,
        label: w.name,
        meta: `${Utils.fmtMod(a.bonus)} · ${a.damage}`,
        onTrigger: () => rollD20?.({ die: 20, mod: a.bonus, label: `${w.name} · ${L(lang, 'Ataque', 'Attack')}`, isAttack: true }),
      });
    });
    for (const c of cantrips) {
      const k = classifyCastingTime(c.castingTime || '');
      out[k].push({
        id: `cnt-${c.id}`,
        label: c.name,
        meta: c.atk != null ? Utils.fmtMod(c.atk) : `${L(lang, 'CD', 'DC')} ${c.dc}`,
        onTrigger: c.atk != null
          ? () => rollD20?.({ die: 20, mod: c.atk, label: `${c.name} · ${L(lang, 'Ataque', 'Attack')}`, isAttack: true })
          : onOpenSpells,
      });
    }
    const catalog = Utils.spellCatalog ? Utils.spellCatalog(char) : [];
    for (const entry of (char.spells || [])) {
      const id = typeof entry === 'string' ? entry : entry?.id;
      const prepared = typeof entry === 'string' || entry?.prepared !== false;
      if (!id || !prepared) continue;
      const sp = catalog.find(x => x.id === id);
      if (!sp || sp.level === 0) continue;
      const bucket = classifyCastingTime(sp.time || sp.castingTime || '');
      out[bucket].push({
        id: `sp-${id}`,
        label: tName('spellName', id, lang) || sp.name?.[lang] || id,
        meta: `${L(lang, 'Nv', 'Lv')} ${sp.level}`,
        onTrigger: onOpenSpells,
      });
    }
    out.free.push({
      id: 'move-base',
      label: L(lang, 'Deslocamento base', 'Base movement'),
      meta: speedTxt,
      onTrigger: null,
    });
    return out;
  }, [char, lang, playWeapons, atks, cantrips, rollD20, onOpenSpells, speedTxt]);

  const toggleBucket = (key) => setSpent(s => ({ ...s, [key]: !s[key] }));
  const resetTurn = () => setSpent({ action: false, bonus: false, reaction: false, move: false });

  const sections = [
    { key: 'action', title: L(lang, 'Ação', 'Action'), items: buckets.action },
    { key: 'bonus', title: L(lang, 'Ação Bônus', 'Bonus Action'), items: buckets.bonus },
    { key: 'reaction', title: L(lang, 'Reação', 'Reaction'), items: buckets.reaction },
    { key: 'move', title: L(lang, 'Movimento & Livre', 'Move & Free'), items: buckets.free },
  ];

  return (
    <section className="fh-panel fh-myturn no-print" aria-label={L(lang, 'Meu Turno', 'My Turn')}>
      <div className="fh-myturn-head">
        <button type="button" className="fh-myturn-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>
          <span>⚔ {L(lang, 'Meu Turno', 'My Turn')}</span>
          <span className="fh-myturn-pills">
            {sections.map(sec => (
              <span key={sec.key} className={`fh-myturn-dot${spent[sec.key] ? ' is-spent' : ''}`} title={sec.title}>
                {sec.title.slice(0, 1)}
              </span>
            ))}
          </span>
        </button>
        {open && (
          <button type="button" className="fh-btn-xs" onClick={resetTurn}>
            {L(lang, 'Novo turno', 'Reset turn')}
          </button>
        )}
      </div>
      {open && (
        <div className="fh-myturn-grid">
          {sections.map(sec => (
            <div key={sec.key} className={`fh-myturn-card${spent[sec.key] ? ' is-spent' : ''}`}>
              <div className="fh-myturn-card-head">
                <strong>{sec.title}</strong>
                <button
                  type="button"
                  className={`fh-myturn-use${spent[sec.key] ? ' active' : ''}`}
                  aria-pressed={spent[sec.key]}
                  onClick={() => toggleBucket(sec.key)}
                >
                  {spent[sec.key] ? L(lang, 'Gasta ✓', 'Used ✓') : L(lang, 'Disponível', 'Ready')}
                </button>
              </div>
              {sec.items.length > 0 ? (
                <ul className="fh-myturn-list">
                  {sec.items.slice(0, 6).map(it => (
                    <li key={it.id}>
                      {it.onTrigger ? (
                        <button type="button" className="fh-myturn-item" onClick={it.onTrigger}>
                          <span>{it.label}</span>
                          <span className="muted">{it.meta}</span>
                        </button>
                      ) : (
                        <span className="fh-myturn-item is-static">
                          <span>{it.label}</span>
                          <span className="muted">{it.meta}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted text-xs" style={{ margin: '4px 0 0' }}>{L(lang, 'Sem opções dedicadas.', 'No dedicated options.')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
