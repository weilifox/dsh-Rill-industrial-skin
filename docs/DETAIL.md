# 实现说明

这份文档记录 `dsh-rill-industrial-skin` 的内部契约，方便改皮肤时不必重新逆向宿主。

## 1. 加载链路

```
profiles/desktop/package.json
    ├─ dependencies["dsh-rill-industrial-skin"] = "link:<源码绝对路径>"   ← 决定「插件页是否算已安装」
    └─ dsh.profile.bundles 含 "dsh-rill-industrial-skin"                  ← 决定「加载不加载」
        │
        ├─ host 半边：package.json `dsh.bundle.patch` → cordis.patch.yml
        │     - insert: [{ id: dsh-rill-industrial-skin, name: dsh-rill-industrial-skin }]
        │     载入 lib/index.js（空实现，只声明身份 —— 皮肤全部逻辑在浏览器半边）
        │
        └─ browser 半边：package.json `dsh.client`
              { platform: "web", immediately: true }
              载入 lib/client.js，它调用 window.__ModuleLoader__.load({ id, factory })
```

### 1.1 为什么必须是 link 依赖

只把目录（junction / symlink / 解压）放进 `profiles/<profile>/node_modules` 并写进 `bundles`，插件**能加载、能跑**，但插件页面会把它归到「内置插件 / 全局插件」、标 `installed: false`，**没有卸载和更新按钮**。插件页判断"是否已安装"看的是 profile `package.json` 的 `dependencies`，`bundles` 只负责加载。

登记成 link 依赖即可（源码改动仍然即时生效，不需要重新安装）：

```bash
cd ~/.dsh/profiles/desktop
node "<DSH>/resources/app/runtime/primary-runtime/dependencies/pnpm/bin/pnpm.cjs" \
  add "link:/absolute/path/to/dsh-rill-industrial-skin" --config.minimum-release-age=0
```

登记后 `node_modules/dsh-rill-industrial-skin` 就是这个源码目录的 symlink，条目显示为 `"link:..."`。卸载走插件页或 `pnpm remove`，然后把 `bundles` 里的名字一起删掉——两处只删一处会留下"加载但无入口"或"已安装但不加载"的错位状态。

## 2. 槽位契约

| 槽 | 类型 | 归属包 | 本插件注册 | registrant / priority |
|---|---|---|---|---|
| `sidebar.brand.mark` | single | `@deepseek-ai/dsh-client-ui-sidebar` | `WhaleMark`（鲸鱼图标 + `DEEPSEEK HARNESS` 两行合体） | `dsh-rill-industrial-skin` / `-1` |
| `sidebar.brand.name` | single | 同上 | `BrandName`（占位，实际字标在上面的 mark 里） | 同上 / `-1` |
| `settings.section` | list | `@deepseek-ai/dsh-client-ui-settings` | `SettingsPage` | `id: dsh-rill-industrial-skin.settings`、`order: 60`、`label: "Rill工业风皮肤"`、`inject: () => ({ layout: "fill" })` |

三条硬规则（都踩过）：

1. **`inject: ['slots']`** —— cordis 必须先声明要用的服务，否则 `ctx.slots` 不可访问，抛 `cannot get property "slots" without inject`。这里要写服务键 `slots`，**不是包名**。
2. **`name` 必须是槽键本身**，不是自定义标识；写错会抛 `slot "X" is not declared`。
3. **遮蔽用 `priority`，不是 `order`**。single 槽同一优先级重复注册会直接抛错；宿主外壳自己以 `priority: 0` 占着品牌格，用 `-1`（渲染优先级最低者）顶掉它。list 槽才用 `order` 排序，且**必须带 `id`**。

`settings.section` 的 `label` 是设置页左侧的条目名；`layout: "fill"` 让页面拿到整列宽度而不是居中窄栏。

## 3. 样式管线

### 3.1 门控

所有规则的前缀是 `html[data-rill-industrial="on"]`。这个属性由 `paint()` 写入、`unpaint()` 移除。插件被禁用或卸载时属性消失，样式表即使残留也完全不命中。

样式表本身带 `data-plugin="dsh-rill-industrial-skin"` 与 `data-plugin-css="skin"`，注入前判重，避免 HMR 或重复 apply 叠加多份。

### 3.2 变量

`paint(settings)` 只做一件事：在 `document.documentElement` 上写 CSS 变量。

**结构类**

| 变量 | 来源 |
|---|---|
| `--rill-bg` | 调色板 `bg`，始终不透明（它是画布） |
| `--rill-side` | `side`，alpha = 兼容旧值（`surfaceAlpha`） |
| `--rill-a-side` / `--rill-a-right` / `--rill-a-bottom` / `--rill-a-header` | `side`，alpha 分别取左侧栏 / 右侧栏 / 底栏 / 会话标题条的不透明度 |
| `--rill-field` | `surf` 向 `bg` 混 45%，alpha 同上 |
| `--rill-surface` / `--rill-surface-2` | `surf` / `surf2`，alpha 同上 |
| `--rill-line` / `--rill-line-strong` | 随 alpha 从 `0.10/0.18` 抬到 `0.20/0.32` |
| `--rill-accent` | 调色板强调色；`-raise` 向白混 28%；`-strong` ×0.8；`-edge` ×0.52；`-soft` alpha .72 |
| `--rill-accent2` | 可点控件色（发送键、焦点环）；调色板未声明 `accent2` 时取 `accent` 值，`-raise/-strong/-edge` 同样派生。暮紫的 `accent2` 是画面里的青绿 `#6EBEBA / #8CD0CA` |
| `--rill-key-ink` | 发送键箭头色；声明了 `accent2` 的主题用 `#0d1420`（浅底上的青绿需要深字），否则 `#ffffff` |
| `--rill-glass-rgb` | `surf` 的 `r,g,b` 三元组，供 `rgba()` 拼 alpha |
| `--rill-glass-alpha` / `--rill-glass-blur` | 对话框透明度 / 模糊度 |
| `--rill-wallpaper` / `-opacity` / `-blur` | 壁纸层 |
| `--rill-paper-tex` | 纸纤维瓦片（`url("data:image/png...")` 或 `none`）；只有声明 `paper` 的配色会生成，见 3.3 |
| `--rill-code-bg` / `-block` / `-banner` | 行内代码 chip / 代码块 / 代码块标题条；由 `bg` 与 `ink` 互混得到（声明 `ink` 的配色混 0.10/0.055/0.13，其余 0.16/0.10/0.18） |
| `--rill-plate` / `--rill-plate-ink` | 「深起面」底色与其上的字色。只有声明了 `plate` 的配色给出实色（赭笺深 `#ba8f62` / 浅 `#b68c5f`，字 `#261e12`），其余配色解析为 `transparent`，于是宿主的原生中性色照旧。消费端是 20 个 `button-elevated/floating/ghost`、`bg-layer-3`、`card-fill`、`hovercard-bg`、`specific-bubble/-tip`、`label-dimmed` 等 `--dsw-alias-*` token，加上侧栏选中行与文件夹 hover 的具体规则 |
| `--rill-code-selected` / `-unselected` | 代码段选中/未选中底色；选中版向 `accent`（声明了 `ink` 的纸类配色改用 `accent2`）混 0.24–0.26，未选中版向 `ink` 混 0.22（纸类 0.14） |
| `--rill-menu-surface` | 菜单/弹层底色，`surf` 向 `bg` 混 18% 后取 alpha .97 |

**为什么会有 `--rill-code-*`**：`--dsw-alias-markdown-inline-code`、`-code-block`、`-code-block-banner`、`-code-segment-*`、`-markdown-tag`、`-markdown-citation`、`turn-trigger-bg`、`-specific-menu`、`-menu-group-header-fill`、`-specific-selector`、`-toast-bg`、`-tooltip-bg`、`-scrollbar-*` 这批 token 在 `design-platform.css:177`（浅色 body 块）与 `:329`（`body[data-ds-dark-theme]` 块）里指向 `--dsw-static-neutral-bluish-900` / `--dsw-static-neutral-800`。深色主题下它们看着只是"深一点的灰"，一到浅纸配色就变成一块近黑的方块——就是用户报的「那些黑色的框」。修法不是逐个打补丁，而是在两个 token 块里把这 18 个位置**统一改指向上面派生出来的变量**，于是任何配色都不会再露出原生深色值。

**文字类**：`--rill-ink`、`--rill-ink-2`（.72）、`--rill-ink-3`（.46）。默认是纯白，**只有声明 `ink` 的配色会换成墨色**——目前只有 `parchment`。同时 `color-scheme` 跟着调色板的 `scheme` 字段走（默认 `dark`，`parchment` 为 `light`），`unpaint()` 会把它清回空值。

### 3.2b 深起面（`--rill-plate`）

宿主的 155 个 `--dsw-alias-*` 里有约 60 个是"浅起的表面"：按钮、卡片、气泡、浮层。它们的默认值来自 `--dsw-static-neutral-bluish-750/800`（`#43454A` / `#353638`）——深色主题下是一块几乎看不见的浅灰，在暖纸上却是一块冷灰板。

处理方式是"统一改指向"而不是逐个截图修：在 `html[on][theme="parchment"] body` 上把这 20 个 token 指向 `--rill-plate` / `--rill-surface` / `--rill-plate-ink`。选 `body` 是因为设计平台在这层声明它们；加 `[theme="parchment"]` 是因为其余六套配色必须逐字节保持 1.2.5 的观感——`--rill-plate` 对它们解析为 `transparent`，即使规则命中也没有视觉差异。

选中行的具体规则写在 `[data-slot="sidebar"]` 下，因为宿主把底色放在行元素上、把字色放在子元素上，两者都得改（` ... * ` 那条不是偷懒，是必须的）。

### 3.2c 会话标题条（一整块不透明台面）

标题条在宿主里是 `ConversationHeader.tsx:18` 渲染的 `<header className={clsx(css.header, …)} data-window-drag>`，`min-height:76px`（`ConversationRoot.module.css:23` 的 `.header`，`grid-template-columns:auto minmax(0,1fr)`）。它的哈希类名编译后是 `an3WzG_header` —— **`"an3WzG_header".indexOf('_header_') === -1`**，这个类名里没有 `_header_` 子串。这条事实是 1.3.4 / 1.3.5 两次把标题条改没的直接原因：`[class*="_header_"]` 一个都匹配不到。

同一条带子里装着两样东西：

- 标题行（`conversation.session.header` 槽，里面是 crumbs + 右侧动作）；
- 视图页签条（`.tabs`，`grid-column:1/-1; z-index:1`），它所在的容器在别处挂了 `_tabHost_` 底色。

所以自然状态下会出现两个不同的底 —— 看起来就是"两条杠"。

**槽锚点不能承载背景**：`dsh-client-ui-renderer/src/client/scoped-slots.tsx:1319` 的 `ANCHOR_STYLE = { display: 'contents' }`，槽锚点没有盒子，把 `background-color` 打在 `[data-slot="conversation.header"]` 上永远看不见。填充必须落在锚点**里面的 `<header>` 元素**上：

```css
html[data-rill-industrial="on"] [data-rill-chrome="1"],
html[data-rill-industrial="on"] [data-slot="conversation.header"] > header,
html[data-rill-industrial="on"] [data-slot="conversation.header"] header[data-window-drag] {
  background-color: var(--rill-a-header);
  background-image: var(--rill-paper-tex);
}
```

然后把内部层清掉 —— `[data-slot="conversation.header"] header > *`、页签条容器（`[class*="tabHost"]` / `[role="tablist"]` / `[data-conversation-tabs]`）、`conversation.session.header` 及其直接子层 transparent + `background-image:none`。这样从标题文字到页签是一条连续的纸，纹理跨过整个高度。

**不要用能匹配到填充层自己的通配**：1.3.4 用 `[data-rill-chrome] [class*="_header_"]` 统一刷透明，结果把承载填充的那一层也清了。

标记由 `markChrome()` 打，规则是**从槽锚点走到它里面的 `<header>`**：

```js
head = scope.querySelector('header[data-window-drag], [data-conversation-header-leading]');
if (head && head.tagName !== 'HEADER') head = head.closest('header') || null;
if (!head || head.getBoundingClientRect().height > 220) continue;
```

`data-window-drag` 是宿主自己写在 `<header>` 上的（与 `-webkit-app-region` 共用），`data-conversation-header-leading` 是里面那一行的稳定属性，两者都比类名可靠。高度阈值 220 用来排除"装得下整个消息列表"的容器。

触发点：paint 时、MutationObserver 回调里、以及 10×250ms 的定时桥（宿主重渲染会换元素）。回归由 `tools/harness.cjs` 断言守着：最终 CSS 里若出现 `[class*="_header_"]` 或不含 `[data-slot="conversation.header"] > header`，直接失败。

### 3.3 纸纤维（赭笺）

`paperTile(seed, strength)` 在浏览器里用 canvas 现画一张 192×192 的瓦片再转成 data URL，不随包发布图片：

- 三层叠加，没有一层是规则的：260 团 5–18px 的**不规则斑块**（每团由三片错位的圆叠成，所以看不出圆边，棕/白交替）→ 1400 个 1–2px 细杂点 → 220 根 6–32px 的**断纤维**（走一步可能横移一像素，边缘环绕）。第一版用的是「2–4px 间距的通高竖线」，实测读作织布而不是纸，已换掉。
- 三层各有自己的 alpha 增益（斑块 ×2.4 / 杂点 ×4.2 / 纤维 ×4.6），因为不加增益时最粗那层几乎不可见。
- **无缝**：每个图案都以 `[-S, 0, S] × [-S, 0, S]` 九个偏移重复绘制一遍，边缘与对边自然接上。
- **带 alpha**：强度直接进 `rgba()` 的 alpha 通道，所以侧栏不透明度滑块仍然透得过去，纹理不会把滑块效果吃掉。
- **滑块行程**：`strength` 在函数入口先 `× 1.15` 再 `min(1, ·)`，默认值 0.7。按上述增益实测每通道标准差：40% → 1.6、60% → 3.3、70% → 4.2、90% → 5.9（参考图 4.4）。所以默认档几乎正好是参考纸的颗粒，往右还能更旧；再大的倍率会让 0–60% 区间几乎无变化。
- **缓存**：`paperCacheKey = seed + ':' + strength`，滑块不动就不重画（`toDataURL` 不便宜）。
- **承载方式**：写成 `background-image` 而不是注入伪元素——左右栏是 React 渲染的，树里的节点下一次重渲染就没了，背景活得更久。
- **染色**：三层都用暖棕（`rgba(118,86,42,·)` / `rgba(255,250,234,·)` 等），和纸色同族；中性灰只在纸是灰的那些版本里成立，暖纸上会显脏。

### 3.4 "配色不影响字体"是怎么保证的


宿主 alias token 分两类，被分别处理：

- 结构：`bg-base / bg-layer-1 / bg-layer-2 / bg-overlay / border-l1 / border-l2 / brand-primary / button-primary-fill / button-primary-hover / button-info-fill / button-info-hover / interactive-bg-hover / interactive-bg-active / specific-sidebar-fill / specific-sidebar-nav-item-active / specific-input-major / input-solid` → 指向调色板变量。
- 文字：`label-primary / label-secondary / label-tertiary / state-idle-primary / state-idle-secondary` → 指向 `--rill-ink*`。

两边在同一个声明块里分成两段，中间有显式注释。这样不需要在消费端做声明过滤，也不会出现"某个 token 忘了排除"。

例外只有 `parchment`：它声明 `ink`，于是 `--rill-ink*` 变成墨色。这是设计上要的（纸面白字没有对比度），实现上是**同一个变量换源**，没有给任何消费端加特例。

### 3.5 直角

```css
html[data-rill-industrial="on"] *,
html[data-rill-industrial="on"] *::before,
html[data-rill-industrial="on"] *::after { border-radius: 0 !important; }
```

用显式 reset 而不是 `all: unset`：工业风是外壳问题，不该拆掉宿主的布局引擎。副作用是滑杆圆点变成方块——这正是要的效果。

### 3.6 壁纸与扫描线

```
html 背景色 = --rill-bg            （最底层，画布）
body::before  z-index:-2  壁纸     opacity / blur / scale(1.04)
body::after   z-index:-1  扫描线   0° 细线 + 90° 网格
```

两者都是 `position: fixed` 的负 z-index 层，与宿主自己的背景实现完全解耦——不写 `[data-slot] > *` 这类清底规则，所以不会出现"清掉包装层底色导致界面整片变黑"。

`body` 自身的 `background-color` 被设为 `transparent`，`html` 的 `background-color` 才是深蓝。这样壁纸层与深蓝底是叠加关系而非互相覆盖。

### 3.7 毛玻璃对话框

```css
[data-composer-card] {
  background-color: rgba(var(--rill-glass-rgb), var(--rill-glass-alpha));
  backdrop-filter: blur(var(--rill-glass-blur)) saturate(1.4);
}
```

`[role="dialog"|"menu"|"listbox"|"tooltip"]` 复用同一组变量，alpha 加 `0.2` 保证弹层比主卡更实。

**不要**碰 `[data-composer-card]::before/::after`：窗口两侧的括线装饰被 orca-link 一类插件占用，覆盖会打架。

### 3.8 凸起发送键

三层构成"实体键"：

```
1px 内上高光  inset 0 1px 0 rgba(255,255,255,.45)
2px 内下暗边  inset 0 -2px 0 rgba(0,0,0,.26)
落地投影      0 2px 0 var(--rill-accent-edge)  +  0 5px 11px rgba(0,0,0,.45)
静止位移      translateY(-1px)
```

`:active` 时位移 `+1px`、换成 `inset 0 2px 7px rgba(0,0,0,.55)`、落地投影归零——按下时真的压进去。选择器覆盖三条路径（`button[type=submit]`、`conversation.input.right > button`、`[data-rill-key=send]`），宿主换 DOM 结构时至少有一条还在。

## 4. 明暗跟随

优先级：手动 `light`/`dark` > 宿主标记 > OS 偏好。

宿主的深浅标记是 `body[data-ds-dark-theme]`（`html` 上的同名属性也认，另兼容 `class="dark"` 与 `data-theme="dark"`）。若完全没有标记，退化为读 `body` 计算背景色的亮度，最后才用 `matchMedia('(prefers-color-scheme: light)')`。

监听三路：

```
MutationObserver  body + html 的属性变化（auto 模式才重绘）
matchMedia change 系统外观切换（auto 模式才重绘）
storage 事件      多标签页同步
```

全部在 `ctx.effect` 返回的清理函数里释放，并同时 `unpaint()` + 移除样式表。

## 5. 设置持久化

`localStorage["rill-industrial-skin:settings:v1"]`，单键存整对象：

```js
{ theme, mode,
  alphaSide, alphaRight, alphaBottom, alphaHeader,
  glassAlpha, glassBlur,
  wallpaper, wallpaperOpacity, wallpaperBlur, scanlines }
```

`readStore()` 每次 `{...DEFAULTS, ...parsed}` 合并，所以新增字段在老配置上自动取默认值。`writeStore` 包 try/catch：私密模式或配额超限时只丢持久化，不打断实时预览。

壁纸存 data URL，因此限制 2.6 MB（base64 后接近 localStorage 的 5 MB 上限）。超限时给提示而不是静默失败。

## 6. 调色板

新增一套配色只需在 `THEMES` 里加一项：

```js
key: {
  name: '中文名', en: 'English',
  accent: { dark: [r,g,b], light: [r,g,b] },
  dark:  { bg: [r,g,b], side: [...], surf: [...], surf2: [...] },
  light: { bg: [...], side: [...], surf: [...], surf2: [...] },
}
```

再把 key 加进 `THEME_ORDER`，设置页的色块与预览会自动出现。`-raise / -strong / -edge / -soft` 由 accent 计算，不需要手写。

维持可读性的约束：`light` 的 `bg` 亮度控制在 L≈38%–48%。低于这个区间白字对比不足，高于则看起来不像"浅色外观"。

## 7. 排查

| 现象 | 检查 |
|---|---|
| 完全没变化 | `document.documentElement.getAttribute('data-rill-industrial')` 是否为 `on`；`style[data-plugin="dsh-rill-industrial-skin"]` 是否存在 |
| 品牌字标没出现 | `sidebar.brand.mark` 槽是否存在；`data-slot="sidebar.brand.mark"` 元素宽度是否被压到 < 74px（容器查询会隐藏文字，只留鲸鱼） |
| 设置页没有条目 | `settings.section` 是否在 `inject` 里；注册的 `label` 是否为空 |
| 壁纸不显示 | `--rill-wallpaper` 是否为 `none`；`--rill-wallpaper-opacity` 是否为 0；data URL 是否过大被 `writeStore` 丢弃 |
| 深浅不跟随 | `mode` 是否被手动锁成 `light`/`dark`；宿主 `body[data-ds-dark-theme]` 是否存在 |
| 毛玻璃没效果 | 该引擎是否支持 `backdrop-filter`；卡片背后是否真有内容（壁纸被关掉时会看起来像纯色块） |
