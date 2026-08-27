# dsh-session-hotkeys

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![npm version](https://img.shields.io/npm/v/dsh-session-hotkeys)](https://www.npmjs.com/package/dsh-session-hotkeys)
[![license](https://img.shields.io/npm/l/dsh-session-hotkeys)](./LICENSE)

Session hotkeys for DeepSeek Harness Web · 给 DeepSeek Harness Web 的会话快捷键插件

Switch sessions from the keyboard the way you switch browser tabs.
像切换浏览器标签页一样用键盘管理会话。

---

## Install

```sh
dsh plugin --profile web add "dsh-session-hotkeys"
```

Then restart DSH Web. 然后重启 DSH Web 即可。

> [English](#english) · [简体中文](#简体中文)

## English

### Why

- **Alt+1-9 jumps straight to the Nth session**, `Alt+↑/↓` cycles through them — no mouse needed.
- **Everything is rebindable** from the panel, with Windows / macOS presets that are screened against browser & system shortcuts.
- **Works while you're typing** in the chat input — no blur-first step. Plain typing never triggers anything.
- **Pure browser plugin**: no network requests, no server-side state, nothing collected.

### Keybindings

Defaults shown; rebind any of them in the panel (`Alt+P` → Keys tab).

| Action | Windows | macOS |
| --- | --- | --- |
| Switch to Nth session | `Alt+1-9` | `⌃⇧1-9` |
| Previous / next session | `Alt+↑` / `Alt+↓` | `⌃⌥↑` / `⌃⌥↓` |
| Pin slot (pin / jump / unpin) | `Alt+Shift+1-9` | `⌃⌥1-9` |
| Jump to pinned slot | `Ctrl+Alt+1-9` | `⌃⌥⇧1-9` |
| New session | `Alt+N` | `⌃⌥N` |
| Archive current session | `Alt+Shift+A` | `⌃⌥A` |
| Open archived list | `Alt+Shift+U` | `⌃⌥U` |
| Rename current session | `Alt+Shift+R` | `⌃⌥R` |
| Navigation mode (`↑↓` select · `Enter` open · `Esc` cancel) | `` Alt+` `` | `` ⌃` `` |
| Open panel | `Alt+P` | `⌃⌥P` |
| Focus search box | `Alt+Shift+F` | `⌃⇧F` |
| Focus model selector | `Alt+M` | `⌃⌥M` |
| Focus back to chat input | `Alt+Enter` | `⌃⌥Enter` |
| Send with alternate busy behavior | `Alt+Shift+Enter` | `⌃⌥⇧Enter` |

### Notes

- **Archiving** asks for confirmation first and never deletes anything — archived sessions stay listed in the panel's Archived page. (DSH 0.1.1-rc.2 has no public unarchive API, so restoring is host-side.)
- Bindings and pins are saved in browser localStorage and survive restarts. Clearing site data resets them.
- The sidebar must be expanded: session order is read from the rendered rows.

<details>
<summary><b>Why the macOS preset looks like this</b></summary>

Chrome maps both `⌘+1-9` and `⌃+1-9` to tab switching (Safari: `⌘+1-9`), so positional switching uses `⌃⇧1-9`. `⌥` alone would type special characters, so it is never used by itself. `⌃+↑/↓` is Mission Control and `⌃+N/P/F/B/A/E/K/D` are Emacs line-editing keys in text fields, hence the `⌥` additions elsewhere. `⌃/⌘+Enter` are the composer's own send chords, so the Enter-family adds `⌥`. All combos were screened against macOS Chrome and Safari. On macOS all bindings render with native symbols (⌃ ⌥ ⇧ ⌘).

</details>

<details>
<summary><b>Compatibility & known limitations</b></summary>

- Tested with DSH Web from `@deepseek-ai/dsh@0.1.1-rc.2` (last verified 2026-08-23).
- Session order / search-box / model-selector targeting depend on DSH Web DOM class names (fuzzy fallbacks included); an upgrade may require updating this plugin.
- On Windows, Alt-key default behavior is suppressed inside DSH Web so Chrome doesn't swallow `Alt+digits`; the tradeoff is numpad Alt-code entry (e.g. `Alt+0167`) doesn't work in input fields.
- Key recording accepts letters, `` ` `` (backtick), F1–F12, and digits 1–9 (top row or numpad; NumLock required for numpad).

</details>

<details>
<summary><b>Older CLI without <code>dsh plugin</code></b></summary>

1. Add `dsh-session-hotkeys` to both `dependencies` and `dsh.profile.bundles` in the profile's `package.json`
2. Run `pnpm install` inside the profile directory
3. Restart DSH

Uninstall removes it from those two fields; bindings can be wiped via browser devtools localStorage keys `dsh.session-hotkeys.keys` / `dsh.session-hotkeys.pins`.

</details>

<details>
<summary><b>Development</b></summary>

```sh
git clone https://github.com/YEYEYEYESHIFU/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # self-check: package structure, parseable client bundle, no external imports
```

A browser-only Cordis bundle: reads sessions from the `sessions` service and switches with `sessions.open()`; display order comes directly from the rendered sidebar DOM so it always matches grouping/sorting/collapse state.

MIT licensed. Security issues: report via GitHub Issues.

</details>

---

## 简体中文

### 为什么值得装

- **Alt+1-9 直达第 N 个会话**，Alt+↑/↓ 循环切换——全程不用鼠标。
- **所有键位都能改**，面板里录制式改键；Windows / macOS 双预设已逐项筛查系统与浏览器冲突。
- **输入框聚焦时也能用**，切会话不用先退出打字状态；普通打字永远不会误触发。
- **纯浏览器插件**：无网络请求、无服务端状态、不收集任何数据。

### 键位表

以下为默认键位，均可在面板（Alt+P → 按键页）重新录制。

| 动作 | Windows | macOS |
| --- | --- | --- |
| 切换到第 N 个会话 | `Alt+1-9` | `⌃⇧1-9` |
| 上一个 / 下一个会话 | `Alt+↑` / `Alt+↓` | `⌃⌥↑` / `⌃⌥↓` |
| 固定槽位三态（固定/跳转/取消） | `Alt+Shift+1-9` | `⌃⌥1-9` |
| 跳转固定槽位 | `Ctrl+Alt+1-9` | `⌃⌥⇧1-9` |
| 新建会话 | `Alt+N` | `⌃⌥N` |
| 归档当前会话 | `Alt+Shift+A` | `⌃⌥A` |
| 打开已归档列表 | `Alt+Shift+U` | `⌃⌥U` |
| 重命名当前会话 | `Alt+Shift+R` | `⌃⌥R` |
| 导航模式（↑↓ 选择 · Enter 进入 · Esc 取消） | `` Alt+` `` | `` ⌃` `` |
| 打开面板 | `Alt+P` | `⌃⌥P` |
| 聚焦并清空搜索框 | `Alt+Shift+F` | `⌃⇧F` |
| 聚焦模型选择 | `Alt+M` | `⌃⌥M` |
| 聚焦回聊天输入框 | `Alt+Enter` | `⌃⌥Enter` |
| 非默认忙时方式发送 | `Alt+Shift+Enter` | `⌃⌥⇧Enter` |

### 说明

- **归档**有确认卡片且从不删除数据——归档的会话仍在面板「已归档」页可查。（DSH 0.1.1-rc.2 无公开取消归档接口，恢复需宿主端操作。）
- 键位与固定关系存于浏览器 localStorage，重启后依然有效；清除站点数据会重置。
- 切换依赖侧边栏展开状态：显示顺序直接读取已渲染的侧边栏行。

<details>
<summary><b>macOS 预设为什么长这样</b></summary>

Chrome 里 ⌘+1-9 和 ⌃+1-9 都会切换标签页（Safari 只有 ⌘），所以顺序切换用 ⌃⇧1-9。⌥ 单独按会打出特殊字符，因此从不当主修饰键。⌃+↑/↓ 是调度中心，⌃+N/P/F/B/A/E/K/D 是文本框的 Emacs 行编辑键，故相关组合都补了 ⌥。⌃/⌘+Enter 是输入框自带的发送快捷键，Enter 系列因此加 ⌥。全部组合已在 macOS Chrome 与 Safari 中逐项筛查无冲突。macOS 上键位一律用原生符号显示（⌃ ⌥ ⇧ ⌘）。

</details>

<details>
<summary><b>兼容性与已知限制</b></summary>

- 已在 `@deepseek-ai/dsh@0.1.1-rc.2` 随附的 DSH Web 上测试（最后验证 2026-08-23）。
- 会话顺序 / 搜索框 / 模型选择按钮的定位依赖 DSH Web 的 DOM 类名（带模糊匹配回退）；DSH 升级后可能需要同步更新本插件。
- Windows 上插件在 DSH Web 内屏蔽了 Alt 默认行为以免 Chrome 吞掉 Alt+数字；代价是输入框内小键盘 Alt 码（如 `Alt+0167`）不可用。
- 改键支持字母、``、F1–F12 与数字 1–9（主键盘 / 小键盘均可；小键盘需开 NumLock）。

</details>

<details>
<summary><b>旧版 CLI 没有 dsh plugin 子命令时</b></summary>

1. 在 profile 目录的 `package.json` 里把 `dsh-session-hotkeys` 加进 `dependencies` 与 `dsh.profile.bundles`
2. 在该目录执行 `pnpm install`
3. 重启 DSH

卸载即从这两个字段移除；如需彻底清掉自定义键位，可在浏览器开发者工具删除 localStorage 的 `dsh.session-hotkeys.keys` / `dsh.session-hotkeys.pins`。

</details>

<details>
<summary><b>开发</b></summary>

```sh
git clone https://github.com/YEYEYEYESHIFU/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # 自检：包结构 / 客户端 bundle 可解析且无外部依赖
```

纯浏览器端 Cordis bundle：从 `sessions` 服务读取并切换会话；显示顺序直接读取已渲染的侧边栏 DOM，所见即所得。

MIT 开源。安全问题请通过 GitHub Issues 反馈。

</details>
