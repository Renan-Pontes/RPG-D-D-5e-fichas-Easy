import { errorMessage } from '../api/errors.js';
import { useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { findMonster } from '../../data/bestiary.js';
import { loadCustomMonsters } from './custom-monsters.js';
import { combatantXp, encounterDifficulty, DIFFICULTY_LABEL } from './encounter.js';
import './monster-tools.css';
import { confirmDialog } from '../../components/ConfirmDialog.jsx';
import { flash } from '../play/flash.js';

const t = (lang, pt, en) => (lang === 'pt' ? pt : en);

function memberLevel(member) {
  const ch = member?.character;
  return parseInt(ch?.data?.level ?? ch?.summary?.level ?? 1, 10) || 1;
}

/**
 * Faixa compacta no painel do mestre: dificuldade do encontro (SRD 5.2.1, orçamento
 * de XP por personagem) e — só em campanhas por XP — o XP total e "Dar XP ao grupo".
 */
export default function EncounterDifficulty({ campaign, combatants, lang }) {
  const [awarded, setAwarded] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // detalhamento do orçamento (tocável no celular)
  const xpMode = (campaign?.state?.levelingMode || 'milestone') === 'xp';

  const info = useMemo(() => {
    const custom = loadCustomMonsters();
    const lookup = (id) => (id ? (findMonster(id) || custom.find(m => m.id === id) || null) : null);
    const monsters = (combatants || []).filter(c => c.type === 'monster');
    let total = 0; let estimated = false;
    for (const c of monsters) {
      const r = combatantXp(c, lookup);
      total += r.xp;
      if (r.estimated) estimated = true;
    }
    const members = (campaign?.members || []).filter(m => m.role !== 'dm' && m.character);
    const pcIds = new Set((combatants || []).filter(c => c.type === 'pc').map(c => c.character_id));
    const inFight = members.filter(m => pcIds.has(m.character.id));
    const party = inFight.length ? inFight : members;
    const levels = party.map(memberLevel);
    return {
      monsters: monsters.length, total, estimated, levels,
      characterIds: inFight.map(m => m.character.id),
      fromCombat: inFight.length > 0,
      ...encounterDifficulty(total, levels),
    };
  }, [combatants, campaign]);

  if (!info.monsters) return null;

  const label = DIFFICULTY_LABEL[info.rating][lang] || DIFFICULTY_LABEL[info.rating].en;
  const pct = info.budget.high ? Math.min(100, Math.round((info.totalXp / info.budget.high) * 100)) : 0;
  const avgLevel = info.levels.length ? Math.round(info.levels.reduce((a, b) => a + b, 0) / info.levels.length) : 0;
  const partyText = info.levels.length
    ? t(lang, `${info.levels.length} PJ${info.levels.length > 1 ? 's' : ''}, nv ${avgLevel}`, `${info.levels.length} PC${info.levels.length > 1 ? 's' : ''}, lvl ${avgLevel}`)
    : t(lang, 'sem PJs', 'no PCs');
  const budgetTitle = t(lang,
    `Orçamento do grupo (SRD 5.2.1) — Baixa ${info.budget.low} · Moderada ${info.budget.moderate} · Alta ${info.budget.high} XP${info.fromCombat ? '' : ' (grupo todo da campanha)'}`,
    `Party budget (SRD 5.2.1) — Low ${info.budget.low} · Moderate ${info.budget.moderate} · High ${info.budget.high} XP${info.fromCombat ? '' : ' (whole campaign party)'}`);

  const award = async () => {
    const amount = info.totalXp;
    if (!amount) return;
    const msg = t(lang, `Dar ${amount} XP ao grupo (dividido entre os personagens)?`, `Award ${amount} XP to the party (split among characters)?`);
    if (!await confirmDialog({ lang, message: msg, confirmLabel: t(lang, 'Dar XP', 'Award XP') })) return;
    setBusy(true);
    try {
      await api.awardXp(campaign.id, info.characterIds.length ? { amount, characterIds: info.characterIds, split: true } : { amount, split: true });
      setAwarded(amount);
    } catch (e) {
      flash(t(lang, 'Não foi possível dar XP: ', 'Could not award XP: ') + errorMessage(e, lang), { error: true });
    } finally { setBusy(false); }
  };

  return (
    <div className="enc-diff" title={budgetTitle}>
      <span>{t(lang, 'Encontro', 'Encounter')}:</span>
      <button type="button" className={`enc-label enc-toggle ${info.rating}`} aria-expanded={open}
        onClick={() => setOpen(o => !o)} title={t(lang, 'Ver orçamento de XP do grupo', 'Show party XP budget')}>
        {label} <span aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {info.levels.length > 0 && (
        <span className={`enc-meter ${info.rating}`} aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
      )}
      <span className="muted small">{partyText}</span>
      {xpMode && (
        <>
          <span>{info.estimated ? '≈ ' : ''}{info.totalXp.toLocaleString()} XP</span>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !info.totalXp || awarded === info.totalXp} onClick={award}>
            {awarded === info.totalXp ? t(lang, 'XP entregue ✓', 'XP awarded ✓') : t(lang, 'Dar XP ao grupo', 'Award XP to party')}
          </button>
        </>
      )}
      {open && (
        <div className="enc-breakdown" role="note">
          <span>{t(lang, 'Monstros', 'Monsters')}: <strong>{info.estimated ? '≈ ' : ''}{info.totalXp.toLocaleString()} XP</strong></span>
          <span className="enc-b low">{t(lang, 'Baixa', 'Low')} {info.budget.low.toLocaleString()}</span>
          <span className="enc-b moderate">{t(lang, 'Moderada', 'Moderate')} {info.budget.moderate.toLocaleString()}</span>
          <span className="enc-b high">{t(lang, 'Alta', 'High')} {info.budget.high.toLocaleString()}</span>
          <span className="muted small">
            {t(lang, 'Orçamento do grupo (SRD 5.2.1)', 'Party budget (SRD 5.2.1)')}
            {info.fromCombat ? '' : t(lang, ' · grupo todo da campanha', ' · whole campaign party')}
            {info.estimated ? t(lang, ' · XP estimado para monstro sem ND', ' · estimated XP for monsters without CR') : ''}
          </span>
        </div>
      )}
    </div>
  );
}
