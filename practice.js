'use strict';
/* 练习模式：Y12（AS Level，9709 Pure 1 / Probability & Statistics 1 常用公式）随机出题。
 * 每类题 gen() 返回：
 *   q        题目（HTML）
 *   answers  [{ lab, v, acc }]，acc：数字 = 有效数字位数，'dp1' = 保留 1 位小数，'exact' = 精确值
 *   seq      提示按法（与 questions.js 同一套记法，三款机型通用）
 *   work     代入公式的过程（HTML，检查答案后显示）  */
const PRACTICE = (() => {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const nz = (a, b) => { let v; do v = ri(a, b); while (v === 0); return v; };
  const dec = (a, b, d = 1) => +(a + Math.random() * (b - a)).toFixed(d);
  const f = v => String(+v.toPrecision(12)).replace('-', '−'); // 题面上的数
  const N = v => (v < 0 ? `( neg ${-v} )` : `${v}`); // 按键序列里单独出现的数，负数带括号
  const X = '<i>x</i>';
  // 多项式按键：[[系数, 'x cube'], …]
  function polySeq(terms) {
    let s = '';
    for (const [c, body] of terms) {
      if (!c) continue;
      const a = Math.abs(c), lead = !s;
      const num = a === 1 && body ? '' : `${a} `;
      s += lead ? `${c < 0 ? 'neg ' : ''}${num}${body} ` : `${c < 0 ? '-' : '+'} ${num}${body} `;
    }
    return s.trim() || '0';
  }
  function polyHtml(terms) {
    let s = '';
    for (const [c, p] of terms) {
      if (!c) continue;
      const a = Math.abs(c), body = p === 0 ? '' : p === 1 ? X : `${X}<sup>${p}</sup>`;
      const num = a === 1 && body ? '' : f(a);
      s += s ? ` ${c < 0 ? '−' : '+'} ${num}${body}` : `${c < 0 ? '−' : ''}${num}${body}`;
    }
    return s || '0';
  }
  const PB = { 3: 'x cube', 2: 'x sq', 1: 'x', 0: '' };

  const T = [
    { id: 'quad', topic: '二次方程', name: '求根公式解二次方程', unit: 'Pure 1',
      formula: `${X} = <span class="ffrac"><span>−b ± √(b² − 4ac)</span><span>2a</span></span>`,
      gen() {
        let a, b, c, D;
        do { a = ri(1, 5); b = nz(-9, 9); c = nz(-9, 9); D = b * b - 4 * a * c; } while (D <= 0 || Number.isInteger(Math.sqrt(D)));
        const r = [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)];
        return {
          q: `解方程 ${polyHtml([[a, 2], [b, 1], [c, 0]])} = 0，结果保留 3 位有效数字。`,
          answers: [{ lab: `${X}₁`, v: r[0], acc: 3 }, { lab: `${X}₂`, v: r[1], acc: 3 }], any: true,
          seq: `@eq2:${a},${b},${c}`,
          work: `a = ${f(a)}，b = ${f(b)}，c = ${f(c)}；b² − 4ac = ${f(D)}；${X} = (${f(-b)} ± √${f(D)}) ÷ ${f(2 * a)}`,
        };
      } },
    { id: 'disc', topic: '二次方程', name: '判别式 b² − 4ac', unit: 'Pure 1',
      formula: 'Δ = b² − 4ac',
      gen() {
        const a = nz(-6, 6), b = nz(-12, 12), c = nz(-9, 9), D = b * b - 4 * a * c;
        return {
          q: `求 ${polyHtml([[a, 2], [b, 1], [c, 0]])} = 0 的判别式 b² − 4ac，并判断实根个数（填判别式的值）。`,
          answers: [{ lab: 'b² − 4ac', v: D, acc: 'exact' }],
          seq: `${N(b)} sq - 4 * ${N(a)} * ${N(c)} =`,
          work: `${f(b)}² − 4 × ${f(a)} × ${f(c)} = ${f(D)}，${D > 0 ? '两个不等实根' : D === 0 ? '两个相等实根' : '没有实根'}`,
        };
      } },
    { id: 'dist', topic: '坐标几何', name: '两点间距离', unit: 'Pure 1',
      formula: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)',
      gen() {
        let p, d;
        do { p = [ri(-9, 9), ri(-9, 9), ri(-9, 9), ri(-9, 9)]; d = Math.hypot(p[2] - p[0], p[3] - p[1]); } while (!d || Number.isInteger(d));
        return {
          q: `求点 A(${f(p[0])}, ${f(p[1])}) 与 B(${f(p[2])}, ${f(p[3])}) 之间的距离，保留 3 位有效数字。`,
          answers: [{ lab: 'AB', v: d, acc: 3 }],
          seq: `sqrt ( ${N(p[2])} - ${N(p[0])} ) sq + ( ${N(p[3])} - ${N(p[1])} ) sq R =`,
          work: `√((${f(p[2])} − ${f(p[0])})² + (${f(p[3])} − ${f(p[1])})²) = √${f((p[2] - p[0]) ** 2 + (p[3] - p[1]) ** 2)}`,
        };
      } },
    { id: 'sector', topic: '弧度制', name: '弧长与扇形面积', unit: 'Pure 1',
      formula: 's = rθ，A = ½r²θ（θ 用弧度）',
      gen() {
        const r = dec(3, 15, 1), t = dec(0.4, 2.8, 2);
        return {
          q: `扇形半径 r = ${f(r)} cm，圆心角 θ = ${f(t)} rad。求弧长 s 和面积 A，保留 3 位有效数字。`,
          answers: [{ lab: 's（cm）', v: r * t, acc: 3 }, { lab: 'A（cm²）', v: 0.5 * r * r * t, acc: 3 }],
          seq: `${r} * ${t} = frac 1 D 2 R * ${r} sq * ${t} =`,
          work: `s = ${f(r)} × ${f(t)} = ${f(r * t)}；A = ½ × ${f(r)}² × ${f(t)} = ${f(0.5 * r * r * t)}`,
        };
      } },
    { id: 'degrad', topic: '弧度制', name: '角度换算成弧度', unit: 'Pure 1',
      formula: 'θ(rad) = θ(°) × π ÷ 180',
      gen() {
        const d = pick([15, 20, 35, 40, 50, 75, 100, 105, 130, 140, 160, 200, 225, 250, 310]);
        return {
          q: `把 ${d}° 换算成弧度，保留 3 位有效数字（计算器先显示 π 的分数形式）。`,
          answers: [{ lab: 'θ（rad）', v: (d * Math.PI) / 180, acc: 3 }],
          seq: `${d} * pi / 180 = sd`,
          work: `${d} × π ÷ 180 = ${f((d * Math.PI) / 180)}`,
        };
      } },
    { id: 'trigeq', topic: '三角', name: '三角方程（弧度制）', unit: 'Pure 1',
      formula: `sin ${X} = k ⇒ ${X} = sin⁻¹k 或 π − sin⁻¹k`,
      gen() {
        const k = pick([0.2, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.8, 0.85, 0.9]);
        const x1 = Math.asin(k);
        return {
          q: `解 sin ${X} = ${f(k)}，0 ≤ ${X} ≤ π（弧度制），保留 3 位有效数字。`,
          answers: [{ lab: `${X}₁`, v: x1, acc: 3 }, { lab: `${X}₂`, v: Math.PI - x1, acc: 3 }], any: true,
          seq: `@rad "先把计算器改成弧度制，屏幕顶部显示 R" asin ${k} ) = pi - ans =`,
          work: `${X}₁ = sin⁻¹${f(k)} = ${f(x1)}；${X}₂ = π − ${f(x1)} = ${f(Math.PI - x1)}`,
        };
      } },
    { id: 'cosrule', topic: '三角', name: '余弦定理求边', unit: 'Pure 1',
      formula: 'a² = b² + c² − 2bc cos A',
      gen() {
        const b = ri(4, 20), c = ri(4, 20), A = ri(20, 140);
        const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos((A * Math.PI) / 180));
        return {
          q: `三角形 ABC 中，b = ${b} cm，c = ${c} cm，A = ${A}°。求 a，保留 3 位有效数字（角度制）。`,
          answers: [{ lab: 'a（cm）', v: a, acc: 3 }],
          seq: `sqrt ${b} sq + ${c} sq - 2 * ${b} * ${c} cos ${A} ) R =`,
          work: `a = √(${b}² + ${c}² − 2 × ${b} × ${c} × cos ${A}°) = ${f(a)}`,
        };
      } },
    { id: 'area', topic: '三角', name: '三角形面积 ½ab sin C', unit: 'Pure 1',
      formula: 'Area = ½ab sin C',
      gen() {
        const a = dec(3, 15, 1), b = dec(3, 15, 1), C = ri(25, 150);
        const S = 0.5 * a * b * Math.sin((C * Math.PI) / 180);
        return {
          q: `三角形两边 a = ${f(a)} cm、b = ${f(b)} cm，夹角 C = ${C}°。求面积，保留 3 位有效数字。`,
          answers: [{ lab: '面积（cm²）', v: S, acc: 3 }],
          seq: `frac 1 D 2 R * ${a} * ${b} sin ${C} ) =`,
          work: `½ × ${f(a)} × ${f(b)} × sin ${C}° = ${f(S)}`,
        };
      } },
    { id: 'binom', topic: '二项式定理', name: '展开式中某一项的系数', unit: 'Pure 1',
      formula: `(p + q${X})ⁿ 中 ${X}ʳ 的系数 = ⁿCᵣ pⁿ⁻ʳ qʳ`,
      gen() {
        const n = ri(5, 9), r = ri(2, n - 2), p = pick([1, 2, 3]), q = pick([-3, -2, 2, 3, 4]);
        const C = (() => { let c = 1; for (let i = 0; i < r; i++) c = (c * (n - i)) / (i + 1); return c; })();
        const v = C * p ** (n - r) * q ** r;
        return {
          q: `求 (${p} ${q < 0 ? '−' : '+'} ${Math.abs(q)}${X})<sup>${n}</sup> 展开式中 ${X}<sup>${r}</sup> 的系数。`,
          answers: [{ lab: `${X}<sup>${r}</sup> 的系数`, v, acc: 'exact' }],
          seq: `${n} ncr ${r} * ${p} pow ${n - r} R * ${N(q)} pow ${r} R =`,
          work: `${n}C${r} × ${p}<sup>${n - r}</sup> × (${f(q)})<sup>${r}</sup> = ${f(C)} × ${f(p ** (n - r))} × ${f(q ** r)} = ${f(v)}`,
        };
      } },
    { id: 'arith', topic: '数列', name: '等差数列前 n 项和', unit: 'Pure 1',
      formula: 'Sₙ = ½n(2a + (n − 1)d)',
      gen() {
        const a = ri(-20, 30), d = nz(-6, 9), n = ri(12, 40);
        const S = (n / 2) * (2 * a + (n - 1) * d);
        return {
          q: `等差数列首项 a = ${f(a)}，公差 d = ${f(d)}。求前 ${n} 项和 S<sub>${n}</sub>。`,
          answers: [{ lab: `S<sub>${n}</sub>`, v: S, acc: 'exact' }],
          seq: `frac ${n} D 2 R ( 2 * ${N(a)} + ( ${n} - 1 ) * ${N(d)} ) =`,
          work: `½ × ${n} × (2 × ${f(a)} + ${n - 1} × ${f(d)}) = ${f(S)}`,
        };
      } },
    { id: 'geo', topic: '数列', name: '等比数列前 n 项和', unit: 'Pure 1',
      formula: 'Sₙ = a(1 − rⁿ) ÷ (1 − r)',
      gen() {
        const a = ri(3, 60), r = pick([0.4, 0.6, 0.75, 0.8, 0.85, 0.9, 1.1, 1.2, 1.5]), n = ri(6, 15);
        const S = (a * (1 - r ** n)) / (1 - r);
        return {
          q: `等比数列首项 a = ${a}，公比 r = ${f(r)}。求前 ${n} 项和，保留 3 位有效数字。`,
          answers: [{ lab: `S<sub>${n}</sub>`, v: S, acc: 3 }],
          seq: `frac ${a} ( 1 - ${r} pow ${n} R ) D 1 - ${r} R =`,
          work: `${a} × (1 − ${f(r)}<sup>${n}</sup>) ÷ (1 − ${f(r)}) = ${f(S)}`,
        };
      } },
    { id: 'sinf', topic: '数列', name: '无穷等比数列的和', unit: 'Pure 1',
      formula: 'S∞ = a ÷ (1 − r)，|r| < 1',
      gen() {
        const a = ri(4, 80), r = pick([-0.6, -0.4, -0.25, 0.2, 0.35, 0.45, 0.55, 0.65, 0.7, 0.85]);
        return {
          q: `等比数列首项 a = ${a}，公比 r = ${f(r)}。求 S<sub>∞</sub>，保留 3 位有效数字。`,
          answers: [{ lab: 'S<sub>∞</sub>', v: a / (1 - r), acc: 3 }],
          seq: `frac ${a} D 1 - ${N(r)} R = sd`,
          work: `${a} ÷ (1 − ${f(r)}) = ${f(a / (1 - r))}`,
        };
      } },
    { id: 'ddx', topic: '微分', name: '曲线在某点的斜率', unit: 'Pure 1',
      formula: `d${X.replace('x', 'y')}/d${X}：用计算器的 d/dx 验算`,
      gen() {
        const c = [nz(-3, 4), ri(-6, 6), ri(-9, 9), ri(-9, 9)], k = nz(-3, 4);
        const g = 3 * c[0] * k * k + 2 * c[1] * k + c[2];
        const terms = [[c[0], 3], [c[1], 2], [c[2], 1], [c[3], 0]];
        return {
          q: `曲线 <i>y</i> = ${polyHtml(terms)}，求在 ${X} = ${f(k)} 处的切线斜率。`,
          answers: [{ lab: '斜率', v: g, acc: 'exact' }],
          seq: `ddx ${polySeq(terms.map(([a, p]) => [a, PB[p]]))} R ${k < 0 ? `neg ${-k}` : k} R =`,
          work: `d<i>y</i>/d${X} = ${polyHtml([[3 * c[0], 2], [2 * c[1], 1], [c[2], 0]])}，代入 ${X} = ${f(k)} 得 ${f(g)}`,
        };
      } },
    { id: 'integral', topic: '积分', name: '定积分', unit: 'Pure 1',
      formula: `∫ₐᵇ f(${X}) d${X}`,
      gen() {
        const c = [nz(-3, 4), ri(-6, 6), ri(-8, 8)], a = ri(-2, 1), b = a + ri(2, 4);
        const F = x => (c[0] * x ** 3) / 3 + (c[1] * x * x) / 2 + c[2] * x, v = F(b) - F(a);
        const terms = [[c[0], 2], [c[1], 1], [c[2], 0]];
        return {
          q: `计算 ∫<sub>${f(a)}</sub><sup>${b}</sup> (${polyHtml(terms)}) d${X}，保留 3 位有效数字。`,
          answers: [{ lab: '积分值', v, acc: 3 }],
          seq: `int ${polySeq(terms.map(([k, p]) => [k, PB[p]]))} R ${a < 0 ? `neg ${-a}` : a} R ${b} R =`,
          work: `原函数 ${polyHtml([[c[0] / 3, 3], [c[1] / 2, 2], [c[2], 1]].map(([k, p]) => [+k.toFixed(4), p]))}，F(${b}) − F(${f(a)}) = ${f(v)}`,
        };
      } },
    { id: 'logeq', topic: '指数与对数', name: '解指数方程 aˣ = b', unit: 'Pure 2 / A Level',
      formula: `a<sup>${X}</sup> = b ⇒ ${X} = log<sub>a</sub> b`,
      gen() {
        const a = pick([2, 3, 5, 1.5, 4, 7]), b = pick([10, 20, 45, 60, 100, 250, 0.5, 0.2]);
        return {
          q: `解方程 ${f(a)}<sup>${X}</sup> = ${f(b)}，保留 3 位有效数字。`,
          answers: [{ lab: X, v: Math.log(b) / Math.log(a), acc: 3 }],
          seq: `logb ${a} R ${b} R =`,
          work: `${X} = log<sub>${f(a)}</sub> ${f(b)} = ln ${f(b)} ÷ ln ${f(a)} = ${f(Math.log(b) / Math.log(a))}`,
        };
      } },
    { id: 'growth', topic: '指数与对数', name: '指数增长 A = Pe^{kt}', unit: 'Pure 2 / A Level',
      formula: 'A = P e<sup>kt</sup>',
      gen() {
        const P = ri(2, 90) * 50, k = pick([0.02, 0.035, 0.05, 0.08, -0.04, -0.06]), t = ri(3, 25);
        const A = P * Math.exp(k * t);
        return {
          q: `某量满足 A = ${P} e<sup>${f(k)}t</sup>。求 t = ${t} 时 A 的值，保留 3 位有效数字。`,
          answers: [{ lab: 'A', v: A, acc: 3 }],
          seq: `${P} pe ${k < 0 ? `neg ${-k}` : k} * ${t} R =`,
          work: `${P} × e<sup>${f(k)} × ${t}</sup> = ${f(A)}`,
        };
      } },
    { id: 'binprob', topic: '概率统计', name: '二项分布 P(X = r)', unit: 'S1',
      formula: 'P(X = r) = ⁿCᵣ pʳ (1 − p)ⁿ⁻ʳ',
      gen() {
        const n = ri(6, 15), r = ri(1, n - 1), p = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.6, 0.7]);
        let C = 1; for (let i = 0; i < r; i++) C = (C * (n - i)) / (i + 1);
        const v = C * p ** r * (1 - p) ** (n - r);
        return {
          q: `X ~ B(${n}, ${f(p)})，求 P(X = ${r})，保留 3 位有效数字。`,
          answers: [{ lab: `P(X = ${r})`, v, acc: 3 }],
          seq: `${n} ncr ${r} * ${p} pow ${r} R * ( 1 - ${p} ) pow ${n - r} R = sd`,
          work: `${n}C${r} × ${f(p)}<sup>${r}</sup> × ${f(1 - p)}<sup>${n - r}</sup> = ${f(v)}`,
        };
      } },
    { id: 'sd', topic: '概率统计', name: '由 Σx、Σx² 求标准差', unit: 'S1',
      formula: 'σ = √(Σx² ÷ n − x̄²)',
      gen() {
        const n = ri(8, 30), mean = dec(4, 40, 1), s = dec(1.5, 9, 1);
        const Sx = +(n * mean).toFixed(1), Sxx = +(n * (s * s + mean * mean)).toFixed(0);
        const sd = Math.sqrt(Sxx / n - (Sx / n) ** 2);
        return {
          q: `一组数据 n = ${n}，Σ${X} = ${f(Sx)}，Σ${X}² = ${f(Sxx)}。求标准差，保留 3 位有效数字。`,
          answers: [{ lab: '标准差', v: sd, acc: 3 }],
          seq: `sqrt frac ${Sxx} D ${n} R - ( frac ${Sx} D ${n} R ) sq R = sd`,
          work: `√(${f(Sxx)} ÷ ${n} − (${f(Sx)} ÷ ${n})²) = ${f(sd)}`,
        };
      } },
    { id: 'comb', topic: '概率统计', name: '排列与组合', unit: 'S1',
      formula: 'ⁿPᵣ = n! ÷ (n − r)!，ⁿCᵣ = n! ÷ (r!(n − r)!)',
      gen() {
        const n = ri(7, 14), r = ri(2, 5), perm = Math.random() < 0.5;
        let v = 1; for (let i = 0; i < r; i++) v *= n - i;
        if (!perm) { let fr = 1; for (let i = 2; i <= r; i++) fr *= i; v /= fr; }
        return {
          q: perm ? `${n} 名同学中选出 ${r} 人担任 ${r} 个不同的职务，共有多少种安排？` : `从 ${n} 名同学中选出 ${r} 人组成小组（不分顺序），共有多少种选法？`,
          answers: [{ lab: '方法数', v, acc: 'exact' }],
          seq: `${n} ${perm ? 'npr' : 'ncr'} ${r} =`,
          work: `${perm ? `${n}P${r}` : `${n}C${r}`} = ${f(v)}`,
        };
      } },
  ];
  return T;
})();

// 答案核对：u 为学生输入的数值
function checkAnswer(u, a) {
  if (!Number.isFinite(u)) return false;
  if (a.acc === 'exact') return Math.abs(u - a.v) <= 1e-9 * Math.max(1, Math.abs(a.v));
  if (Math.abs(u - a.v) <= 1e-9 * Math.max(1, Math.abs(a.v))) return true;
  if (a.acc === 'dp1') return u.toFixed(1) === a.v.toFixed(1);
  return Number(u.toPrecision(a.acc)) === Number(a.v.toPrecision(a.acc));
}
// 学生输入：允许 −、分数 a/b、科学记数法
function parseAnswer(s) {
  const t = String(s).trim().replace(/[−–—]/g, '-').replace(/\s+/g, '').replace(/×10\^?/g, 'e');
  if (!t) return NaN;
  const m = t.match(/^(-?[\d.]+(?:e-?\d+)?)\/(-?[\d.]+)$/);
  if (m) return Number(m[1]) / Number(m[2]);
  return /^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/.test(t) ? Number(t) : NaN;
}
if (typeof module !== 'undefined') module.exports = { PRACTICE, checkAnswer, parseAnswer };
