// Jogar › Agora: o cartão CENA AGORA (V7, especificação §4.4.4 e W3) — a cena do plano
// que está acontecendo, com SÓ o que ela tem e uma ação principal de 44 px por linha:
//   nome · ⚡ Comece assim (o começo forte do plano, inteiro, só na 1ª cena da sessão) ·
//   O que acontece (só você vê) · 📜 Ler em voz alta ▾ (o texto ali, 18 px) ·
//   📺 Mostrar a imagem / 📺 Mostrar o texto · 🎯 o teste ("melhor: Elarion 50%") +
//   Pedir a todos · ⚔ o combate (com a dificuldade) + Começar o combate · 🎭 Quem aparece
//   (Quem vê / 📺 por cartão; o nome abre o editor numa folha) · ★ os momentos ligados ·
//   "da aventura ▸" (cena ligada: o painel Na mesa de hoje, dentro do cartão) ·
//   ✓ Cena feita · próxima ▶ (com a pergunta do momento antes, na mesma linha).
// Também absorve o "Nesta cena" de antes (InScenePanel): os cartões da sala/da cena.
// Durante o combate recolhe para 1 linha ("Ponte velha · ⚔ combate na rodada 2 [Ir para
// o combate ›] ▾"). `mode`: 'now' (ao vivo) · 'rehearsal' (sessão parada: o cabeçalho diz
// ENSAIO e nada grava `state.scene`) · 'peek' (a folha de uma cena do plano).
// Só apresentação: os dados e as ações vêm da Agora (NowPanel).
import { useEffect, useMemo, useState } from 'react';
import { checkLabel } from '../checks/check-logic.js';
import { bestAt, firstName } from '../group/party-best.js';
import { formatMod } from '../dice/dice-math.js';
import { DIFFICULTY_LABEL } from '../combat/encounter.js';
import { fightDifficulty, sceneView } from '../prep/scene-model.js';
import { partyLevels } from '../prep/prep-graph.js';
import ShowOnTable from '../stage/ShowOnTable.jsx';
import { EntryRow } from './InScenePanel.jsx';

const L = (lang, pt, en) => (lang === 'en' ? en : pt);
const filled = (s) => typeof s === 'string' && s.trim().length > 0;

/** O catálogo de monstros só quando a cena tem combate (o bestiário fica fora do pedaço da Agora). */
function useMonsterLookup(need) {
  const [lookup, setLookup] = useState(null);
  useEffect(() => {
    if (!need || lookup) return undefined;
    let alive = true;
    Promise.all([import('../../data/bestiary.js'), import('../combat/custom-monsters.js')]).then(([B, C]) => {
      if (!alive) return;
      const custom = C.loadCustomMonsters();
      setLookup(() => (id) => (id ? (B.findMonster(id) || custom.find(m => m.id === id) || null) : null));
    }).catch(() => { /* sem a dificuldade: o combate continua */ });
    return () => { alive = false; };
  }, [need, lookup]);
  return lookup;
}

export default function SceneNowCard({
  campaign, lang = 'pt', scene, node = null, world = [], moments = [], names = {}, mode = 'now', pos = null,
  next = null, nextName = '', combat = null, busy = '', closed = false, strongStart = '',
  onEdit, onFill, onAskCheck, onStartFight, onDone, onOpenEntry, onRevealEntry, onRevealed, adventurePanel = null,
}) {
  const v = useMemo(() => sceneView(scene, node, { world }), [scene, node, world]);
  const byId = useMemo(() => new Map((world || []).map(e => [e.id, e])), [world]);
  const [reading, setReading] = useState(false);
  const [open, setOpen] = useState(false);          // recolhido no combate: ▾ abre
  const [advOpen, setAdvOpen] = useState(false);
  const [asking, setAsking] = useState(false);      // "O momento do Pipo aconteceu?"
  const lookup = useMonsterLookup(v.fight.length > 0);
  const diff = useMemo(() => (v.fight.length && lookup ? fightDifficulty(v.fight, partyLevels(campaign), lookup, lang) : null), [v.fight, lookup, campaign, lang]);
  const fighting = !!combat?.active && mode === 'now';
  const pending = moments.filter(m => m.moment?.done == null);
  useEffect(() => { setAsking(false); setReading(false); setAdvOpen(false); }, [scene?.id]);

  if (!scene) return null;
  const name = v.name || names[scene.id] || '…';
  const eyebrow = mode === 'rehearsal'
    ? L(lang, 'Ensaio · cena', 'Rehearsal · scene')
    : mode === 'peek' ? L(lang, 'Cena do plano', 'Plan scene') : L(lang, 'Cena agora', 'Current scene');

  if (fighting && !open) {
    return (
      <section className="mesa-panel snc is-folded" aria-label={L(lang, 'Cena agora', 'Current scene')}>
        <p className="snc-fold">
          <strong>{name}</strong>
          <span> · ⚔ {L(lang, `combate na rodada ${combat.round ?? 1}`, `combat in round ${combat.round ?? 1}`)}</span>
        </p>
        <div className="snc-fold-acts">
          <button type="button" className="mesa-btn snc-go" onClick={() => onStartFight?.({ goOnly: true })}>{L(lang, 'Ir para o combate ›', 'Go to combat ›')}</button>
          <button type="button" className="mesa-icon-btn snc-unfold" aria-expanded="false" onClick={() => setOpen(true)}
            aria-label={L(lang, 'Abrir o cartão da cena', 'Open the scene card')}>▾</button>
        </div>
      </section>
    );
  }

  // a imagem da cena: o cartão (oculto pergunta "Só a imagem") ou a imagem da sala
  const showEntry = v.show?.kind === 'entry' ? byId.get(v.show.id) : null;
  const imageTarget = v.show?.kind === 'node'
    ? { kind: 'image', ref: { advId: v.show.advId, nodeId: v.show.nodeId }, name }
    : showEntry ? { kind: 'card', entry: showEntry } : null;
  const refs = v.refs.map(id => byId.get(id)).filter(Boolean);
  const nothing = !filled(v.read) && !v.show && !v.refs.length && !v.fight.length && !v.checks.length && !moments.length;
  const totalMonsters = v.fight.reduce((n, f) => n + (parseInt(f.count, 10) || 1), 0);
  const fightText = v.fight.length === 1 ? `${totalMonsters} ${v.fight[0].name}` : L(lang, `${totalMonsters} monstros`, `${totalMonsters} monsters`);
  const diffLabel = diff?.rating ? (DIFFICULTY_LABEL[diff.rating]?.[lang === 'en' ? 'en' : 'pt'] || '') : '';

  return (
    <section className={`mesa-panel snc is-${mode}`} aria-labelledby={`snc-h-${scene.id}`}>
      <div className="snc-head">
        <p className="mesa-eyebrow">{eyebrow}{pos?.total ? ` · ${L(lang, `${pos.pos} de ${pos.total}`, `${pos.pos} of ${pos.total}`)}` : ''}</p>
        {fighting && (
          <button type="button" className="mesa-icon-btn" aria-expanded="true" onClick={() => setOpen(false)}
            aria-label={L(lang, 'Recolher o cartão da cena', 'Fold the scene card')}>▴</button>
        )}
        {onEdit && (
          <button type="button" className="mesa-icon-btn snc-edit" onClick={onEdit}
            aria-label={L(lang, 'Sessão, cena e clima', 'Session, scene and weather')}>✎</button>
        )}
      </div>
      {/* na folha da cena o nome já está no título: aqui fica só para o leitor de tela */}
      <h3 className={mode === 'peek' ? 'sr-only' : 'snc-name'} id={`snc-h-${scene.id}`}>{name}</h3>
      {filled(strongStart) && (
        <p className="snc-strong">
          <strong>⚡ {L(lang, 'Comece assim:', 'Start like this:')}</strong> {strongStart.trim()} <span className="snc-only">{L(lang, '(só você vê)', '(only you see)')}</span>
        </p>
      )}
      {(filled(v.what) || filled(v.notesInText)) && (
        <p className="snc-what">{v.what || v.notesInText} <span className="snc-only">{L(lang, '(só você vê)', '(only you see)')}</span></p>
      )}

      {nothing && (
        <div className="snc-empty">
          <p>{L(lang, 'Esta cena só tem nome.', 'This scene only has a name.')}</p>
          {onFill && <button type="button" className="mesa-btn" onClick={onFill}>✎ {L(lang, 'Pôr coisas nela', 'Add things to it')}</button>}
        </div>
      )}

      {filled(v.read) && (
        <div className="snc-block">
          <button type="button" className="mesa-btn snc-read-btn" aria-expanded={reading} onClick={() => setReading(r => !r)}>
            📜 {L(lang, 'Ler em voz alta', 'Read aloud')} <span aria-hidden="true">{reading ? '▴' : '▾'}</span>
          </button>
          {reading && <blockquote className="snc-read">{v.read}</blockquote>}
        </div>
      )}

      {(imageTarget || filled(v.read)) && (
        <div className="snc-row snc-show">
          {imageTarget && (
            <ShowOnTable campaign={campaign} lang={lang} target={imageTarget} className="mesa-btn snc-act" disabled={closed}
              onRevealed={onRevealed} ariaLabel={`${L(lang, 'Mostrar a imagem', 'Show the image')}: ${name}`}>
              📺 {L(lang, 'Mostrar a imagem', 'Show the image')}
            </ShowOnTable>
          )}
          {filled(v.read) && (
            <ShowOnTable campaign={campaign} lang={lang} target={{ kind: 'text', text: v.read.slice(0, 1000) }} className="mesa-btn snc-act" disabled={closed}>
              📺 {L(lang, 'Mostrar o texto', 'Show the text')}
            </ShowOnTable>
          )}
        </div>
      )}

      {v.checks.map((c, i) => {
        const b = c.kind === 'skill' || c.kind === 'save' ? bestAt(campaign.members, c.kind, c.key, Number.isInteger(c.dc) ? c.dc : 15) : null;
        const who = b ? (b.who.length > 2 ? L(lang, `${b.who.length} empatados`, `${b.who.length} tied`) : b.who.map(firstName).join('/')) : '';
        return (
          <div key={`${c.kind}:${c.key}:${i}`} className="snc-row">
            <p className="snc-line">
              🎯 {checkLabel(c, lang)}{Number.isInteger(c.dc) ? ` ${L(lang, 'CD', 'DC')} ${c.dc}` : ''}{c.dcHidden ? ' 🔒' : ''}
              {b && <span className="snc-sub"> · {L(lang, 'melhor', 'best')} {who} {formatMod(b.best)} · {b.p}%</span>}
            </p>
            <button type="button" className="mesa-btn snc-act" disabled={closed || busy === `check:${i}`} onClick={() => onAskCheck?.(c, i)}>
              {busy === `check:${i}` ? '…' : L(lang, 'Pedir a todos', 'Ask everyone')}
            </button>
          </div>
        );
      })}

      {v.fight.length > 0 && (
        <div className="snc-row">
          <p className="snc-line">⚔ {fightText}{diffLabel ? <span className="snc-sub"> · {diffLabel}</span> : null}</p>
          <button type="button" className="mesa-btn snc-act" disabled={closed || busy === 'fight'} onClick={() => onStartFight?.({ fight: v.fight })}>
            {busy === 'fight' ? '…' : L(lang, 'Começar o combate', 'Start combat')}
          </button>
        </div>
      )}

      {refs.length > 0 && (
        <div className="snc-refs">
          <p className="snc-label">🎭 {L(lang, 'Quem aparece', 'Who shows up')}</p>
          <div className="ins-list">
            {refs.map(e => (
              <EntryRow key={e.id} entry={e} lang={lang} onOpen={onOpenEntry} openLabel={L(lang, 'Abrir o cartão', 'Open the card')}
                onReveal={onRevealEntry} campaign={campaign} onRevealed={onRevealed} busy={busy === `entry:${e.id}`} />
            ))}
          </div>
        </div>
      )}

      {moments.map(m => (
        <p key={m.key} className="snc-moment">
          ★ {L(lang, `Momento de ${firstName(names[m.charId] || '?')}`, `${firstName(names[m.charId] || '?')}'s moment`)}: {m.moment.text}
          {m.moment.done != null && <span className="snc-sub"> · {L(lang, 'aconteceu', 'happened')} ✓</span>}
        </p>
      ))}

      {adventurePanel && (
        <div className="snc-adv">
          <button type="button" className="mesa-btn is-quiet snc-adv-btn" aria-expanded={advOpen} onClick={() => setAdvOpen(o => !o)}>
            {L(lang, 'da aventura', 'from the adventure')} <span aria-hidden="true">{advOpen ? '▴' : '▸'}</span>
            <span className="snc-sub"> {L(lang, '(caminhos, perigos, tesouro)', '(paths, hazards, treasure)')}</span>
          </button>
          {advOpen && <div className="snc-adv-body">{adventurePanel()}</div>}
        </div>
      )}

      {mode !== 'peek' && onDone && (
        asking ? (
          <div className="snc-ask" role="group" aria-label={L(lang, 'O momento aconteceu?', 'Did the moment happen?')}>
            <p className="snc-line">{pending.length === 1
              ? L(lang, `O momento de ${firstName(names[pending[0].charId] || '?')} aconteceu?`, `Did ${firstName(names[pending[0].charId] || '?')}'s moment happen?`)
              : L(lang, 'Os momentos desta cena aconteceram?', "Did this scene's moments happen?")}</p>
            <div className="snc-row-acts">
              <button type="button" className="mesa-btn is-primary snc-act" disabled={!!busy} onClick={() => { setAsking(false); onDone({ happened: true }); }}>{L(lang, 'Sim', 'Yes')}</button>
              <button type="button" className="mesa-btn snc-act" disabled={!!busy} onClick={() => { setAsking(false); onDone({ happened: false }); }}>{L(lang, 'Não', 'No')}</button>
            </div>
          </div>
        ) : (
          <button type="button" className="mesa-btn mesa-btn-lg is-primary snc-done" disabled={closed || busy === 'done'}
            onClick={() => (pending.length ? setAsking(true) : onDone({ happened: false }))}>
            {busy === 'done' ? '…' : next
              ? <>✓ {L(lang, 'Cena feita · próxima:', 'Scene done · next:')} {nextName} <span aria-hidden="true">▶</span></>
              : <>✓ {L(lang, 'Cena feita', 'Scene done')}</>}
          </button>
        )
      )}
    </section>
  );
}
