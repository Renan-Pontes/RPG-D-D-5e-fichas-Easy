/* Etapa: equipamento inicial (pacote da classe + pacote do antecedente). Ver ../README.md. */
import { useEffect } from 'react';
import Icon from '../../../components/Icons.jsx';
import SRD from '../../../data/srd.js';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { isArmorProficient, isWeaponProficient, packProficiencyIssues } from '../start-data.js';
import {
  classPackOptions, backgroundPackOptions, selectedPacks, isGoldOnly, packLines, applyStartingEquipment,
  needsReapply, equipmentWarnings, equipmentIssues, acPreview, weaponEntry, weaponSummary, armorHint,
} from '../equipment-helpers.js';

const COINS = ['cp', 'sp', 'ep', 'gp', 'pp'];

/** O pacote traz armadura ou escudo que o personagem não sabe usar? */
const armorProblem = (char, pack) => packProficiencyIssues(char, pack).some(it => it.kind === 'armor' || it.kind === 'shield');

/** Aviso (com botão) quando o pacote escolhido traz armadura sem treino — ex.: trocou de subclasse depois. */
function ArmorTrainingFix({ char, lang, pack, opts, label, onPick }) {
  if (!pack || !armorProblem(char, pack)) return null;
  const alt = opts.find(p => p.id !== pack.id && !isGoldOnly(p) && !armorProblem(char, p)) || opts.find(p => p.id !== pack.id && !armorProblem(char, p));
  return (
    <Callout kind="warn">
      {L(lang,
        `A Opção ${pack.id} ${label.pt} traz armadura que você não tem treino para usar (talvez porque trocou de classe ou subclasse). Com ela você não conseguiria conjurar magias e teria desvantagem nos ataques. Escolha outra opção para continuar.`,
        `Option ${pack.id} (${label.en}) includes armor you are not trained to use (maybe you changed class or subclass). With it you couldn't cast spells and would have disadvantage on attacks. Pick another option to continue.`)}
      {alt && (
        <div style={{ marginTop: 8 }}>
          <button type="button" className="btn btn-sm" onClick={() => onPick(alt.id)}>
            {L(lang, `Trocar para a Opção ${alt.id}`, `Switch to Option ${alt.id}`)}
          </button>
        </div>
      )}
    </Callout>
  );
}

function PackContents({ pack, char, lang }) {
  const lines = packLines(pack, char, lang);
  return (
    <ul className="cr-eq-lines">
      {lines.map((l, i) => (
        <li key={i} className={l.warn ? 'cr-eq-warn' : ''}>
          <strong>{l.text}</strong>
          {l.hint && <span className="cr-eq-hint"> — {l.hint}</span>}
          {l.warn && <span className="cr-eq-flag"> {L(lang, '(sem treino)', '(not trained)')}</span>}
        </li>
      ))}
    </ul>
  );
}

function PackCard({ pack, index, char, lang, selected, onPick, firstItemPack }) {
  const gold = isGoldOnly(pack);
  const title = gold
    ? L(lang, `Opção ${pack.id} — só ouro`, `Option ${pack.id} — gold only`)
    : L(lang, `Opção ${pack.id} — pacote pronto`, `Option ${pack.id} — ready-made kit`);
  const subtitle = gold
    ? `${pack.gp} ${L(lang, 'PO', 'GP')}${pack.roll ? L(lang, ` (média de ${pack.roll})`, ` (average of ${pack.roll})`) : ''}`
    : `+ ${pack.gp || 0} ${L(lang, 'PO', 'GP')}`;
  return (
    <ChoiceCard selected={selected} onClick={onPick} title={title} subtitle={subtitle}
      badge={!gold && index === firstItemPack ? L(lang, 'Bom para começar', 'Good for beginners') : null}>
      {gold ? (
        <div className="cr-eq-hint" style={{ marginTop: 6 }}>
          {L(lang, 'Você começa só com o ouro e compra o equipamento com o mestre. Melhor para quem já conhece as regras.',
            'You start with gold only and buy your gear with the DM. Better if you already know the rules.')}
          {pack.replacesBackground && <> {L(lang, 'Esta opção substitui também o equipamento do antecedente.', 'This option also replaces your background equipment.')}</>}
        </div>
      ) : <PackContents pack={pack} char={char} lang={lang} />}
    </ChoiceCard>
  );
}

function AdvancedEditor({ char, set, lang }) {
  const rules = char.rulesVersion === '2014' ? '2014' : '2024';
  const weapons = SRD.weaponsFor(rules);
  const groups = [
    ['simple-melee', L(lang, 'Simples — corpo a corpo', 'Simple — melee')],
    ['simple-ranged', L(lang, 'Simples — à distância', 'Simple — ranged')],
    ['martial-melee', L(lang, 'Marcial — corpo a corpo', 'Martial — melee')],
    ['martial-ranged', L(lang, 'Marcial — à distância', 'Martial — ranged')],
  ];
  const noTrain = L(lang, ' — sem treino', ' — not trained');
  const addWeapon = (id) => {
    const w = weaponEntry(id, char, lang, { from: 'manual' });
    if (w) set(prev => ({ weapons: [...(prev.weapons || []), w] }));
  };
  const removeWeapon = (i) => set(prev => ({ weapons: (prev.weapons || []).filter((_, k) => k !== i) }));
  const updateEq = (i, patch) => set(prev => ({ equipment: (prev.equipment || []).map((e, k) => (k === i ? { ...e, ...patch } : e)) }));
  const removeEq = (i) => set(prev => ({ equipment: (prev.equipment || []).filter((_, k) => k !== i) }));
  const addEq = () => set(prev => ({ equipment: [...(prev.equipment || []), { name: '', qty: 1, from: 'manual' }] }));

  return (
    <details className="card cr-eq-advanced">
      <summary>{L(lang, 'Ajustes manuais (avançado)', 'Manual adjustments (advanced)')}</summary>
      <p className="cr-eq-hint">
        {L(lang, 'Opcional. Use só se o mestre combinou algo diferente. Trocar de pacote acima refaz os itens do pacote, mas mantém o que você adicionar aqui.',
          'Optional. Only if your DM agreed on something different. Switching packages above redoes the package items but keeps what you add here.')}
      </p>

      <label htmlFor="cr-eq-armor">{L(lang, 'Armadura', 'Armor')}</label>
      <select id="cr-eq-armor" value={char.armor || ''} onChange={e => set({ armor: e.target.value || null })}>
        <option value="">{L(lang, 'Sem armadura', 'No armor')}</option>
        {SRD.ARMOR.filter(a => a.type !== 'shield').map(a => (
          <option key={a.id} value={a.id}>
            {tName('armor', a.id, lang)} ({armorHint(a, lang)}){isArmorProficient(char, a.id) ? '' : noTrain}
          </option>
        ))}
      </select>
      <label className="row gap-2" style={{ margin: '10px 0', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!char.hasShield} onChange={e => set({ hasShield: e.target.checked })}
          style={{ width: 'auto', minHeight: 'auto' }} />
        {L(lang, 'Escudo (+2 na CA)', 'Shield (+2 AC)')}{isArmorProficient(char, 'shield') ? '' : noTrain}
      </label>

      <label htmlFor="cr-eq-weapon">{L(lang, 'Adicionar arma', 'Add weapon')}</label>
      <select id="cr-eq-weapon" value="" onChange={e => { if (e.target.value) addWeapon(e.target.value); }}>
        <option value="">{L(lang, 'Escolha uma arma…', 'Pick a weapon…')}</option>
        {groups.map(([type, label]) => (
          <optgroup key={type} label={label}>
            {weapons.filter(w => w.type === type).map(w => (
              <option key={w.id} value={w.id}>
                {tName('weapon', w.id, lang)} ({weaponSummary(w.id, char, lang)}){isWeaponProficient(char, w.id) ? '' : L(lang, ' — sem proficiência', ' — not proficient')}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {(char.weapons || []).map((w, i) => (
        <div key={i} className="inv-row">
          <div style={{ flex: 1 }}>
            <div>{w.name}</div>
            {w.id && <div className="text-xs muted">{weaponSummary(w.id, char, lang)}</div>}
          </div>
          <button type="button" className="btn btn-icon btn-ghost btn-danger" onClick={() => removeWeapon(i)}
            aria-label={L(lang, `Remover ${w.name}`, `Remove ${w.name}`)}><Icon name="trash" size={14} /></button>
        </div>
      ))}

      <h4 style={{ margin: '16px 0 8px' }}>{L(lang, 'Itens', 'Items')}</h4>
      {(char.equipment || []).map((e, i) => (
        <div key={i} className="inv-row">
          <input value={e.name} onChange={ev => updateEq(i, { name: ev.target.value })} placeholder={L(lang, 'Item', 'Item')}
            aria-label={L(lang, 'Nome do item', 'Item name')} />
          <input className="inv-qty" type="number" min="1" value={e.qty} onChange={ev => updateEq(i, { qty: Math.max(1, +ev.target.value || 1) })}
            aria-label={L(lang, 'Quantidade', 'Quantity')} />
          <button type="button" className="btn btn-icon btn-ghost btn-danger" onClick={() => removeEq(i)}
            aria-label={L(lang, 'Remover item', 'Remove item')}><Icon name="trash" size={14} /></button>
        </div>
      ))}
      <button type="button" className="btn btn-sm btn-ghost" onClick={addEq} style={{ marginTop: 4 }}>
        <Icon name="plus" size={14} /> {L(lang, 'Adicionar item', 'Add item')}
      </button>

      <h4 style={{ margin: '16px 0 8px' }}>{L(lang, 'Moedas', 'Coins')}</h4>
      <div className="cr-eq-coins">
        {COINS.map(c => (
          <div key={c}>
            <label htmlFor={`cr-eq-coin-${c}`}>{tName('coin', c, lang)}</label>
            <input id={`cr-eq-coin-${c}`} type="number" min="0" value={(char.coins || {})[c] || 0}
              onChange={e => set(prev => ({ coins: { ...(prev.coins || {}), [c]: Math.max(0, +e.target.value || 0) } }))} />
          </div>
        ))}
      </div>
    </details>
  );
}

function Comp({ char, set, lang }) {
  // Recalcula ao entrar se a classe/antecedente/escolhas mudaram (ou o idioma), sem duplicar nada.
  useEffect(() => {
    if (needsReapply(char, lang)) set(prev => applyStartingEquipment(prev, lang));
  }, [char, lang, set]);

  const classOpts = classPackOptions(char);
  const bgOpts = backgroundPackOptions(char);
  const sel = selectedPacks(char);
  const pickPack = (key, id) => set(prev => applyStartingEquipment({ ...prev, creation: { ...(prev.creation || {}), [key]: id } }, lang));
  const firstItemPack = (opts) => {
    const ok = opts.findIndex(p => !isGoldOnly(p) && !armorProblem(char, p));
    return ok >= 0 ? ok : opts.findIndex(p => !isGoldOnly(p));
  };
  const className = char.className ? tName('class', char.className, lang) : '';
  const bgName = char.background ? tName('background', char.background, lang) : '';
  const { ac, unarmored } = acPreview(char);
  const warnings = equipmentWarnings(char);
  const unarmoredClass = char.className === 'barbarian' || char.className === 'monk';
  const gp = (char.coins || {}).gp || 0;

  return (
    <div>
      <StepIntro title={L(lang, 'Equipamento inicial', 'Starting equipment')}>
        {lang === 'pt'
          ? <>Todo herói começa com armas, talvez uma armadura e algumas <Term id="goldPieces" lang={lang}>Peças de Ouro</Term>. Escolha um pacote da classe e um do antecedente. O pacote pronto é o jeito mais fácil: já vem com o que sua classe sabe usar.</>
          : <>Every hero starts with weapons, maybe some armor and a few <Term id="goldPieces" lang={lang}>Gold Pieces</Term>. Pick one package from your class and one from your background. The ready-made kit is the easiest choice: it has what your class knows how to use.</>}
      </StepIntro>

      {classOpts.length > 0 ? (
        <section className="cr-eq-section">
          <h3>{L(lang, `Da sua classe${className ? ` (${className})` : ''}`, `From your class${className ? ` (${className})` : ''}`)}</h3>
          <ArmorTrainingFix char={char} lang={lang} pack={sel.classPack} opts={classOpts} label={{ pt: 'da classe', en: 'class' }}
            onPick={(id) => pickPack('classPack', id)} />
          <ChoiceGrid cols={classOpts.length > 1 ? 2 : 1}>
            {classOpts.map((p, i) => (
              <PackCard key={p.id} pack={p} index={i} char={char} lang={lang} firstItemPack={firstItemPack(classOpts)}
                selected={char.creation?.classPack === p.id} onPick={() => pickPack('classPack', p.id)} />
            ))}
          </ChoiceGrid>
        </section>
      ) : (
        <Callout kind="warn">{L(lang, 'Escolha uma classe primeiro para ver o equipamento dela.', 'Pick a class first to see its equipment.')}</Callout>
      )}

      {bgOpts.length > 0 && (
        <section className="cr-eq-section">
          <h3>{L(lang, `Do seu antecedente${bgName ? ` (${bgName})` : ''}`, `From your background${bgName ? ` (${bgName})` : ''}`)}</h3>
          {sel.bgReplaced ? (
            <Callout kind="info">{L(lang, 'Você escolheu começar só com ouro, então o equipamento do antecedente não vem (já está incluído no valor).',
              'You chose to start with gold only, so the background equipment is not added (it is included in that amount).')}</Callout>
          ) : bgOpts.length === 1 ? (
            <div className="card">
              <div className="option-meta">{L(lang, 'Vem junto automaticamente', 'Included automatically')} · +{bgOpts[0].gp || 0} {L(lang, 'PO', 'GP')}</div>
              <PackContents pack={bgOpts[0]} char={char} lang={lang} />
            </div>
          ) : (
            <>
            <ArmorTrainingFix char={char} lang={lang} pack={sel.backgroundPack} opts={bgOpts} label={{ pt: 'do antecedente', en: 'background' }}
              onPick={(id) => pickPack('backgroundPack', id)} />
            <ChoiceGrid cols={2}>
              {bgOpts.map((p, i) => (
                <PackCard key={p.id} pack={p} index={i} char={char} lang={lang} firstItemPack={firstItemPack(bgOpts)}
                  selected={char.creation?.backgroundPack === p.id} onPick={() => pickPack('backgroundPack', p.id)} />
              ))}
            </ChoiceGrid>
            </>
          )}
        </section>
      )}

      {(sel.classPack || sel.backgroundPack) && (
        <section className="card cr-eq-result" aria-live="polite">
          <div className="cr-eq-stats">
            <div className="stat-row">
              <span><Term id="armorClass" lang={lang}>{L(lang, 'Classe de Armadura', 'Armor Class')}</Term></span>
              <strong className="cr-eq-big">{ac}</strong>
            </div>
            <div className="stat-row">
              <span><Term id="goldPieces" lang={lang}>{L(lang, 'Ouro', 'Gold')}</Term></span>
              <strong className="cr-eq-big">{gp} {L(lang, 'PO', 'GP')}</strong>
            </div>
          </div>
          <div className="text-xs muted">
            {char.armor ? `${tName('armor', char.armor, lang)}` : L(lang, 'Sem armadura', 'No armor')}
            {char.hasShield ? L(lang, ' + escudo', ' + shield') : ''}
            {(char.weapons || []).length > 0 && <> · {(char.weapons || []).map(w => w.name).join(', ')}</>}
          </div>
          {unarmoredClass && (
            <Callout kind="info">
              {lang === 'pt'
                ? <>Sua classe tem <Term id="unarmoredDefense" lang={lang}>Defesa sem Armadura</Term>: sem armadura sua CA seria {unarmored}. Por isso o pacote não traz armadura.</>
                : <>Your class has <Term id="unarmoredDefense" lang={lang}>Unarmored Defense</Term>: without armor your AC would be {unarmored}. That's why the kit has no armor.</>}
            </Callout>
          )}
          {warnings.map(w => <Callout key={w.id} kind="warn">{w[lang] || w.pt}</Callout>)}
          {warnings.some(w => w.id === 'armorTraining' || w.id === 'shieldTraining') && (
            <div className="text-xs muted">
              {lang === 'pt'
                ? <>Veja <Term id="armorTraining" lang={lang}>treino em armadura</Term>.</>
                : <>See <Term id="armorTraining" lang={lang}>armor training</Term>.</>}
            </div>
          )}
        </section>
      )}

      <AdvancedEditor char={char} set={set} lang={lang} />
    </div>
  );
}

export default {
  id: 'equipment',
  title: { pt: 'Equipamento', en: 'Equipment' },
  issues: equipmentIssues,
  Comp,
};
