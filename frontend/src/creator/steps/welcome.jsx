/* Etapa 1 — Começo: o que é uma ficha, qual livro de regras e como sobe de nível. */
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { hasRulesChoices, rulesSwitchPatch } from '../creation.js';

const RULES = [
  {
    id: '2024',
    title: { pt: 'D&D 2024', en: 'D&D 2024' },
    badge: { pt: 'Recomendado', en: 'Recommended' },
    sub: { pt: 'A versão atual do jogo (Livro do Jogador de 2024).', en: 'The current version of the game (2024 Player\'s Handbook).' },
    details: { pt: 'Os bônus de atributo vêm do antecedente, e todo personagem fala Comum + 2 idiomas.', en: 'Ability bonuses come from your background, and everyone speaks Common + 2 languages.' },
  },
  {
    id: '2014',
    title: { pt: 'D&D 2014', en: 'D&D 2014' },
    badge: null,
    sub: { pt: 'O livro antigo (Livro do Jogador de 2014).', en: 'The older book (2014 Player\'s Handbook).' },
    details: { pt: 'Os bônus de atributo e a maioria dos idiomas vêm da raça; alguns antecedentes dão idiomas extras.', en: 'Ability bonuses and most languages come from your race; some backgrounds give extra languages.' },
  },
];

const LEVELING = [
  {
    id: 'milestone',
    title: { pt: 'Por Marcos', en: 'Milestones' },
    badge: { pt: 'Recomendado', en: 'Recommended' },
    sub: { pt: 'O mestre avisa quando o grupo sobe de nível, ao fim de partes importantes da história.', en: 'The GM tells the group when to level up, after important parts of the story.' },
  },
  {
    id: 'xp',
    title: { pt: 'Por XP', en: 'By XP' },
    badge: null,
    sub: { pt: 'Você ganha pontos de experiência a cada desafio e sobe ao juntar o bastante.', en: 'You earn experience points for each challenge and level up when you have enough.' },
  },
];

function WelcomeStep({ char, set, lang }) {
  const rules = char.rulesVersion === '2014' ? '2014' : '2024';
  const leveling = char.levelingMode === 'xp' ? 'xp' : 'milestone';

  const chooseRules = (id) => {
    if (id === rules) return;
    if (hasRulesChoices(char)) {
      const ok = typeof window === 'undefined' || window.confirm(L(lang,
        'Trocar a regra recomeça a ficha do zero (classe, espécie, atributos, magias…). O nome e a foto continuam. Trocar mesmo assim?',
        'Switching rules restarts the sheet from scratch (class, species, abilities, spells…). Name and photo are kept. Switch anyway?'));
      if (!ok) return;
    }
    set(prev => rulesSwitchPatch(prev, id));
  };

  return (
    <div>
      <StepIntro title={L(lang, 'Vamos criar seu herói', "Let's create your hero")}>
        <p>
          {L(lang, 'A ', 'A ')}<Term id="characterSheet" lang={lang}>{L(lang, 'ficha de personagem', 'character sheet')}</Term>
          {L(lang,
            ' guarda tudo o que seu herói sabe fazer: os números que você soma aos dados, a vida, as armas e as magias.',
            ' holds everything your hero can do: the numbers you add to dice rolls, health, weapons and spells.')}
        </p>
        <p>{L(lang,
          'Vamos montar ela passo a passo: primeiro a classe (o que você faz), depois a origem (de onde você vem), os atributos, o equipamento e, por fim, nome e história.',
          "We'll build it step by step: first your class (what you do), then your origin (where you come from), abilities, equipment and finally name and story.")}</p>
        <p>{L(lang,
          'Cada tela explica o que você está escolhendo. Toque nas palavras com "?" para ver o que elas significam.',
          'Each screen explains what you are choosing. Tap words marked "?" to see what they mean.')}</p>
      </StepIntro>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h3 style={{ marginTop: 0 }}>{L(lang, 'Qual livro de regras?', 'Which rulebook?')}</h3>
        <p className="muted text-sm">
          {L(lang, 'Seu ', 'Your ')}<Term id="gameMaster" lang={lang}>{L(lang, 'mestre', 'GM')}</Term>
          {L(lang, ' diz qual ', ' tells you which ')}<Term id="rulesEdition" lang={lang}>{L(lang, 'edição', 'edition')}</Term>
          {L(lang, ' a mesa usa. Na dúvida, fique com 2024.', ' the table uses. If unsure, keep 2024.')}
        </p>
        <ChoiceGrid>
          {RULES.map(r => (
            <ChoiceCard key={r.id} selected={rules === r.id} onClick={() => chooseRules(r.id)}
              title={r.title[lang]} badge={r.badge?.[lang]} subtitle={r.sub[lang]} details={r.details[lang]} />
          ))}
        </ChoiceGrid>
        {hasRulesChoices(char) && (
          <Callout kind="warn">{L(lang,
            'Você já fez escolhas. Trocar a regra agora recomeça a ficha (o nome e a foto continuam).',
            'You already made choices. Switching rules now restarts the sheet (name and photo are kept).')}</Callout>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>{L(lang, 'Como seu herói sobe de nível?', 'How does your hero level up?')}</h3>
        <p className="muted text-sm">
          {L(lang, 'Quem decide é o mestre. Se não souber, deixe ', 'The GM decides. If you don\'t know, keep ')}
          <Term id="milestone" lang={lang}>{L(lang, 'Marcos', 'Milestones')}</Term>
          {L(lang, ' — dá para mudar depois na ficha.', ' — you can change it later on the sheet.')}
        </p>
        <ChoiceGrid>
          {LEVELING.map(m => (
            <ChoiceCard key={m.id} selected={leveling === m.id} onClick={() => set({ levelingMode: m.id })}
              title={m.title[lang]} badge={m.badge?.[lang]} subtitle={m.sub[lang]} />
          ))}
        </ChoiceGrid>
      </div>
    </div>
  );
}

export default {
  id: 'welcome',
  title: { pt: 'Começo', en: 'Start' },
  // Regra e progressão já vêm com padrão (2024 + Marcos): nada a pendente aqui.
  issues: () => [],
  Comp: WelcomeStep,
};
