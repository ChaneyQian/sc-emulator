'use strict';
/* 用法：node tests/tex.js
 * 用随附的 KaTeX 排版 questions.js 和 practice.js 里所有 $…$ 公式（练习每类随机出 20 题），有语法错误就报出来。 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const katex = require(path.join(root, 'vendor/katex/katex.min.js'));
const ctx = vm.createContext({ Math, String, Number, Array, Object, JSON });
for (const f of ['questions.js', 'practice.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^if \(typeof module.*$/m, ''), ctx);
const { QUESTIONS, SETUP, PRACTICE } = vm.runInContext('({ QUESTIONS, SETUP, PRACTICE })', ctx);

let n = 0, bad = 0;
function check(where, s) {
  if (s == null) return;
  // 与 app.js 的 rich() 一样切分：$$…$$ 单独一行，$…$ 行内
  String(s).split(/(\$\$[^$]+\$\$|\$[^$]+\$)/).forEach((part, i) => {
    if (i % 2 === 0) { if (part.includes('$')) { bad++; console.log('UNPAIRED $', where, s); } return; }
    const display = part.startsWith('$$');
    try { katex.renderToString(part.slice(display ? 2 : 1, display ? -2 : -1), { displayMode: display, throwOnError: true, strict: 'error' }); n++; }
    catch (e) { bad++; console.log('FAIL', where, '\n  ', part, '\n  ', e.message); }
  });
}
for (const q of [SETUP, ...QUESTIONS]) {
  check(`Q${q.n} topic`, q.topic);
  check(`Q${q.n} ans`, q.ans);
  for (const p of q.parts || []) check(`Q${q.n} ${p.lab}`, p.title);
}
for (const t of PRACTICE) {
  check(`${t.id} name`, t.name);
  check(`${t.id} formula`, t.formula);
  for (let k = 0; k < 20; k++) {
    const it = t.gen();
    check(`${t.id} q`, it.q);
    check(`${t.id} work`, it.work);
    it.answers.forEach(a => check(`${t.id} lab`, a.lab));
  }
}
console.log(`\n${n} formulas ok, ${bad} failed`);
process.exit(bad ? 1 : 0);
