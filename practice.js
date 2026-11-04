'use strict';
/* 练习模式：Y12（AS Level，9709 Pure 1 / Probability & Statistics 1 常用公式）随机出题。
 * 文字里的公式写成 $…$（行内）或 $$…$$（单独一行），页面上用 KaTeX 排版。
 * 每类题 gen() 返回：
 *   q        题目
 *   answers  [{ lab, v, acc }]，acc：数字 = 有效数字位数，'dp1' = 保留 1 位小数，'exact' = 精确值
 *   seq      提示按法（与 questions.js 同一套记法，三款机型通用）
 *   work     代入公式的过程（检查答案后显示）  */
const PRACTICE = (() => {
  const R = String.raw;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const nz = (a, b) => { let v; do v = ri(a, b); while (v === 0); return v; };
  const dec = (a, b, d = 1) => +(a + Math.random() * (b - a)).toFixed(d);
  const f = v => String(+v.toPrecision(12)); // 公式里的数
  const P = v => (v < 0 ? `(${f(v)})` : f(v)); // 负数加括号
  const N = v => (v < 0 ? `( neg ${-v} )` : `${v}`); // 按键序列里单独出现的数，负数带括号
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
  // 多项式 LaTeX：[[系数, 次数]]，系数可以是 [分子, 分母]
  function poly(terms) {
    let s = '';
    for (const [c, p] of terms) {
      const [n, d] = Array.isArray(c) ? c : [c, 1];
      if (!n) continue;
      const g = gcd(Math.abs(n), d), a = Math.abs(n) / g, b = d / g;
      const body = p === 0 ? '' : p === 1 ? 'x' : `x^{${p}}`;
      const num = b !== 1 ? R`\tfrac{${a}}{${b}}` : a === 1 && body ? '' : String(a);
      s += s ? `${n < 0 ? '-' : '+'}${num}${body}` : `${n < 0 ? '-' : ''}${num}${body}`;
    }
    return s || '0';
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const PB = { 3: 'x cube', 2: 'x sq', 1: 'x', 0: '' };
  const comb = (n, r) => { let c = 1; for (let i = 0; i < r; i++) c = (c * (n - i)) / (i + 1); return c; };

  return [
    { id: 'quad', topic: '二次方程', name: '求根公式解二次方程', unit: 'Pure 1',
      formula: R`$$x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}$$`,
      gen() {
        let a, b, c, D;
        do { a = ri(1, 5); b = nz(-9, 9); c = nz(-9, 9); D = b * b - 4 * a * c; } while (D <= 0 || Number.isInteger(Math.sqrt(D)));
        const r = [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)];
        return {
          q: `解方程 $${poly([[a, 2], [b, 1], [c, 0]])}=0$，结果保留 3 位有效数字。`,
          answers: [{ lab: '$x_1$', v: r[0], acc: 3 }, { lab: '$x_2$', v: r[1], acc: 3 }], any: true,
          seq: `@eq2:${a},${b},${c}`,
          work: R`$a=${a},\ b=${b},\ c=${c}$，$b^2-4ac=${D}$，所以 $x=\dfrac{${-b}\pm\sqrt{${D}}}{${2 * a}}$`,
        };
      } },
    { id: 'disc', topic: '二次方程', name: '判别式 $b^2-4ac$', unit: 'Pure 1',
      formula: R`$$\Delta=b^2-4ac$$`,
      gen() {
        const a = nz(-6, 6), b = nz(-12, 12), c = nz(-9, 9), D = b * b - 4 * a * c;
        return {
          q: `求 $${poly([[a, 2], [b, 1], [c, 0]])}=0$ 的判别式 $b^2-4ac$。`,
          answers: [{ lab: '$b^2-4ac$', v: D, acc: 'exact' }],
          seq: `${N(b)} sq - 4 * ${N(a)} * ${N(c)} =`,
          work: R`$${P(b)}^2-4\times${P(a)}\times${P(c)}=${D}$，${D > 0 ? '有两个不等的实根' : D === 0 ? '有两个相等的实根' : '没有实根'}`,
        };
      } },
    { id: 'dist', topic: '坐标几何', name: '两点间距离', unit: 'Pure 1',
      formula: R`$$d=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$$`,
      gen() {
        let p, d;
        do { p = [ri(-9, 9), ri(-9, 9), ri(-9, 9), ri(-9, 9)]; d = Math.hypot(p[2] - p[0], p[3] - p[1]); } while (!d || Number.isInteger(d));
        return {
          q: `$A(${p[0]},${p[1]})$，$B(${p[2]},${p[3]})$，求 $AB$ 的长，保留 3 位有效数字。`,
          answers: [{ lab: '$AB$', v: d, acc: 3 }],
          seq: `sqrt ( ${N(p[2])} - ${N(p[0])} ) sq + ( ${N(p[3])} - ${N(p[1])} ) sq R =`,
          work: R`$\sqrt{(${p[2]}-${P(p[0])})^2+(${p[3]}-${P(p[1])})^2}=\sqrt{${(p[2] - p[0]) ** 2 + (p[3] - p[1]) ** 2}}$`,
        };
      } },
    { id: 'sector', topic: '弧度制', name: '弧长与扇形面积', unit: 'Pure 1',
      formula: R`$$s=r\theta,\qquad A=\tfrac12r^2\theta$$`,
      gen() {
        const r = dec(3, 15, 1), t = dec(0.4, 2.8, 2);
        return {
          q: R`扇形半径 $r=${f(r)}$ cm，圆心角 $\theta=${f(t)}$ rad。求弧长 $s$ 和面积 $A$，保留 3 位有效数字。`,
          answers: [{ lab: '$s$（cm）', v: r * t, acc: 3 }, { lab: '$A$（cm$^2$）', v: 0.5 * r * r * t, acc: 3 }],
          seq: `${r} * ${t} = frac 1 D 2 R * ${r} sq * ${t} =`,
          work: R`$s=${f(r)}\times${f(t)}=${f(r * t)}$；$A=\tfrac12\times${f(r)}^2\times${f(t)}=${f(0.5 * r * r * t)}$`,
        };
      } },
    { id: 'degrad', topic: '弧度制', name: '角度化成弧度', unit: 'Pure 1',
      formula: R`$$\theta\ (\text{rad})=\theta^\circ\times\frac{\pi}{180}$$`,
      gen() {
        const d = pick([15, 20, 35, 40, 50, 75, 100, 105, 130, 140, 160, 200, 225, 250, 310]);
        return {
          q: R`把 $${d}^\circ$ 化成弧度，保留 3 位有效数字。计算器会先给出带 $\pi$ 的分数。`,
          answers: [{ lab: R`$\theta$（rad）`, v: (d * Math.PI) / 180, acc: 3 }],
          seq: `${d} * pi / 180 = sd`,
          work: R`$${d}\times\dfrac{\pi}{180}=${f((d * Math.PI) / 180)}$`,
        };
      } },
    { id: 'trigeq', topic: '三角', name: '三角方程（弧度制）', unit: 'Pure 1',
      formula: R`$$\sin x=k\ \Rightarrow\ x_1=\sin^{-1}k,\quad x_2=\pi-\sin^{-1}k$$`,
      gen() {
        const k = pick([0.2, 0.3, 0.35, 0.4, 0.45, 0.55, 0.6, 0.65, 0.7, 0.8, 0.85, 0.9]);
        const x1 = Math.asin(k);
        return {
          q: R`解 $\sin x=${k}$，$0\le x\le\pi$（弧度制），保留 3 位有效数字。`,
          answers: [{ lab: '$x_1$', v: x1, acc: 3 }, { lab: '$x_2$', v: Math.PI - x1, acc: 3 }], any: true,
          seq: `@rad "先把计算器改成弧度制，屏幕顶部显示 R" asin ${k} ) = pi - ans =`,
          work: R`$x_1=\sin^{-1}${k}=${f(x1)}$；$x_2=\pi-${f(x1)}=${f(Math.PI - x1)}$`,
        };
      } },
    { id: 'cosrule', topic: '三角', name: '余弦定理求边', unit: 'Pure 1',
      formula: R`$$a^2=b^2+c^2-2bc\cos A$$`,
      gen() {
        const b = ri(4, 20), c = ri(4, 20), A = ri(20, 140);
        const a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos((A * Math.PI) / 180));
        return {
          q: R`$\triangle ABC$ 中，$b=${b}$ cm，$c=${c}$ cm，$A=${A}^\circ$。求 $a$，保留 3 位有效数字（角度制）。`,
          answers: [{ lab: '$a$（cm）', v: a, acc: 3 }],
          seq: `sqrt ${b} sq + ${c} sq - 2 * ${b} * ${c} cos ${A} ) R =`,
          work: R`$a=\sqrt{${b}^2+${c}^2-2\times${b}\times${c}\cos${A}^\circ}=${f(a)}$`,
        };
      } },
    { id: 'area', topic: '三角', name: R`三角形面积 $\tfrac12ab\sin C$`, unit: 'Pure 1',
      formula: R`$$\text{Area}=\tfrac12ab\sin C$$`,
      gen() {
        const a = dec(3, 15, 1), b = dec(3, 15, 1), C = ri(25, 150);
        const S = 0.5 * a * b * Math.sin((C * Math.PI) / 180);
        return {
          q: R`三角形两边 $a=${f(a)}$ cm、$b=${f(b)}$ cm，夹角 $C=${C}^\circ$，求面积，保留 3 位有效数字。`,
          answers: [{ lab: '面积（cm$^2$）', v: S, acc: 3 }],
          seq: `frac 1 D 2 R * ${a} * ${b} sin ${C} ) =`,
          work: R`$\tfrac12\times${f(a)}\times${f(b)}\times\sin${C}^\circ=${f(S)}$`,
        };
      } },
    { id: 'binom', topic: '二项式定理', name: '展开式中某一项的系数', unit: 'Pure 1',
      formula: R`$(p+qx)^n$ 中 $x^r$ 的系数 $=\dbinom{n}{r}p^{\,n-r}q^{\,r}$`,
      gen() {
        const n = ri(5, 9), r = ri(2, n - 2), p = pick([1, 2, 3]), q = pick([-3, -2, 2, 3, 4]);
        const C = comb(n, r), v = C * p ** (n - r) * q ** r;
        return {
          q: `求 $(${p}${q < 0 ? '-' : '+'}${Math.abs(q)}x)^{${n}}$ 展开式中 $x^{${r}}$ 的系数。`,
          answers: [{ lab: `$x^{${r}}$ 的系数`, v, acc: 'exact' }],
          seq: `${n} ncr ${r} * ${p} pow ${n - r} R * ${N(q)} pow ${r} R =`,
          work: R`$\dbinom{${n}}{${r}}\times${p}^{${n - r}}\times(${q})^{${r}}=${C}\times${p ** (n - r)}\times${P(q ** r)}=${v}$`,
        };
      } },
    { id: 'arith', topic: '数列', name: '等差数列求和', unit: 'Pure 1',
      formula: R`$$S_n=\frac n2\bigl(2a+(n-1)d\bigr)$$`,
      gen() {
        const a = ri(-20, 30), d = nz(-6, 9), n = ri(12, 40);
        const S = (n / 2) * (2 * a + (n - 1) * d);
        return {
          q: `等差数列首项 $a=${a}$，公差 $d=${d}$，求前 ${n} 项和 $S_{${n}}$。`,
          answers: [{ lab: `$S_{${n}}$`, v: S, acc: 'exact' }],
          seq: `frac ${n} D 2 R ( 2 * ${N(a)} + ( ${n} - 1 ) * ${N(d)} ) =`,
          work: R`$\tfrac{${n}}{2}\times\bigl(2\times${P(a)}+${n - 1}\times${P(d)}\bigr)=${f(S)}$`,
        };
      } },
    { id: 'geo', topic: '数列', name: '等比数列求和', unit: 'Pure 1',
      formula: R`$$S_n=\frac{a(1-r^n)}{1-r}$$`,
      gen() {
        const a = ri(3, 60), r = pick([0.4, 0.6, 0.75, 0.8, 0.85, 0.9, 1.1, 1.2, 1.5]), n = ri(6, 15);
        const S = (a * (1 - r ** n)) / (1 - r);
        return {
          q: `等比数列首项 $a=${a}$，公比 $r=${r}$，求前 ${n} 项和，保留 3 位有效数字。`,
          answers: [{ lab: `$S_{${n}}$`, v: S, acc: 3 }],
          seq: `frac ${a} ( 1 - ${r} pow ${n} R ) D 1 - ${r} R =`,
          work: R`$\dfrac{${a}(1-${r}^{${n}})}{1-${r}}=${f(S)}$`,
        };
      } },
    { id: 'sinf', topic: '数列', name: '无穷等比数列的和', unit: 'Pure 1',
      formula: R`$$S_\infty=\frac{a}{1-r},\quad |r|<1$$`,
      gen() {
        const a = ri(4, 80), r = pick([-0.6, -0.4, -0.25, 0.2, 0.35, 0.45, 0.55, 0.65, 0.7, 0.85]);
        return {
          q: R`等比数列首项 $a=${a}$，公比 $r=${r}$，求 $S_\infty$，保留 3 位有效数字。`,
          answers: [{ lab: R`$S_\infty$`, v: a / (1 - r), acc: 3 }],
          seq: `frac ${a} D 1 - ${N(r)} R = sd`,
          work: R`$\dfrac{${a}}{1-${P(r)}}=${f(a / (1 - r))}$`,
        };
      } },
    { id: 'ddx', topic: '微分', name: '曲线在某点的斜率', unit: 'Pure 1',
      formula: R`先求 $\dfrac{dy}{dx}$ 再代入；计算器的 d/dx 可以直接验算`,
      gen() {
        const c = [nz(-3, 4), ri(-6, 6), ri(-9, 9), ri(-9, 9)], k = nz(-3, 4);
        const g = 3 * c[0] * k * k + 2 * c[1] * k + c[2];
        const terms = [[c[0], 3], [c[1], 2], [c[2], 1], [c[3], 0]];
        return {
          q: `曲线 $y=${poly(terms)}$，求在 $x=${k}$ 处的切线斜率。`,
          answers: [{ lab: '斜率', v: g, acc: 'exact' }],
          seq: `ddx ${polySeq(terms.map(([a, p]) => [a, PB[p]]))} R ${k < 0 ? `neg ${-k}` : k} R =`,
          work: R`$\dfrac{dy}{dx}=${poly([[3 * c[0], 2], [2 * c[1], 1], [c[2], 0]])}$，代入 $x=${k}$ 得 $${g}$`,
        };
      } },
    { id: 'integral', topic: '积分', name: '定积分', unit: 'Pure 1',
      formula: R`$$\int_a^b f(x)\,dx=F(b)-F(a)$$`,
      gen() {
        const c = [nz(-3, 4), ri(-6, 6), ri(-8, 8)], a = ri(-2, 1), b = a + ri(2, 4);
        const F = x => (c[0] * x ** 3) / 3 + (c[1] * x * x) / 2 + c[2] * x, v = F(b) - F(a);
        const terms = [[c[0], 2], [c[1], 1], [c[2], 0]];
        return {
          q: R`计算 $\displaystyle\int_{${a}}^{${b}}\left(${poly(terms)}\right)dx$，保留 3 位有效数字。`,
          answers: [{ lab: '积分值', v, acc: 3 }],
          seq: `int ${polySeq(terms.map(([k, p]) => [k, PB[p]]))} R ${a < 0 ? `neg ${-a}` : a} R ${b} R =`,
          work: R`$F(x)=${poly([[[c[0], 3], 3], [[c[1], 2], 2], [c[2], 1]])}$，$F(${b})-F(${a})=${f(v)}$`,
        };
      } },
    { id: 'logeq', topic: '指数与对数', name: '解指数方程 $a^x=b$', unit: 'Pure 2 / A Level',
      formula: R`$$a^x=b\ \Rightarrow\ x=\log_a b=\frac{\ln b}{\ln a}$$`,
      gen() {
        const a = pick([2, 3, 5, 1.5, 4, 7]), b = pick([10, 20, 45, 60, 100, 250, 0.5, 0.2]);
        const x = Math.log(b) / Math.log(a);
        return {
          q: `解方程 $${a}^x=${b}$，保留 3 位有效数字。`,
          answers: [{ lab: '$x$', v: x, acc: 3 }],
          seq: `logb ${a} R ${b} R =`,
          work: R`$x=\log_{${a}}${b}=\dfrac{\ln ${b}}{\ln ${a}}=${f(x)}$`,
        };
      } },
    { id: 'growth', topic: '指数与对数', name: '指数增长 $A=Pe^{kt}$', unit: 'Pure 2 / A Level',
      formula: R`$$A=Pe^{kt}$$`,
      gen() {
        const P0 = ri(2, 90) * 50, k = pick([0.02, 0.035, 0.05, 0.08, -0.04, -0.06]), t = ri(3, 25);
        const A = P0 * Math.exp(k * t);
        return {
          q: `$A=${P0}e^{${k}t}$，求 $t=${t}$ 时的 $A$，保留 3 位有效数字。`,
          answers: [{ lab: '$A$', v: A, acc: 3 }],
          seq: `${P0} pe ${k < 0 ? `neg ${-k}` : k} * ${t} R =`,
          work: R`$${P0}\times e^{${k}\times${t}}=${f(A)}$`,
        };
      } },
    { id: 'binprob', topic: '概率统计', name: '二项分布 $P(X=r)$', unit: 'S1',
      formula: R`$$P(X=r)=\binom{n}{r}p^r(1-p)^{n-r}$$`,
      gen() {
        const n = ri(6, 15), r = ri(1, n - 1), p = pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.6, 0.7]);
        const v = comb(n, r) * p ** r * (1 - p) ** (n - r);
        return {
          q: R`$X\sim B(${n},\,${p})$，求 $P(X=${r})$，保留 3 位有效数字。`,
          answers: [{ lab: `$P(X=${r})$`, v, acc: 3 }],
          seq: `${n} ncr ${r} * ${p} pow ${r} R * ( 1 - ${p} ) pow ${n - r} R = sd`,
          work: R`$\dbinom{${n}}{${r}}\times${p}^{${r}}\times${f(1 - p)}^{${n - r}}=${f(v)}$`,
        };
      } },
    { id: 'sd', topic: '概率统计', name: R`由 $\Sigma x$、$\Sigma x^2$ 求标准差`, unit: 'S1',
      formula: R`$$\sigma=\sqrt{\frac{\Sigma x^2}{n}-\bar x^{\,2}}$$`,
      gen() {
        const n = ri(8, 30), mean = dec(4, 40, 1), s = dec(1.5, 9, 1);
        const Sx = +(n * mean).toFixed(1), Sxx = +(n * (s * s + mean * mean)).toFixed(0);
        const sd = Math.sqrt(Sxx / n - (Sx / n) ** 2);
        return {
          q: R`$n=${n}$，$\Sigma x=${f(Sx)}$，$\Sigma x^2=${f(Sxx)}$，求标准差，保留 3 位有效数字。`,
          answers: [{ lab: '标准差', v: sd, acc: 3 }],
          seq: `sqrt frac ${Sxx} D ${n} R - ( frac ${Sx} D ${n} R ) sq R = sd`,
          work: R`$\sqrt{\dfrac{${f(Sxx)}}{${n}}-\left(\dfrac{${f(Sx)}}{${n}}\right)^2}=${f(sd)}$`,
        };
      } },
    { id: 'comb', topic: '概率统计', name: '排列与组合', unit: 'S1',
      formula: R`$\,{}^nP_r=\dfrac{n!}{(n-r)!}$，$\ {}^nC_r=\dfrac{n!}{r!\,(n-r)!}$`,
      gen() {
        const n = ri(7, 14), r = ri(2, 5), perm = Math.random() < 0.5;
        let v = 1; for (let i = 0; i < r; i++) v *= n - i;
        if (!perm) { let fr = 1; for (let i = 2; i <= r; i++) fr *= i; v /= fr; }
        return {
          q: perm ? `${n} 名同学中选出 ${r} 人担任 ${r} 个不同的职务，共有多少种安排？` : `从 ${n} 名同学中选出 ${r} 人组成小组（不分顺序），共有多少种选法？`,
          answers: [{ lab: '方法数', v, acc: 'exact' }],
          seq: `${n} ${perm ? 'npr' : 'ncr'} ${r} =`,
          work: R`$\,{}^{${n}}${perm ? 'P' : 'C'}_{${r}}=${v}$`,
        };
      } },
  ];
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
