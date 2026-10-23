/* Etapa Espécie (2024) / Raça (2014). Lógica em ../species-helpers.js. */
import { useRef, useState } from 'react';
import { tName } from '../../../data/i18n.js';
import { StepIntro, Term, ChoiceGrid, ChoiceCard, Callout, L } from '../ui.jsx';
import { speciesArt } from '../../art.js';
import {
  CORE_SPECIES_2024, CORE_GROUPS_2014, FLAVOR, moreSpecies, isCore, isRecommended, findSpecies,
  darkvisionOf, speedOf, formatFeet, sizeLabel, splitTraits, raceBonusText, speciesLanguagesText,
  pendingChoiceLabels, selectSpecies, speciesIssues, groupOf,
} from '../species-helpers.js';
import { DecisionPanel, useDecision, useConsidering } from '../journey-ui.jsx';
import { birthLine } from '../chronicle.js';

const is2014 = (char) => char.rulesVersion === '2014';
const raceName = (id, lang) => tName('race', id, lang);

/** Linha curta: tamanho · deslocamento · visão no escuro. */
function Stats({ char, id, lang }) {
  const dv = darkvisionOf(char, id);
  return (
    <div className="option-meta">
      <strong>{L(lang, 'Tamanho', 'Size')}:</strong> {sizeLabel(char, id, lang)}
      {' · '}<strong>{L(lang, 'Deslocamento', 'Speed')}:</strong> {formatFeet(speedOf(char, id), lang)}
      {' · '}<strong>{L(lang, 'Visão no escuro', 'Darkvision')}:</strong> {dv ? formatFeet(dv, lang) : L(lang, 'não', 'no')}
    </div>
  );
}

/** Traços principais (sempre visíveis). */
function MainTraits({ char, id, lang, n = 3 }) {
  const { main } = splitTraits(char, id, n);
  if (!main.length) return null;
  return <div className="option-desc">{main.map(t => t.name[lang]).join(' · ')}</div>;
}

/** Tudo da espécie, mostrado quando ela está selecionada. */
function FullDetails({ char, id, lang }) {
  const { main, rest } = splitTraits(char, id, 0);
  const traits = [...main, ...rest];
  const pending = pendingChoiceLabels(char, id, lang);
  const bonus = raceBonusText(char, id, lang);
  return (
    <div>
      {bonus && <div><strong>{L(lang, 'Bônus nos atributos', 'Ability bonus')}:</strong> {bonus}</div>}
      <ul style={{ margin: '6px 0', paddingLeft: 18 }}>
        {traits.map((t, k) => <li key={k}><strong>{t.name[lang]}.</strong> {t.desc?.[lang]}</li>)}
      </ul>
      <div><strong>{L(lang, 'Idiomas', 'Languages')}:</strong> {speciesLanguagesText(char, id, lang)}</div>
      {pending.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <strong>{L(lang, 'Na próxima etapa você escolhe', 'Next step you choose')}:</strong> {pending.join(', ')}
        </div>
      )}
    </div>
  );
}

// Os detalhes completos (FullDetails) ficam no painel do peso da escolha, abaixo dos cartões.
function SpeciesCard({ char, id, lang, onPick, considering, flavorId = id }) {
  const bonus = raceBonusText(char, id, lang);
  const r = findSpecies(char, id);
  return (
    <ChoiceCard
      selected={char.race === id}
      considering={considering === id}
      onClick={() => onPick(id)}
      title={raceName(id, lang)}
      badge={isRecommended(char, id) ? L(lang, 'Bom para começar', 'Good for beginners') : null}
      subtitle={r?.source ? `${L(lang, 'Livro', 'Book')}: ${r.source}` : null}
      image={speciesArt(id)}
    >
      {FLAVOR[flavorId] && <div className="option-desc">{FLAVOR[flavorId][lang]}</div>}
      <Stats char={char} id={id} lang={lang} />
      {bonus && <div className="option-meta"><strong>{L(lang, 'Bônus', 'Bonus')}:</strong> {bonus}</div>}
      <MainTraits char={char} id={id} lang={lang} />
    </ChoiceCard>
  );
}

const GROUP_HEAD = {
  display: 'block', width: '100%', padding: 0, margin: 0, border: 0, background: 'none', color: 'inherit',
  font: 'inherit', textAlign: 'left', textTransform: 'none', letterSpacing: 'normal', cursor: 'pointer',
};

/** 2014: um cartão por raça; as sub-raças aparecem ao selecionar (ou ao pôr uma delas em análise). */
function Group2014({ char, group, lang, onPick, considering }) {
  if (group.members.length === 1) return <SpeciesCard char={char} id={group.members[0]} flavorId={group.id} lang={lang} onPick={onPick} considering={considering} />;
  const sealedHere = group.members.includes(char.race);
  const consideringHere = group.members.includes(considering);
  const active = sealedHere || consideringHere;
  const first = group.members.find(m => isRecommended(char, m)) || group.members[0];
  return (
    <div className={`option ${sealedHere ? 'selected' : consideringHere ? 'considering' : ''}`} style={{ cursor: 'default' }}>
      {/* Botão sem a classe .btn: ela põe o texto em MAIÚSCULAS espaçadas. */}
      <button type="button" style={GROUP_HEAD}
        aria-pressed={sealedHere} onClick={() => !active && onPick(first)}>
        <div>
          <div className="option-title">{group.name[lang]}
            <span className="cr-badge">{L(lang, `${group.members.length} sub-raças`, `${group.members.length} subraces`)}</span>
          </div>
          {FLAVOR[group.id] && <div className="option-desc">{FLAVOR[group.id][lang]}</div>}
        </div>
      </button>
      {active && (
        <div style={{ marginTop: 10 }}>
          <div className="option-meta" style={{ marginBottom: 6 }}>
            {L(lang, 'Escolha a sub-raça (um ramo desse povo):', 'Pick the subrace (a branch of this people):')}
          </div>
          <div className="options-list">
            {group.members.map(m => <SpeciesCard key={m} char={char} id={m} lang={lang} onPick={onPick} considering={considering} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/** Tela estreita (celular): o painel da escolha fica longe do cartão tocado. */
const isNarrow = () => {
  try { return typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 720px)').matches; } catch { return false; }
};

const bothName = (id) => ({ pt: raceName(id, 'pt'), en: raceName(id, 'en') });
const fmtBoth = (ft) => ({ pt: formatFeet(ft, 'pt'), en: formatFeet(ft, 'en') });

/** O que a espécie dá e o que deixa para trás (o painel do peso da decisão). */
function speciesInfo(char, id) {
  const r = findSpecies(char, id);
  if (!r) return null;
  const dv = darkvisionOf(char, id), speed = speedOf(char, id);
  const { main } = splitTraits(char, id, 3);
  const bonus = { pt: raceBonusText(char, id, 'pt'), en: raceBonusText(char, id, 'en') };
  const choosesSize = /você escolhe/.test(sizeLabel(char, id, 'pt'));
  const small = !choosesSize && r.size === 'Small';
  const sp = fmtBoth(speed), dvTxt = dv ? fmtBoth(dv) : null;
  return {
    art: speciesArt(id), kicker: { pt: 'O sangue', en: 'The blood' }, name: bothName(id),
    pitch: FLAVOR[id] || FLAVOR[groupOf(id)?.id] || null,
    gains: [
      { pt: `Deslocamento: ${sp.pt}`, en: `Speed: ${sp.en}` },
      dvTxt ? { pt: `Visão no escuro: ${dvTxt.pt}`, en: `Darkvision: ${dvTxt.en}` } : null,
      { pt: `Tamanho: ${sizeLabel(char, id, 'pt')}`, en: `Size: ${sizeLabel(char, id, 'en')}` },
      bonus.pt ? { pt: `Bônus nos atributos: ${bonus.pt}`, en: `Ability bonus: ${bonus.en}` } : null,
      ...main.map(t => ({ pt: t.name.pt, en: t.name.en })),
    ],
    loses: [
      speed < 30 ? { pt: `Deslocamento menor: ${sp.pt} (o comum é 9 m)`, en: `Slower: ${sp.en} (most have 30 ft)` } : null,
      small ? (is2014(char)
        ? { pt: 'Tamanho Pequeno: desvantagem nos ataques com armas Pesadas', en: 'Small size: disadvantage on attacks with Heavy weapons' }
        : { pt: 'Tamanho Pequeno', en: 'Small size' }) : null,
      !dv ? { pt: 'Sem visão no escuro', en: 'No darkvision' } : null,
    ],
    tale: { pt: birthLine(id, 'pt'), en: birthLine(id, 'en') },
  };
}

function SpeciesStep({ char, set, lang }) {
  const old = is2014(char);
  const selectedExtra = !!char.race && !isCore(char) && !!findSpecies(char);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(selectedExtra);
  const more = moreSpecies(char, q);
  const word = old ? L(lang, 'raça', 'race') : L(lang, 'espécie', 'species');
  const panelRef = useRef(null);
  const { propose } = useDecision();
  const considering = useConsidering('species');
  const pick = (id) => {
    // A escolha só vale ao selar (segurar o botão do rodapé); até lá o herói mostra uma prévia.
    propose({
      key: 'species', id, current: char.race || null, currentName: char.race ? bothName(char.race) : null,
      patch: (c) => selectSpecies(c, id),
      reveal: { kicker: { pt: 'O sangue foi escolhido', en: 'Your blood is chosen' }, name: bothName(id), art: speciesArt(id), tale: { pt: birthLine(id, 'pt'), en: birthLine(id, 'en') } },
    });
    // Leva até o painel do peso da escolha (fica abaixo dos cartões).
    if (isNarrow() || id !== char.race) {
      setTimeout(() => {
        try { panelRef.current?.scrollIntoView({ behavior: 'smooth', block: isNarrow() ? 'start' : 'nearest' }); } catch { /* sem rolagem */ }
      }, 60);
    }
  };
  // Espécie em análise: o painel mostra como a ficha ficaria (sem gravar nada).
  const shownId = considering || (findSpecies(char) ? char.race : null);
  const view = considering ? { ...char, ...selectSpecies(char, considering) } : char;
  const consideringExtra = !!considering && !isCore(char, considering);

  return (
    <div>
      <StepIntro title={old ? L(lang, 'Escolha a raça', 'Choose your race') : L(lang, 'Escolha a espécie', 'Choose your species')}>
        <p>
          {L(lang, 'A ', 'Your ')}<Term id="species" lang={lang}>{word}</Term>
          {L(lang, ' é o povo do seu herói: humano, elfo, anão… Ela dá características naturais, como ',
            ' is your hero\'s people: human, elf, dwarf… It grants natural traits like ')}
          <Term id="darkvision" lang={lang} />{L(lang, ', o ', ', ')}<Term id="speed" lang={lang} />
          {L(lang, ' e o tamanho.', ' and size.')}
        </p>
        <p>
          {old
            ? L(lang, 'Nas regras 2014 a raça também dá bônus nos atributos (aparece em cada cartão).',
              'In the 2014 rules your race also grants ability bonuses (shown on each card).')
            : L(lang, 'Em 2024 a espécie não muda atributos: escolha a que você achar mais legal.',
              'In 2024 species don\'t change ability scores: pick whichever you like best.')}
        </p>
      </StepIntro>

      {selectedExtra && (
        <Callout kind="warn">
          {L(lang, `Você escolheu ${raceName(char.race, 'pt')}, de outro livro. Confirme com o mestre se ${old ? 'essa raça' : 'essa espécie'} vale na mesa.`,
            `You picked ${raceName(char.race, 'en')}, from another book. Check with your DM that it is allowed.`)}
          {!old && findSpecies(char)?.legacyCompatibility && L(lang,
            ' Nas regras 2024 ela não dá idiomas nem bônus de atributo (isso vem da origem e do antecedente).',
            ' Under 2024 rules it grants no languages or ability bonuses (those come from origin and background).')}
        </Callout>
      )}

      <ChoiceGrid>
        {old
          ? CORE_GROUPS_2014.map(g => <Group2014 key={g.id} char={char} group={g} lang={lang} onPick={pick} considering={considering} />)
          : CORE_SPECIES_2024.map(id => <SpeciesCard key={id} char={char} id={id} lang={lang} onPick={pick} considering={considering} />)}
      </ChoiceGrid>

      {shownId && (
        <div ref={panelRef} style={{ scrollMarginTop: 140 }}>
          <DecisionPanel char={char} lang={lang} decisionKey="species" sealedId={char.race || null} info={speciesInfo(char, shownId)}>
            {consideringExtra && (
              <p className="text-sm muted" style={{ margin: '0 0 8px' }}>
                {L(lang, `${raceName(shownId, 'pt')} é de outro livro: confirme com o mestre se ${old ? 'essa raça' : 'essa espécie'} vale na mesa.`,
                  `${raceName(shownId, 'en')} is from another book: check with your DM that it is allowed.`)}
              </p>
            )}
            <FullDetails char={view} id={shownId} lang={lang} />
          </DecisionPanel>
        </div>
      )}

      <details className="card" style={{ marginTop: 16, padding: 12 }} open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
          {L(lang, `Mais ${old ? 'raças' : 'espécies'} (outros livros — confirme com o mestre) · ${moreSpecies(char).length}`,
            `More ${old ? 'races' : 'species'} (other books — check with your DM) · ${moreSpecies(char).length}`)}
        </summary>
        {open && (
          <div style={{ marginTop: 10 }}>
            <input type="search" value={q} onChange={e => setQ(e.target.value)}
              placeholder={L(lang, 'Buscar pelo nome…', 'Search by name…')} aria-label={old ? L(lang, 'Buscar raça', 'Search race') : L(lang, 'Buscar espécie', 'Search species')}
              style={{ marginBottom: 10, width: '100%' }} />
            {more.length === 0
              ? <div className="muted text-sm">{L(lang, 'Nada encontrado.', 'Nothing found.')}</div>
              : <ChoiceGrid>{more.map(r => <SpeciesCard key={r.id} char={char} id={r.id} lang={lang} onPick={pick} considering={considering} />)}</ChoiceGrid>}
          </div>
        )}
      </details>
    </div>
  );
}

export default {
  id: 'species',
  title: { pt: 'Espécie', en: 'Species' },
  issues: speciesIssues,
  Comp: SpeciesStep,
};
