'use strict';
/* 计算器状态机：一个 Calc 实例就是一台计算器（机型、屏幕、变量、设置）。
 * 自由模式由点击驱动；按法演示和练习提示由 runScript 把按键序列喂给它，逐步截下屏幕。 */

const CURSOR = '<span class="cur"></span>';
// 根号：可随内容拉伸的 √ 折线
const RAD = '<svg class="rad" viewBox="0 0 10 24" preserveAspectRatio="none" aria-hidden="true"><path d="M0.6 14.5 L3 13 L6 23 L9.6 0.8" fill="none" stroke="currentColor" stroke-width="1.3" vector-effect="non-scaling-stroke"/></svg>';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const VAR_NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'x', 'y', 'z', 'M'];
for (const v of VAR_NAMES) { FN['to' + v] = [`存入变量 ${v}`, '→' + v]; FN['rc' + v] = [`调出变量 ${v} 的值`, v]; }
const FN_OF_VAR = { A: 'varA', B: 'varB', C: 'varC', D: 'varD', E: 'varE', F: 'varF', x: 'x', y: 'y', z: 'z', M: 'varM' };
const VAR_OF_FN = Object.fromEntries(Object.entries(FN_OF_VAR).map(([v, f]) => [f, v]));
const RENDER = { x: 'x' }; // 当前机型的变量 x 写法（ES PLUS 显示为 X）

/* ---------- 自然显示编辑器 ---------- */
const C = v => ({ t: 'c', v });
function mkTpl(kind) {
  if (kind === 'cbrt') return { t: 'root', s: [[C('3')], []], lock: true };
  const n = { frac: 2, root: 2, logb: 2, ddx: 2, int: 3, sum: 3, mixfrac: 3 }[kind] || 1;
  return { t: kind, s: Array.from({ length: n }, () => []) };
}
const clone = row => JSON.parse(JSON.stringify(row));
class Editor {
  constructor(prefix = '') { this.prefix = prefix; this.clear(); }
  clear() { this.root = []; this.row = this.root; this.idx = 0; this.stack = []; this.done = false; }
  load(row) { this.clear(); this.root = clone(row); this.row = this.root; this.idx = this.root.length; }
  ins(it) { this.row.splice(this.idx, 0, it); this.idx++; }
  enter(node, pos, slot, atEnd) {
    this.stack.push({ row: this.row, pos, node, slot });
    this.row = node.s[slot];
    this.idx = atEnd ? this.row.length : 0;
  }
  tpl(node) { this.row.splice(this.idx, 0, node); this.enter(node, this.idx, node.lock ? 1 : 0); }
  right() {
    const it = this.row[this.idx];
    if (it) {
      if (it.t !== 'c' && !it.fixed) this.enter(it, this.idx, it.lock ? 1 : 0); else this.idx++;
      return;
    }
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    if (top.slot < top.node.s.length - 1) { top.slot++; this.row = top.node.s[top.slot]; this.idx = 0; }
    else { this.stack.pop(); this.row = top.row; this.idx = top.pos + 1; }
  }
  left() {
    if (this.idx > 0) {
      const it = this.row[this.idx - 1];
      if (it.t !== 'c' && !it.fixed) this.enter(it, this.idx - 1, it.s.length - 1, true); else this.idx--;
      return;
    }
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    if (top.slot > (top.node.lock ? 1 : 0)) { top.slot--; this.row = top.node.s[top.slot]; this.idx = this.row.length; }
    else { this.stack.pop(); this.row = top.row; this.idx = top.pos; }
  }
  vert(dir) { // 1 = ▼（分子 → 分母），-1 = ▲
    for (let j = this.stack.length - 1; j >= 0; j--) {
      const f = this.stack[j], last = f.node.s.length - 1;
      if (['frac', 'mixfrac'].includes(f.node.t) && (dir > 0 ? f.slot < last && f.slot >= last - 1 : f.slot === last)) {
        this.stack.length = j + 1;
        f.slot += dir;
        this.row = f.node.s[f.slot];
        this.idx = this.row.length;
        return;
      }
    }
  }
  del() { if (this.idx > 0) { this.row.splice(this.idx - 1, 1); this.idx--; } }
  cursor() { return this.done ? null : { row: this.row, idx: this.idx }; }
}

/* 按键 → 编辑器操作 */
const INPUT = {
  dot: ['ch', '.'], add: ['opr', '+'], sub: ['opr', '−'], mul: ['opr', '×'], div: ['opr', '÷'], lp: ['ch', '('], rp: ['ch', ')'], comma: ['ch', ','], neg: ['ch', 'neg'],
  frac: ['tpl', 'frac'], mixfrac: ['tpl', 'mixfrac'], sqrt: ['tpl', 'sqrt'], cbrt: ['tpl', 'cbrt'], rt: ['tpl', 'root'], pow: ['tpl', 'pow'], logb: ['tpl', 'logb'],
  p10: ['tpl', 'p10'], pe: ['tpl', 'pe'], abs: ['tpl', 'abs'], ddx: ['tpl', 'ddx'], int: ['tpl', 'int'], sum: ['tpl', 'sum'], e10: ['tpl', 'e10'],
  sq: ['post', ['2']], cube: ['post', ['3']], inv: ['post', ['neg', '1']], fact: ['opr', '!'], pct: ['opr', '%'], dms: ['opr', '°'],
  log: ['ch', 'log('], ln: ['ch', 'ln('], sin: ['ch', 'sin('], cos: ['ch', 'cos('], tan: ['ch', 'tan('], asin: ['ch', 'sin⁻¹('], acos: ['ch', 'cos⁻¹('], atan: ['ch', 'tan⁻¹('],
  rnd: ['ch', 'Rnd('], ranint: ['ch', 'RanInt#('], ran: ['ch', 'Ran#'], pi: ['ch', 'π'], e: ['ch', 'e'], ans: ['ch', 'Ans'],
  npr: ['opr', 'nPr'], ncr: ['opr', 'nCr'], eqsign: ['ch', '='], fx: ['ch', 'f('], gx: ['ch', 'g('],
};
for (const d of '0123456789') INPUT[d] = ['ch', d];
for (const [v, f] of Object.entries(FN_OF_VAR)) INPUT[f] = ['ch', v];
// 线性输入（LineI/LineO、LineI/DecimalO）：没有模板，全部打成一行字符
const INPUT_LINE = {
  ...INPUT,
  frac: ['opr', '⌟'], mixfrac: ['opr', '⌟'], sqrt: ['ch', '√('], cbrt: ['ch', '∛('], rt: ['opr', 'ˣ√('], pow: ['opr', '^('],
  sq: ['opr', '²'], cube: ['opr', '³'], inv: ['opr', '⁻¹'], logb: ['ch', 'log('], p10: ['ch', '10^('], pe: ['ch', 'e^('], e10: ['ch', 'ᴇ'],
  abs: ['ch', 'Abs('], ddx: ['ch', 'd/dx('], int: ['ch', '∫('], sum: ['ch', 'Σ('],
};
function edInput(ed, fn, map = INPUT) {
  const op = map[fn];
  if (op[0] === 'post') ed.ins({ t: 'pow', s: [op[1].map(C)], fixed: true });
  else if (op[0] === 'tpl') ed.tpl(mkTpl(op[1]));
  else ed.ins(C(op[1]));
}
// 在输入行里处理输入、光标、删除；处理了返回 true
function editKey(ed, fn, map = INPUT) {
  if (map[fn]) { edInput(ed, fn, map); return true; }
  if (fn === 'R') ed.right(); else if (fn === 'L') ed.left(); else if (fn === 'D') ed.vert(1); else if (fn === 'U') ed.vert(-1); else if (fn === 'del') ed.del();
  else return false;
  return true;
}
function collectVars(row, out = []) {
  for (const it of row) {
    if (it.t === 'c') { if (VAR_NAMES.includes(it.v) && !out.includes(it.v)) out.push(it.v); }
    else it.s.forEach((s, k) => { if (!(['ddx', 'int', 'sum'].includes(it.t) && k === 0)) collectVars(s, out); });
  }
  return out;
}

/* ---------- 渲染：编辑器内容、结果记法 ---------- */
const ITAL = new Set(['x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'M', 'e']);
function ch(v) {
  if (v === 'neg') return '<span class="ng">−</span>';
  if (v === 'x') return `<i>${RENDER.x}</i>`;
  if (ITAL.has(v)) return `<i>${v}</i>`;
  if (['+', '−', '×', '÷'].includes(v)) return `<span class="op">${v}</span>`;
  if (v === 'nPr') return '<b class="pc">P</b>';
  if (v === 'nCr') return '<b class="pc">C</b>';
  if (v === 'f(' || v === 'g(') return `<i>${v[0]}</i>(`;
  if (v === '⌟') return '<span class="lf">⌟</span>';
  return esc(v);
}
function rr(row, cur, top = false) {
  const here = cur && cur.row === row;
  if (!row.length) return top ? (here ? CURSOR : '') : `<span class="ph">${here ? CURSOR : ''}</span>`;
  let h = '';
  row.forEach((it, i) => { if (here && cur.idx === i) h += CURSOR; h += rn(it, cur); });
  if (here && cur.idx === row.length) h += CURSOR;
  return h;
}
function rn(it, cur) {
  const r = k => rr(it.s[k], cur);
  const X = `<i>${RENDER.x}</i>`;
  switch (it.t) {
    case 'c': return ch(it.v);
    case 'frac': return `<span class="fr"><span class="fn">${r(0)}</span><span class="fd">${r(1)}</span></span>`;
    case 'mixfrac': return `${r(0)}<span class="fr"><span class="fn">${r(1)}</span><span class="fd">${r(2)}</span></span>`;
    case 'sqrt': return `<span class="sq">${RAD}<span class="sc">${r(0)}</span></span>`;
    case 'root': return `<span class="rt"><span class="ri">${r(0)}</span><span class="sq">${RAD}<span class="sc">${r(1)}</span></span></span>`;
    case 'pow': return `<sup class="pw">${r(0)}</sup>`;
    case 'logb': return `log<sub class="lb">${r(0)}</sub>(${r(1)})`;
    case 'p10': return `10<sup class="pw">${r(0)}</sup>`;
    case 'pe': return `<i>e</i><sup class="pw">${r(0)}</sup>`;
    case 'e10': return `<span class="x10">×10</span><sup class="pw">${r(0)}</sup>`;
    case 'abs': return `<span class="ab">${r(0)}</span>`;
    case 'ddx': return `<span class="fr dd"><span class="fn">d</span><span class="fd">d${X}</span></span>(${r(0)})<span class="at">|<sub>${X}=${r(1)}</sub></span>`;
    case 'int': return `<span class="ig"><span class="is">∫</span><span class="il"><span>${r(2)}</span><span>${r(1)}</span></span></span>${r(0)}<span class="dx">d${X}</span>`;
    case 'sum': return `<span class="sg"><span>${r(2)}</span><span class="ss">Σ</span><span>${X}=${r(1)}</span></span>(${r(0)})`;
  }
  return '';
}
/* 结果记法：\f{分子}{分母}、\r{根号内}、\p{指数} */
function md(src) {
  if (src == null) return '';
  let i = 0;
  const seq = () => {
    let h = '';
    while (i < src.length && src[i] !== '}') {
      if (src[i] === '\\') {
        const c = src[i + 1];
        i += 2;
        if (c === 'f') { const a = arg(), b = arg(); h += `<span class="fr"><span class="fn">${a}</span><span class="fd">${b}</span></span>`; }
        else if (c === 'r') h += `<span class="sq">${RAD}<span class="sc">${arg()}</span></span>`;
        else if (c === 'p') h += `<sup class="pw">${arg()}</sup>`;
      } else { h += esc(src[i]); i++; }
    }
    return h;
  };
  const arg = () => { i++; const h = seq(); i++; return h; };
  return seq();
}
const subN = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]);
const gloss = key => (GLOSS[key] ? `${key}（${GLOSS[key]}）` : key);

/* ---------- 计算器 ---------- */
class Calc {
  constructor(model) {
    this.m = model;
    this.vars = Object.fromEntries(VAR_NAMES.map(v => [v, Engine.ZERO]));
    this.ans = Engine.ZERO;
    this.angle = 'D';
    this.io = 'math'; // math = MathI/MathO，dec = MathI/DecimalO，line = LineI/LineO，linedec = LineI/DecimalO
    this.font = 'normal'; // MultiLine Font：线性显示时 normal 4 行、small 6 行
    this.hist = []; // 线性显示时屏幕上方的历史算式
    this.frows = { f: null, g: null };
    this.range = [Engine.int(1), Engine.int(5), Engine.int(1)];
    this.tbl = null;
    this.mod = null;
    this.pending = null;
    this.off = false;
    this.toCalc();
  }
  get opt() { return { implicitHigh: this.m.implicitHigh }; }
  get exe() { return this.m.exe; }
  get line() { return this.io === 'line' || this.io === 'linedec'; }
  get inmap() { return this.line ? INPUT_LINE : INPUT; }
  get decOut() { return this.io === 'dec' || this.io === 'linedec'; }
  // 换输入输出格式：真机会清屏，模板和线性两种写法不能混用
  setIO(io) {
    this.io = io;
    this.hist = [];
    let sc = this.scr;
    while (sc && sc.back && (sc.k === 'menu' || sc.k === 'msg')) sc = sc.back;
    if (sc && sc.k === 'edit') Object.assign(sc, this.editScr());
  }
  env() {
    const fns = {};
    for (const k of ['f', 'g']) if (this.frows[k]) { try { fns[k] = Engine.compile(this.frows[k], this.opt); } catch (e) { /* 定义有误时调用会报错 */ } }
    return { vars: this.vars, ans: this.ans, angle: this.angle, fns };
  }
  editScr() { return { k: 'edit', ed: new Editor(), res: null, dec: false }; }
  toCalc() { this.app = 'calc'; this.scr = this.editScr(); }
  msg(text) { this.scr = { k: 'msg', text, back: this.scr }; }
  fail(e, back) { if (!(e instanceof Engine.CalcError)) throw e; this.scr = { k: 'err', kind: e.kind, back }; }

  /* 实体键按下：返回这一步的说明 */
  press(id) {
    const key = this.m.keys[id];
    if (!key) return null;
    this.desc = null;
    if (this.off) {
      if (key.fn !== 'on') return { id, mod: null, fn: null, name: '已关机：按 ON 开机', chip: '' };
      this.off = false;
      this.toCalc();
      return this.result(id, null, 'on');
    }
    if (key.fn === 'shift' || key.fn === 'alpha') {
      const m = key.fn === 'shift' ? 'sh' : 'al';
      this.mod = this.mod === m ? null : m;
      return { id, modKey: true, mod: this.mod };
    }
    const mod = this.mod;
    this.mod = null;
    if (this.pending) {
      const v = VAR_OF_FN[key.al && key.al[0]] || VAR_OF_FN[key.fn];
      if (v) return this.result(id, mod, this.onPending(key, v));
      this.pending = null; // 不是变量键：取消 STO / RCL，照常处理这个键
    }
    const fn = mod ? key[mod] && key[mod][0] : key.fn;
    if (!fn) return { id, mod, fn: null, name: `${mod === 'sh' ? 'SHIFT' : 'ALPHA'} 加这个键没有功能`, chip: '' };
    this.dispatch(fn, key);
    return this.result(id, mod, fn);
  }
  result(id, mod, fn) {
    const info = FN[fn] || [fn, fn];
    return { id, mod, fn, name: this.desc || (this.m.names && this.m.names[fn]) || info[0], chip: (this.m.chips && this.m.chips[fn]) || info[1] };
  }
  dispatch(fn, key) {
    if (fn === 'on') { this.app === 'table' ? this.startTable() : this.toCalc(); return; }
    if (fn === 'off') { this.off = true; this.desc = 'SHIFT + AC = 关机，按 ON 重新开机'; return; }
    if (NA[fn] && this.scr.k !== 'menu') { this.msg(`还没做：${NA[fn]}`); return; }
    this['k_' + this.scr.k](fn, key);
  }
  onPending(key, v) {
    const p = this.pending;
    this.pending = null;
    if (p === 'sto') {
      const val = this.valueNow();
      if (!val) return 'to' + v;
      this.vars[v] = val;
      this.ans = val;
      this.scr = { k: 'stored', v, val };
      this.desc = `${key.face.replace(/<[^>]+>/g, '') || v} 键上的 ${v}：结果存入变量 ${v}`;
      return 'to' + v;
    }
    this.scr = this.editScr();
    this.scr.ed.ins(C(v));
    this.exec(false);
    return 'rc' + v;
  }
  // 当前结果；算式还没执行时先执行
  valueNow() {
    let sc = this.scr;
    while (sc && sc.k === 'menu') sc = sc.back;
    if (!sc || sc.k !== 'edit') return this.ans;
    if (sc.ed.done) return sc.res;
    if (!sc.ed.root.length) return this.ans;
    const keep = this.scr;
    this.scr = sc;
    this.exec(false);
    const ok = this.scr === sc && sc.ed.done ? sc.res : null;
    if (ok && keep !== sc) this.scr = keep;
    return ok;
  }

  /* ---- 计算画面 ---- */
  exec(dec) {
    const sc = this.scr, ed = sc.ed;
    if (!ed.root.length) return;
    try {
      const v = Engine.compile(ed.root, this.opt)(this.env());
      this.ans = v;
      sc.res = v;
      sc.dec = dec || this.decOut;
      ed.done = true;
      if (this.line) this.hist = [...this.hist.slice(-9), { root: clone(ed.root), val: v, dec: sc.dec }];
    } catch (e) { this.fail(e, sc); }
  }
  input(fn) {
    const sc = this.scr, ed = sc.ed, op = this.inmap[fn];
    if (ed.done) {
      // 算完后直接按运算符，自动接上 Ans；按别的键则开始新算式
      const fromAns = op[0] === 'opr' || op[0] === 'post' || (op[0] === 'tpl' && op[1] === 'pow');
      ed.clear();
      sc.res = null;
      sc.dec = false;
      if (fromAns) ed.ins(C('Ans'));
    }
    edInput(ed, fn, this.inmap);
  }
  reopen(atEnd) {
    const sc = this.scr, ed = sc.ed;
    ed.done = false;
    sc.res = null;
    ed.row = ed.root;
    ed.stack = [];
    ed.idx = atEnd ? ed.root.length : 0;
  }
  k_edit(fn) {
    const sc = this.scr, ed = sc.ed;
    if (this.inmap[fn]) { this.input(fn); return; }
    switch (fn) {
      case 'eq': this.exec(false); return;
      case 'approx': this.exec(true); return;
      case 'sd':
        if (!ed.done) this.exec(false);
        if (this.scr === sc && ed.done && sc.res && (this.line ? Engine.hasLineForm(sc.res) : Engine.hasExactForm(sc.res))) {
          sc.dec = !sc.dec;
          if (this.line && this.hist.length) this.hist[this.hist.length - 1].dec = sc.dec;
          this.desc = sc.dec ? 'S⇔D：换成小数' : this.line ? 'S⇔D：换回分数' : 'S⇔D：换回分数 / 根式';
        }
        return;
      case 'R': case 'L':
        if (ed.done) this.reopen(fn === 'L'); else if (fn === 'R') ed.right(); else ed.left();
        return;
      case 'U': case 'D': if (!ed.done) ed.vert(fn === 'D' ? 1 : -1); return;
      case 'del': if (ed.done) this.reopen(true); else ed.del(); return;
      case 'ac': sc.ed = new Editor(); sc.res = null; sc.dec = false; this.hist = []; return;
      case 'menu': this.openMenu('main'); return;
      case 'setup': this.openMenu('setup'); return;
      case 'calc': this.startCalc(); return;
      case 'solve': this.startSolve(); return;
      case 'sto': case 'rcl': this.pending = fn; this.desc = fn === 'sto' ? `${FN.sto[0]}：接着按变量所在的键` : `${FN.rcl[0]}：接着按变量所在的键`; return;
      case 'recall': this.scr = { k: 'vars', back: sc }; return;
      case 'mplus': case 'mminus': {
        const v = this.valueNow();
        if (!v) return;
        this.vars.M = fn === 'mplus' ? Engine.add(this.vars.M, v) : Engine.sub(this.vars.M, v);
        this.desc = `${fn === 'mplus' ? 'M+' : 'M−'}：M = ${Engine.display(this.vars.M, true).replace(/\\p\{([^}]*)\}/, '^$1')}`;
        return;
      }
      case 'var': this.openMenu('var'); return;
      case 'func': this.openMenu('func'); return;
      case 'catalog': this.openMenu('catalog'); return;
      case 'tools': this.msg('还没做：Calculate 里的 TOOLS 菜单'); return;
      case 'format': if (ed.done && sc.res) this.openMenu('format'); return;
    }
  }
  k_stored(fn, key) { // STO 之后：屏幕像刚算完一样，可以接着按运算符
    const sc = this.editScr();
    sc.ed.ins(C('Ans'));
    sc.ed.done = true;
    sc.res = this.scr.val;
    this.scr = sc;
    this.k_edit(fn, key);
  }
  k_msg() { this.scr = this.scr.back; this.desc = '回到原来的画面'; }
  k_err(fn) {
    const sc = this.scr;
    if (fn === 'ac') { if (this.app === 'table') this.startTable(); else this.toCalc(); this.desc = 'AC：清除，重新输入'; }
    else if (fn === 'L' || fn === 'R') { this.scr = sc.back; this.reopen(fn === 'L'); this.desc = '回到算式修改'; }
  }

  /* ---- 菜单 ---- */
  menuDef(name) {
    if (name === 'var') {
      return { kind: 'list', title: 'VARIABLE', items: ['A', 'B', 'C', 'D', 'E', 'F', 'x', 'y', 'z'].map(v => ({ key: `${v}=`, act: 'var:' + v, lab: `${/[xyz]/.test(v) ? `<i>${v}</i>` : v}=<span class="vv">${md(Engine.display(this.vars[v]))}</span>` })) };
    }
    if (name.startsWith('varsub:')) { const v = name.slice(7); return { kind: 'list', title: `${v}=`, items: [T('Store', 'varsto:' + v), T('Recall', 'varrcl:' + v)] }; }
    if (name === 'format') return { kind: 'list', title: 'FORMAT', items: [T('Standard', 'fmt:std'), T('Decimal', 'fmt:dec')] };
    return this.m.menus[name];
  }
  openMenu(name) {
    const def = this.menuDef(name);
    if (!def) { this.msg(`还没做：${name}`); return; }
    let sel = 0;
    if (name === 'main') sel = Math.max(0, def.items.findIndex(it => it.act === 'app:' + this.app || (this.app === 'eqn' && it.act === 'menu:eqn')));
    if (def.mark) sel = Math.max(0, def.items.findIndex(it => it.act === this.markOf(def)));
    this.scr = { k: 'menu', name, sel, back: this.scr };
  }
  markOf(def) { return `${def.mark}:${{ io: this.io, angle: this.angle, font: this.font }[def.mark]}`; }
  // fx-991EX 的 SETUP 每屏 4 项、每屏重新从 1 编号，▲▼ 翻屏
  pageOf(def, j) { return def.perPage ? Math.floor(j / def.perPage) : 0; }
  exitMenus() { while (this.scr.k === 'menu' || this.scr.k === 'msg') this.scr = this.scr.back; return this.scr; }
  k_menu(fn, key) {
    const sc = this.scr, def = this.menuDef(sc.name), items = def.items;
    if (def.num) {
      const n = /^[0-9]$/.test(fn) ? fn : VAR_OF_FN[key.al && key.al[0]];
      const page = this.pageOf(def, sc.sel);
      const j = n ? items.findIndex((it, k) => it.n === n && this.pageOf(def, k) === page) : -1;
      if (j >= 0) { sc.sel = j; this.desc = `${n}：${gloss(items[j].key)}`; this.act(items[j]); return; }
      if (/^[0-9]$/.test(fn)) return;
      if (def.perPage && (fn === 'U' || fn === 'D')) {
        const last = this.pageOf(def, items.length - 1), p = Math.min(Math.max(page + (fn === 'D' ? 1 : -1), 0), last);
        sc.sel = p * def.perPage;
        this.desc = `${fn === 'D' ? '▼' : '▲'} 翻到第 ${p + 1} 屏`;
        return;
      }
    }
    const cols = def.kind === 'icons' ? def.cols : def.kind === 'text2' ? 2 : 1;
    const move = d => {
      const j = sc.sel + d;
      if (j >= 0 && j < items.length) sc.sel = j;
      this.desc = `光标移到 ${gloss(items[sc.sel].key)}`;
    };
    switch (fn) {
      case 'U': move(-cols); return;
      case 'D': move(cols); return;
      case 'L': if (cols > 1) move(-1); return;
      case 'R': if (cols > 1) move(1); return;
      case 'pgup': move(-cols * (def.rows || 4)); return;
      case 'pgdn': move(cols * (def.rows || 4)); return;
      case 'eq': case 'ok': this.desc = `${fn === 'ok' ? 'OK' : this.exe}：选择 ${gloss(items[sc.sel].key)}`; this.act(items[sc.sel]); return;
      case 'ac': this.exitMenus(); this.desc = 'AC：退出菜单'; return;
      case 'back': this.scr = sc.back; this.desc = '返回上一级'; return;
      case 'menu': this.exitMenus(); if (sc.name !== 'main') this.openMenu('main'); return;
      case 'setup': this.exitMenus(); this.openMenu('setup'); return;
    }
  }
  act(item) {
    const [a, arg] = item.act.split(':');
    switch (a) {
      case 'na': this.msg(`还没做：${item.key}`); return;
      case 'menu': this.openMenu(arg); return;
      case 'app': this.exitMenus(); if (arg === 'table') this.startTable(); else this.toCalc(); return;
      case 'angle': case 'io': case 'font':
        if (a === 'angle') this.angle = arg; else if (a === 'io') this.setIO(arg); else this.font = arg;
        if (this.m.id === 'cw') { this.scr = this.scr.back; return; } // ClassWiz CW：回到上一级列表，按 AC 退出
        this.exitMenus();
        if (this.app === 'calc') this.toCalc();
        return;
      case 'poly': case 'sim': this.exitMenus(); this.startCoef(a, +arg); return;
      case 'ins': this.exitMenus(); this.dispatch(arg, {}); return;
      case 'fdef': { const back = this.exitMenus(); this.startFdef(arg, back); return; }
      case 'var': this.openMenu('varsub:' + arg); return;
      case 'varsto': {
        this.exitMenus();
        const v = this.valueNow();
        if (v) { this.vars[arg] = v; this.desc = `Store：结果存入变量 ${arg}`; }
        return;
      }
      case 'varrcl': this.exitMenus(); this.dispatch(FN_OF_VAR[arg], {}); return;
      case 'fmt': {
        const sc = this.exitMenus();
        if (sc.k === 'edit' || sc.k === 'eqres') sc.dec = arg === 'dec';
        if (sc.k === 'edit' && this.line && this.hist.length) this.hist[this.hist.length - 1].dec = sc.dec;
        return;
      }
      case 'range': this.exitMenus(); this.startRange(); return;
      case 'recalc': this.exitMenus(); this.genTable(); return;
    }
  }

  /* ---- 方程：系数输入 → 解 ---- */
  startCoef(type, n) {
    this.app = 'eqn';
    const rows = type === 'poly' ? 1 : n, cols = n + 1;
    this.scr = { k: 'coef', type, n, rows, cols, vals: Array.from({ length: rows }, () => Array(cols).fill(Engine.ZERO)), r: 0, c: 0, ed: null };
  }
  coefLabel(sc, r, c) { return sc.type === 'poly' ? 'abcde'[c] : 'abcd'[c] + subN(r + 1); }
  k_coef(fn) {
    const sc = this.scr;
    if (this.inmap[fn] || (sc.ed && ['L', 'R', 'del'].includes(fn))) { if (!sc.ed) sc.ed = new Editor(); editKey(sc.ed, fn, this.inmap); return; }
    const commit = () => {
      if (!sc.ed || !sc.ed.root.length) { sc.ed = null; return true; }
      try { sc.vals[sc.r][sc.c] = Engine.compile(sc.ed.root, this.opt)(this.env()); } catch (e) { this.fail(e, sc); sc.ed = null; return false; }
      this.desc = `${this.exe}：确认 ${this.coefLabel(sc, sc.r, sc.c)} = ${Engine.display(sc.vals[sc.r][sc.c], true).replace(/\\p\{([^}]*)\}/, '^$1')}`;
      sc.ed = null;
      return true;
    };
    const go = (r, c) => { if (r >= 0 && r < sc.rows && c >= 0 && c < sc.cols) { sc.r = r; sc.c = c; } };
    switch (fn) {
      case 'eq': case 'ok':
        if (sc.ed) { if (commit()) { if (sc.c < sc.cols - 1) go(sc.r, sc.c + 1); else go(sc.r + 1, 0); } return; }
        this.solveCoef();
        return;
      case 'U': commit(); go(sc.r - 1, sc.c); return;
      case 'D': commit(); go(sc.r + 1, sc.c); return;
      case 'L': go(sc.r, sc.c - 1); return;
      case 'R': go(sc.r, sc.c + 1); return;
      case 'ac':
        if (sc.ed) sc.ed = null; else { sc.vals = sc.vals.map(r => r.map(() => Engine.ZERO)); this.desc = 'AC：系数全部清零'; }
        return;
      case 'menu': this.openMenu('main'); return;
      case 'setup': this.openMenu('setup'); return;
      case 'back': this.openMenu(sc.type === 'poly' ? 'poly' : 'simul'); return;
    }
  }
  solveCoef() {
    const sc = this.scr, X = this.m.xName || 'x', items = [];
    try {
      if (sc.type === 'poly') {
        const v = sc.vals[0];
        const res = sc.n === 2 ? Engine.quadratic(v[0], v[1], v[2]) : Engine.cubic(v[0], v[1], v[2], v[3]);
        const one = res.roots.length === 1;
        res.roots.forEach((r, k) => items.push({ lab: `<i>${X}</i>${one ? '' : `<sub>${k + 1}</sub>`}=`, re: r.re, im: r.im }));
        if (res.ext && this.m.id !== 'es') {
          const w = res.ext.min ? 'Minimum' : 'Maximum';
          items.push({ lab: `<i>x</i>-Value ${w}=`, re: res.ext.x }, { lab: `<i>y</i>-Value ${w}=`, re: res.ext.y });
        }
      } else {
        const sol = Engine.simul(sc.vals);
        if (!sol) { this.msg('No Solution / Infinite Solution（无解或无穷多解）'); return; }
        sol.forEach((v, k) => items.push({ lab: `<i>${this.m.id === 'es' ? 'XYZ'[k] : 'xyz'[k]}</i>=`, re: v }));
      }
    } catch (e) { this.fail(e, sc); return; }
    this.scr = { k: 'eqres', items, i: 0, back: sc, dec: this.io === 'dec' };
    this.desc = `${this.exe}：求解，显示第一个结果`;
  }
  k_eqres(fn) {
    const sc = this.scr;
    switch (fn) {
      case 'eq': case 'ok': case 'D':
        if (sc.i < sc.items.length - 1) { sc.i++; this.desc = `${fn === 'D' ? '▼' : this.exe}：显示下一个结果`; }
        else if (fn !== 'D') { this.scr = sc.back; this.desc = `${this.exe}：回到系数输入`; }
        return;
      case 'U': if (sc.i > 0) sc.i--; return;
      case 'ac': case 'back': this.scr = sc.back; return;
      case 'sd': sc.dec = !sc.dec; return;
      case 'format': this.openMenu('format'); return;
      case 'menu': this.openMenu('main'); return;
      case 'setup': this.openMenu('setup'); return;
    }
  }

  /* ---- CALC 代入、SOLVE 解方程 ---- */
  startCalc() {
    const sc = this.scr;
    if (!sc.ed.root.length) return;
    const vars = collectVars(sc.ed.root);
    if (!vars.length) { this.exec(false); return; }
    this.scr = { k: 'prompt', mode: 'calc', back: sc, vars, i: 0, ed: null };
    this.desc = `CALC：依次输入式子里变量的值（${vars.join('、')}）`;
  }
  startSolve() {
    const sc = this.scr, root = sc.ed.root;
    if (!root.length) return;
    const k = root.findIndex(it => it.t === 'c' && it.v === '=');
    let fl, fr = null;
    try {
      fl = Engine.compile(k >= 0 ? root.slice(0, k) : root, this.opt);
      if (k >= 0) fr = Engine.compile(root.slice(k + 1), this.opt);
    } catch (e) { this.fail(e, sc); return; }
    this.scr = { k: 'prompt', mode: 'solve', back: sc, vars: ['x'], i: 0, ed: null, fl, fr };
    this.desc = 'SOLVE：输入 x 的初始值，按 = 开始求解';
  }
  k_prompt(fn) {
    const sc = this.scr;
    if (this.inmap[fn] || (sc.ed && ['L', 'R', 'del'].includes(fn))) { if (!sc.ed) sc.ed = new Editor(); editKey(sc.ed, fn, this.inmap); return; }
    if (fn === 'ac') { this.scr = sc.back; return; }
    if (fn !== 'eq') return;
    const name = sc.vars[sc.i];
    if (sc.ed && sc.ed.root.length) {
      try { this.vars[name] = Engine.compile(sc.ed.root, this.opt)(this.env()); } catch (e) { this.fail(e, sc.back); return; }
    }
    this.desc = `${this.exe}：${name} = ${Engine.display(this.vars[name], true).replace(/\\p\{([^}]*)\}/, '^$1')}${sc.i + 1 < sc.vars.length ? '，接着输入下一个变量' : sc.mode === 'calc' ? '，代入求值' : '，开始求解'}`;
    sc.ed = null;
    sc.i++;
    if (sc.i < sc.vars.length) return;
    this.scr = sc.back;
    if (sc.mode === 'calc') { this.exec(false); return; }
    try {
      const env = this.env();
      const f = t => { const e2 = { ...env, vars: { ...env.vars, x: Engine.V(t) } }; return sc.fl(e2).v - (sc.fr ? sc.fr(e2).v : 0); };
      const r = Engine.solve(f, this.vars.x.v);
      this.vars.x = Engine.V(r);
      this.ans = this.vars.x;
      this.scr = { k: 'solved', back: sc.back, x: this.vars.x, lr: f(r) };
    } catch (e) { this.fail(e, sc.back); }
  }
  k_solved(fn) {
    const sc = this.scr;
    this.scr = sc.back;
    if (fn === 'eq' || fn === 'solve') this.startSolve();
    else if (fn !== 'ac') this.k_edit(fn);
  }

  /* ---- 表格 ---- */
  startTable() {
    this.app = 'table';
    if (this.m.id === 'cw') { this.genTable(); return; }
    this.startFdef('f', null, 'table');
  }
  startFdef(name, back, flow) {
    const X = this.m.xName || 'x';
    const ed = new Editor(`<i>${name}</i>(<i>${X}</i>)=`);
    if (this.frows[name]) ed.load(this.frows[name]);
    this.scr = { k: 'fdef', name, ed, back, flow };
  }
  k_fdef(fn) {
    const sc = this.scr;
    if (editKey(sc.ed, fn, this.inmap)) return;
    switch (fn) {
      case 'eq': {
        if (sc.ed.root.length) {
          try { Engine.compile(sc.ed.root, this.opt); } catch (e) { this.fail(e, sc); return; }
          this.frows[sc.name] = clone(sc.ed.root);
        } else this.frows[sc.name] = null;
        if (sc.flow === 'table') {
          if (this.m.id === 'ex' && sc.name === 'f') { this.startFdef('g', null, 'table'); this.desc = `${this.exe}：确认 f(x)，接着输入 g(x)（用不到就留空）`; return; }
          this.startRange();
          this.desc = `${this.exe}：确认${sc.name === 'g' ? ' g(x)' : ' f(x)'}，进入表格范围`;
          return;
        }
        this.scr = sc.back || this.editScr();
        if (this.scr.k === 'table') this.genTable();
        this.desc = `${this.exe}：登记 ${sc.name}(x)`;
        return;
      }
      case 'ac': sc.ed.clear(); return;
      case 'back': this.scr = sc.back || this.editScr(); return;
      case 'menu': this.openMenu('main'); return;
      case 'setup': this.openMenu('setup'); return;
    }
  }
  startRange() { this.scr = { k: 'range', i: 0, ed: null }; }
  k_range(fn) {
    const sc = this.scr, cw = this.m.id === 'cw';
    if (this.inmap[fn] || (sc.ed && ['L', 'R', 'del'].includes(fn))) { if (!sc.ed) sc.ed = new Editor(); editKey(sc.ed, fn, this.inmap); return; }
    const name = ['Start', 'End', 'Step'][sc.i];
    switch (fn) {
      case 'eq': case 'ok':
        if (sc.i === 3) { this.genTable(); this.desc = `${this.exe}：Execute，生成表格`; return; }
        if (sc.ed && sc.ed.root.length) {
          try { this.range[sc.i] = Engine.compile(sc.ed.root, this.opt)(this.env()); } catch (e) { this.fail(e, sc); return; }
        }
        sc.ed = null;
        this.desc = `${this.exe}：确认 ${name} = ${Engine.display(this.range[sc.i], true)}`;
        sc.i++;
        if (sc.i === 3 && !cw) { this.genTable(); this.desc = `${this.exe}：确认 Step = ${Engine.display(this.range[2], true)}，生成表格`; }
        return;
      case 'U': if (sc.i > 0 && !sc.ed) sc.i--; return;
      case 'D': if (sc.i < (cw ? 3 : 2) && !sc.ed) sc.i++; return;
      case 'ac': if (sc.ed) sc.ed = null; else if (cw) this.genTable(); else this.startFdef('f', null, 'table'); return;
      case 'back': if (cw) this.genTable(); return;
      case 'menu': this.openMenu('main'); return;
    }
  }
  genTable() {
    const [a, b, s] = this.range.map(v => v.v);
    const f = this.frows.f, g = this.m.id === 'es' ? null : this.frows.g;
    this.scr = { k: 'table', r: 0, c: 1 };
    if (!f && !g) { this.tbl = null; return; }
    const n = s > 0 && b >= a ? Math.floor((b - a) / s + 1e-9) + 1 : 0;
    const limit = g && f ? 30 : this.m.id === 'es' ? 30 : 45;
    if (!n || n > limit) { this.tbl = null; this.scr = { k: 'err', kind: 'Range ERROR', back: this.scr }; return; }
    const env = this.env();
    const run = row => { if (!row) return null; let c; try { c = Engine.compile(row, this.opt); } catch (e) { return null; } return x => { try { return c({ ...env, vars: { ...env.vars, x } }); } catch (e) { return null; } }; };
    const F = run(f), G = run(g), xs = [];
    for (let k = 0; k < n; k++) xs.push(Engine.add(this.range[0], Engine.mul(Engine.int(k), this.range[2])));
    this.tbl = { xs, f: F && xs.map(F), g: G && xs.map(G) };
  }
  k_table(fn) {
    const sc = this.scr, t = this.tbl, cols = t ? 1 + !!t.f + !!t.g : 1;
    switch (fn) {
      case 'U': if (sc.r > 0) sc.r--; return;
      case 'D': if (t && sc.r < t.xs.length - 1) sc.r++; return;
      case 'L': if (sc.c > 0) sc.c--; return;
      case 'R': if (sc.c < cols - 1) sc.c++; return;
      case 'ac': if (this.m.id !== 'cw') this.startFdef('f', null, 'table'); return;
      case 'tools': this.openMenu('tools_table'); return;
      case 'func': this.openMenu('func'); return;
      case 'menu': this.openMenu('main'); return;
      case 'setup': this.openMenu('setup'); return;
    }
  }
  k_vars(fn, key) { // fx-991EX 的 RECALL：按变量键（不用 ALPHA）把变量放进算式
    const v = VAR_OF_FN[key.al && key.al[0]] || VAR_OF_FN[fn];
    this.scr = this.scr.back;
    if (v) { this.input(FN_OF_VAR[v]); this.desc = `调用变量 ${v}`; }
  }

  /* ---------- 屏幕 ---------- */
  view() {
    RENDER.x = this.m.xName || 'x';
    this.lastMd = null;
    const html = this.off ? '' : this['v_' + this.scr.k]();
    return {
      html, res: this.lastMd, off: this.off,
      ind: { s: this.mod === 'sh', a: this.mod === 'al', sto: this.pending === 'sto', rcl: this.pending === 'rcl', m: this.vars.M.v !== 0, angle: this.angle, math: this.io === 'math' || this.io === 'dec' },
    };
  }
  fmtVal(v, dec) { const s = Engine.display(v, dec); this.lastMd = s; return md(s); }
  v_edit() {
    if (this.line) return this.v_line();
    const sc = this.scr, ed = sc.ed;
    const res = ed.done && sc.res ? this.fmtVal(sc.res, sc.dec) : '';
    return `<div class="l1">${ed.prefix}${rr(ed.root, ed.cursor(), true)}</div><div class="l2">${res}</div>`;
  }
  // 线性显示：ClassWiz 把算过的式子和结果一行行往上推，Normal Font 4 行、Small Font 6 行；ES PLUS 只有算式一行、结果一行
  v_line() {
    const sc = this.scr, ed = sc.ed, es = this.m.id === 'es';
    const rows = es ? 2 : this.font === 'small' ? 6 : 4;
    const resOf = h => (h.dec ? Engine.display(h.val, true) : Engine.displayLine(h.val));
    const last = this.hist[this.hist.length - 1];
    if (ed.done && sc.res && last) this.lastMd = resOf(last);
    const input = `<div class="l1 ll">${rr(ed.root, ed.cursor(), true)}</div>`;
    let lines;
    if (es) lines = [input, `<div class="ll r">${ed.done && last ? md(resOf(last)) : ''}</div>`];
    else {
      lines = this.hist.flatMap(h => [`<div class="ll">${rr(h.root, null, true)}</div>`, `<div class="ll r">${md(resOf(h))}</div>`]);
      if (!ed.done) lines.push(input);
    }
    return `<div class="lines f-${es ? 'es' : this.font}" style="--rows:${rows}">${lines.slice(-rows).join('')}</div>`;
  }
  v_stored() { const sc = this.scr; return `<div class="l1">Ans→<i>${sc.v}</i></div><div class="l2">${this.fmtVal(sc.val)}</div>`; }
  v_msg() { return `<div class="msg">${esc(this.scr.text)}</div><div class="eh">按任意键返回</div>`; }
  v_err() { return `<div class="er"><div class="et">${esc(this.scr.kind)}</div><div class="eh">[AC] :Cancel</div><div class="eh">[◀][▶]:Goto</div></div>`; }
  v_menu() {
    const sc = this.scr, def = this.menuDef(sc.name), items = def.items;
    if (def.kind === 'icons') {
      const per = def.cols * def.rows;
      let first;
      if (this.m.id === 'cw') { const row = Math.floor(sc.sel / def.cols); first = Math.max(0, row - def.rows + 1) * def.cols; }
      else first = Math.floor(sc.sel / per) * per;
      const vis = items.slice(first, first + per);
      const cells = vis.map((it, j) => `<div class="mi${first + j === sc.sel ? ' on' : ''}"><span class="ic">${it.ic}</span>${it.n ? `<span class="mn">${it.n}</span>` : ''}${this.m.id === 'cw' ? `<span class="ml2">${it.key}</span>` : ''}</div>`).join('');
      const bar = items.length > per ? `<div class="sb"><span style="top:${(first / items.length) * 100}%;height:${(per / items.length) * 100}%"></span></div>` : '';
      const name = this.m.id === 'cw' ? '' : `<div class="ml">${items[sc.sel].n}:${items[sc.sel].lab}</div>`;
      return `<div class="menu c${def.cols}">${cells}</div>${bar}${name}`;
    }
    if (def.kind === 'text2') {
      return `<div class="lst t2">${items.map(it => `<div class="li">${it.n}:${it.lab}</div>`).join('')}</div>`;
    }
    const rows = def.perPage || (this.m.id === 'es' ? 3 : 4);
    const first = def.perPage ? this.pageOf(def, sc.sel) * rows : Math.max(0, Math.min(sc.sel - rows + 1, items.length - rows));
    const cursor = !def.num;
    const mark = def.mark ? this.markOf(def) : null;
    const vis = items.slice(first, first + rows);
    const bar = def.perPage ? `<div class="pg mp">${first > 0 ? '▲' : ''}${first + rows < items.length ? '▼' : ''}</div>`
      : items.length > rows ? `<div class="sb"><span style="top:${(first / items.length) * 100}%;height:${(rows / items.length) * 100}%"></span></div>` : '';
    return `<div class="lst">${def.title ? `<div class="lt">${def.title}</div>` : ''}${vis.map((it, j) => `<div class="li${cursor && first + j === sc.sel ? ' on' : ''}">${it.n ? it.n + ':' : ''}${it.lab}${mark && it.act === mark ? '<span class="dm">◆</span>' : ''}</div>`).join('')}</div>${bar}`;
  }
  v_coef() {
    const sc = this.scr, X = this.m.xName || 'x';
    const head = sc.type === 'poly'
      ? (sc.n === 2 ? `a<i>${X}</i>²+b<i>${X}</i>+c=0` : `a<i>${X}</i>³+b<i>${X}</i>²+c<i>${X}</i>+d=0`)
      : (sc.n === 2 ? `a<sub>n</sub><i>${X}</i>+b<sub>n</sub><i>${this.m.id === 'es' ? 'Y' : 'y'}</i>=c<sub>n</sub>` : 'a<sub>n</sub>x+b<sub>n</sub>y+c<sub>n</sub>z=d<sub>n</sub>');
    const th = Array.from({ length: sc.cols }, (_, c) => `<th>${'abcd'[c] || 'e'}</th>`).join('');
    const body = sc.vals.map((row, r) => `<tr>${sc.rows > 1 ? `<td class="rn">${r + 1}</td>` : ''}${row.map((v, c) => `<td class="${r === sc.r && c === sc.c ? 'on' : ''}">${md(Engine.display(v, true))}</td>`).join('')}</tr>`).join('');
    const typing = sc.ed ? rr(sc.ed.root, sc.ed.cursor(), true) : '';
    return `<div class="eqh">${head}</div><table class="coef${sc.cols > 3 ? ' w4' : ''}"><tr>${sc.rows > 1 ? '<th></th>' : ''}${th}</tr>${body}</table><div class="l2 in">${typing}</div>`;
  }
  v_eqres() {
    const sc = this.scr, it = sc.items[sc.i];
    let val = this.fmtVal(it.re, sc.dec);
    if (it.im) { const im = Engine.display(it.im.v < 0 ? Engine.neg(it.im) : it.im, sc.dec); val += `${it.im.v < 0 ? '−' : '+'}${md(im)}<i>i</i>`; this.lastMd += (it.im.v < 0 ? '−' : '+') + im + 'i'; }
    return `<div class="l1">${it.lab}</div><div class="l2">${val}</div>${sc.items.length > 1 ? `<div class="pg">${sc.i > 0 ? '▲' : ''}${sc.i < sc.items.length - 1 ? '▼' : ''}</div>` : ''}`;
  }
  v_prompt() {
    const sc = this.scr, name = sc.vars[sc.i], X = name === 'x' ? RENDER.x : name;
    const cur = sc.ed ? rr(sc.ed.root, sc.ed.cursor(), true) : md(Engine.display(this.vars[name], true)) + CURSOR;
    const expr = rr(sc.back.ed.root, null, true);
    if (sc.mode === 'solve') return `<div class="l1 dim">${expr}</div><div class="l1 sm">Solve for <i>${X}</i></div><div class="l1"><i>${X}</i>=${cur}</div>`;
    if (this.m.id === 'es') return `<div class="l1"><i>${X}</i>?</div><div class="l2 in">${cur}</div>`;
    return `<div class="l1 dim">${expr}</div><div class="l1"><i>${X}</i>=${cur}</div>`;
  }
  v_solved() {
    const sc = this.scr;
    return `<div class="l1 dim">${rr(sc.back.ed.root, null, true)}</div><div class="l1"><i>${RENDER.x}</i>=${this.fmtVal(sc.x, true)}</div><div class="l1 sm">L−R=${md(Engine.fmtDec(Math.abs(sc.lr) < 1e-300 ? 0 : sc.lr))}</div>`;
  }
  v_fdef() { const ed = this.scr.ed; return `<div class="l1">${ed.prefix}${rr(ed.root, ed.cursor(), true)}</div>`; }
  v_range() {
    const sc = this.scr, cw = this.m.id === 'cw';
    const typing = sc.ed ? rr(sc.ed.root, sc.ed.cursor(), true) : null;
    if (this.m.id === 'es') return `<div class="l1">${['Start', 'End', 'Step'][sc.i]}?</div><div class="l2 in">${typing ?? md(Engine.display(this.range[sc.i], true)) + CURSOR}</div>`;
    const rows = ['Start', 'End', 'Step'].map((nm, j) => `<div class="li rg${j === sc.i ? ' on' : ''}"><span>${nm}</span>:${j === sc.i && typing != null ? typing : md(Engine.display(this.range[j], true))}</div>`);
    if (cw) rows.push(`<div class="li rg ex${sc.i === 3 ? ' on' : ''}">Execute</div>`);
    return `<div class="lst"><div class="lt">Table Range</div>${rows.join('')}</div>`;
  }
  v_table() {
    const sc = this.scr, t = this.tbl, X = this.m.xName || 'x';
    if (!t) return `<div class="msg">${this.m.id === 'cw' ? '还没有定义 f(x)：按 TOOLS → Define f(x)/g(x)' : ''}</div>`;
    const cols = [['', null], [`<i>${X}</i>`, t.xs], ...(t.f ? [[`<i>f</i>(<i>${X}</i>)`, t.f]] : []), ...(t.g ? [[`<i>g</i>(<i>${X}</i>)`, t.g]] : [])];
    const vis = 4, first = Math.max(0, Math.min(sc.r - 1, t.xs.length - vis));
    const cell = v => (v ? md(Engine.fmtDec(v.v, 6)) : 'ERROR');
    let h = `<table class="tb"><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>`;
    for (let r = first; r < Math.min(first + vis, t.xs.length); r++) {
      h += `<tr><td class="rn">${r + 1}</td>${cols.slice(1).map((c, j) => `<td class="${r === sc.r && j === sc.c - 1 ? 'on' : ''}">${cell(c[1][r])}</td>`).join('')}</tr>`;
    }
    const selCol = cols[sc.c + 1] || cols[1], sv = selCol[1][sc.r];
    this.lastMd = sv ? Engine.display(sv, true) : null;
    return `${h}</table><div class="tbv">${sv ? md(Engine.fmtDec(sv.v)) : ''}</div>`;
  }
  v_vars() {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'M', 'x', 'y', 'z'];
    return `<div class="vars">${names.map(v => `<div><i>${v === 'x' ? RENDER.x : v}</i>=${md(Engine.fmtDec(this.vars[v].v, 6))}</div>`).join('')}</div>`;
  }
}

/* ---------- 记录按键：把修饰键与下一个键合成一步 ---------- */
class Recorder {
  constructor(calc) { this.calc = calc; this.steps = []; this.modId = null; this.modView = null; }
  press(id) {
    const r = this.calc.press(id);
    if (!r) return null;
    if (r.modKey) { this.modId = r.mod ? id : null; this.modView = r.mod ? this.calc.view() : null; return null; }
    const st = { key: id, modKey: r.mod ? this.modId : null, mod: r.mod, fn: r.fn, name: r.name, chip: r.chip, view: this.calc.view(), modView: r.mod ? this.modView : null, note: '' };
    this.modId = null;
    this.modView = null;
    this.steps.push(st);
    return st;
  }
}

/* ---------- 按键序列 → 逐步快照 ----------
 * 记法见 questions.js 开头；同一段序列按各机型自己的键位、菜单展开 */
function runScript(model, seq, calc = new Calc(model)) {
  const rec = new Recorder(calc);
  const toks = seq.match(/\[[^\]]*\]|"[^"]*"|\S+/g) || [];
  const MAP = { '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '(': 'lp', ')': 'rp', '=': 'eq' };
  const last = () => rec.steps[rec.steps.length - 1];
  const pressKey = id => { if (!rec.press(id) && !['shift', 'alpha'].includes(id)) throw new Error(`按键 ${id} 没有反应`); };
  function pressFn(fn) {
    const path = model.paths && model.paths[fn];
    if (path) { (typeof path === 'function' ? path(calc) : path).forEach(item); return; }
    const k = model.keyOf[fn];
    if (!k) throw new Error(`${model.name} 上找不到按键：${fn}`);
    if (k.mod) pressKey(k.mod);
    pressKey(k.id);
  }
  function pick(target) {
    const sc = calc.scr;
    if (sc.k !== 'menu') throw new Error(`选择 ${target} 时没有打开菜单`);
    const def = calc.menuDef(sc.name), items = def.items;
    const j = items.findIndex(it => it.key === target || it.n === target);
    if (j < 0) throw new Error(`菜单里没有 ${target}`);
    if (def.num) {
      const n = items[j].n;
      for (let p = calc.pageOf(def, sc.sel); p !== calc.pageOf(def, j); p += p < calc.pageOf(def, j) ? 1 : -1) pressFn(p < calc.pageOf(def, j) ? 'D' : 'U');
      if (/^\d$/.test(n)) pressFn(n);
      else pressKey(Object.keys(model.keys).find(id => model.keys[id].al && model.keys[id].al[0] === 'var' + n));
      return;
    }
    const cols = def.kind === 'icons' ? def.cols : def.kind === 'text2' ? 2 : 1;
    let r0 = Math.floor(sc.sel / cols), c0 = sc.sel % cols;
    const r1 = Math.floor(j / cols), c1 = j % cols;
    for (; r0 < r1; r0++) pressFn('D');
    for (; r0 > r1; r0--) pressFn('U');
    for (; c0 < c1; c0++) pressFn('R');
    for (; c0 > c1; c0--) pressFn('L');
    pressFn(model.keyOf.ok ? 'ok' : 'eq');
  }
  function item(it) {
    if (typeof it === 'string') pressFn(it);
    else if (it.pick) pick(it.pick);
    else if (it.raw) pressKey(it.raw);
  }
  for (const t of toks) {
    if (t[0] === '"') { const s = last(); if (s) s.note = t.slice(1, -1); continue; }
    if (t[0] === '[') { const s = last(); if (s) (s.expect = s.expect || []).push(t.slice(1, -1)); continue; }
    if (t[0] === '@') {
      const m = t.match(/^@(\w+)(?::(.*))?$/);
      const mac = m && model.macros[m[1]];
      if (!mac) throw new Error(`未知宏：${t}`);
      mac(m[2] ? m[2].split(':')[0].split(',') : [], calc).forEach(item);
      continue;
    }
    if (/^\d*\.?\d+$/.test(t)) { for (const c of t) pressFn(c === '.' ? 'dot' : c); continue; }
    pressFn(MAP[t] || t);
  }
  return rec.steps;
}
// 一道题的第 j 小问：先在同一台计算器上按完前面的小问（变量、Ans 接着用），再清屏开始这一问
function runPart(model, parts, j) {
  const calc = new Calc(model);
  for (let k = 0; k < j; k++) { try { runScript(model, parts[k].seq, calc); } catch (e) { /* 前面小问出错不影响这一问 */ } }
  calc.toCalc();
  calc.mod = calc.pending = null;
  return runScript(model, parts[j].seq, calc);
}
if (typeof module !== 'undefined') module.exports = { Calc, Recorder, runScript, runPart, Editor, md, rr };
