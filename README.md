# SC Emulator · Casio 计算器课堂模拟器

fx-991CW、fx-991EX、fx-991ES PLUS（2nd edition）三款 Casio 科学计算器的网页模拟。首页选机型，每款机型有三种模式。

在线地址：https://chaneyqian.github.io/sc-emulator/

## 三种模式

- **按法演示**：押题卷 49 题，按小问一步一步放。正在按的键会亮，屏幕跟着出算式和结果。换一台机型，按法会跟着换，比如 CW 要用 HOME 和 OK 进 Equation，d/dx 在 CATALOG 里，代入求值用 FUNCTION 定义 f(x)。
- **自由模式**：上课随手按，分数、根式、π 都给准确值。按过的键会记下来，可以重放，也可以复制成文字。
- **公式练习**：Y12 常用公式随机出题，共 19 类：二次方程、判别式、两点距离、弧长和扇形、弧度、三角方程、余弦定理、三角形面积、二项式系数、等差和等比数列、导数、定积分、指数方程、指数增长、二项分布、标准差、排列组合。会按有效数字判对错，不会做可以看按法。

按 F 全屏，只留计算器，投屏用；“实物照片”可以对照真机的键位。

## 已模拟的计算器功能

普通计算（自然显示输入、分数 / 根式 / π 精确结果、S⇔D / FORMAT、≈）、乘方与根、log / ln、三角与反三角（角度 / 弧度）、nCr、nPr、x!、Abs、d/dx、∫、Σ、Ans、变量 A–F、x、y、M（STO / RCL / VARIABLE）、CALC、SOLVE、CW 的 f(x) / g(x)；方程模式（二次、三次、二元 / 三元一次）；表格模式。统计、矩阵、复数等模式还没做，按了会在屏幕上提示。

CW 的菜单路径（HOME、SETTINGS、CATALOG、VARIABLE、FUNCTION、TOOLS）按 Casio 官方说明书整理；CATALOG 里分类的排列顺序、VARIABLE 子菜单里 Store / Recall 的先后没有在说明书正文里写明，以真机为准。

## 快捷键

| 按键 | 作用 |
|---|---|
| 空格 | 播放 / 暂停 |
| ← → 或 PgUp PgDn | 上一步 / 下一步（按法演示） |
| [ ] | 上一题 / 下一题 |
| T | 收起 / 展开题目 |
| 0–9 . + - * / ( ) ^ | 自由模式、练习里直接按计算器 |
| Enter / Backspace / Delete | = / DEL / AC |
| F | 全屏，Esc 退出 |

## 文件

- `index.html`、`style.css`：首页、机型页与三款计算器的外观
- `engine.js`：计算引擎（精确分数 / 根式 / π、数值微积分、方程）
- `models.js`：三款机型的键位、第二功能标签、菜单，以及各机型的按法路径
- `calc.js`：计算器状态机（编辑器、菜单、方程、表格、CALC……）和按键序列播放
- `questions.js`：押题卷每道题的按键序列，文件开头写了记法说明；改题或加题只需改这个文件
- `practice.js`：Y12 公式练习的出题器
- `app.js`：页面、播放器、三种模式
- `img/`：产品照片（CASIO 产品图裁剪、压缩成 WebP）
- `vendor/katex/`：KaTeX 0.18.11（MIT），用来排版公式，随网站一起发布，不依赖 CDN
- `tests/run.js`：`node tests/run.js` 把每道题、每类练习在三款机型上各按一遍，核对屏幕结果
- `tests/tex.js`：`node tests/tex.js` 检查所有公式能不能正常排版

## 公式写法

题目标题、答案、题型名和练习题里的公式都用 LaTeX，写在 `$…$` 里（单独一行用 `$$…$$`），例如 `$y=\dfrac{k}{(x-1)^3}$`。带反斜杠的字符串用 ``String.raw`…` ``，免得 `\frac` 里的反斜杠被吃掉。改完跑一下 `node tests/tex.js`。

纯静态网页，直接双击 `index.html` 也能离线使用。推送到 `main` 后由 `.github/workflows/pages.yml` 自动发布到 GitHub Pages。

教学用模拟器，与 CASIO 官方无关；产品照片版权归 CASIO 所有。
