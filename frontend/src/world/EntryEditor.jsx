// Editor de um cartão do Mundo — painel lateral (tela cheia no celular),
// salva sozinho (indicador "Salvo") e protege o texto local num conflito de
// versão (409): "Alguém alterou — recarregar".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import useConfirm from '../../components/ConfirmDialog.jsx';
import {
  deleteEntry, deleteEntryImage, getEntry, isConflict, putEntryImage, updateEntry, worldErrorText,
} from './world-api.js';
import { compressForEntry } from './image.js';
import {
  HANDOUT_STYLES, KINDS, KIND_META, PLACE_TYPES, RARITIES, allTags, backlinks, childrenOf, freshId, handoutStyleLabel,
  kindIcon, kindLabel, placeTypeLabel, rarityLabel, relLabel, t,
} from './world-model.js';
import useAutosave, { saveStateLabel } from './useAutosave.js';
import RevealControl, { useReveal } from './RevealControl.jsx';
import { EntryImage, VisibilitySeal } from './EntryCard.jsx';
import { EntryPicker, MentionTextarea, RelationsEditor, TagsInput } from './LinksField.jsx';

const hasDetails = (e) => !!(e && (e.body || e.dmNotes || (e.secrets || []).length || (e.links || []).length || e.parentId
  || (e.tags || []).length || e.whenLabel || Object.values(e.data || {}).some(v => v && (typeof v !== 'object' || Object.keys(v).length))));

export default function EntryEditor({
  entryId, campaign, entries = [], adventures = [], lang = 'pt', onClose, onSaved, onDeleted, onOpenEntry, onOpenMap, onShow, autoFocusName = false,
}) {
  const [entry, setEntry] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(null); // entrada do servidor no 409
  const [showMore, setShowMore] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [items, setItems] = useState(null);
  const versionRef = useRef(null);
  const entryRef = useRef(null);
  const fileRef = useRef(null);
  const confirm = useConfirm();

  const setLocal = (next) => { entryRef.current = next; setEntry(next); };

  // ---------------------------------------------------------------- carregar
  useEffect(() => {
    let alive = true;
    setEntry(null); setLoadError(''); setConflict(null);
    getEntry(entryId).then(e => {
      if (!alive) return;
      versionRef.current = e.version;
      setLocal(e);
      setShowMore(hasDetails(e));
    }).catch(e => alive && setLoadError(worldErrorText(e, lang)));
    return () => { alive = false; };
  }, [entryId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- autosave
  const save = useCallback(async (patch) => {
    const next = await updateEntry(entryId, { ...patch, version: versionRef.current });
    versionRef.current = next.version;
    // O texto local continua mandando (o mestre pode ter digitado durante o
    // envio); do servidor vêm só versão, datas e o carimbo dos segredos.
    setLocal(mergeServerMeta(entryRef.current || {}, next));
    setError('');
    onSaved?.(next);
    return next;
  }, [entryId, onSaved]);

  const autosave = useAutosave(save, {
    isConflict,
    onError: (e) => {
      if (isConflict(e)) setConflict(e.data.entry);
      else setError(worldErrorText(e, lang));
    },
  });

  const set = (patch) => {
    if (!entryRef.current) return;
    setLocal({ ...entryRef.current, ...patch });
    autosave.queue(patch);
  };
  const setData = (patch) => {
    const data = { ...(entryRef.current?.data || {}), ...patch };
    for (const k of Object.keys(patch)) if (patch[k] === undefined || patch[k] === '') delete data[k];
    set({ data });
  };

  // ---------------------------------------------------------------- conflito
  const reloadFromServer = () => {
    autosave.discard();
    versionRef.current = conflict.version;
    setLocal(conflict);
    onSaved?.(conflict);
    setConflict(null);
  };
  const keepMine = () => {
    versionRef.current = conflict.version;
    // O que está pendente é meu; o resto passa a ser o que está no servidor.
    const mine = {};
    for (const k of Object.keys(autosave.peek())) mine[k] = entryRef.current?.[k];
    setLocal({ ...conflict, ...mine });
    setConflict(null);
    autosave.resume();
  };

  // ---------------------------------------------------------------- revelar (servidor)
  const afterReveal = (next) => {
    versionRef.current = next.version;
    setLocal({ ...next, ...pickText(entryRef.current || {}) });
    onSaved?.(next);
  };
  const beforeReveal = () => autosave.flush();
  const rv = useReveal(entry, lang, afterReveal, beforeReveal);

  // ---------------------------------------------------------------- imagem
  const pickImage = () => fileRef.current?.click();
  const onFile = async (file) => {
    if (!file) return;
    setImgBusy(true); setError('');
    try {
      const url = await compressForEntry(file, { kind: entryRef.current.kind, isMap: !!entryRef.current.data?.map });
      const r = await putEntryImage(entryId, url);
      const next = { ...entryRef.current, imageVer: r.imageVer, imageUrl: r.imageUrl };
      setLocal(next);
      onSaved?.(next);
    } catch (e) {
      setError(worldErrorText(e, lang));
    } finally {
      setImgBusy(false);
    }
  };
  const removeImage = async () => {
    if (!(await confirm({ title: t(lang, 'Remover imagem?', 'Remove image?'), confirmLabel: t(lang, 'Remover', 'Remove'), danger: true, lang }))) return;
    setImgBusy(true);
    try {
      await deleteEntryImage(entryId);
      const next = { ...entryRef.current, imageVer: '', imageUrl: null };
      setLocal(next);
      onSaved?.(next);
    } catch (e) { setError(worldErrorText(e, lang)); } finally { setImgBusy(false); }
  };

  // ---------------------------------------------------------------- apagar
  const remove = async () => {
    const ok = await confirm({
      title: t(lang, `Apagar "${entry.name}"?`, `Delete "${entry.name}"?`),
      message: t(lang, 'O cartão some do mundo, dos mapas e das relações. Não dá para desfazer.', 'The card disappears from the world, maps and relations. This cannot be undone.'),
      confirmLabel: t(lang, 'Apagar cartão', 'Delete card'), danger: true, lang,
    });
    if (!ok) return;
    autosave.discard();
    try { await deleteEntry(entryId); onDeleted?.(entryId); } catch (e) { setError(worldErrorText(e, lang)); }
  };

  // ---------------------------------------------------------------- itens da campanha (para "item")
  useEffect(() => {
    if (entry?.kind !== 'item' || items) return;
    api.campaignItems(campaign.id).then(r => setItems(r.items || [])).catch(() => setItems([]));
  }, [entry?.kind, campaign?.id, items]);

  const tagSuggestions = useMemo(() => allTags(entries), [entries]);
  const back = useMemo(() => (entry ? backlinks(entries, entry.id, adventures) : []), [entries, entry?.id, adventures]); // eslint-disable-line react-hooks/exhaustive-deps
  const kids = useMemo(() => (entry ? childrenOf(entries, entry.id) : []), [entries, entry?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Esc fecha (salvando antes)
  const close = useCallback(async () => { await autosave.flush(); onClose?.(); }, [autosave, onClose]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('.confirm-dialog-host')) close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // ---------------------------------------------------------------- render
  if (loadError) {
    return (
      <EditorShell onClose={onClose} lang={lang}>
        <p className="wl-error" role="alert">{loadError}</p>
      </EditorShell>
    );
  }
  if (!entry) {
    return <EditorShell onClose={onClose} lang={lang}><p className="wl-muted">{t(lang, 'Abrindo cartão…', 'Opening card…')}</p></EditorShell>;
  }

  const meta = KIND_META[entry.kind] || KIND_META.lore;
  const d = entry.data || {};
  const secrets = entry.secrets || [];
  const isPlace = entry.kind === 'place';
  const isMap = isPlace && !!d.map;
  const members = (campaign?.members || []).filter(m => m.role !== 'dm');

  const setSecrets = (list) => set({ secrets: list });
  const addSecret = () => {
    if (secrets.length >= 20) return;
    setSecrets([...secrets, { id: freshId('s', secrets.map(s => s.id)), text: '', revealed: false }]);
  };

  return (
    <EditorShell onClose={close} lang={lang} kindColor={meta.color}
      status={<span className={`wl-save wl-save-${autosave.state}`} aria-live="polite">{autosave.state === 'saved' ? '✓ ' : ''}{saveStateLabel(autosave.state, lang)}</span>}>
      {conflict && (
        <div className="wl-conflict" role="alert">
          <strong>{t(lang, 'Alguém alterou — recarregar?', 'Someone changed it — reload?')}</strong>
          <p>{t(lang, 'Este cartão foi alterado em outra aba ou aparelho. Seu texto continua aqui até você escolher.', 'This card was changed in another tab or device. Your text stays here until you choose.')}</p>
          <div className="wl-row">
            <button type="button" className="btn btn-primary btn-sm" onClick={reloadFromServer}>{t(lang, 'Recarregar', 'Reload')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={keepMine}>{t(lang, 'Manter o meu', 'Keep mine')}</button>
          </div>
        </div>
      )}

      {/* ----- cabeçalho: imagem + nome */}
      <div className={`wl-ed-hero${entry.kind === 'npc' ? ' is-portrait' : ''}`}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}>
        <EntryImage entry={entry} className="wl-ed-img" alt="" />
        <div className="wl-ed-hero-fade" aria-hidden="true" />
        <div className="wl-ed-hero-actions">
          <button type="button" className="wl-chipbtn" onClick={pickImage} disabled={imgBusy}>
            {imgBusy ? t(lang, 'Enviando…', 'Uploading…') : entry.imageVer ? t(lang, '🖼 Trocar imagem', '🖼 Change image') : (entry.kind === 'npc' ? t(lang, '🖼 Subir retrato', '🖼 Upload portrait') : t(lang, '🖼 Subir imagem', '🖼 Upload image'))}
          </button>
          {entry.imageVer && <button type="button" className="wl-chipbtn" onClick={removeImage} disabled={imgBusy}>{t(lang, 'Remover', 'Remove')}</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; onFile(f); }} />
        </div>
        <span className="wl-kind-badge"><span aria-hidden="true">{meta.icon}</span> {kindLabel(entry.kind, lang)}</span>
        <VisibilitySeal visibility={entry.visibility} lang={lang} />
      </div>

      <input className="wl-ed-name" value={entry.name} maxLength={120} autoFocus={autoFocusName}
        aria-label={t(lang, 'Nome', 'Name')} placeholder={t(lang, 'Nome', 'Name')}
        onChange={e => set({ name: e.target.value })}
        onBlur={e => { if (!e.target.value.trim()) set({ name: t(lang, 'Sem nome', 'Untitled') }); }} />
      <input className="wl-ed-summary" value={entry.summary || ''} maxLength={280}
        aria-label={t(lang, 'Frase curta', 'Short tagline')}
        placeholder={summaryPlaceholder(entry.kind, lang)}
        onChange={e => set({ summary: e.target.value })} />

      {error && <p className="wl-error" role="alert">{error}</p>}

      {/* ----- revelar */}
      <RevealControl entry={entry} lang={lang} onChange={afterReveal} beforeReveal={beforeReveal} reveal={rv} />

      <div className="wl-ed-quick">
        {onShow && (
          <button type="button" className="btn btn-ghost btn-sm" disabled={entry.visibility === 'hidden'} onClick={() => onShow(entry)}
            title={entry.visibility === 'hidden' ? t(lang, 'Revele antes de mostrar no telão', 'Reveal before showing on screen') : ''}>
            📺 {t(lang, 'Mostrar no telão', 'Show on screen')}
          </button>
        )}
        {isPlace && (isMap
          ? <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await autosave.flush(); onOpenMap?.(entry.id); }}>🗺 {t(lang, 'Abrir mapa', 'Open map')}</button>
          : <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setData({ map: { pins: [] } }); if (!entry.imageVer) pickImage(); }}
            title={t(lang, 'A imagem deste lugar vira um mapa com marcadores', "This place's image becomes a map with pins")}>
            🗺 {t(lang, 'Usar imagem como mapa', 'Use image as map')}
          </button>)}
      </div>

      {/* ----- mais detalhes */}
      <button type="button" className="wl-more-toggle" aria-expanded={showMore} onClick={() => setShowMore(v => !v)}>
        <span aria-hidden="true">{showMore ? '▾' : '▸'}</span> {t(lang, 'Mais detalhes', 'More details')}
        {!showMore && <span className="wl-muted wl-small"> — {t(lang, 'texto, segredos, notas, relações…', 'text, secrets, notes, relations…')}</span>}
      </button>

      {showMore && (
        <div className="wl-ed-more">
          <KindFields entry={entry} lang={lang} setData={setData} items={items} members={members} />

          <section className="wl-ed-sec">
            <MentionTextarea id={`wl-body-${entry.id}`} label={t(lang, 'Texto para os jogadores', 'Text for the players')}
              value={entry.body || ''} onChange={v => set({ body: v })} entries={entries} selfId={entry.id} lang={lang} rows={6}
              placeholder={t(lang, 'O que os jogadores descobrem quando este cartão for revelado…', 'What the players learn once this card is revealed…')} />
          </section>

          <section className="wl-ed-sec wl-ed-secrets">
            <div className="wl-ed-sec-head">
              <h4>🗝 {t(lang, 'Segredos', 'Secrets')}</h4>
            </div>
            <p className="wl-hint">{t(lang, 'Revele cada segredo separadamente, quando quiser. Ótimo para pistas. A caixa "Registrar na Crônica" lá em cima vale também para os segredos.', 'Reveal each secret separately, whenever you want. Great for clues. The "Log in the Chronicle" box above also applies to secrets.')}</p>
            {secrets.some(s => s.revealed) && (entry.visibility || 'hidden') !== 'revealed' && (
              <p className="wl-secret-warn" role="note">
                ⚠ {entry.visibility === 'partial'
                  ? t(lang, 'O cartão está "Conhecido de nome": os jogadores só veem os segredos revelados quando ele estiver "Revelado".', 'The card is "Known by name": players only see revealed secrets once it is "Revealed".')
                  : t(lang, 'O cartão está oculto: os jogadores ainda não veem os segredos revelados.', 'The card is hidden: players cannot see revealed secrets yet.')}
              </p>
            )}
            {secrets.map((s, i) => (
              <div key={s.id || i} className={`wl-secret${s.revealed ? ' is-revealed' : ''}`}>
                <textarea rows={2} value={s.text} maxLength={1000} placeholder={t(lang, 'Ex.: Borin guarda a chave da cripta.', 'E.g.: Borin keeps the crypt key.')}
                  onChange={e => setSecrets(secrets.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                <div className="wl-secret-actions">
                  {s.revealed && (
                    <span className={`wl-secret-badge${entry.visibility === 'revealed' ? '' : ' is-waiting'}`}>
                      {entry.visibility === 'revealed' ? t(lang, 'Revelado', 'Revealed') : t(lang, 'Revelado (cartão ainda não)', 'Revealed (card not yet)')}
                      {s.session ? ` · ${t(lang, 'sessão', 'session')} ${s.session}` : ''}
                    </span>
                  )}
                  <button type="button" className={`btn btn-sm ${s.revealed ? 'btn-ghost' : 'btn-primary'}`} disabled={rv.busy || !s.text.trim()}
                    onClick={() => rv.toggleSecret(s.id, !s.revealed)}>
                    {s.revealed ? t(lang, 'Ocultar', 'Hide') : t(lang, 'Revelar', 'Reveal')}
                  </button>
                  <button type="button" className="wl-x" aria-label={t(lang, 'Apagar segredo', 'Delete secret')}
                    onClick={() => setSecrets(secrets.filter((_, j) => j !== i))}>×</button>
                </div>
              </div>
            ))}
            {rv.error && <p className="wl-error">{rv.error}</p>}
            {secrets.length < 20 && <button type="button" className="btn btn-ghost btn-sm" onClick={addSecret}>＋ {t(lang, 'Segredo', 'Secret')}</button>}
          </section>

          <section className="wl-ed-sec wl-ed-notes">
            <label className="wl-label" htmlFor={`wl-notes-${entry.id}`}>🔒 {t(lang, 'Notas do mestre', 'DM notes')} <span className="wl-muted wl-small">— {t(lang, 'só você vê, sempre', 'only you, always')}</span></label>
            <textarea id={`wl-notes-${entry.id}`} rows={4} value={entry.dmNotes || ''} onChange={e => set({ dmNotes: e.target.value })}
              placeholder={t(lang, 'Motivações escondidas, estatísticas, ganchos…', 'Hidden motives, stats, hooks…')} />
          </section>

          <section className="wl-ed-sec">
            <label className="wl-label">{entry.kind === 'npc' || entry.kind === 'item' ? t(lang, 'Onde está', 'Where it is') : t(lang, 'Fica em / pertence a', 'Located in / belongs to')}</label>
            <EntryPicker entries={entries} value={entry.parentId || null} onChange={v => set({ parentId: v })} exclude={[entry.id]} lang={lang}
              placeholder={t(lang, 'Nenhum lugar', 'No place')} />
            {kids.length > 0 && (
              <div className="wl-kids">
                <span className="wl-muted wl-small">{t(lang, 'Aqui dentro:', 'Inside:')}</span>
                {kids.map(k => <button key={k.id} type="button" className="wl-tag" onClick={() => onOpenEntry?.(k.id)}>{kindIcon(k.kind)} {k.name}</button>)}
              </div>
            )}
          </section>

          <section className="wl-ed-sec">
            <label className="wl-label">{t(lang, 'Relações', 'Relations')}</label>
            <RelationsEditor links={entry.links || []} onChange={links => set({ links })} entries={entries} selfId={entry.id} lang={lang} onOpen={onOpenEntry} />
          </section>

          <section className="wl-ed-sec wl-ed-grid">
            <div>
              <label className="wl-label">{t(lang, 'Tags', 'Tags')}</label>
              <TagsInput value={entry.tags || []} onChange={tags => set({ tags })} lang={lang} suggestions={tagSuggestions} />
            </div>
            <div>
              <label className="wl-label" htmlFor={`wl-when-${entry.id}`}>⌛ {t(lang, 'Quando (linha do tempo)', 'When (timeline)')}</label>
              <input id={`wl-when-${entry.id}`} value={entry.whenLabel || ''} maxLength={60} onChange={e => set({ whenLabel: e.target.value })}
                placeholder={t(lang, 'Ex.: Ano 312 da Coroa', 'E.g.: Year 312 of the Crown')} />
            </div>
          </section>

          {back.length > 0 && (
            <section className="wl-ed-sec">
              <label className="wl-label">{t(lang, 'Aparece em', 'Appears in')}</label>
              <ul className="wl-backlinks">
                {back.map((b, i) => (
                  <li key={i}>
                    {b.entry ? (
                      <button type="button" className="wl-tag" onClick={() => onOpenEntry?.(b.entry.id)}>
                        {kindIcon(b.entry.kind)} {b.entry.name}
                        <span className="wl-muted"> · {backVia(b, lang)}</span>
                      </button>
                    ) : (
                      <span className="wl-tag">🧭 {b.adventure.name} › {b.node.name || b.node.title || b.node.id}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="wl-ed-sec wl-ed-kind">
            <label className="wl-label" htmlFor={`wl-kind-${entry.id}`}>{t(lang, 'Tipo do cartão', 'Card type')}</label>
            <select id={`wl-kind-${entry.id}`} value={entry.kind} onChange={e => set({ kind: e.target.value })}>
              {KINDS.map(k => <option key={k} value={k}>{kindIcon(k)} {kindLabel(k, lang)}</option>)}
            </select>
          </section>
        </div>
      )}

      <div className="wl-ed-foot">
        <button type="button" className="btn btn-danger btn-sm" onClick={remove}>{t(lang, 'Apagar cartão', 'Delete card')}</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={close}>{t(lang, 'Pronto', 'Done')}</button>
      </div>
    </EditorShell>
  );
}

/** Depois de um PATCH: mantém o que está na tela e pega do servidor só os metadados. */
function mergeServerMeta(cur, next) {
  const bySid = new Map((next.secrets || []).map(s => [s.id, s]));
  return {
    ...cur,
    version: next.version, updatedAt: next.updatedAt, revealedAt: next.revealedAt, visibility: next.visibility,
    mentions: next.mentions, secretsCount: next.secretsCount, secretsRevealed: next.secretsRevealed, isMap: next.isMap,
    secrets: (cur.secrets || []).map(s => {
      const srv = bySid.get(s.id);
      return srv ? { ...s, revealed: srv.revealed, session: srv.session, revealedAt: srv.revealedAt } : s;
    }),
  };
}

/** Textos da tela (preservados quando o servidor devolve a entrada após revelar). */
function pickText(cur) {
  const out = {};
  for (const k of ['name', 'summary', 'body', 'dmNotes', 'whenLabel']) if (k in cur) out[k] = cur[k];
  return out;
}

function summaryPlaceholder(kind, lang) {
  return {
    npc: t(lang, 'Uma frase: quem é e por que importa', 'One line: who they are and why they matter'),
    place: t(lang, 'Uma frase: como é este lugar', 'One line: what this place is like'),
    faction: t(lang, 'Uma frase: o que este grupo quer', 'One line: what this group wants'),
    item: t(lang, 'Uma frase: o que chama atenção neste item', 'One line: what stands out about this item'),
    lore: t(lang, 'Uma frase: o que se conta por aí', 'One line: what people say'),
    handout: t(lang, 'Uma frase: o que está escrito', 'One line: what it says'),
  }[kind] || t(lang, 'Frase curta', 'Short tagline');
}

function backVia(b, lang) {
  if (b.via === 'link') return relLabel(b.rel, lang).toLowerCase();
  if (b.via === 'mention') return t(lang, 'menciona', 'mentions');
  if (b.via === 'parent') return t(lang, 'fica aqui', 'is here');
  if (b.via === 'pin') return t(lang, 'no mapa', 'on the map');
  return '';
}

function EditorShell({ children, onClose, lang, status, kindColor }) {
  return (
    <aside className="wl-editor" role="dialog" aria-modal="false" aria-label={t(lang, 'Editar cartão', 'Edit card')} style={kindColor ? { '--wl-kind': kindColor } : undefined}>
      <div className="wl-editor-top">
        {status}
        <button type="button" className="wl-editor-close" onClick={onClose} aria-label={t(lang, 'Fechar', 'Close')}>×</button>
      </div>
      <div className="wl-editor-body">{children}</div>
    </aside>
  );
}

function KindFields({ entry, lang, setData, items, members }) {
  const d = entry.data || {};
  const field = (key, label, ph, rows) => (
    <div className="wl-field" key={key}>
      <label className="wl-label" htmlFor={`wl-${key}-${entry.id}`}>{label}</label>
      {rows
        ? <textarea id={`wl-${key}-${entry.id}`} rows={rows} value={d[key] || ''} placeholder={ph} onChange={e => setData({ [key]: e.target.value })} />
        : <input id={`wl-${key}-${entry.id}`} value={d[key] || ''} placeholder={ph} onChange={e => setData({ [key]: e.target.value })} />}
    </div>
  );
  switch (entry.kind) {
    case 'npc':
      return (
        <section className="wl-ed-sec wl-ed-grid">
          {field('role', t(lang, 'Papel / ocupação', 'Role / occupation'), t(lang, 'Taverneiro, vilã, guarda…', 'Innkeeper, villain, guard…'))}
          {field('wants', t(lang, 'O que deseja', 'What they want'), t(lang, 'Desejo que move o NPC', 'The desire that drives them'))}
          {field('appearance', t(lang, 'Aparência', 'Appearance'), t(lang, 'O que os heróis notam primeiro', 'What the heroes notice first'), 2)}
          {field('mannerism', t(lang, 'Maneirismo', 'Mannerism'), t(lang, 'Um jeito de falar ou agir para interpretar', 'A way of talking or acting to roleplay'), 2)}
        </section>
      );
    case 'place':
      return (
        <section className="wl-ed-sec">
          <label className="wl-label">{t(lang, 'Tipo de lugar', 'Place type')}</label>
          <div className="wl-chips">
            {PLACE_TYPES.map(p => (
              <button key={p} type="button" className={`wl-chip${d.placeType === p ? ' is-on' : ''}`} onClick={() => setData({ placeType: d.placeType === p ? undefined : p })}>
                {placeTypeLabel(p, lang)}
              </button>
            ))}
          </div>
        </section>
      );
    case 'faction':
      return (
        <section className="wl-ed-sec wl-ed-grid">
          {field('goal', t(lang, 'Objetivo', 'Goal'), t(lang, 'O que a facção quer conseguir', 'What the faction wants to achieve'), 2)}
          <div className="wl-field">
            <label className="wl-label" htmlFor={`wl-color-${entry.id}`}>{t(lang, 'Cor do símbolo', 'Symbol color')}</label>
            <input id={`wl-color-${entry.id}`} type="color" value={d.symbolColor || '#b8862b'} onChange={e => setData({ symbolColor: e.target.value })} className="wl-color" />
          </div>
        </section>
      );
    case 'item':
      return (
        <section className="wl-ed-sec wl-ed-grid">
          <div className="wl-field">
            <label className="wl-label" htmlFor={`wl-rarity-${entry.id}`}>{t(lang, 'Raridade', 'Rarity')}</label>
            <select id={`wl-rarity-${entry.id}`} value={d.rarity || ''} onChange={e => setData({ rarity: e.target.value || undefined })}>
              <option value="">—</option>
              {RARITIES.map(r => <option key={r} value={r}>{rarityLabel(r, lang)}</option>)}
            </select>
          </div>
          <label className="wl-check">
            <input type="checkbox" checked={!!d.attunement} onChange={e => setData({ attunement: e.target.checked || undefined })} />
            <span>{t(lang, 'Exige sintonia', 'Requires attunement')}</span>
          </label>
          {field('effect', t(lang, 'Efeito', 'Effect'), t(lang, 'O que o item faz', 'What the item does'), 3)}
          <div className="wl-field">
            <label className="wl-label" htmlFor={`wl-ci-${entry.id}`}>{t(lang, 'Item do catálogo da campanha', 'Campaign catalog item')}</label>
            <select id={`wl-ci-${entry.id}`} value={d.campaignItemId || ''} onChange={e => setData({ campaignItemId: e.target.value ? Number(e.target.value) : undefined })}>
              <option value="">{items == null ? t(lang, 'Carregando…', 'Loading…') : t(lang, '— nenhum —', '— none —')}</option>
              {(items || []).map(it => <option key={it.id} value={it.id}>{it.name || it.item?.name || `#${it.id}`}</option>)}
            </select>
            <div className="wl-hint">{t(lang, 'Ligue ao catálogo para poder entregar o item mecânico a um jogador.', 'Link to the catalog to hand the mechanical item to a player.')}</div>
          </div>
        </section>
      );
    case 'handout': {
      const rec = d.recipients === undefined ? 'all' : d.recipients;
      const list = Array.isArray(rec) ? rec : [];
      return (
        <section className="wl-ed-sec">
          <label className="wl-label">{t(lang, 'Estilo', 'Style')}</label>
          <div className="wl-chips">
            {HANDOUT_STYLES.map(s => (
              <button key={s} type="button" className={`wl-chip${(d.style || 'scroll') === s ? ' is-on' : ''}`} onClick={() => setData({ style: s })}>{handoutStyleLabel(s, lang)}</button>
            ))}
          </div>
          <label className="wl-label">{t(lang, 'Para quem', 'For whom')}</label>
          <div className="wl-chips">
            <button type="button" className={`wl-chip${rec === 'all' ? ' is-on' : ''}`} onClick={() => setData({ recipients: 'all' })}>{t(lang, 'Todos', 'Everyone')}</button>
            {members.map(m => {
              const on = list.includes(m.id);
              return (
                <button key={m.id} type="button" className={`wl-chip${on ? ' is-on' : ''}`}
                  onClick={() => {
                    const next = on ? list.filter(x => x !== m.id) : [...list, m.id];
                    setData({ recipients: next.length ? next : 'all' });
                  }}>
                  {m.character?.name || m.user?.displayName || '—'}
                </button>
              );
            })}
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}
