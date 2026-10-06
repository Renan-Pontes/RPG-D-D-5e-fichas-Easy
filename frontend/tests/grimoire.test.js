import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES, CATEGORIES, CONDITION_ARTICLE } from '../data/grimoire/index.js';
import { normalize, buildIndex, search, findArticle, parseGrimoireHash, grimoireHash } from '../src/grimoire/search.js';

const LANGS = ['pt', 'en'];
const byId = new Map(ARTICLES.map(a => [a.id, a]));

test('grimório: quantidade e categorias', () => {
  assert.ok(ARTICLES.length >= 80, `só ${ARTICLES.length} artigos`);
  const cats = new Set(CATEGORIES.map(c => c.id));
  for (const a of ARTICLES) assert.ok(cats.has(a.cat), `${a.id}: categoria ${a.cat} desconhecida`);
  for (const c of CATEGORIES) {
    assert.ok(ARTICLES.some(a => a.cat === c.id), `categoria ${c.id} vazia`);
    for (const l of LANGS) assert.ok(c.name[l], `categoria ${c.id} sem nome ${l}`);
  }
});

test('grimório: ids e aliases únicos, em kebab-case', () => {
  const seen = new Map();
  for (const a of ARTICLES) {
    for (const slug of [a.id, ...(a.aliases || [])]) {
      assert.match(slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, `slug inválido: ${slug}`);
      assert.ok(!seen.has(slug), `slug repetido "${slug}" em ${a.id} e ${seen.get(slug)}`);
      seen.set(slug, a.id);
    }
  }
});

test('grimório: PT e EN preenchidos em todos os campos de texto', () => {
  for (const a of ARTICLES) {
    for (const f of ['title', 'simple', 'example']) {
      for (const l of LANGS) assert.ok(String(a[f]?.[l] || '').trim(), `${a.id}: ${f}.${l} vazio`);
    }
    for (const f of ['sheet', 'versions']) {
      if (!a[f]) continue;
      for (const l of LANGS) assert.ok(String(a[f][l] || '').trim(), `${a.id}: ${f}.${l} vazio`);
    }
    if (a.srd) {
      assert.ok(a.srd.text && a.srd.ref, `${a.id}: citação SRD sem texto ou referência`);
      assert.match(a.srd.ref, /SRD/, `${a.id}: referência da citação não menciona o SRD`);
    }
    assert.ok(String(a.keywords || '').trim(), `${a.id}: sem palavras-chave`);
    // O exemplo prático precisa ter números concretos.
    for (const l of LANGS) assert.match(a.example[l], /\d/, `${a.id}: exemplo ${l} sem números`);
    // Marcação de negrito balanceada (a UI só entende **...**).
    for (const f of ['simple', 'example', 'sheet', 'versions']) {
      for (const l of LANGS) {
        const s = a[f]?.[l];
        if (s) assert.equal((s.match(/\*\*/g) || []).length % 2, 0, `${a.id}: ** desbalanceado em ${f}.${l}`);
      }
    }
  }
});

test('grimório: links relacionados válidos e sem autolink', () => {
  for (const a of ARTICLES) {
    assert.ok(Array.isArray(a.related) && a.related.length > 0, `${a.id}: sem relacionados`);
    for (const r of a.related) {
      assert.ok(byId.has(r), `${a.id}: relacionado inexistente "${r}"`);
      assert.notEqual(r, a.id, `${a.id}: aponta para si mesmo`);
    }
  }
});

test('grimório: todas as 15 condições presentes, ligadas às chaves da ficha', () => {
  const keys = ['blinded', 'charmed', 'deafened', 'exhausted', 'frightened', 'grappled', 'incapacitated',
    'invisible', 'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'];
  for (const k of keys) {
    const id = CONDITION_ARTICLE[k];
    const a = byId.get(id);
    assert.ok(a, `condição ${k} sem artigo (${id})`);
    assert.equal(a.cat, 'conditions');
    assert.equal(findArticle(ARTICLES, k)?.id, id, `alias da ficha "${k}" não resolve`);
  }
});

test('grimório: artigos essenciais e notas de versão 2014 × 2024', () => {
  const must = ['acao-atacar', 'acao-disparada', 'acao-desengajar', 'acao-esquivar', 'acao-ajudar', 'acao-esconder',
    'acao-preparar', 'acao-buscar', 'acao-usar-objeto', 'acao-magia', 'ataque-de-oportunidade', 'cobertura',
    'acerto-critico', 'resistencia-e-vulnerabilidade', 'testes-contra-a-morte', 'pv-temporarios', 'concentracao',
    'componentes', 'rituais', 'espacos-de-magia', 'conjurar-de-armadura', 'descanso-curto', 'descanso-longo',
    'dados-de-vida', 'vantagem-desvantagem', 'classe-de-dificuldade', 'teste-resistido', 'pericias', 'valor-passivo',
    'luz-e-visao', 'queda', 'sufocamento', 'viagem', 'carga', 'combate-montado', 'combate-subaquatico'];
  for (const id of must) assert.ok(byId.has(id), `falta o artigo ${id}`);
  for (const id of ['exaustao', 'surpresa', 'iniciativa', 'agarrar', 'acao-esconder', 'inspiracao-heroica', 'maestria-em-armas']) {
    assert.ok(byId.get(id)?.versions, `${id}: falta a nota 2014 × 2024`);
  }
});

test('grimório: dicas "?" da ficha apontam para artigos existentes', () => {
  for (const id of ['condicoes', 'testes-contra-a-morte', 'pv-temporarios', 'dados-de-vida', 'descanso-curto', 'valor-passivo']) {
    assert.ok(findArticle(ARTICLES, id), `dica da ficha sem artigo: ${id}`);
  }
});

// ===== Busca =====

test('normalize ignora acento, maiúsculas e pontuação', () => {
  assert.equal(normalize('  Concentração, AÇÃO!  '), 'concentracao acao');
  assert.equal(normalize('Teste contra a Morte'), 'teste contra a morte');
});

test('busca: acento/maiúsculas e ranking título > palavra-chave > texto', () => {
  const idx = buildIndex(ARTICLES, 'pt');
  assert.equal(search(idx, 'CONCENTRACAO')[0].id, 'concentracao');
  assert.equal(search(idx, 'agarrado')[0].id, 'agarrado');
  assert.equal(search(idx, 'exaustão')[0].id, 'exaustao');
  // Termo em inglês com a interface em PT cai no artigo certo.
  assert.equal(search(idx, 'grappled')[0].id, 'agarrado');
  // Palavra-chave (sinônimo) encontra o artigo.
  const adv = search(idx, 'advantage').map(a => a.id);
  assert.equal(adv[0], 'vantagem-desvantagem');
  // Título pesa mais que texto: "cobertura" vem antes de artigos que só citam a palavra.
  const cov = search(idx, 'cobertura').map(a => a.id);
  assert.equal(cov[0], 'cobertura');
  // Várias palavras: todas precisam aparecer.
  assert.ok(search(idx, 'ataque oportunidade').map(a => a.id).includes('ataque-de-oportunidade'));
  assert.deepEqual(search(idx, 'xyzzy plugh'), []);
});

test('busca: filtro por categoria e busca vazia', () => {
  const idx = buildIndex(ARTICLES, 'en');
  const conds = search(idx, '', { cat: 'conditions' });
  assert.ok(conds.length >= 15 && conds.every(a => a.cat === 'conditions'));
  assert.equal(search(idx, '').length, ARTICLES.length);
  assert.ok(search(idx, 'prone', { cat: 'conditions' }).every(a => a.cat === 'conditions'));
  assert.equal(search(idx, 'prone')[0].id, 'prono');
  assert.equal(search(idx, 'Death saving throws')[0].id, 'testes-contra-a-morte');
});

test('deep-link: hash e aliases', () => {
  assert.deepEqual(parseGrimoireHash('#grimorio/agarrado'), { id: 'agarrado', q: '' });
  assert.deepEqual(parseGrimoireHash('#grimoire/grappled'), { id: 'grappled', q: '' });
  assert.deepEqual(parseGrimoireHash('#grimorio'), { id: null, q: '' });
  assert.deepEqual(parseGrimoireHash('#grimorio?q=vantagem'), { id: null, q: 'vantagem' });
  assert.equal(parseGrimoireHash('#share=abc'), null);
  assert.equal(grimoireHash('agarrado'), '#grimorio/agarrado');
  assert.equal(findArticle(ARTICLES, 'grappled').id, 'agarrado');
  assert.equal(findArticle(ARTICLES, 'Agarrado').id, 'agarrado');
  assert.equal(findArticle(ARTICLES, 'nao-existe'), null);
});

test('termos em negrito viram links para o artigo certo (e nunca para o próprio)', async () => {
  const { buildTermMap, termTarget } = await import('../src/grimoire/terms.js');
  const { ARTICLES } = await import('../data/grimoire/index.js');
  const map = buildTermMap(ARTICLES, 'pt');
  assert.equal(termTarget(map, 'desvantagem', 'agarrado'), 'vantagem-desvantagem');
  assert.equal(termTarget(map, 'Vantagem', 'agarrado'), 'vantagem-desvantagem');
  assert.equal(termTarget(map, 'vantagem', 'vantagem-desvantagem'), null);
  assert.equal(termTarget(map, 'palavra que não existe', null), null);
  const ids = new Set(ARTICLES.map(a => a.id));
  for (const id of map.values()) assert.ok(ids.has(id));
});
