/* Combat action panel mostrado na ficha do jogador quando ele está em combate.
 *
 * - Detecta se o PC é combatente em combate ativo.
 * - Lista ataques disponíveis (armas + truques que causam dano).
 * - Modal de seleção de alvo (inimigos primeiro, aliados depois, com HP/distância).
 * - Envia /player-attack ao backend; mostra resultado (acerto, crit, desvio).
 */
import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import SRD from '../../data/srd.js';
import Utils from '../../utils.js';
import { Modal } from '../../components/Shared.jsx';

const ABILITY_MOD = (score) => Math.floor((score - 10) / 2);

function deriveAttacks(char) {
  /** Constrói lista de ataques possíveis a partir das armas + truques. */
  const attacks = [];
  const profB = Utils.profBonus(char);
  const strMod = Utils.abilityMod(char, 'str');
  const dexMod = Utils.abilityMod(char, 'dex');
  const spellAtk = Utils.spellAttackBonus(char);
  const spellDc = Utils.spellSaveDc(char);

  (char.weapons || []).forEach((w, i) => {
    const def = SRD.WEAPONS.find(x => x.id === w.id);
    const finesse = def && (def.props || []).includes('finesse');
    const ranged = def && (def.type || '').endsWith('ranged');
    const useDex = ranged || (finesse && dexMod > strMod);
    const abilityMod = useDex ? dexMod : strMod;
    attacks.push({
      key: `weapon:${i}`,
      kind: 'weapon',
      name: w.name || (def ? def.id : 'Arma'),
      damage: `${w.damage || '1d4'}${abilityMod >= 0 ? '+' : ''}${abilityMod}`,
      damageType: w.dmgType || (def && def.dmgType) || 'slashing',
      attackBonus: abilityMod + profB,
      icon: ranged ? '🏹' : '⚔️',
    });
  });

  // Truques que causam dano (level 0)
  (char.spells || []).forEach(sp => {
    const def = SRD.SPELLS.find(s => s.id === sp.id);
    if (!def || def.level !== 0) return;
    const dmgExpr = def.damage || (def.damageScaling && def.damageScaling[1]) || null;
    if (!dmgExpr) return;
    if (def.save && def.save.ability) {
      attacks.push({
        key: `cantrip:${def.id}`,
        kind: 'cantrip',
        name: def.name?.[char.lang || 'en'] || def.id,
        spellId: def.id,
        save: { ability: def.save.ability.toLowerCase(), dc: spellDc, halfOnSave: !!def.save.halfOnSave },
        damage: dmgExpr,
        damageType: def.damageType || 'force',
        icon: '✨',
      });
    } else if (spellAtk !== null) {
      attacks.push({
        key: `cantrip:${def.id}`,
        kind: 'cantrip',
        name: def.name?.[char.lang || 'en'] || def.id,
        spellId: def.id,
        damage: dmgExpr,
        damageType: def.damageType || 'force',
        attackBonus: spellAtk,
        icon: '✨',
      });
    }
  });

  return attacks;
}

function combatantDistance(a, b) {
  const pa = a.position || {};
  const pb = b.position || {};
  if (typeof pa.x !== 'number' || typeof pb.x !== 'number') return null;
  return Math.max(Math.abs(pa.x - pb.x), Math.abs(pa.y - pb.y));
}

const TargetPickerModal = ({ onClose, combat, attacker, attack, onPick, lang, busy, result }) => {
  const combatants = (combat?.combatants || []).filter(c =>
    c.id !== attacker.id && !c.defeated && (c.current_hp || 0) > 0
  );
  // Inimigos: tipo monster (do ponto de vista do player). PCs são aliados.
  const enemies = combatants.filter(c => c.type === 'monster');
  const allies = combatants.filter(c => c.type === 'pc');

  const renderTarget = (c) => {
    const dist = combatantDistance(attacker, c);
    return (
      <button key={c.id} className="option" onClick={() => onPick(c)} disabled={busy}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="option-title">{c.name}</div>
            <div className="option-meta text-xs">
              HP {c.current_hp}/{c.stats?.max_hp ?? '?'} · CA {c.stats?.ac ?? '?'}
              {dist !== null && ` · ${dist === 0 ? 'mesma casa' : `${dist} ${lang === 'pt' ? 'quadrados' : 'sq'}`}`}
            </div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Modal onClose={onClose} title={`${attack.icon || ''} ${attack.name} — ${lang === 'pt' ? 'Escolha o alvo' : 'Pick a target'}`}>
      {result ? (
        <ResultDisplay result={result} lang={lang} onClose={onClose} />
      ) : (
        <>
          {enemies.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{lang === 'pt' ? 'Inimigos' : 'Enemies'}</div>
              <div className="options-list">{enemies.map(renderTarget)}</div>
            </>
          )}
          {allies.length > 0 && (
            <>
              <div className="eyebrow" style={{ marginTop: 16, marginBottom: 8 }}>{lang === 'pt' ? 'Aliados' : 'Allies'}</div>
              <div className="options-list">{allies.map(renderTarget)}</div>
            </>
          )}
          {combatants.length === 0 && (
            <div className="muted">{lang === 'pt' ? 'Nenhum alvo válido.' : 'No valid target.'}</div>
          )}
        </>
      )}
    </Modal>
  );
};

const ResultDisplay = ({ result, lang, onClose }) => {
  if (result.kind === 'save') {
    const per = result.save?.per_target?.[0] || {};
    const ok = per.save?.success;
    return (
      <div>
        <div style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', color: 'var(--gold-bright)' }}>
          {result.attack_name} → {result.target_name}
        </div>
        <div className="mt-2">
          {lang === 'pt' ? 'Resistência' : 'Save'}: {per.save?.total} vs CD {per.save?.dc} —{' '}
          <strong style={{ color: ok ? 'var(--moss-bright)' : '#ff9999' }}>
            {ok ? (lang === 'pt' ? 'PASSOU' : 'PASSED') : (lang === 'pt' ? 'FALHOU' : 'FAILED')}
          </strong>
        </div>
        <div className="mt-1">
          {lang === 'pt' ? 'Dano' : 'Damage'}: <strong>{per.damage_taken || 0}</strong> {per.damage_type}
        </div>
        {per.defeated && <div className="mt-1" style={{ color: 'var(--blood-bright)' }}>💀 {lang === 'pt' ? 'Alvo abatido!' : 'Target defeated!'}</div>}
        <div className="mt-3"><button className="btn btn-sm btn-primary" onClick={onClose}>OK</button></div>
      </div>
    );
  }
  // attack vs CA
  const hit = result.hit;
  const fallout = result.fallout;
  return (
    <div>
      <div style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', color: 'var(--gold-bright)' }}>
        {result.attack_name} → {result.target_name}
      </div>
      <div className="mt-2">
        d20 {result.attack_roll?.value}{result.attack_total - result.attack_roll?.value >= 0 ? '+' : ''}
        {result.attack_total - result.attack_roll?.value} = <strong>{result.attack_total}</strong> vs CA {result.target_ac} —{' '}
        <strong style={{ color: hit ? 'var(--moss-bright)' : '#ff9999' }}>
          {result.crit ? (lang === 'pt' ? 'CRÍTICO!' : 'CRITICAL!') : hit ? (lang === 'pt' ? 'ACERTO' : 'HIT') : result.natural_one ? (lang === 'pt' ? 'NATURAL 1' : 'NAT 1') : (lang === 'pt' ? 'ERROU' : 'MISS')}
        </strong>
      </div>
      {hit && result.damage && (
        <div className="mt-1">
          {lang === 'pt' ? 'Dano' : 'Damage'}: <strong>{result.damage.total}</strong> {result.damage.type}
          {result.damage_applied?.defeated && <span style={{ color: 'var(--blood-bright)', marginLeft: 8 }}>💀</span>}
        </div>
      )}
      {fallout && (
        <div className="mt-3" style={{ padding: 8, borderLeft: '3px solid var(--blood)', background: 'rgba(255,0,0,0.06)' }}>
          <div style={{ fontFamily: 'var(--display)', color: 'var(--blood-bright)' }}>
            ⚠ {lang === 'pt' ? 'DESVIO!' : 'WILD MISS!'} → {fallout.redirected_to_name}
          </div>
          <div className="text-sm mt-1">
            ({fallout.reason === 'natural_one' ? (lang === 'pt' ? 'rolagem natural 1' : 'natural 1') : `${lang === 'pt' ? 'errou por' : 'missed by'} ${fallout.miss_margin}+`})
          </div>
          <div className="mt-1">
            d20 {fallout.second_attack.attack_roll?.value} = <strong>{fallout.second_attack.attack_total}</strong> vs CA {fallout.second_attack.target_ac} —{' '}
            <strong style={{ color: fallout.second_attack.hit ? 'var(--moss-bright)' : '#ff9999' }}>
              {fallout.second_attack.hit ? (lang === 'pt' ? 'ACERTOU O ALIADO' : 'HIT ALLY') : (lang === 'pt' ? 'errou de novo' : 'missed again')}
            </strong>
          </div>
          {fallout.second_attack.hit && fallout.second_attack.damage && (
            <div className="mt-1">
              {lang === 'pt' ? 'Dano' : 'Damage'}: <strong>{fallout.second_attack.damage.total}</strong> {fallout.second_attack.damage.type}
            </div>
          )}
        </div>
      )}
      <div className="mt-3"><button className="btn btn-sm btn-primary" onClick={onClose}>OK</button></div>
    </div>
  );
};

const CombatActionPanel = ({ char, lang, onUpdate }) => {
  const [combat, setCombat] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [picker, setPicker] = useState(null); // { attack, attackerCombatant }
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Descobre campaignId a partir do char.id
  useEffect(() => {
    if (!char.inCampaign || typeof char.id !== 'number') return;
    let cancelled = false;
    api.characterCampaigns(char.id).then(r => {
      if (cancelled) return;
      const c = (r.campaigns || [])[0];
      if (c) setCampaignId(c.id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [char.id, char.inCampaign]);

  // Polling do estado de combate
  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    const fetch = async () => {
      try {
        const r = await api.getCombat(campaignId);
        if (!cancelled) setCombat(r.combat);
      } catch (e) { /* ignora */ }
    };
    fetch();
    const id = setInterval(fetch, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [campaignId]);

  if (!combat || !combat.active) return null;

  const myCombatant = (combat.combatants || []).find(c =>
    c.type === 'pc' && c.character_id === char.id
  );
  if (!myCombatant) return null;

  const attacks = deriveAttacks(char);
  if (attacks.length === 0) {
    return (
      <div className="card mb-3" style={{ borderLeft: '3px solid var(--gold)', padding: 12 }}>
        <strong style={{ color: 'var(--gold)' }}>⚔ {lang === 'pt' ? 'Em combate' : 'In combat'}</strong>
        <div className="muted small mt-1">
          {lang === 'pt' ? 'Adicione armas ou truques para atacar.' : 'Add weapons or cantrips to attack.'}
        </div>
      </div>
    );
  }

  const myTurnIndex = (combat.combatants || []).findIndex(c => c.id === myCombatant.id);
  const isMyTurn = myTurnIndex === combat.turnIndex;

  const fire = async (target) => {
    setBusy(true); setError('');
    try {
      const body = {
        attackerCombatantId: myCombatant.id,
        targetId: target.id,
        attackKind: picker.attack.kind,
        attackName: picker.attack.name,
        damage: picker.attack.damage,
        damageType: picker.attack.damageType,
      };
      if (picker.attack.save) {
        body.save = picker.attack.save;
      } else {
        body.attackBonus = picker.attack.attackBonus || 0;
      }
      const res = await api.combatPlayerAttack(campaignId, body);
      setResult(res.result);
      setCombat(res.combat);
      // Se HP do meu PC mudou (ex: ele se machucou via fallout), reflete na ficha
      const me = (res.combat.combatants || []).find(c => c.id === myCombatant.id);
      if (me && me.current_hp !== char.currentHp) {
        onUpdate({ ...char, currentHp: me.current_hp });
      }
    } catch (e) {
      setError(e?.data?.error || e?.message || 'failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card mb-3" style={{ borderLeft: '3px solid var(--blood)', padding: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <strong style={{ color: 'var(--blood-bright)' }}>
          ⚔ {lang === 'pt' ? 'Combate ativo' : 'Combat active'}
          {isMyTurn && <span style={{ color: 'var(--gold-bright)', marginLeft: 8 }}>· {lang === 'pt' ? 'SUA VEZ' : 'YOUR TURN'}</span>}
        </strong>
        <span className="text-xs muted">
          {lang === 'pt' ? 'Rodada' : 'Round'} {combat.round} · HP {myCombatant.current_hp}/{myCombatant.stats?.max_hp}
        </span>
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        {attacks.map(atk => (
          <button
            key={atk.key}
            className="btn btn-sm btn-primary"
            onClick={() => { setResult(null); setPicker({ attack: atk }); }}
            disabled={busy}
            title={atk.save ? `Save ${atk.save.ability.toUpperCase()} CD ${atk.save.dc}` : `+${atk.attackBonus} ${atk.damage}`}
          >
            {atk.icon} {atk.name}
            <span className="text-xs muted" style={{ marginLeft: 6 }}>
              {atk.save ? `CD ${atk.save.dc}` : `+${atk.attackBonus}`}
            </span>
          </button>
        ))}
      </div>
      {error && <div className="mt-2" style={{ color: '#ff9999', fontSize: '0.85em' }}>{error}</div>}
      {picker && (
        <TargetPickerModal
          onClose={() => { setPicker(null); setResult(null); }}
          combat={combat}
          attacker={myCombatant}
          attack={picker.attack}
          onPick={fire}
          lang={lang}
          busy={busy}
          result={result}
        />
      )}
    </div>
  );
};

export default CombatActionPanel;
