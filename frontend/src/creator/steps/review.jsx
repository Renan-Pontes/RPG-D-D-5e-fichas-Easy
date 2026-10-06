/* Etapa final — Revisão: ficha resumida com cada número explicado + todas as pendências. */
import { useMemo } from 'react';
import { tName } from '../../../data/i18n.js';
import Utils from '../../../utils.js';
// Import circular (steps.js importa esta etapa): STEPS só é lido dentro de funções,
// depois que todos os módulos terminaram de carregar.
import { STEPS } from '../steps.js';
import { StepIntro, Term, Callout, IssueList, L } from '../ui.jsx';

// Nome com quantidade (o pacote às vezes já grava "Adaga ×2" no nome).
const withQty = (name, qty) => (qty > 1 && !/×\s*\d+\s*$/.test(String(name || '')) ? `${name} ×${qty}` : name);
import { collectIssues, flatIssues, characterSummary, abilityAbbr, ALIGNMENT_INFO, initiativeExplain, creationJoin } from '../creation.js';

const fmt = (n) => Utils.fmtMod(n);
const ABILITY_NAMES = {
  str: ['Força', 'Strength'], dex: ['Destreza', 'Dexterity'], con: ['Constituição', 'Constitution'],
  int: ['Inteligência', 'Intelligence'], wis: ['Sabedoria', 'Wisdom'], cha: ['Carisma', 'Charisma'],
};
const abilityName = (id, lang) => ABILITY_NAMES[id]?.[lang === 'pt' ? 0 : 1] || id;
const DAMAGE = {
  acid: 'ácido', bludgeoning: 'contundente', cold: 'frio', fire: 'fogo', force: 'energia', lightning: 'elétrico',
  necrotic: 'necrótico', piercing: 'perfurante', poison: 'veneno', psychic: 'psíquico', radiant: 'radiante',
  slashing: 'cortante', thunder: 'trovejante',
};

function Row({ label, value, children }) {
  return (
    <div className="stat-row" style={{ gridTemplateColumns: '1fr auto' }}>
      <div className="stat-name">{label}<small>{children}</small></div>
      <div className="cr-review-value">{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

// Texto do "tudo pronto": acompanha o rótulo do botão do rodapé e cita a mesa.
export function readyText(lang, char, joinEnabled) {
  const join = joinEnabled ? creationJoin(char) : null;
  const who = String(char?.name || '').trim();
  if (join) {
    const table = join.name || L(lang, 'a mesa', 'the table');
    return who
      ? L(lang, `Tudo pronto! Toque em "Criar e entrar na mesa": ${who} vai direto para ${table}. Você pode mudar quase tudo depois, na ficha.`,
        `All set! Tap "Create and join table": ${who} goes straight to ${table}. You can change almost everything later on the sheet.`)
      : L(lang, `Tudo pronto! Toque em "Criar e entrar na mesa" para salvar e entrar em ${table}. Você pode mudar quase tudo depois, na ficha.`,
        `All set! Tap "Create and join table" to save and join ${table}. You can change almost everything later on the sheet.`);
  }
  return L(lang,
    'Tudo pronto! Toque em "Criar personagem" para salvar. Você pode mudar quase tudo depois, na ficha.',
    'All set! Tap "Create character" to save. You can change almost everything later on the sheet.');
}

function ReviewStep({ char, lang, goTo, steps, joinEnabled = false }) {
  const groups = collectIssues(steps || STEPS, char);
  const s = useMemo(() => characterSummary(char, lang), [char, lang]);
  const c = s.char;
  const pt = lang === 'pt';
  const align = ALIGNMENT_INFO.find(a => a.id === c.alignment);
  const coins = Object.entries(s.coins || {}).filter(([, v]) => v > 0);
  const cantrips = s.spells.filter(x => x.level === 0);
  const leveled = s.spells.filter(x => x.level > 0);
  const k = pt ? 'pt' : 'en';
  // Origem de cada magia: só as que não foram escolhidas na classe ganham rótulo.
  const sourceLabel = (x) => {
    if (x.source === 'feat') return x.from ? L(lang, `do talento ${x.from.pt}`, `from the ${x.from.en} feat`) : L(lang, 'do talento', 'from a feat');
    if (x.source === 'species') return L(lang, 'da espécie', 'from your species');
    if (x.auto) return x.level > 0 ? L(lang, 'da classe, sempre preparada', 'from your class, always prepared') : L(lang, 'da classe', 'from your class');
    return '';
  };
  const spellText = (list) => list.map(x => x.name + (sourceLabel(x) ? ` (${sourceLabel(x)})` : '')).join(', ');
  const spellLevels = [...new Set(leveled.map(x => x.level))].sort((a, b) => a - b);
  const preparedAt = (lv) => leveled.filter(x => x.level === lv && !x.bookOnly);
  const bookOnlyAt = (lv) => leveled.filter(x => x.level === lv && x.bookOnly);
  const hpText = s.hpParts.length
    ? [`${s.hpParts[0].amount} ${s.hpParts[0].label[k]}`, ...s.hpParts.slice(1).map(p => `${fmt(p.amount)} ${p.label[k]}`)].join(' ') + ` = ${s.hp}`
    : '';

  return (
    <div>
      <StepIntro title={L(lang, 'Revisão final', 'Final review')}>
        <p>{L(lang,
          'Esta é a sua ficha resumida. Confira se está tudo certo; cada número tem uma explicação curta do que ele faz no jogo.',
          'This is your sheet in short. Check that everything looks right; each number has a short note on what it does in play.')}</p>
        <p>{L(lang,
          'Se faltar algo, aparece logo abaixo com um botão para voltar à etapa certa.',
          "If anything is missing, it shows up right below with a button to go back to the right step.")}</p>
      </StepIntro>

      {groups.length > 0 ? (
        <Callout kind="warn">
          <strong>{L(lang, 'Antes de criar, falta resolver:', 'Before creating, you still need to:')}</strong>
          {groups.map(g => (
            <div key={g.id} className="cr-review-pending">
              <div className="cr-review-pending-head">
                <span>{g.title?.[lang] || g.id}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => goTo && goTo(g.id)}>
                  {L(lang, 'Ir para a etapa', 'Go to step')}
                </button>
              </div>
              <IssueList issues={g.issues} lang={lang} />
            </div>
          ))}
        </Callout>
      ) : (
        <Callout kind="ok">{readyText(lang, char, joinEnabled)}</Callout>
      )}

      <Section title={c.name || L(lang, '(sem nome)', '(no name)')}>
        <p className="muted text-sm" style={{ margin: 0 }}>
          {[
            c.className && `${tName('class', c.className, lang)} ${L(lang, 'nível', 'level')} ${c.level || 1}`,
            c.race && tName('race', c.race, lang),
            c.background && tName('background', c.background, lang),
            align && align.name[lang],
            `D&D ${c.rulesVersion === '2014' ? '2014' : '2024'}`,
            joinEnabled && creationJoin(char) && L(lang, `Mesa: ${creationJoin(char).name || creationJoin(char).code}`, `Table: ${creationJoin(char).name || creationJoin(char).code}`),
          ].filter(Boolean).join(' · ')}
        </p>
      </Section>

      <Section title={L(lang, 'Combate', 'Combat')}>
        <Row label={<Term id="hitPoints" lang={lang}>{L(lang, 'Pontos de Vida', 'Hit Points')}</Term>} value={s.hp}>
          {s.hitDie
            ? L(lang, `Sua vida. No nível 1: ${hpText}. Em 0 você cai inconsciente.`,
              `Your health. At level 1: ${hpText}. At 0 you fall unconscious.`)
            : L(lang, 'Escolha uma classe para calcular.', 'Pick a class to calculate it.')}
        </Row>
        <Row label={<Term id="armorClass" lang={lang}>{L(lang, 'Classe de Armadura', 'Armor Class')}</Term>} value={s.ac}>
          {L(lang, `O que o inimigo precisa tirar no ataque para te acertar. `, `What an enemy must roll to hit you. `)}
          {s.armorName
            ? L(lang, `Vem da armadura (${s.armorName})${s.shield ? ' e do escudo (+2)' : ''}.`, `Comes from your armor (${s.armorName})${s.shield ? ' and shield (+2)' : ''}.`)
            : L(lang, `Sem armadura: 10 ${fmt(s.dexMod)} de Destreza${s.shield ? ' + 2 do escudo' : ''} (ou a Defesa sem Armadura da classe).`, `No armor: 10 ${fmt(s.dexMod)} Dexterity${s.shield ? ' + 2 shield' : ''} (or your class's Unarmored Defense).`)}
          {s.untrainedArmor.length > 0 && (
            <span style={{ color: 'var(--blood-bright)', display: 'block' }}>
              {L(lang, `Sem treino em: ${s.untrainedArmor.join(', ')}. Você fica desajeitado e não pode conjurar magias.`,
                `Not trained in: ${s.untrainedArmor.join(', ')}. You are clumsy and can't cast spells.`)}
            </span>
          )}
        </Row>
        <Row label={<Term id="initiative" lang={lang}>{L(lang, 'Iniciativa', 'Initiative')}</Term>} value={fmt(s.initiative)}>
          {L(lang, 'Some isso ao d20 no começo da luta para ver quem age primeiro. ',
            'Add this to a d20 when a fight starts to see who goes first. ')}
          {s.initiativeAlert
            ? `${initiativeExplain(c, lang)}.`
            : L(lang, 'Vem da Destreza.', 'Comes from Dexterity.')}
        </Row>
        <Row label={<Term id="speed" lang={lang}>{L(lang, 'Deslocamento', 'Speed')}</Term>} value={pt ? `${String(s.speedM).replace('.', ',')} m` : `${s.speedFt} ft`}>
          {pt ? `${s.speedFt} pés. Quanto você anda no seu turno.` : 'How far you move on your turn.'}
        </Row>
        <Row label={<Term id="proficiencyBonus" lang={lang}>{L(lang, 'Bônus de Proficiência', 'Proficiency Bonus')}</Term>} value={fmt(s.profBonus)}>
          {L(lang, 'Somado a tudo em que você é treinado: perícias, salvaguardas, armas e magias. Cresce com o nível.',
            "Added to everything you're trained in: skills, saves, weapons and spells. Grows with level.")}
        </Row>
        <Row label={<Term id="passivePerception" lang={lang}>{L(lang, 'Percepção passiva', 'Passive Perception')}</Term>} value={s.passivePerception}>
          {L(lang, 'O quanto você nota sem procurar. O mestre compara com a Furtividade de quem tenta se esconder.',
            'How much you notice without looking. The GM compares it to the Stealth of anyone hiding.')}
        </Row>
      </Section>

      <Section title={<Term id="abilityScores" lang={lang}>{L(lang, 'Atributos', 'Ability Scores')}</Term>}>
        <p className="muted text-sm">{L(lang,
          'O número grande (modificador) é o que você soma ao dado; o pequeno é o valor do atributo. As salvaguardas marcadas com ✓ são aquelas em que sua classe é treinada.',
          'The big number (modifier) is what you add to the die; the small one is the score. Saving throws marked ✓ are the ones your class is trained in.')}</p>
        <div className="cr-review-abilities">
          {s.abilities.map(a => {
            const save = s.saves.find(x => x.id === a.id);
            return (
              <div key={a.id} className="cr-review-ability">
                <div className="eyebrow">{abilityAbbr(a.id, lang)}</div>
                <div className="cr-review-mod">{fmt(a.mod)}</div>
                <div className="mono text-xs">{a.score}</div>
                <div className="text-xs muted">{save
                  ? L(lang, `Salv. ${fmt(save.bonus)} ✓`, `Save ${fmt(save.bonus)} ✓`)
                  : L(lang, `Salv. ${fmt(a.mod)}`, `Save ${fmt(a.mod)}`)}</div>
              </div>
            );
          })}
        </div>
        <p className="muted text-xs" style={{ marginBottom: 0 }}>
          <Term id="savingThrow" lang={lang}>{L(lang, 'Salvaguarda', 'Saving throw')}</Term>
          {L(lang, ': rolagem para resistir a veneno, magia, armadilhas… (também chamada de teste de resistência)', ': a roll to resist poison, spells, traps…')}
        </p>
      </Section>

      <Section title={L(lang, 'Ataques', 'Attacks')}>
        {s.attacks.length === 0 ? (
          <p className="muted text-sm" style={{ margin: 0 }}>{L(lang, 'Nenhuma arma ainda (veja a etapa de equipamento).', 'No weapons yet (see the equipment step).')}</p>
        ) : (
          <>
            <p className="muted text-sm">
              <Term id="attackBonus" lang={lang}>{L(lang, 'Bônus de ataque', 'Attack bonus')}</Term>
              {L(lang, ': some ao d20. Se acertar, role o dano.', ': add it to the d20. If you hit, roll damage.')}
            </p>
            {s.attacks.map((w, i) => (
              <Row key={i} label={withQty(w.name, w.qty)} value={fmt(w.atk)}>
                {w.dmg && L(lang, `Dano ${w.dmg}${w.dmgType ? ` ${DAMAGE[w.dmgType] || w.dmgType}` : ''}`, `Damage ${w.dmg}${w.dmgType ? ` ${w.dmgType}` : ''}`)}
                {w.ability && L(lang, ` · usa ${abilityName(w.ability, lang)}`, ` · uses ${abilityName(w.ability, lang)}`)}
                {!w.proficient && (
                  <span style={{ color: 'var(--blood-bright)', display: 'block' }}>
                    {L(lang, 'Sua classe não é treinada nesta arma: o Bônus de Proficiência não entra.', "Your class isn't trained with this weapon: no Proficiency Bonus.")}
                  </span>
                )}
              </Row>
            ))}
          </>
        )}
      </Section>

      <Section title={<Term id="skill" lang={lang}>{L(lang, 'Perícias treinadas', 'Trained skills')}</Term>}>
        <p className="muted text-sm">{L(lang,
          'Quando o mestre pedir um teste de uma delas, role o d20 e some o número. Nas outras perícias você soma só o modificador do atributo.',
          'When the GM asks for a check with one of these, roll a d20 and add the number. For other skills add just the ability modifier.')}</p>
        {s.skills.length === 0
          ? <p className="muted text-sm">{L(lang, 'Nenhuma ainda.', 'None yet.')}</p>
          : (
            <div className="skill-list">
              {s.skills.map(k => (
                <div key={k.id} className="skill-row selected" style={{ cursor: 'default' }}>
                  <span className="skill-check">✓</span>
                  <span>{tName('skill', k.id, lang)}{k.expertise ? L(lang, ' (especialista)', ' (expertise)') : ''}</span>
                  <span className="skill-stat">{abilityAbbr(k.ability, lang)}</span>
                  <strong className="mono">{fmt(k.bonus)}</strong>
                </div>
              ))}
            </div>
          )}
      </Section>

      <Section title={L(lang, 'Idiomas e ferramentas', 'Languages and tools')}>
        <p className="text-sm" style={{ marginTop: 0 }}>
          <Term id="language" lang={lang}>{L(lang, 'Idiomas', 'Languages')}</Term>: {s.languages.join(', ') || '—'}
        </p>
        <p className="text-sm" style={{ marginBottom: 0 }}>
          <Term id="tool" lang={lang}>{L(lang, 'Ferramentas', 'Tools')}</Term>: {s.tools.join(', ') || '—'}
        </p>
      </Section>

      {s.features.length > 0 && (
        <Section title={L(lang, 'Talentos e habilidades', 'Feats and features')}>
          <p className="muted text-sm">{L(lang,
            'O que seu herói sabe fazer além dos números. A descrição completa de cada item fica na ficha.',
            'What your hero can do beyond the numbers. The full text of each item is on the sheet.')}</p>
          {s.features.map((g, i) => (
            <p key={i} className="text-sm" style={{ margin: '0 0 6px' }}>
              <strong>{g.title[k]}</strong>{': '}{g.items.join(', ')}
            </p>
          ))}
        </Section>
      )}

      {(s.spells.length > 0 || s.spellAbility || s.classSpellsFrom) && (
        <Section title={L(lang, 'Magias', 'Spells')}>
          {s.spellAbility && (
            <p className="muted text-sm">{L(lang,
              `Atributo de magia: ${abilityName(s.spellAbility, lang)}. CD ${s.spellDc} = o que o alvo precisa tirar para resistir. Ataque mágico ${fmt(s.spellAttack)} = some ao d20 quando a magia pede ataque.`,
              `Spellcasting ability: ${abilityName(s.spellAbility, lang)}. DC ${s.spellDc} = what a target must roll to resist. Spell attack ${fmt(s.spellAttack)} = add to the d20 when a spell calls for an attack.`)}</p>
          )}
          {!s.spellAbility && s.classSpellsFrom && (
            <p className="muted text-sm">{L(lang,
              `A classe ${tName('class', c.className, lang)} só começa a lançar magias no nível ${s.classSpellsFrom}. Por enquanto não há nada a escolher aqui.`,
              `The ${tName('class', c.className, lang)} class only starts casting spells at level ${s.classSpellsFrom}. Nothing to pick here for now.`)}</p>
          )}
          {cantrips.length > 0 && (
            <p className="text-sm">
              <Term id="cantrip" lang={lang}>{L(lang, 'Truques', 'Cantrips')}</Term>
              {L(lang, ' (à vontade): ', ' (at will): ')}
              {spellText(cantrips)}
            </p>
          )}
          {spellLevels.map(lv => (
            <div key={lv}>
              {preparedAt(lv).length > 0 && (
                <p className="text-sm">
                  {L(lang, `Magias de ${lv}º círculo`, `Level ${lv} spells`)}
                  {s.usesSpellbook && bookOnlyAt(lv).length > 0 ? L(lang, ' preparadas (pode lançar hoje)', ' prepared (you can cast today)') : ''}
                  {L(lang, ' — gastam um ', ' — use a ')}
                  <Term id="spellSlot" lang={lang}>{L(lang, 'espaço de magia', 'spell slot')}</Term>
                  {': '}
                  {spellText(preparedAt(lv))}
                </p>
              )}
              {bookOnlyAt(lv).length > 0 && (
                <p className="text-sm">
                  {L(lang, `Só no grimório (${lv}º círculo, não preparadas): `, `Only in the spellbook (level ${lv}, not prepared): `)}
                  {spellText(bookOnlyAt(lv))}
                  <span className="muted" style={{ display: 'block' }}>{L(lang,
                    'Você não pode lançá-las hoje. Depois de um Descanso Longo dá para trocar quais magias do grimório ficam preparadas.',
                    "You can't cast these today. After a Long Rest you can change which spellbook spells are prepared.")}</span>
                </p>
              )}
            </div>
          ))}
          {s.spells.length === 0 && s.spellAbility && <p className="muted text-sm">{L(lang, 'Nenhuma magia escolhida ainda.', 'No spells picked yet.')}</p>}
        </Section>
      )}

      <Section title={L(lang, 'Equipamento', 'Equipment')}>
        <p className="text-sm" style={{ marginTop: 0 }}>
          {[s.armorName, s.shield && L(lang, 'Escudo', 'Shield'), ...s.attacks.filter(w => !w.unarmed).map(w => withQty(w.name, w.qty)),
            ...s.equipment.map(e => withQty(e.name, e.qty))].filter(Boolean).join(', ') || '—'}
        </p>
        <p className="text-sm" style={{ marginBottom: 0 }}>
          <Term id="goldPieces" lang={lang}>{L(lang, 'Dinheiro', 'Money')}</Term>
          {': '}
          {coins.length ? coins.map(([k, v]) => `${v} ${({ cp: L(lang, 'PC', 'CP'), sp: L(lang, 'PP', 'SP'), ep: L(lang, 'PE', 'EP'), gp: L(lang, 'PO', 'GP'), pp: L(lang, 'PL', 'PP') })[k]}`).join(', ') : '—'}
        </p>
      </Section>
    </div>
  );
}

export default {
  id: 'review',
  title: { pt: 'Revisão', en: 'Review' },
  // Junta as pendências de todas as etapas que se aplicam: trava o "Criar personagem".
  issues: (char) => flatIssues(collectIssues(STEPS, char)),
  Comp: ReviewStep,
};
