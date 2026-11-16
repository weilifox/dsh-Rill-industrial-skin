# 变更记录

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
