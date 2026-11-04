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
      const err = steps.find(s => /ERROR|暂不支持/.test(s.view.html));
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
// 把结果记法近似成数值（只用于核对练习答案）
function evalMd(s) {
  const js = norm(s).replace(/−/g, '-').replace(/\\f\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/(\d)\\r\{/g, '$1*\\r{').replace(/\\r\{(\d+)\}/g, 'Math.sqrt($1)').replace(/(\d)π/g, '$1*Math.PI').replace(/π/g, 'Math.PI')
    .replace(/×10\\p\{(-?\d+)\}/g, 'e$1');
  try { return Function(`return ${js}`)(); } catch (e) { return NaN; }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
