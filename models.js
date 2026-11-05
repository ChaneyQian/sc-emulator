'use strict';
/* 三款计算器的定义：键面、第二功能标签、每个键对应的逻辑功能、键盘排布、菜单，以及按法演示用的按键路径。
 * 逻辑功能名（fn）与 questions.js / practice.js 里的按键记法一致，同一段按键序列能在三款机型上各自按出来。 */
const BOX = '<span class="bx"></span>';
const SBOX = '<span class="bx sm"></span>';
const svg = (d, extra = '') => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"${extra}>${d}</svg>`;
const ICON = {
  home: svg('<path d="M4.5 11.2 12 5l7.5 6.2V19a.8.8 0 0 1-.8.8h-4.2v-5h-5v5H5.3a.8.8 0 0 1-.8-.8z"/>'),
  settings: svg('<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" class="fill"/><circle cx="15.5" cy="12" r="2" class="fill"/><circle cx="8" cy="17" r="2" class="fill"/>'),
  back: svg('<path d="M9.5 6.5 5.5 10.5l4 4"/><path d="M5.5 10.5h8.5a4.5 4.5 0 0 1 0 9H11"/>'),
  book: svg('<path d="M12 7c-2-1.6-5-2-7.5-1.6v12.2C7 17.2 10 17.6 12 19c2-1.4 5-1.8 7.5-1.4V5.4C17 5 14 5.4 12 7zM12 7v12"/>'),
  tools: svg('<circle cx="5.5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="18.5" cy="12" r="2.2"/>'),
  shift: svg('<path d="M12 4.5 5.5 11h3.8v7.5h5.4V11h3.8z"/>'),
  pgup: svg('<path d="M7 11.5 12 6.5l5 5M7 17l5-5 5 5"/>'),
  pgdn: svg('<path d="M7 7l5 5 5-5M7 12.5l5 5 5-5"/>'),
  del: svg('<path d="M9 6h10.2c.5 0 .8.3.8.8v10.4c0 .5-.3.8-.8.8H9l-5.5-6z" class="fill"/><path d="m11.2 9.2 5.6 5.6m0-5.6-5.6 5.6" class="cut"/>'),
  up: svg('<path d="M7 14.5 12 9.5l5 5"/>'), down: svg('<path d="M7 9.5l5 5 5-5"/>'),
  left: svg('<path d="M14.5 7 9.5 12l5 5"/>'), right: svg('<path d="M9.5 7l5 5-5 5"/>'),
};
const FRAC_FACE = `<span class="ffr">${BOX}${BOX}</span>`;
const MIX_LBL = `${SBOX}<span class="ffr sm">${SBOX}${SBOX}</span>`;

/* ---------- 逻辑功能：名称（说明文字）与按键条上的简写 ---------- */
const FN = {
  dot: ['小数点', '.'], add: ['加号 +', '+'], sub: ['减号 −', '−'], mul: ['乘号 ×', '×'], div: ['除号 ÷', '÷'],
  lp: ['左括号', '('], rp: ['右括号', ')'], comma: ['逗号：分隔多个参数', ','], neg: ['(−) 负号：输入负数（减法用 − 键）', '(−)'],
  frac: ['分数模板：先输分子，▼ 进入分母', '▭/▭'], mixfrac: ['带分数模板', '▭▭/▭'],
  sqrt: ['√ 平方根：输完按 ▶ 跳出根号', '√'], cbrt: ['∛ 立方根', '∛'], rt: ['ⁿ√ 任意次方根：先输次数，▶ 再输被开方数', 'ⁿ√'],
  sq: ['x² 平方', 'x²'], cube: ['x³ 立方', 'x³'], pow: ['x▭ 乘方：输完指数按 ▶ 跳出', 'x▭'], inv: ['x⁻¹ 倒数', 'x⁻¹'],
  fact: ['x! 阶乘', 'x!'], pct: ['% 百分号', '%'], dms: ['°′″ 度分秒', '°′″'],
  log: ['log 常用对数（以 10 为底）', 'log'], logb: ['log▭(□) 任意底对数：先输底数，▶ 再输真数', 'log▭'], ln: ['ln 自然对数', 'ln'],
  p10: ['10▭ 10 的乘方', '10▭'], pe: ['e▭ e 的乘方', 'e▭'],
  sin: ['sin 正弦，最后补右括号', 'sin'], cos: ['cos 余弦，最后补右括号', 'cos'], tan: ['tan 正切，最后补右括号', 'tan'],
  asin: ['sin⁻¹：由正弦值求角', 'sin⁻¹'], acos: ['cos⁻¹：由余弦值求角', 'cos⁻¹'], atan: ['tan⁻¹：由正切值求角', 'tan⁻¹'],
  pi: ['π 圆周率', 'π'], e: ['e 自然常数', 'e'], ans: ['Ans：调用上一次的计算结果', 'Ans'],
  x: ['变量 x', 'x'], y: ['变量 y', 'y'], z: ['变量 z', 'z'], varM: ['变量 M', 'M'],
  npr: ['nPr 排列数', 'nPr'], ncr: ['nCr 组合数', 'nCr'], abs: ['Abs 绝对值', 'Abs'],
  ddx: ['d/dx：输入函数，▶ 到 x= 输入横坐标', 'd/dx'], int: ['∫ 定积分：依次输入被积函数、下限、上限', '∫'],
  sum: ['Σ 求和：依次输入通项、起始值、结束值', 'Σ'], e10: ['×10ˣ 科学记数法', '×10ˣ'],
  eq: ['= 计算', '='], approx: ['≈：直接给出小数', '≈'], sd: ['S⇔D：分数 / 根式 ⇄ 小数', 'S⇔D'], format: ['FORMAT：转换结果的显示格式', 'FORMAT'],
  R: ['▶ 光标右移：跳出当前模板，或进入下一格', '▶'], L: ['◀ 光标左移', '◀'], U: ['▲ 光标上移', '▲'], D: ['▼ 光标下移', '▼'],
  del: ['DEL 删除光标前一个字符', 'DEL'], ac: ['AC 清屏 / 退出菜单', 'AC'], on: ['开机', 'ON'], off: ['关机', 'OFF'],
  menu: ['MENU：选择计算模式', 'MENU'], setup: ['SETUP：设置（角度单位、输入输出格式）', 'SETUP'],
  calc: ['CALC：给式子里的变量代入数值', 'CALC'], solve: ['SOLVE：解方程', 'SOLVE'], eqsign: ['= 等号（写方程用）', '='],
  sto: ['STO：把结果存进变量', 'STO'], rcl: ['RCL：查看变量的值', 'RCL'], recall: ['RECALL：查看全部变量', 'RECALL'],
  mplus: ['M+：结果累加到 M', 'M+'], mminus: ['M−：从 M 中减去结果', 'M−'],
  ok: ['OK：确认选择', 'OK'], back: ['返回上一级', '↶'], var: ['VARIABLE：变量列表（存入 / 调用）', 'VAR'], undo: ['UNDO：撤消上一步按键，再按一次就重做', 'UNDO'],
  func: ['FUNCTION：定义或调用 f(x)、g(x)', 'f(x)'], catalog: ['CATALOG：函数目录', 'CATALOG'], tools: ['TOOLS：当前应用的工具菜单', 'TOOLS'],
  pgup: ['向上翻页', '⇞'], pgdn: ['向下翻页', '⇟'], fx: ['f( 调用已定义的 f(x)', 'f('], gx: ['g( 调用已定义的 g(x)', 'g('],
  ran: ['Ran# 随机小数', 'Ran#'], ranint: ['RanInt# 随机整数', 'RanInt'], rnd: ['Rnd 按显示位数取整', 'Rnd'],
};
for (const d of '0123456789') FN[d] = [`数字 ${d}`, d];
for (const v of 'ABCDEF') FN['var' + v] = [`变量 ${v}`, v];
// 没有模拟的功能：按下时屏幕提示“还没做”
const NA = {
  optn: 'OPTN 选项菜单', qr: 'QR Code', colon: ': 多语句', eng: 'ENG 工程记数法', hyp: 'hyp 双曲函数', ins: 'INS 插入 / 改写',
  const: 'CONST 科学常数', conv: 'CONV 单位换算', reset: 'RESET 复位', clr: 'CLR 清除', pol: 'Pol 极坐标', rec: 'Rec 直角坐标', drg: 'DRG▶ 角度换算',
  angle: '∠ 极角', larr: '← 复数运算', i: 'i 虚数单位', mixconv: 'a b/c ⇔ d/c 带分数 / 假分数', pfact: 'FACT 质因数分解',
  matrix: 'MATRIX', vector: 'VECTOR', stat: 'STAT', cmplx: 'CMPLX', base: 'BASE',
};
for (const [k, v] of Object.entries(NA)) FN[k] = [v, v.split(' ')[0]];

/* ---------- 键定义 ---------- *
 * face 键面；fn 主功能；sh / al = [功能, 标签 HTML]（SHIFT 黄色 / ALPHA 红色）；ex 额外标签；cls 外形 */
const K = (face, fn, sh, al, o = {}) => ({ face, fn, sh: sh || null, al: al || null, ...o });

/* 菜单：n 编号（按数字键直接选），key 用于按法演示里按名称选择 */
const I = (n, key, ic, act, lab) => ({ n, key, ic, act, lab: lab || key });
const L = (n, key, act, lab) => ({ n, key, act, lab: lab || key });
const T = (key, act, lab) => ({ n: null, key, act, lab: lab || key });

/* 按法演示的宏：返回逻辑功能 / {pick} / {raw} 组成的列表 */
const digitsOf = v => [...String(v)].map(c => (c === '-' ? 'neg' : c === '.' ? 'dot' : c === '/' ? 'frac' : c));
const coefs = vals => vals.flatMap(v => [...digitsOf(v), 'eq']);

const MODELS = {};

/* ======================= fx-991EX ClassWiz ======================= */
MODELS.ex = {
  id: 'ex', name: 'fx-991EX', series: 'ClassWiz', img: 'img/fx-991ex',
  tagline: '按 MENU 再按数字选模式。CALC、S⇔D 都有单独的键，第二功能分 SHIFT 黄色和 ALPHA 红色。',
  exe: '=', implicitHigh: false, hasAlpha: true,
  keys: {
    shift: K('', 'shift', null, null, { cls: 'round', top: [['SHIFT', 'sh']] }),
    alpha: K('', 'alpha', null, null, { cls: 'round', top: [['ALPHA', 'al']] }),
    menu: K('', 'menu', ['setup', 'SETUP'], null, { cls: 'round', top: [['MENU', 'wh'], ['SETUP', 'sh']] }),
    on: K('', 'on', null, null, { cls: 'round', top: [['ON', 'wh']] }),
    optn: K('OPTN', 'optn', ['qr', 'QR']),
    calc: K('CALC', 'calc', ['solve', 'SOLVE'], ['eqsign', '=']),
    int: K(`∫<span class="lim">${SBOX}${SBOX}</span>${BOX}`, 'int', ['ddx', `<span class="ffr sm"><i>d</i><i>dx</i></span>${SBOX}`], ['colon', ':']),
    x: K('<i>x</i>', 'x', ['sum', `Σ${SBOX}`]),
    frac: K(FRAC_FACE, 'frac', ['mixfrac', MIX_LBL]),
    sqrt: K(`√${BOX}`, 'sqrt', ['cbrt', `∛${SBOX}`]),
    x2: K('<i>x</i><sup>2</sup>', 'sq', ['cube', '<i>x</i><sup>3</sup>'], null, { ex: [['DEC', 'bl']] }),
    xpow: K(`<i>x</i><sup>${SBOX}</sup>`, 'pow', ['rt', `<sup>${SBOX}</sup>√${SBOX}`], null, { ex: [['HEX', 'bl']] }),
    logb: K(`log<sub>${SBOX}</sub>${BOX}`, 'logb', ['p10', `10<sup>${SBOX}</sup>`], null, { ex: [['BIN', 'bl']] }),
    ln: K('ln', 'ln', ['pe', `<i>e</i><sup>${SBOX}</sup>`], null, { ex: [['OCT', 'bl']] }),
    neg: K('(−)', 'neg', ['log', 'log'], ['varA', 'A']),
    dms: K('°′″', 'dms', ['pfact', 'FACT'], ['varB', 'B']),
    xinv: K('<i>x</i><sup>−1</sup>', 'inv', ['fact', '<i>x</i>!'], ['varC', 'C']),
    sin: K('sin', 'sin', ['asin', 'sin<sup>−1</sup>'], ['varD', 'D']),
    cos: K('cos', 'cos', ['acos', 'cos<sup>−1</sup>'], ['varE', 'E']),
    tan: K('tan', 'tan', ['atan', 'tan<sup>−1</sup>'], ['varF', 'F']),
    sto: K('STO', 'sto', ['recall', 'RECALL']),
    eng: K('ENG', 'eng', ['angle', '∠'], ['i', '<i>i</i>'], { alc: 'pu' }),
    lp: K('(', 'lp', ['abs', 'Abs']),
    rp: K(')', 'rp', ['comma', ','], ['x', '<i>x</i>']),
    sd: K('S⇔D', 'sd', ['mixconv', 'a<sup>b</sup>/<sub>c</sub>⇔<sup>d</sup>/<sub>c</sub>'], ['y', '<i>y</i>']),
    mplus: K('M+', 'mplus', ['mminus', 'M−'], ['varM', 'M']),
    n7: K('7', '7', ['const', 'CONST'], null, { cls: 'num' }), n8: K('8', '8', ['conv', 'CONV'], null, { cls: 'num' }), n9: K('9', '9', ['reset', 'RESET'], null, { cls: 'num' }),
    del: K('DEL', 'del', ['ins', 'INS'], ['undo', 'UNDO'], { cls: 'num blue' }), ac: K('AC', 'ac', ['off', 'OFF'], null, { cls: 'num blue' }),
    n4: K('4', '4', null, null, { cls: 'num' }), n5: K('5', '5', null, null, { cls: 'num' }), n6: K('6', '6', null, null, { cls: 'num' }),
    mul: K('×', 'mul', ['npr', 'nPr'], null, { cls: 'num' }), div: K('÷', 'div', ['ncr', 'nCr'], null, { cls: 'num' }),
    n1: K('1', '1', null, null, { cls: 'num' }), n2: K('2', '2', null, null, { cls: 'num' }), n3: K('3', '3', null, null, { cls: 'num' }),
    add: K('+', 'add', ['pol', 'Pol'], null, { cls: 'num' }), sub: K('−', 'sub', ['rec', 'Rec'], null, { cls: 'num' }),
    n0: K('0', '0', ['rnd', 'Rnd'], null, { cls: 'num' }), dot: K('•', 'dot', ['ran', 'Ran#'], ['ranint', 'RanInt'], { cls: 'num' }),
    exp: K('×10<sup><i>x</i></sup>', 'e10', ['pi', 'π'], ['e', '<i>e</i>'], { cls: 'num' }),
    ans: K('Ans', 'ans', ['pct', '%'], null, { cls: 'num' }), eq: K('=', 'eq', ['approx', '≈'], null, { cls: 'num' }),
    up: K(ICON.up, 'U'), down: K(ICON.down, 'D'), left: K(ICON.left, 'L'), right: K(ICON.right, 'R'),
  },
  layout: [
    { cls: 'pad-top', cols: 6, cells: [['shift', 1, 1], ['alpha', 1, 2], ['dpad', 1, 3, 2, 2], ['menu', 1, 5], ['on', 1, 6], ['optn', 2, 1], ['calc', 2, 2], ['int', 2, 5], ['x', 2, 6]] },
    { cls: 'pad-fn', cols: 6, cells: ['frac', 'sqrt', 'x2', 'xpow', 'logb', 'ln', 'neg', 'dms', 'xinv', 'sin', 'cos', 'tan', 'sto', 'eng', 'lp', 'rp', 'sd', 'mplus'] },
    { cls: 'pad-num', cols: 5, cells: ['n7', 'n8', 'n9', 'del', 'ac', 'n4', 'n5', 'n6', 'mul', 'div', 'n1', 'n2', 'n3', 'add', 'sub', 'n0', 'dot', 'exp', 'ans', 'eq'] },
  ],
  dpad: 'ring',
  menus: {
    main: { kind: 'icons', num: true, cols: 4, rows: 2, items: [
      I('1', 'Calculate', '×÷<br>+−', 'app:calc'), I('2', 'Complex', '<i>i</i>∠', 'na'), I('3', 'Base-N', '2 8<br>10 16', 'na'), I('4', 'Matrix', '[⁘]', 'na'),
      I('5', 'Vector', '↗', 'na'), I('6', 'Statistics', 'ılı', 'na'), I('7', 'Distribution', '∩', 'na'), I('8', 'Spreadsheet', '▦', 'na'),
      I('9', 'Table', '▤', 'app:table'), I('A', 'Equation/Func', '<i>xy</i><br>=0', 'menu:eqn'), I('B', 'Inequality', '<i>xy</i><br>&gt;0', 'na'), I('C', 'Ratio', '□:□', 'na')] },
    // 每屏 4 项，每屏都从 1 编号，▲▼ 翻屏（据 Casio 的 fx-991EX 快速入门）
    setup: { kind: 'list', num: true, perPage: 4, items: [
      L('1', 'Input/Output', 'menu:io'), L('2', 'Angle Unit', 'menu:angle'), L('3', 'Number Format', 'na'), L('4', 'Engineer Symbol', 'na'),
      L('1', 'Fraction Result', 'na'), L('2', 'Complex', 'na'), L('3', 'Statistics', 'na'), L('4', 'Spreadsheet', 'na'),
      L('1', 'Equation/Func', 'na'), L('2', 'Table', 'na'), L('3', 'Decimal Mark', 'na'), L('4', 'Digit Separator', 'na'),
      L('1', 'MultiLine Font', 'menu:font'), L('2', 'QR Code', 'na'), L('3', 'Contrast', 'na')] },
    io: { kind: 'list', num: true, title: 'Input/Output', items: [L('1', 'MathI/MathO', 'io:math'), L('2', 'MathI/DecimalO', 'io:dec'), L('3', 'LineI/LineO', 'io:line'), L('4', 'LineI/DecimalO', 'io:linedec')] },
    font: { kind: 'list', num: true, title: 'MultiLine Font', items: [L('1', 'Normal Font', 'font:normal'), L('2', 'Small Font', 'font:small')] },
    angle: { kind: 'list', num: true, title: 'Angle Unit', items: [L('1', 'Degree', 'angle:D'), L('2', 'Radian', 'angle:R'), L('3', 'Gradian', 'angle:G')] },
    eqn: { kind: 'list', num: true, items: [L('1', 'Simul Equation', 'menu:simul'), L('2', 'Polynomial', 'menu:poly')] },
    simul: { kind: 'list', num: true, title: 'Number of Unknowns?', items: [L('2', '2 Unknowns', 'sim:2'), L('3', '3 Unknowns', 'sim:3'), L('4', '4 Unknowns', 'na')] },
    poly: { kind: 'list', num: true, title: 'Degree?', items: [L('2', 'ax²+bx+c', 'poly:2', 'a<i>x</i>²+b<i>x</i>+c'), L('3', 'ax³+bx²+cx+d', 'poly:3', 'a<i>x</i>³+b<i>x</i>²+c<i>x</i>+d'), L('4', 'ax⁴+bx³+cx²+dx+e', 'na', 'a<i>x</i>⁴+b<i>x</i>³+…')] },
  },
  macros: {
    deg: () => ['setup', { pick: 'Angle Unit' }, { pick: 'Degree' }],
    rad: () => ['setup', { pick: 'Angle Unit' }, { pick: 'Radian' }],
    line: () => ['setup', { pick: 'Input/Output' }, { pick: 'LineI/LineO' }],
    small: () => ['setup', { pick: 'MultiLine Font' }, { pick: 'Small Font' }],
    eq2: v => ['menu', { pick: 'Equation/Func' }, { pick: 'Polynomial' }, { pick: 'ax²+bx+c' }, ...coefs(v), 'eq', 'eq'],
    eq3: v => ['menu', { pick: 'Equation/Func' }, { pick: 'Polynomial' }, { pick: 'ax³+bx²+cx+d' }, ...coefs(v), 'eq', 'eq', 'eq'],
    sim2: v => ['menu', { pick: 'Equation/Func' }, { pick: 'Simul Equation' }, { pick: '2 Unknowns' }, ...coefs(v), 'eq', 'eq'],
    fx: () => [],
    calc: v => ['calc', ...digitsOf(v), 'eq'],
    table: () => ['menu', { pick: 'Table' }],
    range: v => ['eq', 'eq', ...coefs(v)],
  },
  paths: { stoA: ['sto', { raw: 'neg' }], stoB: ['sto', { raw: 'dms' }], stoC: ['sto', { raw: 'xinv' }] },
};

/* ======================= fx-991ES PLUS 2nd edition ======================= */
MODELS.es = {
  id: 'es', name: 'fx-991ES PLUS', series: 'ES PLUS 2nd edition', img: 'img/fx-991es-plus',
  tagline: '老款。MODE 弹出文字菜单，变量 X 要先按 ALPHA 再按 )，存变量用 SHIFT RCL。',
  exe: '=', implicitHigh: true, hasAlpha: true, xName: 'X',
  keys: {
    shift: K('', 'shift', null, null, { cls: 'round', top: [['SHIFT', 'sh']] }),
    alpha: K('', 'alpha', null, null, { cls: 'round', top: [['ALPHA', 'al']] }),
    mode: K('', 'menu', ['setup', 'SETUP'], null, { cls: 'round', top: [['MODE', 'wh'], ['SETUP', 'sh']] }),
    on: K('', 'on', null, null, { cls: 'round', top: [['ON', 'wh']] }),
    calc: K('CALC', 'calc', ['solve', 'SOLVE'], ['eqsign', '=']),
    int: K(`∫<span class="lim">${SBOX}${SBOX}</span>${BOX}`, 'int', ['ddx', `<span class="ffr sm"><i>d</i><i>dx</i></span>${SBOX}`], ['colon', ':']),
    xinv: K('<i>x</i><sup>−1</sup>', 'inv', ['fact', '<i>x</i>!']),
    logb: K(`log<sub>${SBOX}</sub>${BOX}`, 'logb', ['sum', `Σ${SBOX}`]),
    frac: K(FRAC_FACE, 'frac', ['mixfrac', MIX_LBL]),
    sqrt: K(`√${BOX}`, 'sqrt', ['cbrt', `∛${SBOX}`]),
    x2: K('<i>x</i><sup>2</sup>', 'sq', ['cube', '<i>x</i><sup>3</sup>'], null, { ex: [['DEC', 'bl']] }),
    xpow: K(`<i>x</i><sup>${SBOX}</sup>`, 'pow', ['rt', `<sup>${SBOX}</sup>√${SBOX}`], null, { ex: [['HEX', 'bl']] }),
    log: K('log', 'log', ['p10', `10<sup>${SBOX}</sup>`], null, { ex: [['BIN', 'bl']] }),
    ln: K('ln', 'ln', ['pe', `<i>e</i><sup>${SBOX}</sup>`], null, { ex: [['OCT', 'bl']] }),
    neg: K('(−)', 'neg', ['angle', '∠'], ['varA', 'A']),
    dms: K('°′″', 'dms', ['larr', '←'], ['varB', 'B']),
    hyp: K('hyp', 'hyp', ['abs', 'Abs'], ['varC', 'C']),
    sin: K('sin', 'sin', ['asin', 'sin<sup>−1</sup>'], ['varD', 'D']),
    cos: K('cos', 'cos', ['acos', 'cos<sup>−1</sup>'], ['varE', 'E']),
    tan: K('tan', 'tan', ['atan', 'tan<sup>−1</sup>'], ['varF', 'F']),
    rcl: K('RCL', 'rcl', ['sto', 'STO']),
    eng: K('ENG', 'eng', ['larr', '←'], ['i', '<i>i</i>'], { alc: 'pu' }),
    lp: K('(', 'lp', ['pct', '%']),
    rp: K(')', 'rp', ['comma', ','], ['x', 'X']),
    sd: K('S⇔D', 'sd', ['mixconv', 'a<sup>b</sup>/<sub>c</sub>⇔<sup>d</sup>/<sub>c</sub>'], ['y', 'Y']),
    mplus: K('M+', 'mplus', ['mminus', 'M−'], ['varM', 'M']),
    n7: K('7', '7', ['const', 'CONST'], null, { cls: 'num' }), n8: K('8', '8', ['conv', 'CONV'], null, { cls: 'num' }), n9: K('9', '9', ['clr', 'CLR'], null, { cls: 'num' }),
    del: K('DEL', 'del', ['ins', 'INS'], null, { cls: 'num green' }), ac: K('AC', 'ac', ['off', 'OFF'], null, { cls: 'num green' }),
    n4: K('4', '4', ['matrix', 'MATRIX'], null, { cls: 'num', bracket: true }), n5: K('5', '5', ['vector', 'VECTOR'], null, { cls: 'num', bracket: true }), n6: K('6', '6', null, null, { cls: 'num' }),
    mul: K('×', 'mul', ['npr', 'nPr'], null, { cls: 'num' }), div: K('÷', 'div', ['ncr', 'nCr'], null, { cls: 'num' }),
    n1: K('1', '1', ['stat', 'STAT'], null, { cls: 'num', bracket: true }), n2: K('2', '2', ['cmplx', 'CMPLX'], null, { cls: 'num', bracket: true }), n3: K('3', '3', ['base', 'BASE'], null, { cls: 'num', bracket: true }),
    add: K('+', 'add', ['pol', 'Pol'], null, { cls: 'num' }), sub: K('−', 'sub', ['rec', 'Rec'], null, { cls: 'num' }),
    n0: K('0', '0', ['rnd', 'Rnd'], null, { cls: 'num' }), dot: K('•', 'dot', ['ran', 'Ran#'], ['ranint', 'RanInt'], { cls: 'num' }),
    exp: K('×10<sup><i>x</i></sup>', 'e10', ['pi', 'π'], ['e', '<i>e</i>'], { cls: 'num' }),
    ans: K('Ans', 'ans', ['drg', 'DRG▶'], null, { cls: 'num' }), eq: K('=', 'eq', null, null, { cls: 'num' }),
    up: K(ICON.up, 'U'), down: K(ICON.down, 'D'), left: K(ICON.left, 'L'), right: K(ICON.right, 'R'),
  },
  layout: [
    { cls: 'pad-top', cols: 6, cells: [['shift', 1, 1], ['alpha', 1, 2], ['dpad', 1, 3, 2, 2], ['mode', 1, 5], ['on', 1, 6], ['calc', 2, 1], ['int', 2, 2], ['xinv', 2, 5], ['logb', 2, 6]] },
    { cls: 'pad-fn', cols: 6, cells: ['frac', 'sqrt', 'x2', 'xpow', 'log', 'ln', 'neg', 'dms', 'hyp', 'sin', 'cos', 'tan', 'rcl', 'eng', 'lp', 'rp', 'sd', 'mplus'] },
    { cls: 'pad-num', cols: 5, cells: ['n7', 'n8', 'n9', 'del', 'ac', 'n4', 'n5', 'n6', 'mul', 'div', 'n1', 'n2', 'n3', 'add', 'sub', 'n0', 'dot', 'exp', 'ans', 'eq'] },
  ],
  dpad: 'diamond',
  menus: {
    main: { kind: 'text2', num: true, items: [L('1', 'COMP', 'app:calc'), L('2', 'CMPLX', 'na'), L('3', 'STAT', 'na'), L('4', 'BASE-N', 'na'),
      L('5', 'EQN', 'menu:eqn'), L('6', 'MATRIX', 'na'), L('7', 'TABLE', 'app:table'), L('8', 'VECTOR', 'na')] },
    setup: { kind: 'text2', num: true, items: [L('1', 'MthIO', 'io:math'), L('2', 'LineIO', 'io:line'), L('3', 'Deg', 'angle:D'), L('4', 'Rad', 'angle:R'),
      L('5', 'Gra', 'angle:G'), L('6', 'Fix', 'na'), L('7', 'Sci', 'na'), L('8', 'Norm', 'na')] },
    eqn: { kind: 'list', num: true, items: [L('1', 'anX+bnY=cn', 'sim:2', 'a<sub>n</sub>X+b<sub>n</sub>Y=c<sub>n</sub>'), L('2', 'anX+bnY+cnZ=dn', 'sim:3', 'a<sub>n</sub>X+b<sub>n</sub>Y+c<sub>n</sub>Z=d<sub>n</sub>'),
      L('3', 'aX²+bX+c=0', 'poly:2'), L('4', 'aX³+bX²+cX+d=0', 'poly:3')] },
  },
  macros: {
    deg: () => ['setup', { pick: 'Deg' }],
    rad: () => ['setup', { pick: 'Rad' }],
    line: () => ['setup', { pick: 'LineIO' }],
    eq2: v => ['menu', { pick: 'EQN' }, { pick: 'aX²+bX+c=0' }, ...coefs(v), 'eq', 'eq'],
    eq3: v => ['menu', { pick: 'EQN' }, { pick: 'aX³+bX²+cX+d=0' }, ...coefs(v), 'eq', 'eq', 'eq'],
    sim2: v => ['menu', { pick: 'EQN' }, { pick: 'anX+bnY=cn' }, ...coefs(v), 'eq', 'eq'],
    fx: () => [],
    calc: v => ['calc', ...digitsOf(v), 'eq'],
    table: () => ['menu', { pick: 'TABLE' }],
    range: v => ['eq', ...coefs(v)],
  },
  // ES PLUS 的 = 键上方没有印 ≈：先 = 再 S⇔D
  paths: { approx: ['eq', 'sd'], stoA: ['sto', { raw: 'neg' }], stoB: ['sto', { raw: 'dms' }], stoC: ['sto', { raw: 'hyp' }] },
};

/* ======================= fx-991CW ClassWiz ======================= */
const CAT = (cat, item) => ['catalog', { pick: cat }, { pick: item }];
MODELS.cw = {
  id: 'cw', name: 'fx-991CW', series: 'ClassWiz CW', img: 'img/fx-991cw',
  tagline: '没有 ALPHA 和 CALC 键。菜单用 HOME、方向键和 OK 选，d/dx、nCr 要去 CATALOG 里找。',
  exe: 'EXE', implicitHigh: false, hasAlpha: false, round: true,
  keys: {
    on: K('', 'on', null, null, { cls: 'sys on', top: [['ON', 'wh']] }),
    home: K(ICON.home, 'menu', null, null, { cls: 'sys', top: [['HOME', 'wh']], name: 'HOME' }),
    settings: K(ICON.settings, 'setup', null, null, { cls: 'sys', top: [['SETTINGS', 'wh']], name: 'SETTINGS' }),
    back: K(ICON.back, 'back', null, null, { cls: 'sys', name: 'BACK' }),
    shift: K(ICON.shift, 'shift', null, null, { cls: 'sys shift', top: [['SHIFT', 'sh']] }),
    variable: K('<span class="vx">⇄<i>x</i></span>', 'var', null, null, { cls: 'sys', top: [['VARIABLE', 'wh']] }),
    function: K('f(<i>x</i>)', 'func', null, null, { cls: 'sys', top: [['FUNCTION', 'wh']] }),
    catalog: K(ICON.book, 'catalog', null, null, { cls: 'sys', top: [['CATALOG', 'wh']], name: 'CATALOG' }),
    tools: K(ICON.tools, 'tools', null, null, { cls: 'sys', top: [['TOOLS', 'wh']], name: 'TOOLS' }),
    x: K('<i>x</i>', 'x', ['qr', 'QR']),
    frac: K(FRAC_FACE, 'frac', ['mixfrac', MIX_LBL]),
    sqrt: K(`√${BOX}`, 'sqrt', ['rt', `<sup>${SBOX}</sup>√${SBOX}`]),
    xpow: K(`${BOX}<sup>${SBOX}</sup>`, 'pow', ['inv', `${SBOX}<sup>−1</sup>`]),
    x2: K(`${BOX}<sup>2</sup>`, 'sq', ['log', 'log']),
    logb: K(`log<sub>${SBOX}</sub>${BOX}`, 'logb', ['ln', 'ln']),
    ans: K('Ans', 'ans'),
    sin: K('sin', 'sin', ['asin', 'sin<sup>−1</sup>']),
    cos: K('cos', 'cos', ['acos', 'cos<sup>−1</sup>']),
    tan: K('tan', 'tan', ['atan', 'tan<sup>−1</sup>']),
    lp: K('(', 'lp', ['eqsign', '=']),
    rp: K(')', 'rp', ['comma', ',']),
    n7: K('7', '7', ['pi', 'π'], null, { cls: 'num' }), n8: K('8', '8', ['e', '<i>e</i>'], null, { cls: 'num' }), n9: K('9', '9', ['i', '<i>i</i>'], null, { cls: 'num' }),
    del: K(ICON.del, 'del', ['ins', 'INS'], null, { cls: 'num', name: '⌫' }), ac: K('AC', 'ac', ['off', 'OFF'], null, { cls: 'num' }),
    n4: K('4', '4', ['varA', 'A'], null, { cls: 'num' }), n5: K('5', '5', ['varB', 'B'], null, { cls: 'num' }), n6: K('6', '6', ['varC', 'C'], null, { cls: 'num' }),
    mul: K('×', 'mul', null, null, { cls: 'num' }), div: K('÷', 'div', null, null, { cls: 'num' }),
    n1: K('1', '1', ['varD', 'D'], null, { cls: 'num' }), n2: K('2', '2', ['varE', 'E'], null, { cls: 'num' }), n3: K('3', '3', ['varF', 'F'], null, { cls: 'num' }),
    add: K('+', 'add', ['dms', '°′″'], null, { cls: 'num' }), sub: K('−', 'sub', ['neg', '(−)'], null, { cls: 'num' }),
    n0: K('0', '0', ['x', '<i>x</i>'], null, { cls: 'num' }), dot: K('.', 'dot', ['y', '<i>y</i>'], null, { cls: 'num' }),
    exp: K(`×10<sup>${SBOX}</sup>`, 'e10', ['z', '<i>z</i>'], null, { cls: 'num' }),
    format: K('<span class="fmt">FORMAT</span>', 'format', null, null, { cls: 'num' }), eq: K('EXE', 'eq', ['approx', '≈'], null, { cls: 'num' }),
    up: K(ICON.up, 'U'), down: K(ICON.down, 'D'), left: K(ICON.left, 'L'), right: K(ICON.right, 'R'), ok: K('OK', 'ok'),
    pgup: K(ICON.pgup, 'pgup'), pgdn: K(ICON.pgdn, 'pgdn'),
  },
  layout: [
    { cls: 'pad-top', cols: 6, cells: [['crossbg', 1, 3, 3, 3], ['scrollbg', 1, 6, 2, 1], ['on', 1, 1], ['home', 1, 2], ['up', 1, 4], ['pgup', 1, 6],
      ['settings', 2, 1], ['back', 2, 2], ['left', 2, 3], ['ok', 2, 4], ['right', 2, 5], ['pgdn', 2, 6],
      ['shift', 3, 1], ['variable', 3, 2], ['function', 3, 3], ['down', 3, 4], ['catalog', 3, 5], ['tools', 3, 6]] },
    { cls: 'pad-fn', cols: 6, cells: ['x', 'frac', 'sqrt', 'xpow', 'x2', 'logb', 'ans', 'sin', 'cos', 'tan', 'lp', 'rp'] },
    { cls: 'pad-num', cols: 5, cells: ['n7', 'n8', 'n9', 'del', 'ac', 'n4', 'n5', 'n6', 'mul', 'div', 'n1', 'n2', 'n3', 'add', 'sub', 'n0', 'dot', 'exp', 'format', 'eq'] },
  ],
  dpad: 'cross',
  chips: { eq: 'EXE', menu: 'HOME', setup: 'SETTINGS', del: '⌫' },
  names: { eq: 'EXE 执行计算', menu: 'HOME：选择计算应用', setup: 'SETTINGS：设置（Calc Settings 里改角度单位）', del: '⌫ 删除光标前一个字符' },
  menus: {
    main: { kind: 'icons', num: false, cols: 3, rows: 2, items: [
      I(null, 'Calculate', '×÷<br>+−', 'app:calc'), I(null, 'Statistics', 'ılı', 'na'), I(null, 'Distribution', '∩', 'na'),
      I(null, 'Spreadsheet', '▦', 'na'), I(null, 'Table', '▤', 'app:table'), I(null, 'Equation', '<i>xy</i>=0', 'menu:eqn'),
      I(null, 'Inequality', '<i>xy</i>&gt;0', 'na'), I(null, 'Complex', '<i>i</i>∠', 'na'), I(null, 'Base-N', '2 8 10 16', 'na'),
      I(null, 'Matrix', '[⁘]', 'na'), I(null, 'Vector', '↗', 'na'), I(null, 'Ratio', '□:□', 'na'), I(null, 'Math Box', '⚀', 'na')] },
    setup: { kind: 'list', items: [T('Calc Settings', 'menu:calcset'), T('System Settings', 'menu:sysset'), T('Reset', 'na'), T('Get Started', 'na')] },
    calcset: { kind: 'list', title: 'Calc Settings', items: [T('Input/Output', 'menu:io'), T('Angle Unit', 'menu:angle'), T('Number Format', 'na'), T('Engineer Symbol', 'na'),
      T('Fraction Result', 'na'), T('Complex Result', 'na'), T('Decimal Mark', 'na'), T('Digit Separator', 'na')] },
    sysset: { kind: 'list', title: 'System Settings', items: [T('Contrast', 'na'), T('Auto Power Off', 'na'), T('MultiLine Font', 'menu:font'), T('QR Code', 'na')] },
    io: { kind: 'list', title: 'Input/Output', mark: 'io', items: [T('MathI/MathO', 'io:math'), T('MathI/DecimalO', 'io:dec'), T('LineI/LineO', 'io:line'), T('LineI/DecimalO', 'io:linedec')] },
    font: { kind: 'list', title: 'MultiLine Font', mark: 'font', items: [T('Normal Font', 'font:normal'), T('Small Font', 'font:small')] },
    angle: { kind: 'list', title: 'Angle Unit', mark: 'angle', items: [T('Degree', 'angle:D'), T('Radian', 'angle:R'), T('Gradian', 'angle:G')] },
    eqn: { kind: 'list', items: [T('Simul Equation', 'menu:simul'), T('Polynomial', 'menu:poly'), T('Solver', 'na')] },
    simul: { kind: 'list', title: 'Simul Equation', items: [T('2 Unknowns', 'sim:2'), T('3 Unknowns', 'sim:3'), T('4 Unknowns', 'na')] },
    poly: { kind: 'list', title: 'Polynomial', items: [T('ax²+bx+c', 'poly:2', 'a<i>x</i>²+b<i>x</i>+c'), T('ax³+bx²+cx+d', 'poly:3', 'a<i>x</i>³+b<i>x</i>²+c<i>x</i>+d'), T('ax⁴+bx³+cx²+dx+e', 'na', 'a<i>x</i>⁴+b<i>x</i>³+…')] },
    catalog: { kind: 'list', title: 'CATALOG', items: [T('Func Analysis', 'menu:cfa'), T('Probability', 'menu:cprob'), T('Numeric Calc', 'menu:cnum'), T('Angle/Coord/Sexa', 'na'), T('Hyperbolic/Trig', 'na'), T('Other', 'na')] },
    cfa: { kind: 'list', title: 'Func Analysis', items: [T('Derivative(d/dx)', 'ins:ddx'), T('Integration(∫)', 'ins:int'), T('Summation(Σ)', 'ins:sum'), T('Logarithm(log)', 'ins:log'), T('Logarithm(logab)', 'ins:logb', 'Logarithm(log<sub>a</sub>b)'), T('Natural Logarithm', 'ins:ln')] },
    cprob: { kind: 'list', title: 'Probability', items: [T('Permutation(P)', 'ins:npr'), T('Combination(C)', 'ins:ncr'), T('Factorial(!)', 'ins:fact'), T('Random Number', 'ins:ran'), T('Random Integer', 'ins:ranint')] },
    cnum: { kind: 'list', title: 'Numeric Calc', items: [T('Absolute Value', 'ins:abs'), T('Round Off', 'ins:rnd')] },
    func: { kind: 'list', title: 'FUNCTION', items: [T('Define f(x)', 'fdef:f', 'Define <i>f</i>(<i>x</i>)'), T('Define g(x)', 'fdef:g', 'Define <i>g</i>(<i>x</i>)'), T('f(x)', 'ins:fx', '<i>f</i>(<i>x</i>)'), T('g(x)', 'ins:gx', '<i>g</i>(<i>x</i>)')] },
    // TOOLS：按说明书截图，Calculate 只有 Undo；Table 依次是 Table Range、Define、Table Type、Edit、Recalculate
    tools_calc: { kind: 'list', items: [T('Undo', 'undo')] },
    tools_table: { kind: 'list', items: [T('Table Range', 'range'), T('Define f(x)/g(x)', 'menu:tdef', 'Define <i>f</i>(<i>x</i>)/<i>g</i>(<i>x</i>)'), T('Table Type', 'menu:ttype'), T('Edit', 'menu:tedit'), T('Recalculate', 'recalc')] },
    tdef: { kind: 'list', title: 'Define f(x)/g(x)', items: [T('Define f(x)', 'fdef:f', 'Define <i>f</i>(<i>x</i>)'), T('Define g(x)', 'fdef:g', 'Define <i>g</i>(<i>x</i>)')] },
    ttype: { kind: 'list', mark: 'ttype', items: [T('f(x)/g(x)', 'ttype:fg', '<i>f</i>(<i>x</i>)/<i>g</i>(<i>x</i>)'), T('f(x)', 'ttype:f', '<i>f</i>(<i>x</i>)'), T('g(x)', 'ttype:g', '<i>g</i>(<i>x</i>)')] },
    tedit: { kind: 'list', items: [T('Insert Row', 'trow:ins'), T('Delete All', 'trow:clear')] },
    tools_poly: { kind: 'list', items: [T('Complex Roots', 'menu:croots'), T('Undo', 'undo')] },
    tools_simul: { kind: 'list', items: [T('Undo', 'undo')] },
    croots: { kind: 'list', title: 'Complex Roots', mark: 'croots', items: [T('On', 'croots:on'), T('Off', 'croots:off')] },
  },
  macros: {
    deg: () => ['setup', { pick: 'Calc Settings' }, { pick: 'Angle Unit' }, { pick: 'Degree' }, 'ac'],
    rad: () => ['setup', { pick: 'Calc Settings' }, { pick: 'Angle Unit' }, { pick: 'Radian' }, 'ac'],
    line: () => ['setup', { pick: 'Calc Settings' }, { pick: 'Input/Output' }, { pick: 'LineI/LineO' }, 'ac'],
    small: () => ['setup', { pick: 'System Settings' }, { pick: 'MultiLine Font' }, { pick: 'Small Font' }, 'ac'],
    eq2: v => ['menu', { pick: 'Equation' }, { pick: 'Polynomial' }, { pick: 'ax²+bx+c' }, ...coefs(v), 'eq', 'eq'],
    eq3: v => ['menu', { pick: 'Equation' }, { pick: 'Polynomial' }, { pick: 'ax³+bx²+cx+d' }, ...coefs(v), 'eq', 'eq', 'eq'],
    sim2: v => ['menu', { pick: 'Equation' }, { pick: 'Simul Equation' }, { pick: '2 Unknowns' }, ...coefs(v), 'eq', 'eq'],
    fx: () => ['func', { pick: 'Define f(x)' }],
    calc: (v, calc) => [...(calc.scr.k === 'fdef' ? ['eq'] : []), 'func', { pick: 'f(x)' }, ...digitsOf(v), 'rp', 'eq'],
    table: () => ['menu', { pick: 'Table' }, 'tools', { pick: 'Define f(x)/g(x)' }, { pick: 'Define f(x)' }],
    range: v => ['eq', 'tools', { pick: 'Table Range' }, ...coefs(v), 'eq'],
  },
  paths: {
    cube: ['pow', '3', 'R'], cbrt: ['rt', '3', 'R'], p10: ['1', '0', 'pow'], pe: ['e', 'pow'],
    ddx: CAT('Func Analysis', 'Derivative(d/dx)'), int: CAT('Func Analysis', 'Integration(∫)'), sum: CAT('Func Analysis', 'Summation(Σ)'),
    npr: CAT('Probability', 'Permutation(P)'), ncr: CAT('Probability', 'Combination(C)'), fact: CAT('Probability', 'Factorial(!)'),
    abs: CAT('Numeric Calc', 'Absolute Value'),
    sd: calc => ['format', { pick: calc.scr.dec ? 'Standard' : 'Decimal' }],
    stoA: ['var', { pick: 'A=' }, { pick: 'Store' }], stoB: ['var', { pick: 'B=' }, { pick: 'Store' }], stoC: ['var', { pick: 'C=' }, { pick: 'Store' }],
  },
};

/* 中文注释：菜单项在说明里的解释 */
const GLOSS = {
  Calculate: '普通计算', COMP: '普通计算', Table: '表格', TABLE: '表格', 'Equation/Func': '方程 / 函数', Equation: '方程', EQN: '方程',
  'Simul Equation': '联立方程', Polynomial: '多项式方程', 'Angle Unit': '角度单位', Degree: '角度制，屏幕显示 D', Deg: '角度制，屏幕显示 D',
  Radian: '弧度制，屏幕显示 R', Rad: '弧度制，屏幕显示 R', Gradian: '百分度', 'Input/Output': '输入 / 输出格式', 'MathI/MathO': '自然显示输入输出',
  MthIO: '自然显示输入输出', 'MathI/DecimalO': '自然显示输入、小数输出', 'Calc Settings': '计算设置', 'Func Analysis': '函数分析',
  'Derivative(d/dx)': '某一点的导数', 'Integration(∫)': '定积分', 'Summation(Σ)': '求和', Probability: '概率', 'Permutation(P)': '排列数',
  'Combination(C)': '组合数', 'Factorial(!)': '阶乘', 'Numeric Calc': '数值计算', 'Absolute Value': '绝对值', 'Define f(x)': '定义 f(x)',
  'Define g(x)': '定义 g(x)', 'Define f(x)/g(x)': '定义函数', 'Table Range': '表格范围', Store: '存入变量', Recall: '调用变量',
  'LineI/LineO': '线性输入输出', 'LineI/DecimalO': '线性输入、小数输出', LineIO: '线性显示', 'System Settings': '系统设置',
  'MultiLine Font': '线性显示的字号', 'Normal Font': '正常字号，最多 4 行', 'Small Font': '小字号，最多 6 行',
  Undo: '撤消上一步按键', 'Table Type': '表格列', Edit: '编辑表格', 'Insert Row': '在光标上方插入一行', 'Delete All': '清空表格',
  Recalculate: '按现在的设置重算', 'Complex Roots': '复数解', 'f(x)/g(x)': 'f 和 g 两列，最多 30 行',
  Standard: '标准（分数 / 根式）', Decimal: '小数', '2 Unknowns': '二元', '3 Unknowns': '三元', 'ax²+bx+c': '二次方程', 'ax³+bx²+cx+d': '三次方程',
  'aX²+bX+c=0': '二次方程', 'aX³+bX²+cX+d=0': '三次方程', 'anX+bnY=cn': '二元一次方程组', 'anX+bnY+cnZ=dn': '三元一次方程组',
};

/* fn → 实体键（主功能优先，其次 SHIFT，再 ALPHA） */
for (const m of Object.values(MODELS)) {
  Object.assign(m.keys.up, { name: '▲' }); Object.assign(m.keys.down, { name: '▼' });
  Object.assign(m.keys.left, { name: '◀' }); Object.assign(m.keys.right, { name: '▶' });
  if (m.keys.pgup) { m.keys.pgup.name = '⇞'; m.keys.pgdn.name = '⇟'; }
  m.keyOf = {};
  for (const pass of ['fn', 'sh', 'al']) {
    for (const [id, k] of Object.entries(m.keys)) {
      const f = pass === 'fn' ? k.fn : k[pass] && k[pass][0];
      if (f && !m.keyOf[f]) m.keyOf[f] = { id, mod: pass === 'fn' ? null : pass === 'sh' ? 'shift' : 'alpha' };
    }
  }
}
if (typeof module !== 'undefined') module.exports = { MODELS, FN, NA, GLOSS, ICON };
