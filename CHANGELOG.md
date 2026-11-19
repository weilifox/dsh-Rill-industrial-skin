# 变更记录

## 1.3.6

- **修好会话标题条（第 3 次，这次找到了真因）**：前两版都在猜类名。真实情况是——标题条是宿主渲染的 `<header class="an3WzG_header">`，这个哈希类名里**根本没有 `_header_` 这个子串**（`"an3WzG_header".indexOf('_header_') === -1`）。于是 `markChrome()` 里 `[class*="_header_"]` 的候选过滤把它全部筛掉、一个都没标记；CSS 里 `[data-slot="conversation.header"] > [class*="_header_"]` 也一个都没命中。两处同时空转，标题条就只能是透明的。现在改成从槽锚点走到它里面的 `<header>`：CSS 用 `[data-slot="conversation.header"] > header`，JS 用 `header[data-window-drag], [data-conversation-header-leading]` 加 `closest('header')` 兜底，不再依赖任何类名哈希。
- **槽锚点本身不能承载背景**：`scoped-slots.tsx:1319` 的 `ANCHOR_STYLE = { display: 'contents' }`——锚点没有盒子，把 `background-color` 打在 `[data-slot="conversation.header"]` 上永远看不见。这条规则已从填充列表里删掉，注释也改写成这个事实，避免以后又照着它改。
- **透明规则相应收窄**：只清 `[data-slot="conversation.header"] header > *` 与页签条那几个容器（`tabHost` / `tablist` / `data-conversation-tabs`）以及 `conversation.session.header` 及其子层，不再用能匹配到填充层自己的通配。
- **自检补回归断言**：`tools/harness.cjs` 现在会检查最终 CSS 里没有 `[class*="_header_"]`、并且必须含 `[data-slot="conversation.header"] > header`，否则直接失败。这个 bug 让标题条消失过两次，不能只靠肉眼。
- **文档配图换成本版实机截图**：`docs/preview.png`（深色壁纸下的工作区）与 `docs/settings.png`（设置页，七套配色齐全、徽标 1.3.6）都换成本版实拍；此前那张设置页截图还停在 v1.2.1 的五套色板。

## 1.3.5

- **会话标题条恢复成一整块不透明台面**：1.3.4 为了让页签条不出现第二条杠，把 `_header_` 一律刷成透明，结果把承载填充的那一层也清掉了，整条标题带露出壁纸。现在填充只落在**一个盒子**上（`conversation.header` 槽锚点 + 它下面那个 `_header_`），页签条、`tabHost`、`tablist`、`conversation.session.header` 及其子层才是透明的那些。
- **`markChrome()` 改为按"谁装着页签条"选靶子**：原来取"高度 ≤100 且最短的那个 `_header_`"，会挑中带子里某个工具行而不是带子本身，标记打错位置时填充也就落错位置。现在优先 `querySelector('[data-conversation-tabs], [role="tablist"]')` 命中的那个（阈值同时放宽到 220，给标题行 + 页签条留够高度）。
- 标题条底部细线改用 `--rill-line`，与纸上其他分栏线同族。

## 1.3.4

- **深羊皮橙减淡 30%**：`plate` 由 `#9C5F1E` / `#965A1B` 提到 `#BA8F62` / `#B68C5F`（向白混 30%），块上文字从奶白反过来改回墨色 `#261E12`——减淡后白字只剩 2.9:1，墨字 5.63:1 / 5.41:1。观感从"深色板"变成"同一张纸上压出来的一道浅赭印"。
- **会话标题条并成一条**：标题行与视图页签原本各画各的底色（页签条的 `_tabHost_` 自带一层），读起来是上下两条杠。现在只有整条标题条本体承载填充与纸纤维，内部所有层（标题行、页签条、`[role="tablist"]`、`[data-conversation-tabs]`）一律透明，`> :not([data-rill-chrome])` 保证不会把打了标记的整条自己也清掉。
- **标题条带上与左侧栏同源的纸纤维**（`--rill-paper-tex`），其余六套配色该变量为 `none`，无变化。
- **修 `--dsw-alias-label-dimmed` 指错**：它被误接到 `--rill-plate`（会变成一块橙底），改回 `--rill-ink-3`；它其实是个文字色 token。

## 1.3.3

- **接入 20 个之前没管的"浅起面" token**：新会话按钮、右上「费用明细」chip、卡片、菜单、气泡、浮层底这些位置原先直接吃宿主的中性灰（`--dsw-static-neutral-bluish-750/800`，即 `#43454A` / `#353638`），在暖纸上就是一块冷灰板。现在赭笺下它们统一指向新变量 `--rill-plate`（深羊皮橙）与 `--rill-surface/-2`，其余六套配色一个 token 都不动（`--rill-plate` 解析为 `transparent`）。
- **深羊皮橙成为"选中/主按钮"的实心底色**：`plate` 深色档 `#9C5F1E`、浅色档 `#965A1B`，配奶白字 `#FDF9EC`（4.90:1 / 5.33:1）。侧栏的选中行、新会话按钮、费用 chip 三处都用它，和 1.3.2 的赭橙 `#C6842E` 分两层——浅的那层做强调描边与选区，深的那层做实心底。
- **工作区文件夹与会话行改为实心高亮**：原先 hover/选中走 `--dsw-alias-interactive-bg-hover`（18% accent 淡洗），在纸上几乎看不见。现在 `projectRow` / `sessionRow` / `panelRow` / `panelEntry` 的 hover、`menuOpen`、`_selected` 全部是深羊皮橙实心块，块内文字（含图标与后代）一并翻成奶白，避免墨字压在深底上。
- **选中行左侧 3px 描边改用 `accent2`**：底色已经变深，再用深赭 `#7A582A` 描边会糊在一起。
- 文档：`--rill-plate` / `--rill-plate-ink` 进变量表与配色段；自检脚本新增两条断言（非 `PLATED` 配色 `--rill-plate` 必须是 `transparent`、`PLATED` 配色必须是声明的深橙 + 奶白字）。

## 1.3.2

- **配色退回 1.3.0 的暖纸版**：灰砂纸那一版整屏读作灰板，太冷；纸色回到深色档 `bg #F0DEB2 / side #E8D19E / surf #F8ECCE / surf2 #DBC088`，浅色档 `#FAF4E1 / #F4EBD3 / #FDF9EC / #E3D5B4`，文字仍是墨色（`#261E12 / #221B10`）。
- **高亮从炭黑改成土黄偏橙**：1.3.1 的选中行是炭黑实心块，而这一版的文字恰好也是墨色——深灰底盖深灰字，选中项的标题完全看不见。现在 `accent2` 是赭橙 `#C6842E / #CE8C34`，选中行是整条赭橙实心配左侧深赭描边 `#7A582A`，墨色字压在上面 5.28:1 / 5.82:1，既在纸的色系里又读得清。发送键同步吃这个色。
- **正文的选区与代码段高亮保持浅土黄**：`--rill-code-selected` 在纸类配色下改为由 `accent2` 向纸色混 0.26 得到（约 `#E2C484`），墨色字压上去 9.8:1；另给 `::selection` 显式声明，不依赖宿主的默认蓝。
- **去掉页底方格纸**：上一版在 `html` 上压了 32px 制图网格（`--rill-page-tex`），这一版随手感一起撤掉——纸就是纸，壁纸透过来就是原图，没有任何叠加层。变量一并删除。
- **纸纤维染色回到暖棕**（`rgba(118,86,42,·)` / `rgba(255,250,234,·)`），灰纸时代的中性灰在暖纸上会显脏。
- 保留 1.3.1 的两处纯修复：壁纸前的雾层（`centerAlpha` 下限归零 + `layerAlpha` 保卡片底）与 18 个 `markdown-/menu-/toast-/tooltip-/scrollbar-` token 的接管——它们跟配色取向无关，黑块到哪一版都是黑块。
- 对比度实测（墨色）：深色档 6.28–8.17:1（最差 surf2 5.04），浅色档 7.90–11.30:1；选中行墨字 5.28 / 5.82；浅土黄选区墨字 9.76 / 10.55。

## 1.3.0

- 新增第七套配色 **赭笺 / `parchment`（Ochre Folio）**：从一张羊皮纸参考图取色后低饱和化，深色档是旧纸 `bg #F0DEB2 / side #E8D19E / surf #F8ECCE / surf2 #DBC088`，浅色档是新纸 `#FAF4E1 / #F4EBD3 / #FDF9EC / #E3D5B4`，强调色 `#7A582A / #8A6A34`，火漆红 `#963A26 / #A8462C`。
- **首个翻转文字色与外观档的配色**：新增可选的 `ink` 与 `scheme` 字段，未声明的调色板保持纯白文字、观感与 1.2.5 完全一致；`parchment` 声明墨色（`#261E12 / #221B10`）并把 `color-scheme` 切到 `light`，因为它在两种外观下都是浅色纸面，白字对比度不到 3:1，原生控件也只有跟着切才不会半白半黑。停用时 `unpaint()` 一并清掉 `color-scheme`。
- **纸纤维纹理**：左侧栏与右侧栏叠一层运行时生成的 192×192 无缝瓦片（`--rill-paper-tex`）——三团不规则斑块 + 细杂点 + 断纤维三层，按「纹理强度」实时合成，带 alpha 所以不挡侧栏不透明度滑块。只有声明 `paper` 的配色会生成，其余配色解析为 `none`。
- 设置页新增「纸张纹理 / paper」分组（仅赭笺可见）：纹理强度 0–100%，滑块内部乘 1.15 再封顶——默认 70% 的颗粒度与参考纸基本一致（每通道标准差 4.2 对 4.4），往右更旧。
- 赭笺下的浅色系控件（按钮、分段控件、输入框、壁纸缩略图、滚动条）换成墨色淡洗——白洗在纸上会消失。
- `locale/*`、README 配色表与自检说明、`docs/DETAIL.md`、`tools/*` 断言同步到七套配色。

## 1.2.5

- 暮紫换回**第一版取色**：底色保留画面原本的靛蓝（色相 231–234°），只有强调色偏紫（253°）。1.2.4 那版把底色也推到 252°，实际用起来会觉得整块屏幕都发紫，故退回。
- 深色 `bg #12162E / side #0C0F22 / surf #262E50 / surf2 #343E66`，浅色 `#3A3660 / #302C52 / #484272 / #585086`；强调色 `#A294D4 / #BAB0E4`，青绿 `#6EBEBA / #8CD0CA`。
- 深色底在取色原值（`#0E1023`）基础上抬了两档：原值下中栏与左右侧栏几乎同黑，分区看不出来；抬到 `#12162E` 后中栏比侧栏亮一档，色相不变。
- `accent2` 机制与其余五套配色不变。

## 1.2.4

- 新增第六套配色 **暮紫 / `violet`（Dusk Violet）**：从《鸣潮》启动画面取色后低饱和化，色相 252°（现有「深蓝」在 210–216°，故两者不再雷同）；深色 `bg #201C3E / side #16132C / surf #2E2857 / surf2 #3E3672`，浅色 `#383062 / #2C2550 / #463C78 / #5A4E94`，强调色 `#9C8DD6 / #C4B8EE`。
- 新增 `accent2` 概念：可点控件专用色。`violet` 声明青绿（深 `#6CC2BC` / 浅 `#8CD0CA`），只作用于发送键与焦点环；**其余五套主题未声明，`accent2` 回退为 `accent` 原值，观感与 1.2.3 完全一致**。
- 发送键新增 `--rill-key-ink`：声明了 `accent2` 的主题用深色箭头（浅底青绿上白字对比不足），其余仍为白色。
- `locale/zh.json`、`locale/en.json`、README 配色表、`docs/DETAIL.md` 变量表同步。

## 1.2.3

- 安装说明改为**登记成 profile 的 link 依赖**（`pnpm add "link:<源码路径>"`）：只建 junction 只写 `dsh.profile.bundles` 的话，插件能加载，但插件页面会把它判成内置插件、没有卸载和更新入口——插件页读的是 profile `dependencies`，`bundles` 只决定加载。
- `docs/DETAIL.md` 第 1 节补「为什么必须是 link 依赖」与两处状态错位的说明；第 2 节槽位契约修正为实际实现：`inject: ['slots']`、`name` 必须是槽键、遮蔽用 `priority: -1`、list 槽必带 `id`，并补上此前漏掉的 `sidebar.brand.name`。
- README 增「卸载」小节，写明「停用外观」与「正式卸载」是两回事。

## 1.2.2

- README 增加设置页截图 `docs/settings.png`（891×579，71 KB），排在实机图之后，标注五套配色与四区滑块。

## 1.2.1

- README 首图换成实机截图 `docs/preview.png`（1600×952，528 KB），删除手绘的 `docs/preview.svg`。

## 1.2.0

- **包名改为 `dsh-rill-industrial-skin`**（与生态内 `dsh-purge` / `dsh-cost-meter` 等保持一致）：`package.json` 的 `name`、`lib/index.js` 的 `name`、`cordis.patch.yml` 的 `id`/`name`、`lib/client.js` 的模块 id 与 `PKG` 常量一起改；仓库地址同步为 `weilifox/dsh-Rill-industrial-skin`。
- 升级提示：profile 的 `node_modules` 目录名与 `dsh.profile.bundles` 里的条目要一起换成新名，旧名需移除，否则会重复加载。
- **存储键故意保留 `rill-industrial-skin:settings:v1`**，改名后老用户的主题、壁纸、各滑块设置不会丢。

版本号双写于 `package.json` 与 `lib/client.js` 的 `const VERSION`，设置页徽标显示后者——升级后若徽标没变，说明页面还在跑旧模块，`Ctrl+R` 刷新即可。

## 1.1.4

- 设置页标题改为「Rill工业风皮肤」（`lib/client.js`、`locale/zh.json`、README、docs 同步）。
- 清理开发期副产：profile 内的临时备份与热重载注释、Temp 里的临时脚本；自检脚本迁入 `tools/` 并改为相对路径。
- 文档补齐四个分区变量（`--rill-a-*`）与自检说明。

## 1.1.3

- 修：拖动壁纸滑块时，会话标题条那条带子跟着变色。此前给标题条的子层写了 `> * { background: transparent }`，透明后露出中栏底色；改为标记元素、slot 锚点、锚点内 `_header_` 后代与锚点子层**全部实心上色**。

## 1.1.2

- 会话标题条的 `_header_` 命中阈值收紧到 ≤100px，并让锚点自身也上色（引入 1.1.3 要修的问题）。

## 1.1.1

- `markChrome()` 改为在 slot 锚点内按高度挑**最小**的 `_header_` 元素打 `data-rill-chrome="1"`，CSS 不再使用宽通配。
- 底栏补 `[data-shell-bottom]` 与子层透明；发送键选择器扩展并强制方形尺寸与居中。

## 1.1.0

- 不透明度拆成四个独立滑块：左侧栏 / 右侧栏 / 底栏 / 会话标题条（`alphaSide` / `alphaRight` / `alphaBottom` / `alphaHeader`）。
- 共享层级底色（`--rill-field` / `--rill-surface`）改由中栏 alpha 派生，侧栏滑块不再影响中栏。

## 1.0.10

- 修：设置页整块空白。删除诊断块时连带删掉了 `pct` / `px` 两个格式化函数，组件渲染抛 `ReferenceError`。
- 新增 `tools/render-settings.cjs`：真执行 SettingsPage 的自检，补上静态桩测试的盲区。

## 1.0.9

- 会话标题条改用 `data-rill-chrome="1"` 精确标记；设置页文案精简（去掉状态提示行、"诊断遮挡层"按钮与 localStorage 字样）；壁纸不透明度滑块方向改为「越往右越清楚」。

## 1.0.8

- 修：壁纸被整窗底色挡死。`.frame` 保持不透明的标题条色，同时把 `[class*="frame"]` 的背景清透明，让壁纸层透出来。

## 1.0.7

- 标题栏（`.frame::before`）单独使用 `--rill-title`，恒 100% 不透明。
- 右侧栏、底栏、会话标题条划入侧栏 alpha。

## 1.0.6

- 首次分区：中栏 `--rill-center` 只听壁纸不透明度，侧栏 `--rill-side` 听工作区不透明度；壁纸模糊改为 X＋Y 双向。

## 1.0.5

- **关键修复**：`--dsw-alias-*` 由宿主声明在 `body` 上，此前只覆盖 `html` 导致配色完全没生效。映射同时写到 `html[data-rill-industrial="on"] body`。

## 1.0.4

- 品牌字号 12px → 14px；新增「诊断遮挡层」按钮（后于 1.0.9 移除）。

## 1.0.3

- 壁纸从 `body::before` 负 z 伪元素改为真实固定图层 `#rill-industrial-wall`（`z-index:1`），`#root` 抬到 `z-index:2`。

## 1.0.2

- 字标并入 `sidebar.brand.mark`（`sidebar.brand.name` 槽容器极窄，会把文字压到 0 宽）。
- 壁纸缩略图缩到 74×46；新增不透明画布 `--rill-canvas`。

## 1.0.1

- 新增皮肤启用开关；壁纸改为 canvas 压缩管线（长边 1920 / JPEG 0.82 / 超 2.5 MB 逐级降质），修复大图静默失败。
- 鲸鱼改用宿主 favicon 的官方 path；文案 `DEEPSEEK HARNESS`，去掉会把它藏掉的 76px 容器断点。
- 侧栏 hover / 选中改吃强调色，文字仍恒白。

## 1.0.0

- 首发：全直角、深蓝工作区、白字、五套低饱和配色、壁纸、毛玻璃对话框、凸起发送键、扫描质感。
