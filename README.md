# SC Emulator · Casio 计算器课堂模拟器

fx-991CW、fx-991EX、fx-991ES PLUS（2nd edition）三款 Casio 科学计算器的网页模拟。首页选机型，每款机型有三种模式。

在线地址：https://chaneyqian.github.io/sc-emulator/

## 三种模式

- **按法演示**：0580 押题卷 49 题，分小问逐键播放。当前按键高亮，SHIFT / ALPHA 先亮，屏幕同步显示算式和结果，说明框写出每一步的作用。同一道题切换机型后，按该机型的键位和菜单重新生成按法（例如 CW 用 HOME 图标 + OK 选 Equation、用 CATALOG 找 d/dx、用 FUNCTION 定义 f(x) 代替 CALC）。
- **自由模式**（老师用）：像真机一样随便按，能算分数、根式、π 的精确结果。按过的键自动记成按法，可以回放、复制成文字。
- **公式练习**（Y12 / AS Level）：二次方程、判别式、两点距离、弧长扇形、弧度、三角方程、余弦定理、面积、二项式系数、等差 / 等比 / 无穷等比数列、导数、定积分、指数方程、指数增长、二项分布、标准差、排列组合，共 19 类随机出题；自动核对有效数字，做错可以看按法提示。

沉浸模式（F）只留计算器，适合投屏；“实物”按钮打开产品照片对照键位。

## 已模拟的计算器功能

普通计算（自然显示输入、分数 / 根式 / π 精确结果、S⇔D / FORMAT、≈）、乘方与根、log / ln、三角与反三角（角度 / 弧度）、nCr、nPr、x!、Abs、d/dx、∫、Σ、Ans、变量 A–F、x、y、M（STO / RCL / VARIABLE）、CALC、SOLVE、CW 的 f(x) / g(x)；方程模式（二次、三次、二元 / 三元一次）；表格模式。统计、矩阵、复数等模式会在屏幕上提示“暂不支持”。

CW 的菜单路径（HOME、SETTINGS、CATALOG、VARIABLE、FUNCTION、TOOLS）按 Casio 官方说明书整理；CATALOG 里分类的排列顺序、VARIABLE 子菜单里 Store / Recall 的先后没有在说明书正文里写明，以真机为准。

## 快捷键

| 按键 | 作用 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← → 或 PgUp PgDn | 上一步 / 下一步（按法演示） |
| [ ] | 上一题 / 下一题 |
| T | 显示 / 隐藏题目列表 |
| 0–9 . + - * / ( ) ^ | 自由模式、练习里直接按计算器 |
| Enter / Backspace / Delete | = / DEL / AC |
| F | 沉浸模式，Esc 退出 |

## 文件

- `index.html`、`style.css`：首页、机型页与三款计算器的外观
- `engine.js`：计算引擎（精确分数 / 根式 / π、数值微积分、方程）
- `models.js`：三款机型的键位、第二功能标签、菜单，以及各机型的按法路径
- `calc.js`：计算器状态机（编辑器、菜单、方程、表格、CALC……）和按键序列播放
- `questions.js`：押题卷每道题的按键序列，文件开头写了记法说明；改题或加题只需改这个文件
- `practice.js`：Y12 公式练习的出题器
- `app.js`：页面、播放器、三种模式
- `img/`：产品照片（CASIO 产品图裁剪、压缩成 WebP）
- `tests/run.js`：`node tests/run.js` 把每道题、每类练习在三款机型上各按一遍，核对屏幕结果

纯静态网页，直接双击 `index.html` 也能离线使用。推送到 `main` 后由 `.github/workflows/pages.yml` 自动发布到 GitHub Pages。

教学用模拟器，与 CASIO 官方无关；产品照片版权归 CASIO 所有。
