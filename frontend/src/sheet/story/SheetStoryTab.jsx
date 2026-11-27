import { useState, useContext, useRef, useLayoutEffect } from 'react';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import { SpeciesChoicesModal } from '../../progression/SpeciesChoices.jsx';
import { speciesSummary } from '../../progression/species-summary.js';
import { speciesChoiceSpecs, speciesGrants } from '../../progression/species.js';
import { RespecContext } from '../../progression/respec.js';
import FhTitle from '../FhTitle.jsx';
import FhFeatures from '../FhFeatures.jsx';
import { RichText } from '../rich-text.jsx';
import { useSheetToast } from '../sheet-toast.jsx';
import { undoRemoval } from '../sheet-undo-helpers.js';
const AutoTextarea = ({ value, minRows = 2, ...props }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={ref} rows={minRows} value={value} {...props} />;
};

// ===== Story =====
// Três painéis em vez de uma parede de 15 caixas: Personalidade, História e Aparência.
// Cada campo vazio tem uma pergunta que ajuda a escrever (placeholder).
const STORY_HINT = {
  personality: ['O que seu herói faz quando ninguém está olhando? Um jeito, um hábito, uma mania.', 'What does your hero do when no one is watching? A manner, a habit, a quirk.'],
  ideals: ['No que ele acredita a ponto de arriscar a vida?', 'What does the hero believe in enough to risk their life?'],
  bonds: ['Uma pessoa, um lugar ou uma promessa que ele não abandona.', 'A person, a place or a promise the hero will not abandon.'],
  flaws: ['A fraqueza que um inimigo esperto usaria contra ele.', 'The weakness a clever enemy would use against the hero.'],
  backstory: ['De onde veio, o que perdeu, por que saiu para a estrada.', 'Where they came from, what they lost, why they took to the road.'],
  allies: ['Guildas, ordens, famílias e contatos que conhecem o herói.', 'Guilds, orders, families and contacts that know the hero.'],
  treasure: ['Lembranças e riquezas que não são equipamento: uma carta, uma joia de família.', 'Keepsakes and riches that are not gear: a letter, a family jewel.'],
  appearance: ['O que se nota primeiro: cicatrizes, roupas, o jeito de andar.', 'What people notice first: scars, clothes, the way they walk.'],
  symbol: ['Ex.: brasão da família, símbolo sagrado, marca da guilda.', 'E.g. family crest, holy symbol, guild mark.'],
};
export const SheetStory = ({ char, lang, update, cls, race }) => {
  const pt = lang === 'pt';
  const hint = (f) => STORY_HINT[f]?.[pt ? 0 : 1];
  const area = (field, long = false, label = null) => (
    <div key={field} className="fh-field">
      <label htmlFor={`story-${field}`}>{label || t(field, lang)}</label>
      <AutoTextarea id={`story-${field}`} minRows={long ? 5 : 2} value={char[field] || ''} placeholder={hint(field)}
        onChange={e => update({ [field]: e.target.value })} className={long ? 'is-long' : undefined} />
    </div>
  );
  return (
    <div className="fh-story-grid">
      <div className="fh-story-col">
        <section className="fh-panel fh-story">
          <FhTitle sub={pt ? 'quem o herói é' : 'who the hero is'}>{pt ? 'Personalidade' : 'Personality'}</FhTitle>
          <div className="fh-story-fields is-quad">
            {['personality', 'ideals', 'bonds', 'flaws'].map(f => area(f))}
          </div>
        </section>
        <section className="fh-panel fh-story">
          <FhTitle sub={pt ? 'como os outros o veem' : 'how others see the hero'}>{t('appearance', lang)}</FhTitle>
          {/* Campos de pergaminho escuro com filete dourado (src/sheet/ficha.css: .fh-story) */}
          <div className="fh-story-fields">
            {area('appearance', false, pt ? 'Descrição física' : 'Physical description')}
            <div className="fh-story-short">
              {['age','height','weight','eyes','skin','hair'].map(f => (
                <div key={f} className="fh-field">
                  <label htmlFor={`story-${f}`}>{t(f, lang)}</label>
                  <input id={`story-${f}`} value={char[f] || ''} onChange={e => update({ [f]: e.target.value })}/>
                </div>
              ))}
            </div>
            <div className="fh-field">
              <label htmlFor="story-symbol">{t('symbol', lang)}</label>
              <input id="story-symbol" value={char.symbol || ''} placeholder={hint('symbol')} onChange={e => update({ symbol: e.target.value })}/>
            </div>
          </div>
        </section>
      </div>
      <div className="fh-story-col">
        <section className="fh-panel fh-story">
          <FhTitle sub={pt ? 'de onde veio e quem conhece' : 'where they came from and who they know'}>{t('stepStory', lang)}</FhTitle>
          <div className="fh-story-fields">
            {area('backstory', true)}
            {area('allies')}
            {area('treasure')}
          </div>
        </section>
      </div>
    </div>
  );
};

// Traços da espécie + resumo das escolhas (linhagem, resistências, magias…).
// Em campanha a troca fica com o mestre; pendências aparecem na faixa do topo.
export const SpeciesTraits = ({ char, lang, update, race, hideTraits = false, embedded = false }) => {
  const [open, setOpen] = useState(false);
  const rows = speciesSummary(char, lang);
  // Numa campanha a troca vira pedido ao mestre (RespecContext); fora dela salva direto.
  const respec = useContext(RespecContext);
  const canEdit = speciesChoiceSpecs(char).length > 0 && (!char.inCampaign || !!respec);
  // na aba Características os traços vão para a linha do tempo; aqui ficam as escolhas
  const traits = hideTraits ? [] : (race?.traits || []);

  if (hideTraits && !rows.length && !canEdit) return null;
  // `embedded`: dentro do nível 1 da linha do tempo (sem painel; título pequeno)
  const Shell = embedded ? 'div' : 'section';
  return (
    <Shell className={embedded ? 'fh-tl-embed fh-tl-species' : 'fh-panel'}>
      {embedded ? <div className="fh-tl-embed-h">{lang === 'pt' ? 'Escolhas da espécie' : 'Species choices'}</div> : <FhTitle>{lang === 'pt' ? (hideTraits ? 'Escolhas da Espécie' : 'Traços da Espécie') : (hideTraits ? 'Species Choices' : 'Species Traits')}</FhTitle>}
      {(rows.length > 0 || canEdit) && (
        <div className="card fh-species-sum">
          {rows.map(([k, v]) => (
            <div key={k} className="fh-species-row">
              <strong>{k}:</strong> <span>{v}</span>
            </div>
          ))}
          {canEdit && (
            <button className="btn btn-sm btn-ghost no-print" onClick={() => setOpen(true)}>
              <Icon name="edit" size={12}/> {lang === 'pt' ? 'Alterar escolhas' : 'Change choices'}
            </button>
          )}
        </div>
      )}
      {/* Traços em linhas (losango + nome); os de nível futuro esmaecidos, com "· nível N" */}
      <div className="fh-traits fh-feats">
        {traits.map((tr, i) => {
          const later = tr.level && (char.level || 1) < tr.level;
          const trName = typeof tr?.name === 'object' ? (tr.name[lang] || tr.name.pt || tr.name.en) : (tr?.name || '');
          const trDesc = typeof tr?.desc === 'object' ? (tr.desc[lang] || tr.desc.pt || tr.desc.en) : (tr?.desc || '');
          return (
            <div key={i} className={`fh-trait${later ? ' is-later' : ''}`}>
              <div className="fh-trait-name">
                <span>{trName}</span>
                {tr.level ? <span className="fh-origin">{lang === 'pt' ? 'nível' : 'level'} {tr.level}</span> : null}
              </div>
              <RichText className="fh-trait-text" text={trDesc} lang={lang} />
            </div>
          );
        })}
      </div>
      {open && <SpeciesChoicesModal char={char} lang={lang} onClose={() => setOpen(false)} askDm={!!(char.inCampaign && respec)}
        onSave={char.inCampaign && respec ? (patch) => respec.submit({ ...char, ...patch }, lang === 'pt' ? 'Escolhas da espécie' : 'Species choices') : update} />}
    </Shell>
  );
};

// ===== Notes / Journal =====
// Data da anotação como "dd/mm/aaaa · hh:mm" (o id é o instante em que ela nasceu; notas
// antigas só têm o texto da data, com segundos: tira os segundos).
const noteDateLabel = (n, lang) => {
  if (typeof n.id === 'number' && n.id > 1e11) {
    const d = new Date(n.id);
    const loc = lang === 'pt' ? 'pt-BR' : 'en-US';
    return `${d.toLocaleDateString(loc)} · ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`;
  }
  return String(n.date || '').replace(/(\d{1,2}:\d{2}):\d{2}/, '$1').replace(', ', ' · ');
};

export const SheetNotes = ({ char, lang, update }) => {
  const pt = lang === 'pt';
  const toast = useSheetToast();
  const [fresh, setFresh] = useState(null); // anotação recém-criada: o cursor já entra nela
  const notes = char.notes || [];
  const addNote = () => {
    const id = Date.now();
    const date = new Date(id).toLocaleString(pt ? 'pt-BR' : 'en-US');
    setFresh(id);
    update({ notes: [{ id, date, text: '' }, ...notes] });
  };
  const updateNote = (id, text) => {
    update({ notes: char.notes.map(n => n.id === id ? { ...n, text } : n) });
  };
  // Apagar: anotação com texto pede confirmação; toda exclusão pode ser desfeita no aviso.
  const removeNote = async (n) => {
    if ((n.text || '').trim()) {
      const ok = await confirmDialog({
        lang, danger: true,
        title: pt ? 'Excluir esta anotação?' : 'Delete this note?',
        message: (n.text || '').trim().slice(0, 140) + ((n.text || '').trim().length > 140 ? '…' : ''),
        confirmLabel: pt ? 'Excluir' : 'Delete',
      });
      if (!ok) return;
    }
    const idx = notes.findIndex(x => x.id === n.id);
    update({ notes: notes.filter(x => x.id !== n.id) });
    undoRemoval(toast, 'notes', Math.max(0, idx), n, pt ? 'Anotação excluída.' : 'Note deleted.');
  };
  const addBtn = (
    <button className="btn btn-primary btn-sm fh-note-add" onClick={addNote}>
      <Icon name="plus" size={14}/> {pt ? 'Adicionar anotação' : 'Add note'}
    </button>
  );

  return (
    <section className="fh-panel fh-notes">
      <FhTitle act={notes.length > 0 ? addBtn : null}>{t('tabNotes', lang)}</FhTitle>
      {notes.length === 0 && (
        <div className="fh-empty-state is-cta">
          <p>{pt ? 'Nenhuma anotação ainda. Registre o que aconteceu na sessão: pistas, nomes, promessas.' : 'No notes yet. Write down what happened in the session: clues, names, promises.'}</p>
          {addBtn}
        </div>
      )}
      {/* Cada anotação é uma página de pergaminho escuro, com a data em mono */}
      {notes.map(n => {
        const when = noteDateLabel(n, lang);
        return (
          <div key={n.id} className="card fh-note">
            <div className="fh-note-head">
              <span className="fh-note-date mono">{when}</span>
              <button className="btn btn-icon btn-ghost btn-danger" onClick={() => removeNote(n)} aria-label={pt ? `Excluir anotação de ${when}` : `Delete note from ${when}`} title={pt ? 'Excluir anotação' : 'Delete note'}>
                <Icon name="trash" size={14}/>
              </button>
            </div>
            <AutoTextarea minRows={3} autoFocus={fresh === n.id}
              aria-label={pt ? `Anotação de ${when}` : `Note from ${when}`} value={n.text} onChange={e => updateNote(n.id, e.target.value)}
              placeholder={pt ? 'Aventura, encontro, descoberta...' : 'Adventure, encounter, discovery...'}/>
          </div>
        );
      })}
    </section>
  );
};

// Desenho da miniatura de um item sem ilustração: um traço dourado pelo tipo (ou pelo nome,
// para o equipamento comum), no lugar do emoji colorido que destoava do couro e ouro.
