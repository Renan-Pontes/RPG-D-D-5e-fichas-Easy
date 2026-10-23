/*
 * "Portas para o futuro" (etapas Atributos e Bônus de atributo): com os
 * valores de agora, quais classes o herói poderia aprender mais adiante por
 * multiclasse. Só apresentação; a regra está em doors.js.
 */
import { useMemo } from 'react';
import { tName } from '../../data/i18n.js';
import { classArt } from '../art.js';
import { Term, Callout, L } from './ui.jsx';
import { multiclassDoors, needShort, needLong, haveLong, haveShort } from './doors.js';
import './journey-extra.css';

const hide = (e) => { e.currentTarget.style.display = 'none'; };

export default function DoorsPanel({ char, lang }) {
  const d = useMemo(() => { try { return multiclassDoors(char); } catch { return null; } }, [char]);
  if (!d || !d.ready) return null;
  const own = d.own;
  const ownName = own ? tName('class', own.id, lang) : '';
  const total = d.doors.filter(x => !x.own).length;
  return (
    <section className="cr-doors" aria-labelledby="cr-doors-title">
      <div className="cr-doors-head">
        <span className="eyebrow">{L(lang, 'Mais adiante na estrada', 'Further down the road')}</span>
        <h3 id="cr-doors-title" className="cr-doors-title">{L(lang, 'Portas para o futuro', 'Doors to the future')}</h3>
      </div>
      <p className="cr-doors-lead">
        {L(lang, 'Quando subir de nível, seu herói pode aprender uma segunda classe: é a ', 'When you level up, your hero can learn a second class: that\'s ')}
        <Term id="multiclass" lang={lang}>{L(lang, 'multiclasse', 'multiclassing')}</Term>
        {L(lang, ', uma regra opcional (combine com o mestre). Cada porta pede 13 ou mais num atributo da nova classe, e a sua classe atual também precisa ter o dela em 13. As portas acesas já abririam com os valores de agora.',
          ', an optional rule (check with your DM). Each door needs 13 or more in an ability of the new class, and your current class needs its own at 13 too. Lit doors would already open with your current scores.')}
      </p>
      {own && !own.ok && (
        <Callout kind="warn">
          {L(lang,
            `Para sair do caminho de ${ownName} e aprender outra classe, o próprio ${ownName} pede ${needLong(own.missing, 'pt')} (agora: ${haveLong(own.missing, d.scores, 'pt')}). Sem isso, nenhuma porta abre. Não é um problema para jogar: só fecha esta opção por enquanto.`,
            `To step off the ${ownName} path and learn another class, ${ownName} itself needs ${needLong(own.missing, 'en')} (now: ${haveLong(own.missing, d.scores, 'en')}). Without it, no door opens. That's fine for playing: it just closes this option for now.`)}
        </Callout>
      )}
      <ul className="cr-doors-grid">
        {d.doors.map(x => {
          const name = tName('class', x.id, lang);
          const state = x.own ? 'own' : x.open ? 'open' : 'shut';
          const why = x.own
            ? L(lang, 'seu caminho', 'your path')
            : x.open
              ? L(lang, `aberta (${needLong(x.need, 'pt')})`, `open (${needLong(x.need, 'en')})`)
              : !x.ok
                ? L(lang, `fechada: falta ${needLong(x.missing, 'pt')}, você tem ${haveLong(x.missing, d.scores, 'pt')}`, `closed: needs ${needLong(x.missing, 'en')}, you have ${haveLong(x.missing, d.scores, 'en')}`)
                : L(lang, `fechada: falta o pré-requisito de ${ownName}`, `closed: ${ownName}'s requirement is missing`);
          return (
            <li key={x.id} className={`cr-door ${state}`} title={`${name}: ${why}`}>
              <span className="cr-door-art" aria-hidden="true">
                {classArt(x.id) && <img src={classArt(x.id)} alt="" loading="lazy" onError={hide} />}
              </span>
              <b className="cr-door-name">{name}</b>
              <span className="cr-sr">: {why}</span>
              <small className="cr-door-need" aria-hidden="true">{x.own ? L(lang, 'Seu caminho', 'Your path') : needShort(x.need, lang)}</small>
              {!x.own && !x.ok && <small className="cr-door-have" aria-hidden="true">{L(lang, 'você: ', 'you: ')}{haveShort(x.missing, d.scores, lang)}</small>}
            </li>
          );
        })}
      </ul>
      <p className="cr-doors-count">
        {d.openCount
          ? L(lang, `${d.openCount} de ${total} portas acesas. Não precisa decidir nada agora.`, `${d.openCount} of ${total} doors lit. You don't need to decide anything now.`)
          : L(lang, `Nenhuma das ${total} portas acesa por enquanto. Tudo bem: a maioria dos heróis segue uma classe só.`, `None of the ${total} doors lit for now. That's fine: most heroes stick to one class.`)}
      </p>
    </section>
  );
}
