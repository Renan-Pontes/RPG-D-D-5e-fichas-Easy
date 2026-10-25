// Peças do personagem na mesa (plano §4.3): retrato e barra de PV, as mesmas em
// todas as telas do mestre (Combate agora; Grupo e Cena nas próximas fatias).
//   <PcPortrait stats={{ avatar, race, classId }} name="Dagna" size={40} />
//   <HpBar hp={3} max={10} temp={2} lang="pt" />
// O desenho fica em src/campaigns/combat-styles.css (bloco "MesaPc").
import { useEffect, useState } from 'react';
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
  const art = stats?.avatar || speciesArt(stats?.race) || classArt(stats?.classId);
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [art]);
  const style = { '--pc-pic': `${size}px` };
  if (art && !broken) {
    return (
      <img className={`mesa-pc-pic ${stats?.avatar ? 'is-avatar' : 'is-art'} ${className}`.trim()} style={style}
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

/** Barra de PV com o número dentro, cor pela faixa e temporários ("caído" vai no rótulo). compact: "a/b" sem espaços. */
export function HpBar({ hp, max, temp = 0, lang = 'pt', className = '', label, compact = false }) {
  const tone = hpTone(hp, max);
  const pct = max ? Math.max(0, Math.min(100, ((hp ?? 0) / max) * 100)) : 0;
  const tmp = Number(temp) || 0;
  const text = compact ? `${hp ?? '?'}/${max ?? '?'}` : `${hp ?? '?'} / ${max ?? '?'}`;
  return (
    <span className={`mesa-hp tone-${tone} ${className}`.trim()}
      role="img" aria-label={label || `${t(lang, 'PV', 'HP')} ${text}${tmp ? ` (+${tmp} ${t(lang, 'temporários', 'temporary')})` : ''}${tone === 'down' ? ` · ${t(lang, 'caído', 'down')}` : ''}`}>
      <span className="mesa-hp-fill" style={{ width: `${pct}%` }} aria-hidden="true" />
      <span className="mesa-hp-text" aria-hidden="true">
        {text}
        {tmp > 0 && <span className="mesa-hp-temp"> +{tmp}</span>}
      </span>
    </span>
  );
}
