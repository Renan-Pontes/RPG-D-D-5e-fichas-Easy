// client.js: erro claro para CSRF de origem não confiável e renovação do token.
import test from 'node:test';
import assert from 'node:assert/strict';
import { api, request, ApiError } from '../src/api/client.js';

function mockFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url, opts });
    const r = handler(url, opts, calls.length);
    return {
      ok: r.status < 400,
      status: r.status,
      statusText: '',
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    };
  };
  return calls;
}

test('request é exportado (contrato C5)', () => {
  assert.equal(typeof request, 'function');
});

test('403 de origem não confiável vira "Origem não autorizada pelo servidor"', async () => {
  const calls = mockFetch((url) => {
    if (url.endsWith('/api/auth/csrf')) return { status: 200, body: { csrfToken: 'tok1' } };
    return { status: 403, body: { error: 'forbidden', detail: 'CSRF Failed: Origin checking failed - http://localhost:5174 does not match any trusted origins.' } };
  });
  await assert.rejects(api.login({ email: 'a', password: 'b' }), (e) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 403);
    assert.equal(e.data.code, 'csrf_origin');
    assert.match(e.message, /Origem não autorizada pelo servidor/);
    return true;
  });
  // não repete à toa: 1 POST só
  assert.equal(calls.filter(c => c.opts.method === 'POST').length, 1);
});

test('403 de token CSRF vencido: renova e repete uma vez', async () => {
  let n = 0;
  const calls = mockFetch((url) => {
    if (url.endsWith('/api/auth/csrf')) { n += 1; return { status: 200, body: { csrfToken: `fresh${n}` } }; }
    const post = calls.filter(c => c.opts.method === 'POST').length;
    if (post === 1) return { status: 403, body: { error: 'forbidden', detail: 'CSRF Failed: CSRF token incorrect.' } };
    return { status: 200, body: { ok: true } };
  });
  const r = await request('/api/x', { method: 'POST', body: {} });
  assert.deepEqual(r, { ok: true });
  const posts = calls.filter(c => c.opts.method === 'POST');
  assert.equal(posts.length, 2);
  assert.notEqual(posts[0].opts.headers['X-CSRFToken'], posts[1].opts.headers['X-CSRFToken']);
});

test('login bem-sucedido busca um token CSRF novo (Django gira no login)', async () => {
  const calls = mockFetch((url) => {
    if (url.endsWith('/api/auth/csrf')) return { status: 200, body: { csrfToken: 'after-login' } };
    return { status: 200, body: { user: { id: 1 } } };
  });
  await api.login({ email: 'a', password: 'b' });
  await new Promise(r => setTimeout(r, 10));
  const csrfAfter = calls.findIndex((c, i) => i > 0 && c.url.endsWith('/api/auth/csrf') && calls.slice(0, i).some(p => p.url.endsWith('/api/auth/login')));
  assert.ok(csrfAfter > 0, 'deveria buscar /api/auth/csrf depois do login');
  // e a próxima escrita usa o token novo
  await request('/api/y', { method: 'POST', body: {} });
  const last = calls.filter(c => c.url.endsWith('/api/y'))[0];
  assert.equal(last.opts.headers['X-CSRFToken'], 'after-login');
});

test('patchCampaignState manda {patch} por PATCH', async () => {
  const calls = mockFetch((url) => (url.endsWith('/api/auth/csrf') ? { status: 200, body: { csrfToken: 't' } } : { status: 200, body: { state: { live: true } } }));
  await api.patchCampaignState(5, { live: true });
  const c = calls.find(x => x.url.endsWith('/api/campaigns/5/state'));
  assert.equal(c.opts.method, 'PATCH');
  assert.deepEqual(JSON.parse(c.opts.body), { patch: { live: true } });
});

test('errorMessage mostra o texto de origem mesmo com fallback genérico', async () => {
  const { errorMessage } = await import('../src/api/errors.js');
  mockFetch((url) => (url.endsWith('/api/auth/csrf')
    ? { status: 200, body: { csrfToken: 't' } }
    : { status: 403, body: { error: 'forbidden', detail: 'CSRF Failed: Origin checking failed - http://x does not match any trusted origins.' } }));
  try { await api.login({}); assert.fail('deveria falhar'); } catch (e) {
    assert.match(errorMessage(e, 'pt', 'Falha ao autenticar'), /Origem não autorizada pelo servidor/);
    assert.doesNotMatch(errorMessage(e, 'pt'), /permissão/);
  }
});
