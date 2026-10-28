// "Começar o combate" (V8, especificação §4.6, W4): a folha pequena que monta o
// combate da cena numa chamada (POST /combat/…/encounter, encounter-setup.js).
//
//   COMEÇAR O COMBATE · Ponte velha                     [✕]
//   2 × Goblin Guerreiro            [−] 2 [+]   [＋ Monstro]
//   ☑ Incluir os 4 personagens (em casas livres)
//   ☑ Pedir a iniciativa à mesa (os jogadores rolam no app)
//   Já há um combate montado (3 combatentes): (•) Trocar por este ( ) Somar a ele
//   ▸ Mais opções: iniciativa dos monstros · mapa · ☑ já iniciar
//   [                ⚔ Começar                ]
//
// - Trocar/Somar só aparece com um combate já montado. Trocar um combate andando o
//   encerra (o resumo vai ao Diário, como no ⏸ Encerrar) antes de montar o novo.
// - O botão fica desligado enquanto envia; o mesmo opId vale até dar certo (o 2º
//   toque e a rede que reenvia não duplicam nada).
// - "Já iniciar" acompanha o "Pedir a iniciativa" (pedindo, o combate começa pelo
//   "Usar e começar" do Combate, com as respostas) até o mestre mexer nele.
// - Deu certo: o aviso diz o que entrou e quem chamou leva para Jogar › Combate.
import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { errorMessage } from '../api/errors.js';
import MesaSheet from '../shell/MesaSheet.jsx';
import MonsterPicker from '../campaigns/MonsterPicker.jsx';
import { encounterBody, encounterGroups, groupsTotal, MAX_ENCOUNTER_MONSTERS } from '../combat/encounter-setup.js';
import { findMonster, monsterForCombat } from '../../data/bestiary.js';
import { loadCustomMonsters } from '../combat/custom-monsters.js';
import { fightToEncounter, sceneView } from '../prep/scene-model.js';
import { failText, newOpId } from './damage-model.js';
import { startEncounter } from './combat-actions.js';
import { useTable } from './table-store.js';
import { flash } from './flash.js';
import '../campaigns/combat-styles.css';

const t = (lang, pt, en) => (lang === 'en' ? en : pt);

// o monstro de uma entrada de combate: o do catálogo, um dos "meus monstros" ou o snapshot salvo
function monsterResolver() {
  const custom = loadCustomMonsters();
  return (e) => (e.monsterId ? (findMonster(e.monsterId) || custom.find(m => m.id === e.monsterId)) : null) || e.snapshot || null;
}

/**
 * A sala da aventura (cena ligada) como `scene` desta folha: o combate dela
 * (node.encounter, com o stat block do catálogo ou o snapshot salvo), a imagem para o
 * mapa e de onde veio (o fim guiado lista o tesouro dela).
 */
export function sceneOfNode(adventure, node, lang = 'pt') {
  return {
    name: node?.name || '', advId: adventure?.id, nodeId: node?.id,
    image: node?.image || null, hasImage: !!(node?.image || node?.hasImage),
    groups: encounterGroups(node?.encounter || [], { resolve: monsterResolver(), toCombat: monsterForCombat, lang }),
  };
}

/**
 * A cena do Plano (Jogar › Agora, a folha da cena) como `scene` desta folha. Cena solta:
 * o ⚔ dela (scene.fight, com os "meus monstros" no snap) e, para o mapa, o cartão do
 * 📺 Imagem (map-from {entryId}) — só como opção: a imagem da cena nem sempre é um mapa
 * (pode ser o retrato de quem aparece), então o padrão é manter o mapa. Cena ligada: o
 * combate e a imagem da sala (`node`, a sala leve do …/node, que diz `hasImage`), como o
 * sceneOfNode.
 */
export function sceneOfPlan(scene, node = null, lang = 'pt') {
  const v = sceneView(scene, node);
  const ref = scene?.nodeRef || null;
  const entryId = !ref && v.show?.kind === 'entry' ? v.show.id : null;
  return {
    name: v.name || '', advId: ref?.adventureId, nodeId: ref?.nodeId, entryId,
    image: ref ? node?.image || null : null,
    hasImage: ref ? !!(node?.image || node?.hasImage) : entryId != null,
    mapDefault: ref ? 'scene' : 'keep',
    groups: encounterGroups(v.fight.map(fightToEncounter), { resolve: monsterResolver(), toCombat: monsterForCombat, lang }),
  };
}

/**
 * Props: campaign, lang, onClose, onStarted(result)
 *   scene: {name, groups (encounterGroups), advId?, nodeId?, entryId?, image? (data URL, só
 *           para o servidor antigo), hasImage?}
 *   planScene + node: no lugar de `scene`, a cena do Plano (sceneOfPlan) — quem chama não
 *           precisa carregar o bestiário (a Agora abre esta folha sob demanda)
 *   combat?: o combate atual (sem ele, a folha lê uma vez ao abrir)
 */
export default function StartCombatSheet({
  campaign, lang = 'pt', scene: sceneProp = null, planScene = null, node = null, combat: combatProp = null, onClose, onStarted,
}) {
  const [scene] = useState(() => sceneProp || (planScene ? sceneOfPlan(planScene, node, lang) : {}));
  const table = useTable();
  const [combat, setCombat] = useState(combatProp);
  const [groups, setGroups] = useState(() => (scene.groups || []).map(g => ({ ...g })));
  const players = useMemo(() => (campaign.members || []).filter(m => m.role !== 'dm' && m.character), [campaign.members]);
  const [withPcs, setWithPcs] = useState(players.length > 0);
  const [askInit, setAskInit] = useState(players.length > 0);
  const [startNow, setStartNow] = useState(null);           // null = acompanha o "Pedir a iniciativa"
  const [mode, setMode] = useState('replace');
  const [monsterInit, setMonsterInit] = useState('each');
  const hasImage = !!(scene.hasImage || scene.image);
  const [map, setMap] = useState(hasImage && scene.mapDefault !== 'keep' ? 'scene' : 'keep');
  const [more, setMore] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const opRef = useRef(newOpId());

  useEffect(() => {
    if (combatProp) { setCombat(combatProp); return undefined; }
    let alive = true;
    api.getCombat(campaign.id).then(r => { if (alive) setCombat(r?.combat || null); }).catch(() => { if (alive) setCombat(null); });
    return () => { alive = false; };
  }, [campaign.id, combatProp]);

  const existing = (combat?.combatants || []).length;
  const running = !!combat?.active;
  const total = groupsTotal(groups);
  const start = startNow == null ? !(askInit && withPcs) : startNow;
  const tooMany = total > MAX_ENCOUNTER_MONSTERS;
  const nothing = total === 0 && !(withPcs && players.length);

  const setCount = (key, delta) => setGroups(gs => gs
    .map(g => (g.key === key ? { ...g, count: Math.max(0, Math.min(20, g.count + delta)) } : g)));
  const addMonster = (monster, count, initiative) => {
    const name = (typeof monster.name === 'object' ? (monster.name?.[lang] || monster.name?.en) : monster.name) || 'Monster';
    const scale = { Tiny: 0.5, Large: 2, Huge: 3, Gargantuan: 4 }[monster.size] || 1;
    setGroups(gs => [...gs, { key: `${monster.id || name}:${Date.now()}`, monster, name, count, initiative, tokenScale: scale }]);
    setPicking(false);
  };

  const go = async () => {
    if (busy || nothing || tooMany) return;
    setBusy(true); setError('');
    const mapRef = map === 'scene' && hasImage && scene.advId != null ? { advId: scene.advId, nodeId: scene.nodeId }
      : map === 'scene' && hasImage && scene.entryId != null ? { entryId: scene.entryId }
        : map === 'none' ? 'none' : 'keep';
    const body = encounterBody({
      opId: opRef.current, groups, mode: existing ? mode : 'add', pcs: withPcs, askInitiative: withPcs && askInit,
      monsterInit, map: mapRef, start, lang,
      scene: scene.advId != null || scene.name ? { advId: scene.advId, nodeId: scene.nodeId, name: scene.name || '' } : null,
    });
    try {
      const r = await startEncounter(campaign.id, body, {
        groups, members: players, combatants: combat?.combatants || [], map: combat?.map || {}, image: scene.image || null,
      });
      opRef.current = newOpId();
      if (r?.combat) table?.applyCombat?.(r.combat);
      const pcsIn = (r?.combat?.combatants || []).filter(c => c.type === 'pc').length;
      flash([
        t(lang, `⚔ Combate montado: ${total} monstro${total === 1 ? '' : 's'}`, `⚔ Combat set: ${total} monster${total === 1 ? '' : 's'}`),
        pcsIn ? t(lang, `${pcsIn} personagem${pcsIn === 1 ? '' : 's'}`, `${pcsIn} character${pcsIn === 1 ? '' : 's'}`) : null,
        body.askInitiative ? t(lang, 'iniciativa pedida à mesa', 'initiative asked') : null,
        start ? t(lang, 'começou', 'started') : null,
      ].filter(Boolean).join(' · '));
      onStarted?.(r);
      onClose?.();
    } catch (e) {
      // sem resposta pode ter chegado ("Talvez não enviado"): o opId é o mesmo no reenvio
      setError(`${failText(e, lang)} · ${errorMessage(e, lang)}`);
    } finally { setBusy(false); }
  };

  const footer = (
    <div className="sc-foot">
      {error && <p className="cc-action-error" role="alert">{error}</p>}
      {tooMany && <p className="mesa-hint sc-why">{t(lang, `No máximo ${MAX_ENCOUNTER_MONSTERS} monstros de uma vez.`, `At most ${MAX_ENCOUNTER_MONSTERS} monsters at once.`)}</p>}
      {nothing && !tooMany && <p className="mesa-hint sc-why">{t(lang, 'Ponha um monstro ou inclua os personagens.', 'Add a monster or include the characters.')}</p>}
      <button type="button" className="mesa-btn mesa-btn-lg is-primary sc-go" disabled={busy || nothing || tooMany} onClick={go}>
        {busy ? '…' : <>⚔ {t(lang, 'Começar', 'Start')}</>}
      </button>
    </div>
  );

  return (
    <MesaSheet title={t(lang, 'Começar o combate', 'Start combat')} eyebrow={scene.name || null} icon="⚔" size="auto" width="sm"
      lang={lang} onClose={onClose} footer={footer} dock="play" className="sc-sheet">
      <ul className="sc-groups" aria-label={t(lang, 'Monstros', 'Monsters')}>
        {groups.map(g => (
          <li key={g.key} className={`sc-group ${g.count ? '' : 'is-off'}`}>
            <span className="sc-group-name"><strong>{g.count} ×</strong> {g.name}</span>
            <span className="sc-step" role="group" aria-label={t(lang, `Quantos ${g.name}`, `How many ${g.name}`)}>
              <button type="button" className="mesa-icon-btn sc-step-btn" disabled={g.count <= 0}
                aria-label={t(lang, 'Menos um', 'One less')} onClick={() => setCount(g.key, -1)}>−</button>
              <span className="sc-step-n" aria-live="polite">{g.count}</span>
              <button type="button" className="mesa-icon-btn sc-step-btn" disabled={g.count >= 20}
                aria-label={t(lang, 'Mais um', 'One more')} onClick={() => setCount(g.key, 1)}>+</button>
            </span>
          </li>
        ))}
        {groups.length === 0 && <li className="mesa-hint">{t(lang, 'Nenhum monstro ainda.', 'No monster yet.')}</li>}
      </ul>
      <button type="button" className="mesa-btn sc-add" onClick={() => setPicking(true)}>＋ {t(lang, 'Monstro', 'Monster')}</button>

      <div className="sc-opts">
        {players.length > 0 && (
          <label className="cs-check sc-check">
            <input type="checkbox" checked={withPcs} onChange={e => setWithPcs(e.target.checked)} />
            <span>{t(lang, `Incluir os ${players.length} personagens (em casas livres)`, `Include the ${players.length} characters (in free squares)`)}</span>
          </label>
        )}
        {players.length > 0 && withPcs && (
          <label className="cs-check sc-check">
            <input type="checkbox" checked={askInit} onChange={e => setAskInit(e.target.checked)} />
            <span>{t(lang, 'Pedir a iniciativa à mesa (os jogadores rolam no app)', 'Ask the table for initiative (players roll in the app)')}</span>
          </label>
        )}
      </div>

      {existing > 0 && (
        <fieldset className="sc-mode">
          <legend className="mesa-hint">
            {running
              ? t(lang, `Há um combate andando (${existing} combatentes, rodada ${combat.round}):`, `A combat is running (${existing} combatants, round ${combat.round}):`)
              : t(lang, `Já há um combate montado (${existing} combatentes):`, `There's a combat set up already (${existing} combatants):`)}
          </legend>
          <label className="cs-check sc-radio">
            <input type="radio" name="sc-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <span>{t(lang, 'Trocar por este', 'Replace it')} <em className="sc-sub">{running
              ? t(lang, '(o combate de agora é encerrado e vai ao Diário; os monstros dele saem)', '(the current combat ends and goes to the Diary; its monsters leave)')
              : t(lang, '(os monstros de antes saem)', '(the old monsters leave)')}</em></span>
          </label>
          <label className="cs-check sc-radio">
            <input type="radio" name="sc-mode" checked={mode === 'add'} onChange={() => setMode('add')} />
            <span>{t(lang, 'Somar a ele', 'Add to it')}</span>
          </label>
        </fieldset>
      )}

      <button type="button" className="mesa-btn is-quiet sc-more" aria-expanded={more} onClick={() => setMore(v => !v)}>
        <span aria-hidden="true">{more ? '▾' : '▸'}</span> {t(lang, 'Mais opções', 'More options')}
      </button>
      {more && (
        <div className="sc-more-body">
          <p className="sc-label">{t(lang, 'Iniciativa dos monstros', 'Monster initiative')}</p>
          <div className="sc-chips" role="radiogroup" aria-label={t(lang, 'Iniciativa dos monstros', 'Monster initiative')}>
            {[['each', t(lang, 'Cada um rola', 'Each rolls')], ['group', t(lang, 'Uma para todos', 'One for all')]].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={monsterInit === id}
                className={`mesa-chip ${monsterInit === id ? 'active' : ''}`} onClick={() => setMonsterInit(id)}>{label}</button>
            ))}
          </div>
          <p className="mesa-hint">{monsterInit === 'each'
            ? t(lang, 'd20 + DES de cada monstro, rolado no servidor; dá para mudar na linha depois.', 'd20 + DEX for each monster, rolled on the server; editable on the row later.')
            : t(lang, 'Um d20 só; cada monstro soma o próprio bônus.', 'One d20; each monster adds its own bonus.')}</p>
          <p className="sc-label">{t(lang, 'Mapa', 'Map')}</p>
          <div className="sc-chips" role="radiogroup" aria-label={t(lang, 'Mapa', 'Map')}>
            {[
              ...(hasImage ? [['scene', t(lang, 'Da cena', 'From the scene')]] : []),
              ['keep', t(lang, 'Manter o atual', 'Keep current')],
              ['none', t(lang, 'Sem mapa', 'No map')],
            ].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={map === id}
                className={`mesa-chip ${map === id ? 'active' : ''}`} onClick={() => setMap(id)}>{label}</button>
            ))}
          </div>
          <label className="cs-check sc-check">
            <input type="checkbox" checked={start} onChange={e => setStartNow(e.target.checked)} />
            <span>{t(lang, 'Já iniciar (rodada 1)', 'Start right away (round 1)')}</span>
          </label>
          {start && withPcs && askInit && (
            <p className="mesa-hint">{t(lang, 'Os personagens entram com 10 até responderem; dá para ajustar depois.', 'Characters start at 10 until they answer; you can adjust later.')}</p>
          )}
        </div>
      )}

      {picking && (
        <MonsterPicker lang={lang} levelingMode={campaign.state?.levelingMode || 'milestone'} members={campaign.members}
          confirmLabel={t(lang, 'Pôr no combate', 'Add to combat')} onPick={addMonster} onClose={() => setPicking(false)} />
      )}
    </MesaSheet>
  );
}
