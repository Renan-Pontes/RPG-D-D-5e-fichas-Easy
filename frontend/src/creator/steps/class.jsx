/* Etapa Classe: o que o herói faz na aventura (ver ../README.md). */
import { useRef } from 'react';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { classStart } from '../start-data.js';
import {
  CORE_CLASSES, OTHER_BOOK_CLASSES, COMPLEXITY, isBeginnerClass, abilityName, abilityList,
  armorText, weaponText, toolText, classFeaturesL1, needsSubclass, subclassList, isCoreSubclass,
  SUBCLASS_LABEL, SUBCLASS_INTRO, RECOMMENDED_SUBCLASS, classIssues, selectClass, selectSubclass,
  classSpellSummary, classChangeNotice, dismissClassChange,
} from '../class-helpers.js';

import { classArt } from '../../art.js';

const k = (lang) => (lang === 'pt' ? 'pt' : 'en');

function ClassCard({ char, id, lang, onPick }) {
  const s = classStart(char, id);
  if (!s) return null;
  return (
    <ChoiceCard
      selected={char.className === id}
      onClick={() => onPick(id)}
      title={tName('class', id, lang)}
      badge={isBeginnerClass(char, id) ? L(lang, 'Bom para começar', 'Good for beginners') : null}
      subtitle={s.role?.[k(lang)]}
      image={classArt(id)}
    >
      <div className="option-meta">
        <span><strong>{L(lang, 'Principal', 'Main')}:</strong> {abilityList(s.primary, lang)}</span>
        <span><strong>{L(lang, 'Complexidade', 'Complexity')}:</strong> {COMPLEXITY[s.complexity]?.[k(lang)]}</span>
      </div>
    </ChoiceCard>
  );
}

function SpellLine({ char, lang }) {
  const summary = classSpellSummary(char);
  if (!summary) return null;
  if (classStart(char)?.spells?.note) return <li><strong>{L(lang, 'Magia', 'Magic')}:</strong> {summary[k(lang)]}</li>;
  return (
    <li>
      <strong>{L(lang, 'Magia', 'Magic')}:</strong> {L(lang, 'sim', 'yes')} — {summary[k(lang)]}{' '}
      <span className="muted">({L(lang, 'escolhidas mais adiante', 'picked later on')})</span>
    </li>
  );
}

function ClassDetails({ char, lang, boxRef }) {
  const s = classStart(char);
  if (!s) return null;
  const feats = classFeaturesL1(char, char.className);
  return (
    <div className="card cr-class-details" style={{ marginTop: 16, scrollMarginTop: 12 }} ref={boxRef} id="cr-class-details">
      <h3 style={{ marginBottom: 8 }}>{tName('class', char.className, lang)}</h3>
      <ul className="cr-class-facts">
        <li>
          <strong><Term id="hitDie" lang={lang} />:</strong> d{s.hitDie} —{' '}
          {L(lang, `você começa com ${s.hitDie} + seu modificador de Constituição em `, `you start with ${s.hitDie} + your Constitution modifier in `)}
          <Term id="hitPoints" lang={lang}>{L(lang, 'Pontos de Vida', 'Hit Points')}</Term>.
        </li>
        <li>
          <strong><Term id="primaryAbility" lang={lang} />:</strong> {abilityList(s.primary, lang)}
        </li>
        <li>
          <strong><Term id="savingThrow" lang={lang}>{L(lang, 'Testes de resistência', 'Saving throws')}</Term>:</strong>{' '}
          {s.saves.map(a => abilityName(a, lang)).join(L(lang, ' e ', ' and '))}
        </li>
        <li><strong><Term id="armorTraining" lang={lang} />:</strong> {armorText(s, lang)}{s.armorNote ? ` (${s.armorNote[k(lang)]})` : ''}</li>
        <li><strong><Term id="weaponProficiency" lang={lang}>{L(lang, 'Armas', 'Weapons')}</Term>:</strong> {weaponText(s, lang)}</li>
        <li><strong><Term id="tool" lang={lang}>{L(lang, 'Ferramentas', 'Tools')}</Term>:</strong> {toolText(s, lang)}</li>
        <li>
          <strong><Term id="skill" lang={lang}>{L(lang, 'Perícias', 'Skills')}</Term>:</strong>{' '}
          {L(lang, `escolha ${s.skills.count} na próxima etapa`, `pick ${s.skills.count} in a later step`)}
        </li>
        <SpellLine char={char} lang={lang} />
      </ul>
      {feats.length > 0 && (
        <details className="cr-class-features">
          <summary>{L(lang, 'O que a classe faz no nível 1', 'What the class does at level 1')} ({feats.length})</summary>
          {feats.map((f, i) => (
            <p key={i} className="text-sm"><strong>{f.name[k(lang)]}:</strong> {f.desc[k(lang)]}</p>
          ))}
        </details>
      )}
    </div>
  );
}

function SubclassPicker({ char, set, lang }) {
  if (!needsSubclass(char)) return null;
  const label = SUBCLASS_LABEL[char.className] || { pt: 'Subclasse', en: 'Subclass' };
  const subs = subclassList(char);
  const core = subs.filter(isCoreSubclass);
  const extra = subs.filter(s => !isCoreSubclass(s));
  const rec = RECOMMENDED_SUBCLASS[char.className];
  const card = (sc) => (
    <ChoiceCard key={sc.id} selected={char.subclass === sc.id} onClick={() => set(selectSubclass(char, sc.id))}
      title={sc.name[k(lang)]} badge={sc.id === rec ? L(lang, 'Recomendado', 'Recommended') : (sc.source && !isCoreSubclass(sc) ? sc.source : null)}
      subtitle={sc.desc?.[k(lang)]}
      details={sc.features?.length ? (
        <>{sc.features.filter(f => f.level <= (char.level || 1)).map((f, i) => (
          <div key={i} style={{ marginBottom: 4 }}><strong>{f.name[k(lang)]}:</strong> {f.desc[k(lang)]}</div>
        ))}</>
      ) : null} />
  );
  return (
    <section style={{ marginTop: 24 }}>
      <h3>{label[k(lang)]} <span className="muted text-sm">(<Term id="subclass" lang={lang} />)</span></h3>
      <p className="cr-intro-text">{SUBCLASS_INTRO[char.className]?.[k(lang)]}</p>
      <ChoiceGrid>{core.map(card)}</ChoiceGrid>
      {extra.length > 0 && (
        <details style={{ marginTop: 12 }} open={extra.some(s => s.id === char.subclass)}>
          <summary>{L(lang, `Outros livros (${extra.length}) — confirme com o mestre`, `Other books (${extra.length}) — check with your DM`)}</summary>
          <div style={{ marginTop: 10 }}><ChoiceGrid>{extra.map(card)}</ChoiceGrid></div>
        </details>
      )}
    </section>
  );
}

/** Tela estreita (celular): os detalhes ficam longe do cartão tocado. */
const isNarrow = () => {
  try { return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 720px)').matches; } catch { return false; }
};

function ClassStep({ char, set, lang }) {
  const detailsRef = useRef(null);
  const pick = (id) => {
    set(selectClass(char, id));
    // No celular, leva até o quadro de detalhes logo depois de tocar.
    if (isNarrow()) {
      setTimeout(() => {
        try { detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* sem rolagem */ }
      }, 60);
    }
  };
  const isOther = OTHER_BOOK_CLASSES.includes(char.className);
  const changedFrom = classChangeNotice(char);
  return (
    <div>
      <StepIntro title={L(lang, 'Escolha sua classe', 'Choose your class')}>
        {L(lang, 'A ', 'Your ')}<Term id="class" lang={lang}>{L(lang, 'classe', 'class')}</Term>
        {L(lang,
          ' é a profissão do herói: define como ele luta, que poderes tem e no que é bom. É a escolha que mais muda o jeito de jogar.',
          ' is your hero\'s profession: how they fight, what powers they have and what they are good at. It is the choice that most changes how you play.')}
      </StepIntro>
      <Callout kind="info">
        {L(lang,
          'Primeira vez? As classes com o selo "Bom para começar" têm menos regras para lembrar. Toque numa classe para ver os detalhes.',
          'First time? Classes marked "Good for beginners" have fewer rules to remember. Tap a class to see the details.')}
      </Callout>
      {changedFrom && char.className && (
        <Callout kind="warn">
          {L(lang,
            <>Você trocou de classe ({tName('class', changedFrom, 'pt')} → {tName('class', char.className, 'pt')}). Os <Term id="abilityScores" lang={lang}>atributos</Term> e o bônus que você já tinha distribuído foram pensados para a classe anterior. Na etapa Atributos, toque em "Sugestão para minha classe" para refazer, ou confira se ainda servem.</>,
            <>You changed class ({tName('class', changedFrom, 'en')} → {tName('class', char.className, 'en')}). The <Term id="abilityScores" lang={lang}>ability scores</Term> and bonus you had already set were meant for your previous class. In the Abilities step, tap "Suggestion for my class" to redo them, or check they still work.</>)}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => set(dismissClassChange(char))}>{L(lang, 'Entendi', 'Got it')}</button>
          </div>
        </Callout>
      )}
      <ChoiceGrid>
        {CORE_CLASSES.map(id => <ClassCard key={id} char={char} id={id} lang={lang} onPick={pick} />)}
      </ChoiceGrid>
      <details style={{ marginTop: 16 }} open={isOther}>
        <summary>{L(lang, 'Outros livros — confirme com o mestre', 'Other books — check with your DM')}</summary>
        <p className="muted text-sm" style={{ margin: '8px 0' }}>
          {L(lang, 'Estas classes não estão no livro básico. Use só se o mestre aceitar.', 'These classes are not in the core book. Use them only if your DM agrees.')}
        </p>
        <ChoiceGrid>
          {OTHER_BOOK_CLASSES.map(id => <ClassCard key={id} char={char} id={id} lang={lang} onPick={pick} />)}
        </ChoiceGrid>
      </details>
      {char.className && <ClassDetails char={char} lang={lang} boxRef={detailsRef} />}
      <SubclassPicker char={char} set={set} lang={lang} />
    </div>
  );
}

export default {
  id: 'class',
  title: { pt: 'Classe', en: 'Class' },
  issues: classIssues,
  Comp: ClassStep,
};
