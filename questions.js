/* 0580 押题卷（49 题）的计算器按法。
 *
 * seq 记法（空格分隔，见 calc.js 的 runScript；同一段序列在三款机型上按各自的键位展开）：
 *   数字 / + - * / ( ) =          直接按键（- 是减号，负号用 neg）
 *   frac sqrt cbrt sq cube pow rt inv logb sin cos tan asin acos atan pi ans x neg
 *   R L U D                       方向键 ▶ ◀ ▲ ▼
 *   approx sd ddx                 SHIFT = (≈)、S⇔D、SHIFT ∫ (d/dx)
 *   varA varB / stoA stoB         ALPHA 取变量 / STO 存变量
 *   [..]                          屏幕上应有的结果（\f{分子}{分母}、\r{根号内}），由 tests/run.js 核对
 *   ".."                          给前一步加一句说明
 * title / ans / topic 里的公式写成 $…$（LaTeX），页面上用 KaTeX 排版
 *   @deg  @rad                    设置角度制 / 弧度制
 *   @eq2:a,b,c  @eq3:a,b,c,d      方程模式解二次 / 三次方程
 *   @sim2:a1,b1,c1,a2,b2,c2       方程模式解二元一次方程组
 *   @fx … @calc:v [结果]          代入 x = v 求值（EX / ES 用 CALC；CW 用 FUNCTION 定义 f(x) 再算 f(v)）
 *   @table … @range:起,止,步      Table 模式：先输入 f(x)，再设表格范围
 *   tools >Table_Type             按菜单项名称选择（空格写成 _），各机型自动换成数字键或方向键 + OK
 */
const GROUPS = [
  ["interest", "复利"], ["variation", "正比 / 反比"], ["circle", "圆定理"], ["trig", "三角 + 二次方程"],
  ["similar", "相似体"], ["transform", "变换"], ["vector", "向量"], ["solid", "立体几何与体积"],
  ["func", "函数"], ["trigraph", "三角函数图像"], ["seq", "数列"], ["calculus", "图像与求导"],
];

const SETUP = {
  n: 0, g: "undefined", src: '开机后先检查', topic: '设置角度制 Degree', marks: '', paper: 'C',
  ans: '屏幕顶部显示 D 即为角度制',
  parts: [{ lab: '角度制', title: '在设置里把角度单位改成 Degree', seq: '@deg' }],
};

const NOCALC = {
  circle: '圆定理推理题：切线与半径垂直、同弧所对圆周角相等、圆心角是圆周角的 2 倍，只做角度加减，不需要按计算器。',
  transform: '作图 / 描述变换题：在方格纸上完成，不需要按计算器。描述变换要写全（类型 + 中心/向量/比例）。',
  vector: '向量代数题：沿图形写出向量路径，用 a、b 表示后化简，不需要按计算器。',
  func: '函数代数题：复合函数、反函数都靠手算化简，不需要按计算器。',
  seq: '找规律写 nth term：看一阶差、二阶差，分子分母分开找规律。',
  graph: '读图题：在图上作切线，用 rise ÷ run 估算斜率；画直线求交点。',
  power: '比较指数和系数：axⁿ 求导得 naxⁿ⁻¹，不需要按计算器。',
};

const QUESTIONS = [
  { n: 1, g: "interest", src: '0580/22 May/Jun 2022 Q14', topic: String.raw`复利求利率 $r$`, marks: 3, paper: 'C', ans: String.raw`$r=2.6[0]$`,
    parts: [{ lab: 'r', title: String.raw`$4540\left(1+\dfrac{r}{100}\right)^{10}=4540+1328.54$`, seq: String.raw`100 ( rt "▭√▭ 模板：先输开方次数 10" 10 R "▶ 进入被开方数" frac 4540 + 1328.54 "分子：10 年后的本息和" D 4540 R R "连按两次 ▶，依次跳出分数和根号" - 1 ) = [2.600014375] "r ≈ 2.60"` }] },
  { n: 2, g: "interest", src: '0580/21 May/Jun 2024 Q10', topic: String.raw`复利求利率 $r$`, marks: 3, paper: 'C', ans: String.raw`$r=1.25$`,
    parts: [{ lab: 'r', title: String.raw`$1500\left(1+\dfrac{r}{100}\right)^{8}=1656.73$`, seq: String.raw`100 ( rt 8 R frac 1656.73 D 1500 R R - 1 ) = [1.25000648] "r = 1.25"` }] },

  { n: 3, g: "variation", src: '0580/23 May/Jun 2022 Q24', topic: String.raw`反比于 $(x-1)^3$`, marks: 3, paper: 'C', ans: String.raw`$y=2.8$`,
    parts: [{ lab: 'k → y', title: String.raw`$y=\dfrac{k}{(x-1)^3}$：先求 $k$，再求 $y$`, seq: String.raw`9.45 * ( 3 - 1 ) cube = [\f{378}{5}] "k = 9.45 × 2³，先显示成分数" sd [75.6] "换成小数：k = 75.6" ans / ( 4 - 1 ) cube = [\f{14}{5}] sd [2.8] "y = 2.8"` }] },
  { n: 4, g: "variation", src: '0580/43 May/Jun 2025 Q15', topic: String.raw`反比于 $\sqrt{t+2}$`, marks: 3, paper: 'C', ans: String.raw`$m=0.25$`,
    parts: [{ lab: 'k → m', title: String.raw`$m=\dfrac{k}{\sqrt{t+2}}$：先求 $k$，再求 $m$`, seq: String.raw`0.5 * sqrt 23 + 2 R "▶ 跳出根号" = [\f{5}{2}] "k = 0.5 × √25 = 2.5" ans / sqrt 98 + 2 R = [\f{1}{4}] sd [0.25] "m = 0.25"` }] },

  { n: 5, g: "circle", src: '0580/21 Oct/Nov 2023 Q17', topic: '圆定理（切线、圆心）', marks: 3, paper: 'C', ans: String.raw`$x=33$`, nocalc: NOCALC.circle },
  { n: 6, g: "circle", src: '0580/22 May/Jun 2020 Q20', topic: '圆定理（切线、圆心）', marks: 4, paper: 'C', ans: '(a) 49°　(b) 98°　(c) 20°　(d) 70°', nocalc: NOCALC.circle },
  { n: 7, g: "circle", src: '0580/43 May/Jun 2023 Q4(b)', topic: '圆定理（弦切角）', marks: 4, paper: 'C', ans: '(i) 58°　(ii) 106°　(iii) 47°', nocalc: NOCALC.circle },

  { n: 8, g: "trig", src: '0580/42 May/Jun 2018 Q7', topic: '勾股定理 → 二次方程 → 三角', marks: 11, paper: 'C', ans: String.raw`(b) $3.82$，$-1.42$　(c) $14.4$ m　(d) $39.5^\circ$`,
    parts: [
      { lab: '(b) 公式法', title: String.raw`$5x^2-12x-27=0$，用求根公式（答卷要写出代入过程）`, seq: String.raw`frac 12 + sqrt ( neg "(−) 是负号，不是减号" 12 ) sq "负数平方一定加括号" - 4 * 5 * ( neg 27 ) R "▶ 跳出根号" D "▼ 进入分母" 2 * 5 R = [\f{6+3\r{19}}{5}] "先给出精确根式" sd [3.815339366] "x = 3.82" frac 12 - sqrt ( neg 12 ) sq - 4 * 5 * ( neg 27 ) R D 2 * 5 R = [\f{6−3\r{19}}{5}] sd [−1.415339366] "x = −1.42"` },
      { lab: '(b) 方程模式', title: '用方程模式验算两个根', seq: String.raw`@eq2:5,-12,-27 [\f{6+3\r{19}}{5}] [\f{6−3\r{19}}{5}]` },
      { lab: '(c)', title: String.raw`周长 $=x+(2x-3)+6=3x+3$（取正根）`, seq: String.raw`3 * frac 12 + sqrt 684 R D 10 R "x 的精确值 (12 + √684)/10" + 3 = [\f{33+9\r{19}}{5}] sd [14.4460181] "周长 ≈ 14.4 m"` },
      { lab: '(d)', title: String.raw`最小角对最短边 $x$：$\sin\theta=\dfrac{x}{6}$`, seq: String.raw`asin frac 12 + sqrt 684 R D 60 R "x ÷ 6 = (12 + √684)/60" ) = [39.48601756] "最小角 ≈ 39.5°"` },
    ] },
  { n: 9, g: "trig", src: '0580/42 Oct/Nov 2019 Q6', topic: String.raw`余弦定理、正弦定理、$\tfrac12ab\sin C$ + 二次方程`, marks: 16, paper: 'C', ans: String.raw`(a)(i) $13.9$ m　(ii) $66.6^\circ$　(b)(ii) $7.39$，$-10.14$　(iii) $11.4$ m`,
    parts: [
      { lab: '(a)', title: String.raw`余弦定理求 $BC$，再用正弦定理求 $\angle ACB$`, seq: String.raw`sqrt 8 sq + 13 sq - 2 * 8 * 13 cos 79 ) "cos( 后面记得补右括号" R = [13.90365883] "BC ≈ 13.9 m" asin frac 13 sin 79 ) D ans "Ans 就是刚算出的 BC" R ) = [66.61044256] "∠ACB ≈ 66.6°"` },
      { lab: '(b)(ii)', title: String.raw`$4x^2+11x-300=0$（方程模式；答卷仍要写公式）`, seq: String.raw`@eq2:4,11,-300 [7.393729954] [−10.14372995]` },
      { lab: '(b)(iii)', title: String.raw`$DE=x+4$（取正根）`, seq: String.raw`frac neg 11 + sqrt 4921 R D 8 R "正根 (−11 + √4921)/8" + 4 = [11.39372995] "DE ≈ 11.4 m"` },
    ] },
  { n: 10, g: "trig", src: '0580/42 May/Jun 2021 Q6', topic: '正弦定理、面积、最短距离', marks: 13, paper: 'C', ans: '(b) 74.3°　(c) 388 m²　(d) 13.4 m',
    parts: [
      { lab: '(a)', title: String.raw`余弦定理求 $BD$，存入变量 A`, seq: String.raw`sqrt 16 sq + 19 sq - 2 * 16 * 19 cos 57 ) R = [16.90737906] "BD = 16.907… ≈ 16.9 ✓" stoA "存起来，(b)(c) 还要用"` },
      { lab: '(b)', title: String.raw`正弦定理求 $\angle BCD$，再求 $\angle CBD$，存入变量 B`, seq: String.raw`asin frac varA sin 75 ) D 32 R ) = [30.68730014] "∠BCD ≈ 30.69°" 180 - 75 - ans = [74.31269986] "∠CBD ≈ 74.3°" stoB` },
      { lab: '(c)', title: String.raw`面积 $=\tfrac12\cdot16\cdot19\sin57^\circ+\tfrac12\cdot BD\cdot32\sin\angle CBD$`, seq: String.raw`frac 1 D 2 R * 16 * 19 sin 57 ) + frac 1 D 2 R * varA * 32 sin varB ) "用 (a)(b) 存的 A、B，不丢精度" = [387.919654] "面积 ≈ 388 m²"` },
      { lab: '(d)', title: String.raw`$B$ 到 $AD$ 的最短距离 $=16\sin57^\circ$`, seq: String.raw`16 sin 57 ) = [13.41872909] "≈ 13.4 m"` },
    ] },
  { n: 11, g: "trig", src: '0580/41 May/Jun 2022 Q7(a)–(c)', topic: '余弦定理、正弦定理、最短距离', marks: 10, paper: 'C', ans: '(a) 39.6°　(b) 7.05 km　(c) 3.74 km',
    parts: [
      { lab: '(a)', title: String.raw`$\cos\angle ACD=\dfrac{14^2+12^2-9^2}{2\cdot14\cdot12}$`, seq: String.raw`acos frac 14 sq + 12 sq - 9 sq D 2 * 14 * 12 R ) = [39.57121946] "∠ACD ≈ 39.6°"` },
      { lab: '(b)(c)', title: String.raw`正弦定理求 $BC$，再求 $B$ 到 $AC$ 的距离 $BC\sin32^\circ$`, seq: String.raw`frac 14 sin 25 ) D sin 123 ) R = [7.054803031] "BC = 7.054… ≈ 7.05 ✓" ans sin 32 ) = [3.738476031] "距离 ≈ 3.74 km"` },
    ] },

  { n: 12, g: "similar", src: '0580/23 Oct/Nov 2024 Q18', topic: '相似体：体积比 → 长度比', marks: 3, paper: 'C', ans: '7.2 cm',
    parts: [{ lab: 'h', title: String.raw`$h=4.8\times\sqrt[3]{\dfrac{81}{24}}$`, seq: String.raw`4.8 * cbrt frac 81 D 24 R R = [\f{36}{5}] sd [7.2] "高 = 7.2 cm"` }] },
  { n: 13, g: "similar", src: '0580/23 May/Jun 2025 Q17', topic: '相似体：面积比 → 长度比', marks: 3, paper: 'NC', ans: '21 cm',
    parts: [{ lab: '验算', title: String.raw`Non-calculator：考场上心算 $\sqrt{540\div60}=\sqrt9=3$，这里只作验算`, seq: String.raw`7 * sqrt frac 540 D 60 R R = [21]` }] },

  { n: 14, g: "transform", src: '0580/23 May/Jun 2021 Q10', topic: '变换', marks: 4, paper: 'C', ans: '(a) Translation　(b) 顶点 (−1, −1), (−4, −1), (−1, −2)', nocalc: NOCALC.transform },
  { n: 15, g: "transform", src: '0580/23 May/Jun 2024 Q19', topic: '变换', marks: 5, paper: 'C', ans: '(a) Rotation 90° clockwise，centre (0, −2)　(b) 顶点 (−5, −1), (−5, −7), (−7, −7)', nocalc: NOCALC.transform },
  { n: 16, g: "transform", src: '0580/23 May/Jun 2025 Q5', topic: '变换', marks: 7, paper: 'NC', ans: '(a) Enlargement，scale factor 3，centre (1, 2)', nocalc: NOCALC.transform },
  { n: 17, g: "transform", src: '0580/42 Oct/Nov 2020 Q2', topic: '变换', marks: 8, paper: 'C', ans: '(a) Translation　(b)(iii) 顶点 (−1, −2), (−7, −2), (−7, −4)', nocalc: NOCALC.transform },
  { n: 18, g: "transform", src: '0580/42 May/Jun 2021 Q7', topic: '变换', marks: 8, paper: 'C', ans: String.raw`(b) Reflection in $y=-x$`, nocalc: NOCALC.transform },

  { n: 19, g: "vector", src: '0580/23 Oct/Nov 2021 Q26', topic: '位置向量', marks: 3, paper: 'C', ans: String.raw`$\tfrac35\mathbf r+\tfrac25\mathbf t$`, nocalc: NOCALC.vector },
  { n: 20, g: "vector", src: '0580/21 Oct/Nov 2025 Q24', topic: '位置向量', marks: 4, paper: 'NC', ans: String.raw`$\tfrac16\mathbf a+\tfrac54\mathbf b$`, nocalc: NOCALC.vector },
  { n: 21, g: "vector", src: '0580/42 Feb/Mar 2025 Q21', topic: '位置向量', marks: 4, paper: 'C', ans: String.raw`$\tfrac{14}{9}\mathbf m+\tfrac49\mathbf n$`, nocalc: NOCALC.vector },
  { n: 22, g: "vector", src: '0580/42 Feb/Mar 2024 Q7(a)', topic: '列向量与模长', marks: 4, paper: 'C', ans: String.raw`(i) $\dbinom{-12}{15}$　(ii)(a) $\dbinom{12}{-10}$　(b) $15.6$`,
    parts: [{ lab: '(ii)(b)', title: String.raw`$|\mathbf p-\mathbf q|=\sqrt{12^2+(-10)^2}$`, seq: String.raw`sqrt 12 sq + ( neg 10 ) sq "负数平方一定加括号" R = [2\r{61}] "先给出根式" sd [15.62049935] "≈ 15.6"` }] },
  { n: 23, g: "vector", src: '0580/21 May/Jun 2020 Q17', topic: '模长、位置向量', marks: 5, paper: 'C', ans: String.raw`(a)(i) $\dbinom{15}{21}$　(ii) $26$　(b) $\mathbf p+\tfrac34\mathbf q$`,
    parts: [{ lab: '(a)(ii)', title: String.raw`$|\overrightarrow{VW}|=\sqrt{10^2+(-24)^2}$`, seq: String.raw`sqrt 10 sq + ( neg 24 ) sq R = [26]` }] },
  { n: 24, g: "vector", src: '0580/41 Oct/Nov 2021 Q7(b)', topic: '位置向量', marks: 3, paper: 'C', ans: String.raw`$\tfrac34\mathbf p+\tfrac12\mathbf q$`, nocalc: NOCALC.vector },
  { n: 25, g: "vector", src: '0580/22 May/Jun 2022 Q22', topic: '向量比例', marks: 2, paper: 'C', ans: String.raw`$AD:DB=4:3$`, nocalc: NOCALC.vector },

  { n: 26, g: "solid", src: '0580/21 May/Jun 2020 Q19', topic: '长方体：线与底面的夹角', marks: 5, paper: 'C', ans: '12.2°',
    parts: [{ lab: '角', title: String.raw`先由体积求高，再求 $\tan\theta=$ 高 ÷ 底面对角线 $AC$`, seq: String.raw`495 / ( 20 * 5.5 ) = [\f{9}{2}] "高 = 体积 ÷ 底面积" sd [4.5] atan frac ans D sqrt 20 sq + 5.5 sq R "底面对角线 AC" R ) = [12.24042045] "≈ 12.2°"` }] },
  { n: 27, g: "solid", src: '0580/42 May/Jun 2026 Q16', topic: '正四棱锥：体积、棱长、夹角', marks: 9, paper: 'C', ans: '(a) 4　(b) 2541 cm³　(c) 30.3 cm　(d) 67.4°',
    parts: [
      { lab: '(b)', title: String.raw`$V=\tfrac13\times16.5^2\times28$`, seq: String.raw`frac 1 D 3 R * 16.5 sq * 28 = [2541]` },
      { lab: '(c)(d)', title: String.raw`$AB^2=28^2+BF^2$（$BF^2=16.5^2\div2$），再求 $AB$ 与底面的夹角`, seq: String.raw`sqrt 28 sq + frac 16.5 sq D 2 R "BF² = 16.5² ÷ 2（半对角线的平方）" R = [30.33356227] "AB ≈ 30.3 cm" asin frac 28 D ans R ) = [67.37909724] "≈ 67.4°"` },
    ] },
  { n: 28, g: "solid", src: '0580/21 Oct/Nov 2021 Q21', topic: '正四棱锥：棱与底面的夹角', marks: 4, paper: 'C', ans: '68.6°',
    parts: [{ lab: '角', title: String.raw`$OC$ = 底面对角线的一半，$\tan\theta=9\div OC$`, seq: String.raw`sqrt 5 sq + 5 sq R / 2 = [\f{5\r{2}}{2}] "OC = 对角线的一半" atan frac 9 D ans R ) = [68.55325848] "≈ 68.6°"` }] },
  { n: 29, g: "solid", src: '0580/23 Oct/Nov 2023 Q21', topic: '长方体：空间对角线与夹角', marks: 6, paper: 'C', ans: '(a) 11.7 cm　(b) 42.9°',
    parts: [{ lab: '(a)(b)', title: String.raw`$BM=\sqrt{7^2+5^2+8^2}$，$\sin\theta=\dfrac{8}{BM}$`, seq: String.raw`sqrt 7 sq + 5 sq + 8 sq R "M 是 HG 中点，长度方向只有 14 ÷ 2 = 7" = [\r{138}] sd [11.74734012] "BM ≈ 11.7 cm" asin frac 8 D ans R ) = [42.92224487] "≈ 42.9°"` }] },
  { n: 30, g: "solid", src: '0580/41 May/Jun 2021 Q3(b)', topic: '圆台体积（大圆锥 − 小圆锥）', marks: 4, paper: 'C', ans: '953 cm³',
    parts: [{ lab: 'V', title: String.raw`小圆锥：高 $16-12=4$，半径 $7.6\times\dfrac{4}{16}=1.9$`, seq: String.raw`frac 1 D 3 R pi * 7.6 sq * 16 - frac 1 D 3 R pi * 1.9 sq * 4 approx [952.6565563] "直接给出小数：≈ 953 cm³"` }] },
  { n: 31, g: "solid", src: '0580/22 Oct/Nov 2022 Q21', topic: '圆台体积（大圆锥 − 小圆锥）', marks: 4, paper: 'C', ans: '228 cm³',
    parts: [{ lab: 'V', title: String.raw`直径 9.2，半径 4.6；小圆锥高 $12.5-5.5=7$，半径 $4.6\times\dfrac{7}{12.5}$`, seq: String.raw`frac 1 D 3 R pi * 4.6 sq * 12.5 "半径用 4.6，不是直径 9.2" - frac 1 D 3 R pi * ( 4.6 * 7 / 12.5 ) sq * 7 approx [228.3409736] "≈ 228 cm³"` }] },
  { n: 32, g: "solid", src: '0580/43 May/Jun 2025 Q23', topic: '圆台体积（大圆锥 − 小圆锥）', marks: 4, paper: 'C', ans: '168 cm³',
    parts: [{ lab: 'V', title: String.raw`大圆锥高 $7.5+4.5=12$；小圆锥半径 $4.2\times\dfrac{7.5}{12}$`, seq: String.raw`frac 1 D 3 R pi * 4.2 sq * 12 - frac 1 D 3 R pi * ( 4.2 * 7.5 / 12 ) sq * 7.5 approx [167.5519354] "≈ 168 cm³"` }] },

  { n: 33, g: "func", src: '0580/23 Oct/Nov 2022 Q19', topic: '函数：复合、反函数（分式）', marks: 6, paper: 'C', ans: String.raw`(a) $\dfrac{2}{x-1}$　(b) $\dfrac{10+2x}{x}$　(c) $x-1$`, nocalc: NOCALC.func },
  { n: 34, g: "func", src: '0580/43 Oct/Nov 2024 Q11', topic: '函数：分式、指数、反函数', marks: 14, paper: 'C', ans: String.raw`(a) $7$　(d) $\tfrac23$　(f) $-5$　(g) $1$　（(b)(c)(e) 为代数化简）`,
    parts: [
      { lab: '(a)', title: String.raw`$g(-3)=1-2(-3)$`, seq: String.raw`1 - 2 * ( neg 3 ) = [7]` },
      { lab: '(d)', title: String.raw`$hh(1)$：$h(1)=\dfrac{1}{1+1}$，再代入 $h$`, seq: String.raw`frac 1 D frac 1 D 1 + 1 R "内层：h(1) = 1/2" + 1 R = [\f{2}{3}] "hh(1) = 2/3"` },
      { lab: '(f)', title: String.raw`$2^x=\dfrac1{32}\Rightarrow x=\log_2\dfrac1{32}$`, seq: String.raw`logb "log▭(□)：先输底数" 2 R "▶ 进入真数" frac 1 D 32 R R = [−5]` },
      { lab: '(g)', title: String.raw`$j^{-1}(x)=0\Rightarrow x=j(0)=2^0$`, seq: String.raw`2 pow 0 R = [1]` },
    ] },

  { n: 35, g: "trigraph", src: '0580/43 May/Jun 2026 Q12', topic: 'cos 图像与三角方程', marks: 5, paper: 'C', ans: '(b) 109.5°, 250.5°',
    parts: [{ lab: '(b)', title: String.raw`$3\cos x+1=0\Rightarrow\cos x=-\dfrac13$`, seq: String.raw`acos neg frac 1 D 3 R ) = [109.4712206] "第一个解" 360 - ans "cos 图像关于 x = 180° 对称" = [250.5287794] "第二个解"` }] },
  { n: 36, g: "trigraph", src: '0580/41 May/Jun 2020 Q8(a)–(b)', topic: 'sin 图像、对称性、三角方程', marks: 7, paper: 'C', ans: '(a)(ii) 旋转对称 order 2，中心 (180, 0)　(b) 48.6°, 131.4°',
    parts: [{ lab: '(b)', title: String.raw`$4\sin x-1=2\Rightarrow\sin x=\dfrac34$`, seq: String.raw`asin frac 3 D 4 R ) = [48.59037789] "第一个解" 180 - ans "sin 图像关于 x = 90° 对称" = [131.4096221] "第二个解"` }] },

  { n: 37, g: "seq", src: '0580/23 Oct/Nov 2025 Q16', topic: '数列表格', marks: 5, paper: 'NC', ans: String.raw`A $5n+3$　B $\dfrac{n+1}{n+2}$　C $2^{n-3}$`, nocalc: NOCALC.seq },
  { n: 38, g: "seq", src: '0580/43 May/Jun 2025 Q11', topic: '数列表格', marks: 8, paper: 'C', ans: String.raw`A $-2$，$34-6n$　B $\tfrac{6}{11}$，$\dfrac{n}{n+5}$　C $8$，$2^{n-3}$`,
    parts: [{ lab: '验算 C', title: String.raw`用 Table 模式检查 C 的 nth term $2^{n-3}$`, seq: String.raw`@table 2 pow x - 3 R @range:1,6,1` }] },
  { n: 39, g: "seq", src: '0580/41 Oct/Nov 2023 Q6(a)', topic: '数列表格（含二次）', marks: 10, paper: 'C', ans: String.raw`A $9$，$4n-11$　B $55$，$2n^2+5$　C $\tfrac{6}{2187}$，$\dfrac{n+1}{3^{n+2}}$`,
    parts: [{ lab: '验算 B', title: String.raw`用 Table 模式检查 B 的 nth term $2n^2+5$`, seq: String.raw`@table 2 x sq + 5 @range:1,5,1` }] },
  { n: 40, g: "seq", src: '0580/22 Oct/Nov 2021 Q12', topic: '数列表格', marks: 5, paper: 'C', ans: String.raw`A $13-5n$　B $\dfrac{n+1}{n}$　C $2^{n-2}$`,
    parts: [{ lab: '验算 C', title: String.raw`用 Table 模式检查 C 的 nth term $2^{n-2}$`, seq: String.raw`@table 2 pow x - 2 R @range:1,5,1` }] },
  { n: 41, g: "seq", src: '0580/42 Feb/Mar 2025 Q13', topic: '数列表格（含立方）', marks: 6, paper: 'C', ans: String.raw`A $n^3+4$　B $\dfrac{n+2}{11-n}$　C $2^{n+1}$`,
    parts: [{ lab: '验算 A', title: String.raw`用 Table 模式检查 A 的 nth term $n^3+4$`, seq: String.raw`@table x cube + 4 @range:1,5,1` }] },
  { n: 42, g: "seq", src: '0580/42 Oct/Nov 2020 Q11', topic: '数列表格（含立方）', marks: 12, paper: 'C', ans: String.raw`(a) A $-3$，$17-4n$　B $124$，$n^3-1$　C $\tfrac{11}{128}$，$\dfrac{n+6}{2^{n+2}}$　(b) $\dfrac{p+1}{2q}$`,
    parts: [{ lab: '验算 B', title: String.raw`用 Table 模式检查 B 的 nth term $n^3-1$`, seq: String.raw`@table x cube - 1 @range:1,5,1` }] },

  { n: 43, g: "calculus", src: '0580/41 Oct/Nov 2020 Q5(a)', topic: '图像法解方程、切线斜率', marks: 7, paper: 'C', ans: String.raw`(i) $2.7\sim2.8$　(ii) $6\sim10$　(iii) $-2.9\sim-2.8$`, nocalc: NOCALC.graph },
  { n: 44, g: "calculus", src: '0580/42 Oct/Nov 2023 Q9', topic: '求导：最大值点、斜率', marks: 8, paper: 'C', ans: String.raw`(a) $12x^2-4x^3$　(b) $(3,27)$　(c) $-64$`,
    parts: [
      { lab: '(b)', title: String.raw`$12x^2-4x^3=0\Rightarrow x=3$（手算），再代入求 $y$`, seq: String.raw`@fx 4 x cube - x pow 4 R @calc:3 [27] "B = (3, 27)"` },
      { lab: '(c)', title: String.raw`A：$4x^3-x^4=0\Rightarrow x=4$，用 d/dx 求该点斜率`, seq: String.raw`ddx 4 x cube - x pow 4 R R "▶ 跳到 x = 的位置" 4 R = [−64] "斜率 = −64"` },
    ] },
  { n: 45, g: "calculus", src: '0580/42 Feb/Mar 2023 Q9', topic: '求导：斜率、驻点', marks: 9, paper: 'C', ans: String.raw`(a) $-3$　(b) $(0,-4)$，$(2,-8)$`,
    parts: [
      { lab: '(a)', title: String.raw`$f'(1)$：用 d/dx 直接求`, seq: String.raw`ddx x cube - 3 x sq - 4 R 1 R = [−3]` },
      { lab: '(b)', title: String.raw`$3x^2-6x=0\Rightarrow x=0$ 或 $2$，分别代入求 $y$`, seq: String.raw`@fx x cube - 3 x sq - 4 @calc:0 [−4] "(0, −4)" @calc:2 [−8] "(2, −8)"` },
    ] },
  { n: 46, g: "calculus", src: '0580/43 Oct/Nov 2023 Q11(b)–(c)', topic: '求导：已知斜率求点', marks: 5, paper: 'C', ans: String.raw`(b) $5-4x$　(c) $(-3,-15)$`,
    parts: [
      { lab: '(c)', title: String.raw`$5-4x=17\Rightarrow x=-3$，代入求 $y$`, seq: String.raw`@fx 18 + 5 x - 2 x sq @calc:-3 [−15] "点 (−3, −15)"` },
      { lab: '验算', title: String.raw`用 d/dx 验证 $x=-3$ 处斜率是 17`, seq: String.raw`ddx 18 + 5 x - 2 x sq R neg 3 R = [17]` },
    ] },
  { n: 47, g: "calculus", src: '0580/42 Feb/Mar 2021 Q12(a)', topic: '求导：某点斜率', marks: 3, paper: 'C', ans: '17',
    parts: [{ lab: '(a)', title: String.raw`$\dfrac{d}{dx}(2x^3-7x+4)$ 在 $x=-2$ 的值`, seq: String.raw`ddx 2 x cube - 7 x + 4 R neg 2 R = [17]` }] },
  { n: 48, g: "calculus", src: '0580/41 May/Jun 2022 Q6(c)', topic: '由导数求指数和系数', marks: 2, paper: 'C', ans: String.raw`$p=7$，$q=3$`, nocalc: NOCALC.power },
  { n: 49, g: "calculus", src: '0580/22 Oct/Nov 2023 Q25', topic: '由导数求指数和系数', marks: 2, paper: 'C', ans: String.raw`$a=3$，$k=5$`, nocalc: NOCALC.power },
];
