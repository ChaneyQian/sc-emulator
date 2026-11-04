'use strict';
/* 页面：首页选机型；机型页三种模式（按法演示 / 自由模式 / 公式练习）；播放器；键盘快捷键。 */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ORDER = ['cw', 'ex', 'es'];
const MODE_NAMES = { demo: '按法演示', free: '自由模式', practice: '公式练习' };
const SHORT = { cw: 'CW', ex: 'EX', es: 'ES PLUS' };
const store = {
  get(k, d) { try { const v = localStorage.getItem('scemu-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('scemu-' + k, JSON.stringify(v)); } catch (e) { /* 存储不可用时忽略 */ } },
};
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const strip = h => String(h).replace(/<[^>]+>/g, '');
/* 文字里的公式：$…$ 行内、$$…$$ 单独一行，用 KaTeX 排版；其余文字照常转义。KaTeX 没加载时显示原式 */
function rich(src) {
  return String(src ?? '').split(/(\$\$[^$]+\$\$|\$[^$]+\$)/).map((part, i) => {
    if (i % 2 === 0) return esc(part);
    const display = part.startsWith('$$'), tex = part.slice(display ? 2 : 1, display ? -2 : -1);
    if (typeof katex === 'undefined') return esc(tex);
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore' });
  }).join('');
}
// 提示框（title 属性）里用的纯文字版
const plainTex = s => String(s ?? '')
  .replace(/\\[dt]?frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/\\tfrac(\d)(\d)/g, '$1/$2')
  .replace(/\\sqrt\{([^}]*)\}/g, '√($1)').replace(/\\([a-zA-Z]+)/g, '$1').replace(/[{}$^]/g, '');

// S：当前机型 / 模式 / 自由计算器；P：播放器（按法演示、练习提示、自由模式回放共用）
const S = { model: null, mode: null, live: null, rec: null, base: null, q: null, part: 0 };
const P = { snaps: [], i: -1, playing: false, timer: 0, speed: 1, ctx: null, base: null, chips: null };

/* ================= 首页 ================= */
function renderHome() {
  $('#model-cards').innerHTML = ORDER.map(id => {
    const m = MODELS[id];
    return `<article class="mcard" data-model="${id}">
      <a class="mc-photo" href="#/${id}/demo" aria-label="打开 ${m.name}"><img src="${m.img}.webp" alt="${m.name} 实物照片" loading="lazy" decoding="async"></a>
      <div class="mc-body">
        <p class="mc-series">${m.series}</p>
        <h2 class="mc-name">${m.name}</h2>
        <p class="mc-tag">${m.tagline}</p>
        <div class="mc-actions">
          <a class="btn primary" href="#/${id}/demo">按法演示</a>
          <a class="btn" href="#/${id}/free">自由模式</a>
          <a class="btn" href="#/${id}/practice">公式练习</a>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ================= 计算器 DOM ================= */
const keyEl = id => $(`#calc [data-key="${id}"]`);
const keyName = (m, id) => { const k = m.keys[id]; return k.name || strip(k.face) || (k.top ? strip(k.top[0][0]) : id); };
function cellHTML(m, c) {
  const [id, r, col, rs = 1, cs = 1] = Array.isArray(c) ? c : [c];
  const pos = r ? ` style="grid-row:${r} / span ${rs};grid-column:${col} / span ${cs}"` : '';
  if (id === 'dpad') {
    const btn = d => `<button type="button" class="dp ${d}" data-key="${d}" aria-label="${{ up: '▲', down: '▼', left: '◀', right: '▶' }[d]}"><span>${m.keys[d].face}</span></button>`;
    return `<div class="dpad ${m.dpad}"${pos}><div class="dp-ring">${['up', 'down', 'left', 'right'].map(btn).join('')}<div class="dp-c"></div></div></div>`;
  }
  if (id === 'crossbg' || id === 'scrollbg') return `<div class="${id}"${pos} aria-hidden="true"></div>`;
  const k = m.keys[id];
  // 圆形功能键（SHIFT、MENU…）的名字印在键的上方，已经包含 SETUP 这类第二功能
  const lbl = k.top ? k.top.map(([t, cl]) => [t, cl, cl === 'sh' ? 'sh' : 'top'])
    : [...(k.sh ? [[k.sh[1], 'sh', 'sh']] : []), ...(k.al ? [[k.al[1], k.alc || 'al', 'al']] : []), ...(k.ex || []).map(([t, cl]) => [t, cl, 'ex'])];
  const lbls = lbl.map(([t, cl, f]) => `<span class="lbl ${cl}${k.bracket && f === 'sh' ? ' brk' : ''}" data-for="${f}">${t}</span>`).join('');
  const dp = ['up', 'down', 'left', 'right', 'ok', 'pgup', 'pgdn'].includes(id) ? ` kc-${id}` : '';
  return `<div class="kc${dp}"${pos}><div class="lbls">${lbls}</div><button type="button" class="key ${k.cls || 'fn'}" data-key="${id}" aria-label="${esc(keyName(m, id))}">${k.face}</button></div>`;
}
function buildCalc(m) {
  const head = {
    ex: '<div class="c-brand"><b>CASIO</b><span class="c-model">fx-991EX</span><span class="c-series">CLASSWIZ</span></div><div class="solar"></div>',
    es: '<div class="c-brand"><b>CASIO</b><span class="c-model">fx-991ES PLUS</span><span class="c-series">NATURAL-V.P.A.M.</span></div><div class="solar"></div><span class="c-ed">2nd edition</span>',
    cw: '<div class="c-brand"><b>CASIO</b><span class="c-model">fx-991CW</span></div><div class="solar"></div>',
  }[m.id];
  const math = m.id === 'es' ? 'Math' : `√<span class="bx sm"></span>/`;
  const status = `<div class="status" aria-hidden="true"><span class="ind" data-i="s">S</span>${m.hasAlpha ? '<span class="ind" data-i="a">A</span>' : ''}<span class="ind" data-i="m">M</span><span class="ind" data-i="sto">STO</span><span class="ind" data-i="rcl">RCL</span><span class="grow"></span><span class="ind box on" data-i="ang">D</span><span class="ind on" data-i="math">${math}</span></div>`;
  const el = $('#calc');
  el.className = `calc m-${m.id}`;
  el.innerHTML = `<div class="c-head">${head}</div><div class="bezel"><div class="lcd">${status}<div class="scr" id="scr" aria-live="polite"></div></div>${m.id === 'cw' ? '<span class="cwz">CLASSWIZ</span>' : ''}</div>`
    + m.layout.map(p => `<div class="pad ${p.cls}" style="--cols:${p.cols}">${p.cells.map(c => cellHTML(m, c)).join('')}</div>`).join('');
}
function paint(v) {
  $('#scr').innerHTML = v.html;
  $('#calc').classList.toggle('off', !!v.off);
  const set = (k, on, txt) => { const e = $(`#calc .ind[data-i="${k}"]`); if (!e) return; e.classList.toggle('on', on && !v.off); if (txt) e.textContent = txt; };
  set('s', v.ind.s); set('a', v.ind.a); set('m', v.ind.m); set('sto', v.ind.sto); set('rcl', v.ind.rcl);
  set('ang', true, v.ind.angle); set('math', v.ind.math);
  fitScreen();
}
function fitScreen() {
  $$('#scr .l1').forEach(l => {
    const cur = l.querySelector('.cur');
    l.scrollLeft = cur ? Math.max(0, cur.offsetLeft - l.clientWidth + 24) : 0;
  });
}
function clearHL() {
  $$('#calc .hl, #calc .hl-mod, #calc .lbl.on, #calc .press').forEach(e => e.classList.remove('hl', 'hl-mod', 'm-sh', 'm-al', 'm-n', 'on', 'press'));
}
function hlStep(s) {
  if (s.modKey) keyEl(s.modKey)?.classList.add('hl-mod', s.mod === 'sh' ? 'm-sh' : 'm-al');
  const k = keyEl(s.key);
  if (!k) return;
  k.classList.add('hl', s.mod === 'sh' ? 'm-sh' : s.mod === 'al' ? 'm-al' : 'm-n');
  void k.offsetWidth;
  k.classList.add('press');
  if (s.mod) k.closest('.kc')?.querySelector(`.lbl[data-for="${s.mod}"]`)?.classList.add('on');
}

/* ================= 说明框、按键条 ================= */
function kbdFor(m, s) {
  const k = m.keys[s.key], cls = (k.cls || '').split(' ').filter(c => ['num', 'blue', 'green', 'round', 'sys'].includes(c)).join(' ');
  const mod = s.mod === 'sh' ? '<kbd class="kb sh">SHIFT</kbd><span class="plus">+</span>' : s.mod === 'al' ? '<kbd class="kb al">ALPHA</kbd><span class="plus">+</span>' : '';
  const face = k.face && !/^<svg/.test(k.face) ? k.face : `<span class="kb-t">${esc(keyName(m, s.key))}</span>`;
  return `${mod}<kbd class="kb ${cls}">${face}</kbd>`;
}
function caption(s, phase, extra = '') {
  const el = $('#cap'), m = S.model;
  if (!s) { el.innerHTML = extra || '<div class="cap-t">先选一道题。</div>'; return; }
  if (phase === 'mod') {
    el.innerHTML = `<div class="cap-k">${s.mod === 'sh' ? '<kbd class="kb sh">SHIFT</kbd>' : '<kbd class="kb al">ALPHA</kbd>'}</div><div class="cap-t">${s.mod === 'sh' ? '先按 SHIFT，接下来用键上方黄色的功能' : '先按 ALPHA，接下来用键上方红色的功能'}</div>`;
    return;
  }
  el.innerHTML = `<div class="cap-k">${kbdFor(m, s)}</div><div class="cap-t">${esc(s.name)}</div>${s.note ? `<div class="cap-n"><span class="cap-tag">提示</span>${rich(s.note)}</div>` : ''}`;
  const pill = $('#imm-key');
  pill.innerHTML = `${kbdFor(m, s)}<span class="ik-t">${esc(s.name)}</span>`;
}
function chipHTML(s, k) {
  const kc = S.model.keys[s.key].cls || '';
  const cls = [kc.includes('num') ? 'num' : '', kc.includes('blue') ? 'blue' : '', kc.includes('green') ? 'green' : '', s.mod || '', ['eq', 'approx'].includes(s.fn) ? 'res' : ''].join(' ');
  return `<li><button type="button" class="chip ${cls}" data-i="${k}" title="${esc(s.name)}">${esc(s.chip || keyName(S.model, s.key))}</button></li>`;
}
function renderChips(el, steps, empty) {
  el.innerHTML = steps.map(chipHTML).join('') || (empty ? `<li class="empty">${empty}</li>` : '');
}

/* ================= 播放器 ================= */
function show(i, phase = 'full') {
  P.i = i;
  clearHL();
  const s = P.snaps[i];
  if (!s) paint(P.base);
  else if (phase === 'mod') {
    paint(s.modView || (P.snaps[i - 1] ? P.snaps[i - 1].view : P.base));
    keyEl(s.modKey)?.classList.add('hl', s.mod === 'sh' ? 'm-sh' : 'm-al', 'press');
  } else { paint(s.view); hlStep(s); }
  if (s) caption(s, phase);
  else if (P.ctx === 'demo') captionDemoStart();
  $('#count').textContent = P.snaps.length ? `${Math.max(0, i + 1)} / ${P.snaps.length}` : '–';
  if (P.chips) {
    P.chips.querySelectorAll('.chip').forEach((c, j) => { c.classList.toggle('on', j === i); c.classList.toggle('done', j < i); });
    const on = P.chips.querySelector('.chip.on');
    if (on && P.playing) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}
function stop() {
  clearTimeout(P.timer);
  P.playing = false;
  $('#play').innerHTML = '▶ 播放';
  $('#play').setAttribute('aria-pressed', 'false');
}
function tick() {
  if (!P.playing) return;
  const n = P.i + 1;
  if (n >= P.snaps.length) { stop(); return; }
  const s = P.snaps[n], T = 900 / P.speed;
  const hold = (['eq', 'approx', 'sd', 'ok'].includes(s.fn) ? 1.8 : 1) * (s.note ? 1.6 : 1) * T;
  if (s.mod && !reduceMotion) {
    show(n, 'mod');
    P.timer = setTimeout(() => { show(n); P.timer = setTimeout(tick, hold); }, T * 0.6);
  } else {
    show(n);
    P.timer = setTimeout(tick, hold);
  }
}
function play() {
  if (!P.snaps.length) return;
  if (P.playing) { stop(); return; }
  if (P.ctx === 'live') startReplay();
  if (P.i >= P.snaps.length - 1) show(-1);
  P.playing = true;
  $('#play').innerHTML = '⏸ 暂停';
  $('#play').setAttribute('aria-pressed', 'true');
  P.timer = setTimeout(tick, 250);
}
const step = d => { if (!P.snaps.length) return; if (P.ctx === 'live') startReplay(); stop(); show(Math.min(Math.max(P.i + d, -1), P.snaps.length - 1)); };
function setControls(on) { ['play', 'prev', 'next', 'restart'].forEach(id => { $('#' + id).disabled = !on; }); }
function load(ctx, snaps, base, chipsEl, empty) {
  stop();
  Object.assign(P, { ctx, snaps, base, chips: chipsEl, i: -1 });
  if (chipsEl) renderChips(chipsEl, snaps, empty);
  setControls(snaps.length > 0);
  show(-1);
}

/* ================= 按法演示 ================= */
const allQ = () => [SETUP, ...QUESTIONS];
function renderNav() {
  let h = `<div class="grp"><div class="gl">准备</div><div class="gq"><button type="button" class="qb wide" data-q="0">角度制</button></div></div>`;
  for (const [g, label] of GROUPS) {
    const qs = QUESTIONS.filter(q => q.g === g);
    h += `<div class="grp"><div class="gl">${label}</div><div class="gq">${qs.map(q => `<button type="button" class="qb${q.parts ? '' : ' nc'}${q.paper === 'NC' ? ' ncp' : ''}" data-q="${q.n}" title="${esc(`${q.src} · ${plainTex(q.topic)}`)}">${q.n}</button>`).join('')}</div></div>`;
  }
  $('#qnav').innerHTML = h;
}
function selectQ(n, part = 0) {
  stop();
  const q = allQ().find(x => x.n === n) || SETUP;
  S.q = q;
  $$('.qb').forEach(b => b.classList.toggle('on', +b.dataset.q === q.n));
  const paper = q.paper === 'NC' ? '<span class="tag warn">Non-calculator 卷</span>' : '<span class="tag">Calculator 卷</span>';
  const list = allQ(), at = list.indexOf(q);
  const move = `<span class="qmove"><button type="button" class="btn sm" data-qstep="-1"${at === 0 ? ' disabled' : ''} title="上一题（[）">‹ 上一题</button><button type="button" class="btn sm" data-qstep="1"${at === list.length - 1 ? ' disabled' : ''} title="下一题（]）">下一题 ›</button></span>`;
  $('#qcard').innerHTML = `
    <div class="qh"><span class="qn">${q.n ? `第 ${q.n} 题` : '准备'}</span>${q.n ? paper : ''}${q.marks ? `<span class="tag">${q.marks} 分</span>` : ''}${move}</div>
    <h3 class="qt">${rich(q.topic)}</h3>
    <div class="qs">${esc(q.src)}</div>
    <div class="ms"><span class="msl">答案</span><span>${rich(q.ans)}</span></div>
    ${q.parts ? `<div class="tabs" role="tablist">${q.parts.map((p, j) => `<button type="button" class="tab" role="tab" data-p="${j}">${esc(p.lab)}</button>`).join('')}</div>` : `<p class="nocalc">${rich(q.nocalc)}</p>`}`;
  store.set('q', q.n);
  setHash(`#/${S.model.id}/demo/${q.n}`);
  selectPart(Math.min(part, (q.parts || [1]).length - 1));
  syncTabs();
}
function selectPart(j) {
  const q = S.q, p = q.parts && q.parts[j];
  $$('.tab').forEach(t => { const on = +t.dataset.p === j; t.classList.toggle('on', on); t.setAttribute('aria-selected', String(on)); });
  let snaps = [], err = '';
  try { snaps = p ? runPart(S.model, q.parts, j) : []; } catch (e) { err = e.message; }
  S.part = j;
  $('#ptitle').innerHTML = p ? rich(p.title) : q.nocalc ? '这题不用按计算器' : '';
  load('demo', snaps, new Calc(S.model).view(), $('#chips'), err ? `按法生成出错：${esc(err)}` : '这题不用计算器。');
}
function captionDemoStart() {
  const q = S.q;
  if (!P.snaps.length) {
    caption(null, null, q && q.nocalc ? `<div class="cap-k"><span class="cap-tag">不用计算器</span></div><div class="cap-t">${rich(q.nocalc)}</div>` : '');
    return;
  }
  caption(null, null, `<div class="cap-k"><span class="cap-tag">共 ${P.snaps.length} 步</span></div><div class="cap-t">点 ▶ 播放，也可以点下面的按键一步步看。</div>`);
}
const stepQ = d => {
  const list = allQ(), next = list[Math.min(Math.max(list.indexOf(S.q) + d, 0), list.length - 1)];
  if (next !== S.q) selectQ(next.n);
};
function keyInfo(id) { // 按法演示里点键：查看这个键的各项功能
  const m = S.model, k = m.keys[id], fmt = f => (FN[f] ? FN[f][0] : f);
  clearHL();
  keyEl(id)?.classList.add('hl', 'm-n');
  const rows = [[k.fn && !['shift', 'alpha'].includes(k.fn) ? '' : null, k.fn], ['SHIFT', k.sh && k.sh[0]], ['ALPHA', k.al && k.al[0]]]
    .filter(([, f]) => f && !['shift', 'alpha'].includes(f))
    .map(([mod, f]) => `<li>${mod ? `<kbd class="kb ${mod === 'SHIFT' ? 'sh' : 'al'}">${mod}</kbd> ` : ''}${esc(fmt(f))}${NA[f] ? '（还没做）' : ''}</li>`).join('');
  const special = k.fn === 'shift' ? '接下来按的键用它上方黄色的功能。' : k.fn === 'alpha' ? '接下来按的键用它上方红色的功能，比如变量 A–F、x、y、M。' : '';
  $('#cap').innerHTML = `<div class="cap-k"><kbd class="kb ${(k.cls || '').includes('num') ? 'num' : ''}">${k.face && !/^<svg/.test(k.face) ? k.face : esc(keyName(m, id))}</kbd></div><div class="cap-t">${special}<ul class="key-fns">${rows}</ul></div>`;
}

/* ================= 自由模式 / 练习：可以随手按的计算器 ================= */
function resetLive() {
  S.live = new Calc(S.model);
  S.rec = new Recorder(S.live);
  S.base = S.live.view();
}
function toLive(chipsEl) {
  if (!S.live || S.live.m !== S.model) resetLive();
  load('live', S.rec.steps, S.base, chipsEl, null);
  P.i = S.rec.steps.length - 1;
  setControls(S.mode === 'free' && S.rec.steps.length > 0);
  clearHL();
  paint(S.live.view());
}
function startReplay() { // 自由模式：从头回放记录
  P.ctx = 'replay';
  P.snaps = S.rec.steps;
  P.base = S.base;
}
function liveKey(id) {
  if (P.playing) stop();
  if (P.ctx !== 'live') toLive(S.mode === 'free' ? $('#log') : null);
  const st = S.rec.press(id);
  clearHL();
  if (!st) {
    if (S.live.mod) keyEl(id)?.classList.add('hl', S.live.mod === 'sh' ? 'm-sh' : 'm-al');
    paint(S.live.view());
    if (S.live.mod) caption({ mod: S.live.mod }, 'mod');
    return;
  }
  paint(st.view);
  hlStep(st);
  caption(st);
  P.i = S.rec.steps.length - 1;
  if (S.mode === 'free') {
    $('#log').insertAdjacentHTML('beforeend', chipHTML(st, P.i));
    $$('#log .chip').forEach((c, j) => { c.classList.toggle('on', j === P.i); c.classList.remove('done'); });
    $('#log .chip.on')?.scrollIntoView({ block: 'nearest' });
    updateLogMeta();
    setControls(true);
    updateSettings();
  }
  $('#count').textContent = S.rec.steps.length ? `${S.rec.steps.length} 步` : '–';
}
function pressFnLive(fn) {
  const k = S.model.keyOf[fn];
  if (!k) return;
  if (k.mod && !(S.live && S.live.mod === (k.mod === 'shift' ? 'sh' : 'al'))) liveKey(k.mod);
  liveKey(k.id);
}
function updateLogMeta() {
  const n = S.rec.steps.length;
  $('#log-count').textContent = `${n} 步`;
  $('#log-empty').hidden = n > 0;
  ['log-replay', 'log-copy', 'log-clear'].forEach(id => { $('#' + id).disabled = !n; });
}
function updateSettings() {
  if (!S.live) return;
  $$('#set-angle .seg-b').forEach(b => b.classList.toggle('on', b.dataset.v === S.live.angle));
  $$('#set-io .seg-b').forEach(b => b.classList.toggle('on', b.dataset.v === S.live.io));
}
function enterFree() {
  toLive($('#log'));
  updateLogMeta();
  updateSettings();
  $('#count').textContent = S.rec.steps.length ? `${S.rec.steps.length} 步` : '–';
  caption(null, null, '<div class="cap-t">随便按。按过的键记在下面，点 ▶ 可以重放。</div>');
}
function copyLog() {
  const m = S.model;
  const txt = S.rec.steps.map(s => (s.mod === 'sh' ? 'SHIFT ' : s.mod === 'al' ? 'ALPHA ' : '') + (s.mod ? keyName(m, s.key) : s.chip || keyName(m, s.key))).join('  ');
  const done = () => { $('#log-copy').textContent = '已复制'; setTimeout(() => { $('#log-copy').textContent = '复制'; }, 1600); };
  if (navigator.clipboard) navigator.clipboard.writeText(`${m.name}：${txt}`).then(done, () => prompt('复制下面的按法：', txt));
  else prompt('复制下面的按法：', txt);
}

/* ================= 公式练习 ================= */
const PR = { sel: new Set(store.get('topics', PRACTICE.map(t => t.id)).filter(id => PRACTICE.some(t => t.id === id))), item: null, topic: null, tries: 0, counted: false, score: store.get('score', { done: 0, right: 0, streak: 0 }) };
if (!PR.sel.size) PRACTICE.forEach(t => PR.sel.add(t.id));
function renderTopics() {
  const groups = [...new Set(PRACTICE.map(t => t.topic))];
  $('#topics').innerHTML = groups.map(g => `<div class="tg"><span class="tg-l">${g}</span>${PRACTICE.filter(t => t.topic === g).map(t => `<button type="button" class="pill" data-t="${t.id}" aria-pressed="${PR.sel.has(t.id)}">${rich(t.name)}</button>`).join('')}</div>`).join('');
}
function renderScore() {
  const s = PR.score;
  $('#score').innerHTML = s.done ? `对了 <b>${s.right}</b> / ${s.done} 题，连对 <b>${s.streak}</b>　<button type="button" class="link" id="score-reset">清零</button>` : '';
}
function newItem() {
  const pool = PRACTICE.filter(t => PR.sel.has(t.id));
  let t = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && t === PR.topic) t = pool[Math.floor(Math.random() * pool.length)];
  Object.assign(PR, { topic: t, item: t.gen(), tries: 0, counted: false });
  renderPCard();
  if (S.mode === 'practice') toLive(null);
  caption(null, null, '<div class="cap-t">用这台计算器算，答案填进下面的框。</div>');
}
const accNeed = a => (a.acc === 'exact' ? '写准确值' : a.acc === 'dp1' ? '保留 1 位小数' : `保留 ${a.acc} 位有效数字`);
const accText = a => (a.acc === 'exact' ? '精确值' : a.acc === 'dp1' ? '保留 1 位小数' : `${a.acc} 位有效数字`);
const fmtAns = a => (a.acc === 'exact' ? String(+a.v.toPrecision(12)) : a.acc === 'dp1' ? a.v.toFixed(1) : String(Number(a.v.toPrecision(a.acc)))).replace('-', '−');
function renderPCard() {
  const t = PR.topic, it = PR.item;
  $('#pcard').innerHTML = `
    <div class="qh"><span class="tag accent">${t.topic}</span><span class="tag">${t.unit}</span><span class="pc-name">${rich(t.name)}</span></div>
    <div class="formula">${rich(t.formula)}</div>
    <p class="pq">${rich(it.q)}</p>
    <form class="answers" id="ans-form" autocomplete="off">
      ${it.answers.map((a, j) => `<label class="ans"><span class="ans-l">${rich(a.lab)}</span><input type="text" inputmode="decimal" data-j="${j}" placeholder="${accText(a)}" spellcheck="false"><span class="ans-m" aria-live="polite"></span></label>`).join('')}
      ${it.any ? '<p class="foot">两个解先写哪个都行。</p>' : ''}
      <div class="pc-actions">
        <button class="btn primary" type="submit">检查</button>
        <button class="btn" type="button" id="p-hint">看按法</button>
        <button class="btn ghost" type="button" id="p-show">看答案</button>
        <button class="btn ghost" type="button" id="p-next">换一题</button>
      </div>
    </form>
    <div class="feedback" id="p-fb" hidden></div>
    <div class="hintbox" id="p-hintbox" hidden><p class="ptitle">按法（${S.model.name}）</p><ol class="chips" id="hint-chips"></ol></div>`;
}
function checkItem() {
  const it = PR.item, inputs = $$('#ans-form input'), vals = inputs.map(i => parseAnswer(i.value));
  let marks;
  if (it.any) {
    const used = new Set();
    marks = vals.map(u => { const j = it.answers.findIndex((a, k) => !used.has(k) && checkAnswer(u, a)); if (j >= 0) used.add(j); return j >= 0; });
  } else marks = vals.map((u, j) => checkAnswer(u, it.answers[j]));
  inputs.forEach((inp, j) => {
    const blank = !inp.value.trim();
    inp.classList.toggle('ok', marks[j]);
    inp.classList.toggle('bad', !marks[j] && !blank);
    inp.parentElement.querySelector('.ans-m').textContent = marks[j] ? '✓' : blank ? '' : Number.isNaN(vals[j]) ? '不是数字' : '✗';
  });
  if (inputs.every(i => !i.value.trim())) { inputs[0].focus(); return; }
  const all = marks.every(Boolean);
  PR.tries++;
  if (!PR.counted && (all || PR.tries >= 1)) {
    PR.counted = true;
    PR.score.done++;
    if (all) { PR.score.right++; PR.score.streak++; } else PR.score.streak = 0;
    store.set('score', PR.score);
    renderScore();
  }
  const fb = $('#p-fb');
  fb.hidden = false;
  fb.className = `feedback ${all ? 'good' : 'bad'}`;
  fb.innerHTML = all
    ? `<b>对了。</b><div class="work">${rich(it.work)}</div>`
    : `<b>还不对。</b>答案要${it.answers.map(accNeed).filter((v, j, a) => a.indexOf(v) === j).join('、')}。${PR.tries >= 2 ? '可以先看看按法。' : ''}`;
  if (all) $('#p-next').focus();
}
function revealItem() {
  const it = PR.item;
  $$('#ans-form input').forEach((inp, j) => { inp.value = fmtAns(it.answers[j]); inp.classList.remove('bad'); inp.classList.add('shown'); inp.parentElement.querySelector('.ans-m').textContent = ''; });
  if (!PR.counted) { PR.counted = true; PR.score.done++; PR.score.streak = 0; store.set('score', PR.score); renderScore(); }
  const fb = $('#p-fb');
  fb.hidden = false;
  fb.className = 'feedback';
  fb.innerHTML = `<b>答案</b><div class="work">${rich(it.work)}</div>`;
}
function hintItem() {
  let snaps = [];
  try { snaps = runScript(S.model, PR.item.seq); } catch (e) { caption(null, null, `<div class="cap-t">这题的按法出错了：${esc(e.message)}</div>`); return; }
  $('#p-hintbox').hidden = false;
  load('hint', snaps, new Calc(S.model).view(), $('#hint-chips'));
  caption(null, null, `<div class="cap-k"><span class="cap-tag">提示，共 ${snaps.length} 步</span></div><div class="cap-t">按计算器上任意一个键，就回到你自己的算式。</div>`);
  play();
}
function enterPractice() {
  renderTopics();
  renderScore();
  if (!PR.item) newItem();
  else { renderPCard(); toLive(null); }
  caption(null, null, '<div class="cap-t">用这台计算器算，答案填进下面的框。</div>');
}

/* ================= 路由、视图 ================= */
function setHash(h) {
  if (location.hash === h) return;
  if (location.protocol === 'file:') location.hash = h; else history.replaceState(null, '', h);
}
function syncTabs() {
  const m = S.model;
  $$('#mode-tabs .seg-b').forEach(a => {
    const md = a.dataset.mode;
    a.href = `#/${m.id}/${md}${md === 'demo' && S.q ? '/' + S.q.n : ''}`;
    a.classList.toggle('on', md === S.mode);
    a.setAttribute('aria-current', md === S.mode ? 'page' : 'false');
  });
  $('#model-tabs').innerHTML = ORDER.map(id => `<a class="seg-b${id === m.id ? ' on' : ''}" href="#/${id}/${S.mode}${S.mode === 'demo' && S.q ? '/' + S.q.n : ''}" aria-current="${id === m.id ? 'page' : 'false'}">${SHORT[id]}</a>`).join('');
}
function showHome() {
  stop();
  setImmersive(false);
  document.body.dataset.view = 'home';
  delete document.body.dataset.model;
  $('#home').hidden = false;
  $('#app').hidden = true;
  document.title = 'SC Emulator · Casio 计算器模拟';
  scrollTo(0, 0);
}
function openModel(id, mode, qn) {
  const m = MODELS[id];
  const changed = S.model !== m;
  document.body.dataset.view = 'model';
  document.body.dataset.model = id;
  document.body.dataset.mode = mode;
  $('#home').hidden = true;
  $('#app').hidden = false;
  if (changed) {
    stop();
    S.model = m;
    buildCalc(m);
    resetLive();
    $('#tb-thumb').src = m.img + '.webp';
    $('#tb-name').textContent = m.name;
    $('#tb-series').textContent = m.series;
  }
  const modeChanged = S.mode !== mode;
  S.mode = mode;
  store.set('model', id);
  store.set('mode', mode);
  document.title = `${m.name} · ${MODE_NAMES[mode]} · SC Emulator`;
  $('#imm-hint').textContent = mode === 'demo' ? '空格 播放　← → 换步　点屏幕 下一步　Esc 退出' : '点按键或用键盘打　Esc 退出';
  if (mode === 'demo') {
    const n = qn != null ? qn : S.q ? S.q.n : store.get('q', 1);
    if (changed || modeChanged || !S.q || S.q.n !== n) selectQ(n, S.q && S.q.n === n ? S.part : 0);
  } else if (mode === 'free') { if (changed || modeChanged) enterFree(); }
  else if (changed || modeChanged) enterPractice();
  syncTabs();
}
function route() {
  const h = location.hash;
  const legacy = h.match(/^#q(\d+)$/);
  if (legacy) { location.replace(`#/ex/demo/${legacy[1]}`); return; }
  const m = h.match(/^#\/(cw|ex|es)(?:\/(demo|free|practice))?(?:\/(\d+))?/);
  if (!m) { showHome(); return; }
  openModel(m[1], m[2] || store.get('mode', 'demo'), m[3] != null ? +m[3] : null);
}

/* 题目列表收起、沉浸模式（只留计算器） */
const ui = { immersive: false, pickerHidden: store.get('ui', {}).pickerHidden || false, hintTimer: 0 };
function applyUI() {
  document.body.classList.toggle('immersive', ui.immersive);
  document.body.classList.toggle('picker-hidden', ui.pickerHidden);
  const bp = $('#btn-picker');
  bp.setAttribute('aria-expanded', String(!ui.pickerHidden));
  bp.textContent = ui.pickerHidden ? '展开题目' : '收起题目';
  $('#btn-immersive').setAttribute('aria-pressed', String(ui.immersive));
  store.set('ui', { pickerHidden: ui.pickerHidden });
  requestAnimationFrame(fitScreen);
}
function setImmersive(on) {
  if (ui.immersive === on) return;
  ui.immersive = on;
  applyUI();
  const hint = $('#imm-hint');
  clearTimeout(ui.hintTimer);
  hint.classList.toggle('show', on);
  if (on) ui.hintTimer = setTimeout(() => hint.classList.remove('show'), 3500);
  // 沉浸模式顺便全屏；浏览器不允许时只切换布局
  if (on && document.fullscreenEnabled && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

/* ================= 初始化 ================= */
const KEYMAP = { '.': 'dot', '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '(': 'lp', ')': 'rp', '^': 'pow', Enter: 'eq', '=': 'eq', Backspace: 'del', Delete: 'ac', ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R' };
for (const d of '0123456789') KEYMAP[d] = d;
function init() {
  renderHome();
  renderNav();
  applyUI();
  $('#btn-picker').addEventListener('click', () => { if (!ui.immersive) { ui.pickerHidden = !ui.pickerHidden; applyUI(); } });
  $('#btn-immersive').addEventListener('click', () => setImmersive(true));
  $('#imm-exit').addEventListener('click', () => setImmersive(false));
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && ui.immersive) setImmersive(false); });
  addEventListener('resize', () => requestAnimationFrame(fitScreen));
  $('#btn-photo').addEventListener('click', () => {
    $('#photo-img').src = S.model.img + '.webp';
    $('#photo-img').alt = `${S.model.name} 实物照片`;
    $('#photo-cap').textContent = `${S.model.name} 实物照片`;
    $('#photo').showModal();
  });
  $('#photo').addEventListener('click', e => { if (e.target === $('#photo')) $('#photo').close(); });

  // 按法演示
  $('#qnav').addEventListener('click', e => { const b = e.target.closest('.qb'); if (b) selectQ(+b.dataset.q); });
  $('#qcard').addEventListener('click', e => {
    const t = e.target.closest('.tab');
    if (t) { stop(); selectPart(+t.dataset.p); }
    const mv = e.target.closest('[data-qstep]');
    if (mv) stepQ(+mv.dataset.qstep);
  });
  for (const id of ['#chips', '#log']) $(id).addEventListener('click', e => { const c = e.target.closest('.chip'); if (!c) return; if (P.ctx === 'live') startReplay(); stop(); show(+c.dataset.i); });
  $('#pcard').addEventListener('click', e => { const c = e.target.closest('#hint-chips .chip'); if (c && P.ctx === 'hint') { stop(); show(+c.dataset.i); } });
  $('#play').addEventListener('click', play);
  $('#prev').addEventListener('click', () => step(-1));
  $('#next').addEventListener('click', () => step(1));
  $('#restart').addEventListener('click', () => { if (P.ctx === 'live') startReplay(); stop(); show(-1); });
  $('#speed').addEventListener('change', e => { P.speed = +e.target.value; });
  document.addEventListener('click', e => { if (ui.immersive && S.mode === 'demo' && e.target.closest('.lcd')) step(1); });

  // 计算器按键：演示模式查看说明，其余模式真的按下去
  $('#calc').addEventListener('click', e => {
    const b = e.target.closest('[data-key]');
    if (!b) return;
    if (S.mode === 'demo') { if (!P.playing && !ui.immersive) keyInfo(b.dataset.key); return; }
    liveKey(b.dataset.key);
  });

  // 自由模式
  $('#log-replay').addEventListener('click', () => { startReplay(); stop(); show(-1); play(); });
  $('#log-copy').addEventListener('click', copyLog);
  $('#log-clear').addEventListener('click', () => { S.rec.steps.length = 0; S.base = S.live.view(); toLive($('#log')); updateLogMeta(); $('#count').textContent = '–'; });
  $('#calc-reset').addEventListener('click', () => { resetLive(); toLive($('#log')); updateLogMeta(); updateSettings(); caption(null, null, '<div class="cap-t">已重置：变量清零，角度回到 Deg。</div>'); });
  $('#set-angle').addEventListener('click', e => { const b = e.target.closest('.seg-b'); if (!b || !S.live) return; S.live.angle = b.dataset.v; updateSettings(); paint(S.live.view()); });
  $('#set-io').addEventListener('click', e => {
    const b = e.target.closest('.seg-b');
    if (!b || !S.live) return;
    S.live.io = b.dataset.v;
    if (S.live.scr.k === 'edit' && S.live.scr.ed.done) S.live.scr.dec = b.dataset.v === 'dec';
    updateSettings();
    paint(S.live.view());
  });

  // 公式练习
  $('#topics').addEventListener('click', e => {
    const b = e.target.closest('.pill');
    if (!b) return;
    const id = b.dataset.t;
    if (PR.sel.has(id) && PR.sel.size > 1) PR.sel.delete(id); else PR.sel.add(id);
    store.set('topics', [...PR.sel]);
    renderTopics();
    if (!PR.sel.has(PR.topic.id)) newItem();
  });
  $('#topics-all').addEventListener('click', () => { PRACTICE.forEach(t => PR.sel.add(t.id)); store.set('topics', [...PR.sel]); renderTopics(); });
  $('#pcard').addEventListener('submit', e => { e.preventDefault(); checkItem(); });
  $('#pcard').addEventListener('click', e => {
    if (e.target.closest('#p-hint')) hintItem();
    else if (e.target.closest('#p-show')) revealItem();
    else if (e.target.closest('#p-next')) newItem();
  });
  $('#score').addEventListener('click', e => { if (e.target.closest('#score-reset')) { PR.score = { done: 0, right: 0, streak: 0 }; store.set('score', PR.score); renderScore(); } });

  document.addEventListener('keydown', e => {
    if (document.body.dataset.view !== 'model' || $('#photo').open) return;
    if (e.target.closest('select, input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'f' || k === 'F') { setImmersive(!ui.immersive); return; }
    if (k === 'Escape' && ui.immersive) { setImmersive(false); return; }
    if (S.mode === 'demo') {
      if (k === ' ') { e.preventDefault(); play(); }
      else if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); step(1); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); step(-1); }
      else if (k === 'Home') { stop(); show(-1); }
      else if (k === '[') stepQ(-1);
      else if (k === ']') stepQ(1);
      else if (k === 't' || k === 'T') $('#btn-picker').click();
      return;
    }
    if (e.target.closest('button, a') && (k === 'Enter' || k === ' ')) return;
    if (k === ' ' && P.snaps.length && P.ctx !== 'live') { e.preventDefault(); play(); return; }
    if (KEYMAP[k]) { e.preventDefault(); pressFnLive(KEYMAP[k]); }
  });
  addEventListener('hashchange', route);
  route();
}
document.addEventListener('DOMContentLoaded', init);
