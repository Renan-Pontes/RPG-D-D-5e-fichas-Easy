import { t, tName } from '../../../data/i18n.js';
import Utils from '../../../utils.js';
import { Modal } from '../../../components/Shared.jsx';
import ArtThumb from '../../components/ArtThumb.jsx';
import { schoolIcon, SCHOOL_EMOJI } from '../../art.js';
import { slotCircleLabel, gemLabel, lockedSlotTitle, slotSpent, slotTap, slotTapTitle } from '../gem-text.js';
import { higherLevelText, scaledDice } from '../spell-text.js';
import { useSheetToast } from '../sheet-toast.jsx';
import FhTitle from '../FhTitle.jsx';
export const L_SP = (lang, pt, en) => (lang === 'en' ? en : pt);
export const SlotMatrix = ({ char, lang, slots, update }) => {
  const pt = lang === 'pt';
  const toast = useSheetToast();   // null fora da ficha
  const pact = Utils.pactSlots ? Utils.pactSlots(char) : [];
  const rows = (slots || []).map((max, i) => {
    const p = Math.min(max || 0, pact[i] || 0);
    const r = Math.max(0, (max || 0) - p);
    const used = Math.min(max || 0, (char.spellSlotsUsed || [])[i] || 0);
    const pSpent = Math.min(used, p);
    return { i, max: max || 0, r, p, used, rSpent: used - pSpent, pSpent };
  }).filter(x => x.max > 0);
  if (!rows.length) return null;
  const colsR = Math.max(0, ...rows.map(x => x.r));
  const colsP = Math.max(0, ...rows.map(x => x.p));
  const locked = !!char.inCampaign;
  const setUsed = (i, used) => {
    const arr = [...(char.spellSlotsUsed || [])];
    while (arr.length <= i) arr.push(0);
    arr[i] = used;
    update({ spellSlotsUsed: arr });
  };
  const gem = (row, k, n, spentN, kind) => {
    const spent = slotSpent(k, n, spentN);
    const circle = slotCircleLabel(row.i + 1, lang);
    return (
      <button key={`${kind}${k}`} type="button" disabled={locked}
        className={`fh-sm-gem is-${kind}${spent ? ' is-spent' : ''}`}
        aria-label={gemLabel(kind === 'pact' ? `${circle} (${pt ? 'pacto' : 'pact'})` : circle, k, n, spent, lang)}
        title={locked ? lockedSlotTitle(true, lang) : slotTapTitle(spent, lang)}
        onClick={locked ? undefined : () => {
          const next = slotTap(spentN, n, spent);
          const before = [...(char.spellSlotsUsed || [])];
          setUsed(row.i, kind === 'pact' ? row.rSpent + next : row.pSpent + next);
          // Mesmo retorno das gemas de recurso: o aviso diz o que mudou e desfaz. Devolver um
          // espaço pelo toque continua valendo (Recuperação Arcana, Fonte de Magia, Pérola do Poder…).
          const left = row.max - row.used + (spent ? 1 : -1);
          toast?.show({
            ms: 5000,
            text: spent
              ? (pt ? `${circle}: +1 espaço devolvido (${left}/${row.max})` : `${circle}: +1 slot restored (${left}/${row.max})`)
              : (pt ? `${circle}: −1 espaço (${left === 1 ? 'resta' : 'restam'} ${left}/${row.max})` : `${circle}: −1 slot (${left}/${row.max} left)`),
            onAction: toast.patchChar ? () => toast.patchChar({ spellSlotsUsed: before }) : undefined,
          });
        }} />
    );
  };
  const tmpl = `auto ${colsR ? `repeat(${colsR}, var(--fh-sm-cell))` : ''} ${colsP ? `var(--fh-sm-gap-col) repeat(${colsP}, var(--fh-sm-cell))` : ''} 1fr`;
  return (
    <div className="fh-slot-matrix" role="group" aria-label={pt ? 'Espaços de magia' : 'Spell slots'}
      style={{ gridTemplateColumns: tmpl }}>
      <span className="fh-sm-head fh-sm-corner">{pt ? 'Círculo' : 'Level'}</span>
      {colsR > 0 && <span className="fh-sm-head is-long" style={{ gridColumn: `span ${colsR}` }}>🌙 {pt ? 'Descanso longo' : 'Long rest'}</span>}
      {colsP > 0 && <span className="fh-sm-sep" aria-hidden="true" />}
      {colsP > 0 && <span className="fh-sm-head is-short" style={{ gridColumn: `span ${colsP}` }}>☕ {pt ? 'Descanso curto · Pacto' : 'Short rest · Pact'}</span>}
      <span className="fh-sm-head fh-sm-count" />
      {rows.map(row => (
        <div key={row.i} className="fh-sm-row" style={{ display: 'contents' }}>
          <span className="fh-sm-lvl">{row.i + 1}</span>
          {Array.from({ length: colsR }, (_, k) => (k < row.r ? gem(row, k, row.r, row.rSpent, 'slot') : <span key={`e${k}`} className="fh-sm-empty" />))}
          {colsP > 0 && <span className="fh-sm-sep" aria-hidden="true" />}
          {Array.from({ length: colsP }, (_, k) => (k < row.p ? gem(row, k, row.p, row.pSpent, 'pact') : <span key={`ep${k}`} className="fh-sm-empty" />))}
          <span className="fh-sm-count">{row.max - row.used}/{row.max}</span>
        </div>
      ))}
    </div>
  );
};

export const SchoolBadge = ({ school, lang, size = 30 }) => (
  <ArtThumb src={schoolIcon(school)} emoji={SCHOOL_EMOJI[school] || '✦'} size={size} round lang={lang}
    title={tName('school', school, lang)} className="school-badge" />
);

// Linha de magia no visual "Ficha Forjada" (src/sheet/ficha.css). Só design: abrir/fechar,
// a estrela de preparada, o seletor de espaço, Conjurar e remover são os de antes.
// - O cabeçalho é um <button aria-expanded>; a estrela é um botão IRMÃO (antes ficava
//   dentro do cabeçalho clicável; botão dentro de botão é HTML inválido).
// - Etiqueta de círculo ("Truque" / "1º círculo"), sub "escola · tempo · alcance" e as
//   marcas C/R. Sem espaço livre para conjurar (o mesmo canCast do botão), a linha esmaece.
// Espaços de um círculo como diamantes à direita do cabeçalho: aceso = disponível,
// apagado = gasto. Só leitura (gastar é pelo Conjurar / descanso).
export const SlotGems = ({ lang, lvl, max, used }) => {
  const left = Math.max(0, max - used);
  const pt = lang === 'pt';
  return (
    <span className="fh-slot-gems" role="img"
      aria-label={pt ? `${left} de ${max} espaços de ${lvl}º círculo disponíveis` : `${left} of ${max} level ${lvl} slots available`}
      title={pt ? `${left}/${max} espaços disponíveis` : `${left}/${max} slots available`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`fh-slot-gem${i < left ? ' is-on' : ' is-spent'}`} aria-hidden="true" />
      ))}
    </span>
  );
};

// Seletor de círculo em 9 seções: abaixo do círculo da magia e acima do maior espaço
// livre ficam apagados; círculos sem espaço livre no meio, travados. Mostra como a
// magia escala (dados) no círculo escolhido, ou a regra do texto quando não são dados.
export const SlotSlider = ({ lang, spellLevel, slots, char, value, onChange, spellId, text }) => {
  const pt = lang === 'pt';
  const free = (i) => ((slots || [])[i] || 0) - ((char.spellSlotsUsed || [])[i] || 0);
  const maxFree = [...Array(9).keys()].reverse().find(i => free(i) > 0);
  const top = maxFree == null ? 0 : maxFree + 1;
  const sc = scaledDice(spellId, spellLevel, value);
  const rule = higherLevelText(text);
  // Só os círculos que existem para este personagem, do círculo da magia até o maior
  // espaço que ele tem (um mago de nível 1 via 8 seções mortas). Um círculo só: sem seletor.
  const have = [...Array(9).keys()].reverse().find(i => ((slots || [])[i] || 0) > 0);
  const last = Math.max(spellLevel, have == null ? 0 : have + 1);
  const span = last - spellLevel + 1;
  return (
    <div className={`fh-slot-slider${span <= 1 ? ' is-single' : ''}`}>
      {span > 1 && <div className="fh-ss-k">{pt ? 'Conjurar com espaço de' : 'Cast with a slot of'}</div>}
      {span > 1 && <div className="fh-ss-track" role="radiogroup" aria-label={pt ? 'Círculo do espaço' : 'Slot level'} style={{ '--fh-ss-n': span }}>
        {Array.from({ length: span }, (_, k) => {
          const i = spellLevel - 1 + k;
          const lvl = i + 1;
          const out = lvl < spellLevel || lvl > top;
          const none = !out && free(i) <= 0;
          const on = lvl === value && !out && !none;
          return (
            <button key={lvl} type="button" role="radio" aria-checked={on} disabled={out || none}
              className={`fh-ss-seg${out ? ' is-out' : ''}${none ? ' is-none' : ''}${on ? ' is-on' : ''}${lvl > spellLevel && !out ? ' is-up' : ''}`}
              title={out ? (lvl < spellLevel ? (pt ? 'Abaixo do círculo da magia' : 'Below the spell level') : (pt ? 'Sem espaço deste círculo' : 'No slot this high'))
                : none ? (pt ? 'Espaços deste círculo gastos' : 'Slots of this level spent')
                  : `${slotCircleLabel(lvl, lang)} · ${free(i)}/${(slots || [])[i]}`}
              onClick={() => onChange(lvl)}>
              {lvl}º
            </button>
          );
        })}
      </div>}
      {value > spellLevel && (sc?.plus || rule) && (
        <div className="fh-ss-hint">
          ↑ {slotCircleLabel(value, lang)}: {sc?.at ? <><b>{sc.base}</b> → <b className="fh-ss-up">{sc.at}</b></> : sc?.plus ? <b className="fh-ss-up">{sc.plus}</b> : <span>{rule}</span>}
        </div>
      )}
      {value === spellLevel && sc?.base && <div className="fh-ss-hint muted">{sc.base}{rule ? ` · ${pt ? 'sobe por círculo' : 'scales per level'}` : ''}</div>}
    </div>
  );
};

// Dano ou cura de uma magia, lido do MESMO texto de regra que a linha mostra (nada de tabela
// à parte): o primeiro dado antes de "Em Níveis Superiores", "+ modificador de conjuração"
// quando o texto diz, os degraus do truque (5º, 11º e 17º nível) e o aumento por círculo do
// espaço quando o texto os traz. Sem certeza, devolve null (ficam os dados roláveis do texto).
const SPELL_HL = /(At Higher Levels|Using a Higher-Level Spell Slot|Cantrip Upgrade|Em Níveis Superiores|Usando um Espaço de Magia de Círculo Superior|Aprimoramento de Truque)/i;
