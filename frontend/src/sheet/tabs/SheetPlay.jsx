import { useEffect, useMemo, useRef, useState } from 'react';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import * as FS from '../../progression/fighting-styles.js';
import { isArmorProficient } from '../../creator/start-data.js';
import { computeResources } from '../../progression/resources.js';
import ResourcesCard from '../../progression/ResourcesCard.jsx';
import GrimoireHint from '../../grimoire/GrimoireHint.jsx';
import { playCantrips } from '../play-spells.js';
import { hpFormula, hitDicePools, hitDiceLeftLabel } from '../hp-logic.js';
import { useHpFeedback, hpState } from '../hp-feedback.js';
import { attachPlaySnap } from '../play-snap.js';
import { activeBites, hpFlags, statusList, statusLabel } from '../condition-rules.js';
import { FhVitalFx, FhHeartMark } from '../FhConditions.jsx';
import { FhStatusPanel, FhStanceHint, FhSpeedBite, attackMark, initMark } from '../FhStatus.jsx';
import FhFeatures from '../FhFeatures.jsx';
import HpTracker, { HpPad } from '../HpTracker.jsx';
import FhTitle from '../FhTitle.jsx';
import FhAdv3 from '../FhAdv3.jsx';
import FhMedal, { FhMedalDefs } from '../FhMedal.jsx';
import FhAttackRow from '../FhAttack.jsx';
import { FhTap } from '../FhChecks.jsx';
import ArtThumb from '../../components/ArtThumb.jsx';
import { itemArt } from '../../art.js';
import { PLAY_H, assignColumns } from '../play-layout.js';
import { SchoolBadge, SpellcastingSummary } from '../../../components/SheetTabs.jsx';
import { WildShapePanel, MasteryNote } from './SheetCompanionsAndNotes.jsx';
import { AbilityHive } from '../belt/BeltHive.jsx';
import { beltAbbr } from '../belt/BeltHex.jsx';
import MyTurnView from '../MyTurnView.jsx';

export const useMediaQuery = (query) => {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, [query]);
  return on;
};

// ===== Play tab =====
// Nota de Maestria da arma (painel Ataques). No celular (`fold`) é uma linha só, "Maestria:
// Raspar ⌄", que abre ao toque: com o texto de cada maestria aberto, os Ataques do Guerreiro
// ocupavam 1,5 tela e as resistências ficavam quase 3 telas abaixo. No desktop fica aberta.

export const SheetPlay = ({ char, lang, update, applyHp, setTempHp, ac, speed, profB, initBonus, passPerc, slots, roll, placed, after = null, onOpenSpells = null }) => {
  // "Próximo d20" (src/sheet/FhAdv3.jsx): vantagem/desvantagem à vista para os medalhões e os
  // botões de Ataque; vale para UMA rolagem e volta para Normal. Normal não manda nada, para
  // a escolha feita no rolador de dados continuar valendo como antes.
  const [stance, setStance] = useState('normal');
  const rollD20 = (cfg) => {
    roll(stance !== 'normal' ? { ...cfg, advMode: stance } : cfg);
    if (stance !== 'normal') setStance('normal');
  };
  const [hpPad, setHpPad] = useState(false);   // teclado de dano/cura aberto pelo coração de PV
  // fechar o teclado (✕ ou Esc) devolve o foco ao coração que o abriu (teclado/leitor de tela)
  const closeHpPad = () => {
    setHpPad(false);
    requestAnimationFrame(() => playRef.current?.querySelector('.fh-hp-heart .fh-medal')?.focus({ preventScroll: true }));
  };
  const wide = useMediaQuery('(min-width: 1024px)');
  const phone = useMediaQuery('(max-width: 599px)');
  // Armadura/escudo sem treino: desvantagem em FOR/DES e sem conjurar magias (2014 e 2024).
  const untrainedArmor = [
    ...(char.armor && !isArmorProficient(char, char.armor) ? [tName('armor', char.armor, lang)] : []),
    ...(char.hasShield && !isArmorProficient(char, 'shield') ? [lang === 'pt' ? 'Escudo' : 'Shield'] : []),
  ];
  // Estilos de Luta / Maestria (src/progression/fighting-styles.js)
  const styles = FS.activeFightingStyles(char);
  const acStyleBonuses = FS.acBonuses(char, styles);
  // Monge e Bárbaro somam pés ao deslocamento: o medalhão diz quanto e de onde.
  const speedBonuses = Utils.speedBonuses(char);
  const unarmed = FS.unarmedStrike(char, styles);
  const styleSummaries = FS.styleSummaries(char, styles);
  const blindsightFt = FS.blindsight(char, styles);
  const reactions = FS.styleReactions(char, styles);

  const hpPct = Math.max(0, Math.min(100, (char.currentHp / Math.max(1, char.maxHp)) * 100));
  // Só design (src/sheet/hp-feedback.js): estado Firme/Ferido/À beira da morte/Caído pela
  // fração do PV e o retorno visual quando ele muda (número que sobe, tremor, clarão).
  const state = hpState(char.currentHp, char.maxHp);
  const hpFx = useHpFeedback(char);
  const fxKind = hpFx ? (hpFx.delta < 0 ? 'hit' : 'heal') : '';
  const fxBeat = hpFx ? (hpFx.id % 2 ? 'a' : 'b') : ''; // alterna o nome da animação para ela recomeçar
  // tipo da batida (src/sheet/hp-feedback.js): golpe grande, cair a 0, PV temporários segurando tudo, voltar de 0
  const fxTone = hpFx?.kind || fxKind;
  const pt = lang === 'pt';
  // Onde os estados ativos pesam (src/sheet/condition-rules.js). Só marcas e lembretes: nenhum
  // número muda e nada é escolhido sozinho no "Próximo d20" (a sugestão é um botão que o jogador toca).
  const isDown = (char.currentHp || 0) <= 0;
  const bites = useMemo(() => activeBites(char, lang),
    [char.conditions, char.exhaustionLevel, isDown, char.maxHp, char.inspiration, char.rulesVersion, char.deathSaves?.fail, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  // o selo "usar" de cada linha de ataque arma o mesmo "Próximo d20" do topo do painel (só ao toque)
  const atkMark = attackMark(bites, lang, stance, setStance);
  const iniMark = initMark(bites, lang);
  const hpF = hpFlags(char);
  const hpTagKey = hpF.dead ? 'dead' : hpF.stable ? 'stable' : hpF.dying ? 'dying' : hpF.near ? 'near' : hpF.bloodied ? 'bloodied' : '';
  const statusNames = statusList(char).filter(x => x.key !== 'inspired').map(x => statusLabel(x, lang));

  // Regra da ficha: proficiência, Artes Marciais do Monge e Estilos de Luta (Utils.attackFor).
  // Armas da ficha + as armas EQUIPADAS do inventário (utils.js: sheetWeapons).
  const playWeapons = Utils.sheetWeapons(char);
  const atks = playWeapons.map(w => Utils.attackFor(char, w));
  // Truques de ataque/resistência prontos (mesmos números da aba Magias) e se a ficha conjura
  const cantrips = useMemo(() => { try { return playCantrips(char, lang); } catch { return []; } },
    [char.spells, placed, char.abilities, char.race, char.speciesChoices, char.items, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasSlotPanel = !!(slots && slots.length > 0);
  const canCast = !!onOpenSpells && !hasSlotPanel && cantrips.length > 0;
  const druidEntry =Utils.classLevel(char, 'druid') >= 2 ? Utils.classEntries(char).find(e => e.id === 'druid') : null;
  const druid = druidEntry ? Utils.classView(char, druidEntry) : null;

  // Painéis da aba: { h: altura estimada, el, col?: coluna pedida no desktop, order? }.
  // No desktop a aba vira duas colunas e assignColumns (src/sheet/play-layout.js) distribui
  // os painéis: só layout. As alturas usam só o que não muda durante o jogo (nenhum painel
  // troca de coluna ao ligar condição ou levar dano).
  const slotLevels = (slots || []).filter(Boolean).length;
  const resourceCount = computeResources(char).length;
  const attackNotes = atks.reduce((n, a) => n + (a.fs.mastery ? 1 : 0) + (a.proficient ? 0 : 1) + (a.monk ? 1 : 0) + a.fs.notes.length, 0);
  const starry = druid?.subclass === 'stars' && druid.level >= (char.rulesVersion === '2024' ? 3 : 2);
  // Traços de classe desta aba (src/sheet/feature-placement.js): defesa e movimento embaixo dos
  // medalhões, os de ataque no painel Ataques e os de recurso embaixo da linha do recurso
  // (os da Forma Selvagem no painel dela; sem esse painel, no de recursos).
  const feats = placed.by;
  const wildFeats = druid ? feats.resources.filter(f => f.anchor === 'wildShape') : [];
  const resFeats = feats.resources.filter(f => !wildFeats.includes(f));
  const featsH = (n) => (n ? PLAY_H.traitHead + PLAY_H.trait * n : 0);
  // CA · PV · Deslocamento · Iniciativa (a fileira de cima do painel Vitalidade)
  const vitalsRow = (
    <>
            <div className="fh-hp-ac">
            <FhMedal shape="shield" value={ac} label={t('ac', lang)}
                sub={acStyleBonuses.length > 0
                  ? <span title={acStyleBonuses.map(x => x.label[lang]).join(', ')}>{FS.partsLabel(acStyleBonuses, lang)}</span>
                  : null}>
                {untrainedArmor.length > 0 && (
                  <div className="fh-medal-warn"
                    title={lang === 'pt'
                      ? 'Sem treino: desvantagem em testes, salvaguardas e ataques de FOR e DES, e você não pode lançar magias.'
                      : "Untrained: Disadvantage on STR and DEX checks, saves and attacks, and you can't cast spells."}>
                    {lang === 'pt' ? 'Sem treino' : 'Untrained'}: {untrainedArmor.join(', ')}
                  </div>
                )}
              </FhMedal>
            </div>
            {/* PV num coração ao lado da CA: o número é o PV atual; embaixo o máximo ("de 43"),
                os temporários numa etiqueta azul à parte e os Dados de Vida livres. O coração é
                um botão: abre o teclado de dano/cura logo abaixo dos medalhões. */}
            <div className={`fh-hp-heart${char.tempHp > 0 ? ' has-temp' : ''}`}>
              <FhMedal shape="heart" className="is-edit" expanded={hpPad}
                title={`${pt ? 'PV máximos' : 'Max HP'}: ${char.maxHp} (${hpFormula(Utils.hitDiceByDie(char), Utils.abilityMod(char, 'con'), char.level)})`}
                ariaLabel={pt
                  ? `Pontos de Vida: ${char.currentHp} de ${char.maxHp}${char.tempHp > 0 ? `, mais ${char.tempHp} temporários` : ''}. ${hpPad ? 'Fechar' : 'Abrir'} o ajuste de dano e cura`
                  : `Hit points: ${char.currentHp} of ${char.maxHp}${char.tempHp > 0 ? `, plus ${char.tempHp} temporary` : ''}. ${hpPad ? 'Close' : 'Open'} the damage and healing pad`}
                value={<span className={`fh-hp-num${fxKind === 'hit' ? ` fh-shake-${fxBeat}${fxTone === 'bighit' || fxTone === 'down' ? ' is-big' : ''}` : ''}`}><span className="hp-current">{char.currentHp}</span></span>}
                label={t('hp', lang)}
                sub={<>
                  {/* estado em palavras (Sangrando, À beira da morte, Caído, Estável, Morto): a cor não fala sozinha */}
                  {hpTagKey && <span className="fh-hp-tag" data-tone={hpTagKey}>{statusLabel({ key: hpTagKey, kind: 'hp' }, lang)}</span>}
                  <span className="fh-hp-max">{pt ? 'de' : 'of'} {char.maxHp}</span>
                  {char.tempHp > 0 && <span className="fh-hp-tempchip">+{char.tempHp} temp</span>}
                  {/* Dados de Vida ainda não gastos, por tipo: "5/8 d6 · 3/4 d8" */}
                  <span className="fh-hp-hd-left" title={t('hitDice', lang)}><span className="fh-hp-hd-k">{pt ? 'DV' : 'HD'}</span>{hitDiceLeftLabel(hitDicePools(Utils.hitDiceByDie(char), char))}</span>
                  <span className="fh-medal-rollmod">{pt ? '± ajustar' : '± adjust'}</span>
                </>}
                onClick={() => setHpPad(v => !v)} />
              {/* selo do estado que manda no canto do coração; rachadura a 0 PV (src/sheet/FhConditions.jsx) */}
              <FhHeartMark char={char} />
              {hpFx && (
                <span key={hpFx.id} className={`fh-float ${fxKind} is-${fxTone}`} aria-hidden="true">
                  {fxTone === 'absorb' && <FhStatusGlyph k="temp" size={20} />}{hpFx.delta < 0 ? '−' : '+'}{Math.abs(hpFx.delta)}
                </span>
              )}
            </div>
            <FhMedal shape="speed" value={Utils.speedLabel(speed, lang).split(' ')[0]}
              label={t('speed', lang)}
              sub={speedBonuses.length > 0
                ? <span title={speedBonuses.map(x => x.name[lang] || x.name.pt).join(', ')}>{Utils.speedBonusText(speedBonuses, lang)}</span>
                : (lang === 'pt' ? 'metros' : 'feet')}>
              {/* o número não muda: a etiqueta só lembra o que o estado faz ("→ 0 · Agarrado") */}
              <FhSpeedBite bites={bites} lang={lang} />
            </FhMedal>
            <FhMedal shape="d20" value={Utils.fmtMod(initBonus)} label={t('initiative', lang)}
              sub={<>
                <span className="fh-medal-rollmod">{lang === 'pt' ? 'rolar' : 'roll'} {Utils.fmtMod(initBonus)}</span>
                {iniMark && <span className={`fh-medal-bite is-${iniMark.kind}`}><b>{iniMark.text}</b>{iniMark.src && <span>{iniMark.src}</span>}</span>}
              </>}
              ariaLabel={(lang === 'pt' ? `Iniciativa: rolar ${Utils.fmtMod(initBonus)}` : `Initiative: roll ${Utils.fmtMod(initBonus)}`) + (iniMark ? `. ${iniMark.aria}` : '')}
              onClick={() => rollD20({ die: 20, mod: initBonus, label: t('initRoll', lang), isCheck: true })} />
    </>
  );
  const panels = [
    { col: 'a', h: PLAY_H.hp + featsH(feats.defense.length) + featsH(feats.movement.length), el: (
        <section key="hp" className={`hp-tracker fh-panel fh-hp${fxKind === 'heal' ? ` fh-healed-${fxBeat}` : ''}`} data-state={state}
          aria-label={`${pt ? 'Vitalidade' : 'Vitality'}${statusNames.length ? `: ${statusNames.join(', ')}` : ''}`}>
          {/* moldura e marca d'água do estado que manda + clarão de aplicar/limpar: camada irmã,
              aria-hidden e sem toque (src/sheet/FhConditions.jsx) */}
          <FhVitalFx char={char} />
          <FhTitle act={<FhAdv3 value={stance} onChange={setStance} lang={lang} />}>{pt ? 'Vitalidade' : 'Vitality'}</FhTitle>
          <FhStanceHint bites={bites} kind="checks" stance={stance} onStance={setStance} lang={lang} rulesVersion={char.rulesVersion} />
          <div className="fh-hp-row">
            {/* Fileira de cima: CA, PV, Deslocamento e Iniciativa — o que se olha a cada turno
                (no celular é o que cabe na primeira tela). No DOM na mesma ordem do desenho:
                é a ordem do teclado e do leitor de tela. */}
            {vitalsRow}
            {/* Fileira de baixo: Percepção, Investigação e Intuição (o número é o valor passivo;
                tocar rola o teste da perícia, d20 + bônus) e o Bônus de Proficiência. */}
            {[
              { id: 'perception', shape: 'eye', name: lang === 'pt' ? 'Percepção' : 'Perception', passive: passPerc, hint: <GrimoireHint id="valor-passivo" lang={lang} /> },
              { id: 'investigation', shape: 'lens', name: lang === 'pt' ? 'Investigação' : 'Investigation', passive: 10 + Utils.skillBonus(char, 'investigation') },
              { id: 'insight', shape: 'flame', name: lang === 'pt' ? 'Intuição' : 'Insight', passive: 10 + Utils.skillBonus(char, 'insight') },
            ].map(s => {
              const bonus = Utils.skillBonus(char, s.id);
              return (
                <FhMedal key={s.id} shape={s.shape} value={s.passive} label={s.name} hint={s.hint}
                  ariaLabel={lang === 'pt'
                    ? `${s.name}: passiva ${s.passive}. Rolar teste ${Utils.fmtMod(bonus)}`
                    : `${s.name}: passive ${s.passive}. Roll check ${Utils.fmtMod(bonus)}`}
                  sub={<>
                    <span className="fh-medal-passive">{lang === 'pt' ? 'passiva' : 'passive'}</span>
                    <span className="fh-medal-rollmod">{lang === 'pt' ? 'rolar' : 'roll'} {Utils.fmtMod(bonus)}</span>
                  </>}
                  onClick={() => rollD20({ die: 20, mod: bonus, label: lang === 'pt' ? `Teste de ${s.name}` : `${s.name} check`, isCheck: true })} />
              );
            })}
            <FhMedal shape="star" value={Utils.fmtMod(profB)} label={lang === 'pt' ? 'Proficiência' : 'Proficiency'}
              sub={lang === 'pt' ? 'bônus' : 'bonus'} />
          </div>
          {hpPad && (
            <HpPad lang={lang} max={Math.max(1, char.maxHp || 1)}
              onDamage={(n) => applyHp(-n)} onHeal={(n) => applyHp(n)} onTemp={setTempHp}
              onClose={closeHpPad} />
          )}
          {/* Barras e controles condensados (src/sheet/HpTracker.jsx): PV temporários, PV em 10
              fatias, Exaustão, Testes contra a Morte, arrastar para dano/cura e Dados de Vida */}
          <HpTracker char={char} lang={lang} update={update} applyHp={applyHp} roll={roll}
            byDie={Utils.hitDiceByDie(char)} conMod={Utils.abilityMod(char, 'con')} conScore={Utils.abilityWithRace(char, 'con')} hpPct={hpPct}
            hints={{
              temp: <GrimoireHint id="pv-temporarios" lang={lang} />,
              death: <GrimoireHint id="testes-contra-a-morte" lang={lang} />,
              exhaustion: <GrimoireHint id="exaustao" lang={lang} />,
              hitDice: <GrimoireHint id="dados-de-vida" lang={lang} />,
            }}
            /* Condições e efeitos (src/sheet/FhStatus.jsx): abaixo das barras, para ligar ou
               desligar um estado não empurrar os controles de arrastar */
            statusSlot={<FhStatusPanel char={char} lang={lang} update={update} />} />

          <FhFeatures items={feats.defense} multi={placed.multi} lang={lang} place="defense" />
          <FhFeatures items={feats.movement} multi={placed.multi} lang={lang} place="movement" />
        </section>
    ) },
    { col: 'a', h: PLAY_H.abilities, el: (
        /* Atributos num relance: cada hexágono rola o teste (metade esquerda) e a
           resistência (metade direita); a legenda sob os números diz qual é qual. O seletor
           "Próximo d20" é o mesmo da Vitalidade e dos Ataques (uma postura só para a aba). */
        <section key="abilities" className="fh-panel fh-abil-panel">
          <FhTitle act={<FhAdv3 value={stance} onChange={setStance} lang={lang} />}
            sub={<span><FhTap lang={lang} />{pt ? ' na metade: teste à esquerda, resistência à direita' : ' a half: check on the left, save on the right'}</span>}>{t('tabStats', lang)}</FhTitle>
          <FhStanceHint bites={bites} kind="checks" stance={stance} onStance={setStance} lang={lang} rulesVersion={char.rulesVersion} />
          <AbilityHive char={char} lang={lang} roll={rollD20} stance={stance} onStance={setStance} bites={bites} />
        </section>
    ) },
    slots && slots.length > 0 && {
      h: PLAY_H.slots + PLAY_H.slotRow * slotLevels,
      el: (
        /* Mesmo painel da aba Magias: CD, ataque de magia e espaços por círculo */
        <SpellcastingSummary key="slots" char={char} lang={lang} update={update} slots={slots} onOpenSpells={onOpenSpells} />
      ),
    },
    { h: (resourceCount || resFeats.length) ? PLAY_H.resources + PLAY_H.resourceRow * resourceCount + PLAY_H.trait * resFeats.length : 0, el: (
        /* Recursos de classe com usos (Fúria, Canalizar Divindade…), cada um com os traços que o
            usam embaixo. O componente é compartilhado com o editor do mestre: o painel é só um
            embrulho daqui (vazio quando não há recursos nem traços; o CSS esconde). */
        <section key="resources" className="fh-panel fh-res">
          <ResourcesCard char={char} lang={lang} update={update} features={resFeats} multiclass={placed.multi} />
        </section>
    ) },
    { col: 'b', order: 1, h: PLAY_H.attacks + PLAY_H.attackRow * (atks.length + 1) + PLAY_H.attackNote * attackNotes + featsH(feats.attacks.length), el: (
        /* Ataques: uma linha por arma e o Golpe Desarmado (src/sheet/FhAttack.jsx). Os botões
            "Ataque +X" e "Dano NdX+Y" fazem as mesmas rolagens (rótulos e valores) de antes. */
        <section key="attacks" className="fh-panel fh-atk-panel">
          <FhTitle act={<FhAdv3 value={stance} onChange={setStance} lang={lang} />}>{lang === 'pt' ? 'Ataques' : 'Attacks'}</FhTitle>
          <FhStanceHint bites={bites} kind="attacks" stance={stance} onStance={setStance} lang={lang} rulesVersion={char.rulesVersion} noActions />
          <div className="fh-atks">
            {playWeapons.map((w, i) => {
              const a = atks[i];
              const fs = a.fs;
              const atk = a.bonus;
              const dmgMod = a.dmgMod;
              const bonusText = FS.partsLabel([...fs.attackParts.map(p => ({ ...p, label: { pt: `${p.label.pt} (ataque)`, en: `${p.label.en} (attack)` } })), ...fs.damageParts], lang);
              return (
                <FhAttackRow key={i} lang={lang} mark={atkMark}
                  art={<ArtThumb src={itemArt(w)} emoji="⚔️" size={40} lang={lang} />}
                  name={w.name}
                  sub={a.dmgType ? Utils.damageLabel(a.dmgType, lang) : null}
                  atkText={Utils.fmtMod(atk)}
                  onAttack={() => rollD20({ die: 20, mod: atk, label: w.name + ' · ' + t('attackRoll', lang), isAttack: true })}
                  dmgText={a.damage}
                  onDamage={() => {
                    const m = String(a.dice || '').match(/(\d+)d(\d+)/);
                    if (m) roll({ die: +m[2], count: +m[1], mod: dmgMod, label: w.name + ' · ' + t('damageRoll', lang) });
                  }}>
                  {a.monk && <div className="fh-atk-note is-gold">{lang === 'pt' ? 'Artes Marciais (arma de monge)' : 'Martial Arts (Monk weapon)'}</div>}
                  {!a.proficient && <div className="fh-atk-note is-warn">{lang === 'pt' ? 'Sem proficiência: não soma o bônus de proficiência' : 'Not proficient: no proficiency bonus'}</div>}
                  {bonusText && <div className="fh-atk-note is-gold">{bonusText}</div>}
                  {fs.mastery && <MasteryNote mastery={fs.mastery} lang={lang} fold={phone} />}
                  {fs.notes.map((n, k) => <div key={k} className="fh-atk-note">{n[lang]}</div>)}
                </FhAttackRow>
              );
            })}
            {(() => {
              // Golpe Desarmado: todo mundo é proficiente (1 + FOR de concussão). Monge usa o dado
              // de Artes Marciais com DES ou FOR; o Estilo de Luta Desarmado troca o 1 por um dado.
              const u = Utils.unarmedStrike(char);
              const name = u.name[lang];
              const m = String(u.dice || '').match(/(\d+)d(\d+)/);
              // com dado, a fórmula vai no botão de dano; sem dado (dano fixo), fica na linha
              const sub = m ? Utils.damageLabel(u.dmgType, lang) : `${u.damage} ${Utils.damageLabel(u.dmgType, lang)}`;
              return (
                <FhAttackRow lang={lang} mark={atkMark}
                  art={<ArtThumb src={null} emoji="👊" size={40} lang={lang} title={name} />}
                  name={name}
                  sub={sub}
                  atkText={Utils.fmtMod(u.bonus)}
                  onAttack={() => rollD20({ die: 20, mod: u.bonus, label: name + ' · ' + t('attackRoll', lang), isAttack: true })}
                  dmgText={u.damage}
                  onDamage={m ? () => roll({ die: +m[2], count: +m[1], mod: u.dmgMod, label: name + ' · ' + t('damageRoll', lang) }) : null}>
                  {u.monk && <div className="fh-atk-note is-gold">{lang === 'pt' ? 'Artes Marciais' : 'Martial Arts'}</div>}
                  {unarmed && (
                    <div className="fh-atk-note is-gold">
                      {unarmed.name[lang]}: {lang === 'pt' ? `${unarmed.dieFree} com as mãos livres` : `${unarmed.dieFree} with free hands`}
                      {unarmed.grapple ? (lang === 'pt' ? `; ${unarmed.grapple} no agarrado` : `; ${unarmed.grapple} to grappled`) : ''}
                    </div>
                  )}
                </FhAttackRow>
              );
            })()}
          </div>
          {/* Truques de ataque (src/sheet/play-spells.js): quem conjura ataca daqui, sem trocar
              de aba. Ataque mágico rola o d20 (com o "Próximo d20" do painel); truque de
              resistência mostra a CD que o alvo precisa bater. Magias de círculo gastam espaço:
              ficam na aba Magias, a um toque. */}
          {(cantrips.length > 0 || canCast) && (
            <div className="fh-atk-spells">
              {cantrips.length > 0 && (
                <>
                  <div className="fh-atk-group" role="heading" aria-level={4}>{pt ? 'Truques de ataque' : 'Attack cantrips'}</div>
                  <div className="fh-atks">
                    {cantrips.map(c => {
                      const saveName = c.saveAb ? beltAbbr(c.saveAb, lang) : '';
                      return (
                        <FhAttackRow key={c.id} lang={lang} mark={c.atk != null ? atkMark : null}
                          art={<SchoolBadge school={c.school} lang={lang} size={40} />}
                          name={c.name}
                          sub={[pt ? 'Truque' : 'Cantrip', c.src].filter(Boolean).join(' · ')}
                          atkText={c.atk != null ? Utils.fmtMod(c.atk) : null}
                          onAttack={c.atk != null ? () => rollD20({ die: 20, mod: c.atk, label: c.name + ' · ' + t('attackRoll', lang), isAttack: true }) : null}
                          chip={c.atk == null ? (
                            <span className="fh-atk-chip" title={pt ? 'O alvo faz um teste de resistência contra a sua CD de magia' : 'The target makes a saving throw against your spell save DC'}>
                              <span className="fh-atk-btn-k">{pt ? 'Alvo resiste' : 'Target saves'}</span>
                              <span className="fh-atk-btn-v">{pt ? 'CD' : 'DC'} {c.dc}{saveName ? ` ${saveName}` : ''}</span>
                            </span>
                          ) : null} />
                      );
                    })}
                  </div>
                </>
              )}
              {/* com o painel Conjuração na aba, o atalho para a aba Magias fica no pé dele */}
              {onOpenSpells && !hasSlotPanel && (
                <button type="button" className="fh-atk-more" onClick={onOpenSpells}>
                  {pt ? 'Todas as magias e espaços' : 'All spells and slots'} <span aria-hidden="true">›</span>
                </button>
              )}
            </div>
          )}
          <FhFeatures items={feats.attacks} multi={placed.multi} lang={lang} place="attacks" />
        </section>
    ) },
    styleSummaries.length > 0 && {
      h: PLAY_H.styles + PLAY_H.style * styleSummaries.length + PLAY_H.styleExtra * (reactions.length + (blindsightFt > 0 ? 1 : 0)),
      el: (
        /* Estilos de Luta ativos: resumo, sentidos (Luta às Cegas) e lembretes de reação */
        <section key="styles" className="fh-panel">
          <FhTitle>{lang === 'pt' ? 'Estilos de Luta' : 'Fighting Styles'}</FhTitle>
          <div className="fh-traits">
            {styleSummaries.map(s => (
              <div key={s.id} className="fh-trait">
                <div className="fh-trait-name">{s.name[lang]}</div>
                {s.summary[lang] && <p className="fh-trait-text">{s.summary[lang]}</p>}
              </div>
            ))}
          </div>
          {blindsightFt > 0 && (
            <div className="fh-style-sense">
              <strong>{lang === 'pt' ? 'Sentidos' : 'Senses'}:</strong> {lang === 'pt' ? `Percepção às Cegas ${Math.round(blindsightFt * 0.3)} m` : `Blindsight ${blindsightFt} ft`}
            </div>
          )}
          {reactions.map(r => (
            <div key={r.id} className="fh-style-react">
              <strong>{lang === 'pt' ? 'Reação' : 'Reaction'} · {r.name[lang]}:</strong> {r.text[lang]}
            </div>
          ))}
        </section>
      ),
    },
    druid && {
      h: PLAY_H.wild + (starry ? PLAY_H.starry : 0) + featsH(wildFeats.length),
      el: (
        /* Wild Shape — Druid only */
        <WildShapePanel key="wild" char={char} druid={druid} lang={lang} update={update} features={wildFeats} multi={placed.multi} />
      ),
    },
    // Progressão (linha do tempo dobrada + "Subir de nível") por último: é história da
    // ficha, não ação de mesa. Antes ficava no meio e empurrava os Ataques 4–5 telas abaixo.
    after && {
      order: 9, h: PLAY_H.progression + PLAY_H.progressionLevel * Math.min(20, (char.level || 1) + 1),
      el: <div key="progression" className="fh-after no-print">{after}</div>,
    },
  ].filter(Boolean);
  // Ordem do celular (e do teclado): Vitalidade, Ataques, Atributos, Conjuração, Recursos,
  // Estilos de Luta, Forma Selvagem, Progressão. A lista acima é escrita por assunto; `order`
  // puxa os Ataques para logo depois da Vitalidade e deixa a Progressão no fim.
  panels.forEach((p, i) => { p.i = i; });
  panels.sort((x, y) => (x.order ?? (x.i === 0 ? 0 : 2)) - (y.order ?? (y.i === 0 ? 0 : 2)) || x.i - y.i);
  // Desktop: duas colunas, Vitalidade e Atributos à esquerda e Ataques no topo da direita
  // (src/sheet/play-layout.js: assignColumns). Celular: uma coluna, na ordem da lista.
  const cols = wide ? assignColumns(panels) : panels.map(() => 'a');
  // Deslize vertical no celular encaixa no painel mais próximo (src/sheet/play-snap.js)
  const playRef = useRef(null);
  useEffect(() => attachPlaySnap(() => [...(playRef.current?.querySelectorAll('.fh-play-col > *') || [])], { area: () => playRef.current }), []);

  return (
    <>
      {/* Clarão na borda da tela ao levar dano / ser curado: camada decorativa fixa, fora
          dos painéis (nada de transform/filter em contêiner com botão que abre Modal). */}
      {hpFx && <div key={hpFx.id} className={`fh-fx fh-fx-${fxKind} is-${fxTone}`} aria-hidden="true" />}
      <FhMedalDefs />

      {/* Duas colunas a partir de 1024px (ficha.css: .fh-play). Abaixo disso, ou com o
          rolador lateral aberto e pouca largura, viram uma coluna só, na mesma ordem. */}
      <MyTurnView char={char} lang={lang} atks={atks} playWeapons={playWeapons} cantrips={cantrips} rollD20={rollD20} onOpenSpells={onOpenSpells} />
      <div className="fh-play" ref={playRef} data-stance={stance}>
        <div className="fh-play-col">{panels.filter((p, i) => cols[i] === 'a').map(p => p.el)}</div>
        <div className="fh-play-col">{panels.filter((p, i) => cols[i] === 'b').map(p => p.el)}</div>
      </div>
    </>
  );
};
