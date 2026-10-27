// Resumo da Tela desenhado pelo app (§5.9.2): a prévia 16:9 de Jogar › Tela, a
// janela do PC e (com `mini`) a miniatura da barra da mesa. Não é pixel-igual à
// TV; é legível e diz a verdade, pela mesma regra (stage-now.js). Texto de
// verdade (13–15 px) numa faixa escura; nada de imagem com texto reduzido. A
// `mini` (72×40) não tem texto: as 2 linhas ficam ao lado, na barra.
//
//   <StageThumb campaign={c} stage={stage} test={check} lang={lang} [mini] [combat] />
import { useState } from 'react';
import { api, API_BASE } from '../api/client.js';
import { defaultCoverArt } from '../shell/shell-logic.js';
import { bgLabel, dmFrontImage, frontIcon, frontLabel, L, stageNow, testLabel } from './stage-now.js';
import './stage.css';

const abs = (url) => (!url ? null : /^(https?:|data:|blob:)/.test(url) ? url : `${API_BASE || ''}${url}`);

export default function StageThumb({ campaign, stage, test = null, lang = 'pt', className = '', mini = false, combat }) {
  // `combat` ({active, round}, do pulso) vale sobre o combatNow do GET completo, que chega depois.
  const now = stageNow({ stage, combat: combat || campaign?.combatNow });
  const [broken, setBroken] = useState('');
  const cover = api.campaignCoverUrl(campaign) || defaultCoverArt(campaign);
  const frontImg = now.mode === 'front' ? abs(dmFrontImage(campaign.id, now.front)) : null;
  const img = now.mode === 'dark' ? null : frontImg && broken !== frontImg ? frontImg : (now.mode === 'rest' || now.mode === 'front' ? cover : null);
  const contain = !!frontImg && now.front?.kind === 'image';
  let line1;
  if (now.mode === 'dark') line1 = `◐ ${L(lang, 'Tela escurecida', 'Screen blacked out')}`;
  else if (now.mode === 'front') line1 = `${frontIcon(now.front)} ${L(lang, 'Na tela', 'On screen')}: ${frontLabel(now.front, lang, { dm: true })}`;
  else if (now.mode === 'rest') line1 = `📺 ${L(lang, 'Na tela: capa', 'On screen: cover')}`;
  else line1 = bgLabel(now, lang);
  const line2 = now.mode === 'front' && now.over
    ? `⚔ ${L(lang, 'por cima do combate', 'over the combat')}${now.round ? ` · ${L(lang, 'rodada', 'round')} ${now.round}` : ''}`
    : now.waiting ? `${L(lang, 'Depois do combate', 'After combat')}: ${frontLabel(now.waiting, lang, { dm: true })}`
      : test ? testLabel(test) : (now.mode === 'rest' ? campaign.name : '');
  if (mini) {
    return (
      <span className={`stage-thumb is-mini is-${now.mode} ${className}`.trim()} aria-hidden="true">
        {img && <img className={`stage-thumb-img ${contain ? 'is-contain' : ''}`} src={img} alt="" onError={() => setBroken(img)} />}
        {(now.mode === 'dark' || now.mode === 'combat' || now.mode === 'map' || (now.mode === 'front' && !img)) && (
          <span className="stage-thumb-emblem">{now.mode === 'dark' ? '◐' : now.mode === 'combat' ? '⚔' : now.mode === 'map' ? '🗺' : frontIcon(now.front)}</span>
        )}
        {now.mode === 'front' && now.over && <span className="stage-thumb-corner">⚔</span>}
      </span>
    );
  }
  return (
    <div className={`stage-thumb is-${now.mode} ${className}`.trim()} role="img"
      aria-label={[line1, line2].filter(Boolean).join(' · ')}>
      {img && <img className={`stage-thumb-img ${contain ? 'is-contain' : ''}`} src={img} alt=""
        onError={() => setBroken(img)} />}
      {now.mode === 'dark' && <span className="stage-thumb-emblem" aria-hidden="true">◐</span>}
      {(now.mode === 'combat' || now.mode === 'map') && <span className="stage-thumb-emblem" aria-hidden="true">{now.mode === 'combat' ? '⚔' : '🗺'}</span>}
      {now.mode === 'front' && now.over && (
        <span className="stage-thumb-tarja" aria-hidden="true">⚔ {L(lang, 'Rodada', 'Round')} {now.round ?? '—'}</span>
      )}
      {now.mode === 'front' && !frontImg && now.front?.kind !== 'card' && (
        <span className="stage-thumb-emblem is-soft" aria-hidden="true">{frontIcon(now.front)}</span>
      )}
      <span className="stage-thumb-band" aria-hidden="true">
        <span className="stage-thumb-l1">{line1}</span>
        {/* a 2ª linha fica sempre (vazia ou não): a faixa não muda de altura quando a Tela muda */}
        <span className="stage-thumb-l2">{line2 || '\u00a0'}</span>
      </span>
    </div>
  );
}
