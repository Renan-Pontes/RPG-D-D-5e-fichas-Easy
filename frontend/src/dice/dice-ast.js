function defaultRng(sides) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] % sides) + 1;
  }
  return Math.floor(Math.random() * sides) + 1;
}

function cmp(op, a, b) {
  if (op === '<') return a < b;
  if (op === '<=') return a <= b;
  if (op === '>') return a > b;
  if (op === '>=') return a >= b;
  return a === b;
}

function parseModifiers(rest) {
  const mods = [];
  let s = rest;
  const re = /^(kh|kl|k|dh|dl|ro|r|min)(<=|>=|<|>|=)?(\d+)/i;
  while (s.length) {
    const m = re.exec(s);
    if (!m) return null;
    const kind = m[1].toLowerCase();
    const op = m[2] || ((kind === 'r' || kind === 'ro') ? '<=' : '=');
    mods.push({ kind: kind === 'k' ? 'kh' : kind, op, n: Number(m[3]) });
    s = s.slice(m[0].length);
  }
  return mods;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if ('+-*()'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i += 1; continue; }
    const slice = expr.slice(i);
    const dm = /^(\d*)d(\d+)((?:(?:kh|kl|k|dh|dl|ro|r|min)(?:<=|>=|<|>|=)?\d+)*)/i.exec(slice);
    if (dm) {
      const count = dm[1] ? Number(dm[1]) : 1;
      const sides = Number(dm[2]);
      const mods = parseModifiers(dm[3] || '');
      if (!mods || sides < 1 || count < 0 || count > 200 || sides > 1000) return null;
      tokens.push({ t: 'dice', count, sides, mods, raw: dm[0] });
      i += dm[0].length;
      continue;
    }
    const nm = /^\d+/.exec(slice);
    if (nm) {
      tokens.push({ t: 'num', v: Number(nm[0]) });
      i += nm[0].length;
      continue;
    }
    return null;
  }
  return tokens;
}

export function parseDiceAst(expr) {
  const raw = String(expr || '').trim();
  if (!raw) return { ok: false, expr: '', ast: null, normalized: '', error: 'empty' };
  const tokens = tokenize(raw);
  if (!tokens || !tokens.length) return { ok: false, expr: raw, ast: null, normalized: '', error: 'invalid_token' };

  let pos = 0;
  const peek = () => tokens[pos] || null;
  const next = () => tokens[pos++];

  function parseExpr() {
    let left = parseTerm();
    if (!left) return null;
    while (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = next().v;
      const right = parseTerm();
      if (!right) return null;
      left = { type: 'bin', op, left, right };
    }
    return left;
  }

  function parseTerm() {
    let left = parseUnary();
    if (!left) return null;
    while (peek()?.t === 'op' && peek().v === '*') {
      next();
      const right = parseUnary();
      if (!right) return null;
      left = { type: 'bin', op: '*', left, right };
    }
    return left;
  }

  function parseUnary() {
    if (peek()?.t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = next().v;
      const arg = parseUnary();
      if (!arg) return null;
      return op === '-' ? { type: 'neg', arg } : arg;
    }
    return parsePrimary();
  }

  function parsePrimary() {
    const tk = peek();
    if (!tk) return null;
    if (tk.t === 'op' && tk.v === '(') {
      next();
      const inner = parseExpr();
      if (!inner || peek()?.t !== 'op' || peek().v !== ')') return null;
      next();
      return inner;
    }
    if (tk.t === 'num') { next(); return { type: 'num', value: tk.v }; }
    if (tk.t === 'dice') { next(); return { type: 'dice', count: tk.count, sides: tk.sides, mods: tk.mods, raw: tk.raw }; }
    return null;
  }

  const ast = parseExpr();
  if (!ast || pos !== tokens.length) return { ok: false, expr: raw, ast: null, normalized: '', error: 'syntax_error' };
  return { ok: true, expr: raw, ast, normalized: normalizeAst(ast), error: null };
}

function normalizeAst(node) {
  if (node.type === 'num') return String(node.value);
  if (node.type === 'neg') return `-${normalizeAst(node.arg)}`;
  if (node.type === 'bin') return `${normalizeAst(node.left)} ${node.op} ${normalizeAst(node.right)}`;
  const mods = node.mods.map(m => `${m.kind}${m.op !== '=' && (m.kind === 'r' || m.kind === 'ro') ? m.op : (m.kind === 'r' || m.kind === 'ro' ? '=' : '')}${m.n}`).join('');
  return `${node.count}d${node.sides}${mods}`;
}

function rollDieWithMods(sides, mods, rng) {
  let val = Math.max(1, Math.min(sides, Math.round(rng(sides))));
  const minMod = mods.find(m => m.kind === 'min');
  for (const m of mods) {
    if (m.kind === 'ro' && cmp(m.op, val, m.n)) {
      val = Math.max(1, Math.min(sides, Math.round(rng(sides))));
    } else if (m.kind === 'r') {
      let guard = 0;
      while (cmp(m.op, val, m.n) && guard < 20) {
        val = Math.max(1, Math.min(sides, Math.round(rng(sides))));
        guard += 1;
      }
    }
  }
  if (minMod && val < minMod.n) val = minMod.n;
  return val;
}

export function evalDiceAst(astOrExpr, { rng = defaultRng, crit = false } = {}) {
  const ast = typeof astOrExpr === 'string' ? parseDiceAst(astOrExpr).ast : astOrExpr;
  if (!ast) throw new Error('invalid_dice_ast');
  const terms = [];

  function walk(node) {
    if (node.type === 'num') return node.value;
    if (node.type === 'neg') return -walk(node.arg);
    if (node.type === 'bin') {
      const a = walk(node.left);
      const b = walk(node.right);
      if (node.op === '+') return a + b;
      if (node.op === '-') return a - b;
      return a * b;
    }
    const count = crit ? node.count * 2 : node.count;
    const rolls = Array.from({ length: count }, () => rollDieWithMods(node.sides, node.mods, rng));
    const kept = rolls.map(() => true);
    for (const m of node.mods) {
      if (!['kh', 'kl', 'dh', 'dl'].includes(m.kind)) continue;
      const activeIdx = rolls.map((v, i) => ({ v, i })).filter(({ i }) => kept[i]);
      const asc = [...activeIdx].sort((a, b) => a.v - b.v || a.i - b.i);
      const desc = [...activeIdx].sort((a, b) => b.v - a.v || a.i - b.i);
      if (m.kind === 'kh') {
        const keepSet = new Set(desc.slice(0, m.n).map(x => x.i));
        for (const { i } of activeIdx) if (!keepSet.has(i)) kept[i] = false;
      } else if (m.kind === 'kl') {
        const keepSet = new Set(asc.slice(0, m.n).map(x => x.i));
        for (const { i } of activeIdx) if (!keepSet.has(i)) kept[i] = false;
      } else if (m.kind === 'dh') {
        for (const { i } of desc.slice(0, m.n)) kept[i] = false;
      } else if (m.kind === 'dl') {
        for (const { i } of asc.slice(0, m.n)) kept[i] = false;
      }
    }
    const keptRolls = rolls.filter((_, i) => kept[i]);
    const droppedRolls = rolls.filter((_, i) => !kept[i]);
    const subtotal = keptRolls.reduce((acc, v) => acc + v, 0);
    terms.push({ kind: 'dice', raw: `${count}d${node.sides}`, sides: node.sides, count, rolls, keptRolls, droppedRolls, subtotal });
    return subtotal;
  }

  const total = walk(ast);
  return { total, terms, expr: normalizeAst(ast) };
}

export function formatAstBreakdown(result) {
  if (!result?.terms?.length) return String(result?.total ?? '');
  return result.terms.map(t => {
    const kept = t.keptRolls.join('+');
    const drop = t.droppedRolls.length ? ` (drop ${t.droppedRolls.join(',')})` : '';
    return `${t.raw}: [${kept}${drop}]`;
  }).join(' · ');
}
