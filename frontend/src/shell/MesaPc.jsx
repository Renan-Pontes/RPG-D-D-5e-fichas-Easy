// Peças do personagem na mesa (plano §4.3): retrato, barra de PV e selos, as
// mesmas em todas as telas do mestre (Combate, Cena e Grupo).
//   <PcPortrait stats={{ avatar, avatarUrl, race, classId }} name="Dagna" size={40} />
// A foto vem por URL (`avatarUrl`, V9: o GET da campanha não leva mais o base64);
// `avatar` ainda vale (ficha aberta pelo dono, arte do site).
//   <HpBar hp={3} max={10} temp={2} lang="pt" />
//   <PcBadges stats={memberStats(m)} lang="pt" isDM unlockedTo={4} asked />
// O desenho fica em src/campaigns/combat-styles.css (bloco "MesaPc").
import { useEffect, useState } from 'react';
import { tName } from '../../data/i18n.js';
import { apiUrl } from '../api/client.js';
import { classArt, speciesArt } from '../art.js';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

/** Faixa de vida para a cor da barra: ok (> 60%), warn (> 30%), crit, down (0) ou unknown. */
export function hpTone(hp, max) {
  if (hp == null || !max) return 'unknown';
  if (hp <= 0) return 'down';
  const pct = (hp / max) * 100;
  return pct > 60 ? 'ok' : pct > 30 ? 'warn' : 'crit';
}

/** Retrato: avatar do jogador, ou a arte da espécie/classe, ou a inicial. */
export function PcPortrait({ stats, name, size = 40, className = '' }) {
  const photo = stats?.avatar || apiUrl(stats?.avatarUrl);
  const art = photo || speciesArt(stats?.race) || classArt(stats?.classId);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [art]);
  const style = { '--pc-pic': `${size}px` };
  if (art && !broken) {
    return (
      <img className={`mesa-pc-pic ${photo ? 'is-avatar' : 'is-art'} ${className}`.trim()} style={style}
        src={art} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false}
        onError={() => setBroken(true)} />
    );
  }
  return (
    <span className={`mesa-pc-pic is-initial ${className}`.trim()} style={style} aria-hidden="true">
      {(name || '?').trim().charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Barra de PV com o número dentro, cor pela faixa e temporários ("caído" vai no rótulo). compact: "a/b" sem espaços.
 * units: escreve "PV a / b" e "+n temp" (numa pílula escura, legível sobre a barra) — a Cena usa.
 */
export function HpBar({ hp, max, temp = 0, lang = 'pt', className = '', label, compact = false, units = false }) {
  const tone = hpTone(hp, max);
  const pct = max ? Math.max(0, Math.min(100, ((hp ?? 0) / max) * 100)) : 0;
  const tmp = Number(temp) || 0;
  const text = compact ? `${hp ?? '?'}/${max ?? '?'}` : `${hp ?? '?'} / ${max ?? '?'}`;
  return (
    <span className={['mesa-hp', `tone-${tone}`, units && 'has-units', className].filter(Boolean).join(' ')}
      role="img" aria-label={label || `${t(lang, 'PV', 'HP')} ${text}${tmp ? ` (+${tmp} ${t(lang, 'temporários', 'temporary')})` : ''}${tone === 'down' ? ` · ${t(lang, 'caído', 'down')}` : ''}`}>
      <span className="mesa-hp-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
      <span className="mesa-hp-text" aria-hidden="true">
        {units ? <span>{t(lang, 'PV', 'HP')} {text}</span> : text}
        {tmp > 0 && (units
          ? <span className="mesa-hp-temp">+{tmp}<span className="mesa-hp-temp-word"> temp</span></span>
          : <span className="mesa-hp-temp"> +{tmp}</span>)}
      </span>
    </span>
  );
}

const condName = (c, lang) => (c === 'exhaustion' ? t(lang, 'Exaustão', 'Exhaustion') : tName('condition', c, lang));

/**
 * Selos do personagem (texto ≥ 12 px, nada só no hover): ★ Inspiração,
 * condições, 🐾 Forma selvagem (fera e PV), ✨ Nível N liberado, ⬆ Pediu para
 * subir e 🎲 Trapaça (só o mestre vê). `stats` no formato do memberStats
 * (src/group/group-model.js). Sem selo nenhum, não desenha nada.
 */
export function PcBadges({ stats, lang = 'pt', isDM = false, unlockedTo = null, asked = false, className = '' }) {
  if (!stats) return null;
  const items = [];
  if (stats.inspiration) items.push(<span key="insp" className="mesa-pc-badge is-insp">★ {t(lang, 'Inspiração', 'Inspiration')}</span>);
  for (const cd of stats.conditions || []) items.push(<span key={`c-${cd}`} className="mesa-pc-badge is-cond">{condName(cd, lang)}</span>);
  if (stats.isDruid && stats.wildShape) {
    const w = stats.wildShape;
    items.push(
      <span key="wild" className="mesa-pc-badge is-wild">🐾 {t(lang, 'Forma selvagem', 'Wild shape')}{w.beast ? `: ${w.beast}` : ''}
        {w.hp != null && ` (${w.hp}/${w.maxHp ?? '?'})`}</span>,
    );
  }
  if (unlockedTo != null) items.push(<span key="up" className="mesa-pc-badge is-unlocked">✨ {t(lang, `Nível ${unlockedTo} liberado`, `Level ${unlockedTo} unlocked`)}</span>);
  if (asked) items.push(<span key="ask" className="mesa-pc-badge is-pending">⬆ {t(lang, 'Pediu para subir', 'Asked to level up')}</span>);
  if (isDM && stats.cheatMode) items.push(<span key="cheat" className="mesa-pc-badge is-cheat">🎲 {t(lang, 'Trapaça', 'Cheat')}</span>);
  if (!items.length) return null;
  return <div className={`mesa-pc-badges ${className}`.trim()}>{items}</div>;
}
