// Mesa do jogador (WP5): o que está acontecendo agora.
//
//   - cena: sessão, "Ao vivo", nome da cena, clima e o texto lido pelo mestre;
//   - "Na tela agora": a mesma regra da TV (src/stage/stage-now.js, sobre o palco
//     público): no combate diz "⚔ Combate · rodada N" e mostra a frente que estiver
//     por cima; "só a imagem" aparece sem o nome e sem "Ver no Mundo";
//   - testes que o mestre pediu (rolar no app OU digitar o dado físico);
//   - rolador de dados (sem aviso de valores pré-definidos) e "pedir ao mestre";
//   - faixa do combate (V13): "Vez de Goblin #2 / Rodada 2 · depois: você"; na vez
//     dele, "SUA VEZ" dourado e [Ir para a minha ficha].
// Com o pulso do jogador (V13, usePlayerPulse): a faixa sai dele, a lista de testes só
// é buscada quando o `checksRev` muda e os pedidos ao mestre quando o `rollsRev` muda.
// Sem ele (servidor antigo): testes a cada 3 s e pedidos a cada 3 s, como antes, sem faixa.
//
// Props: campaign (GET da campanha, visão do jogador), lang, onChange?, onOpenSheet?(id).
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, API_BASE } from '../api/client.js';
import { usePolling } from '../api/polling.js';
import { errorMessage } from '../api/errors.js';
import { HERO_ART } from '../art.js';
import useArea from '../shell/useArea.js';
import { defaultCoverArt } from '../shell/shell-logic.js';
import MesaTitle from '../shell/MesaTitle.jsx';
import { HpBar, PcBadges, PcPortrait } from '../shell/MesaPc.jsx';
import '../shell/mesa.css';
import '../campaigns/combat-styles.css';   // o desenho do retrato e da barra de PV (bloco "MesaPc")
import { charLine, memberStats } from '../group/group-model.js';
import CheckRequestCard from '../checks/CheckRequestCard.jsx';
import '../checks/checks-styles.css';
import { worldImageUrl } from '../world/world-api.js';
import { defaultArt } from '../world/world-model.js';
import { FrontIcon, WeatherIcon } from './PlayerIcons.jsx';
import { absUrl, combatStrip, L, paragraphs, turnJustStarted } from './player-model.js';
import { playerScreen } from '../stage/stage-now.js';
import { useOnRev, usePlayerPulse } from '../play/table-store.js';
import { quietSlot } from '../play/damage-model.js';
import './player-styles.css';

const DICE = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'];
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');
const CHECK_HOLD_MS = 8000;   // o teste recém-respondido segura o painel de Testes no topo (celular)

export default function PlayerTable({ campaign, lang = 'pt', onOpenWorld, onOpenSheet }) {
  const area = useArea();
  const pp = usePlayerPulse();
  const pulse = pp?.enabled ? pp.pulse : null;
  const state = campaign.state || {};
  const card = campaign.screenCard;
  // a mesma capa do cabeçalho da campanha (CampaignHeader): a do mestre, ou a arte padrão da mesa
  const coverFallback = defaultCoverArt(campaign) || HERO_ART;
  const cover = absUrl(API_BASE, campaign.coverUrl) || coverFallback;
  // os personagens da pessoa nesta mesa (só os dela chegam com a ficha inteira)
  const mine = (campaign.members || []).filter(m => m.character?.data);
  const me = mine[0];
  const char = me?.character?.data ? { ...me.character.data, id: me.character.id } : null;
  const openWorld = (entryId) => {
    if (onOpenWorld) onOpenWorld(entryId);
    else area?.goTo?.('world', 'atlas', entryId ? { entryId } : {});
  };
  // Teste aberto: no celular ele sobe para o topo da Mesa (acima da cena), para o
  // "Rolar no app" ficar à vista sem rolar. Só a ordem muda (CSS): nada remonta.
  // Conta também o teste que a pessoa ACABOU de responder (ChecksSection segura por 8 s):
  // antes o painel descia 360 px no instante do toque e o resultado ia parar fora da tela.
  const [openChecks, setOpenChecks] = useState(0);

  return (
    <div className={`pl-table${openChecks > 0 ? ' has-open-check' : ''}`}>
      <CombatStrip ready={!!pulse} combat={pulse?.combat} lang={lang}
        onOpenSheet={char && onOpenSheet ? () => onOpenSheet(char.id) : null} />

      <div className="pl-col pl-col-main">
        <MyCharacters members={mine} lang={lang} onOpenSheet={onOpenSheet}
          onGroup={area?.goTo ? () => area.goTo('group') : null} />

        <section className={`pl-scene${state.sceneText ? ' has-text' : ''}`} style={{ '--pl-cover': `url("${cover}")`, '--pl-cover-fallback': `url("${coverFallback}")` }}
          aria-label={L(lang, 'Cena', 'Scene')}>
          <div className="pl-scene-bg" aria-hidden="true" />
          <div className="pl-scene-content">
            {/* "Ao vivo", a sessão e o nome da campanha já estão no cabeçalho da casca: aqui só o clima */}
            <div className="pl-scene-top">
              <span className="pl-scene-eyebrow">{state.scene
                ? (state.live === false ? L(lang, 'Onde paramos', 'Where we left off') : L(lang, 'Cena', 'Scene'))
                : L(lang, 'A mesa', 'The table')}</span>
              {state.weather && (
                <span className="pl-pill pl-pill-soft">
                  <WeatherIcon className="pl-ico" />
                  <span className="sr-only">{L(lang, 'Clima: ', 'Weather: ')}</span>{state.weather}
                </span>
              )}
            </div>
            <h2 className="pl-scene-name">
              {state.scene || (state.live ? L(lang, 'A aventura continua…', 'The adventure goes on…') : L(lang, 'Entre uma sessão e outra', 'Between sessions'))}
            </h2>
            {!state.scene && !state.live && campaign.tagline && <p className="pl-scene-tagline">{campaign.tagline}</p>}
            {state.sceneText && (
              <blockquote className="pl-read-aloud">
                {paragraphs(state.sceneText).map((p, i) => <p key={i}>{p}</p>)}
              </blockquote>
            )}
          </div>
        </section>

        {campaign.stage
          ? <OnScreenNow now={playerScreen({ stage: campaign.stage, combat: campaign.combatNow, lang })} lang={lang} onOpen={openWorld} />
          : card && <OnScreenNow now={legacyNow(card, lang)} lang={lang} onOpen={openWorld} />}
      </div>

      <div className="pl-col pl-col-side">
        <ChecksSection campaign={campaign} char={char} lang={lang} onOpenCount={setOpenChecks} />

        <DiceSection campaign={campaign} lang={lang} />
      </div>
    </div>
  );
}

/**
 * "Meu personagem": quem eu sou nesta mesa, com a vida à vista e a porta para a ficha
 * (antes só havia [Ir para a minha ficha] na vez do combate). Um por linha quando a
 * pessoa senta mais de um personagem na mesma mesa. Sem personagem: diz isso e leva
 * ao Grupo, onde se escolhe um.
 */
function MyCharacters({ members, lang, onOpenSheet, onGroup }) {
  if (!members.length) {
    return (
      <section className="mesa-panel pl-me is-empty" aria-label={L(lang, 'Meu personagem', 'My character')}>
        <div className="pl-me-row">
          <span className="mesa-pc-pic is-initial pl-me-pic" style={{ '--pc-pic': '48px' }} aria-hidden="true">?</span>
          <div className="pl-me-main">
            <strong className="pl-me-name">{L(lang, 'Você está sem personagem nesta mesa', 'You have no character at this table')}</strong>
            <span className="pl-me-sub">{L(lang, 'Escolha uma ficha no Grupo para rolar com os bônus dela.', 'Pick a sheet in Party to roll with its bonuses.')}</span>
          </div>
          {onGroup && (
            <button type="button" className="mesa-btn pl-me-open" onClick={onGroup}>{L(lang, 'Ir para o Grupo', 'Go to Party')}</button>
          )}
        </div>
      </section>
    );
  }
  return (
    <section className="mesa-panel pl-me" aria-label={members.length > 1 ? L(lang, 'Meus personagens', 'My characters') : L(lang, 'Meu personagem', 'My character')}>
      {members.map(m => {
        const stats = memberStats(m);
        const c = m.character;
        const name = c.name || L(lang, 'Sem nome', 'Unnamed');
        const line = charLine(c.summary || c.data, lang);
        return (
          <div key={m.id ?? c.id} className="pl-me-row">
            <PcPortrait stats={stats} name={name} size={48} className="pl-me-pic" />
            <div className="pl-me-main">
              <strong className="pl-me-name">{name}</strong>
              {line && <span className="pl-me-sub">{line}</span>}
              <div className="pl-me-vitals">
                <HpBar hp={stats.hp} max={stats.maxHp} temp={stats.tempHp} lang={lang} units className="pl-me-hp" />
                {stats.ac != null && (
                  <span className="pl-me-stat" title={L(lang, 'Classe de Armadura', 'Armor Class')}>
                    <span className="pl-me-stat-lbl">{L(lang, 'CA', 'AC')}</span>
                    <span className="pl-me-stat-val">{stats.ac}</span>
                  </span>
                )}
              </div>
            </div>
            {onOpenSheet && (
              <button type="button" className="mesa-btn is-primary pl-me-open" onClick={() => onOpenSheet(c.id)}
                aria-label={L(lang, `Abrir ficha de ${name}`, `Open sheet: ${name}`)}>
                {L(lang, 'Abrir ficha', 'Open sheet')}
              </button>
            )}
            <PcBadges stats={stats} lang={lang} className="pl-me-badges" />
          </div>
        );
      })}
    </section>
  );
}

/**
 * Faixa do combate (V13, especificação §8.3), do pulso do jogador: "Vez de Goblin #2" /
 * "Rodada 2 · depois: você". Na vez dele: "SUA VEZ" dourado e [Ir para a minha ficha]
 * (a ficha abre com o painel de combate no topo); vibra 1 vez quando a vez chega (abrir
 * a Mesa já na vez dele não vibra). Altura fixa nos dois estados: a troca não empurra
 * nada. No celular fica presa no topo ao rolar a Mesa.
 */
function CombatStrip({ ready, combat, lang, onOpenSheet }) {
  const prev = useRef(undefined);   // undefined = ainda não viu o pulso
  useEffect(() => {
    if (!ready) return;
    if (turnJustStarted(prev.current, combat)) { try { navigator.vibrate?.(200); } catch { /* sem vibração */ } }
    prev.current = combat || null;
  }, [ready, combat?.active, combat?.isMine, combat?.round]); // eslint-disable-line react-hooks/exhaustive-deps
  // Nada mexe debaixo do dedo (princípio 8): a faixa entra (e troca de estado) só 600 ms
  // depois do último toque (tocando sem parar, entra no 5º adiamento, como no Combate do
  // mestre: play/damage-model.js, quietSlot); a vibração não espera.
  const [shown, setShown] = useState(combat);
  const touchedAt = useRef(0);
  const slot = useRef(null);
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    document.addEventListener('pointerdown', mark, true);
    slot.current = quietSlot(setShown, () => touchedAt.current);
    return () => { document.removeEventListener('pointerdown', mark, true); slot.current.cancel(); };
  }, []);
  useEffect(() => { slot.current?.push(combat); }, [combat]);
  const s = combatStrip(shown, lang);
  if (!s) return null;
  return (
    <section className={`pl-fight${s.mine ? ' is-mine' : ''}`} role="status" aria-live="polite"
      aria-label={L(lang, 'Combate', 'Combat')}>
      <span className="pl-fight-icon" aria-hidden="true">⚔</span>
      <div className="pl-fight-text">
        <strong className="pl-fight-title">{s.title}</strong>
        {s.sub && <span className="pl-fight-sub">{s.sub}</span>}
      </div>
      {s.mine && onOpenSheet && (
        <button type="button" className="pl-fight-go" onClick={onOpenSheet}
          aria-label={L(lang, 'Ir para a minha ficha', 'Go to my sheet')}>
          {L(lang, 'Minha ficha', 'My sheet')}{'\u00a0→'}
        </button>
      )}
    </section>
  );
}

/** O cartão antigo (servidor sem o palco) no formato de playerScreen(). */
function legacyNow(card, lang) {
  return {
    kind: card.type === 'entry' ? 'card' : card.type, title: card.title, text: card.text, imageUrl: card.imageUrl,
    eyebrow: card.type === 'recap' ? L(lang, 'Anteriormente…', 'Previously…') : (lang === 'pt' ? card.kindLabel : card.kindLabelEn) || card.kindLabel,
    entryId: card.entryId ?? null, entryKind: card.kind, partial: !!card.partial,
  };
}

/** O que está na Tela agora (o celular vira uma segunda tela). `now` vem de playerScreen(). */
function OnScreenNow({ now, lang, onOpen }) {
  const [imgOk, setImgOk] = useState(true);
  if (!now) return null;
  const img = worldImageUrl(now.imageUrl);
  // O modificador é `is-<tipo>` (antes `pl-onscreen-<tipo>`: o do cartão era o mesmo nome
  // da caixa de dentro, `.pl-onscreen-card`, e a seção herdava a moldura e o flex dela).
  const title = (
    <MesaTitle sub={now.over ? <span className="pl-onscreen-over">{now.over}</span> : null}>
      {L(lang, 'Na tela agora', 'On screen now')}
    </MesaTitle>
  );
  if (now.kind === 'combat' || now.kind === 'dark' || now.kind === 'map') {
    return (
      <section className={`mesa-panel pl-onscreen is-${now.kind}`} aria-label={L(lang, 'Na tela agora', 'On screen now')}>
        {title}
        <p className="pl-onscreen-line">{now.title}</p>
      </section>
    );
  }
  const paras = paragraphs(now.text);
  // Cartão do Mundo sem imagem própria: a arte padrão do tipo como ambiente (esmaecida, com
  // o ícone do tipo por cima) — nunca como o retrato de alguém. Recap, cena e texto: o ícone.
  const fallbackArt = now.kind === 'card' && now.entryId != null ? defaultArt({ id: now.entryId, kind: now.entryKind }) : null;
  // ícone de linha (recap, cena, imagem, texto ou o tipo do cartão): o mesmo traço dos títulos
  const icon = <FrontIcon kind={now.kind} entryKind={now.entryKind} size={28} />;
  return (
    <section className={`mesa-panel pl-onscreen is-${now.kind}`} aria-label={L(lang, 'Na tela agora', 'On screen now')}>
      {title}
      <div className="pl-onscreen-card">
        {img && imgOk
          ? <img className={`pl-onscreen-img ${now.kind === 'image' ? 'is-contain' : ''}`} src={img} alt="" onError={() => setImgOk(false)} />
          : fallbackArt
            ? (
              <div className="pl-onscreen-img pl-defart" aria-hidden="true">
                <img src={fallbackArt} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                <span className="pl-defart-ico">{icon}</span>
              </div>
            )
            : <div className="pl-onscreen-icon" aria-hidden="true">{icon}</div>}
        <div className="pl-onscreen-body">
          {now.eyebrow && <div className="pl-onscreen-kind">{now.eyebrow}</div>}
          {now.title && <h3 className="pl-onscreen-title">{now.title}</h3>}
          {now.caption && <p className="pl-onscreen-caption">{now.caption}</p>}
          {now.partial && <div className="pl-rumor-tag">{L(lang, 'Rumores…', 'Rumors…')}</div>}
          {paras.slice(0, now.kind === 'recap' ? 8 : 3).map((p, i) => <p key={i}>{p}</p>)}
          {now.kind === 'card' && now.entryId && (
            <button type="button" className="mesa-btn pl-onscreen-go" onClick={() => onOpen(now.entryId)}>{L(lang, 'Ver no Mundo', 'See in World')}</button>
          )}
        </div>
      </div>
    </section>
  );
}

function ChecksSection({ campaign, char, lang, onOpenCount }) {
  const [checks, setChecks] = useState(null);
  const pp = usePlayerPulse();
  const load = useCallback(async () => {
    try { setChecks((await api.listChecks(campaign.id)).checks || []); } catch { /* polling */ }
  }, [campaign.id]);
  // O checksRev do jogador só muda com os testes abertos para ele e as respostas dele
  // (o pedido de iniciativa também é um teste): sem busca de segurança.
  useOnRev(pp?.pulse?.checksRev, load, { table: pp, fallbackMs: 3000, safetyMs: Infinity });
  const open = (checks || []).filter(c => !c.myResponse);
  const openCount = open.length;
  // Respondido agora: o painel continua no topo (onde a pessoa está olhando) por 8 s, para
  // o total e o "Passou / Falhou" aparecerem no lugar em que ela tocou. Depois volta para
  // baixo da cena — nunca com o dedo na tela (espera 600 ms depois do último toque).
  const [held, setHeld] = useState([]);
  const holdTimers = useRef(new Map());
  const touchedAt = useRef(0);
  useEffect(() => {
    const mark = () => { touchedAt.current = Date.now(); };
    const timers = holdTimers.current;
    document.addEventListener('pointerdown', mark, true);
    return () => { document.removeEventListener('pointerdown', mark, true); for (const tm of timers.values()) clearTimeout(tm); timers.clear(); };
  }, []);
  const hold = (id) => {
    const timers = holdTimers.current;
    clearTimeout(timers.get(id));
    setHeld(h => (h.includes(id) ? h : [...h, id]));
    const release = () => {
      const quiet = Date.now() - touchedAt.current;
      if (quiet < 600) { timers.set(id, setTimeout(release, 600 - quiet)); return; }
      timers.delete(id);
      setHeld(h => h.filter(x => x !== id));
    };
    timers.set(id, setTimeout(release, CHECK_HOLD_MS));
  };
  const heldCount = (checks || []).filter(c => c.myResponse && held.includes(c.id)).length;
  const topCount = openCount + heldCount;
  useEffect(() => { onOpenCount?.(topCount); }, [topCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const empty = !!checks && checks.length === 0;
  return (
    <section className={`mesa-panel pl-section pl-checks${openCount > 0 ? ' has-open' : ''}${empty ? ' is-empty' : ''}`}
      aria-label={L(lang, 'Testes pedidos pelo mestre', 'Checks requested by the DM')}>
      <MesaTitle act={openCount > 0
        ? <span className="pl-count" aria-label={L(lang, `${openCount} aguardando você`, `${openCount} waiting for you`)}>{openCount}</span>
        : null}>
        {L(lang, 'Testes', 'Checks')}
      </MesaTitle>
      {empty && (
        <p className="pl-section-hint">{L(lang, 'Nenhum teste pendente. Quando o mestre pedir um, ele aparece aqui — role no app ou digite o dado físico.', 'No pending checks. When the DM asks for one it shows up here — roll in the app or type your physical die.')}</p>
      )}
      <div className="player-checks">
        {(checks || []).map(c => (
          <CheckRequestCard key={c.id} check={c} char={char} lang={lang}
            onAnswered={(u) => { hold(u.id); setChecks(prev => (prev || []).map(x => (x.id === u.id ? { ...x, ...u } : x))); }} />
        ))}
      </div>
    </section>
  );
}

/**
 * Rolador do jogador. "Pedir ao mestre" manda um pedido que ele resolve (na Tela ou privado).
 * Sem pedir (V10): o servidor rola e, quando a regra "Rolador da Mesa dos jogadores" do
 * mestre deixa (Todas · Só 20 e 1 · Nenhuma), a rolagem aparece na Tela com o nome do personagem —
 * o resultado diz "📺 apareceu na Tela".
 */
function DiceSection({ campaign, lang }) {
  const [diceType, setDiceType] = useState('d20');
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [label, setLabel] = useState('');
  const [ask, setAsk] = useState(false);
  // Pedido ao mestre: Normal / Vantagem / Desvantagem (o servidor rola 2d20 e
  // fica com o maior ou o menor; o mestre vê a marca no pedido, em Testes).
  const [adv, setAdv] = useState('normal');
  const [last, setLast] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState([]);

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const loadPending = useCallback(async () => {
    try {
      const [p, r] = await Promise.all([api.listPendingRolls(campaign.id), api.listRecentRolls(campaign.id)]);
      const pend = p.rolls || [];
      // Pedido meu que o mestre acabou de resolver: mostra o dado com o valor do servidor.
      // (Fora do setPending: mexer no palco de dados dentro do atualizador de estado
      // rodava durante o desenho — "Cannot update a component while rendering…".)
      const gone = pendingRef.current.filter(x => !pend.some(y => y.id === x.id));
      setPending(pend);
      for (const g of gone) {
        const done = (r.rolls || []).find(x => x.id === g.id);
        if (done && done.status !== 'cancelled' && done.rolls?.length) {
          window.__diceShow?.({
            label: done.label || done.diceType,
            groups: [{ die: parseInt(String(done.diceType).replace('d', ''), 10) || 20, rolls: done.rolls }],
            mod: done.modifier || 0, total: done.total, isCrit: done.isCritical, isFumble: done.isCriticalFail,
          });
          setLast({ label: done.label, results: done.rolls.filter(x => x.kept !== false), total: done.total, modifier: done.modifier, fromDm: true });
        }
      }
    } catch { /* polling */ }
  }, [campaign.id]);
  // Só consulta pedidos enquanto houver algum aguardando o mestre: com o pulso do jogador,
  // quando os pedidos dele mudam (`rollsRev`: o mestre resolveu); sem ele, a cada 3 s.
  const pp = usePlayerPulse();
  const rollsRev = pp?.enabled && pp.pulse ? pp.pulse.rollsRev : undefined;
  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => {
    if (rollsRev !== undefined && pendingRef.current.length) loadPending();
  }, [rollsRev]); // eslint-disable-line react-hooks/exhaustive-deps
  // Com o pulso, uma busca de segurança a cada 12 s enquanto houver pedido esperando: o
  // `rollsRev` é o conjunto dos pedidos pendentes, e um pedido resolvido entre dois pulsos
  // (ou trocado por outro) não o mudaria — "Aguardando o mestre" ficaria preso na tela.
  usePolling(() => (pending.length ? loadPending() : null), rollsRev === undefined ? 3000 : 12000,
    [campaign.id, pending.length > 0, rollsRev === undefined]);

  // Vantagem/desvantagem (só no pedido ao mestre, só no d20): é UM d20 rolado duas vezes
  // (fica o maior ou o menor). A quantidade trava em 1 — antes ia "2d20 com vantagem".
  const d20 = diceType === 'd20';
  const advOn = ask && d20 && adv !== 'normal';
  const dice = advOn ? 1 : count;
  const formula = `${dice}${diceType}${modifier ? (modifier > 0 ? `+${modifier}` : `−${Math.abs(modifier)}`) : ''}`;
  const [cancelling, setCancelling] = useState(null);

  const cancel = async (r) => {
    if (cancelling != null) return;
    setCancelling(r.id); setError('');
    try {
      await api.cancelRoll(r.id);
      setPending(prev => prev.filter(x => x.id !== r.id));
    } catch (e) {
      setError(errorMessage(e, lang, L(lang, 'Não deu para cancelar o pedido. Tente de novo.', 'Could not cancel the request. Try again.')));
    } finally { setCancelling(null); }
  };

  const roll = async () => {
    setBusy(true); setError('');
    try {
      if (ask) {
        await api.createRoll(campaign.id, {
          label: label || L(lang, 'Rolagem', 'Roll'), diceType, count: dice, modifier,
          hasAdvantage: d20 && adv === 'adv', hasDisadvantage: d20 && adv === 'dis',
        });
        await loadPending();
        // o pedido foi: o formulário volta ao começo e o resultado antigo sai da frente
        // (ele parecia a resposta do pedido que ainda espera o mestre)
        setLast(null);
        setLabel(''); setCount(1); setModifier(0);
        setAdv('normal');
      } else {
        const r = await api.rollDice({ diceType, count, campaignId: campaign.id, label, modifier: modifier || 0 });
        const total = r.total + (modifier || 0);
        setLast({ label, results: r.results, total, modifier, shown: !!r.shown });
        window.__diceShow?.({
          label: label || `${count}${diceType}`,
          groups: [{ die: parseInt(diceType.slice(1), 10), rolls: r.results.map(x => ({ value: x.value, kept: true })) }],
          mod: modifier || 0,
          total,
          tableNote: r.shown ? 'player-shown' : undefined,
        });
      }
    } catch (e) {
      setError(errorMessage(e, lang, L(lang, 'Não deu para rolar. Tente de novo.', 'Could not roll. Try again.')));
    } finally { setBusy(false); }
  };

  const advWord = adv === 'adv' ? L(lang, 'vantagem', 'advantage') : L(lang, 'desvantagem', 'disadvantage');
  return (
    <section className="mesa-panel pl-section pl-dice" aria-label={L(lang, 'Rolar dados', 'Roll dice')}>
      <MesaTitle>{L(lang, 'Rolar dados', 'Roll dice')}</MesaTitle>
      <div className="pl-dice-row" role="group" aria-label={L(lang, 'Dado', 'Die')}>
        {DICE.map(d => (
          <button key={d} type="button" className={`pl-die ${diceType === d ? 'active' : ''}`} aria-pressed={diceType === d} onClick={() => setDiceType(d)}>{d}</button>
        ))}
      </div>
      <div className="pl-dice-form">
        <Stepper id="pl-dice-count" label={L(lang, 'Quantos dados', 'How many dice')} value={dice} min={1} max={20}
          onChange={setCount} disabled={advOn} lang={lang}
          hint={advOn ? (adv === 'adv'
            ? L(lang, 'O d20 rola 2 vezes: fica o maior.', 'The d20 rolls twice: the higher stays.')
            : L(lang, 'O d20 rola 2 vezes: fica o menor.', 'The d20 rolls twice: the lower stays.')) : null} />
        <Stepper id="pl-dice-mod" label={L(lang, 'Bônus', 'Bonus')} value={modifier} min={-20} max={40}
          onChange={setModifier} showSign lang={lang} />
        <label className="pl-field pl-field-grow" htmlFor="pl-dice-label">
          <span>{L(lang, 'Para quê? (opcional)', 'What for? (optional)')}</span>
          <input id="pl-dice-label" className="input" value={label} maxLength={60} onChange={e => setLabel(e.target.value)}
            placeholder={L(lang, 'ex.: Percepção', 'e.g. Perception')} />
        </label>
      </div>
      <label className="pl-ask">
        <input type="checkbox" checked={ask} onChange={e => setAsk(e.target.checked)} />
        <span>{L(lang, 'Pedir ao mestre (ele decide se mostra na Tela)', 'Ask the DM (they decide whether to show it on screen)')}</span>
      </label>
      {ask && (
        <div className="pl-adv">
          <div className="pl-adv-row" role="group" aria-label={L(lang, 'Vantagem ou desvantagem', 'Advantage or disadvantage')}>
            {[['normal', L(lang, 'Normal', 'Normal')], ['adv', L(lang, 'Vantagem', 'Advantage')], ['dis', L(lang, 'Desvantagem', 'Disadvantage')]].map(([k, lbl]) => (
              <button key={k} type="button" className={`pl-adv-btn ${k} ${adv === k ? 'active' : ''}`} aria-pressed={adv === k}
                disabled={!d20} onClick={() => setAdv(k)}>{lbl}</button>
            ))}
          </div>
          {!d20 && <p className="pl-adv-hint">{L(lang, 'Vantagem e desvantagem valem para o d20.', 'Advantage and disadvantage apply to the d20.')}</p>}
        </div>
      )}
      <button type="button" className="btn btn-primary pl-roll-btn" onClick={roll} disabled={busy}>
        {busy ? '…' : ask
          ? (advOn
            ? L(lang, `Pedir ${formula} com ${advWord}`, `Request ${formula} with ${advWord}`)
            : L(lang, `Pedir ${formula}`, `Request ${formula}`))
          : L(lang, `Rolar ${formula}`, `Roll ${formula}`)}
      </button>
      <p className="pl-dice-hint">{L(lang, 'Prefere dados de verdade? Ótimo — use os seus e diga o resultado ao mestre.', 'Prefer real dice? Great — roll yours and tell the DM the result.')}</p>
      {error && <p className="pl-error" role="alert">{error}</p>}

      {pending.length > 0 && (
        <div className="pl-pending-box">
          <h4 className="pl-pending-title">{L(lang, 'Aguardando o mestre', 'Waiting for the DM')}</h4>
          <ul className="pl-pending">
            {pending.map(r => {
              const n = r.count || 1;
              const mod = Number(r.modifier) || 0;
              const what = `${n}${r.diceType || ''}${mod ? (mod > 0 ? `+${mod}` : `−${Math.abs(mod)}`) : ''}`;
              return (
                <li key={r.id}>
                  <span className="pl-pending-dot" aria-hidden="true" />
                  <span className="pl-pending-main">
                    <strong className="pl-pending-label">{r.label || r.diceType}</strong>
                    <span className="pl-pending-what">
                      {what}
                      {r.hasAdvantage && <span className="pl-pending-adv"> · {L(lang, 'vantagem', 'advantage')}</span>}
                      {r.hasDisadvantage && <span className="pl-pending-adv"> · {L(lang, 'desvantagem', 'disadvantage')}</span>}
                    </span>
                  </span>
                  <button type="button" className="mesa-btn is-quiet pl-pending-cancel" onClick={() => cancel(r)} disabled={cancelling != null}
                    aria-label={L(lang, `Cancelar o pedido: ${r.label || r.diceType}`, `Cancel the request: ${r.label || r.diceType}`)}>
                    {cancelling === r.id ? '…' : L(lang, 'Cancelar', 'Cancel')}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {last && (
        <div className={`pl-last${last.fromDm ? ' is-dm' : ''}`} aria-live="polite">
          <span className="pl-last-label">
            <span className="pl-last-by">{last.fromDm ? L(lang, 'O mestre resolveu', 'Resolved by the DM') : L(lang, 'Você rolou', 'You rolled')}</span>
            {last.label ? <span className="pl-last-what"> · {last.label}</span> : null}
          </span>
          <span className="pl-last-dice">
            {last.results.map((r, i) => <span key={i} className="pl-last-die">{r.value}</span>)}
            {last.modifier ? <span className="pl-last-mod">{signed(last.modifier)}</span> : null}
          </span>
          <span className="pl-last-total" aria-label={L(lang, `Total ${last.total}`, `Total ${last.total}`)}>{last.total}</span>
          {last.shown && <span className="pl-last-shown">{L(lang, 'Apareceu na Tela da mesa', 'Shown on the table screen')}</span>}
        </div>
      )}
    </section>
  );
}

/**
 * Campo de número com − e ＋ de 44 px e o valor no meio (dá para digitar: aceita vazio
 * e "-" enquanto a pessoa escreve; o valor só é ajustado aos limites quando vale).
 * Antes eram dois <input type="number"> que corrigiam a cada tecla: apagar o "1" para
 * escrever "2" dava "12", e o teclado numérico do iPhone não tem "−" (bônus negativo
 * era impossível — o − daqui resolve).
 */
function Stepper({ id, label, value, min, max, onChange, showSign = false, disabled = false, hint = null, lang }) {
  const [raw, setRaw] = useState(null);   // texto enquanto digita; null = mostra o valor
  const text = raw != null ? raw : (showSign ? signed(value) : String(value));
  const step = (d) => { setRaw(null); onChange(clamp(value + d, min, max)); };
  const type = (e) => {
    const v = e.target.value.replace(/−/g, '-');
    const neg = min < 0 && v.trim().startsWith('-');
    const digits = v.replace(/[^0-9]/g, '').slice(0, 2);
    setRaw(`${neg ? '-' : ''}${digits}`);
    if (digits) onChange(clamp((neg ? -1 : 1) * parseInt(digits, 10), min, max));
  };
  return (
    <div className={`pl-step${disabled ? ' is-off' : ''}`}>
      <label className="pl-step-label" htmlFor={id}>{label}</label>
      <div className="pl-step-row">
        <button type="button" className="pl-step-btn" onClick={() => step(-1)} disabled={disabled || value <= min}
          aria-label={L(lang, `${label}: diminuir`, `${label}: decrease`)}>
          <span aria-hidden="true">−</span>
        </button>
        <input id={id} className="pl-step-val" type="text" inputMode="numeric" autoComplete="off" pattern="-?[0-9]*"
          value={text} disabled={disabled}
          onFocus={(e) => { const el = e.currentTarget; setRaw(String(value)); requestAnimationFrame(() => { try { el.select(); } catch { /* ok */ } }); }}
          onChange={type}
          onBlur={() => setRaw(null)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); step(1); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
          }} />
        <button type="button" className="pl-step-btn" onClick={() => step(1)} disabled={disabled || value >= max}
          aria-label={L(lang, `${label}: aumentar`, `${label}: increase`)}>
          <span aria-hidden="true">+</span>
        </button>
      </div>
      {hint && <p className="pl-step-hint">{hint}</p>}
    </div>
  );
}
