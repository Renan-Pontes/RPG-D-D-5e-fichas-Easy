import { useEffect, useMemo, useRef, useState } from 'react';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { Filigree, Modal, NumStepper, AvatarUpload } from '../../../components/Shared.jsx';
import ArtThumb from '../../components/ArtThumb.jsx';
import { confirmDialog } from '../../../components/ConfirmDialog.jsx';
import { subclassesFor } from '../../progression/subclasses.js';
import { subclassLock, sealHint, subclassLevelOf } from '../../progression/subclass-lock.js';
import { applyAutosToCharacter } from '../../progression/engine.js';
import { errorMessage } from '../../api/errors.js';
import { api } from '../../api/client.js';
import FhTitle from '../FhTitle.jsx';
import FhFeatures from '../FhFeatures.jsx';
import { FhStatusGlyph } from '../FhConditions.jsx';
import { gemLabel } from '../gem-text.js';
import { useSheetToast } from '../sheet-toast.jsx';
import { RichText } from '../rich-text.jsx';
import SheetRollTarget from '../SheetRollTarget.jsx';
import { AskDmNote, canLevelUp, saveLabel, stop, SUBCLASS_LABEL } from '../sheet-shared.jsx';
import { LevelUpButton } from '../hero/SheetHero.jsx';

export const SubclassModal = ({ char, lang, subs, label, update, onClose, landOnly = false, askDm = false }) => {
  const pt = lang === 'pt';
  const [pendingId, setPendingId] = useState(char.subclass || '');
  const [pendingLand, setPendingLand] = useState(char.landType || '');
  const selected = subs.find(s => s.id === pendingId);
  const needsLand = selected && selected.id === 'land' && selected.landTypes;
  const canSave = pendingId && (!needsLand || pendingLand);
  // por que o botão principal está apagado (antes ficava cinza sem dizer o que faltava)
  const missing = !pendingId ? (pt ? 'Escolha uma opção da lista.' : 'Pick an option from the list.')
    : needsLand && !pendingLand ? (pt ? 'Falta escolher o terreno.' : 'Choose the terrain first.') : '';
  // nada mudou em relação ao que a ficha já tem: não há o que salvar (nem pedir ao mestre)
  const unchanged = !!canSave && (landOnly
    ? pendingLand === (char.landType || '')
    : pendingId === (char.subclass || '') && (!needsLand || pendingLand === (char.landType || '')));
  const lv = char.level || 1;
  // texto de regra em português: a sigla do Nível de Desafio é ND (o catálogo traz "CR")
  const loc = (s) => (pt ? String(s || '').replace(/\bCR\b/g, 'ND') : String(s || ''));

  const save = () => {
    update(landOnly ? { landType: pendingLand } : {
      subclass: pendingId,
      landType: needsLand ? pendingLand : '',
    });
    onClose();
  };

  const landPicker = needsLand ? (
    <div className="fh-sub-land">
      <div className="eyebrow" id="fh-sub-land-k">{pt ? 'Terreno sagrado' : 'Sacred terrain'}</div>
      <div className="fh-sub-land-list" role="group" aria-labelledby="fh-sub-land-k">
        {selected.landTypes.map(lt => (
          <button key={lt.id} type="button" className={`option ${pendingLand === lt.id ? 'selected' : ''}`}
            aria-pressed={pendingLand === lt.id} onClick={() => setPendingLand(lt.id)}>
            {lt.name[lang]}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  // Traços da subclasse escolhida: cada um com o texto formatado (listas e tabelas do
  // catálogo, antes achatadas num parágrafo só), sem repetir o que a descrição já disse; os
  // de nível acima do personagem ficam dobrados em "Níveis seguintes".
  const featsOf = (sc) => {
    const seen = new Set([String(sc.desc?.[lang] || '').trim()]);
    return (sc.features || []).filter(f => {
      const d = String(f.desc?.[lang] || '').trim();
      const k = `${f.name?.[lang]}|${d}`;
      if (seen.has(k) || (d && seen.has(d))) return false;
      seen.add(k); if (d) seen.add(d);
      return true;
    });
  };
  const feat = (f, i) => (
    <div key={i} className="fh-sub-feat">
      <div className="fh-sub-feat-h">
        <span className="fh-sub-feat-lv">{pt ? 'Nv' : 'Lv'} {f.level}</span>
        <span className="fh-sub-feat-n">{loc(f.name[lang])}</span>
      </div>
      <RichText className="fh-sub-feat-t" text={loc(f.desc[lang])} lang={lang} />
    </div>
  );

  return (
    <Modal onClose={onClose} title={label[lang]}>
      {landOnly && selected && (
        <p className="fh-sub-lead">
          {selected.name[lang]}: {pt ? 'escolha o seu terreno sagrado.' : 'choose your sacred terrain.'}
        </p>
      )}
      {!landOnly && <div className="fh-sub-list">
        {subs.map(sc => {
          const isSel = pendingId === sc.id;
          const feats = isSel ? featsOf(sc) : [];
          const nowF = feats.filter(f => (f.level || 1) <= lv);
          const later = feats.filter(f => (f.level || 1) > lv);
          return (
            <div key={sc.id} className={`fh-sub-opt${isSel ? ' is-selected' : ''}`}>
              <button type="button" className={`option ${isSel ? 'selected' : ''}`} aria-pressed={isSel}
                onClick={() => { if (!isSel) { setPendingId(sc.id); setPendingLand(''); } }}>
                <span className="option-title">{sc.name[lang]}{sc.id === char.subclass ? <span className="fh-sub-cur">{pt ? 'atual' : 'current'}</span> : null}</span>
                <span className="option-meta fh-sub-desc">{loc(sc.desc[lang])}</span>
              </button>
              {isSel && (needsLand || feats.length > 0) && (
                <div className="fh-sub-body">
                  {landPicker}
                  {nowF.map(feat)}
                  {later.length > 0 && (
                    <details className="fh-sub-later" open={nowF.length === 0}>
                      <summary>{pt ? `Níveis seguintes (${later.length})` : `Later levels (${later.length})`}</summary>
                      {later.map(feat)}
                    </details>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>}
      {landOnly && landPicker}

      {/* ações presas no pé (a lista é longa); o aviso do mestre e o motivo do botão apagado
          ficam DENTRO da faixa, à vista sem rolar */}
      <div className="modal-actions sticky fh-sub-actions">
        {askDm && <AskDmNote lang={lang} />}
        {(missing || unchanged) && <span className="fh-sub-missing" role="status">{missing || (pt ? 'Esta já é a escolha atual.' : 'This is already your current choice.')}</span>}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {pt ? 'Cancelar' : 'Cancel'}
        </button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave || unchanged}>
          {saveLabel(askDm, lang)}
        </button>
      </div>
    </Modal>
  );
};

// ASI levels: most classes 4,8,12,16,19 — Fighter +6,14, Rogue +10
// ===== Modo trapaça =====
// Liberado pelo próprio jogador, mas sempre visível (selo na ficha e para o mestre).
export const CheatModeModal = ({ char, lang, update, onClose }) => {
  const pt = lang === 'pt';
  const on = !!char.cheatMode;
  const locked = !!char.inCampaign; // servidor trava nível/PV/atributos em campanha
  const [draft, setDraft] = useState({ level: char.level || 1, maxHp: char.maxHp || 1, abilities: { ...char.abilities } });
  const items = pt ? [
    'Editor livre de nível, PV máximo e atributos (aqui embaixo e no botão Editar).',
    'Magias de qualquer lista e acima do limite de truques e magias preparadas/conhecidas.',
    'Forma Selvagem com qualquer fera: sem limite de ND, voo, natação ou usos.',
    // Fora de campanha a faixa da subclasse manda o jogador para cá (subclass-lock.js).
    ...(locked ? [] : ['Trocar a subclasse já escolhida (círculo, domínio, juramento, patrono…) e o terreno do Círculo da Terra.']),
    'A ficha ganha o selo 🎲 Trapaça, visível para você e para o mestre.',
    'Desligar não desfaz o que foi alterado.',
  ] : [
    'Free editor for level, max HP and ability scores (below and in Edit).',
    'Spells from any list, above cantrip and prepared/known limits.',
    'Wild Shape into any beast: no CR, fly, swim or use limits.',
    ...(locked ? [] : ['Change an already chosen subclass (circle, domain, oath, patron…) and the Circle of the Land terrain.']),
    'The sheet gets a 🎲 Cheat badge, visible to you and your DM.',
    'Turning it off does not undo changes.',
  ];
  const save = () => {
    const lv = Math.max(1, Math.min(20, +draft.level || 1));
    const hp = Math.max(1, +draft.maxHp || 1);
    update({ level: lv, maxHp: hp, currentHp: Math.min(char.currentHp ?? hp, hp), abilities: draft.abilities });
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 8 }}>🎲 {pt ? 'Modo trapaça' : 'Cheat mode'}</h3>
      <div className="text-sm" style={{ marginBottom: 8 }}>{pt ? 'Sem ele, nível, PV e atributos só mudam pela subida de nível guiada. Com ele ligado:' : 'Without it, level, HP and abilities only change through guided level-up. When on:'}</div>
      <ul className="text-sm no-zebra fh-cheat-list">
        {items.map((it, i) => <li key={i} style={{ marginBottom: 4 }}>{it}</li>)}
      </ul>
      {locked && (
        <div className="text-sm" style={{ padding: 10, borderRadius: 6, background: 'var(--bg-elev)', marginBottom: 12 }}>
          🔒 {pt
            ? 'Esta ficha está numa campanha: o servidor continua travando nível, PV, atributos e a subclasse (só o mestre altera), e a Forma Selvagem é validada pelo servidor. Aqui o modo só libera as magias.'
            : 'This sheet is in a campaign: the server still locks level, HP, abilities and the subclass (DM only), and Wild Shape is server-validated. Here the mode only unlocks spells.'}
        </div>
      )}
      <button className={`btn ${on ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%', marginBottom: 12 }}
        onClick={() => update(on ? { cheatMode: false } : { cheatMode: true, cheatModeSince: new Date().toISOString() })}>
        {on ? (pt ? 'Desligar modo trapaça' : 'Turn cheat mode off') : (pt ? 'Ligar modo trapaça' : 'Turn cheat mode on')}
      </button>
      {on && !locked && (
        <>
          <Filigree>{pt ? 'Editor livre' : 'Free editor'}</Filigree>
          <div className="row gap-3" style={{ marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <label>{t('level', lang)}</label>
              <input aria-label={t('level', lang)} type="number" min="1" max="20" value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label>{pt ? 'PV máximo' : 'Max HP'}</label>
              <input aria-label={pt ? 'PV máximo' : 'Max HP'} type="number" min="1" value={draft.maxHp} onChange={e => setDraft({ ...draft, maxHp: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {SRD.ABILITIES.map(k => (
              <div key={k}>
                <label>{t(k + 'Sh', lang)} {pt ? '(base)' : '(base)'}</label>
                <input type="number" min="1" max="30" value={draft.abilities[k] ?? 10}
                  onChange={e => setDraft({ ...draft, abilities: { ...draft.abilities, [k]: Math.max(1, Math.min(30, +e.target.value || 1)) } })} />
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={save}>{pt ? 'Salvar' : 'Save'}</button>
        </>
      )}
    </Modal>
  );
};

// ===== Campaign Mode Banner =====

/**
 * Mostra status da ficha (standalone ou em campanha) + botão "Sair" pro player.
 * Em standalone, mostra um chip discreto "Ficha pessoal".
 * Em campanha, mostra o nome da campanha (busca via API) e botão pra sair.
 */
// Faixa da campanha. onManage: abre o modal "Campanha" (só ficha da conta);
// onLogin: ficha do aparelho, dica para entrar na conta. rev: busca de novo depois
// de atrelar/desatrelar/trocar.
export const CampaignModeBanner = ({
  char,
  lang,
  onChange,
  onManage,
  onLogin,
  rev = 0,
  campFoldOpen,
  setCampFoldOpen,
  campaignsList = [],
  onLeaveCampaign,
  busyLeaveId,
}) => {
  const [busy, setBusy] = useState(false);
  const pt = lang === 'pt';

  const leave = async (c) => {
    if (!c) return;
    if (!(await confirmDialog({
      lang, danger: true,
      title: lang === 'pt' ? `Sair da campanha "${c.name}"?` : `Leave campaign "${c.name}"?`,
      message: lang === 'pt' ? 'A ficha continua com você.' : 'The sheet stays with you.',
      confirmLabel: lang === 'pt' ? 'Sair da campanha' : 'Leave campaign',
    }))) return;
    setBusy(true);
    try {
      await api.removeMember(c.id, c.membershipId);
      onChange({ ...char, inCampaign: false });
    } catch (e) {
      alert(errorMessage(e));
    } finally { setBusy(false); }
  };

  if (!campFoldOpen) return null;

  return (
    <div className="fh-hero-campaigns-panel card no-print">
      <div className="fh-hero-campaigns-header">
        <span className="fh-hero-campaigns-title">
          🏰 {pt ? 'Campanhas do Personagem' : 'Character Campaigns'} ({campaignsList.length})
        </span>
        <div className="fh-hero-campaigns-header-actions">
          {campaignsList.length > 0 && onManage && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={onManage}>
              + {pt ? 'Atrelar' : 'Link'}
            </button>
          )}
          {setCampFoldOpen && (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => setCampFoldOpen(false)} aria-label="Fechar">
              ✕
            </button>
          )}
        </div>
      </div>
      {campaignsList.length === 0 ? (
        <div className="fh-hero-campaigns-empty">
          <p className="muted small">
            {pt ? 'Ficha pessoal (não está em nenhuma campanha).' : 'Personal sheet (not assigned to any campaign).'}
          </p>
          {onManage && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onManage}>
              🏰 {pt ? 'Atrelar a uma campanha' : 'Link to a campaign'}
            </button>
          )}
          {typeof char.id !== 'number' && onLogin && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onLogin}>
              {pt ? 'Entrar na conta' : 'Log in'}
            </button>
          )}
        </div>
      ) : (
        <div className="fh-hero-campaigns-list">
          {campaignsList.map(camp => (
            <div
              key={camp.id}
              className="fh-hero-campaign-card"
              style={camp.coverImage ? {
                backgroundImage: `linear-gradient(rgba(14, 10, 8, 0.8), rgba(14, 10, 8, 0.94)), url(${camp.coverImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              <div className="fh-hero-campaign-card-header">
                <div className="fh-hero-campaign-name-block">
                  <strong className="fh-hero-campaign-name">{camp.name}</strong>
                  <span className="tag fh-hero-camp-tag-mode" style={{ fontSize: '0.72rem', padding: '1px 6px', margin: '0 4px', background: 'rgba(214, 176, 100, 0.15)', border: '1px solid rgba(214, 176, 100, 0.4)', borderRadius: 3, color: '#f3e6cb' }}>
                    {camp.levelingMode === 'xp' ? (camp.xp ? `${camp.xp} XP` : 'XP') : (pt ? 'Marcos' : 'Milestones')}
                  </span>
                  {camp.sponsored && <span className="fh-hero-camp-tag-sponsored">{pt ? 'Vaga da mesa' : 'Table seat'}</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs fh-hero-campaign-leave"
                  onClick={() => onLeaveCampaign ? onLeaveCampaign(camp) : leave(camp)}
                  disabled={busyLeaveId === camp.id || busy}
                  title={pt ? `Sair da campanha "${camp.name}"` : `Leave campaign "${camp.name}"`}
                >
                  {busyLeaveId === camp.id || busy ? '…' : (pt ? '🚪 Sair' : '🚪 Leave')}
                </button>
              </div>
              {typeof char.id === 'number' && camp.status !== 'closed' && (
                <div className="fh-hero-campaign-card-rolls">
                  <SheetRollTarget lang={lang} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ===== Wild Shape (Druid) =====

/** Banner mostrado quando o druida está transformado. Mostra nome da fera +
 * HP atual da fera / HP da fera + botão "Sair da forma". */

export const WildShapeBanner = ({ char, lang, onChange }) => {
  const ws = char.wildShape || {};
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const endShape = async () => {
    setBusy(true); setErr('');
    try {
      if (char.id && !String(char.id).startsWith('local-') && typeof char.id === 'number') {
        const res = await api.wildShapeEnd(char.id);
        onChange(res.character.data ? { ...res.character.data, id: res.character.id, name: res.character.name, updatedAt: res.character.updated_at } : char);
      } else {
        // local: aplica direto
        onChange({ ...char,
          currentHp: char.rulesVersion === '2024' ? char.currentHp : ws.preTransformHp || 0,
          tempHp: char.rulesVersion === '2024' ? char.tempHp : ws.preTransformTempHp || 0,
          wildShape: { active: false },
        });
      }
    } catch (e) {
      setErr(errorMessage(e));
    } finally { setBusy(false); }
  };
  const pct = ws.beastMaxHp ? Math.max(0, Math.min(100, ((ws.beastCurrentHp || 0) / ws.beastMaxHp) * 100)) : 0;
  return (
    <div className="wild-shape-banner">
      <div className="wsb-icon fh-wsb-seal" aria-hidden="true"><FhStatusGlyph k="wild" size={26} /></div>
      <div className="wsb-info">
        <div className="wsb-title">
          {lang === 'pt' ? 'Em Forma Selvagem:' : 'In Wild Shape:'}{' '}
          <strong>{ws.beastName}</strong>
        </div>
        <div className="wsb-hp">
          <div className="wsb-hp-bar"><div className="wsb-hp-fill" style={{ width: `${pct}%` }} /></div>
          <span className="wsb-hp-text">{(() => {
            const pt = lang === 'pt';
            const hpU = pt ? 'PV' : 'HP';
            return char.rulesVersion === '2024'
              ? `${char.currentHp} / ${char.maxHp} ${hpU} · ${char.tempHp || 0} ${pt ? 'PV temp.' : 'temp HP'}`
              : `${ws.beastCurrentHp} / ${ws.beastMaxHp} ${hpU}`;
          })()} · {lang === 'pt' ? 'CA' : 'AC'} {ws.beastAc}</span>
        </div>
        <div className="wsb-pre">
          {char.rulesVersion === '2024' ? (lang === 'pt' ? 'Mantém seus próprios pontos de vida.' : 'Retains your own hit points.') : `${lang === 'pt' ? 'Forma humanoide guardada:' : 'Stored humanoid:'} ${ws.preTransformHp} ${lang === 'pt' ? 'PV' : 'HP'}`}
        </div>
        {err && <div className="fh-ws-err" role="alert">{err}</div>}
      </div>
      <button className="btn btn-ghost" onClick={endShape} disabled={busy}>
        {busy ? '…' : (lang === 'pt' ? 'Sair da forma' : 'Revert form')}
      </button>
    </div>
  );
};

export const BeastModal = ({ beast, lang, onClose, onTransform, canTransform, transformError }) => {
  const speeds = [`${Utils.speedLabel(beast.speed, lang)}`];
  if (beast.fly)    speeds.push(`${lang === 'pt' ? 'Voo' : 'Fly'} ${Utils.speedLabel(beast.fly, lang)}`);
  if (beast.swim)   speeds.push(`${lang === 'pt' ? 'Nat.' : 'Swim'} ${Utils.speedLabel(beast.swim, lang)}`);
  if (beast.climb)  speeds.push(`${lang === 'pt' ? 'Esc.' : 'Climb'} ${Utils.speedLabel(beast.climb, lang)}`);
  if (beast.burrow) speeds.push(`${lang === 'pt' ? 'Cav.' : 'Burrow'} ${Utils.speedLabel(beast.burrow, lang)}`);
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 2 }}>{tName('beast', beast.id, lang)}</h3>
      <div className="text-xs muted" style={{ marginBottom: 12 }}>
        {beast.size} {lang === 'pt' ? 'Besta' : 'Beast'} · {lang === 'pt' ? 'ND' : 'CR'} {beast.cr} · {speeds.join(', ')}
      </div>
      <div className="combat-grid" style={{ marginBottom: 12 }}>
        <div className="combat-box"><div className="eyebrow">CA</div><div className="combat-box-value">{beast.ac}</div></div>
        <div className="combat-box"><div className="eyebrow">{lang === 'pt' ? 'PV' : 'HP'}</div><div className="combat-box-value">{beast.hp}</div></div>
        <div className="combat-box">
          <div className="eyebrow">{lang === 'pt' ? 'Des.' : 'Speed'}</div>
          <div className="combat-box-value" style={{ fontSize: '1rem' }}>{Utils.speedLabel(beast.speed, lang)}</div>
        </div>
      </div>
      <div className="abil-grid" style={{ marginBottom: 12 }}>
        {SRD.ABILITIES.map(k => {
          const score = beast[k];
          const mod = Math.floor((score - 10) / 2);
          return (
            <div key={k} className="abil-box">
              <div className="abil-box-name">{t(k + 'Sh', lang)}</div>
              <div className="abil-box-mod">{Utils.fmtMod(mod)}</div>
              <div className="abil-box-score">{score}</div>
            </div>
          );
        })}
      </div>
      {beast.traits && beast.traits.length > 0 && (
        <>
          <Filigree>{lang === 'pt' ? 'Traços' : 'Traits'}</Filigree>
          {beast.traits.map((tr, i) => (
            <div key={i} className="text-sm" style={{ marginBottom: 6 }}>
              <strong style={{ color: 'var(--gold-deep)' }}>{tr.name[lang]}.</strong> {tr.desc[lang]}
            </div>
          ))}
        </>
      )}
      {beast.actions && beast.actions.length > 0 && (
        <>
          <Filigree>{lang === 'pt' ? 'Ações' : 'Actions'}</Filigree>
          {beast.actions.map((ac, i) => (
            <div key={i} className="text-sm" style={{ marginBottom: 6 }}>
              <strong style={{ color: 'var(--gold-deep)' }}>{ac.name[lang]}.</strong> {ac.desc[lang]}
            </div>
          ))}
        </>
      )}
      {onTransform && (
        <>
          <Filigree />
          {transformError && <div style={{ color: 'var(--blood-bright)', marginBottom: 8 }}>{transformError}</div>}
          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => onTransform(beast)}
            disabled={!canTransform}
            title={!canTransform ? (lang === 'pt' ? 'Sem usos restantes' : 'No uses remaining') : undefined}
          >
            🐾 {lang === 'pt' ? 'Transformar nesta fera' : 'Transform into this beast'}
          </button>
        </>
      )}
    </Modal>
  );
};

// Forma Estelar (Círculo das Estrelas). Texto próprio, resumido do SRD/PHB.
export const STARRY_FORMS = [
  { id: 'archer', icon: '🏹', name: { pt: 'Arqueiro', en: 'Archer' },
    desc: { pt: 'Ao entrar e como ação bônus em cada turno: ataque mágico à distância (60 pés), 1d8 + SAB de dano radiante.', en: 'On entering and as a bonus action each turn: ranged spell attack (60 ft), 1d8 + WIS radiant damage.' },
    desc10: { pt: 'Nv. 10: dano vira 2d8.', en: 'Lv 10: damage becomes 2d8.' } },
  { id: 'chalice', icon: '🏆', name: { pt: 'Taça', en: 'Chalice' },
    desc: { pt: 'Ao gastar espaço de magia para curar: você ou uma criatura a 30 pés recupera 1d8 + SAB PV.', en: 'When you spend a spell slot to heal: you or a creature within 30 ft regains 1d8 + WIS HP.' },
    desc10: { pt: 'Nv. 10: cura vira 2d8.', en: 'Lv 10: healing becomes 2d8.' } },
  { id: 'dragon', icon: '🐉', name: { pt: 'Dragão', en: 'Dragon' },
    desc: { pt: 'Em testes de INT/SAB e salvaguardas de CON para concentração, um d20 de 9 ou menos conta como 10.', en: 'On INT/WIS checks and CON saves to maintain concentration, a d20 roll of 9 or lower counts as 10.' },
    desc10: { pt: 'Nv. 10: ganha voo de 20 pés e pode pairar.', en: 'Lv 10: gain 20 ft fly speed and hover.' } },
];

export const StarryFormSection = ({ char, level, lang, update, maxUses, usesUsed, cheat }) => {
  const sf = char.starryForm || {};
  // 1º toque mostra o efeito; 2º toque ativa (evita gastar uso sem querer).
  const [peek, setPeek] = useState(sf.form || null);
  const unlocked = level >= (char.rulesVersion === '2024' ? 3 : 2);
  if (!unlocked) return null;
  const canUse = cheat || usesUsed < maxUses;
  const wisMod = Utils.abilityMod(char, 'wis');
  const shown = STARRY_FORMS.find(f => f.id === (peek || sf.form));
  const activate = (id) => {
    // Nv. 10 (Constelações Cintilantes): troca de constelação sem gastar uso.
    if (sf.active) { if (level >= 10 || cheat) update({ starryForm: { ...sf, form: id } }); return; }
    if (!canUse) return;
    update({ starryForm: { active: true, form: id, startedAt: new Date().toISOString() }, wildShapeUses: usesUsed + 1 });
  };
  return (
    <div className="card" style={{ padding: 12, marginBottom: 10 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="eyebrow" style={{ color: 'var(--gold)' }}>✦ {lang === 'pt' ? 'Forma Estelar' : 'Starry Form'}</div>
        {sf.active && (
          <button className="btn btn-sm btn-ghost" onClick={() => update({ starryForm: { active: false } })}>
            {lang === 'pt' ? 'Encerrar' : 'End'}
          </button>
        )}
      </div>
      <div className="text-xs muted" style={{ marginBottom: 8 }}>
        {lang === 'pt'
          ? `Ação bônus: gaste um uso de Forma Selvagem para brilhar como uma constelação por 10 minutos (luz plena 10 pés). Você não vira fera. SAB ${Utils.fmtMod(wisMod)}.`
          : `Bonus action: spend a Wild Shape use to glow as a constellation for 10 minutes (bright light 10 ft). You don't become a beast. WIS ${Utils.fmtMod(wisMod)}.`}
        {level >= 10 && (lang === 'pt' ? ' Nv. 10: troque de constelação no início de cada turno.' : ' Lv 10: switch constellation at the start of each turn.')}
      </div>
      <div className="starry-choices">
        {STARRY_FORMS.map(f => {
          const isOn = sf.active && sf.form === f.id;
          return (
            <button key={f.id} type="button" className={`starry-choice ${isOn ? 'on' : ''} ${peek === f.id && !isOn ? 'focus' : ''}`}
              onClick={() => (peek === f.id && !isOn ? activate(f.id) : setPeek(f.id))}>
              <span className="ico">{f.icon}</span>{f.name[lang]}
            </button>
          );
        })}
      </div>
      {shown && (
        <div className="text-sm" style={{ marginTop: 8, color: 'var(--ink-secondary)' }}>
          <strong style={{ color: 'var(--ink-primary)' }}>{shown.name[lang]}:</strong> {shown.desc[lang]}
          {level >= 10 && <span style={{ color: 'var(--gold-deep)' }}> {shown.desc10[lang]}</span>}
          {!sf.active && peek && canUse && (
            <div className="text-xs muted" style={{ marginTop: 4 }}>{lang === 'pt' ? 'Toque de novo para ativar (gasta 1 uso).' : 'Tap again to activate (spends 1 use).'}</div>
          )}
        </div>
      )}
      {!sf.active && !canUse && (
        <div className="text-xs muted" style={{ marginTop: 6 }}>{lang === 'pt' ? 'Sem usos de Forma Selvagem restantes.' : 'No Wild Shape uses left.'}</div>
      )}
    </div>
  );
};

// `druid` = ficha vista só como druida (nível e círculo próprios, mesmo em multiclasse).
// `features`: traços de classe que usam a Forma Selvagem (src/sheet/feature-placement.js).
export const WildShapePanel = ({ char, druid, lang, update, features = [], multi = false }) => {
  const [selected, setSelected] = useState(null);
  const [showBeasts, setShowBeasts] = useState(false);
  const cheat = !!char.cheatMode;
  const [transformError, setTransformError] = useState('');
  const level = druid.level;
  const currentRules = char.rulesVersion === '2024';
  const maxUses = currentRules ? (level >= 17 ? 4 : level >= 6 ? 3 : 2) : 2;
  const isMoon = druid.subclass === 'moon';
  // Moon circle: CR 1 at lv2-5, floor(level/3) at lv6+; no fly restriction from lv2
  // Standard: CR 1/4 lv2-3 (no fly/swim), CR 1/2 lv4-7 (no fly), CR 1 lv8+
  const maxCr = isMoon
    ? (level >= 6 ? Math.floor(level / 3) : 1)
    : (level >= 8 ? 1 : level >= 4 ? 0.5 : 0.25);
  const crLabel = isMoon
    ? `CR ≤ ${level >= 6 ? Math.floor(level / 3) : 1}`
    : (level >= 8 ? 'CR ≤ 1' : level >= 4 ? 'CR ≤ 1/2' : 'CR ≤ 1/4');
  const available = SRD.BEASTS.filter(b => {
    if (cheat) return true;
    if (b.crNum > maxCr) return false;
    // Moon circle has no fly restriction
    if (level < 8 && b.fly) return false;
    if (!currentRules && level < 4 && b.swim) return false;
    return true;
  });
  const usesUsed = char.wildShapeUses || 0;

  return (
    <section className="fh-panel">
      <FhTitle sub={<>
        {druid.subclass && <span className="fh-sub-hi">{tName('subclass', druid.subclass, lang)}</span>}
        <span>
          {crLabel}
          {!isMoon && level < 8 && (level < 4 ? (lang === 'pt' ? ' · sem voo/nat.' : ' · no fly/swim') : (lang === 'pt' ? ' · sem voo' : ' · no fly'))}
        </span>
      </>}>{lang === 'pt' ? 'Forma Selvagem' : 'Wild Shape'}</FhTitle>
      <div className="row gap-2" style={{ marginBottom: 10, alignItems: 'center' }}>
        <div className="slot-pips wild">
          {Array.from({length: maxUses}, (_, i) => i).map(i => (
            <button
              key={i} type="button"
              className={`slot-pip ${i < usesUsed ? 'used' : ''}`}
              aria-label={gemLabel(lang === 'pt' ? 'Forma Selvagem' : 'Wild Shape', i, maxUses, i < usesUsed, lang)}
              onClick={() => update({ wildShapeUses: i < usesUsed ? i : i + 1 })}
            />
          ))}
        </div>
        <span className="text-xs muted fh-gem-note"><b className="fh-gem-count">{Math.max(0, maxUses - usesUsed)}/{maxUses}</b> {lang === 'pt' ? 'usos' : 'uses'} · {currentRules ? (lang === 'pt' ? '+1 por descanso curto' : '+1 per short rest') : (lang === 'pt' ? 'recupera no descanso curto' : 'recover on short rest')}</span>
      </div>
      <FhFeatures items={features} multi={multi} lang={lang} className="fh-wild-feats"
        label={lang === 'pt' ? 'Traços da Forma Selvagem' : 'Wild Shape features'} />
      {druid.subclass === 'stars' && (
        <StarryFormSection char={char} level={level} lang={lang} update={update} maxUses={maxUses} usesUsed={usesUsed} cheat={cheat} />
      )}
      <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginBottom: 8 }} onClick={() => setShowBeasts(v => !v)}>
        <Icon name={showBeasts ? 'chevron-up' : 'chevron-down'} size={14}/>{' '}
        {showBeasts
          ? (lang === 'pt' ? 'Ocultar formas de fera' : 'Hide beast forms')
          : (lang === 'pt' ? `Ver formas de fera (${available.length})` : `Show beast forms (${available.length})`)}
      </button>
      {showBeasts && <div className="options-list cols-2" style={{ marginBottom: 4 }}>
        {available.map(b => (
          <button key={b.id} className="option" style={{ textAlign: 'left' }} onClick={() => setSelected(b)}>
            <div className="option-title" style={{ fontSize: '0.9rem' }}>{tName('beast', b.id, lang)}</div>
            <div className="option-meta text-xs">
              <span>CR {b.cr}</span>
              <span>HP {b.hp}</span>
              <span>CA {b.ac}</span>
              {b.fly && <span>✦ {lang === 'pt' ? 'voo' : 'fly'}</span>}
              {b.swim && <span>〜 {lang === 'pt' ? 'nat.' : 'swim'}</span>}
            </div>
          </button>
        ))}
      </div>}
      {selected && (
        <BeastModal
          beast={selected}
          lang={lang}
          onClose={() => { setSelected(null); setTransformError(''); }}
          canTransform={(cheat || (level >= 2 && usesUsed < maxUses)) && !(char.wildShape?.active)}
          transformError={transformError}
          onTransform={async (beast) => {
            setTransformError('');
            // Atalho local + remoto. Backend reage se char.id é numérico (remoto).
            try {
              if (typeof char.id === 'number') {
                const res = await api.wildShapeTransform(char.id, { beast });
                // O storage adapter espera o objeto inteiro como char remoto; usa o data + id + name
                const c = res.character;
                update({ ...c.data, id: c.id, name: c.name });
                setSelected(null);
              } else {
                // Local: aplica direto no data
                update({
                  wildShape: {
                    active: true,
                    beastId: beast.id,
                    beastName: tName('beast', beast.id, lang),
                    preTransformHp: char.currentHp || 0,
                    preTransformTempHp: char.tempHp || 0,
                    beastMaxHp: beast.hp,
                    beastCurrentHp: beast.hp,
                    beastAc: beast.ac,
                    beastStats: { str: beast.str, dex: beast.dex, con: beast.con, int: beast.int, wis: beast.wis, cha: beast.cha },
                    beastActions: beast.actions,
                    beastSpeed: beast.speed,
                    beastSize: beast.size,
                    transformedAt: new Date().toISOString(),
                  },
                  wildShapeUses: (char.wildShapeUses || 0) + 1,
                  currentHp: currentRules ? char.currentHp : beast.hp,
                  tempHp: currentRules ? Math.max(char.tempHp || 0, isMoon && level >= 3 ? level * 3 : level) : 0,
                });
                setSelected(null);
              }
            } catch (e) {
              setTransformError(errorMessage(e));
            }
          }}
        />
      )}
    </section>
  );
};

// Condições e efeitos: a lista de estados (o que cada um faz) e o seletor "+ Condição" moram em
// src/sheet/FhStatus.jsx (FhStatusPanel), dentro do painel Vitalidade, abaixo das barras.

// ===== NPC tab =====

export const RELATIONSHIP_OPTS = [
  { id: 'ally',    label: { pt: 'Aliado',   en: 'Ally'    } },
  { id: 'neutral', label: { pt: 'Neutro',   en: 'Neutral' } },
  { id: 'enemy',   label: { pt: 'Inimigo',  en: 'Enemy'   } },
  { id: 'unknown', label: { pt: 'Incerto',  en: 'Unknown' } },
];

// Cor da relação: no CSS (src/sheet/ficha.css: [data-rel]) — aliado verdete, neutro
// ouro, inimigo vinho, incerto cinza; no cartão (filete e etiqueta) e nas pílulas do modal.
export const SheetNpcs = ({ char, lang, update }) => {
  const pt = lang === 'pt';
  const npcs = char.npcs || [];
  const toast = useSheetToast();
  const [editing, setEditing] = useState(null); // id or 'new'
  const [form, setForm] = useState({});

  const openNew = () => { setForm({ name: '', race: '', role: '', relationship: 'neutral', notes: '' }); setEditing('new'); };
  const openEdit = (npc) => { setForm({ ...npc }); setEditing(npc.id); };
  const save = (ev) => {
    ev?.preventDefault?.();
    if (!form.name?.trim()) return;
    if (editing === 'new') {
      update({ npcs: [...npcs, { ...form, id: Date.now().toString() }] });
    } else {
      update({ npcs: npcs.map(n => n.id === editing ? { ...n, ...form } : n) });
    }
    setEditing(null);
  };
  // Remover: sai na hora e o aviso no pé da ficha desfaz (devolve no mesmo lugar da lista).
  const remove = (npc) => {
    const idx = npcs.findIndex(n => n.id === npc.id);
    update({ npcs: npcs.filter(n => n.id !== npc.id) });
    toast?.show({
      text: pt ? `${npc.name} removido dos NPCs.` : `${npc.name} removed from NPCs.`,
      onAction: () => toast.patchChar?.((c) => {
        const list = [...(c.npcs || [])];
        list.splice(Math.min(Math.max(0, idx), list.length), 0, npc);
        return { npcs: list };
      }),
    });
  };
  const addBtn = (
    <button type="button" className="btn btn-sm btn-primary fh-npc-add" onClick={openNew}>
      <Icon name="plus" size={14} /> {pt ? 'Adicionar NPC' : 'Add NPC'}
    </button>
  );

  return (
    <section className="fh-panel fh-npcs-panel">
      <FhTitle act={npcs.length > 0 ? addBtn : null}>{pt ? 'NPCs conhecidos' : 'Known NPCs'}</FhTitle>

      {npcs.length === 0 && (
        <div className="fh-empty-state is-cta">
          <p>{pt ? 'Nenhum NPC ainda. Guarde aqui quem o herói conheceu: aliados, rivais, contatos.' : 'No NPCs yet. Keep track of who the hero has met: allies, rivals, contacts.'}</p>
          {addBtn}
        </div>
      )}

      {/* Cartão por NPC (src/sheet/ficha.css: .fh-npc): nome, "raça · papel", relação
          em etiqueta colorida, Editar e ✕; as notas embaixo. */}
      {npcs.length > 0 && (
        <div className="fh-npcs">
          {npcs.map(npc => (
            <article key={npc.id} className="fh-npc" data-rel={npc.relationship || 'neutral'}>
              <div className="fh-npc-head">
                <div className="fh-npc-id">
                  <div className="fh-npc-name">{npc.name}</div>
                  <div className="fh-npc-sub">
                    {[npc.race, npc.role].filter(Boolean).join(' · ')}
                    {npc.relationship && (
                      <span className="fh-npc-rel">
                        {RELATIONSHIP_OPTS.find(r => r.id === npc.relationship)?.label[lang] || npc.relationship}
                      </span>
                    )}
                  </div>
                </div>
                <div className="fh-npc-acts">
                  <button type="button" className="fh-npc-btn" onClick={() => openEdit(npc)}
                    aria-label={`${pt ? 'Editar' : 'Edit'} ${npc.name}`}>
                    {pt ? 'Editar' : 'Edit'}
                  </button>
                  <button type="button" className="fh-npc-btn is-del" onClick={() => remove(npc)}
                    aria-label={`${pt ? 'Remover' : 'Remove'} ${npc.name}`} title={pt ? 'Remover NPC' : 'Remove NPC'}>
                    <Icon name="trash" size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
              {npc.notes && (
                <div className="fh-npc-notes">{npc.notes}</div>
              )}
            </article>
          ))}
        </div>
      )}

      {editing !== null && (
        <Modal onClose={() => setEditing(null)} title={editing === 'new' ? (pt ? 'Novo NPC' : 'New NPC') : (pt ? 'Editar NPC' : 'Edit NPC')}>
          {/* <form>: Enter no nome salva; Cancelar antes, Salvar (principal) à direita, como os outros modais */}
          <form className="fh-npc-form" onSubmit={save}>
            <div>
              <label htmlFor="npc-name">{pt ? 'Nome' : 'Name'} *</label>
              <input id="npc-name" autoFocus required value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="fh-npc-form-2">
              <div>
                <label htmlFor="npc-race">{pt ? 'Espécie / tipo' : 'Species / type'}</label>
                <input id="npc-race" value={form.race || ''} placeholder={pt ? 'Ex.: Anã' : 'E.g. Dwarf'} onChange={e => setForm(f => ({ ...f, race: e.target.value }))} />
              </div>
              <div>
                <label htmlFor="npc-role">{pt ? 'Papel / Profissão' : 'Role / Profession'}</label>
                <input id="npc-role" value={form.role || ''} placeholder={pt ? 'Ex.: Ferreira' : 'E.g. Blacksmith'} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
              </div>
            </div>
            <div>
              <label id="npc-rel-label">{pt ? 'Relação' : 'Relationship'}</label>
              <div className="fh-rel-pills" role="group" aria-labelledby="npc-rel-label">
                {RELATIONSHIP_OPTS.map(r => (
                  <button key={r.id} type="button" data-rel={r.id}
                    className={`fh-rel-pill${form.relationship === r.id ? ' on' : ''}`}
                    aria-pressed={form.relationship === r.id}
                    onClick={() => setForm(f => ({ ...f, relationship: r.id }))}>
                    {r.label[lang]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="npc-notes">{pt ? 'Notas' : 'Notes'}</label>
              <textarea id="npc-notes" value={form.notes || ''} placeholder={pt ? 'Onde se conheceram, o que ele quer, o que deve.' : 'Where you met, what they want, what they owe.'}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ minHeight: 80 }} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                {pt ? 'Cancelar' : 'Cancel'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={!form.name?.trim()}>
                {pt ? 'Salvar' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};

// Largura de desktop (duas colunas na aba Jogar): acompanha o redimensionamento da janela.

export const MasteryNote = ({ mastery, lang, fold }) => {
  const [open, setOpen] = useState(false);
  const k = lang === 'pt' ? 'Maestria' : 'Mastery';
  if (!fold) {
    return (
      <div className="fh-atk-note is-mastery" title={mastery.desc[lang]}>
        {k}: <strong>{mastery.name[lang]}</strong> — {mastery.desc[lang]}
      </div>
    );
  }
  return (
    <div className={`fh-atk-note is-mastery is-fold${open ? ' is-open' : ''}`}>
      <button type="button" className="fh-atk-note-toggle" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        <span>{k}: <strong>{mastery.name[lang]}</strong></span>
        <span className="fh-atk-note-chev" aria-hidden="true">⌄</span>
      </button>
      {open && <div className="fh-atk-note-body">{mastery.desc[lang]}</div>}
    </div>
  );
};
