/* Etapa — Detalhes: nome (obrigatório), foto, aparência e história com perguntas-guia. */
import { AvatarUpload } from '../../../components/Shared.jsx';
import { StepIntro, Callout, L } from '../ui.jsx';
import { detailsIssues, STORY_PROMPTS, NAME_MAX } from '../creation.js';

const LOOKS = [
  ['age', 'Idade', 'Age', '25 anos', '25 years'],
  ['height', 'Altura', 'Height', '1,75 m', "5'9\""],
  ['weight', 'Peso', 'Weight', '70 kg', '155 lb'],
  ['eyes', 'Olhos', 'Eyes', 'Castanhos', 'Brown'],
  ['skin', 'Pele', 'Skin', 'Morena', 'Tan'],
  ['hair', 'Cabelo', 'Hair', 'Preto, trançado', 'Black, braided'],
];

const TRAITS = [
  ['personality', 'Traços de personalidade', 'Personality traits', 'Como você age? Ex.: "Faço piada em qualquer situação."', 'How do you act? E.g. "I joke in any situation."'],
  ['ideals', 'Ideais', 'Ideals', 'No que você acredita? Ex.: "Todos merecem uma segunda chance."', 'What do you believe in? E.g. "Everyone deserves a second chance."'],
  ['bonds', 'Vínculos', 'Bonds', 'O que ou quem você protege? Ex.: "Minha irmã mais nova."', 'What or who do you protect? E.g. "My little sister."'],
  ['flaws', 'Defeitos', 'Flaws', 'Qual é sua fraqueza? Ex.: "Não resisto a uma aposta."', "What's your weakness? E.g. \"I can't resist a bet.\""],
];

function DetailsStep({ char, set, lang }) {
  const story = char.creation?.story || {};
  const setStory = (id, v) => set(prev => ({ creation: { ...(prev.creation || {}), story: { ...(prev.creation?.story || {}), [id]: v } } }));
  const nameIssues = detailsIssues(char);
  const missingName = !String(char.name || '').trim();
  const nameLen = String(char.name || '').length;

  return (
    <div>
      <StepIntro title={L(lang, 'Quem é seu herói?', 'Who is your hero?')}>
        <p>{L(lang,
          'Agora a parte divertida: dê um nome e uma cara para o seu personagem. Só o nome é obrigatório.',
          'Now the fun part: give your character a name and a face. Only the name is required.')}</p>
        <p>{L(lang,
          'A história não muda números, mas ajuda você e o mestre a saber como seu herói pensa e age.',
          "The story doesn't change any numbers, but it helps you and the GM know how your hero thinks and acts.")}</p>
      </StepIntro>

      <div className="card" style={{ marginBottom: 'var(--s-4)', display: 'grid', gap: 'var(--s-3)' }}>
        <div className="creator-avatar">
          <AvatarUpload value={char.avatar} onChange={(avatar) => set({ avatar })} lang={lang} size={72}
            letter={(char.name || '?').charAt(0).toUpperCase()} />
          <span className="muted text-xs">{char.avatar
            ? L(lang, 'Toque na foto para ver, trocar ou remover.', 'Tap the photo to view, change or remove it.')
            : L(lang, 'Foto do personagem (opcional): toque no círculo.', 'Character photo (optional): tap the circle.')}</span>
        </div>
        <div>
          <label htmlFor="cr-name">{L(lang, 'Nome do personagem', 'Character name')} *</label>
          <input id="cr-name" value={char.name || ''} onChange={e => set({ name: e.target.value.slice(0, NAME_MAX) })}
            maxLength={NAME_MAX} aria-describedby="cr-name-hint"
            placeholder={L(lang, 'Ex.: Lia Pedravento', 'E.g. Lia Stonewind')} aria-invalid={nameIssues.length > 0} autoComplete="off" />
          {missingName && <div className="field-hint" id="cr-name-hint">{L(lang, 'Obrigatório. Pode trocar depois na ficha.', 'Required. You can change it later on the sheet.')}</div>}
          {!missingName && nameLen > NAME_MAX - 20 && (
            <div className="field-hint" id="cr-name-hint">{L(lang, `${nameLen} de ${NAME_MAX} letras (máximo).`, `${nameLen} of ${NAME_MAX} characters (maximum).`)}</div>
          )}
        </div>
        <div>
          <label htmlFor="cr-player">{L(lang, 'Seu nome (jogador)', 'Your name (player)')}</label>
          <input id="cr-player" value={char.player || ''} onChange={e => set({ player: e.target.value })} autoComplete="off" />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h3 style={{ marginTop: 0 }}>{L(lang, 'Aparência', 'Appearance')}</h3>
        <label htmlFor="cr-appearance" className="muted text-sm">{L(lang,
          'Como as pessoas te veem? Roupas, cicatrizes, jeito de andar…',
          'How do people see you? Clothes, scars, the way you walk…')}</label>
        <textarea id="cr-appearance" value={char.appearance || ''} onChange={e => set({ appearance: e.target.value })} />
        <div className="row gap-3" style={{ flexWrap: 'wrap', marginTop: 'var(--s-3)' }}>
          {LOOKS.map(([k, pt, en, phPt, phEn]) => (
            <div key={k} style={{ flex: '1 1 110px' }}>
              <label htmlFor={`cr-${k}`}>{L(lang, pt, en)}</label>
              <input id={`cr-${k}`} value={char[k] || ''} onChange={e => set({ [k]: e.target.value })} placeholder={L(lang, phPt, phEn)} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--s-4)' }}>
        <h3 style={{ marginTop: 0 }}>{L(lang, 'Sua história', 'Your story')}</h3>
        <p className="muted text-sm">{L(lang,
          'Pense no seu antecedente e na sua espécie e responda o que quiser. Uma frase já basta; deixe em branco o que não souber.',
          'Think about your background and species and answer whatever you like. One sentence is enough; leave blank what you don\'t know.')}</p>
        <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
          {STORY_PROMPTS.map(p => (
            <div key={p.id}>
              <label htmlFor={`cr-story-${p.id}`}>{p.q[lang]}</label>
              <input id={`cr-story-${p.id}`} value={story[p.id] || ''} onChange={e => setStory(p.id, e.target.value)} placeholder={p.hint[lang]} />
            </div>
          ))}
          <div>
            <label htmlFor="cr-backstory">{L(lang, 'Algo mais? (história livre)', 'Anything else? (free story)')}</label>
            <textarea id="cr-backstory" value={char.backstory || ''} onChange={e => set({ backstory: e.target.value })} />
          </div>
        </div>
        <Callout kind="info">{L(lang,
          'As respostas vão para o campo "História" da ficha. Dá para editar tudo depois.',
          'Your answers go to the sheet\'s "Backstory" field. You can edit everything later.')}</Callout>
      </div>

      <details className="card">
        <summary style={{ cursor: 'pointer' }}>
          <strong>{L(lang, 'Personalidade, ideais, vínculos e defeitos', 'Personality, ideals, bonds and flaws')}</strong>
          <span className="muted text-sm">{L(lang, ' (opcional)', ' (optional)')}</span>
        </summary>
        <p className="muted text-sm">{L(lang,
          'Quatro frases curtas que ajudam a interpretar o herói na mesa.',
          'Four short sentences that help you roleplay your hero at the table.')}</p>
        <div style={{ display: 'grid', gap: 'var(--s-3)' }}>
          {TRAITS.map(([k, pt, en, phPt, phEn]) => (
            <div key={k}>
              <label htmlFor={`cr-${k}`}>{L(lang, pt, en)}</label>
              <textarea id={`cr-${k}`} value={char[k] || ''} onChange={e => set({ [k]: e.target.value })} placeholder={L(lang, phPt, phEn)} />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export default {
  id: 'details',
  title: { pt: 'Detalhes', en: 'Details' },
  issues: detailsIssues,
  Comp: DetailsStep,
};
