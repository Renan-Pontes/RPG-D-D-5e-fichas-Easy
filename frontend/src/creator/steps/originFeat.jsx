/* Etapa "Talento de origem" (2024): sub-escolhas do talento que o antecedente dá (ver ../README.md). */
import { tName } from '../../../data/i18n.js';
import { FeatChoices } from '../../progression/FeatPicker.jsx';
import { originFeatFromText } from '../../progression/feat-rules.js';
import { findFeat } from '../../../data/feats.js';
import { StepIntro, Term, Callout, L } from '../ui.jsx';
import { classStart } from '../start-data.js';
import {
  originEntry, originFeatApplies, originFeatIssues, findBackground, ORIGIN_FEAT_LINE, recommendedSpellAbility,
} from '../background-helpers.js';

const ABILITY = { int: ['Inteligência', 'Intelligence'], wis: ['Sabedoria', 'Wisdom'], cha: ['Carisma', 'Charisma'] };

/** Dica simples por talento: o que escolher e por quê. */
const HINT = {
  magicInitiate: {
    pt: <>Escolha 2 <Term id="cantrip" lang="pt">truques</Term> (magias que você usa à vontade) e 1 magia de 1º círculo, que você lança de graça 1 vez a cada <Term id="longRest" lang="pt">Descanso Longo</Term>. O "atributo de conjuração" só diz qual atributo suas magias usam — <strong>não</strong> soma bônus.</>,
    en: <>Pick 2 <Term id="cantrip" lang="en">cantrips</Term> (spells you can use at will) and 1 level 1 spell you can cast for free once per <Term id="longRest" lang="en">Long Rest</Term>. The "spellcasting ability" just says which ability your spells use — it does <strong>not</strong> add a bonus.</>,
  },
  skilled: {
    pt: <>Escolha 3 coisas novas para seu herói saber fazer: <Term id="skill" lang="pt">perícias</Term> ou <Term id="tool" lang="pt">ferramentas</Term>. Perícias são mais úteis no dia a dia da aventura (Percepção, Furtividade e Persuasão são ótimas para começar). As que você já tem não aparecem.</>,
    en: <>Pick 3 new things your hero knows how to do: <Term id="skill" lang="en">skills</Term> or <Term id="tool" lang="en">tools</Term>. Skills come up more often while adventuring (Perception, Stealth and Persuasion are great to start). The ones you already have are hidden.</>,
  },
  crafter: {
    pt: <>Escolha 3 <Term id="tool" lang="pt">ferramentas</Term> de artesão. Com elas seu herói conserta e fabrica coisas simples entre as aventuras. As que você já tem não aparecem.</>,
    en: <>Pick 3 artisan's <Term id="tool" lang="en">tools</Term>. With them your hero repairs and makes simple things between adventures. The ones you already have are hidden.</>,
  },
  musician: {
    pt: <>Escolha 3 instrumentos musicais: você ganha treino (proficiência) neles. Escolha os que combinam com seu herói; os que você já toca não aparecem.</>,
    en: <>Pick 3 musical instruments: you gain proficiency with them. Choose the ones that suit your hero; the ones you already play are hidden.</>,
  },
};

function Comp({ char, set, lang }) {
  const entry = originEntry(char);
  const feat = entry?.id ? findFeat(entry.id) : null;
  if (!entry || !feat) {
    return <StepIntro title={L(lang, 'Talento de origem', 'Origin feat')}>{L(lang, 'Seu antecedente não tem escolhas de talento.', 'Your background has no feat choices.')}</StepIntro>;
  }
  const fixed = originFeatFromText(entry.name)?.picks || {};
  const bg = findBackground(char);
  const bgName = bg?.name?.[lang] || tName('background', char.background, lang);
  const setPicks = (picks) => set({ feats: (char.feats || []).map(f => (f === entry ? { ...f, picks: { ...picks, ...fixed } } : f)) });
  const line = ORIGIN_FEAT_LINE[feat.id];
  const hint = HINT[feat.id];
  const issues = originFeatIssues(char);
  const isMI = feat.id === 'magicInitiate';
  const recAbility = isMI ? recommendedSpellAbility(char, fixed.spellList || entry.picks?.spellList) : null;
  const className = char.className && classStart(char)?.primary?.includes(recAbility) ? tName('class', char.className, lang) : '';
  return (
    <div>
      <StepIntro title={`${L(lang, 'Talento de origem', 'Origin feat')}: ${feat.name[lang]}`}>
        {L(lang,
          <>Seu antecedente ({bgName}) te dá o <Term id="originFeat" lang={lang}>talento de origem</Term> <strong>{feat.name.pt}</strong>{fixed.spellList ? ` (lista de ${tName('class', fixed.spellList, 'pt')})` : ''}. {line?.pt} Ele tem algumas escolhas — faça abaixo.</>,
          <>Your background ({bgName}) gives you the <Term id="originFeat" lang={lang}>origin feat</Term> <strong>{feat.name.en}</strong>{fixed.spellList ? ` (${tName('class', fixed.spellList, 'en')} list)` : ''}. {line?.en} It has a few choices — make them below.</>)}
      </StepIntro>

      {hint && <Callout kind="info">{hint[lang === 'pt' ? 'pt' : 'en']}
        {recAbility && (
          <> {L(lang,
            <><strong>Recomendado: {ABILITY[recAbility][0]}</strong>{className ? `, o atributo da classe ${className}` : ''}. Já vem marcado; troque se quiser.</>,
            <><strong>Recommended: {ABILITY[recAbility][1]}</strong>{className ? `, the ${className} class ability` : ''}. It comes preselected; change it if you like.</>)}</>
        )}
      </Callout>}

      <div className="card" style={{ padding: 14 }}>
        <p className="text-sm" style={{ marginTop: 0, color: 'var(--ink-secondary)' }}>{feat.desc[lang]}</p>
        <FeatChoices char={char} lang={lang} feat={feat} level={1} picks={entry.picks || {}} onChange={setPicks} hide={Object.keys(fixed)}
          tall recommend={recAbility ? { spellAbility: recAbility } : {}} />
      </div>

      {issues.length === 0 && (
        <Callout kind="ok">{L(lang, 'Tudo escolhido! Você pode avançar.', 'All set! You can move on.')}</Callout>
      )}
    </div>
  );
}

export default {
  id: 'originFeat',
  title: { pt: 'Talento de origem', en: 'Origin feat' },
  applies: originFeatApplies,
  issues: originFeatIssues,
  Comp,
};
