import { useState } from 'react';
import { PLAN_LIMITS, realScene } from './next-session.js';
import { kindIcon, kindLabel } from '../world/world-model.js';
import WorldRefs from './WorldRefs.jsx';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);
const HANDY_KINDS = ['npc', 'faction', 'place'];

export function ScenesStep({
  plan, lang, closed, reorder, setReorder, narrow = false, world, worldError, handyIds, sceneInfo,
  onToggleHandy, onCreateEntry, onOpenEntry, onAdd, onOpenScene, onChange, onMove,
}) {
  const [allHandy, setAllHandy] = useState(false);
  const [handyOver, setHandyOver] = useState(false);
  const handyCount = (world || []).filter(e => handyIds.includes(e.id)).length;
  const list = plan.scenes;
  return (
    <>
      {list.length === 0 && <p className="ns-empty-line">{t(lang, 'Nenhuma cena ainda.', 'No scenes yet.')}</p>}
      <ol className="ns-list">
        {list.map((s, i) => {
          const { name } = sceneParts(s.text);
          const info = sceneInfo(s);
          const label = name || t(lang, '(sem nome)', '(no name)');
          const main = (
            <>
              <span className="ns-row-n" aria-hidden="true">{i + 1}</span>
              <span className="ns-scene-main">
                <span className="ns-scene-name">{label}{s.done && <span className="ns-scene-done"> · ✓ {t(lang, 'jogada', 'played')}</span>}</span>
                {(info.room || info.icons.length > 0) && (
                  <span className="ns-scene-icons">{[info.room && `🗺 ${info.room}`, ...info.icons].filter(Boolean).join(' · ')}</span>
                )}
              </span>
            </>
          );
          return (
            <li key={s.id} className={`ns-row ns-scene ${s.done ? 'is-done' : ''}`}>
              <div className="ns-row-line">
                <label className="ns-tick">
                  <input type="checkbox" checked={s.done} disabled={closed} onChange={() => onChange(s.id, { done: !s.done })}
                    aria-label={t(lang, `Cena ${i + 1} aconteceu`, `Scene ${i + 1} happened`)} />
                </label>
                {reorder ? (
                  <>
                    <span className="ns-scene-open is-static">{main}</span>
                    <span className="ns-order">
                      <button type="button" className="mesa-icon-btn" disabled={i === 0} onClick={() => onMove(s.id, -1)} aria-label={t(lang, `Subir a cena ${i + 1}`, `Move scene ${i + 1} up`)}>↑</button>
                      <button type="button" className="mesa-icon-btn" disabled={i === list.length - 1} onClick={() => onMove(s.id, 1)} aria-label={t(lang, `Descer a cena ${i + 1}`, `Move scene ${i + 1} down`)}>↓</button>
                    </span>
                  </>
                ) : (
                  <button type="button" className="ns-scene-open" onClick={() => onOpenScene(s.id)}
                    aria-label={t(lang, `Cena ${i + 1}: ${label}. Abrir a cena`, `Scene ${i + 1}: ${label}. Open the scene`)}>
                    {main}
                    <span className="ns-step-chev" aria-hidden="true">›</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {!closed && (
        <div className="ns-scene-acts">
          <button type="button" className="mesa-btn mesa-btn-lg ns-add" disabled={list.length >= PLAN_LIMITS.scenes} onClick={onAdd}>＋ {t(lang, 'Cena', 'Scene')}</button>
          {list.length > 1 && (
            <button type="button" className="mesa-btn mesa-btn-lg" aria-pressed={reorder} onClick={() => setReorder(!reorder)}>
              {reorder ? t(lang, '✓ Pronto', '✓ Done') : t(lang, '⇅ Mudar a ordem', '⇅ Reorder')}
            </button>
          )}
        </div>
      )}
      {list.length >= PLAN_LIMITS.scenes && <p className="ns-hint">{t(lang, `O plano chegou a ${PLAN_LIMITS.scenes} cenas.`, `The plan reached ${PLAN_LIMITS.scenes} scenes.`)}</p>}
      <p className="ns-hint">{t(lang, '2 ou 3 cenas bastam. O grupo decide a ordem; não é roteiro.', "2 or 3 scenes are enough. The party picks the order; it's not a script.")}</p>
      <div className="ns-handy">
        <div className="ns-handy-head">
          <p className="mesa-eyebrow">{t(lang, 'À mão na sessão toda', 'Handy all session')}</p>
          {narrow && (handyOver || allHandy) && (
            <button type="button" className="mesa-btn is-quiet ns-handy-all" aria-expanded={allHandy} onClick={() => setAllHandy(v => !v)}>
              {allHandy ? t(lang, 'Recolher', 'Collapse') : t(lang, `Ver todas (${handyCount})`, `See all (${handyCount})`)}
            </button>
          )}
        </div>
        <WorldRefs entries={world} ids={handyIds} kinds={HANDY_KINDS} lang={lang} max={PLAN_LIMITS.ids * 2} readOnly={closed} pills
          rail={narrow && !allHandy} onOverflow={setHandyOver}
          onToggle={onToggleHandy} onCreate={onCreateEntry} onOpen={onOpenEntry}
          addLabel={t(lang, 'Pessoa ou lugar', 'Person or place')}
          emptyText={worldError ? t(lang, 'Não consegui carregar o Mundo agora.', 'Could not load the World right now.') : t(lang, 'Pessoas e lugares que podem aparecer em qualquer cena.', 'People and places that may show up in any scene.')} />
      </div>
    </>
  );
}

/** ④ Pistas: contador, 3 linhas à vista (as vazias nunca vão ao servidor), ligar a um segredo. */
export function CluesStep({ plan, lang, closed, clues, world, asks, logDiary, setLogDiary, loadEntry, onCreateEntry, onDiscover, onReveal, onDismissAsk, onChange, onMove, onRemove, onAdd }) {
  return (
    <>
      <p className="ns-count">
        <strong>{t(lang, `${clues.total} ${clues.total === 1 ? 'pista' : 'pistas'} · ${clues.found} ${clues.found === 1 ? 'achada' : 'achadas'}`, `${clues.total} ${clues.total === 1 ? 'clue' : 'clues'} · ${clues.found} found`)}</strong>
        <span className="ns-hint">{t(lang, 'O ideal são umas 10, mas 3 já servem.', 'About 10 is ideal, but 3 will do.')}</span>
      </p>
      <ol className="ns-list ns-secrets">
        {plan.secrets.map((s, i) => (
          <li key={s.id} className={`ns-row ${s.discovered ? 'is-done' : ''}`}>
            <div className="ns-row-line">
              <label className="ns-tick">
                <input type="checkbox" checked={s.discovered} disabled={closed || !(s.text || s.ref)} onChange={() => onDiscover(s.id)}
                  aria-label={t(lang, `Pista ${i + 1} achada`, `Clue ${i + 1} found`)} />
              </label>
              <input id={`ns-clue-${s.id}`} className="input ns-row-input" value={s.text} maxLength={PLAN_LIMITS.text} disabled={closed}
                aria-label={t(lang, `Pista ${i + 1}`, `Clue ${i + 1}`)}
                placeholder={i === 0
                  ? t(lang, 'Ex.: O taverneiro deve dinheiro ao culto do sino', 'E.g. The innkeeper owes money to the bell cult')
                  : t(lang, `Pista ${i + 1}`, `Clue ${i + 1}`)}
                onChange={e => onChange(s.id, { text: e.target.value })} />
              {!closed && (s.text || s.ref) && (
                <MoreMenu lang={lang} label={t(lang, `Mais ações da pista ${i + 1}`, `More actions for clue ${i + 1}`)} sheetTitle={t(lang, `Pista ${i + 1}`, `Clue ${i + 1}`)}
                  items={[
                    i > 0 && { id: 'up', label: t(lang, '↑ Subir', '↑ Move up'), onSelect: () => onMove(s.id, -1) },
                    i < plan.secrets.length - 1 && { id: 'down', label: t(lang, '↓ Descer', '↓ Move down'), onSelect: () => onMove(s.id, 1) },
                    { id: 'del', label: t(lang, '🗑 Apagar a pista', '🗑 Delete the clue'), danger: true, hint: t(lang, 'Dá para desfazer por 6 s.', 'You can undo for 6 s.'), onSelect: () => onRemove(s) },
                  ].filter(Boolean)} />
              )}
            </div>
            {!closed && (
              <SecretLink value={s.ref} world={world} lang={lang} loadEntry={loadEntry} onCreateEntry={onCreateEntry}
                onChange={(ref, entry, secret) => onChange(s.id, { ref, text: ref ? textForRef(s.text, entry, secret) : s.text })} />
            )}
            {asks[s.id] && (
              <div className="ns-ask" role="group" aria-label={t(lang, 'Revelar no cartão?', 'Reveal on the card?')}>
                <p>✨ {t(lang, 'Revelar também no cartão', 'Also reveal on the card')} <strong>{asks[s.id].entryName || '…'}</strong>?
                  {asks[s.id].secretText && <span className="muted small"> “{asks[s.id].secretText.slice(0, 120)}”</span>}</p>
                <div className="ns-ask-actions">
                  <button type="button" className="mesa-btn is-primary" onClick={() => onReveal(s.id)}>👁 {t(lang, 'Revelar', 'Reveal')}</button>
                  <button type="button" className="mesa-btn" onClick={() => onDismissAsk(s.id)}>{t(lang, 'Agora não', 'Not now')}</button>
                  <label className="ns-inline-check"><input type="checkbox" checked={logDiary} onChange={e => setLogDiary(e.target.checked)} /> {t(lang, 'Registrar na Crônica', 'Log to Chronicle')}</label>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {!closed && (
        <button type="button" className="mesa-btn mesa-btn-lg ns-add" disabled={plan.secrets.length >= PLAN_LIMITS.secrets} onClick={onAdd}>＋ {t(lang, 'Pista', 'Clue')}</button>
      )}
    </>
  );
}

/**
 * Fim da sanfona (só leitura): o que já está de pé, ▶ Ensaiar e ▶ Começar a Sessão N. Com um
 * passo aberto no celular (`compact`), só a conta e os botões: a lista volta ao fechar o passo.
 */
export const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export function SecretLink({ value, world, lang, loadEntry, onCreateEntry, onChange }) {
  const [editing, setEditing] = useState(false);
  const [entryId, setEntryId] = useState('');
  const [entry, setEntry] = useState(null);
  const [failed, setFailed] = useState(false);
  const [newName, setNewName] = useState(null);   // null = sem o campo de cartão novo
  const [busy, setBusy] = useState(false);
  const linked = value && (world || []).find(e => e.id === value.entryId);
  const [secretText, setSecretText] = useState('');

  useEffect(() => {
    let alive = true;
    setSecretText('');
    if (value?.entryId && value.secretId) {
      loadEntry(value.entryId).then(en => {
        if (alive) setSecretText(en?.secrets?.find(s => s.id === value.secretId)?.text || '');
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [value?.entryId, value?.secretId, loadEntry]);

  const pickEntry = async (id) => {
    if (id === 'new') { setEntryId(''); setEntry(null); setNewName(''); return; }
    setEntryId(id); setEntry(null); setFailed(false); setNewName(null);
    if (!id) return;
    try { setEntry(await loadEntry(Number(id))); } catch { setFailed(true); }
  };
  const createCard = async () => {
    const name = (newName || '').trim();
    if (!name || !onCreateEntry) return;
    setBusy(true);
    try {
      const e = await onCreateEntry('lore', name);
      onChange({ entryId: e.id, secretId: null }, e, null);
      setEditing(false); setNewName(null);
    } catch { setFailed(true); } finally { setBusy(false); }
  };

  if (!editing) {
    if (value) {
      return (
        <div className="ns-link">
          <span className="ns-link-tag">{linked ? kindIcon(linked.kind) : '🔗'} {linked ? linked.name : t(lang, 'Cartão apagado', 'Deleted card')}
            {value.secretId ? <> › 🗝 {secretText ? `“${secretText.slice(0, 40)}${secretText.length > 40 ? '…' : ''}”` : t(lang, 'segredo', 'secret')}</> : ''}</span>
          <button type="button" className="mesa-btn is-quiet" onClick={() => onChange(null)}>{t(lang, 'Desligar', 'Unlink')}</button>
        </div>
      );
    }
    return (
      <div className="ns-link">
        <button type="button" className="mesa-btn is-quiet ns-link-btn" onClick={() => { setEditing(true); if (!(world || []).length) setNewName(''); }}>
          🔗 {t(lang, 'Ligar a um segredo', 'Link to a secret')}
        </button>
      </div>
    );
  }

  return (
    <div className="ns-link-edit">
      {(world || []).length > 0 && (
        <select className="input" value={newName != null ? 'new' : entryId} onChange={e => pickEntry(e.target.value)} aria-label={t(lang, 'Cartão do Mundo', 'World card')}>
          <option value="">{t(lang, 'Cartão…', 'Card…')}</option>
          {WORLD_KINDS.map(k => {
            const list = (world || []).filter(e => e.kind === k.id);
            if (!list.length) return null;
            return (
              <optgroup key={k.id} label={`${kindIcon(k.id)} ${kindLabel(k.id, lang, true)}`}>
                {list.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </optgroup>
            );
          })}
          <option value="new">{t(lang, '＋ Criar cartão', '＋ Create card')}</option>
        </select>
      )}
      {newName != null && (
        <div className="ns-new-card">
          <input className="input" value={newName} maxLength={120} onChange={e => setNewName(e.target.value)}
            aria-label={t(lang, 'Nome do cartão novo', 'New card name')} placeholder={t(lang, 'Ex.: A verdade sobre o sino', 'E.g. The truth about the bell')} />
          <button type="button" className="mesa-btn is-primary" disabled={busy || !newName.trim()} onClick={createCard}>{busy ? '…' : t(lang, '＋ Criar cartão', '＋ Create card')}</button>
          <p className="ns-hint">{t(lang, 'O cartão nasce oculto no Mundo. Quando o grupo achar a pista, você decide se revela.', 'The card starts hidden in the World. When the party finds the clue, you decide whether to reveal it.')}</p>
        </div>
      )}
      {entryId && !entry && !failed && <span className="ns-hint">{t(lang, 'Carregando…', 'Loading…')}</span>}
      {failed && <span className="prep-error small">{t(lang, 'Não consegui abrir o cartão.', 'Could not open the card.')}</span>}
      {entry && (
        <div className="ns-secret-choices" role="group" aria-label={t(lang, 'Qual segredo?', 'Which secret?')}>
          {(entry.secrets || []).map(sc => (
            <button type="button" key={sc.id} className="ns-secret-choice" onClick={() => { onChange({ entryId: entry.id, secretId: sc.id }, entry, sc); setEditing(false); }}>
              🗝 {sc.text.slice(0, 90)}{sc.text.length > 90 ? '…' : ''} {sc.revealed && <span className="muted small">({t(lang, 'já revelado', 'already revealed')})</span>}
            </button>
          ))}
          <button type="button" className="ns-secret-choice is-card" onClick={() => { onChange({ entryId: entry.id, secretId: null }, entry, null); setEditing(false); }}>
            {kindIcon(entry.kind)} {t(lang, 'O cartão inteiro (revelar o cartão)', 'The whole card (reveal the card)')}
          </button>
          {(entry.secrets || []).length === 0 && <p className="ns-hint">{t(lang, 'Este cartão ainda não tem segredos. Escreva-os no Mundo.', 'This card has no secrets yet. Write them in the World.')}</p>}
        </div>
      )}
      <button type="button" className="mesa-btn is-quiet" onClick={() => { setEditing(false); setNewName(null); setEntry(null); setEntryId(''); }}>{t(lang, 'Cancelar', 'Cancel')}</button>
    </div>
  );
}
