'use strict';
/* 用法：node tests/run.js
 * 把每道题的按键序列分别在三款机型上按一遍，核对屏幕结果与 questions.js 里 [..] 写的答案，
 * 再把 practice.js 每类练习各生成若干题，核对提示按法算出的结果与标准答案一致。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, JSON, BigInt, Number, String, Object, Array, Error, Set, Map });
for (const f of ['engine.js', 'models.js', 'calc.js', 'questions.js', 'practice.js']) {
  if (!fs.existsSync(path.join(root, f))) continue;
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^if \(typeof module.*$/m, ''), ctx, { filename: f });
}
const { MODELS, QUESTIONS, SETUP, runScript, runPart } = vm.runInContext('({ MODELS, QUESTIONS, SETUP, runScript, runPart })', ctx);
const norm = s => String(s).replace(/-/g, '−');

let pass = 0, fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
for (const m of Object.values(MODELS)) {
  for (const q of [SETUP, ...QUESTIONS]) {
    for (const [j, p] of (q.parts || []).entries()) {
      let steps;
      try { steps = runPart(m, q.parts, j); } catch (e) { bad(m.id, `Q${q.n} ${p.lab}`, e.message); continue; }
      steps.forEach((s, i) => {
        if (!s.expect) return;
        // 一个步骤后面跟了多个 [..]（方程的 x1、x2）：依次对应最后几步
        s.expect.forEach((want, j) => {
          const st = steps[i - (s.expect.length - 1 - j)];
          const got = st.view.res;
          if (norm(got) === norm(want)) pass++;
          else bad(m.id, `Q${q.n} ${p.lab}`, `step ${i - (s.expect.length - 1 - j)} (${st.fn})`, 'got', got, 'want', want);
        });
      });
      const err = steps.find(s => /ERROR|还没做/.test(s.view.html));
      if (err) bad(m.id, `Q${q.n} ${p.lab}`, 'screen shows', err.view.html.replace(/<[^>]+>/g, ' ').slice(0, 80));
    }
  }
}

if (vm.runInContext('typeof PRACTICE', ctx) !== 'undefined') {
  const { PRACTICE } = vm.runInContext('({ PRACTICE })', ctx);
  for (const m of Object.values(MODELS)) {
    for (const t of PRACTICE) {
      for (let k = 0; k < 6; k++) {
        const item = t.gen();
        let steps;
        try { steps = runScript(m, item.seq); } catch (e) { bad(m.id, t.id, e.message, item.seq); continue; }
        const shown = steps.filter(s => s.view.res != null).map(s => s.view.res);
        for (const a of item.answers) {
          const ok = shown.some(r => { const v = Number(norm(r).replace(/−/g, '-').replace('×10\\p{', 'e').replace('}', '')); return Number.isFinite(v) && Math.abs(v - a.v) <= 1e-6 * Math.max(1, Math.abs(a.v)); })
            || steps.some(s => s.view.res && Math.abs(evalMd(s.view.res) - a.v) <= 1e-6 * Math.max(1, Math.abs(a.v)));
          if (ok) pass++; else bad(m.id, t.id, `answer ${a.v} not shown; screens:`, shown.slice(-4).join(' | '), '\n   seq:', item.seq);
        }
      }
    }
  }
}
// 线性显示（LineI/LineO）：从各机型的设置菜单进去，按线性写法输入，结果分数写成 a⌟b，其余为小数
const LINE_CASES = [
  ['1 frac 3 + 1 frac 6 =', '1⌟2'],
  ['1 frac 3 + 1 frac 6 = sd', '0.5'],
  ['2 pow 10 ) =', '1024'],
  ['sqrt 2 ) =', '1.414213562'],
  ['3 frac 2 frac 4 =', '7⌟2'],
  ['logb 2 comma 8 ) =', '3'],
  ['2 pow 3 ) frac 5 =', '8⌟5'],
  ['neg 3 frac 4 =', '−3⌟4'],
  ['ddx x cube comma 2 ) =', '12'],
  ['int x sq comma 0 comma 3 ) =', '9'],
  ['1.5 e10 neg 2 =', '3⌟200'],
];
for (const m of Object.values(MODELS)) {
  for (const [seq, want] of LINE_CASES) {
    let steps;
    try { steps = runScript(m, `@line ${seq}`); } catch (e) { bad(m.id, 'line', seq, e.message); continue; }
    const got = steps[steps.length - 1].view.res;
    if (norm(got) === norm(want)) pass++; else bad(m.id, 'line', seq, 'got', got, 'want', want);
  }
  // MultiLine Font：Normal 最多 4 行、Small 最多 6 行；ES PLUS 没有这个设置，只有 2 行
  const calc = new (vm.runInContext('Calc', ctx))(m);
  const many = '1 + 1 = 2 + 2 = 3 + 3 = 4 + 4 =';
  runScript(m, `@line ${many}`, calc);
  const rows = () => (calc.view().html.match(/class="(l1 )?ll/g) || []).length;
  const want = m.id === 'es' ? 2 : 4;
  if (rows() === want) pass++; else bad(m.id, 'normal font rows', rows(), 'want', want);
  if (m.macros.small) {
    runScript(m, `@small ${many}`, calc);
    if (calc.font === 'small' && rows() === 6) pass++; else bad(m.id, 'small font', calc.font, rows());
  }
}
// TOOLS（fx-991CW 说明书）：Calculate 的 Undo / 重做，Table 的 Table Type、Edit、改 x 格，Equation 的 Complex Roots
{
  const Calc = vm.runInContext('Calc', ctx), cw = MODELS.cw, ex = MODELS.ex;
  const text = c => c.view().html.replace(/<span class="cur"><\/span>/g, '').replace(/<[^>]+>/g, '').trim();
  const ok = (cond, ...why) => (cond ? pass++ : bad(...why));
  // Undo 撤消最后一步，再 Undo 就重做；CW 走 TOOLS → Undo，EX 是 ALPHA + DEL
  for (const [m, undo] of [[cw, 'tools >Undo'], [ex, 'undo']]) {
    const c = new Calc(m);
    runScript(m, `1 2 3 ${undo}`, c);
    ok(text(c) === '12', m.id, 'undo', text(c));
    runScript(m, undo, c);
    ok(text(c) === '123', m.id, 'redo', text(c));
    runScript(m, `+ 4 = ${undo}`, c);
    ok(!c.scr.ed.done && text(c) === '123+4', m.id, 'undo after =', text(c));
  }
  // TOOLS 菜单的顺序和说明书截图一致
  {
    const c = new Calc(cw);
    runScript(cw, '@table x sq @range:1,3,1 tools', c);
    const items = c.menuDef(c.scr.name).items.map(i => i.key).join(', ');
    ok(items === 'Table Range, Define f(x)/g(x), Table Type, Edit, Recalculate', 'cw', 'table TOOLS order', items);
    runScript(cw, 'ac D D D =', c); // 空着在 x 列按 EXE：上一格加 Step
    ok(c.tbl.xs.length === 4 && c.tbl.xs[3].v === 4 && c.tbl.f[3].v === 16, 'cw', 'EXE fills x', c.tbl.xs.map(v => v && v.v));
    runScript(cw, 'U U 1 0 =', c); // 输入数值改 x
    ok(c.tbl.xs[2].v === 10 && c.tbl.f[2].v === 100, 'cw', 'edit x cell', c.tbl.xs.map(v => v && v.v));
    runScript(cw, 'U del', c);
    ok(c.tbl.xs.length === 3, 'cw', 'DEL row', c.tbl.xs.length);
    runScript(cw, 'tools >Edit >Insert_Row', c);
    ok(c.tbl.xs.length === 4 && c.tbl.xs[c.scr.r] === null, 'cw', 'Insert Row', c.tbl.xs.map(v => v && v.v));
    runScript(cw, 'tools >Edit >Delete_All', c);
    ok(c.tbl.xs.length === 0, 'cw', 'Delete All', c.tbl.xs.length);
    runScript(cw, 'tools >Table_Type >f(x)', c);
    ok(c.tableType === 'f' && c.tableLimit() === 45 && !/g\(/.test(c.view().html.replace(/<[^>]+>/g, '')), 'cw', 'Table Type f(x)');
  }
  // Complex Roots → Off：x² + 1 = 0 显示 No Real Roots；On 时显示复数解
  {
    const c = new Calc(cw);
    runScript(cw, 'menu >Equation >Polynomial >ax²+bx+c 1 = 0 = 1 = tools >Complex_Roots >Off =', c);
    ok(c.scr.k === 'msg' && /No Real Roots/.test(c.scr.text), 'cw', 'complex roots off', c.scr.k);
    runScript(cw, 'ac tools >Complex_Roots >On =', c);
    ok(c.scr.k === 'eqres' && c.view().res === '0+1i', 'cw', 'complex roots on', c.view().res);
  }
}
// 把结果记法近似成数值（只用于核对练习答案）
function evalMd(s) {
  const js = norm(s).replace(/−/g, '-').replace(/\\f\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/(\d)\\r\{/g, '$1*\\r{').replace(/\\r\{(\d+)\}/g, 'Math.sqrt($1)').replace(/(\d)π/g, '$1*Math.PI').replace(/π/g, 'Math.PI')
    .replace(/×10\\p\{(-?\d+)\}/g, 'e$1');
  try { return Function(`return ${js}`)(); } catch (e) { return NaN; }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
