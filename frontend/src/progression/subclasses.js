/**
 * Lista de subclasses para os seletores. Fichas 2024 juntam as subclasses do
 * catálogo antigo (srd.js + suplementos) com as dos arquivos de classe
 * (data/class-options/), que têm prioridade e trazem as novas do PHB 2024.
 */
import SRD from '../../data/srd.js';
import { CLASS_OPTIONS } from '../../data/class-options/index.js';

function fromClassData(id, sub) {
  const features = Object.entries(sub.levels || {})
    .flatMap(([lv, node]) => (node.features || []).map(f => ({ level: +lv, name: f.name, desc: f.desc })))
    .sort((a, b) => a.level - b.level);
  return {
    id, name: sub.name, desc: sub.desc, source: sub.source, features,
    ...(sub.landTypes ? { landTypes: sub.landTypes } : {}),
  };
}

export function subclassesFor(character, classId = character.className) {
  const legacy = SRD.SUBCLASSES?.[classId] || [];
  if (character.rulesVersion !== '2024') return legacy;
  const current = CLASS_OPTIONS[classId]?.subclasses || {};
  const out = legacy.map(s => {
    const key = Object.keys(current).find(id => id.toLowerCase() === s.id.toLowerCase());
    return key ? { ...s, ...fromClassData(s.id, current[key]), landTypes: current[key].landTypes || s.landTypes } : s;
  });
  for (const [id, sub] of Object.entries(current)) {
    if (!out.some(s => s.id.toLowerCase() === id.toLowerCase())) out.push(fromClassData(id, sub));
  }
  return out;
}

export const subclassName = (character, classId, sub, lang) =>
  subclassesFor(character, classId).find(s => s.id.toLowerCase() === String(sub).toLowerCase())?.name[lang] || sub;
