/* Etapa: magias de 1º círculo (preparadas/conhecidas; grimório do Mago). Ver ../spell-helpers.js. */
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, Callout, ChoiceCard, Counter, L } from '../ui.jsx';
import { SpellPicker, GrantedCallout, InvalidCallout, abilityName } from './cantrips.jsx';
import {
  spellPlan, hasClassSpells, spellIssues, availableSpells, chosenSpells, preparedFromBook, recommendedSpells,
  invalidChoices, toggleSpell, togglePrepared, fillRecommended, spellDef,
} from '../spell-helpers.js';

// 2024: quem troca as preparadas só ao subir de nível (os demais trocam no descanso longo).
const SWAP_ON_LEVEL_2024 = ['bard', 'sorcerer', 'warlock'];

function SwapNote({ char, lang, plan }) {
  const r2014 = char.rulesVersion === '2014';
  if (plan.mode === 'known') {
    return L(lang,
      <>Na regra 2014 essas são suas <Term id="knownSpell" lang={lang}>magias conhecidas</Term>: ficam fixas, e você troca uma quando sobe de nível.</>,
      <>Under the 2014 rules these are your <Term id="knownSpell" lang={lang}>known spells</Term>: they stay fixed, and you swap one when you level up.</>);
  }
  if (!r2014 && SWAP_ON_LEVEL_2024.includes(char.className)) {
    return L(lang, 'Você pode trocar uma delas sempre que subir de nível.', 'You can swap one of them whenever you level up.');
  }
  return L(lang,
    <>Depois de cada <Term id="longRest" lang={lang}>descanso longo</Term> você pode trocar quais estão preparadas.</>,
    <>After each <Term id="longRest" lang={lang}>long rest</Term> you can change which ones are prepared.</>);
}

function Intro({ char, lang, plan }) {
  const cls = tName('class', char.className, lang);
  const slots = plan.slots[0] || 0;
  const warlock = char.className === 'warlock';
  const formula = char.rulesVersion === '2014' && plan.mode === 'prepared'
    ? (char.className === 'artificer'
      ? L(lang, ` (modificador de ${abilityName(plan.ability, lang)} + metade do nível, mínimo 1)`, ` (${abilityName(plan.ability, lang)} modifier + half your level, minimum 1)`)
      : L(lang, ` (modificador de ${abilityName(plan.ability, lang)} + nível, mínimo 1)`, ` (${abilityName(plan.ability, lang)} modifier + level, minimum 1)`))
    : '';
  return (
    <StepIntro title={L(lang, 'Magias', 'Spells')}>
      {lang === 'pt' ? (
        <p>Magias de <Term id="spellLevel" lang={lang}>1º círculo</Term> são mais fortes que truques, mas cada uso gasta um{' '}
          <Term id="spellSlot" lang={lang}>espaço de magia</Term>. Você tem <b>{slots}</b> {slots === 1 ? 'espaço' : 'espaços'}
          {warlock ? <>, que voltam num descanso curto ou longo (<Term id="pactMagic" lang={lang}>Magia de Pacto</Term>)</> : ', que voltam depois de um descanso longo'}.</p>
      ) : (
        <p><Term id="spellLevel" lang={lang}>Level 1</Term> spells are stronger than cantrips, but each cast uses a{' '}
          <Term id="spellSlot" lang={lang}>spell slot</Term>. You have <b>{slots}</b> {slots === 1 ? 'slot' : 'slots'}
          {warlock ? <>, which come back on a short or long rest (<Term id="pactMagic" lang={lang}>Pact Magic</Term>)</> : ', which come back after a long rest'}.</p>
      )}
      {plan.book ? (
        lang === 'pt' ? (
          <p>Como {cls}, você anota <b>{plan.spellbook}</b> magias no seu <Term id="spellbook" lang={lang}>grimório</Term> e, delas,{' '}
            <Term id="preparedSpell" lang={lang}>prepara</Term> <b>{plan.leveled}</b>{formula} para usar hoje. <SwapNote char={char} lang={lang} plan={plan} /></p>
        ) : (
          <p>As a {cls}, you write <b>{plan.spellbook}</b> spells in your <Term id="spellbook" lang={lang}>spellbook</Term> and{' '}
            <Term id="preparedSpell" lang={lang}>prepare</Term> <b>{plan.leveled}</b> of them{formula} to use today. <SwapNote char={char} lang={lang} plan={plan} /></p>
        )
      ) : plan.mode === 'prepared' ? (
        lang === 'pt' ? (
          <p>Como {cls}, você deixa <b>{plan.leveled}</b>{formula} <Term id="preparedSpell" lang={lang}>magias preparadas</Term>, escolhidas da lista da sua classe. <SwapNote char={char} lang={lang} plan={plan} /></p>
        ) : (
          <p>As a {cls}, you keep <b>{plan.leveled}</b>{formula} <Term id="preparedSpell" lang={lang}>prepared spells</Term>, chosen from your class list. <SwapNote char={char} lang={lang} plan={plan} /></p>
        )
      ) : (
        lang === 'pt' ? (
          <p>Como {cls}, você aprende <b>{plan.leveled}</b> magias da lista da sua classe. <SwapNote char={char} lang={lang} plan={plan} /></p>
        ) : (
          <p>As a {cls}, you learn <b>{plan.leveled}</b> spells from your class list. <SwapNote char={char} lang={lang} plan={plan} /></p>
        )
      )}
    </StepIntro>
  );
}

/** Mago: das magias do grimório, marcar as preparadas. */
function PrepareFromBook({ char, set, lang, plan }) {
  const book = chosenSpells(char).map(id => spellDef(char, id)).filter(Boolean);
  const prepared = new Set(preparedFromBook(char));
  const full = prepared.size >= plan.leveled;
  const suggested = new Set(recommendedSpells(char).slice(0, plan.leveled));
  if (!book.length) return null;
  return (
    <>
      <div className="cr-spell-head">
        <span><b>{L(lang, '2. Prepare para hoje', '2. Prepare for today')}</b> <Counter n={prepared.size} of={plan.leveled} /></span>
      </div>
      <p className="muted text-sm">{L(lang, 'Toque nas magias do grimório que você quer deixar prontas.', 'Tap the spellbook spells you want ready.')}</p>
      <div className="options-list cols-2">
        {book.map(sp => {
          const on = prepared.has(sp.id);
          return (
            <ChoiceCard key={sp.id} selected={on} disabled={!on && full}
              onClick={() => { const next = togglePrepared(char, sp.id); if (next) set({ spells: next }); }}
              title={`${on ? '★' : '☆'} ${tName('spellName', sp.id, lang)}`}
              badge={suggested.has(sp.id) ? L(lang, 'Recomendada', 'Recommended') : null}
              subtitle={on ? L(lang, 'Preparada', 'Prepared') : L(lang, 'No grimório', 'In spellbook')} />
          );
        })}
      </div>
    </>
  );
}

function SpellsStep({ char, set, lang }) {
  const plan = spellPlan(char);
  const bad = new Set(invalidChoices(char, 'spell').map(x => x.id));
  const chosen = chosenSpells(char);
  const n = chosen.filter(id => !bad.has(id)).length;
  const want = plan.book ? plan.spellbook : plan.leveled;
  const toggle = (id) => { const next = toggleSpell(char, id); if (next) set({ spells: next }); };
  const done = n >= want && (!plan.book || preparedFromBook(char).length >= plan.leveled);

  return (
    <div>
      <Intro char={char} lang={lang} plan={plan} />
      {char.rulesVersion === '2014' && plan.mode === 'prepared' && (
        <Callout>{L(lang,
          `Esse número depende do seu modificador de ${abilityName(plan.ability, lang)}: se você mudar os atributos, ele muda junto.`,
          `This number depends on your ${abilityName(plan.ability, lang)} modifier: if you change your ability scores, it changes too.`)}</Callout>
      )}

      <GrantedCallout char={char} lang={lang} cantrips={false} />
      <InvalidCallout char={char} set={set} lang={lang} kind="spell" />

      <div className="cr-spell-head">
        <span>
          {plan.book ? <b>{L(lang, '1. Grimório', '1. Spellbook')} </b> : L(lang, 'Magias escolhidas ', 'Spells chosen ')}
          <Counter n={n} of={want} />
        </span>
        <button type="button" className="btn btn-sm btn-ghost" disabled={done}
          onClick={() => set({ spells: fillRecommended(char, 'spell') })}>
          {L(lang, 'Escolher as recomendadas', 'Pick the recommended ones')}
        </button>
      </div>

      <SpellPicker char={char} lang={lang} spells={availableSpells(char)} selected={new Set(chosen)}
        onToggle={toggle} full={n >= want} suggested={new Set(recommendedSpells(char))} />

      {plan.book && <PrepareFromBook char={char} set={set} lang={lang} plan={plan} />}
    </div>
  );
}

export default {
  id: 'spells',
  title: { pt: 'Magias', en: 'Spells' },
  // Só para quem escolhe magias de 1º círculo agora (2014: Paladino/Patrulheiro só no nível 2).
  applies: (char) => hasClassSpells(char),
  issues: (char) => spellIssues(char),
  Comp: SpellsStep,
};

