/* Etapa Perícias da classe (ver ../README.md). A Especialização do Ladino
 * (componente Expertise, exportado daqui) é mostrada na etapa Antecedente. */
import SRD from '../../../data/srd.js';
import { tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import { StepIntro, Term, Callout, Counter, L } from '../ui.jsx';
import {
  classSkillList, classSkillCount, classSkillPicks, otherSkillSources, overlappingSkills, recommendedSkills,
  toggleClassSkill, expertiseGroups, expertiseOptions, toggleGroupPick, recommendedIds, abilityName,
  SKILL_HINTS, SKILL_SOURCE, POOL_INTRO, skillsIssues, overlapSentence,
} from '../class-helpers.js';

const k = (lang) => (lang === 'pt' ? 'pt' : 'en');
const statOf = (id) => SRD.SKILLS.find(s => s.id === id)?.stat;

function SkillRow({ id, lang, checked, locked, disabled, tag, recommended, onClick }) {
  return (
    <button type="button" className={`skill-row cr-skill-row ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      aria-pressed={checked} disabled={disabled || locked} onClick={onClick}>
      <span className="skill-check">{checked && <Icon name="check" size={14} />}</span>
      <span className="cr-skill-text">
        <span className="cr-skill-name">
          {tName('skill', id, lang)}
          {recommended && <span className="cr-badge">{L(lang, 'Recomendado', 'Recommended')}</span>}
          {tag && <span className="cr-badge cr-badge-muted">{tag}</span>}
        </span>
        <span className="cr-skill-hint">{SKILL_HINTS[id]?.[k(lang)]}</span>
      </span>
      <span className="skill-stat">{abilityName(statOf(id), lang).slice(0, 3)}</span>
    </button>
  );
}

/** Especialização do Ladino (usada na etapa Antecedente, quando todas as perícias já são conhecidas). */
export function Expertise({ char, set, lang, group }) {
  const opts = expertiseOptions(char, group);
  const rec = new Set(recommendedIds(char, group).filter(id => opts.some(o => o.id === id)).slice(0, group.total));
  const full = group.picks.length >= group.total;
  return (
    <section className="cr-choice-group">
      <div className="cr-choice-head">
        <h3><Term id="expertise" lang={lang}>{group.name[k(lang)]}</Term></h3>
        <Counter n={group.picks.length} of={group.total} />
      </div>
      <p className="cr-intro-text">{POOL_INTRO[group.pools[0]]?.[k(lang)]}</p>
      {!opts.length && <p className="muted text-sm">{L(lang, 'Escolha suas perícias acima primeiro.', 'Pick your skills above first.')}</p>}
      <div className="skill-list">
        {opts.map(o => (
          <button key={o.id} type="button" className={`skill-row cr-skill-row ${o.chosen ? 'selected' : ''}`}
            aria-pressed={o.chosen} disabled={!o.chosen && full}
            onClick={() => set(toggleGroupPick(char, group, o.id))}>
            <span className="skill-check">{o.chosen && <Icon name="check" size={14} />}</span>
            <span className="cr-skill-text">
              <span className="cr-skill-name">
                {o.name[k(lang)]}
                {rec.has(o.id) && <span className="cr-badge">{L(lang, 'Recomendado', 'Recommended')}</span>}
              </span>
              {!o.tool && <span className="cr-skill-hint">{SKILL_HINTS[o.id]?.[k(lang)]}</span>}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SkillsStep({ char, set, lang }) {
  const from = classSkillList(char);
  const need = classSkillCount(char);
  const picks = classSkillPicks(char);
  const others = otherSkillSources(char);
  const overlap = overlappingSkills(char);
  const overlapText = overlapSentence(char, overlap);
  const rec = new Set(recommendedSkills(char));
  const hasExpertise = expertiseGroups(char).length > 0;
  const full = picks.length >= need;
  const already = Object.keys(others).filter(id => !from.includes(id));
  const bgLater = !char.background;

  return (
    <div>
      <StepIntro title={L(lang, 'Perícias da classe', 'Class skills')}>
        {L(lang, 'Uma ', 'A ')}<Term id="skill" lang={lang}>{L(lang, 'perícia', 'skill')}</Term>
        {L(lang,
          ' é algo em que seu herói é treinado. Quando o mestre pede um teste dela, você soma seu ',
          ' is something your hero is trained in. When the DM asks for a check, you add your ')}
        <Term id="proficiencyBonus" lang={lang}>{L(lang, 'Bônus de Proficiência', 'Proficiency Bonus')}</Term>
        {L(lang, ` ao dado. Escolha ${need} perícias da lista da classe ${tName('class', char.className, 'pt')}.`, ` to the roll. Pick ${need} skills from the ${tName('class', char.className, 'en')} class list.`)}
      </StepIntro>

      <div className="cr-choice-head">
        <span className="muted text-sm">{L(lang, 'Escolhidas', 'Chosen')}</span>
        <Counter n={picks.length} of={need} />
      </div>

      {bgLater && (
        <Callout kind="info">
          {L(lang,
            'Depois você escolhe o antecedente, que dá mais 2 perícias. Se ele repetir uma daqui, a etapa Antecedente avisa e você troca por outra.',
            'Next you pick a background, which grants 2 more skills. If it repeats one from here, the Background step will tell you so you can swap it.')}
        </Callout>
      )}
      {overlapText && (
        <Callout kind="warn">
          {overlapText[k(lang)]}{' '}
          {overlap.length > 1
            ? L(lang, 'Escolha outras perícias da lista no lugar (as marcadas "Recomendado" são boas opções).', 'Pick other skills from the list instead (the "Recommended" ones are good picks).')
            : L(lang, 'Escolha outra perícia da lista no lugar (as marcadas "Recomendado" são boas opções).', 'Pick another skill from the list instead (the "Recommended" ones are good picks).')}
        </Callout>
      )}
      {hasExpertise && (
        <Callout kind="info">
          {L(lang,
            <>A <Term id="expertise" lang={lang}>Especialização</Term> fica para a etapa Antecedente: assim você também pode usar as perícias que o antecedente der.</>,
            <><Term id="expertise" lang={lang}>Expertise</Term> comes in the Background step, so you can also use the skills your background grants.</>)}
        </Callout>
      )}

      <div className="skill-list">
        {from.map(id => {
          const locked = !!others[id];
          const checked = locked || picks.includes(id);
          return (
            <SkillRow key={id} id={id} lang={lang} checked={checked} locked={locked}
              disabled={!checked && full}
              tag={locked ? SKILL_SOURCE[others[id]]?.[k(lang)] : null}
              recommended={!locked && rec.has(id)}
              onClick={() => set(toggleClassSkill(char, id))} />
          );
        })}
      </div>

      {already.length > 0 && (
        <>
          <h3 style={{ marginTop: 20 }}>{L(lang, 'Você também já tem', 'You also already have')}</h3>
          <div className="skill-list">
            {already.map(id => (
              <SkillRow key={id} id={id} lang={lang} checked locked tag={SKILL_SOURCE[others[id]]?.[k(lang)]} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}

export default {
  id: 'skills',
  title: { pt: 'Perícias', en: 'Skills' },
  applies: (char) => !!char.className,
  issues: skillsIssues,
  Comp: SkillsStep,
};
