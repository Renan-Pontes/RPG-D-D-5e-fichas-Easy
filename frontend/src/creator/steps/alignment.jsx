/* Etapa — Tendência (opcional): a bússola moral do herói. */
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { ALIGNMENT_INFO, isEvilAlignment } from '../creation.js';

function AlignmentStep({ char, set, lang }) {
  const value = char.alignment || '';
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
        <ChoiceCard selected={!value} onClick={() => set({ alignment: '' })}
          title={L(lang, 'Sem tendência', 'No alignment')}
          badge={L(lang, 'Bom para começar', 'Good to start')}
          subtitle={L(lang, 'Decida com o tempo, jogando.', 'Decide over time, while playing.')} />
        {ALIGNMENT_INFO.map(a => (
          <ChoiceCard key={a.id} selected={value === a.id} onClick={() => set({ alignment: a.id })}
            title={a.name[lang]} subtitle={a.desc[lang]}
            badge={isEvilAlignment(a.id) ? L(lang, 'Fale com o mestre', 'Ask your GM') : null} />
        ))}
      </ChoiceGrid>

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
