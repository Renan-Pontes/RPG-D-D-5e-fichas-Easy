import { errorMessage } from '../api/errors.js';
import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from 'react';
import { api, API_BASE, apiUrl } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import CombatGrid from '../campaigns/CombatGrid.jsx';
import DiceStage from '../dice/DiceStage.jsx';
import '../dice/dice-styles.css';
import { HERO_ART, hideOnError, conditionIcon } from '../art.js';
import ArtThumb, { ArtIcon } from '../components/ArtThumb.jsx';
import { loadNameIndex, needsNameIndex, portraitFor } from '../combat/monster-portrait.js';
import { absUrl, cardKey, charLine, healthLabel, paragraphs, screenMode } from '../player/player-model.js';
import { defaultArt } from '../world/world-model.js';
import { stageNow } from '../stage/stage-now.js';
import { conditionsShown, initiativeRows, isDeadScreenLink, lengthClass, partyRow, recapSubtitle, splitNumbered, turnNow, tvLang, tvMode } from './tv-logic.js';
import { fitAll } from './tv-fit.js';
import {
  attackOutcome, bigDuration, createQueue, currentBig, feedNextExpiry, ingest, nextBig, pruneFeed, rollGroups,
  rollParts, rollWho, saveHead, showsSum,
} from './roll-queue.js';
import { abilityLabel, damageTypeLabel } from '../combat/monster-i18n.js';

const t = (lang, pt, en) => lang === 'pt' ? pt : en;

const CONDITIONS = {
  blinded:       { pt: 'Cego',         en: 'Blinded',       icon: 'M4 12c2-5 6-7 8-7s6 2 8 7c-2 5-6 7-8 7s-6-2-8-7zm8 3a3 3 0 100-6 3 3 0 000 6zm-4-4l8 8' },
  charmed:       { pt: 'Encantado',    en: 'Charmed',       icon: 'M12 21s-7-4.5-7-10a5 5 0 019-3 5 5 0 019 3c0 5.5-7 10-7 10z' },
  deafened:      { pt: 'Surdo',        en: 'Deafened',      icon: 'M4 13a8 8 0 0116 0v3a3 3 0 01-3 3h-1v-7H9v7H7a3 3 0 01-3-3v-3z M3 3l18 18' },
  frightened:    { pt: 'Amedrontado',  en: 'Frightened',    icon: 'M9 8h.01M15 8h.01M8 16c1-1 2.5-2 4-2s3 1 4 2M12 2a10 10 0 100 20 10 10 0 000-20z' },
  grappled:      { pt: 'Agarrado',     en: 'Grappled',      icon: 'M6 6l4 4-4 4 4 4M18 6l-4 4 4 4-4 4' },
  incapacitated: { pt: 'Incapacitado', en: 'Incapacitated', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-5 13a5 5 0 0010 0' },
  invisible:     { pt: 'Invisível',    en: 'Invisible',     icon: 'M3 3l18 18M9.88 9.88a3 3 0 004.24 4.24M10.73 5.08A11 11 0 0112 5c5 0 9 4 10 7-.6 1.4-1.6 2.8-3 4M6 6c-1.4 1.2-2.4 2.6-3 4 1 3 5 7 9 7 1.4 0 2.7-.3 4-1' },
  paralyzed:     { pt: 'Paralisado',   en: 'Paralyzed',     icon: 'M9 4h6v6h4v4h-4v6H9v-6H5v-4h4z' },
  petrified:     { pt: 'Petrificado',  en: 'Petrified',     icon: 'M3 18h18l-3-13H6z' },
  poisoned:      { pt: 'Envenenado',   en: 'Poisoned',      icon: 'M8 2v6c0 2-2 3-2 6a6 6 0 0012 0c0-3-2-4-2-6V2z' },
  prone:         { pt: 'Caído',        en: 'Prone',         icon: 'M3 18h18M5 14l4-9 6 9' },
  restrained:    { pt: 'Imobilizado',  en: 'Restrained',    icon: 'M4 4h16v4H4zM4 16h16v4H4zM7 8v8M17 8v8' },
  stunned:       { pt: 'Atordoado',    en: 'Stunned',       icon: 'M12 2v4M12 18v4M4 12H2M22 12h-2M5 5l3 3M19 5l-3 3M5 19l3-3M19 19l-3-3' },
  unconscious:   { pt: 'Inconsciente', en: 'Unconscious',   icon: 'M3 12h6l2-3 4 6 2-3h4' },
  exhaustion:    { pt: 'Exausto',      en: 'Exhausted',     icon: 'M7 12l3 3 7-7M12 2a10 10 0 100 20 10 10 0 000-20z' },
};

// Tela (a TV da mesa). Rota pública /tv/<token>, sem login.
//
// Quem manda é o PALCO (`stage`, regra única em src/stage/stage-now.js):
//   "A Tela mostra a última coisa que você mandou. ✕ tira e volta para o fundo:
//    o combate, se houver; senão, a capa."
// Modos (tv-logic.tvMode):
//   repouso — capa da campanha (ou arte padrão), nome, frase, cena e o grupo;
//   cartão  — cartão do Mundo: a carta entra virando;
//   recap   — "Anteriormente em…", estilo abertura de série;
//   cena    — imagem da sala + nome + texto para ler;
//   imagem  — "só a imagem" / imagem de sala / mapa de lugar: tela cheia,
//             inteira (contain), com a legenda do mestre — nunca o nome;
//   texto   — texto livre do mestre;
//   combate — grade + PV dos PJs (monstros só com faixa de saúde);
//   mapa    — o mapa do combate como fundo, sem a interface do combate;
//   escura  — ◐ preta com o emblema.
// Com combate, a frente cobre a TV e deixa a tarja do turno ("⚔ Rodada 2 · vez
// de Goblin #2"); "Guardar para depois do combate" a deixa esperando.
// Sem `stage` (servidor antigo), vale o cartão (screenMode), como antes.
// Tudo o que chega aqui já vem filtrado pelo backend (whitelist da Tela).
// Animações respeitam prefers-reduced-motion (CSS).
// "TV conectada" (V4): a TV de verdade pede com ?tv=1&c=<aba> (o servidor marca a
// aba no cache em memória; nenhuma escrita no banco) e avisa no
// BroadcastChannel `forja-tv-<campanha>` (o app do mestre no mesmo navegador
// conta sem servidor). A prévia do mestre (/tv/<t>?preview=1) não conta.
// TV em 16:9 (V9, especificação §5.7): o palco é uma caixa 16:9 com tarja preta
// (`.tv-frame` > `.tv-screen`, `container-type: size`); tudo dentro mede em
// cqw/cqh, então cabe igual em 1280×720, 1920×1080, num tablet em pé e na
// prévia do mestre (iframe). Ninguém rola a TV e nada é cortado: o texto longo
// (texto lido, recap, cartão, cena) e os nomes encolhem medindo a própria caixa
// (tv-fit.js, `data-fit`), até um piso legível e depois em 2 colunas; o teste é
// uma faixa que EMPURRA o resto, não cobre.
// Combate em 70/30: o mapa à esquerda e, à direita, "Vez de X" e a ordem de
// iniciativa (✓ agiu · ▶ a vez; até 10 + "+N"; PV dos PJs se o mestre deixa).
// Idioma: o da campanha (`lang` do /api/screen, o do mestre); sem ele, o do
// aparelho. Fotos e tokens por URL; a resposta igual à anterior não redesenha
// nada (e o mapa parado não redesenha o canvas).
// Rolagens (V10, roll-queue.js): o /api/screen traz a janela das rolagens públicas
// dos últimos 90 s pelo relógio do servidor (`rolls` + `now`, fora do ETag). Ao
// abrir, tudo é "visto" (nada reprisado); o que chega depois entra em FILA: o
// dado grande no centro (só com menos de 10 s; 8 s cada, 4 s com fila) e o resto
// no FEED do canto de baixo à esquerda (até 4 linhas, somem 12 s depois de chegar;
// o relógio delas para enquanto o dado grande as esconde). No feed, só o rótulo
// ganha reticências: o resultado fica sempre inteiro.
// Servidor antigo (sem `rolls`): a regra de antes (`publicRolls[0]`, < 20 s).
const IS_PREVIEW = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';
function tvTab() {
  try {
    let id = sessionStorage.getItem('forja:tv-tab');
    if (!id) { id = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('forja:tv-tab', id); }
    return id;
  } catch { return Math.random().toString(36).slice(2, 12); }
}
const TV_QUERY = IS_PREVIEW ? '?preview=1' : `?tv=1&c=${tvTab()}`;

export default function TVScreen({ token, lang: deviceLang = 'pt' }) {
  const [data, setData] = useState(null);
  const [card, setCard] = useState(null);
  const [stage, setStage] = useState(null);
  const [campaignLang, setCampaignLang] = useState(null);
  const [error, setError] = useState('');
  const lang = tvLang(campaignLang, deviceLang);
  const langRef = useRef(lang);
  langRef.current = lang;
  // Rolagens: a fila (dado grande + feed); `legacyRoll` é o dado de um servidor antigo.
  const [queue, setQueue] = useState(createQueue);
  const queueRef = useRef(queue);
  const [legacyRoll, setLegacyRoll] = useState(null);
  // Retratos dos monstros no combate (pelo nome do bestiário; carregado só em combate).
  const [foeIndex, setFoeIndex] = useState(null);
  const wantsFoeIndex = !!data?.combat?.active && needsNameIndex(data?.combat?.combatants);
  useEffect(() => {
    if (!wantsFoeIndex || foeIndex) return undefined;
    let alive = true;
    loadNameIndex().then(ix => { if (alive) setFoeIndex(ix); });
    return () => { alive = false; };
  }, [wantsFoeIndex, foeIndex]);
  const lastRollIdRef = useRef(null);
  // Link apagado/trocado (404): para de perguntar ao servidor e explica o que fazer.
  const [dead, setDead] = useState(false);
  const deadRef = useRef(false);
  // A mesma resposta de antes (304 parado): nada muda, nada redesenha.
  const sigRef = useRef('');

  const load = useCallback(async () => {
    if (deadRef.current) return;
    try {
      const res = await api.screen(token, TV_QUERY);
      if (!IS_PREVIEW && res.campaign?.id != null && typeof BroadcastChannel !== 'undefined') {
        try {
          const ch = new BroadcastChannel(`forja-tv-${res.campaign.id}`);
          ch.postMessage({ tab: TV_QUERY.slice(TV_QUERY.indexOf('c=') + 2) });
          ch.close();
        } catch { /* sem BroadcastChannel: só o servidor conta */ }
      }
      setError('');
      // `now` (a hora do servidor) muda a cada pedido: fica fora da comparação.
      const { now: serverNow, ...same } = res;
      const sig = JSON.stringify(same);
      if (sig === sigRef.current) return;
      sigRef.current = sig;
      setData(res.campaign);
      setCard(res.card ?? res.campaign?.card ?? null);
      setStage(res.stage ?? null);
      setCampaignLang(res.lang ?? null);
      if (Array.isArray(res.rolls)) {
        const q = ingest(queueRef.current, { rolls: res.rolls, now: serverNow }, Date.now());
        if (q !== queueRef.current) { queueRef.current = q; setQueue(q); }
        return;
      }
      // Servidor antigo: a rolagem pública mais nova, se fresca (< 20 s pelo relógio da TV)
      const newest = (res.campaign.publicRolls || [])[0];
      if (newest && newest.id !== lastRollIdRef.current) {
        if (newest.resolvedAt && (Date.now() - new Date(newest.resolvedAt).getTime()) < 20000) {
          lastRollIdRef.current = newest.id;
          setLegacyRoll({ ...newest, kind: 'request', who: newest.requester, crit: newest.isCritical, fail: newest.isCriticalFail });
        } else if (!lastRollIdRef.current) {
          lastRollIdRef.current = newest.id; // marca pra evitar trigger antigo
        }
      }
    } catch (e) {
      if (isDeadScreenLink(e)) { deadRef.current = true; setDead(true); return; }
      const l = langRef.current;
      setError(errorMessage(e, l, l === 'en' ? 'Could not load the screen.' : 'Falha ao carregar a Tela.'));
    }
  }, [token]);

  usePolling(load, 2000, [token]);

  // A fila anda: o dado grande dura 8 s (4 s com outra esperando; conta desde que
  // apareceu); o feed perde cada linha 12 s depois de chegar.
  const big = currentBig(queue) || legacyRoll;
  const busy = (queue.big?.length || 0) > 1;
  const bigShownAt = useRef(0);
  const advance = useCallback((id) => {
    if (legacyRoll && legacyRoll.id === id) { setLegacyRoll(null); return; }
    const q = nextBig(queueRef.current, id);
    if (q !== queueRef.current) { queueRef.current = q; setQueue(q); }
  }, [legacyRoll]);
  useEffect(() => {
    if (!big) return undefined;
    if (!bigShownAt.current) bigShownAt.current = Date.now();
    const left = bigShownAt.current + (legacyRoll ? 8000 : bigDuration(queue)) - Date.now();
    const id = setTimeout(() => { bigShownAt.current = 0; advance(big.id); }, Math.max(0, left));
    return () => clearTimeout(id);
  }, [big?.id, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const wait = feedNextExpiry(queue, Date.now());
    if (wait == null) return undefined;
    const id = setTimeout(() => {
      const q = pruneFeed(queueRef.current, Date.now());
      if (q !== queueRef.current) { queueRef.current = q; setQueue(q); }
    }, wait + 50);
    return () => clearTimeout(id);
  }, [queue]);

  // A Tela não tem menu: o título da aba ajuda a achar a janela certa.
  useEffect(() => {
    if (data?.name) document.title = `${data.name} · ${t(lang, 'Tela', 'Screen')}`;
  }, [data?.name, lang]);

  // Encaixe medido (tv-fit.js) depois de cada desenho, ao mudar o tamanho da janela e
  // quando as fontes terminam de carregar (Cinzel mais larga que a fonte de reserva).
  const screenRef = useRef(null);
  useLayoutEffect(() => { fitAll(screenRef.current); });
  useEffect(() => {
    const refit = () => fitAll(screenRef.current);
    window.addEventListener('resize', refit);
    document.fonts?.ready?.then(refit).catch(() => {});
    return () => window.removeEventListener('resize', refit);
  }, []);

  // A grade só muda quando o combate muda (o mesmo objeto enquanto a resposta é a mesma).
  const combat = data?.combat || null;
  const grid = useMemo(() => (combat ? gridCombat(combat) : null), [combat]);
  const mapGrid = useMemo(() => (combat ? { ...grid, active: false } : null), [grid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (dead) {
    return (
      <div className="tv-error tv-dead" role="alert">
        <div className="tv-dead-box">
          <div className="tv-dead-ico" aria-hidden="true">📺</div>
          <h1>{t(lang, 'Este link da Tela não vale mais', 'This screen link no longer works')}</h1>
          <p>{t(lang,
            'O mestre pode ter gerado um link novo. Peça a ele o link atual — fica em ⚙ Ajustes › Convite e Tela, em Jogar › Tela ou no botão 📺 Tela da campanha.',
            'The DM may have generated a new link. Ask them for the current one — it is under ⚙ Settings › Invite & screen, Play › Screen or the 📺 Screen button of the campaign.')}</p>
        </div>
      </div>
    );
  }
  if (error && !data) return <div className="tv-error"><h1>{error}</h1></div>;
  if (!data) return <div className="tv-loading"><h1>{t(lang, 'Carregando…', 'Loading…')}</h1></div>;

  const fighting = !!combat?.active;
  // O palco decide (stage-now); sem ele, a regra antiga do cartão.
  const stg = stage ? stageNow({ stage, combat: fighting ? { active: true, round: combat.round } : null }) : null;
  const mode = stg ? tvMode(stg) : screenMode({ combat, card });
  const front = stg?.mode === 'front' ? stg.front : null;
  const frontKey = `${front?.kind || ''}:${front?.entryId ?? ''}:${stage?.at || ''}`;
  const shown = !stg ? card
    : front?.kind === 'card' ? { type: 'entry', kind: front.entryKind, entryId: front.entryId, title: front.title,
      kindLabel: front.kindLabel, kindLabelEn: front.kindLabelEn, text: front.text, imageUrl: front.imageUrl, partial: front.partial }
      : front?.kind === 'recap' ? { type: 'recap', title: front.title, text: front.text } : null;
  const showKey = stg ? frontKey : cardKey(card);
  const inCombat = mode === 'combat';
  const dark = mode === 'dark';
  const test = dark ? null : (stage ? stage.overlays?.test : data.publicCheck) || null;
  const prefs = stage?.prefs || {};
  const state = data.state || {};
  const party = partyRow(data.members);
  const turn = turnNow(combat);
  const photos = new Map((data.members || []).filter(m => m.character).map(m => [m.character.id, m.character.avatar]));
  const portraitOf = (c) => (c.type === 'pc' ? apiUrl(photos.get(c.character_id)) : apiUrl(c.sprite) || portraitFor(c, foeIndex));
  // Frente por cima do combate: a tarja do turno no topo.
  const tarja = stg?.over ? (
    <div className="tv-turn-tarja" aria-live="polite">
      ⚔ {t(lang, 'Rodada', 'Round')} {combat.round}{turn?.name ? <> · {t(lang, 'vez de', 'turn of')} <strong>{turn.name}</strong></> : null}
    </div>
  ) : null;
  const nowName = splitNumbered(turn?.name);
  const coverUrl = absUrl(API_BASE, data.coverUrl) || HERO_ART;
  const accent = /^#[0-9a-f]{3,8}$/i.test(data.accent || '') ? data.accent : null;

  const pills = (
    <div className="tv-cover-pills">
      {state.live && <span className="tv-live"><span className="tv-live-dot" aria-hidden="true" />{t(lang, 'Ao vivo', 'Live')}</span>}
      {state.session && <span className="tv-session-pill">{t(lang, 'Sessão', 'Session')} {state.session}</span>}
      {state.weather && <span className="tv-weather">☁ {state.weather}</span>}
    </div>
  );
  const coverTop = tarja || (
    <header className="tv-cover-top">
      {pills}
      <Clock lang={lang} />
    </header>
  );
  const partyCols = party.shown.length + (party.more ? 1 : 0);
  const readSize = lengthClass(state.sceneText, [220, 520, 900]);
  const partyFooter = (compact) => (party.shown.length > 0 ? (
    <footer className={`tv-party ${compact ? 'is-compact' : ''} ${partyCols >= 5 ? 'is-dense' : ''}`} style={{ '--n': partyCols }}>
      {party.shown.map(m => <CharCard key={m.id} member={m} lang={lang} compact={compact} dense={partyCols >= 5} />)}
      {party.more > 0 && <div className="tv-party-more" aria-label={t(lang, `mais ${party.more}`, `${party.more} more`)}>+{party.more}</div>}
    </footer>
  ) : null);

  return (
    <div className="tv-frame">
      <div
        ref={screenRef}
        className={`tv-screen tv-mode-${mode} ${big && !dark ? 'has-roll-overlay' : ''} ${stg?.over ? 'is-over-combat' : ''} ${test ? 'has-test' : ''}`}
        style={accent ? { '--tv-accent': accent } : undefined}
        lang={lang}
      >
        {!inCombat && !dark && mode !== 'map' && <TVBackdrop url={coverUrl} dim={mode !== 'rest'} recap={mode === 'recap'} />}

        <div className="tv-canvas">
          {dark ? (
            <main className="tv-dark" aria-label={t(lang, 'Tela escurecida', 'Screen blacked out')}>
              <span className="tv-dark-emblem" aria-hidden="true">✦</span>
            </main>
          ) : inCombat ? (
            <>
              <header className="tv-header">
                <h1 className="tv-title">{data.name}</h1>
                {state.scene && <span className="tv-scene" data-fit="0.75">{state.scene}</span>}
                <div className="tv-meta">
                  {pills}
                  <span className="tv-combat-pill">⚔ {t(lang, 'Rodada', 'Round')} {combat.round}</span>
                  <Clock lang={lang} />
                </div>
              </header>
              <main className="tv-combat-main">
                <div className="tv-grid-container">
                  <CombatGrid combat={grid} readOnly={true} lang={lang} />
                </div>
                <aside className="tv-combat-side">
                  {turn?.name && (
                    <div className="tv-now-acting" aria-live="polite">
                      <span className="tv-now-label">{t(lang, 'Vez de', 'Now acting')}</span>
                      <span className="tv-now-name" data-fit="0.6">
                        {nowName.base}{nowName.num && <span className="tv-name-num"> {nowName.num}</span>}
                      </span>
                    </div>
                  )}
                  {!stg && card && card.type === 'entry' && <TVMiniCard card={card} lang={lang} />}
                  <InitiativeOrder combat={combat} party={prefs.party !== false} order={prefs.initiative !== false}
                    portraitOf={portraitOf} lang={lang} />
                </aside>
              </main>
            </>
          ) : mode === 'map' ? (
            <main className="tv-map-only">
              {combat?.map?.backgroundUrl || (combat?.combatants || []).length
                ? <div className="tv-grid-container"><CombatGrid combat={mapGrid} readOnly={true} lang={lang} /></div>
                : <div className="tv-map-empty">{data.name}</div>}
            </main>
          ) : mode === 'recap' ? (
            <>
              {tarja}
              <TVRecap key={showKey} card={shown} campaign={data} lang={lang} />
            </>
          ) : mode === 'image' ? (
            <TVImageFront key={showKey} front={front} tarja={tarja} />
          ) : mode === 'scene' ? (
            <>
              {coverTop}
              <TVSceneFront key={showKey} front={front} lang={lang} />
            </>
          ) : mode === 'text' ? (
            <>
              {coverTop}
              <TVTextFront key={showKey} front={front} />
            </>
          ) : mode === 'card' ? (
            <>
              {coverTop}
              <main className="tv-stage">
                <div className="tv-stage-campaign">{data.name}</div>
                <TVCard key={showKey} card={shown} lang={lang} />
              </main>
              {partyFooter(true)}
            </>
          ) : (
            <>
              {coverTop}
              <main className={`tv-cover ${readSize}`}>
                <div className="tv-cover-ornament" aria-hidden="true">✦</div>
                <h1 className="tv-cover-title">{data.name}</h1>
                {data.tagline && <p className="tv-cover-tagline">{data.tagline}</p>}
                {state.scene && (
                  <div className="tv-cover-scene">
                    {/* fora da sessão (encerrada), a cena é a de onde o grupo parou, não a de agora */}
                    <span className="tv-cover-eyebrow">{state.live === false ? t(lang, 'Da última vez', 'Last time') : t(lang, 'Agora', 'Now')}</span>
                    <span className="tv-cover-scene-name">{state.scene}</span>
                  </div>
                )}
                {state.sceneText && <section className="tv-read-aloud" aria-live="polite" data-fit="0.5" data-fit-cols="2">{state.sceneText}</section>}
              </main>
              {/* texto lido muito longo tem prioridade: o grupo fica nos cartões compactos */}
              {partyFooter(readSize === 'is-xlong')}
            </>
          )}

          {/* O teste é uma faixa no fim da coluna: empurra o resto, não cobre o grupo. */}
          {test && <CheckScreenPanel check={test} lang={lang} />}
        </div>

        {error && <div className="tv-offline" role="status">{t(lang, 'Reconectando…', 'Reconnecting…')}</div>}

        {/* Feed: as rolagens pequenas no canto (texto de verdade; crítico com filete dourado) */}
        {!dark && queue.feed.length > 0 && <RollFeed rolls={queue.feed} lang={lang} />}
        {/* O dado grande — um por vez, em fila */}
        {big && !dark && (
          <DramaticRollOverlay key={big.id} roll={big} lang={lang} quick={busy}
            onDone={() => { bigShownAt.current = 0; advance(big.id); }} />
        )}
      </div>
    </div>
  );
}

/** O relógio da Tela (o próprio intervalo: o resto da TV não redesenha a cada segundo). */
function Clock({ lang }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="tv-clock">{now.toLocaleTimeString(lang === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</div>;
}

/**
 * A coluna da direita do combate (T1): a ordem de iniciativa — ✓ agiu · ▶ a vez ·
 * o resto; até 10 + "+N". Cada linha: retrato, nome, PV do PJ (se o mestre deixa)
 * ou a faixa de saúde, e as condições. Sem a ordem (`order` false, preferência do
 * mestre): PJs e depois monstros, sem ✓/▶.
 */
function InitiativeOrder({ combat, party, order, portraitOf, lang }) {
  const { rows, more } = initiativeRows(combat, { max: 10, party, order });
  const byId = new Map((combat.combatants || []).map(c => [c.id, c]));
  return (
    <ol className={`tv-order ${order ? '' : 'is-plain'}`} aria-label={order ? t(lang, 'Ordem de iniciativa', 'Initiative order') : t(lang, 'No combate', 'In combat')}
      style={{ '--rows': rows.length + (more ? 1 : 0) }}>
      {rows.map(r => (
        <li key={r.id} className={`tv-order-row is-${r.state} is-${r.kind} ${r.down ? 'is-down' : ''}`} aria-current={r.state === 'now' ? 'true' : undefined}>
          <span className="tv-order-mark" aria-hidden="true">{r.mark}</span>
          <ArtThumb src={portraitOf(byId.get(r.id) || {})} emoji={r.kind === 'pc' ? (r.name || '?').charAt(0).toUpperCase() : '👹'} size={36} round lang={lang} className="tv-order-pic" />
          <OrderName name={r.name} />
          {r.hp ? (
            <span className={`tv-order-hp tv-hp-bar tv-hp-${hpToneTv(r.hp.cur, r.hp.max)}`}>
              <span className="tv-hp-fill" style={{ width: `${hpPctTv(r.hp.cur, r.hp.max)}%` }} />
              <span className="tv-hp-text">{r.down ? healthLabel('down', lang) : `${r.hp.cur}/${r.hp.max ?? '?'}`}{r.hp.temp ? <span className="tv-hp-temp"> +{r.hp.temp}</span> : null}</span>
            </span>
          ) : (
            <span className={`tv-order-band tv-foe-${r.band}`}>{healthLabel(r.band, lang)}</span>
          )}
          {r.conditions.length > 0 && <Conditions list={r.conditions} max={2} lang={lang} className="tv-order-conds" />}
        </li>
      ))}
      {more > 0 && <li className="tv-order-row is-more">+{more}</li>}
    </ol>
  );
}

/** Nome na ordem: o " #N" do monstro sempre à vista; as reticências só no nome. */
function OrderName({ name }) {
  const { base, num } = splitNumbered(name);
  return (
    <span className="tv-order-name">
      <span className="tv-name-base" data-fit="0.7">{base}</span>
      {num && <span className="tv-name-num">{num}</span>}
    </span>
  );
}

const hpPctTv = (cur, max) => (max ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0);
const hpToneTv = (cur, max) => { const p = hpPctTv(cur, max); return p > 60 ? 'ok' : p > 30 ? 'warn' : 'crit'; };

/** "Só a imagem", imagem de sala ou mapa de lugar: a imagem inteira, com a legenda do mestre. */
function TVImageFront({ front, tarja }) {
  const img = absUrl(API_BASE, front?.imageUrl);
  const [ok, setOk] = useState(true);
  return (
    <main className={`tv-front-image ${front?.map ? 'is-map' : ''}`}>
      {tarja}
      <div className="tv-front-image-box">
        {img && ok ? <img src={img} alt="" onError={() => setOk(false)} /> : <span className="tv-dark-emblem" aria-hidden="true">✦</span>}
      </div>
      {front?.caption && <p className="tv-front-caption">{front.caption}</p>}
    </main>
  );
}

/** Cena: imagem da sala à esquerda (40%) + nome + texto para ler. */
function TVSceneFront({ front, lang }) {
  const img = absUrl(API_BASE, front?.imageUrl);
  const [ok, setOk] = useState(true);
  const text = front?.text || '';
  const size = lengthClass(text, [350, 700]);
  return (
    <main className={`tv-scene-front ${img && ok ? 'has-img' : ''} ${size}`} aria-live="polite">
      {img && ok && <div className="tv-scene-art"><img src={img} alt="" onError={() => setOk(false)} /></div>}
      <div className="tv-scene-body">
        <div className="tv-card-kind">{t(lang, 'Cena', 'Scene')}</div>
        <h1 className="tv-scene-title">{front?.title}</h1>
        {text && <div className="tv-scene-text" data-fit="0.5" data-fit-cols="2">{paragraphs(text).map((p, i) => <p key={i}>{p}</p>)}</div>}
      </div>
    </main>
  );
}

/** Texto livre do mestre, grande e centrado. */
function TVTextFront({ front }) {
  const text = front?.text || '';
  const size = lengthClass(text, [200, 500]);
  return (
    <main className={`tv-text-front ${size}`} aria-live="polite" data-fit="0.4" data-fit-cols="1">
      {paragraphs(text).map((p, i) => <p key={i}>{p}</p>)}
    </main>
  );
}

// Grade do combate na Tela: fundo pela URL cacheável (não reprocessa o base64
// a cada poll) e barra dos monstros pela faixa de saúde (sem PV real).
const BAND_PCT = { unhurt: 100, hurt: 75, bloodied: 35, down: 0 };
function gridCombat(combat) {
  const map = combat.map || {};
  const bg = map.backgroundUrl ? absUrl(API_BASE, map.backgroundUrl) : map.background_image;
  return {
    ...combat,
    map: { ...map, background_image: bg || null },
    combatants: (combat.combatants || []).map(c => (c.type === 'pc' || c.stats?.max_hp
      ? c
      : { ...c, current_hp: BAND_PCT[c.health] ?? 100, stats: { ...(c.stats || {}), max_hp: 100 } })),
  };
}

function TVBackdrop({ url, dim, recap }) {
  return (
    <div className={`tv-backdrop ${dim ? 'is-dim' : ''} ${recap ? 'is-recap' : ''}`} aria-hidden="true">
      <img src={url} alt="" onError={(e) => { if (!e.currentTarget.src.endsWith(HERO_ART)) e.currentTarget.src = HERO_ART; }} />
    </div>
  );
}

function cardKindLabel(card, lang) {
  return (lang === 'pt' ? card.kindLabel : card.kindLabelEn) || card.kindLabel || '';
}

/** A carta "virada" no centro da Tela. */
function TVCard({ card, lang }) {
  const img = absUrl(API_BASE, card.imageUrl);
  const [imgOk, setImgOk] = useState(true);
  const paras = paragraphs(card.text);
  const isPartial = !!card.partial;
  return (
    <article className={`tv-card tv-card-${card.kind || card.type} ${isPartial ? 'is-partial' : ''} ${(img && imgOk) || card.type === 'entry' ? 'has-img' : 'no-img'} ${lengthClass(card.title, [28, 48])} ${String(card.text || '').length > 900 ? 'is-text-long' : ''}`} aria-live="polite">
      <div className="tv-card-inner">
        <div className="tv-card-back" aria-hidden="true"><span>✦</span></div>
        <div className="tv-card-front">
          {img && imgOk ? (
            <div className="tv-card-art"><img src={img} alt="" onError={() => setImgOk(false)} /></div>
          ) : card.type === 'entry' ? (
            <div className="tv-card-art is-default"><img src={defaultArt({ id: card.entryId, kind: card.kind })} alt="" onError={hideOnError} /></div>
          ) : (
            <div className="tv-card-emblem" aria-hidden="true">🎭</div>
          )}
          <div className="tv-card-body">
            <div className="tv-card-kind">{cardKindLabel(card, lang)}</div>
            <h2 className="tv-card-title">{card.title}</h2>
            {isPartial && <div className="tv-card-rumor">{t(lang, 'Rumores…', 'Rumors…')}</div>}
            <div className="tv-card-text" data-fit="0.5" data-fit-cols="2">
              {paras.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Versão pequena do cartão durante o combate (canto da tela). */
function TVMiniCard({ card, lang }) {
  // Sem imagem própria, o cartão do mundo usa a mesma arte padrão da prévia do mestre.
  const fallback = card.type === 'entry' ? defaultArt({ kind: card.kind, id: card.entryId }) : null;
  const img = absUrl(API_BASE, card.imageUrl) || fallback;
  return (
    <div className="tv-mini-card" key={cardKey(card)}>
      {img && <img src={img} alt="" onError={(e) => {
        if (fallback && !e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; else hideOnError(e);
      }} />}
      <div>
        <div className="tv-card-kind">{cardKindLabel(card, lang)}</div>
        <div className="tv-mini-title">{card.title}</div>
      </div>
    </div>
  );
}

/** "Anteriormente em…": tarjas de cinema, título e parágrafos que surgem um a um. */
function TVRecap({ card, campaign, lang }) {
  const paras = paragraphs(card.text);
  // Longo: o título encolhe; a letra do texto e as colunas vêm do encaixe medido (tv-fit.js).
  const size = lengthClass(card.text, [450, 900, 1800]);
  const subtitle = recapSubtitle(card.title, campaign.name);
  return (
    <main className={`tv-recap ${size}`} aria-live="polite">
      <div className="tv-recap-bar top" aria-hidden="true" />
      <div className="tv-recap-content">
        <div className="tv-recap-eyebrow">{t(lang, 'Anteriormente em', 'Previously on')}</div>
        <h1 className="tv-recap-campaign">{campaign.name}</h1>
        {subtitle && <h2 className="tv-recap-title">{subtitle}</h2>}
        <div className="tv-recap-text" data-fit="0.45" data-fit-cols="3">
          {paras.map((p, i) => <p key={i} style={{ '--i': i }}>{p}</p>)}
        </div>
      </div>
      <div className="tv-recap-bar bottom" aria-hidden="true" />
    </main>
  );
}

function CharCard({ member, lang, isActiveTurn, compact = false, dense = false }) {
  const c = member.character;
  const hpPct = c.maxHp ? Math.max(0, Math.min(100, (c.currentHp / c.maxHp) * 100)) : 0;
  const tone = hpPct > 60 ? 'ok' : hpPct > 30 ? 'warn' : 'crit';
  const dead = c.currentHp != null && c.currentHp <= 0;
  const line = charLine(c, lang);
  const photo = apiUrl(c.avatar);
  return (
    <article className={`tv-char-card ${compact ? 'is-compact' : ''} ${dense ? 'is-dense' : ''} ${isActiveTurn ? 'is-active-turn' : ''} ${dead ? 'is-dead' : ''}`}>
      <div className="tv-char-head">
        {photo
          ? <img src={photo} alt="" className="tv-avatar" />
          : <div className="tv-avatar tv-avatar-placeholder">{(c.name || '?').slice(0, 1).toUpperCase()}</div>}
        {/* nome em até 2 linhas sem partir palavra; a letra encolhe (tv-fit) antes de usar a 3ª */}
        <div className="tv-char-name" data-fit="0.7">{c.name}</div>
        {c.inspiration && <div className="tv-inspiration" aria-label={t(lang, 'Inspiração', 'Inspiration')}>★</div>}
      </div>
      {!compact && <div className="tv-char-sub" data-fit="0.8">{line}</div>}
      {!compact && member.user?.displayName && <div className="tv-char-player" data-fit="0.8">{member.user.displayName}</div>}
      <div className={`tv-hp-bar tv-hp-${tone}`} role="meter" aria-label={t(lang, 'Pontos de vida', 'Hit points')} aria-valuenow={c.currentHp} aria-valuemin={0} aria-valuemax={c.maxHp}>
        <div className="tv-hp-fill" style={{ width: `${hpPct}%` }} />
        <div className="tv-hp-text">
          {c.currentHp} / {c.maxHp ?? '?'}{c.tempHp ? <span className="tv-hp-temp"> (+{c.tempHp})</span> : null} {t(lang, 'PV', 'HP')}
        </div>
      </div>
      {!compact && (
        <div className="tv-stats">
          <div className="tv-stat-block"><span className="lbl">{t(lang, 'CA', 'AC')}</span> <span className="val">{c.armorClass ?? '—'}</span></div>
          <div className="tv-stat-block"><span className="lbl">{t(lang, 'Desl.', 'Speed')}</span> <span className="val">{c.speed ?? 30}</span></div>
          {c.deathSaves && (c.deathSaves.success + c.deathSaves.fail > 0) && (
            <div className="tv-stat-block tv-death">
              <span className="lbl">{t(lang, 'Morte', 'Death')}</span>
              <span className="val">
                <span className="tv-death-succ">{'✓'.repeat(c.deathSaves.success)}</span>
                <span className="tv-death-fail">{'✗'.repeat(c.deathSaves.fail)}</span>
              </span>
            </div>
          )}
        </div>
      )}
      {c.conditions?.length > 0 && (
        <Conditions list={c.conditions} max={compact || dense ? 1 : 2} lang={lang} className={`tv-conditions ${compact ? 'tiny' : ''}`} />
      )}
    </article>
  );
}

/** Condições em uma linha: ícone + nome das `max` primeiras e "+N" com as outras (nenhuma some sem aviso). */
function Conditions({ list, max, lang, className }) {
  const { shown, more, rest } = conditionsShown(list, max);
  const names = rest.map(c => CONDITIONS[c]?.[lang] || c).join(', ');
  return (
    <span className={className}>
      {shown.map(cond => <ConditionChip key={cond} cond={cond} lang={lang} />)}
      {more > 0 && <span className="tv-condition is-more" aria-label={t(lang, `mais ${more}: ${names}`, `${more} more: ${names}`)}>+{more}</span>}
    </span>
  );
}

// Condição sempre com ícone e nome (nunca só o ícone; §1.4).
function ConditionChip({ cond, lang }) {
  const def = CONDITIONS[cond];
  if (!def) return <span className="tv-condition">{cond}</span>;
  return (
    <span className="tv-condition">
      {conditionIcon(cond) ? <ArtIcon src={conditionIcon(cond)} size={22} className="tv-cond-icon" /> : (
        <svg className="tv-cond-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d={def.icon} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="tv-cond-label">{def[lang]}</span>
    </span>
  );
}

const ROLL_LABELS = (lang) => ({ damageLabel: (ty) => damageTypeLabel(ty, lang), abilityLabel: (a) => abilityLabel(a, lang) });

/**
 * O feed (V10): até 4 linhas pequenas no canto de baixo à esquerda. O rótulo (quem e
 * o quê) vai até 2 linhas com reticências; o resultado (total, "ACERTA · 6 cortante",
 * os alvos da salvaguarda) nunca é cortado.
 */
function RollFeed({ rolls, lang }) {
  const labels = ROLL_LABELS(lang);
  return (
    <ul className="tv-roll-feed" aria-label={t(lang, 'Rolagens', 'Rolls')} aria-live="polite">
      {rolls.map(r => {
        const { head, tail } = rollParts(r, lang, labels);
        return (
          <li key={r.id} className={`tv-feed-item ${r.kind === 'save' ? 'is-save' : ''} ${r.crit ? 'is-crit' : ''} ${r.fail ? 'is-fail' : ''}`}>
            <span className="tv-feed-ico" aria-hidden="true">🎲</span>
            <span className="tv-feed-text">{head}</span>
            {tail && <span className="tv-feed-res">{tail}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** O alvo da salvaguarda: o nome pode quebrar a linha, o " #N" do monstro nunca se separa. */
function SaveName({ name }) {
  const { base, num } = splitNumbered(name);
  return (
    <span className="tv-roll-save-name">{base}{num && <> <span className="tv-name-num">{num}</span></>}</span>
  );
}

/**
 * O dado grande: quem rolou, o quê, o dado 3D (three.js, sob demanda) que para no
 * valor do servidor (sem WebGL / com movimento reduzido cai no 2D) e o total.
 * Ataque de monstro: só o d20 natural (sem o bônus) e "ACERTA · 6 cortante".
 * Salvaguarda em área: o resumo por alvo (sem dados: o d20 entregaria o bônus).
 */
function DramaticRollOverlay({ roll, lang, onDone, quick = false }) {
  const isSave = roll.kind === 'save';
  const groups = rollGroups(roll);
  const [phase, setPhase] = useState(isSave || !groups.length ? 'reveal' : 'rolling'); // 'rolling' → 'reveal'
  // Segurança: revela mesmo se a animação falhar/demorar (mais cedo com fila).
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'), quick ? 2500 : 3500);
    return () => clearTimeout(t1);
  }, [quick]);
  const labels = ROLL_LABELS(lang);
  const sub = roll.kind === 'monster' ? `⚔ ${roll.label || ''}` : isSave ? saveHead(roll, lang, labels) : (roll.label || roll.diceType);
  const kept = groups.flatMap(g => g.rolls.filter(r => r.kept).map(r => ({ ...r, sign: g.sign })));

  // Brilho dourado/vermelho do crítico/falha só na revelação: antes entregaria o resultado.
  const revealed = phase === 'reveal';
  return (
    <div className={`tv-roll-overlay phase-${phase} ${revealed && roll.crit ? 'crit' : ''} ${revealed && roll.fail ? 'fail' : ''} ${isSave ? 'is-save' : ''}`} onClick={onDone}>
      <div className="tv-roll-inner">
        <div className="tv-roll-who">{rollWho(roll, lang)}</div>
        <div className="tv-roll-label">{sub}</div>
        {isSave ? (
          <ul className={`tv-roll-saves ${(roll.targets || []).length > 9 ? 'is-many' : ''}`}>
            {(roll.targets || []).map((x, i) => (
              <li key={i} className={x.ok ? 'is-pass' : 'is-fail'}>
                <SaveName name={x.who} />
                <span className="tv-roll-save-res">
                  <span className="tv-roll-save-total">{x.total ?? '—'}</span>
                  <span className="tv-roll-save-mark">{x.ok ? `✓ ${t(lang, 'passou', 'saved')}` : `✗ ${t(lang, 'falhou', 'failed')}`}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : groups.length > 0 && (
          <DiceStage
            groups={groups}
            tone={roll.crit ? 'crit' : roll.fail ? 'fumble' : null}
            className="tv-dice-stage"
            size2d={140}
            onSettled={() => setPhase('reveal')}
          />
        )}
        {revealed && !isSave && (
          <div className="tv-roll-dice">
            <div className="tv-roll-numbers">
              {kept.map((r, i) => (
                <span key={i} className="tv-die-result">{r.sign < 0 ? '−' : ''}{r.value}</span>
              ))}
              {showsSum(roll) && (
                <>
                  {roll.modifier !== 0 && <span className="tv-roll-mod">{roll.modifier >= 0 ? '+' : ''}{roll.modifier}</span>}
                  <span className="tv-roll-equals">=</span>
                  <span className="tv-roll-total">{roll.total}</span>
                </>
              )}
            </div>
          </div>
        )}
        {revealed && roll.kind === 'monster' && <div className={`tv-roll-tag ${roll.hit ? 'tv-hit-tag' : 'tv-miss-tag'}`}>{attackOutcome(roll, lang, labels)}</div>}
        {revealed && roll.kind !== 'monster' && roll.crit && <div className="tv-roll-tag tv-crit-tag">⚔ {t(lang, 'CRÍTICO', 'CRITICAL')}</div>}
        {revealed && roll.kind !== 'monster' && roll.fail && <div className="tv-roll-tag tv-fail-tag">💀 {t(lang, 'FALHA CRÍTICA', 'FUMBLE')}</div>}
      </div>
    </div>
  );
}

/** Resultado de um pedido de teste que o mestre escolheu mostrar na Tela (CD secreta: sem ✓/✗). */
function CheckScreenPanel({ check, lang }) {
  const done = check.results.filter(r => r.total != null).length;
  return (
    <section className="tv-check-panel" aria-live="polite">
      <header className="tv-check-head">
        <span className="tv-check-eyebrow">🎯 {t(lang, 'Teste', 'Check')}</span>
        <span className="tv-check-label">{check.label}</span>
        <span className="tv-check-sub">
          {check.dc != null && <span className="tv-check-dc">{t(lang, 'CD', 'DC')} {check.dc}</span>}
          <span className="tv-check-count">{done}/{check.results.length}</span>
        </span>
      </header>
      <ul className="tv-check-list">
        {check.results.map((r, i) => (
          <li key={i} className={`tv-check-item ${r.outcome || (r.total == null ? 'waiting' : 'answered')}`}>
            <span className="tv-check-name" data-fit="0.75">{r.name}</span>
            <span className="tv-check-total">{r.total == null ? '…' : r.total}</span>
            {r.outcome && <span className="tv-check-mark">{r.outcome === 'pass' ? '✓' : '✗'}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
