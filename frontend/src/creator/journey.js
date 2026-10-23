/*
 * Jornada da criação: as etapas (steps.js) agrupadas em capítulos de uma
 * história de origem. Só apresentação — a ordem, as pendências e as regras
 * continuam nas etapas. Funções puras (testadas em tests/creator-journey.test.js).
 */
const b = (pt, en) => ({ pt, en });

export const CHAPTERS = [
  { id: 'prologue', num: b('Prólogo', 'Prologue'), title: b('O Começo', 'The Beginning'), narr: b('Toda lenda começa com uma escolha.', 'Every legend begins with a choice.'), steps: ['welcome'] },
  { id: 'call', num: b('Capítulo I', 'Chapter I'), title: b('O Chamado', 'The Call'), narr: b('Algo te tirou da vida comum. O que foi?', 'Something pulled you out of ordinary life. What was it?'), steps: ['class', 'classChoices', 'skills'] },
  { id: 'roots', num: b('Capítulo II', 'Chapter II'), title: b('As Raízes', 'The Roots'), narr: b('Antes da estrada, quem você era?', 'Before the road, who were you?'), steps: ['background', 'originFeat'] },
  { id: 'blood', num: b('Capítulo III', 'Chapter III'), title: b('O Sangue', 'The Blood'), narr: b('De que povo você vem?', 'What people do you come from?'), steps: ['species', 'speciesChoices', 'languages'] },
  { id: 'temper', num: b('Capítulo IV', 'Chapter IV'), title: b('A Têmpera', 'The Temper'), narr: b('O que o mundo forjou em você?', 'What did the world forge in you?'), steps: ['abilities', 'abilityBonus'] },
  { id: 'pack', num: b('Capítulo V', 'Chapter V'), title: b('A Bagagem', 'The Pack'), narr: b('O que você leva na estrada?', 'What do you carry on the road?'), steps: ['equipment'] },
  { id: 'gift', num: b('Capítulo VI', 'Chapter VI'), title: b('O Dom', 'The Gift'), narr: b('Que magia desperta em você?', 'What magic awakens in you?'), steps: ['cantrips', 'spells'] },
  { id: 'oath', num: b('Capítulo VII', 'Chapter VII'), title: b('O Juramento', 'The Oath'), narr: b('Quem você jura ser?', 'Who do you swear to be?'), steps: ['alignment', 'details'] },
  { id: 'forge', num: b('Epílogo', 'Epilogue'), title: b('A Forja', 'The Forge'), narr: b('Toda lenda precisa de um nome.', 'Every legend needs a name.'), steps: ['review'] },
];

const STEP_CHAPTER = Object.fromEntries(CHAPTERS.flatMap((c, i) => c.steps.map(s => [s, i])));

/**
 * Índice do capítulo de uma etapa. Etapa nova que não está na lista fica no
 * capítulo da etapa anterior (ou no primeiro), para nunca sumir do mapa.
 */
export function chapterIndexOf(stepId, steps = []) {
  if (stepId in STEP_CHAPTER) return STEP_CHAPTER[stepId];
  const i = steps.findIndex(s => s.id === stepId);
  for (let j = i - 1; j >= 0; j--) if (steps[j].id in STEP_CHAPTER) return STEP_CHAPTER[steps[j].id];
  return 0;
}

/**
 * Estado de cada capítulo para o mapa, a partir do estado da barra de etapas:
 * steps (as que se aplicam), index (etapa atual), visited (ids), stepIssues
 * (pendências por etapa), reachable(i). Um capítulo sem etapas aplicáveis fica
 * de fora (ex.: O Dom para quem não conjura).
 */
export function journeyChapters({ steps, index, visited = [], stepIssues = [], reachable = () => true }) {
  const now = chapterIndexOf(steps[index]?.id, steps);
  return CHAPTERS.map((c, ci) => {
    const members = steps.map((s, i) => ({ s, i })).filter(({ s }) => chapterIndexOf(s.id, steps) === ci);
    const seen = members.filter(({ s, i }) => visited.includes(s.id) && i !== index);
    const pending = seen.some(({ i }) => (stepIssues[i] || []).length > 0);
    // O "!" leva direto à etapa com pendência; senão, à primeira alcançável.
    const target = seen.find(({ i }) => reachable(i) && (stepIssues[i] || []).length > 0) || members.find(({ i }) => reachable(i));
    return {
      ...c,
      index: ci,
      steps: members.map(({ s, i }) => ({ id: s.id, title: s.title, i })),
      skip: members.length === 0,
      now: ci === now,
      done: ci !== now && members.length > 0 && members.every(({ s, i }) => visited.includes(s.id) && !(stepIssues[i] || []).length),
      pending,
      target: target ? target.i : null,
    };
  });
}
