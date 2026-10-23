/* Etapa — Tendência (opcional): a bússola moral do herói. */
import { useRef } from 'react';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { ALIGNMENT_INFO, isEvilAlignment } from '../creation.js';
import { HERO_ART } from '../../art.js';
import { DecisionPanel, useDecision, useConsidering, portraitOf } from '../journey-ui.jsx';
import { chronicleLines } from '../chronicle.js';

/** Id da escolha "Sem tendência" no peso da decisão (a ficha guarda alignment: ''). */
const NONE = 'none';
const NONE_NAME = { pt: 'Sem tendência', en: 'No alignment' };
const NONE_DESC = { pt: 'Decida com o tempo, jogando.', en: 'Decide over time, while playing.' };

const findAlignment = (id) => ALIGNMENT_INFO.find(a => a.id === id) || null;

/** "E jurou …": a frase da crônica para a tendência (só ela, de uma ficha vazia). */
function oathTale(char, id) {
  if (!id || id === NONE) return null;
  const line = (lang) => { try { return chronicleLines({ rulesVersion: char.rulesVersion, alignment: id }, lang)[0] || ''; } catch { return ''; } };
  const pt = line('pt');
  return pt ? { pt, en: line('en') } : null;
}

/** O painel do peso da decisão para uma tendência (ou "Sem tendência"). */
function alignmentInfo(char, id) {
  const a = id === NONE ? null : findAlignment(id);
  if (id !== NONE && !a) return null;
  return {
    art: portraitOf(char) || HERO_ART, kicker: { pt: 'O juramento', en: 'The oath' },
    name: a ? a.name : NONE_NAME, pitch: a ? a.desc : NONE_DESC,
    tale: oathTale(char, id),
  };
}

function AlignmentStep({ char, set, lang }) {
  const value = char.alignment || '';
  const panelRef = useRef(null);
  const { propose, cancel } = useDecision();
  const considering = useConsidering('alignment');
  const pick = (id) => {
    // Já está sem tendência: tocar em "Sem tendência" não muda nada.
    if (id === NONE && !value) { cancel(); return; }
    const cur = findAlignment(value);
    // A escolha só vale ao selar (segurar o botão do rodapé); o patch é o mesmo do clique de antes.
    propose({
      key: 'alignment', id, current: value || null, currentName: cur ? cur.name : null,
      patch: () => ({ alignment: id === NONE ? '' : id }),
    });
    setTimeout(() => {
      try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch { /* sem rolagem */ }
    }, 60);
  };
  const shownId = considering || value || null;
  return (
    <div>
      <StepIntro title={L(lang, 'Tendência (opcional)', 'Alignment (optional)')}>
        <p>
          {L(lang, 'A ', '')}<Term id="alignment" lang={lang}>{L(lang, 'tendência', 'Alignment')}</Term>
          {L(lang,
            ' resume em duas palavras como seu herói costuma agir: se segue regras (leal) ou a própria vontade (caótico), e se é bom, neutro ou mau.',
            ' sums up in two words how your hero usually acts: whether they follow rules (lawful) or their own will (chaotic), and whether they are good, neutral or evil.')}
        </p>
        <p>{L(lang,
          'É só um guia para interpretar o personagem: não muda nenhum número. Pode pular se não quiser escolher.',
          "It's just a roleplaying guide: it doesn't change any numbers. Skip it if you don't want to choose.")}</p>
      </StepIntro>

      <Callout kind="info">{L(lang,
        'O jogo parte do princípio de que os heróis não são maus. Converse com o mestre antes de criar um personagem mau.',
        'The game assumes heroes are not evil. Talk to your GM before making an evil character.')}</Callout>

      <ChoiceGrid>
        <ChoiceCard selected={!value} considering={considering === NONE} onClick={() => pick(NONE)}
          title={L(lang, 'Sem tendência', 'No alignment')}
          badge={L(lang, 'Bom para começar', 'Good to start')}
          subtitle={L(lang, 'Decida com o tempo, jogando.', 'Decide over time, while playing.')} />
        {ALIGNMENT_INFO.map(a => (
          <ChoiceCard key={a.id} selected={value === a.id} considering={considering === a.id} onClick={() => pick(a.id)}
            title={a.name[lang]} subtitle={a.desc[lang]}
            badge={isEvilAlignment(a.id) ? L(lang, 'Fale com o mestre', 'Ask your GM') : null} />
        ))}
      </ChoiceGrid>

      {shownId && (
        <div ref={panelRef} style={{ scrollMarginTop: 140 }}>
          <DecisionPanel char={char} lang={lang} decisionKey="alignment" sealedId={value || null} info={alignmentInfo(char, shownId)}>
            {considering && isEvilAlignment(considering) && (
              <p className="text-sm muted" style={{ margin: 0 }}>
                {L(lang, 'Esta é uma tendência má: confirme com o mestre se ela combina com a mesa e com o grupo.',
                  'This is an evil alignment: check with your GM that it fits the table and the group.')}
              </p>
            )}
          </DecisionPanel>
        </div>
      )}

      {isEvilAlignment(value) && (
        <Callout kind="warn">{L(lang,
          'Você escolheu uma tendência má. Confirme com o mestre se isso combina com a mesa e com o grupo.',
          'You picked an evil alignment. Check with your GM that it fits the table and the group.')}</Callout>
      )}
    </div>
  );
}

export default {
  id: 'alignment',
  title: { pt: 'Tendência', en: 'Alignment' },
  issues: () => [],
  Comp: AlignmentStep,
};
