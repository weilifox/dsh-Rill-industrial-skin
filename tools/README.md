# tools

开发期自检脚本，纯 Node、无依赖，不需要浏览器。

| 脚本 | 作用 |
| --- | --- |
| `node tools/harness.cjs` | 桩测试：模块能否加载、三个槽是否注册（含 `label` / `inject`）、样式标签是否注入、CSS 变量是否写入、卸载后是否清理干净。 |
| `node tools/render-settings.cjs` | 真渲染 SettingsPage（极简 React 替身 + 递归执行函数组件），抓「组件渲染期抛错」这类静态检查发现不了的问题。 |
| `node tools/verify-palettes.cjs` | 逐套配色 × 深浅两档各画一遍，打印真正落到 `<html>` 的颜色值；并断言「没声明 `accent2` 的主题，`accent2` 必须等于 `accent`」——加新配色时用它证明原有配色没被带偏。 |

发布前三个都要跑：第一个保证契约，第二个保证设置页不会白屏，第三个保证配色值没漂。
