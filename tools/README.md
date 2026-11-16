# tools

开发期自检脚本，纯 Node、无依赖，不需要浏览器。

| 脚本 | 作用 |
| --- | --- |
| `node tools/harness.cjs` | 桩测试：模块能否加载、三个槽是否注册（含 `label` / `inject`）、样式标签是否注入、CSS 变量是否写入、卸载后是否清理干净。 |
| `node tools/render-settings.cjs` | 真渲染 SettingsPage（极简 React 替身 + 递归执行函数组件），抓「组件渲染期抛错」这类静态检查发现不了的问题。 |

发布前两个都要跑：前者保证契约，后者保证设置页不会白屏。
