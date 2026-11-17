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
| `--rill-glass-rgb` | `surf` 的 `r,g,b` 三元组，供 `rgba()` 拼 alpha |
| `--rill-glass-alpha` / `--rill-glass-blur` | 对话框透明度 / 模糊度 |
| `--rill-wallpaper` / `-opacity` / `-blur` | 壁纸层 |

**文字类**：`--rill-ink`（`#fff`）、`--rill-ink-2`（.72）、`--rill-ink-3`（.46），常量，与调色板无关。

### 3.3 "配色不影响字体"是怎么保证的

宿主 alias token 分两类，被分别处理：

- 结构：`bg-base / bg-layer-1 / bg-layer-2 / bg-overlay / border-l1 / border-l2 / brand-primary / button-primary-fill / button-primary-hover / button-info-fill / button-info-hover / interactive-bg-hover / interactive-bg-active / specific-sidebar-fill / specific-sidebar-nav-item-active / specific-input-major / input-solid` → 指向调色板变量。
- 文字：`label-primary / label-secondary / label-tertiary / state-idle-primary / state-idle-secondary` → 指向 `--rill-ink*`。

两边在同一个声明块里分成两段，中间有显式注释。这样不需要在消费端做声明过滤，也不会出现"某个 token 忘了排除"。

### 3.4 直角

```css
html[data-rill-industrial="on"] *,
html[data-rill-industrial="on"] *::before,
html[data-rill-industrial="on"] *::after { border-radius: 0 !important; }
```

用显式 reset 而不是 `all: unset`：工业风是外壳问题，不该拆掉宿主的布局引擎。副作用是滑杆圆点变成方块——这正是要的效果。

### 3.5 壁纸与扫描线

```
html 背景色 = --rill-bg            （最底层，画布）
body::before  z-index:-2  壁纸     opacity / blur / scale(1.04)
body::after   z-index:-1  扫描线   0° 细线 + 90° 网格
```

两者都是 `position: fixed` 的负 z-index 层，与宿主自己的背景实现完全解耦——不写 `[data-slot] > *` 这类清底规则，所以不会出现"清掉包装层底色导致界面整片变黑"。

`body` 自身的 `background-color` 被设为 `transparent`，`html` 的 `background-color` 才是深蓝。这样壁纸层与深蓝底是叠加关系而非互相覆盖。

### 3.6 毛玻璃对话框

```css
[data-composer-card] {
  background-color: rgba(var(--rill-glass-rgb), var(--rill-glass-alpha));
  backdrop-filter: blur(var(--rill-glass-blur)) saturate(1.4);
}
```

`[role="dialog"|"menu"|"listbox"|"tooltip"]` 复用同一组变量，alpha 加 `0.2` 保证弹层比主卡更实。

**不要**碰 `[data-composer-card]::before/::after`：窗口两侧的括线装饰被 orca-link 一类插件占用，覆盖会打架。

### 3.7 凸起发送键

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
