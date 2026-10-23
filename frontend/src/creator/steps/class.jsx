/* Etapa Classe: o que o herói faz na aventura (ver ../README.md). */
import { useEffect, useRef } from 'react';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { classStart } from '../start-data.js';
import {
  CORE_CLASSES, OTHER_BOOK_CLASSES, COMPLEXITY, isBeginnerClass, abilityName, abilityList,
  armorText, weaponText, toolText, classFeaturesL1, needsSubclass, subclassList, isCoreSubclass,
  SUBCLASS_LABEL, SUBCLASS_INTRO, RECOMMENDED_SUBCLASS, classIssues, selectClass, selectSubclass,
  classSpellSummary, classChangeNotice, dismissClassChange,
} from '../class-helpers.js';

import { classArt, subclassArt } from '../../art.js';
import { DecisionPanel, useDecision, useConsidering } from '../journey-ui.jsx';
import { classTradeoffs } from '../decision.js';
import { callLine } from '../chronicle.js';
import { findBackground } from '../background-helpers.js';

const k = (lang) => (lang === 'pt' ? 'pt' : 'en');

function ClassCard({ char, id, lang, onPick, considering }) {
  const s = classStart(char, id);
  if (!s) return null;
  return (
    <ChoiceCard
      selected={char.className === id}
      considering={considering === id}
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
      title={sc.name[k(lang)]} image={subclassArt(char.className, sc.id)} badge={sc.id === rec ? L(lang, 'Recomendado', 'Recommended') : (sc.source && !isCoreSubclass(sc) ? sc.source : null)}
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

const both = (kind, id) => ({ pt: tName(kind, id, 'pt'), en: tName(kind, id, 'en') });

/** O que a classe dá e o que deixa para trás (o painel do peso da decisão). */
function classInfo(char, id, lang) {
  const s = classStart(char, id);
  if (!s) return null;
  const spell = classSpellSummary({ ...char, className: id });
  const bg = char.rulesVersion === '2024' ? findBackground(char)?.abilities : null;
  return {
    art: classArt(id), kicker: { pt: 'O chamado', en: 'The call' }, name: both('class', id), pitch: s.role,
    gains: [
      { pt: `Vida: d${s.hitDie} a cada nível`, en: `Health: d${s.hitDie} every level` },
      { pt: `Atributo principal: ${abilityList(s.primary, 'pt')}`, en: `Main ability: ${abilityList(s.primary, 'en')}` },
      { pt: `Testes de resistência: ${s.saves.map(a => abilityName(a, 'pt')).join(' e ')}`, en: `Saving throws: ${s.saves.map(a => abilityName(a, 'en')).join(' and ')}` },
      (s.armor || []).length ? { pt: `Armaduras: ${armorText(s, 'pt')}`, en: `Armor: ${armorText(s, 'en')}` } : null,
      { pt: `Armas: ${weaponText(s, 'pt')}`, en: `Weapons: ${weaponText(s, 'en')}` },
      spell ? { pt: `Magia: ${spell.pt}`, en: `Magic: ${spell.en}` } : null,
    ],
    loses: classTradeoffs(char, id, bg),
    tale: callLine(id, 'pt') ? { pt: callLine(id, 'pt'), en: callLine(id, 'en') } : null,
    // Trocar de classe depois dos atributos: avisa antes de selar (o aviso completo aparece no topo depois).
    breakNote: id !== char.className && classChangeNotice({ ...char, ...selectClass(char, id) })
      ? { pt: `Os atributos que você já distribuiu foram pensados para ${tName('class', char.className, 'pt')}; depois, na etapa Atributos, use "Sugestão para minha classe".`,
        en: `The ability scores you already set were meant for ${tName('class', char.className, 'en')}; afterwards, in the Abilities step, use "Suggestion for my class".` }
      : null,
  };
}

function ClassStep({ char, set, lang }) {
  const detailsRef = useRef(null);
  const { propose } = useDecision();
  const considering = useConsidering('class');
  const pick = (id) => {
    // A escolha só vale ao selar (segurar o botão do rodapé); até lá o herói mostra uma prévia.
    propose({
      key: 'class', id, current: char.className || null, currentName: char.className ? both('class', char.className) : null,
      patch: (c) => selectClass(c, id), scar: 'class',
      reveal: { kicker: { pt: 'O chamado foi respondido', en: 'The call was answered' }, name: both('class', id), art: classArt(id), tale: callLine(id, 'pt') ? { pt: callLine(id, 'pt'), en: callLine(id, 'en') } : null },
    });
    // Leva até o painel do peso da escolha logo depois de tocar (no celular ele fica longe do cartão).
    if (isNarrow() || id !== char.className) {
      setTimeout(() => {
        try { detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: isNarrow() ? 'start' : 'nearest' }); } catch { /* sem rolagem */ }
      }, 60);
    }
  };
  const isOther = OTHER_BOOK_CLASSES.includes(char.className);
  const changedFrom = classChangeNotice(char);
  // Depois de selar: leva ao aviso de troca de classe (no topo) ou, no celular,
  // ao seletor de subclasse obrigatório (2014), que fica abaixo do painel.
  const noticeRef = useRef(null);
  const subRef = useRef(null);
  const sealedClass = useRef(char.className);
  useEffect(() => {
    if (sealedClass.current === char.className) return undefined;
    sealedClass.current = char.className;
    const target = changedFrom ? noticeRef.current : needsSubclass(char) && !char.subclass && isNarrow() ? subRef.current : null;
    if (!target) return undefined;
    const t = setTimeout(() => { try { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch { /* sem rolagem */ } }, 80);
    return () => clearTimeout(t);
  }, [char.className]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <div ref={noticeRef} style={{ scrollMarginTop: 140 }}>
        <Callout kind="warn">
          {L(lang,
            <>Você trocou de classe ({tName('class', changedFrom, 'pt')} → {tName('class', char.className, 'pt')}). Os <Term id="abilityScores" lang={lang}>atributos</Term> e o bônus que você já tinha distribuído foram pensados para a classe anterior. Na etapa Atributos, toque em "Sugestão para minha classe" para refazer, ou confira se ainda servem.</>,
            <>You changed class ({tName('class', changedFrom, 'en')} → {tName('class', char.className, 'en')}). The <Term id="abilityScores" lang={lang}>ability scores</Term> and bonus you had already set were meant for your previous class. In the Abilities step, tap "Suggestion for my class" to redo them, or check they still work.</>)}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => set(dismissClassChange(char))}>{L(lang, 'Entendi', 'Got it')}</button>
          </div>
        </Callout>
        </div>
      )}
      <ChoiceGrid>
        {CORE_CLASSES.map(id => <ClassCard key={id} char={char} id={id} lang={lang} onPick={pick} considering={considering} />)}
      </ChoiceGrid>
      <details style={{ marginTop: 16 }} open={isOther}>
        <summary>{L(lang, 'Outros livros — confirme com o mestre', 'Other books — check with your DM')}</summary>
        <p className="muted text-sm" style={{ margin: '8px 0' }}>
          {L(lang, 'Estas classes não estão no livro básico. Use só se o mestre aceitar.', 'These classes are not in the core book. Use them only if your DM agrees.')}
        </p>
        <ChoiceGrid>
          {OTHER_BOOK_CLASSES.map(id => <ClassCard key={id} char={char} id={id} lang={lang} onPick={pick} considering={considering} />)}
        </ChoiceGrid>
      </details>
      {(considering || char.className) && (() => {
        const view = considering ? { ...char, ...selectClass(char, considering) } : char;
        return (
          <div ref={detailsRef} style={{ scrollMarginTop: 140 }}>
            <DecisionPanel char={char} lang={lang} decisionKey="class" sealedId={char.className || null} info={classInfo(char, view.className, lang)} battle path={view.className}>
              <ClassDetails char={view} lang={lang} />
            </DecisionPanel>
          </div>
        );
      })()}
      <div ref={subRef} style={{ scrollMarginTop: 140 }}>
        <SubclassPicker char={char} set={set} lang={lang} />
      </div>
    </div>
  );
}

export default {
  id: 'class',
  title: { pt: 'Classe', en: 'Class' },
  issues: classIssues,
  Comp: ClassStep,
};
