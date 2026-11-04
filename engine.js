'use strict';
/* 计算引擎：解析自然显示编辑器里的算式并求值。
 * 每个值同时带浮点近似 v 和精确形式 x（有理数与根式之和，或有理数 × π），
 * 输出时按 Casio Math 模式的规则决定显示分数 / 根式 / π，还是 10 位有效数字的小数。
 * 显示结果用记法字符串：\f{分子}{分母}、\r{根号内}、\p{指数}，由 calc.js 的 md() 渲染。 */
const Engine = (() => {
  class CalcError extends Error { constructor(kind) { super(kind); this.kind = kind; } }
  const fail = k => { throw new CalcError(k); };

  /* ---------- 有理数（BigInt） ---------- */
  const babs = a => (a < 0n ? -a : a);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  function Q(n, d = 1n) {
    if (d === 0n) fail('Math ERROR');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d);
    return g > 1n ? { n: n / g, d: d / g } : { n, d };
  }
  const qadd = (a, b) => Q(a.n * b.d + b.n * a.d, a.d * b.d);
  const qmul = (a, b) => Q(a.n * b.n, a.d * b.d);
  const qneg = a => ({ n: -a.n, d: a.d });
  const qinv = a => Q(a.d, a.n);
  const qnum = a => Number(a.n) / Number(a.d);
  const digits = n => babs(n).toString().length;
  const qbig = a => digits(a.n) + digits(a.d) > 40;
  function isqrt(n) {
    if (n < 2n) return n;
    let x = BigInt(Math.floor(Math.sqrt(Number(n))));
    while (x * x > n) x--;
    while ((x + 1n) * (x + 1n) <= n) x++;
    return x;
  }
  function iroot(N, k) { // N ≥ 0 的 k 次整数方根，不是完全 k 次方时返回 null
    if (N < 2n) return N;
    if (N > 10n ** 30n) return null;
    const g = BigInt(Math.round(Number(N) ** (1 / k)));
    for (const c of [g - 1n, g, g + 1n]) if (c >= 0n && c ** BigInt(k) === N) return c;
    return null;
  }
  // N = k²·m，m 无平方因子；因数太大分解不了时返回 null
  function squarePart(N) {
    let k = 1n, m = 1n, n = N;
    for (let p = 2n; p * p <= n; p += p === 2n ? 1n : 2n) {
      if (p > 100000n) { const r = isqrt(n); return r * r === n ? [k * r, m] : null; }
      let e = 0n;
      while (n % p === 0n) { n /= p; e++; }
      if (e) { k *= p ** (e / 2n); if (e % 2n) m *= p; }
    }
    return [k, m * n];
  }

  /* ---------- 精确形式 ----------
   * { k: 's', t: [{ m, c }] }：Σ c·√m（m 无平方因子，m = 1 为有理部分），t 为空表示 0
   * { k: 'p', c }：c·π */
  const ZERO = { k: 's', t: [] };
  const exQ = q => (q.n === 0n ? ZERO : { k: 's', t: [{ m: 1n, c: q }] });
  const isZero = x => x.k === 's' && !x.t.length;
  const isRat = x => x.k === 's' && (x.t.length === 0 || (x.t.length === 1 && x.t[0].m === 1n));
  const ratOf = x => (x.t.length ? x.t[0].c : Q(0n));
  function norm(terms) {
    const map = new Map();
    for (const { m, c } of terms) map.set(m, map.has(m) ? qadd(map.get(m), c) : c);
    const t = [...map].filter(([, c]) => c.n !== 0n).map(([m, c]) => ({ m, c })).sort((a, b) => (a.m < b.m ? -1 : 1));
    if (t.length > 4 || t.some(({ c }) => qbig(c))) return null;
    return { k: 's', t };
  }
  function exAdd(a, b) {
    if (a.k === 's' && b.k === 's') return norm([...a.t, ...b.t]);
    if (a.k === 'p' && b.k === 'p') { const c = qadd(a.c, b.c); return c.n === 0n ? ZERO : { k: 'p', c }; }
    if (isZero(a)) return b;
    if (isZero(b)) return a;
    return null;
  }
  function exMul(a, b) {
    if (a.k === 's' && b.k === 's') {
      const out = [];
      for (const p of a.t) for (const q of b.t) {
        const g = gcd(p.m, q.m); // √m1·√m2 = g·√(m1/g · m2/g)
        out.push({ m: (p.m / g) * (q.m / g), c: qmul(qmul(p.c, q.c), Q(g)) });
      }
      return norm(out);
    }
    const [p, s] = a.k === 'p' ? [a, b] : [b, a];
    if (s.k === 's' && isRat(s)) { const r = ratOf(s); return r.n === 0n ? ZERO : { k: 'p', c: qmul(p.c, r) }; }
    return null;
  }
  const exNeg = a => (a.k === 'p' ? { k: 'p', c: qneg(a.c) } : { k: 's', t: a.t.map(({ m, c }) => ({ m, c: qneg(c) })) });
  function exInv(a) {
    if (a.k === 'p' || isZero(a)) return null;
    if (a.t.length === 1) { const { m, c } = a.t[0]; return norm([{ m, c: qinv(qmul(c, Q(m))) }]); } // 1/(c√m) = √m/(cm)
    if (a.t.length === 2) { // 乘共轭：(p + q)(p − q) = p² − q² 是有理数
      const [p, q] = a.t;
      const conj = { k: 's', t: [p, { m: q.m, c: qneg(q.c) }] };
      const den = exMul(a, conj);
      if (!den || !isRat(den) || isZero(den)) return null;
      return exMul(conj, exQ(qinv(ratOf(den))));
    }
    return null;
  }
  function exSqrt(a) {
    if (!isRat(a)) return null;
    const r = ratOf(a);
    if (r.n === 0n) return ZERO;
    const sp = squarePart(r.n * r.d); // √(n/d) = √(nd)/d
    return sp && norm([{ m: sp[1], c: Q(sp[0], r.d) }]);
  }
  function exRoot(a, k) { // 有理数的 k 次方根（k 为正整数）
    if (!isRat(a)) return null;
    if (k === 1) return a;
    if (k === 2) return exSqrt(a);
    const r = ratOf(a);
    if (r.n < 0n && k % 2 === 0) fail('Math ERROR');
    const n = iroot(babs(r.n), k), d = iroot(r.d, k);
    if (n == null || d == null) return null;
    return exQ(Q(r.n < 0n ? -n : n, d));
  }
  function exPow(a, k) {
    if (k === 0) return exQ(Q(1n));
    if (k < 0) { const p = exPow(a, -k); return p && exInv(p); }
    if (a.k === 'p') return k === 1 ? a : null;
    let r = exQ(Q(1n)), b = a;
    while (k > 0 && r && b) { if (k & 1) r = exMul(r, b); k >>= 1; if (k) b = exMul(b, b); }
    return r;
  }
  const exVal = x => (x.k === 'p' ? qnum(x.c) * Math.PI : x.t.reduce((s, { m, c }) => s + qnum(c) * Math.sqrt(Number(m)), 0));

  /* ---------- 值：{ v: 浮点, x: 精确形式或 null } ---------- */
  function V(v, x = null) { if (!Number.isFinite(v)) fail('Math ERROR'); return { v, x }; }
  const mk = (x, v) => (x ? V(exVal(x), x) : V(v));
  const fromQ = q => mk(exQ(q), 0);
  const int = n => fromQ(Q(BigInt(n)));
  const ONE = int(1), ZEROV = int(0), PI = mk({ k: 'p', c: Q(1n) }, 0), E = V(Math.E);
  const exactZero = a => (a.x ? isZero(a.x) : a.v === 0);
  const ratVal = a => (a.x && isRat(a.x) ? ratOf(a.x) : null);
  const intVal = a => { const r = ratVal(a); return r && r.d === 1n ? r.n : null; };
  function literal(s) { // "1328.54" → 132854/100
    const [ip, fp = ''] = s.split('.');
    return fromQ(Q(BigInt((ip || '0') + fp), 10n ** BigInt(fp.length)));
  }

  const add = (a, b) => mk(a.x && b.x && exAdd(a.x, b.x), a.v + b.v);
  const neg = a => mk(a.x && exNeg(a.x), -a.v);
  const sub = (a, b) => add(a, neg(b));
  const mul = (a, b) => mk(a.x && b.x && exMul(a.x, b.x), a.v * b.v);
  function div(a, b) {
    if (exactZero(b)) fail('Math ERROR');
    const inv = b.x && exInv(b.x);
    return mk(a.x && inv && exMul(a.x, inv), a.v / b.v);
  }
  function pow(a, b) {
    const br = ratVal(b);
    if (br && br.d === 1n && babs(br.n) <= 1000n) {
      const k = Number(br.n);
      if (exactZero(a) && k <= 0) fail('Math ERROR');
      return mk(a.x && Math.abs(k) <= 64 && exPow(a.x, k), Math.pow(a.v, k));
    }
    if (br && a.x && isRat(a.x) && br.d <= 64n && babs(br.n) <= 64n) { // a^(p/q) = (q 次方根)^p
      const root = exRoot(a.x, Number(br.d));
      const x = root && exPow(root, Number(br.n));
      if (x) return mk(x, 0);
    }
    if (a.v < 0) {
      if (br && br.d % 2n === 1n) { const r = Math.pow(-a.v, qnum(br)); return V(br.n % 2n === 0n ? r : -r); }
      fail('Math ERROR');
    }
    if (a.v === 0 && b.v <= 0) fail('Math ERROR');
    return V(Math.pow(a.v, b.v));
  }
  function sqrt(a) {
    if (a.v < 0 && !exactZero(a)) fail('Math ERROR');
    return mk(a.x && exSqrt(a.x), Math.sqrt(Math.max(a.v, 0)));
  }
  const root = (a, n) => { if (exactZero(n)) fail('Math ERROR'); return pow(a, div(ONE, n)); };
  function abs(a) { return a.v < 0 ? neg(a) : a; }

  /* ---------- 三角函数：角度为 15° 的整数倍时给出精确值 ---------- */
  const SQ = (m, n, d) => ({ m: BigInt(m), c: Q(BigInt(n), BigInt(d)) });
  const SIN15 = [ZERO, norm([SQ(6, 1, 4), SQ(2, -1, 4)]), exQ(Q(1n, 2n)), norm([SQ(2, 1, 2)]), norm([SQ(3, 1, 2)]), norm([SQ(6, 1, 4), SQ(2, 1, 4)]), exQ(Q(1n))];
  function exSinDeg(q) {
    if (!q || q.d !== 1n || q.n % 15n !== 0n) return null;
    let k = Number((((q.n / 15n) % 24n) + 24n) % 24n), sgn = 1;
    if (k >= 12) { k -= 12; sgn = -1; }
    if (k > 6) k = 12 - k;
    return sgn < 0 ? exNeg(SIN15[k]) : SIN15[k];
  }
  const UNIT = { D: 180, R: Math.PI, G: 200 }; // 半圈对应的数值
  function exactDeg(a, unit) { // 角的精确度数（有理数）
    if (!a.x) return null;
    if (unit === 'D' && isRat(a.x)) return ratOf(a.x);
    if (unit === 'G' && isRat(a.x)) return qmul(ratOf(a.x), Q(9n, 10n));
    if (unit === 'R') { if (isZero(a.x)) return Q(0n); if (a.x.k === 'p') return qmul(a.x.c, Q(180n)); }
    return null;
  }
  const toRad = (a, unit) => (a.v * Math.PI) / UNIT[unit];
  function trig(fn, a, unit) {
    const dq = exactDeg(a, unit);
    if (dq && dq.d === 1n && dq.n % 15n === 0n) {
      const s = exSinDeg(dq), c = exSinDeg(qadd(dq, Q(90n)));
      if (fn === 'sin') return mk(s, 0);
      if (fn === 'cos') return mk(c, 0);
      if (isZero(c)) fail('Math ERROR');
      return div(mk(s, 0), mk(c, 0));
    }
    const r = toRad(a, unit);
    if (fn === 'tan' && Math.abs(Math.cos(r)) < 1e-15) fail('Math ERROR');
    return V(Math[fn](r));
  }
  function atrig(fn, a, unit) {
    const r = Math[fn](a.v);
    if (Number.isNaN(r)) fail('Math ERROR');
    const deg = (r * 180) / Math.PI;
    if (a.x) {
      const k = Math.round(deg / 15);
      if (Math.abs(deg - 15 * k) < 1e-9) {
        const dq = Q(BigInt(15 * k));
        const back = trig(fn.slice(1), fromQ(dq), 'D');
        if (Math.abs(back.v - a.v) <= 1e-13 * Math.max(1, Math.abs(a.v))) {
          if (unit === 'D') return fromQ(dq);
          if (unit === 'R') return k === 0 ? ZEROV : mk({ k: 'p', c: Q(BigInt(k), 12n) }, 0);
          return fromQ(qmul(dq, Q(10n, 9n)));
        }
      }
    }
    return V((r * UNIT[unit]) / Math.PI);
  }

  /* ---------- 对数、指数、阶乘、排列组合 ---------- */
  function logb(b, a) {
    if (a.v <= 0 || b.v <= 0 || b.v === 1) fail('Math ERROR');
    const r = Math.log(a.v) / Math.log(b.v);
    const ra = ratVal(a), rb = ratVal(b);
    if (ra && rb) for (let q = 1; q <= 6; q++) {
      const p = Math.round(r * q);
      if (Math.abs(r * q - p) < 1e-9 && Math.abs(p) <= 64) {
        const lhs = exPow(exQ(rb), p), rhs = exPow(exQ(ra), q); // b^p = a^q ⇔ log_b a = p/q
        if (lhs && rhs && isRat(lhs) && isRat(rhs)) { const l = ratOf(lhs), m = ratOf(rhs); if (l.n === m.n && l.d === m.d) return fromQ(Q(BigInt(p), BigInt(q))); }
      }
    }
    return V(r);
  }
  const TEN = int(10);
  const log10 = a => logb(TEN, a);
  function ln(a) { if (a.v <= 0) fail('Math ERROR'); const r = ratVal(a); return r && r.n === 1n && r.d === 1n ? ZEROV : V(Math.log(a.v)); }
  const expE = a => (exactZero(a) ? ONE : V(Math.exp(a.v)));
  function factorial(a) {
    const n = intVal(a);
    if (n == null || n < 0n || n > 69n) fail('Math ERROR');
    let r = 1n;
    for (let i = 2n; i <= n; i++) r *= i;
    return mk(exQ(Q(r)), Number(r));
  }
  function perm(a, b, comb) {
    const n = intVal(a), r = intVal(b);
    if (n == null || r == null || n < 0n || r < 0n || r > n || n >= 10n ** 10n) fail('Math ERROR');
    const k = comb && r > n - r ? n - r : r;
    if (k > 5000n) fail('Math ERROR');
    let p = 1n, f = 1n;
    for (let i = 0n; i < k; i++) { p *= n - i; if (comb) f *= i + 1n; }
    const q = Q(p / f);
    return mk(qbig(q) ? null : exQ(q), qnum(q));
  }
  function rnd(a) { return a.x ? a : V(+a.v.toPrecision(10)); }

  /* ---------- 数值微积分 ---------- */
  function snap(r) { const k = Math.round(r); return Math.abs(r - k) < 1e-9 * Math.max(1, Math.abs(r)) ? k : r; }
  function deriv(f, a) {
    const h = 1e-3 * Math.max(1, Math.abs(a));
    const D = s => (f(a + s) - f(a - s)) / (2 * s);
    const d1 = D(h), d2 = D(h / 2), d3 = D(h / 4);
    const r1 = (4 * d2 - d1) / 3, r2 = (4 * d3 - d2) / 3;
    return snap((16 * r2 - r1) / 15);
  }
  function integrate(f, a, b) {
    if (a === b) return 0;
    const simp = (x0, x1, f0, fm, f1) => ((x1 - x0) / 6) * (f0 + 4 * fm + f1);
    let budget = 200000;
    function rec(x0, x1, f0, fm, f1, whole, eps, depth) {
      const m = (x0 + x1) / 2, fl = f((x0 + m) / 2), fr = f((m + x1) / 2);
      const L = simp(x0, m, f0, fl, fm), R = simp(m, x1, fm, fr, f1);
      if (--budget < 0) fail('Time Out');
      if (depth <= 0 || Math.abs(L + R - whole) <= 15 * eps) return L + R + (L + R - whole) / 15;
      return rec(x0, m, f0, fl, fm, L, eps / 2, depth - 1) + rec(m, x1, fm, fr, f1, R, eps / 2, depth - 1);
    }
    const n = 8, w = (b - a) / n;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * w, x1 = x0 + w, f0 = f(x0), fm = f((x0 + x1) / 2), f1 = f(x1);
      s += rec(x0, x1, f0, fm, f1, simp(x0, x1, f0, fm, f1), 1e-13, 40);
    }
    return snap(s);
  }

  /* ---------- 词法 + 语法：编辑器的一行 → 求值函数 env => 值 ----------
   * 优先级（高 → 低）：括号/函数/模板，后缀（x² x⁻¹ ! % 乘方），(−)，nPr nCr，省略乘号，× ÷，+ −
   * implicitHigh：ES PLUS 的省略乘号优先于 × ÷；ClassWiz 与 × ÷ 同级、从左到右。 */
  const FUNCS = { 'sin(': 'sin', 'cos(': 'cos', 'tan(': 'tan', 'sin⁻¹(': 'asin', 'cos⁻¹(': 'acos', 'tan⁻¹(': 'atan', 'ln(': 'ln', 'log(': 'log', 'Abs(': 'abs', 'Rnd(': 'rnd', 'RanInt#(': 'ranint', 'f(': 'f', 'g(': 'g' };
  const VARS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'x', 'y', 'z', 'M']);
  function lex(row) {
    const out = [];
    for (let i = 0; i < row.length;) {
      const it = row[i];
      if (it.t === 'c' && /^[0-9.]$/.test(it.v)) {
        let s = '';
        while (i < row.length && row[i].t === 'c' && /^[0-9.]$/.test(row[i].v)) s += row[i++].v;
        if ((s.match(/\./g) || []).length > 1 || s === '.') fail('Syntax ERROR');
        out.push({ k: 'num', s });
        continue;
      }
      out.push(it.t === 'c' ? { k: 'sym', v: it.v } : { k: 'tpl', node: it });
      i++;
    }
    return out;
  }
  function compile(row, opt = {}) {
    const toks = lex(row);
    let i = 0;
    const peek = () => toks[i];
    const sym = v => { const t = toks[i]; return t && t.k === 'sym' && t.v === v; };
    const subrow = r => compile(r, opt);
    const need = r => { if (!r.length) fail('Syntax ERROR'); return subrow(r); };
    const closeParen = () => { if (sym(')')) i++; else if (i < toks.length && !sym(',')) fail('Syntax ERROR'); };
    function startsOperand() {
      const t = peek();
      if (!t) return false;
      if (t.k === 'num') return true;
      if (t.k === 'tpl') return !['pow', 'e10'].includes(t.node.t);
      return t.v === '(' || t.v === 'neg' || t.v in FUNCS || VARS.has(t.v) || ['π', 'e', 'Ans', 'Ran#'].includes(t.v);
    }
    function expr() {
      let a = muldiv();
      for (;;) {
        if (sym('+')) { i++; const l = a, r = muldiv(); a = env => add(l(env), r(env)); }
        else if (sym('−')) { i++; const l = a, r = muldiv(); a = env => sub(l(env), r(env)); }
        else return a;
      }
    }
    function muldiv() {
      let a = implicit();
      for (;;) {
        const l = a;
        if (sym('×')) { i++; const r = implicit(); a = env => mul(l(env), r(env)); }
        else if (sym('÷')) { i++; const r = implicit(); a = env => div(l(env), r(env)); }
        else if (!opt.implicitHigh && startsOperand()) { const r = permc(); a = env => mul(l(env), r(env)); }
        else return a;
      }
    }
    function implicit() {
      let a = permc();
      while (opt.implicitHigh && startsOperand()) { const l = a, r = permc(); a = env => mul(l(env), r(env)); }
      return a;
    }
    function permc() {
      let a = unary();
      while (sym('nPr') || sym('nCr')) {
        const comb = toks[i++].v === 'nCr', l = a, r = unary();
        a = env => perm(l(env), r(env), comb);
      }
      return a;
    }
    function unary() {
      if (sym('neg') || sym('−')) { i++; const a = unary(); return env => neg(a(env)); }
      if (sym('+')) { i++; return unary(); }
      return postfix();
    }
    function postfix() {
      let a = atom();
      for (;;) {
        const t = peek(), l = a;
        if (t && t.k === 'tpl' && t.node.t === 'pow') { i++; const e = need(t.node.s[0]); a = env => pow(l(env), e(env)); }
        else if (sym('!')) { i++; a = env => factorial(l(env)); }
        else if (sym('%')) { i++; a = env => div(l(env), int(100)); }
        else return a;
      }
    }
    function number() {
      const t = toks[i++];
      let a = literal(t.s);
      const n = peek();
      if (n && n.k === 'tpl' && n.node.t === 'e10') { i++; const e = need(n.node.s[0]); const base = a; return env => mul(base, pow(TEN, e(env))); }
      if (sym('°')) { // 度分秒：12°30°15° = 12 + 30/60 + 15/3600
        i++;
        let parts = [a], k = 60;
        while (peek() && peek().k === 'num' && toks[i + 1] && toks[i + 1].k === 'sym' && toks[i + 1].v === '°' && parts.length < 3) { parts.push(div(literal(toks[i].s), int(k))); k *= 60; i += 2; }
        const s = parts.reduce(add);
        return () => s;
      }
      return () => a;
    }
    function atom() {
      const t = peek();
      if (!t) fail('Syntax ERROR');
      if (t.k === 'num') return number();
      if (t.k === 'tpl') { i++; return template(t.node); }
      const v = t.v;
      i++;
      if (v === '(') { const a = expr(); closeParen(); return a; }
      if (v in FUNCS) {
        const name = FUNCS[v], a = expr();
        let b = null;
        if (sym(',')) { i++; b = expr(); }
        closeParen();
        return env => call(name, a(env), b && b(env), env);
      }
      if (v === 'π') return () => PI;
      if (v === 'e') return () => E;
      if (v === 'Ans') return env => env.ans;
      if (v === 'Ran#') return () => fromQ(Q(BigInt(Math.floor(Math.random() * 1000)), 1000n));
      if (VARS.has(v)) return env => env.vars[v];
      fail('Syntax ERROR');
    }
    function template(n) {
      const s = n.s;
      switch (n.t) {
        case 'frac': { const a = need(s[0]), b = need(s[1]); return env => div(a(env), b(env)); }
        case 'mixfrac': { const w = need(s[0]), a = need(s[1]), b = need(s[2]); return env => { const W = w(env), F = div(a(env), b(env)); return W.v < 0 ? sub(W, F) : add(W, F); }; }
        case 'sqrt': { const a = need(s[0]); return env => sqrt(a(env)); }
        case 'root': { const k = need(s[0]), a = need(s[1]); return env => root(a(env), k(env)); }
        case 'logb': { const b = need(s[0]), a = need(s[1]); return env => logb(b(env), a(env)); }
        case 'p10': { const e = need(s[0]); return env => pow(TEN, e(env)); }
        case 'pe': { const e = need(s[0]); return env => expE(e(env)); }
        case 'abs': { const a = need(s[0]); return env => abs(a(env)); }
        case 'ddx': {
          const f = need(s[0]), at = need(s[1]);
          return env => { const a = at(env).v; return V(deriv(x => f(withX(env, V(x))).v, a)); };
        }
        case 'int': {
          const f = need(s[0]), lo = need(s[1]), hi = need(s[2]);
          return env => V(integrate(x => f(withX(env, V(x))).v, lo(env).v, hi(env).v));
        }
        case 'sum': {
          const f = need(s[0]), lo = need(s[1]), hi = need(s[2]);
          return env => {
            const a = intVal(lo(env)), b = intVal(hi(env));
            if (a == null || b == null || b < a || b - a > 100000n) fail('Math ERROR');
            let acc = ZEROV;
            for (let k = a; k <= b; k++) acc = add(acc, f(withX(env, fromQ(Q(k)))));
            return acc;
          };
        }
      }
      fail('Syntax ERROR');
    }
    const fn = toks.length ? expr() : null;
    if (!fn || i < toks.length) fail('Syntax ERROR');
    return fn;
  }
  const withX = (env, x) => ({ ...env, vars: { ...env.vars, x } });
  function call(name, a, b, env) {
    switch (name) {
      case 'sin': case 'cos': case 'tan': return trig(name, a, env.angle);
      case 'asin': case 'acos': case 'atan': return atrig(name, a, env.angle);
      case 'ln': return ln(a);
      case 'log': return b ? logb(a, b) : log10(a);
      case 'abs': return abs(a);
      case 'rnd': return rnd(a);
      case 'ranint': {
        const lo = intVal(a), hi = b && intVal(b);
        if (lo == null || hi == null || hi < lo) fail('Math ERROR');
        return fromQ(Q(lo + BigInt(Math.floor(Math.random() * Number(hi - lo + 1n)))));
      }
      case 'f': case 'g': {
        const body = env.fns && env.fns[name];
        if (!body) fail('Math ERROR');
        return body(withX(env, a));
      }
    }
    fail('Syntax ERROR');
  }

  /* ---------- 方程 ---------- */
  function quadratic(a, b, c) {
    if (exactZero(a)) fail('Math ERROR');
    const D = sub(mul(b, b), mul(int(4), mul(a, c)));
    const two_a = mul(int(2), a), mb = neg(b);
    const vx = div(mb, two_a), vy = sub(c, div(mul(b, b), mul(int(4), a)));
    const ext = { x: vx, y: vy, min: a.v > 0 };
    if (D.v < 0 && !exactZero(D)) {
      const im = div(sqrt(neg(D)), two_a);
      return { roots: [{ re: vx, im: abs(im) }, { re: vx, im: neg(abs(im)) }], ext };
    }
    if (exactZero(D) || Math.abs(D.v) < 1e-14 * Math.max(1, b.v * b.v)) return { roots: [{ re: vx }], ext };
    const s = sqrt(D);
    const r = [div(add(mb, s), two_a), div(sub(mb, s), two_a)];
    if (r[1].v > r[0].v) r.reverse();
    return { roots: r.map(re => ({ re })), ext };
  }
  function cubic(a, b, c, d) {
    if (exactZero(a)) fail('Math ERROR');
    const cs = [a, b, c, d].map(ratVal);
    if (cs.every(Boolean)) { // 有理根：p | 常数项分子·…，用整系数多项式找
      const L = cs.reduce((m, q) => (m * q.d) / gcd(m, q.d), 1n);
      const z = cs.map(q => (q.n * L) / q.d);
      const divs = n => { n = babs(n); const o = []; if (n === 0n || n > 10n ** 7n) return o; for (let k = 1n; k * k <= n; k++) if (n % k === 0n) { o.push(k); if (k * k !== n) o.push(n / k); } return o; };
      if (z[3] === 0n) return finish(fromQ(Q(0n)));
      for (const p of divs(z[3])) for (const q of divs(z[0])) for (const s of [p, -p]) {
        const r = Q(s, q);
        const val = z.reduce((acc, k) => qadd(qmul(acc, r), Q(k)), Q(0n));
        if (val.n === 0n) return finish(fromQ(r));
      }
    }
    // 数值：Durand–Kerner
    const A = [b.v / a.v, c.v / a.v, d.v / a.v];
    let z = [{ re: 0.4, im: 0.9 }, { re: -0.65, im: 0.72 }, { re: 0.81, im: -0.31 }];
    const cmul = (p, q) => ({ re: p.re * q.re - p.im * q.im, im: p.re * q.im + p.im * q.re });
    const cdiv = (p, q) => { const n = q.re * q.re + q.im * q.im; return { re: (p.re * q.re + p.im * q.im) / n, im: (p.im * q.re - p.re * q.im) / n }; };
    const P = x => { let r = { re: 1, im: 0 }; for (const k of A) r = { re: cmul(r, x).re + k, im: cmul(r, x).im }; return r; };
    for (let it = 0; it < 500; it++) {
      z = z.map((zi, j) => {
        let den = { re: 1, im: 0 };
        z.forEach((zk, k) => { if (k !== j) den = cmul(den, { re: zi.re - zk.re, im: zi.im - zk.im }); });
        const w = cdiv(P(zi), den);
        return { re: zi.re - w.re, im: zi.im - w.im };
      });
    }
    const roots = z.map(r => (Math.abs(r.im) < 1e-10 ? { re: V(snapRoot(r.re)) } : { re: V(r.re), im: V(r.im) }));
    roots.sort((p, q) => (!!p.im - !!q.im) || (q.re.v - p.re.v) || ((q.im ? q.im.v : 0) - (p.im ? p.im.v : 0)));
    return { roots };
    function finish(r0) { // 用已知根降次：a x³ + b x² + c x + d = (x − r)(a x² + b' x + c')
      const b2 = add(b, mul(a, r0)), c2 = add(c, mul(b2, r0));
      const q = quadratic(a, b2, c2).roots;
      const all = [{ re: r0 }, ...q];
      const real = all.filter(r => !r.im).sort((p, s) => s.re.v - p.re.v);
      const uniq = real.filter((r, k) => k === 0 || Math.abs(r.re.v - real[k - 1].re.v) > 1e-12);
      return { roots: [...uniq, ...all.filter(r => r.im)] };
    }
  }
  const snapRoot = r => { const k = Math.round(r * 1e9) / 1e9; return Math.abs(k - r) < 1e-11 ? k : r; };
  function simul(M) { // M：n 行 × (n+1) 列（最后一列为常数），克拉默法则
    const n = M.length;
    const det = m => {
      if (m.length === 1) return m[0][0];
      if (m.length === 2) return sub(mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]));
      let s = ZEROV;
      m[0].forEach((v, j) => { const minor = m.slice(1).map(r => r.filter((_, k) => k !== j)); const t = mul(v, det(minor)); s = j % 2 ? sub(s, t) : add(s, t); });
      return s;
    };
    const A = M.map(r => r.slice(0, n)), D = det(A);
    if (exactZero(D) || Math.abs(D.v) < 1e-12) return null;
    return A.map((_, j) => div(det(A.map((r, i) => r.map((v, k) => (k === j ? M[i][n] : v)))), D));
  }
  function solve(f, x0) { // f(x) = 0 的数值解（割线法 + 扫描兜底）
    const F = x => { try { return f(x); } catch (e) { return NaN; } };
    const tryFrom = (a, b) => {
      let fa = F(a), fb = F(b);
      for (let k = 0; k < 200; k++) {
        if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
        if (fb === 0) return b;
        const c = b - (fb * (b - a)) / (fb - fa);
        if (!Number.isFinite(c)) return null;
        a = b; fa = fb; b = c; fb = F(b);
        if (Math.abs(b - a) < 1e-14 * Math.max(1, Math.abs(b))) return Math.abs(fb) < 1e-8 * Math.max(1, Math.abs(b)) ? b : null;
      }
      return null;
    };
    let r = tryFrom(x0, x0 + Math.max(1e-3, Math.abs(x0) * 1e-3));
    for (let s = 1; r == null && s <= 1e6; s *= 4) r = tryFrom(x0 + s, x0 - s) ?? tryFrom(x0 - s, x0 + 2 * s);
    if (r == null) fail("Can't Solve");
    return snapRoot(r);
  }

  /* ---------- 显示 ---------- */
  const minus = s => s.replace(/-/g, '−');
  function fmtDec(v, sig = 10) {
    if (v === 0 || Object.is(v, -0)) return '0';
    const a = Math.abs(v);
    let r = +a.toPrecision(sig), s;
    if (r >= 1e10 || r < 0.01) {
      const [m, e] = r.toExponential(sig - 1).split('e');
      s = `${String(+m)}×10\\p{${minus(e.replace('+', ''))}}`;
    } else s = String(r);
    return (v < 0 ? '−' : '') + s;
  }
  function fmtQ(q) {
    const sg = q.n < 0n ? '−' : '', n = babs(q.n);
    if (q.d === 1n) return n < 10n ** 10n ? sg + n : null;
    return digits(n) + digits(q.d) <= 10 ? `${sg}\\f{${n}}{${q.d}}` : null;
  }
  function fmtExact(x) {
    if (x.k === 'p') {
      const { n, d } = x.c, sg = n < 0n ? '−' : '', N = babs(n);
      if (digits(N) + digits(d) > 6) return null;
      const top = (N === 1n ? '' : String(N)) + 'π';
      return d === 1n ? sg + top : `${sg}\\f{${top}}{${d}}`;
    }
    if (isRat(x)) return fmtQ(ratOf(x));
    if (x.t.length > 2) return null;
    const L = x.t.reduce((m, { c }) => (m * c.d) / gcd(m, c.d), 1n);
    const terms = x.t.map(({ m, c }) => ({ m, A: (c.n * L) / c.d }));
    if (L >= 100n || terms.some(t => babs(t.A) >= 1000n || t.m >= 1000n)) return null;
    const term = ({ m, A }, first) => {
      const sg = A < 0n ? '−' : first ? '' : '+', a = babs(A);
      return m === 1n ? sg + a : sg + (a === 1n ? '' : a) + `\\r{${m}}`;
    };
    if (L === 1n) return terms.map((t, k) => term(t, k === 0)).join('');
    if (terms.length === 1 && terms[0].A < 0n) return '−' + `\\f{${term({ m: terms[0].m, A: -terms[0].A }, true)}}{${L}}`;
    return `\\f{${terms.map((t, k) => term(t, k === 0)).join('')}}{${L}}`;
  }
  // dec：强制小数（S⇔D、≈、MathI/DecimalO）
  function display(val, dec = false) {
    if (!dec && val.x) { const s = fmtExact(val.x); if (s) return s; }
    return fmtDec(val.v);
  }
  const hasExactForm = val => !!(val.x && fmtExact(val.x) && fmtExact(val.x) !== fmtDec(val.v));

  return { CalcError, fail, compile, Q, V, fromQ, int, literal, ZERO: ZEROV, ONE, add, sub, mul, div, neg, pow, sqrt, display, fmtDec, hasExactForm, quadratic, cubic, simul, solve, isRatVal: a => !!ratVal(a) };
})();
if (typeof module !== 'undefined') module.exports = Engine;
