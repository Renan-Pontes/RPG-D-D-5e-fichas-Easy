import { useContext, useMemo, useState } from 'react';
import SRD from '../../../data/srd.js';
import Utils from '../../../utils.js';
import { t, tName } from '../../../data/i18n.js';
import Icon from '../../../components/Icons.jsx';
import LanguagePicker, { chosenLanguages } from '../../../components/LanguagePicker.jsx';
import { Modal } from '../../../components/Shared.jsx';
import { RespecContext } from '../../progression/respec.js';
import { TOOLS, toolName, classStart } from '../../creator/start-data.js';
import { ACTION_SKILL_GROUPS, computeActionGroupData, hasKeenSenses } from '../../combat/monster-action-skills.js';
import { trainingLines } from '../sheet-text.js';
import FhTitle from '../FhTitle.jsx';
import FhAdv3 from '../FhAdv3.jsx';
import { FhHex, FhSkillRow, FhProfLegend, FhTapToRoll } from '../FhChecks.jsx';
import { FhStanceHint, halfMark } from '../FhStatus.jsx';
import { activeBites } from '../condition-rules.js';
import FhFeatures from '../FhFeatures.jsx';

export const LanguagesField = ({ char, lang, update }) => {
  const pt = lang === 'pt';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  const chosen = chosenLanguages(char);
  const count = Utils.languageChoiceCount(char);
  const missing = Math.max(0, count - chosen.length);
  const edit = () => { setDraft(chosen); setOpen(true); };
  const save = () => {
    const same = draft.length === chosen.length && draft.every(l => chosen.includes(l));
    // Fixos já salvos ficam onde estavam: o registro do mestre mostra só o que mudou.
    if (!same) update({ languages: Utils.withChosenLanguages(char, draft) });
    setOpen(false);
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ margin: 0 }}>{t('languages', lang)}</label>
        <button className="btn btn-sm btn-ghost lang-edit-btn" onClick={edit}>
          <Icon name="edit" size={12}/> {pt ? 'Editar idiomas' : 'Edit languages'}
        </button>
      </div>
      <div className="lang-chips">
        {Utils.languagesFor(char).map(l => <span key={l} className="lang-chip">{Utils.languageLabel(l, lang)}</span>)}
        {missing > 0 && (
          <button type="button" className="lang-chip pending" onClick={edit}>
            + {missing} {pt ? (missing > 1 ? 'idiomas a escolher' : 'idioma a escolher') : (missing > 1 ? 'languages to choose' : 'language to choose')}
          </button>
        )}
      </div>
      {open && (
        <Modal onClose={() => setOpen(false)} title={pt ? 'Editar idiomas' : 'Edit languages'}>
          <LanguagePicker char={char} lang={lang} chosen={draft} onChange={setDraft} free />
          {char.inCampaign && (
            <p className="text-xs muted" style={{ margin: '12px 0 0' }}>
              {pt ? 'Em campanha: o mestre vê no registro de edições o idioma que entrou e o que saiu.'
                : 'In a campaign: the DM sees in the edit log which language was added and which was removed.'}
            </p>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>{pt ? 'Cancelar' : 'Cancel'}</button>
            <button className="btn btn-primary" onClick={save}>{pt ? 'Salvar' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Selos de atributo (abas Jogar e Atributos): o mesmo desenho; cada aba mantém o seu
// rótulo de rolagem ("<Atributo> Teste de habilidade" na Jogar, "<Atributo>" aqui).
// O nome acessível começa pela sigla visível no selo (quem usa voz diz "FOR").
// data-fab-pass: no celular o botão de dados passa por cima dos selos sem saltar (DiceRoller);
// no desktop (duas colunas) ele desvia deles como de qualquer botão.
export const AbilitySeals = ({ char, lang, roll, rollLabel }) => (
  <div className="fh-abil" data-fab-pass="">
    {SRD.ABILITIES.map(k => {
      const score = Utils.abilityWithRace(char, k);
      const mod = Utils.abilityMod(char, k);
      return (
        <FhHex key={k} abbr={t(k + 'Sh', lang)} mod={Utils.fmtMod(mod)} score={score}
          label={lang === 'pt'
            ? `${t(k + 'Sh', lang)}, ${t(k, lang)} ${Utils.fmtMod(mod)}, valor ${score}. Rolar teste`
            : `${t(k + 'Sh', lang)}, ${t(k, lang)} ${Utils.fmtMod(mod)}, score ${score}. Roll check`}
          onClick={() => roll({ die: 20, mod, label: rollLabel(k) })} />
      );
    })}
  </div>
);


export const TOOL_ABILITY_MAP = {
  thievesTools: 'dex',
  alchemistsSupplies: 'int',
  brewersSupplies: 'con',
  calligraphersSupplies: 'dex',
  carpentersTools: 'str',
  cartographersTools: 'wis',
  cobblersTools: 'dex',
  cooksUtensils: 'wis',
  glassblowersTools: 'dex',
  jewelersTools: 'dex',
  leatherworkersTools: 'dex',
  masonsTools: 'str',
  paintersSupplies: 'dex',
  pottersTools: 'dex',
  smithsTools: 'str',
  tinkersTools: 'dex',
  weaversTools: 'dex',
  woodcarversTools: 'dex',
  disguiseKit: 'cha',
  forgeryKit: 'dex',
  herbalismKit: 'wis',
  navigatorsTools: 'wis',
  poisonersKit: 'int',
  bagpipes: 'cha', drum: 'cha', dulcimer: 'cha', flute: 'cha', horn: 'cha',
  lute: 'cha', lyre: 'cha', panFlute: 'cha', shawm: 'cha', viol: 'cha',
  diceSet: 'wis', dragonchessSet: 'int', playingCardSet: 'cha', threeDragonAnteSet: 'cha',
  vehiclesLand: 'dex', vehiclesWater: 'dex',
};

export const SKILL_GROUPS = [
  {
    id: 'search',
    name: { pt: 'Ação: Busca (Search)', en: 'Battle Action: Search' },
    icon: '🔍',
    skillIds: ['survival', 'insight', 'medicine', 'perception'],
  },
  {
    id: 'hide',
    name: { pt: 'Ação: Furtividade & Evasão (Hide)', en: 'Battle Action: Hide & Agility' },
    icon: '👣',
    skillIds: ['acrobatics', 'athletics', 'sleightOfHand', 'stealth'],
  },
  {
    id: 'influence',
    name: { pt: 'Ação: Influência (Influence)', en: 'Battle Action: Influence' },
    icon: '💬',
    skillIds: ['animalHandling', 'deception', 'intimidation', 'performance', 'persuasion'],
  },
  {
    id: 'study',
    name: { pt: 'Ação: Estudo (Study)', en: 'Battle Action: Study' },
    icon: '📚',
    skillIds: ['arcana', 'history', 'investigation', 'nature', 'religion'],
  },
];

// Ícone (traço dourado, sem emoji) de cada ação das perícias e das ferramentas.
export const SKILL_GROUP_ICON = { search: 'search', study: 'book', influence: 'users', hide: 'eye-off', tools: 'toolbox' };
const SKILLS_FOLD_KEY = 'dnd5e-forge:skills-folded:v1';
export const readSkillFolds = () => {
  try { const v = JSON.parse(localStorage.getItem(SKILLS_FOLD_KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
};

// Aba Perícias no visual da ficha (FhSkillRow, src/sheet/FhChecks.jsx): as 18 perícias
// agrupadas pelas 4 ações de 2024 (Busca, Estudo, Influência, Furtividade) e as ferramentas.
// - Todas as perícias aparecem ao abrir a aba: cada linha rola o PRÓPRIO bônus num toque
//   (o antigo botão de dado do cabeçalho rolava o número "consolidado" do grupo, menor ou
//   maior que o da perícia pedida: Atletismo saía com o bônus de Furtividade).
// - O cabeçalho de cada ação é um <button aria-expanded> que dobra o grupo; dobrado, o
//   grupo continua mostrando as perícias treinadas. A dobra fica lembrada no aparelho.
// - Em campanha (ficha da conta) o servidor trava o treino: o losango fica só de leitura.
export const SheetSkills = ({ char, lang, update, passPerc, roll, placed, stance = null, onStance = null }) => {
  const pt = lang === 'pt';
  const adv3 = stance && onStance ? <FhAdv3 value={stance} onChange={onStance} lang={lang} /> : null;
  // Armadura com desvantagem em Furtividade (acolchoada, cota de malha, placas…): a linha da
  // Furtividade rola com desvantagem e mostra ▼ com o motivo (antes rolava um d20 simples).
  const stealthArmor = (() => { try { const a = Utils.wornArmor(char); return a?.stealth === 'disadv' ? a : null; } catch { return null; } })();
  const stealthArmorName = stealthArmor ? (stealthArmor.item ? (stealthArmor.name || (pt ? 'armadura' : 'armor')) : tName('armor', stealthArmor.id, lang)) : '';
  const profText = (level) => level === 2 ? (pt ? 'Especialista' : 'Expertise') : level ? (pt ? 'Treinado' : 'Proficient') : (pt ? 'Sem treino' : 'Not proficient');
  const locked = !!char.inCampaign && typeof char.id === 'number';
  const lockedTitle = pt ? 'Em campanha o treino só muda pelo mestre ou pela subida de nível' : 'In a campaign, training changes only via the DM or leveling up';

  // Dobra de cada ação (padrão: tudo aberto, as 18 perícias à vista)
  const [collapsed, setCollapsed] = useState(() => ({
    search: false, hide: false, influence: false, study: false, tools: false,
    ...readSkillFolds(),
  }));

  const toggleGroup = (groupId) => {
    setCollapsed(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try { localStorage.setItem(SKILLS_FOLD_KEY, JSON.stringify(next)); } catch { /* sem armazenamento: vale só nesta visita */ }
      return next;
    });
  };

  const explicitSkillMap = useMemo(() => {
    const map = new Map();
    for (const s of SRD.SKILLS) {
      const bonus = Utils.skillBonus(char, s.id);
      map.set(s.id.toLowerCase().replace(/[\s_\-]/g, ''), bonus);
    }
    return map;
  }, [char]);

  const keen = useMemo(() => hasKeenSenses(char), [char]);

  // Os grupos (e quem pertence a cada um) vêm da mesma tabela do bloco de monstro; o nome
  // é o da ficha (tName) e a ordem dentro do grupo é alfabética no idioma da tela.
  const actionSkillData = useMemo(() => {
    return ACTION_SKILL_GROUPS.map((grp) => {
      const data = computeActionGroupData(grp, char.abilities, explicitSkillMap, lang, { hasKeen: keen });
      const skills = data.skills
        .map(sk => ({ ...sk, name: tName('skill', sk.id, lang) || sk.name }))
        .sort((a, b) => a.name.localeCompare(b.name, pt ? 'pt' : 'en'));
      return { ...grp, ...data, skills };
    });
  }, [char.abilities, explicitSkillMap, lang, keen, pt]);

  // Vantagem/desvantagem própria da perícia: Sentidos Aguçados (vantagem) e a armadura
  // (desvantagem em Furtividade). As duas juntas se anulam.
  const advOf = (sk) => {
    const armorDis = sk.id === 'stealth' && !!stealthArmor;
    if (armorDis) return sk.defaultAdv === 'adv' ? null : 'dis';
    return sk.defaultAdv || null;
  };
  const rollSkill = (sk) => roll({
    die: 20,
    mod: sk.bonus,
    label: pt ? `Teste de ${sk.name}` : `${sk.name} check`,
    isCheck: true,
    checkKind: 'skill',
    ...(advOf(sk) ? { adv: advOf(sk), advMode: advOf(sk) } : {}),
  });

  const toggleProf = (sId) => {
    const isExpert = Utils.hasExpertise(char, sId);
    const isProf = Utils.hasSkillProf(char, sId);
    if (isExpert) {
      update({
        skillExpertise: (char.skillExpertise || []).filter(x => x !== sId),
        skillProfs: (char.skillProfs || []).filter(x => x !== sId),
      });
    } else if (isProf) {
      update({ skillExpertise: [...(char.skillExpertise || []), sId] });
    } else {
      update({ skillProfs: [...(char.skillProfs || []), sId] });
    }
  };

  // 5º grupo: Usar Ferramenta. Só as ferramentas em que o personagem é treinado.
  const toolItems = useMemo(() => {
    const profs = new Set([
      ...(char.toolProfs || []),
      ...(char.creation?.toolChoices?.background || []),
      ...(char.creation?.toolChoices?.class || []),
    ]);
    const pb = Utils.profBonus(char);
    const hasToolExp = (char.className === 'artificer' && (char.level || 1) >= 6) ||
      (char.features || []).some(f => /toolExpertise/i.test(f.id || f.name));

    const list = [];
    profs.forEach(tId => {
      const stat = TOOL_ABILITY_MAP[tId] || 'dex';
      const abilMod = Utils.abilityMod(char, stat);
      const bonus = abilMod + pb * (hasToolExp ? 2 : 1);
      const bonusStr = bonus >= 0 ? `+${bonus}` : `${bonus}`;
      list.push({ id: tId, name: toolName(tId, lang), stat, bonus, bonusStr, passive: 10 + bonus, isTrained: true, level: hasToolExp ? 2 : 1 });
    });
    if (!list.length) {
      const stat = 'dex';
      const abilMod = Utils.abilityMod(char, stat);
      const bonusStr = abilMod >= 0 ? `+${abilMod}` : `${abilMod}`;
      list.push({ id: 'improvised', name: pt ? 'Ferramentas improvisadas' : 'Improvised tools', stat, bonus: abilMod, bonusStr, passive: 10 + abilMod, isTrained: false, level: 0 });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, pt ? 'pt' : 'en'));
  }, [char, lang, pt]);

  const skillRow = (sk) => {
    const isExpert = Utils.hasExpertise(char, sk.id);
    const isProf = Utils.hasSkillProf(char, sk.id);
    const level = isExpert ? 2 : isProf ? 1 : 0;
    const adv = advOf(sk);
    const advWhy = adv === 'dis'
      ? (pt ? `Desvantagem: armadura (${stealthArmorName})` : `Disadvantage: armor (${stealthArmorName})`)
      : null;
    const advSay = adv === 'adv' ? (pt ? ' com vantagem' : ' with advantage') : adv === 'dis' ? (pt ? ` com desvantagem pela armadura (${stealthArmorName})` : ` with disadvantage from armor (${stealthArmorName})`) : '';
    return (
      <FhSkillRow key={sk.id} lang={lang}
        name={sk.name} abbr={t(sk.abil + 'Sh', lang)} bonus={sk.bonusStr} passive={sk.passive}
        level={level} locked={locked} adv={adv} advTitle={advWhy}
        profTitle={locked ? `${profText(level)}. ${lockedTitle}` : profText(level)}
        profLabel={`${sk.name}: ${profText(level)}`}
        rollLabel={pt
          ? `${sk.name} (${t(sk.abil + 'Sh', lang)}): rolar teste ${sk.bonusStr}${advSay}. Passiva ${sk.passive}`
          : `${sk.name} (${t(sk.abil + 'Sh', lang)}): roll check ${sk.bonusStr}${advSay}. Passive ${sk.passive}`}
        onToggle={() => toggleProf(sk.id)}
        onRoll={() => rollSkill(sk)} />
    );
  };

  // ferramenta não tem valor passivo: a linha mostra só o bônus do teste
  const toolRow = (tool) => (
    <FhSkillRow key={tool.id} lang={lang}
      name={tool.name} abbr={t(tool.stat + 'Sh', lang)} bonus={tool.bonusStr} passive={null}
      level={tool.level}
      profTitle={profText(tool.level)}
      rollLabel={pt
        ? `${tool.name} (${t(tool.stat + 'Sh', lang)}): rolar teste ${tool.bonusStr}`
        : `${tool.name} (${t(tool.stat + 'Sh', lang)}): roll check ${tool.bonusStr}`}
      onRoll={() => roll({ die: 20, mod: tool.bonus, label: pt ? `Teste de ${tool.name}` : `${tool.name} check`, isCheck: true, checkKind: 'tool' })} />
  );

  // Cabeçalho de um grupo: botão de verdade (Enter/Espaço dobram), sem rolagem própria.
  const groupHead = (key, title, total, trained) => {
    const isFolded = !!collapsed[key];
    return (
      <button type="button" className="fh-skg-head" onClick={() => toggleGroup(key)}
        aria-expanded={!isFolded} aria-controls={`fh-skill-group-${key}`}>
        <span className="fh-skg-icon" aria-hidden="true"><Icon name={SKILL_GROUP_ICON[key] || 'target'} size={16} /></span>
        <span className="fh-skg-title">{title}</span>
        <span className="fh-skg-count">
          {trained > 0
            ? (pt ? `${trained} de ${total} treinada${trained > 1 ? 's' : ''}` : `${trained} of ${total} proficient`)
            : (pt ? `${total} ${key === 'tools' ? (total > 1 ? 'ferramentas' : 'ferramenta') : 'perícias'}` : `${total} ${key === 'tools' ? (total > 1 ? 'tools' : 'tool') : 'skills'}`)}
        </span>
        <span className="fh-skill-group-chevron fh-skg-chev" aria-hidden="true"><Icon name={isFolded ? 'chevron-down' : 'chevron-up'} size={16} /></span>
      </button>
    );
  };

  const trainedTools = toolItems.filter(tl => tl.isTrained);

  return (
    <div className="fh-scope-content fh-scope-skills">
      <section className="fh-panel fh-skills-panel">
        <FhTitle act={adv3} sub={<span><FhTapToRoll lang={lang} /></span>}>{t('skills', lang)}</FhTitle>

        {/* As 4 ações (Busca, Estudo, Influência, Furtividade), de cima para baixo */}
        <div className="fh-skill-categories-grid" data-fab-pass="">
          {actionSkillData.map(grp => {
            const isFolded = !!collapsed[grp.key];
            const trainedSkills = (grp.skills || []).filter(sk => Utils.hasSkillProf(char, sk.id) || Utils.hasExpertise?.(char, sk.id));
            const shownRows = isFolded ? trainedSkills : grp.skills;
            const untrained = grp.skills.filter(sk => !trainedSkills.includes(sk));
            // o grupo da ação Esconder também guarda Atletismo e Acrobacia: o título diz isso
            const title = grp.key === 'hide' ? (pt ? 'Furtividade e corpo' : 'Hide & body') : grp.groupTitle;
            return (
              <div key={grp.key} className={`fh-skg${isFolded ? ' is-collapsed' : ' is-open'}`}>
                {groupHead(grp.key, title, grp.skills.length, trainedSkills.length)}
                <div id={`fh-skill-group-${grp.key}`}>
                  {/* dobrado sem nenhuma perícia treinada: nada de faixa vazia */}
                  {shownRows.length > 0 && (
                    <div className={`fh-skg-list${isFolded ? ' statblock-action-indented-profs' : ''}`}
                      style={{ '--fh-rows': Math.ceil(shownRows.length / 2) }}>
                      {(isFolded ? trainedSkills : grp.skills).map(skillRow)}
                    </div>
                  )}
                  {/* dobrado: as sem treino continuam roláveis, em botões pequenos */}
                  {isFolded && untrained.length > 0 && (
                    <div className="fh-skg-more is-rolls">
                      <span className="fh-skg-more-k">{pt ? 'Sem treino' : 'Not proficient'}</span>
                      {untrained.map(sk => (
                        <button key={sk.id} type="button" className="fh-skg-chip" onClick={() => rollSkill(sk)}
                          aria-label={pt ? `${sk.name}: rolar teste ${sk.bonusStr}` : `${sk.name}: roll check ${sk.bonusStr}`}>
                          {sk.name} <b>{sk.bonusStr}</b>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="fh-prof-legend fh-skills-key">
          <span><b className="fh-key-pass">12</b>{pt ? 'valor passivo' : 'passive score'}</span>
          <span><b className="fh-key-mod">+2</b>{pt ? 'bônus do teste (d20 + bônus)' : 'check bonus (d20 + bonus)'}</span>
          {keen && <span><b className="fh-key-adv" aria-hidden="true">▲</b>{pt ? 'rola com vantagem' : 'rolls with advantage'}</span>}
          {stealthArmor && <span><b className="fh-key-dis" aria-hidden="true">▼</b>{pt ? `desvantagem: armadura (${stealthArmorName})` : `disadvantage: armor (${stealthArmorName})`}</span>}
        </div>
        <FhProfLegend lang={lang} expert locked={locked} />
        {placed?.by?.skills && <FhFeatures items={placed.by.skills} multi={placed.multi} lang={lang} place="skills" />}
      </section>

      <section className="fh-panel fh-tools-panel">
        <FhTitle act={adv3} sub={<span><FhTapToRoll lang={lang} /></span>}>{pt ? 'Ferramentas' : 'Tools'}</FhTitle>
        {/* poucas linhas: sem dobra (o título do painel já diz o que são) */}
        <div className="fh-skill-categories-grid" data-fab-pass="">
          <div className="fh-skg is-open is-bare">
            <div className="fh-skg-list is-single">
              {toolItems.map(toolRow)}
            </div>
          </div>
        </div>
        {!trainedTools.length && (
          <p className="fh-skg-more">
            {pt ? 'Nenhuma ferramenta treinada. Sem treino, o teste usa só o modificador do atributo.' : 'No tool proficiency. Without it, the check uses the ability modifier alone.'}
          </p>
        )}
      </section>
    </div>
  );
};

export const SheetTools = ({ char, lang, update, placed, embedded = false }) => {
  const pt = lang === 'pt';
  const toolSummaries = [
    ...trainingLines(char, lang),
  ];

  // `embedded`: dentro do nível 1 da linha do tempo (sem painel nem título; os traços de
  // proficiência já aparecem no nível em que vieram)
  const Wrap = embedded ? ({ children }) => <div className="fh-tl-embed fh-tl-tools">{children}</div>
    : ({ children }) => (
      <div className="fh-scope-content fh-scope-tools">
        <section className="fh-panel">
          <FhTitle>{pt ? 'Idiomas e Proficiências de Ferramentas' : 'Languages & Tool Proficiencies'}</FhTitle>
          {children}
        </section>
      </div>
    );
  return (
    <Wrap>
        <LanguagesField char={char} lang={lang} update={update} />
        {toolSummaries.map(tl => (
          <div key={tl.key} className="text-sm" style={{ marginBottom: 6 }}>
            <strong style={{ color: 'var(--gold-deep)' }}>{tl.label}:</strong> {tl.text}
          </div>
        ))}
        {!embedded && placed?.by?.proficiencies && (
          <FhFeatures items={placed.by.proficiencies} multi={placed.multi} lang={lang} place="proficiencies" className="fh-cf-profs" />
        )}
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>{pt ? 'Outras proficiências' : 'Other proficiencies'}</label>
          <textarea
            aria-label={pt ? 'Outras proficiências' : 'Other proficiencies'}
            value={char.otherProfs || ''}
            onChange={e => update({ otherProfs: e.target.value })}
            placeholder={pt ? 'Ferramentas, armas adicionais, perícias manuais...' : 'Tools, extra weapons, custom proficiencies...'}
            rows={3}
          />
        </div>
    </Wrap>
  );
};

// Modal de perícias e ferramentas iniciais da classe (nível 1) a partir da linha do tempo.
// Em campanha a troca de uma escolha vira pedido ao mestre: o botão principal diz isso
// ("Pedir ao mestre", não "Salvar") e uma linha acima dele avisa antes do toque.
