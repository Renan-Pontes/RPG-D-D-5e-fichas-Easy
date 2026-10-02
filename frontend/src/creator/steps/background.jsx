/* Etapa "Antecedente": o que o herói fazia antes de aventurar (ver ../README.md). */
import { tName, t } from '../../../data/i18n.js';
import { StepIntro, Term, Callout, ChoiceGrid, ChoiceCard, Counter, L } from '../ui.jsx';
import { classStart, toolName, backgroundStart } from '../start-data.js';
import {
  backgroundList, findBackground, backgroundTool, backgroundToolText, backgroundOriginFeat, chosenBackgroundTools,
  ORIGIN_FEAT_LINE, fitsClass, applyBackground, toggleBackgroundTool, skillOverlap, backgroundIssues,
  toolCategoryName, originFeatSpecs,
} from '../background-helpers.js';

const bgName = (b, lang) => b?.name?.[lang] || tName('background', b?.id, lang);
const skillNames = (ids, lang) => (ids || []).map(s => tName('skill', s, lang)).join(lang === 'pt' ? ' e ' : ' and ');
const abilityNames = (ids, lang) => (ids || []).map(a => t(a, lang)).join(', ');

/** Linhas "o que você ganha" de um antecedente, em linguagem simples. */
function Gains({ char, b, lang }) {
  const is24 = char.rulesVersion !== '2014';
  const start = backgroundStart(char, b.id);
  const tool = backgroundToolText(char, b.id, lang);
  const of = backgroundOriginFeat(b);
  const line = of ? ORIGIN_FEAT_LINE[of.feat.id] : null;
  const pack = start?.equipment?.find(p => p.id === 'A');
  return (
    <span className="cr-bg-gains">
      <span className="cr-bg-line"><strong>{L(lang, 'Perícias', 'Skills')}:</strong> {skillNames(b.skills, lang)}</span>
      {tool && <span className="cr-bg-line"><strong>{L(lang, 'Ferramenta', 'Tool')}:</strong> {tool}</span>}
      {is24 && b.abilities && (
        <span className="cr-bg-line"><strong>{L(lang, 'Atributos', 'Abilities')}:</strong> {abilityNames(b.abilities, lang)} <span className="muted">{L(lang, '(+3 para dividir)', '(+3 to split)')}</span></span>
      )}
      {is24 && b.feat && (
        <span className="cr-bg-line"><strong>{L(lang, 'Talento', 'Feat')}:</strong> {of ? of.feat.name[lang] + (of.picks.spellList ? ` (${tName('class', of.picks.spellList, lang)})` : '') : b.feat}
          {line && <span className="muted"> — {line[lang]}</span>}</span>
      )}
      {!is24 && start?.languages > 0 && (
        <span className="cr-bg-line"><strong>{L(lang, 'Idiomas', 'Languages')}:</strong> {L(lang, `+${start.languages} à sua escolha`, `+${start.languages} of your choice`)}</span>
      )}
      {!is24 && start?.feature && (
        <span className="cr-bg-line"><strong>{L(lang, 'Característica', 'Feature')}:</strong> {start.feature[lang]}{start.featureDesc && <span className="muted"> — {start.featureDesc[lang]}</span>}</span>
      )}
      {is24 && pack && <span className="cr-bg-line muted">{L(lang, `Equipamento: um kit do ofício ou 50 PO (você escolhe depois).`, 'Equipment: a trade kit or 50 GP (you choose later).')}</span>}
    </span>
  );
}

function ToolChooser({ char, set, lang }) {
  const tl = backgroundTool(char);
  if (!tl.choose) return null;
  const cur = chosenBackgroundTools(char);
  const other = new Set((char.toolProfs || []).filter(x => !cur.includes(x)));
  return (
    <div style={{ marginTop: 12 }}>
      <label>
        {L(lang, `Escolha ${tl.choose} ${toolCategoryName(tl.category, 'pt')}`, `Choose ${tl.choose} ${toolCategoryName(tl.category, 'en')}`)}{' '}
        <Counter n={cur.length} of={tl.choose} />
      </label>
      <p className="text-xs muted" style={{ margin: '2px 0 6px' }}>
        {L(lang, 'É só sabor: escolha a que combina com a história do seu herói.', "It's mostly flavor: pick the one that fits your hero's story.")}
      </p>
      <div className="class-pick-grid">
        {tl.from.map(id => {
          const on = cur.includes(id);
          const dup = !on && other.has(id);
          return (
            <button key={id} type="button" className={`class-pick small ${on ? 'on' : ''}`} disabled={dup}
              title={dup ? L(lang, 'Você já tem essa ferramenta.', 'You already have this tool.') : undefined}
              onClick={() => set(toggleBackgroundTool(char, id))}>
              <span className="class-pick-name" style={{ fontSize: '0.85rem' }}>{toolName(id, lang)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Comp({ char, set, lang, goTo, steps }) {
  const is24 = char.rulesVersion !== '2014';
  const cls = classStart(char);
  const sel = findBackground(char);
  const list = [...backgroundList(char)].sort((a, b) => fitsClass(char, b) - fitsClass(char, a));
  const overlap = sel ? skillOverlap(char) : [];
  const canGoSkills = (steps || []).some(s => s.id === 'skills');
  const hasFeatChoices = is24 && originFeatSpecs(char).length > 0;
  const className = char.className ? tName('class', char.className, lang) : '';

  return (
    <div>
      <StepIntro title={L(lang, 'Antecedente', 'Background')}>
        {L(lang,
          <>O <Term id="background" lang={lang}>antecedente</Term> é o que seu herói fazia antes de virar aventureiro: sacerdote, soldado, criminoso… Ele dá treino em 2 <Term id="skill" lang={lang}>perícias</Term> e numa <Term id="tool" lang={lang}>ferramenta</Term>{is24 ? <>, aumenta 3 <Term id="abilityScores" lang={lang}>atributos</Term> e traz um <Term id="originFeat" lang={lang}>talento de origem</Term>.</> : <>, e às vezes idiomas e uma característica especial.</>} Escolha o que mais combina com a história que você imagina.</>,
          <>Your <Term id="background" lang={lang}>background</Term> is what your hero did before adventuring: priest, soldier, criminal… It trains 2 <Term id="skill" lang={lang}>skills</Term> and a <Term id="tool" lang={lang}>tool</Term>{is24 ? <>, raises 3 <Term id="abilityScores" lang={lang}>ability scores</Term> and brings an <Term id="originFeat" lang={lang}>origin feat</Term>.</> : <>, and sometimes languages and a special feature.</>} Pick the one that fits the story you imagine.</>)}
      </StepIntro>

      {is24 && cls && (
        <Callout kind="info">
          {L(lang,
            <>Os cartões marcados com <strong>Combina com sua classe</strong> aumentam o atributo mais importante para {className || 'sua classe'}. São a escolha mais segura para começar.</>,
            <>Cards marked <strong>Fits your class</strong> raise the most important ability for {className || 'your class'}. They're the safest pick to start with.</>)}
        </Callout>
      )}
      {!is24 && cls && (
        <Callout kind="info">
          {L(lang,
            <>Os cartões marcados com <strong>Combina com sua classe</strong> têm perícias que usam o atributo principal de {className || 'sua classe'}.</>,
            <>Cards marked <strong>Fits your class</strong> have skills that use {className || 'your class'}'s main ability.</>)}
        </Callout>
      )}

      <ChoiceGrid>
        {list.map(b => (
          <ChoiceCard key={b.id} selected={sel?.id === b.id}
            onClick={() => set(applyBackground(char, b.id))}
            title={bgName(b, lang)}
            badge={fitsClass(char, b) ? L(lang, 'Combina com sua classe', 'Fits your class') : null}>
            <Gains char={char} b={b} lang={lang} />
          </ChoiceCard>
        ))}
      </ChoiceGrid>

      {sel && (
        <div className="card" style={{ marginTop: 16, padding: 14 }}>
          <div className="option-title">{L(lang, 'Seu antecedente', 'Your background')}: {bgName(sel, lang)}</div>
          <p className="text-sm" style={{ margin: '6px 0 0' }}>
            {L(lang, `Você ganha treino em ${skillNames(sel.skills, 'pt')}.`, `You gain training in ${skillNames(sel.skills, 'en')}.`)}
            {is24 && sel.abilities && ' ' + L(lang,
              `Na etapa de atributos você vai dividir +3 entre ${abilityNames(sel.abilities, 'pt')} (+2 e +1, ou +1 em cada).`,
              `In the abilities step you'll split +3 among ${abilityNames(sel.abilities, 'en')} (+2 and +1, or +1 each).`)}
            {is24 && hasFeatChoices && ' ' + L(lang, 'Na próxima etapa você faz as escolhas do talento.', "In the next step you'll make the feat's choices.")}
          </p>

          <ToolChooser char={char} set={set} lang={lang} />

          {overlap.length > 0 && (
            <Callout kind="warn">
              {L(lang,
                <>Você já tinha escolhido <strong>{skillNames(overlap, 'pt')}</strong> na etapa de classe, e o antecedente também dá {overlap.length === 1 ? 'essa perícia' : 'essas perícias'}. Treino repetido não soma nada: volte e troque {overlap.length === 1 ? 'a da classe por outra' : 'as da classe por outras'}.</>,
                <>You had already picked <strong>{skillNames(overlap, 'en')}</strong> for your class, and your background also gives {overlap.length === 1 ? 'that skill' : 'those skills'}. Repeated training adds nothing: go back and swap the class {overlap.length === 1 ? 'one' : 'ones'} for something else.</>)}
              {canGoSkills && goTo && (
                <div style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn-ghost" onClick={() => goTo('skills')}>{L(lang, 'Trocar perícias da classe', 'Change class skills')}</button>
                </div>
              )}
            </Callout>
          )}
        </div>
      )}

      {is24 && (
        <Callout kind="info">
          {L(lang,
            <><strong>Já jogou a versão 2014?</strong> Nas regras 2024 os bônus de atributo saíram da espécie e vieram para o antecedente, junto com um talento. Por isso o Sábio, por exemplo, dá +3 em Constituição/Inteligência/Sabedoria e o Iniciado em Magia — não é bônus a mais. Os idiomas não vêm mais do antecedente: todo mundo fala Comum e escolhe mais 2 na etapa Idiomas.</>,
            <><strong>Played the 2014 version?</strong> In the 2024 rules, ability increases moved from species to background, along with a feat. That's why the Sage, for example, gives +3 among Constitution/Intelligence/Wisdom plus Magic Initiate — it isn't an extra bonus. Languages no longer come from the background: everyone speaks Common and picks 2 more in the Languages step.</>)}
        </Callout>
      )}
      {!is24 && sel && (backgroundStart(char)?.languages || 0) > 0 && (
        <Callout kind="info">
          {L(lang, 'Os idiomas do antecedente você escolhe na etapa Idiomas.', "You pick your background's languages in the Languages step.")}
        </Callout>
      )}
    </div>
  );
}

export default {
  id: 'background',
  title: { pt: 'Antecedente', en: 'Background' },
  issues: backgroundIssues,
  Comp,
};
