import { test } from 'node:test';
import assert from 'node:assert/strict';
import Utils from '../utils.js';

const c24 = (extra = {}) => ({ rulesVersion: '2024', className: 'fighter', race: 'human', background: 'soldier', level: 1, ...extra });
const c14 = (extra = {}) => ({ rulesVersion: '2014', className: 'fighter', race: 'human', background: 'soldier', level: 1, ...extra });

// ---------- "Outro idioma…" (personalizado) ----------

test('normaliza o nome digitado: espaços aparados e teto de tamanho', () => {
  assert.equal(Utils.normalizeLanguageName('  Féerico   antigo  '), 'Féerico antigo');
  assert.equal(Utils.normalizeLanguageName(null), '');
  assert.equal(Utils.normalizeLanguageName('x'.repeat(90)).length, Utils.CUSTOM_LANGUAGE_MAX);
});

test('chave de comparação ignora acento, caixa, espaço e pontuação', () => {
  assert.equal(Utils.languageKey('Féerico'), Utils.languageKey('FEERICO'));
  assert.equal(Utils.languageKey(' féerico '), 'feerico');
  assert.equal(Utils.languageKey("Thieves' Cant"), Utils.languageKey('thieves cant'));
  assert.notEqual(Utils.languageKey('Élfico'), Utils.languageKey('Anão'));
});

test('personalizado novo: rótulo igual ao digitado, sem tradução', () => {
  const r = Utils.resolveLanguageInput(c24(), '  Féerico ', []);
  assert.deepEqual(r, { id: 'Féerico', kind: 'custom' });
  assert.equal(Utils.languageLabel('Féerico', 'pt'), 'Féerico');
  assert.equal(Utils.languageLabel('Féerico', 'en'), 'Féerico');
  assert.equal(Utils.isCustomLanguage('Féerico'), true);
  assert.equal(Utils.isCustomLanguage('Elvish'), false);
  assert.equal(Utils.isRareLanguage(c24(), 'Féerico'), false); // conta como escolha comum
});

test('não duplica personalizado já escolhido (sem acento/caixa)', () => {
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'feerico', ['Dwarvish', 'Féerico']), { id: 'Féerico', kind: 'chosen' });
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'FÉERICO', ['Féerico']), { id: 'Féerico', kind: 'chosen' });
});

test('nome do catálogo (pt ou en) marca o id do catálogo, nunca vira personalizado', () => {
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'Élfico', []), { id: 'Elvish', kind: 'catalog' });
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'elfico', []), { id: 'Elvish', kind: 'catalog' });
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'ELVISH', []), { id: 'Elvish', kind: 'catalog' });
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'dialeto subterraneo', []), { id: 'Deep Speech', kind: 'catalog' });
  // Já marcado: avisa em vez de repetir.
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'Élfico', ['Elvish']), { id: 'Elvish', kind: 'chosen' });
  // Ficha antiga com o id em outra caixa também conta como já escolhido.
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'Élfico', ['elvish']), { id: 'elvish', kind: 'chosen' });
});

test('idioma que a ficha já fala (fixo) não entra de novo', () => {
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'comum', []), { id: 'Common', kind: 'known' });
  assert.deepEqual(Utils.resolveLanguageInput(c14({ race: 'elf-high' }), 'Élfico', []), { id: 'Elvish', kind: 'known' });
  assert.deepEqual(Utils.resolveLanguageInput(c24({ className: 'druid' }), 'druidico', []), { id: 'Druidic', kind: 'known' });
});

test('criador: idioma secreto de classe digitado não vira escolha de outra classe', () => {
  const noSecret = { allowSecret: false };
  // 2014 guerreiro sábio e 2024 ladino (vaga rara): Druídico/Gíria de Ladrão barrados.
  assert.deepEqual(Utils.resolveLanguageInput(c14({ background: 'sage' }), 'druidico', [], noSecret), { id: 'Druidic', kind: 'secret' });
  assert.deepEqual(Utils.resolveLanguageInput(c14(), 'Gíria de Ladrão', [], noSecret), { id: "Thieves' Cant", kind: 'secret' });
  assert.deepEqual(Utils.resolveLanguageInput(c24({ className: 'rogue', background: 'criminal' }), 'Druídico', [], noSecret), { id: 'Druidic', kind: 'secret' });
  // A própria classe já fala; e um já marcado (ficha antiga) continua podendo sair.
  assert.deepEqual(Utils.resolveLanguageInput(c14({ className: 'druid' }), 'druidico', [], noSecret), { id: 'Druidic', kind: 'known' });
  assert.deepEqual(Utils.resolveLanguageInput(c14(), 'druidico', ['Druidic'], noSecret), { id: 'Druidic', kind: 'chosen' });
  // Idiomas comuns não mudam.
  assert.deepEqual(Utils.resolveLanguageInput(c14(), 'Élfico', [], noSecret), { id: 'Elvish', kind: 'catalog' });
  // Ficha (modo livre, padrão): pode aprender em jogo.
  assert.deepEqual(Utils.resolveLanguageInput(c14(), 'druidico', []), { id: 'Druidic', kind: 'catalog' });
});

test('texto vazio não faz nada', () => {
  assert.deepEqual(Utils.resolveLanguageInput(c24(), '   ', []), { id: '', kind: 'empty' });
  assert.deepEqual(Utils.resolveLanguageInput(c24(), '!!', []), { id: '', kind: 'empty' });
  assert.deepEqual(Utils.resolveLanguageInput(c24(), ' + ', []), { id: '', kind: 'empty' });
});

test('"+2 idiomas" não vira marcador invisível: o "+" do começo sai', () => {
  const c = c24({ languages: ['Common', 'Dwarvish', 'Elvish'] });
  for (const typed of ['+2 idiomas', ' +1', '++ Féerico']) {
    const r = Utils.resolveLanguageInput(c, typed, []);
    assert.equal(r.kind, 'custom', typed);
    assert.doesNotMatch(r.id, /^\+/, typed);
    // Salvo, continua visível e removível como escolhido.
    const saved = Utils.withChosenLanguages(c, [r.id]);
    assert.ok(Utils.chosenLanguageIds({ ...c, languages: saved }).includes(r.id), typed);
    assert.ok(Utils.languagesFor({ ...c, languages: saved }).includes(r.id), typed);
  }
  assert.equal(Utils.normalizeLanguageName('+2 idiomas'), '2 idiomas');
});

// ---------- "Outros livros" ----------

test('outros livros: nomes pt/en, raros/exóticos e resolvidos pelo nome digitado', () => {
  const ids = Utils.OTHER_BOOK_LANGUAGES.map(l => l.id);
  for (const id of ['Aquan', 'Auran', 'Ignan', 'Terran', 'Gith', 'Gnoll', 'Sahuagin', 'Aarakocra']) assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length);
  // Nenhum repete o catálogo do SRD.
  for (const id of ids) assert.ok(!Utils.LANGUAGES.some(l => l.id === id), id);
  assert.equal(Utils.languageLabel('Sphinx', 'pt'), 'Esfinge');
  assert.equal(Utils.languageLabel('Troglodyte', 'pt'), 'Troglodita');
  assert.equal(Utils.languageLabel('Sphinx', 'en'), 'Sphinx');
  assert.deepEqual(Utils.resolveLanguageInput(c24(), 'esfinge', []), { id: 'Sphinx', kind: 'catalog' });
  assert.equal(Utils.isRareLanguage(c24(), 'Aquan'), true);
  assert.equal(Utils.isRareLanguage(c14(), 'Aquan'), true);
});

test('2024: idioma de outro livro não entra nas vagas da origem; Ladino pode', () => {
  const issues = Utils.languageIssues(c24({ languages: ['Aquan', 'Dwarvish'] }));
  assert.ok(issues.some(i => /raros/i.test(i.pt) && i.pt.includes('Aquan')), JSON.stringify(issues));
  assert.deepEqual(Utils.trimLanguages(c24({ languages: ['Aquan', 'Dwarvish'] })), ['Dwarvish']);
  const rogue = c24({ className: 'rogue', background: 'criminal', languages: ['Elvish', 'Dwarvish', 'Gith'] });
  assert.deepEqual(Utils.languageIssues(rogue), []);
});

test('2014: outros livros são exóticos com aval do mestre (sem limite de raros)', () => {
  assert.deepEqual(Utils.languageIssues(c14({ background: 'sage', languages: ['Aquan', 'Gnoll', 'Celestial'] })), []);
});

test('personalizado conta como escolha no limite do criador', () => {
  const c = c24({ languages: ['Elvish', 'Féerico'] });
  assert.deepEqual(Utils.chosenLanguageIds(c), ['Elvish', 'Féerico']);
  assert.deepEqual(Utils.languageIssues(c), []);
  const over = c24({ languages: ['Elvish', 'Féerico', 'Orc'] });
  assert.match(Utils.languageIssues(over)[0].pt, /a mais/);
  assert.deepEqual(Utils.trimLanguages(over), ['Elvish', 'Féerico']);
});

// ---------- Salvar só os escolhidos ----------

test('withChosenLanguages mantém fixos e marcadores já salvos e troca só os escolhidos', () => {
  const c = c14({ race: 'elf-high', background: 'sage', languages: ['Common', 'Elvish', '+1 of choice', 'Dwarvish', 'Orc'] });
  assert.deepEqual(Utils.withChosenLanguages(c, ['Dwarvish', 'Féerico']), ['Common', 'Elvish', '+1 of choice', 'Dwarvish', 'Féerico']);
  // Ficha que só guardava os escolhidos continua assim.
  assert.deepEqual(Utils.withChosenLanguages(c24({ languages: ['Elvish'] }), ['Elvish', 'Aquan']), ['Elvish', 'Aquan']);
  assert.deepEqual(Utils.withChosenLanguages(c24(), []), []);
  // A lista final da ficha mostra fixos + escolhidos sem repetir.
  assert.deepEqual(Utils.languagesFor({ ...c, languages: Utils.withChosenLanguages(c, ['Féerico']) }), ['Common', 'Elvish', 'Féerico']);
});

test('idiomas a mais combinados com o mestre: sobem o limite sem mudar o que a regra exige', async () => {
  const { default: Utils } = await import('../utils.js');
  const base = { rulesVersion: '2024', race: 'human', className: 'fighter', background: 'soldier', languages: ['Elvish', 'Dwarvish', 'Giant'] };
  const need = Utils.languageChoiceCount(base);
  assert.ok(Utils.languageIssues(base).some(x => /a mais/.test(x.pt)), 'sem o extra, 3 passam do limite');
  const withExtra = { ...base, creation: { extraLanguages: 3 - need } };
  assert.deepEqual(Utils.languageIssues(withExtra), [], 'com o extra combinado, 3 cabem');
  assert.equal(Utils.trimLanguages(withExtra).length, 3);
  assert.equal(Utils.trimLanguages(base).length, need, 'sem extra corta no limite da regra');
  assert.equal(Utils.extraLanguages({ creation: { extraLanguages: 99 } }), 10);
  assert.equal(Utils.extraLanguages({ creation: { extraLanguages: -2 } }), 0);
  // falta escolher continua valendo: o extra não substitui o que a regra exige
  assert.ok(Utils.languageIssues({ ...base, languages: [], creation: { extraLanguages: 2 } }).some(x => /Escolha mais/.test(x.pt)));
});
