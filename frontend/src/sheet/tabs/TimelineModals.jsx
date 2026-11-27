import { useState } from 'react';
import Utils from '../../../utils.js';
import { tName } from '../../../data/i18n.js';
import { Modal } from '../../../components/Shared.jsx';
import { classSkillList, classSkillCount, classSkillPicks, toggleClassSkill, otherSkillSources } from '../../creator/class-helpers.js';
import { findBackground, backgroundList, backgroundTool, chosenBackgroundTools, toggleBackgroundTool, applyBackground } from '../../creator/background-helpers.js';
import { speciesChoiceIssues } from '../../progression/species.js';
import { featChoiceSpecs, featPicksIssues, featAsiIssues } from '../../progression/feat-rules.js';
import { AskDmNote, saveLabel } from '../sheet-shared.jsx';

export const TimelineClassSkillsModal = ({ char, lang, onConfirm, onClose, askDm = false }) => {
  const pt = lang === 'pt';
  const [draft, setDraft] = useState(() => ({ ...char }));
  const [busy, setBusy] = useState(false);
  const from = classSkillList(draft);
  const need = classSkillCount(draft);
  const picks = classSkillPicks(draft);
  const others = otherSkillSources(draft);
  const start = classStart(draft);
  const toolSpec = start?.tools;
  const toolPicks = Array.isArray(draft.creation?.toolChoices?.class) ? draft.creation.toolChoices.class : [];

  const toggleTool = (id) => {
    if (!toolSpec?.choose || !toolSpec.from?.includes(id)) return;
    const next = toolPicks.includes(id)
      ? toolPicks.filter(x => x !== id)
      : (toolSpec.choose === 1 ? [id] : (toolPicks.length < toolSpec.choose ? [...toolPicks, id] : toolPicks));
    const removed = toolPicks.filter(x => !next.includes(x) && !(toolSpec.fixed || []).includes(x));
    const toolProfs = [...new Set([...(draft.toolProfs || []).filter(x => !removed.includes(x)), ...next])];
    const creation = { ...(draft.creation || {}), toolChoices: { ...(draft.creation?.toolChoices || {}), class: next } };
    setDraft(d => ({ ...d, toolProfs, creation }));
  };

  const save = async () => {
    setBusy(true);
    try { await onConfirm(draft); onClose(); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={pt ? 'Perícias e ferramentas da classe' : 'Class skills & tools'}>
      {from.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {pt ? `Perícias da classe (${picks.length}/${need})` : `Class skills (${picks.length}/${need})`}
          </div>
          <div className="options-list cols-3">
            {from.map(id => {
              const on = picks.includes(id);
              const takenBy = others[id];
              const full = !on && picks.length >= need;
              return (
                <button key={id} type="button" className={`option${on ? ' selected' : ''}`}
                  disabled={!!takenBy || full}
                  onClick={() => setDraft(d => ({ ...d, ...toggleClassSkill(d, id) }))}>
                  <div>{tName('skill', id, lang)}</div>
                  {takenBy && <div className="text-xs muted">{pt ? 'já treinada' : 'already trained'}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {toolSpec?.choose > 0 && (toolSpec.from || []).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            {pt ? `Ferramentas da classe (${toolPicks.length}/${toolSpec.choose})` : `Class tools (${toolPicks.length}/${toolSpec.choose})`}
          </div>
          <div className="options-list cols-3">
            {toolSpec.from.map(id => {
              const on = toolPicks.includes(id);
              const full = !on && toolSpec.choose > 1 && toolPicks.length >= toolSpec.choose;
              return (
                <button key={id} type="button" className={`option${on ? ' selected' : ''}`}
                  disabled={full} onClick={() => toggleTool(id)}>
                  {toolName(id, lang)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {askDm && <AskDmNote lang={lang} />}
      <div className="row gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>{pt ? 'Cancelar' : 'Cancel'}</button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy || picks.length !== need} onClick={save}>
          {saveLabel(askDm, lang)}
        </button>
      </div>
    </Modal>
  );
};

// Modal de antecedente e escolhas (2014 e 2024: antecedente, bônus de atributo, ferramentas e idiomas).
export const TimelineBackgroundModal = ({ char, lang, onConfirm, onClose, askDm = false }) => {
  const pt = lang === 'pt';
  const [draft, setDraft] = useState(() => ({ ...char }));
  const [busy, setBusy] = useState(false);
  const bgs = backgroundList(draft);
  const bgTool = backgroundTool(draft);
  const bgToolPicked = chosenBackgroundTools(draft);
  const mode = bonusMode(draft);
  const savedBonus = bonusChoice(draft, mode);
  const activeBonus = (() => {
    if (savedBonus.pattern || mode.kind !== 'background' || !mode.from?.length) return savedBonus;
    const entries = Object.entries(draft.raceBonus || {}).filter(([k, v]) => mode.from.includes(k) && v > 0);
    const vals = entries.map(([, v]) => v);
    if (vals.filter(v => v === 2).length === 1 && vals.filter(v => v === 1).length === 1) {
      return { pattern: '2-1', picks: Object.fromEntries(entries) };
    }
    if (vals.length === 3 && vals.every(v => v === 1)) {
      return { pattern: '1-1-1', picks: Object.fromEntries(entries) };
    }
    return savedBonus;
  })();

  const setAbilityBonus = (pattern, picks) => {
    setDraft(d => ({ ...d, ...bonusPatch(d, { pattern, picks }) }));
  };
  const set21 = (ab, val) => {
    const cur = { ...(activeBonus.picks || {}) };
    if (val === 2) {
      for (const k of Object.keys(cur)) if (cur[k] === 2 && k !== ab) cur[k] = 1;
      cur[ab] = 2;
    } else {
      cur[ab] = cur[ab] === 1 ? undefined : 1;
    }
    const clean = Object.fromEntries(Object.entries(cur).filter(([, v]) => v === 1 || v === 2));
    // garante no máximo um +2 e um +1 no padrão 2-1
    const ones = Object.entries(clean).filter(([, v]) => v === 1).map(([k]) => k);
    while (ones.length > 1) delete clean[ones.shift()];
    setAbilityBonus('2-1', clean);
  };

  const issues = mode.kind === 'background' ? abilityBonusIssues(draft) : [];
  const save = async () => {
    setBusy(true);
    try { await onConfirm(draft); onClose(); } finally { setBusy(false); }
  };

  return (
    <Modal onClose={onClose} title={pt ? 'Antecedente e escolhas de origem' : 'Background & origin choices'}>
      <div style={{ maxHeight: '65vh', overflowY: 'auto', marginBottom: 12 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>{pt ? 'Antecedente' : 'Background'}</div>
        <div className="options-list cols-3" style={{ marginBottom: 14 }}>
          {bgs.map(b => (
            <button key={b.id} type="button" className={`option${draft.background === b.id ? ' selected' : ''}`}
              onClick={() => setDraft(d => ({ ...d, ...applyBackground(d, b.id) }))}>
              <div style={{ fontWeight: 600 }}>{b.name?.[lang] || b.id}</div>
              <div className="text-xs muted">{(b.skills || []).map(s => tName('skill', s, lang)).join(', ')}</div>
            </button>
          ))}
        </div>

        {mode.kind === 'background' && mode.from?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>{pt ? 'Atributos do antecedente (2024)' : 'Background abilities (2024)'}</div>
            <div className="row gap-2" style={{ marginBottom: 8 }}>
              <button type="button" className={`btn btn-sm ${activeBonus.pattern === '2-1' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAbilityBonus('2-1', activeBonus.pattern === '2-1' ? activeBonus.picks : {})}>
                +2 / +1
              </button>
              <button type="button" className={`btn btn-sm ${activeBonus.pattern === '1-1-1' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setAbilityBonus('1-1-1', Object.fromEntries(mode.from.map(k => [k, 1])))}>
                +1 / +1 / +1
              </button>
            </div>
            {activeBonus.pattern === '2-1' && (
              <div className="options-list cols-3">
                {mode.from.map(ab => {
                  const val = activeBonus.picks?.[ab] || 0;
                  return (
                    <div key={ab} className={`option${val ? ' selected' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span>{t(`${ab}Sh`, lang)}</span>
                      <div className="row gap-1">
                        <button type="button" className={`btn btn-sm ${val === 2 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set21(ab, 2)}>+2</button>
                        <button type="button" className={`btn btn-sm ${val === 1 ? 'btn-primary' : 'btn-ghost'}`} onClick={() => set21(ab, 1)}>+1</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {issues.length > 0 && <div className="text-xs" style={{ color: 'var(--blood-bright)', marginTop: 6 }}>{issues[0][lang]}</div>}
          </div>
        )}

        {bgTool.choose > 0 && (bgTool.from || []).length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {pt ? `Ferramenta do antecedente (${bgToolPicked.length}/${bgTool.choose})` : `Background tool (${bgToolPicked.length}/${bgTool.choose})`}
            </div>
            <div className="options-list cols-3">
              {bgTool.from.map(id => {
                const on = bgToolPicked.includes(id);
                const full = !on && bgTool.choose > 1 && bgToolPicked.length >= bgTool.choose;
                return (
                  <button key={id} type="button" className={`option${on ? ' selected' : ''}`}
                    disabled={full} onClick={() => setDraft(d => ({ ...d, ...toggleBackgroundTool(d, id) }))}>
                    {toolName(id, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{t('languages', lang)}</div>
          <LanguagePicker char={draft} lang={lang} chosen={chosenLanguages(draft)}
            onChange={langs => setDraft(d => ({ ...d, languages: Utils.withChosenLanguages(d, langs) }))} free />
        </div>
      </div>
      {askDm && <AskDmNote lang={lang} />}
      <div className="row gap-2">
        <button type="button" className="btn btn-ghost" onClick={onClose}>{pt ? 'Cancelar' : 'Cancel'}</button>
        <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy || !draft.background} onClick={save}>
          {saveLabel(askDm, lang)}
        </button>
      </div>
    </Modal>
  );
};

// JSON com as chaves em ordem (o servidor pode devolver o objeto com as chaves noutra ordem).
export const stableJson = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.keys(x).sort().reduce((o, k) => { o[k] = x[k]; return o; }, {}) : x));

// Escolhas pendentes da ficha, para o ponto na aba Características: as da engine (subclasse,
// ASI, opções de classe) mais as de origem que a linha do tempo marca com "Escolher agora"
// (perícias/ferramentas da classe, ferramenta e atributos do antecedente, espécie).
export const countPendingChoices = (char) => {
  if (!char?.className) return 0;
  const safe = (fn, d) => { try { return fn(); } catch { return d; } };
  let n = safe(() => (computeProgression(char).pendingChoices || []).length, 0);
  const start = safe(() => classStart(char), null);
  if (safe(() => classSkillPicks(char).length < classSkillCount(char), false)
    || (start?.tools?.choose > 0 && !(char.creation?.toolChoices?.class?.length))) n += 1;
  if (char.background) {
    const missingTool = safe(() => backgroundTool(char).choose > chosenBackgroundTools(char).length, false);
    const missingBonus = char.rulesVersion === '2024' && !Object.values(char.raceBonus || {}).some(Boolean);
    if (missingTool || missingBonus) n += 1;
  }
  n += safe(() => (Utils.speciesChoiceIssues(char).filter(i => !(char.inCampaign && (i.key === 'feat' || i.key === 'asi'))).length ? 1 : 0), 0);
  return n;
};

// Linha do tempo de traços (src/sheet/feature-timeline.js): classe/subclasse no nível do
// personagem em que vieram, espécie no nível de cada traço, talentos no nível em que
// substituíram o Aumento no Valor de Atributo. Um trilho dourado com os níveis à esquerda.
// `compact` (painel Progressão da aba Jogar): todos os níveis começam dobrados, menos os que
// têm escolha pendente, e o bloco de idiomas/proficiências/escolhas da espécie fica só na
// aba Características (é a mesma linha do tempo, lá aberta por inteiro).
