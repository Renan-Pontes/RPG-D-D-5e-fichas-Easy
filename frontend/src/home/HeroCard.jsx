/* Cartão de herói da tela inicial: couro com filete dourado, retrato com o selo do
 * nível e o PV pelo estado. Abrir a ficha continua sendo a única ação: o botão do
 * nome se estende pelo cartão inteiro (::after), dentro de um <article>. */
import { useId, useState } from 'react';
import Icon from '../../components/Icons.jsx';
import { t } from '../../data/i18n.js';
import { classArt, speciesArt } from '../art.js';
import { L, heroLine, hpState, hpStateLabel } from './home-utils.js';

export default function HeroCard({ c, lang, onOpen }) {
  const id = useId();
  // Foto → arte da espécie → arte da classe → inicial (cada uma que falhar passa a vez).
  const sources = [c.avatar, speciesArt(c.race), classArt(c.className)].filter(Boolean);
  const [failed, setFailed] = useState(0);
  const src = sources[failed] || null;
  const level = c.level || 1;
  const levelLabel = `${t('level', lang)} ${level}`;
  const state = hpState(c.currentHp, c.maxHp);
  const cur = c.currentHp ?? c.maxHp;
  const pct = state ? Math.max(0, Math.min(100, (cur / c.maxHp) * 100)) : 0;
  const stateWord = hpStateLabel(state, lang);

  return (
    <article className={`home-card${state ? ` hp-${state}` : ''}`}>
      <div className="home-card-avatar">
        <div className="home-card-portrait">
          <span className="home-card-letter" aria-hidden="true">{(c.name || '?').charAt(0).toUpperCase()}</span>
          {src && <img className={src === c.avatar ? 'is-photo' : 'is-art'} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(n => n + 1)} />}
        </div>
        <span className="home-seal" id={`${id}-lv`} title={levelLabel}>
          <span aria-hidden="true">{level}</span><span className="home-sr">{levelLabel}</span>
        </span>
      </div>
      <div className="home-card-body">
        <h3 className={`home-card-name${c.name ? '' : ' unnamed'}`}>
          <button type="button" className="home-card-open" onClick={() => onOpen(c.id)} aria-describedby={`${id}-lv ${id}-sub ${id}-hp`}>
            <span className={c.name ? 'home-foil' : ''}>{c.name || L(lang, 'Sem nome', 'Unnamed')}</span>
          </button>
        </h3>
        <p className="home-card-sub" id={`${id}-sub`}>{heroLine(c, lang)}</p>
        <div className="home-card-foot" id={`${id}-hp`}>
          {state && (
            <span className="home-hp">
              <span className="home-hp-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
              <span className="home-hp-num mono" aria-hidden="true">{cur}/{c.maxHp}</span>
              <span className="home-hp-state" aria-hidden="true">{stateWord}</span>
              <span className="home-sr">{L(lang, `${cur} de ${c.maxHp} PV, ${stateWord.toLowerCase()}`, `${cur} of ${c.maxHp} HP, ${stateWord.toLowerCase()}`)}</span>
            </span>
          )}
          {c.inCampaign && <span className="home-tag">{L(lang, 'Em campanha', 'In campaign')}</span>}
        </div>
      </div>
      <Icon name="chevron-right" size={18} />
    </article>
  );
}
