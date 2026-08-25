# dsh-session-hotkeys

[![Awesome DSH Plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![npm version](https://img.shields.io/npm/v/dsh-session-hotkeys)](https://www.npmjs.com/package/dsh-session-hotkeys)
[![license](https://img.shields.io/npm/l/dsh-session-hotkeys)](./LICENSE)

Session hotkeys for DeepSeek Harness Web · 给 DeepSeek Harness Web 的会话快捷键插件

Manage sessions from the keyboard the way you switch browser tabs — 像切换浏览器标签页一样用键盘管理会话。

**English | 简体中文** — this README is bilingual, English first and 中文在后。

---

## English

Session hotkeys for DeepSeek Harness Web: manage sessions from the keyboard the way you switch browser tabs.

### Features

- **Platform-aware dual presets**: Windows / macOS are detected at startup and each gets its own default bindings; manual rebinds override the preset and "Reset" restores the current platform preset.

| Action | Windows preset | macOS preset (Chrome + Safari safe) |
| --- | --- | --- |
| Switch to Nth session | `Alt+1-9` | `⌃⇧1-9` |
| Previous session (wraps around) | `Alt+↑` | `⌃⌥↑` |
| Next session (wraps around) | `Alt+↓` | `⌃⌥↓` |
| Pinned slot tri-state (pin/jump/unpin) | `Alt+Shift+1-9` | `⌃⌥1-9` |
| Jump to pinned slot | `Ctrl+Alt+1-9` | `⌃⌥⇧1-9` |
| New session | `Alt+N` | `⌃⌥N` |
| Archive current session | `Alt+Shift+A` | `⌃⌥A` |
| Open archived list | `Alt+Shift+U` | `⌃⌥U` |
| Rename current session | `Alt+Shift+R` | `⌃⌥R` |
| Navigation mode (↑↓ move · Enter enter · Esc cancel) | `Alt+`` | `⌃`` |
| Open panel | `Alt+P` | `⌃⌥P` |
| Focus + clear search box | `Alt+Shift+F` | `⌃⇧F` |
| Focus model selector | `Alt+M` | `⌃⌥M` |
| Focus back to chat input | `Alt+Enter` | `⌃⌥Enter` |
| Send with alternate busy behavior | `Alt+Shift+Enter` | `⌃⌥⇧Enter` |

Why the macOS preset looks this way: in Chrome **both** `⌘+1-9` and `⌃+1-9` switch tabs (Safari: `⌘+1-9`), so positional switching uses `⌃⇧1-9`; `⌥` (Option) is the special-character key and is never used alone (it would break typing); `⌃+N/P/F/B/A/E/K/D` are Emacs line-editing bindings in macOS text fields; `⌃+↑/↓` is Mission Control, so previous/next session uses `⌃⌥↑/↓`; `⌘⇧+3/4/5` are system screenshots; `⌃+Enter` / `⌘+Enter` are the composer's own accelerated send chords, so the Enter-family bindings add `⌥` (`⌃⌥Enter` / `⌃⌥⇧Enter`). Every combo has been screened against macOS Chrome and Safari. On macOS all bindings render with native symbols: ⌃ = Control, ⌥ = Option, ⇧ = Shift, ⌘ = Command (the Fn key is never reported to web key events, so it is not used).

- **`Alt+↑` / `Alt+↓`** (macOS `⌃⌥↑` / `⌃⌥↓`): step to the previous / next session in sidebar display order, wrapping around at both ends.
- **`Alt+1-9` / `⌃⇧1-9`**: always switch to the Nth session by sidebar display order (independent of pins; follows grouping, promotion and collapsed groups — what you see is what you get). Numpad digits work too: `Alt+Numpad1-9` / `⌃⇧Numpad1-9` (NumLock on).
- **Pinned slots** (Windows `Alt+Shift+1-9` / macOS `⌃⌥1-9`): tri-state semantics — empty slot pins the current session; a slot holding another session jumps to it; a slot holding the current session unpins it. Made for power users who keep many hot sessions and want one-key return.
- **Archive current session**: removes the current session from the session list in one key — a confirmation card with the session title appears first (`Enter` confirms, `Esc` cancels), because archiving is hard to undo. Nothing is deleted — the session keeps its log and workspace slot and appears on the panel's "Archived" page (`Alt+Shift+U` / `⌃⌥U`), where you can open it or copy its id. ⚠️ DSH 0.1.1-rc.2 exposes no public unarchive API, so a session cannot be restored from the browser (archiving never deletes session logs).
- **Rename current session**: opens a prompt with the current title pre-filled; confirm to rename immediately, leave empty or cancel to keep it.
- **New session**: in the current workspace, else the most recent one.
- **Navigation mode**: moves a highlight ring over the **real sidebar session rows**; `↑↓` to move, `Enter` to enter (equivalent to clicking the row), `Esc` to cancel. No session switch happens before Enter. The ring also lands on a collapsed group's "Show N more sessions" button: Enter expands the group and moves the highlight to the first newly revealed session (its content still waits for the next Enter).
- **Focus search**: focus the session search box and clear it (auto-expands a collapsed sidebar).
- **Focus model selector**: jump focus to the composer's model selector with a visible highlight ring — press the key again to jump back to the chat input. `Enter` opens the menu and auto-highlights the first entry, `↑↓` move between models (the ring follows focus, and entering a sub-pane — model list or reasoning effort — auto-highlights its first entry too), `Enter` picks, `Esc` closes and returns focus to the trigger (keyboard-only model switching).
- **Focus back to input**: `Alt+Enter` returns focus to the chat textarea from anywhere (including while the model menu is open), moving the caret to the end only when the input was not already focused.
- **Alternate send**: `Alt+Shift+Enter` sends the current draft with the opposite of the busy-Enter preference — queue↔steer while the agent is running, a normal send while idle — without touching the setting itself.
- **Every binding is rebindable**: record a new combination in the panel's "Keys" tab, with conflict detection and one-click reset to the platform preset. A binding must include at least one of Ctrl / Alt / ⌘ (a bare letter or Shift+letter would break typing). Bindings and pins persist in localStorage across refreshes and DSH restarts.
- **Three panel tabs**: the positional list keyed by the switch binding (e.g. `Alt+1-9` / `⌃⇧1-9`, pin any session to a chosen slot) / pin management keyed by the pin binding (e.g. `Alt+Shift+1-9` / `⌃⌥1-9`) / `Keys` — rebinding doubles as the cheat sheet, with a one-line description per action and the full text on hover. Tab names follow the current bindings live.
- **Keyboard navigation**: with the panel open, `↑`/`↓` move the highlight over the rows (the list scrolls automatically), `←`/`→` cycle through the three tabs in a loop, `Esc` closes.
- **Compact, viewport-safe panel**: opens upward from the sidebar button, caps the list at a compact half-height and scrolls internally — it never grows past the window and stays short even on the longest tab.
- **Clean lifecycle**: all event listeners, styles and DOM nodes are removed on unload.
- **Works while typing**: shortcuts fire even while the chat/search input is focused, so switching sessions needs no blur-first step. Plain typing never triggers them (every binding carries Ctrl / Alt / ⌘); on macOS the one exception is `⌃⇧F`, which overrides the text-field "extend selection" Emacs action.

### Install

Add the bundle to your DSH Web profile. From npm:

```sh
dsh plugin --profile web add "dsh-session-hotkeys"
```

Or straight from Git:

```sh
dsh plugin --profile web add "github:<your-user>/dsh-session-hotkeys#main"
```

On older CLI versions without the `dsh plugin` subcommand, register manually:

1. Add `dsh-session-hotkeys` to both `dependencies` and `dsh.profile.bundles` in the profile's `package.json`
2. Run `pnpm install` inside the profile directory
3. Restart DSH

Then start DSH Web:

```sh
dsh --profile web
```

### Uninstall

1. Remove `dsh-session-hotkeys` from both `dependencies` and `dsh.profile.bundles` in the profile's `package.json`
2. Run `pnpm install` inside the profile directory
3. Restart DSH Web

Custom bindings and pins live in browser localStorage under the keys `dsh.session-hotkeys.keys` and `dsh.session-hotkeys.pins`; delete them from the browser devtools for a fully clean removal.

### Usage

1. `Alt+1-9` jumps straight to the Nth sidebar session; `Alt+Shift+1-9` is the pin slot tri-state key (macOS: `⌃⇧1-9` / `⌃⌥1-9`).
2. `Alt+`` enters navigation mode: `↑↓` moves the highlight ring, `Enter` enters, `Esc` cancels.
3. Click the keyboard icon at the sidebar foot (or press `Alt+P`) to open the panel; rebind anything in the "Keys" tab.
4. `Alt+↑` / `Alt+↓` step to the previous / next session and wrap around at the ends (macOS: `⌃⌥↑` / `⌃⌥↓`).
5. `Alt+M` focuses the model selector (press again to return to the input): `Enter` opens the menu, `↑↓` choose, `Enter` pick, `Esc` close.
6. `Alt+Enter` returns focus to the input; `Alt+Shift+Enter` sends the draft with the alternate busy behavior (queue↔steer while running).

### How it works

A browser-only Cordis bundle. It reads the session list and current session from the `sessions` service, switches with `sessions.open()`, creates sessions via `workspaces.startSession()`, and expands the sidebar via `layout.toggleSidebar()` when needed. Session display order is read **directly from the rendered sidebar DOM** (row titles mapped back to session ids), so it always matches the grouping/sorting/collapse state the user sees. The navigation-mode ring and hint are mounted on `document.body`, independent of any slot render chain. No server data channel, no server-side state.

### Compatibility

- Tested with DSH Web shipped by `@deepseek-ai/dsh@0.1.1-rc.2` (npx channel); last verified 2026-08-23.
- Windows (Chrome) and macOS (Chrome + Safari) presets are screened for system/browser conflicts — see the macOS rationale above.
- Session order and search-box targeting depend on DSH Web's DOM class names (fuzzy fallbacks included) — see Known limitations.

### Configuration

No config files: everything is configured from the panel. Bindings and pins are stored per browser origin in localStorage (`dsh.session-hotkeys.keys` / `dsh.session-hotkeys.pins`) and survive refreshes and DSH restarts.

### Permissions & data

Browser-only: no network requests, no server-side state, no credentials. The plugin reads the session list from the rendered sidebar DOM and the `sessions` / `workspaces` / `layout` services, and writes nothing but the two localStorage keys above.

### Troubleshooting

- "Shortcut didn't fire": open the panel (`Alt+P`) and confirm the Keys tab still shows your expected binding; if it does, make sure the sidebar is expanded (session order is read from the rendered rows) and that no other window or extension is grabbing the combo.
- Switching keys do nothing: make sure the sidebar is expanded — display order is read from the rendered rows.
- Lost customizations: clearing browser site data resets bindings and pins.
- Something else broke: open an issue with your DSH version and plugin version.

### Known limitations

- Session order, search-box and model-selector targeting depend on DSH Web's DOM structure (CSS class names / aria attributes), with fuzzy fallbacks. If a DSH Web upgrade breaks them, please upgrade this plugin or open an issue mentioning your DSH version.
- Key recording accepts letters, `` ``, F1–F12, and (for digit actions) digits 1–9 — top row or numpad. Numpad digits need NumLock on: with NumLock off the numpad reports navigation keys (End/Home/arrows) instead of digits.
- Restoring archived sessions is not possible from the browser: DSH 0.1.1-rc.2 has no public unarchive API. The "Archived" page lists archived sessions and lets you copy their ids for a host-side restore; archiving never deletes session logs.
- Pins and bindings are stored per browser origin; clearing site data resets them.
- On Windows the plugin prevents the default Alt-key behavior so Chrome no longer steals focus to the browser menu (⋮) and swallows Alt+digits; the tradeoff is that Alt-code entry on the numpad (e.g. `Alt+0167`) no longer works inside DSH Web input fields.

### Development

```sh
git clone https://github.com/<your-user>/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # self-check: package structure, parseable client bundle, no external imports
```

To test locally, link the package into a profile and restart DSH Web.

### License

[MIT](LICENSE). Security issues: report via GitHub Issues.


---

## 简体中文

给 DeepSeek Harness Web 的会话快捷键插件：像切换浏览器标签页一样用键盘管理会话。

### 功能

- **平台自适应双预设**：启动时自动检测 Windows / macOS，各用一套默认键位；用户手动改键覆盖预设，「恢复默认」回到当前平台预设。

| 动作 | Windows 预设 | macOS 预设（Chrome + Safari 安全） |
| --- | --- | --- |
| 顺序切换第 N 个会话 | `Alt+1-9` | `⌃⇧1-9` |
| 上一个会话（循环） | `Alt+↑` | `⌃⌥↑` |
| 下一个会话（循环） | `Alt+↓` | `⌃⌥↓` |
| 固定槽位三态（固定/跳转/取消） | `Alt+Shift+1-9` | `⌃⌥1-9` |
| 跳转固定槽位 | `Ctrl+Alt+1-9` | `⌃⌥⇧1-9` |
| 新建会话 | `Alt+N` | `⌃⌥N` |
| 归档当前会话 | `Alt+Shift+A` | `⌃⌥A` |
| 打开已归档列表 | `Alt+Shift+U` | `⌃⌥U` |
| 重命名当前会话 | `Alt+Shift+R` | `⌃⌥R` |
| 导航模式（↑↓ 选择 · Enter 进入 · Esc 取消） | `Alt+`` | `⌃`` |
| 打开面板 | `Alt+P` | `⌃⌥P` |
| 聚焦并清空搜索框 | `Alt+Shift+F` | `⌃⇧F` |
| 聚焦模型选择 | `Alt+M` | `⌃⌥M` |
| 聚焦回输入框 | `Alt+Enter` | `⌃⌥Enter` |
| 非默认方式发送 | `Alt+Shift+Enter` | `⌃⌥⇧Enter` |

macOS 预设的键位选择理由：Chrome 里 `⌘+1-9` 和 `⌃+1-9` **都会**切换标签页（Safari 是 `⌘+1-9`），所以顺序切换改用 `⌃⇧1-9`；`⌥`（Option）是特殊字符键，单独使用会破坏输入框打字，因此从不单独使用；`⌃+N/P/F/B/A/E/K/D` 是 macOS 文本系统的 Emacs 行编辑键；`⌃+↑/↓` 是 Mission Control，所以上一个/下一个会话改用 `⌃⌥↑/↓`；`⌘⇧+3/4/5` 是系统截图；`⌃+Enter` / `⌘+Enter` 是输入框自带的加速发送组合，因此 Enter 系列按键另加 `⌥`（`⌃⌥Enter` / `⌃⌥⇧Enter`）。全部组合已在 macOS Chrome 与 Safari 中逐项筛查无冲突。macOS 界面上所有键位都用原生符号显示：⌃ = Control、⌥ = Option、⇧ = Shift、⌘ = Command（Fn 键不会被网页键盘事件报告，故未使用）。

- **`Alt+↑` / `Alt+↓`**（macOS `⌃⌥↑` / `⌃⌥↓`）：在侧边栏显示顺序中切换到上一个 / 下一个会话，两端循环回绕。
- **`Alt+1-9` / `⌃⇧1-9`**：始终按侧边栏显示顺序切换到第 N 个会话（与固定无关，所见即所得——分组折叠、活动提升后的顺序都自动跟随）。小键盘数字同样可用：`Alt+Numpad1-9` / `⌃⇧Numpad1-9`（需开启 NumLock）。
- **固定槽位**（Windows `Alt+Shift+1-9` / macOS `⌃⌥1-9`）：独立的固定槽位三态键——空槽位固定当前会话；固定着别的会话时跳转过去；固定着当前会话时取消固定。适合"很多频繁交互的会话，一键回到之前的对话"。
- **归档当前会话**：一键把当前会话从会话列表移除（不会删除会话）。因为归档难以撤销，按下后先弹出带会话标题的确认卡片：`Enter` 确认、`Esc` 取消。会话保留日志与工作区席位，可在面板「已归档」页查看（`Alt+Shift+U` / `⌃⌥U`）、打开或复制其 ID。⚠️ DSH 0.1.1-rc.2 没有公开的取消归档接口，浏览器端无法恢复会话（归档不会删除会话日志）。
- **重命名当前会话**：弹出输入框（预填当前标题），确认后立即重命名；留空或取消不修改。
- **新建会话**：当前工作区（否则最近工作区）。
- **导航模式**：在**真实侧边栏会话行**上移动高亮环，`↑↓` 选择、`Enter` 进入（等同点击该行）、`Esc` 取消，未按 Enter 不切换会话。高亮环同样能落在折叠组的「展开其余 N 个会话」按钮上：Enter 展开该组，高亮自动移到第一个新出现的会话（内容仍等下一次 Enter 才显示）。
- **聚焦搜索**：聚焦会话搜索框并清空当前内容（侧边栏收起时自动展开）。
- **聚焦模型选择**：把焦点直接移到输入区的模型选择按钮并显示高亮环，再按一次回到聊天输入框——`Enter` 打开菜单并自动高亮第一个选项、`↑↓` 选择（高亮环跟随焦点，进入模型列表或推理等级等子面板后同样自动高亮第一个选项）、`Enter` 确认、`Esc` 关闭并把焦点还给按钮，全程键盘完成换模型。
- **聚焦回输入框**：`Alt+Enter` 从任何地方把焦点拉回聊天输入框（模型菜单打开时同样有效），输入框未聚焦时光标移到文末。
- **非默认方式发送**：`Alt+Shift+Enter` 以与「忙时 Enter 行为」设置相反的方式发送当前草稿——运行中排队↔插话互换、空闲时等同普通发送，不改动设置本身。
- **所有键位可自定义**：面板「按键」页录制式改键，冲突检测、一键恢复平台默认；改键必须包含 Ctrl / Alt / ⌘ 中至少一个修饰键（裸字母或 Shift+字母会破坏打字）。键位与固定关系都保存在本浏览器（localStorage），刷新/重启 DSH 后依然有效。
- **面板三个 Tab**：「顺序切换键」（如 `Alt+1-9` / `⌃⇧1-9`）顺序列表（可给任意会话选择固定到具体槽位）/「固定槽位键」（如 `Alt+Shift+1-9` / `⌃⌥1-9`）固定槽位管理 /「按键」改键 + 速查说明（每行一句话说明，悬停看完整详情）。Tab 名称跟随当前键位实时变化。
- **键盘导航**：面板打开时 `↑`/`↓` 在行间移动高亮（列表自动滚动），`←`/`→` 循环切换三个页签，`Esc` 关闭。
- **紧凑且不越界的面板**：从侧边栏按钮向上展开，列表高度约压缩到原来的一半并在面板内部滚动——无论窗口多矮都不会超出屏幕，内容再多面板也不会变长。
- **干净的生命周期**：卸载时移除全部事件监听、样式与 DOM 节点。
- **输入中可用**：聊天输入框/搜索框聚焦时快捷键依然生效，切换会话无需先退出输入状态。普通打字不会误触发（所有键位都含 Ctrl / Alt / ⌘）；macOS 上唯一例外是 `⌃⇧F`，它会覆盖文本域的「向后扩展选区」Emacs 操作。

### 安装

把本包加入你的 DSH Web profile。从 npm：

```sh
dsh plugin --profile web add "dsh-session-hotkeys"
```

或直接从 Git 源码：

```sh
dsh plugin --profile web add "github:<你的用户名>/dsh-session-hotkeys#main"
```

旧版 CLI 没有 `dsh plugin` 子命令时，手动注册：

1. 在 profile 目录的 `package.json` 中把 `dsh-session-hotkeys` 加进 `dependencies` 与 `dsh.profile.bundles`
2. 在 profile 目录执行 `pnpm install`
3. 重启 DSH

然后启动 DSH Web 即可使用：

```sh
dsh --profile web
```

### 卸载

1. 从 profile 目录的 `package.json` 中移除 `dependencies` 与 `dsh.profile.bundles` 里的 `dsh-session-hotkeys`
2. 在 profile 目录执行 `pnpm install`
3. 重启 DSH Web

自定义键位与固定关系保存在浏览器 localStorage 的 `dsh.session-hotkeys.keys` 与 `dsh.session-hotkeys.pins` 两个键中；如需彻底清除，可在浏览器开发者工具中删除。

### 使用

1. `Alt+1-9` 直达侧边栏第 N 个会话；`Alt+Shift+1-9` 固定槽位三态键（macOS 对应 `⌃⇧1-9` / `⌃⌥1-9`）。
2. `Alt+`` 进入导航模式，`↑↓` 移动高亮环，`Enter` 进入，`Esc` 取消。
3. 点侧边栏底部键盘图标（或 `Alt+P`）打开面板，在「按键」页给任意功能重新录制键位。
4. `Alt+↑` / `Alt+↓` 在会话间循环切换（macOS `⌃⌥↑` / `⌃⌥↓`）。
5. `Alt+M` 聚焦模型选择（再按一次回到输入框）：`Enter` 打开菜单、`↑↓` 选择、`Enter` 确认、`Esc` 关闭。
6. `Alt+Enter` 聚焦回输入框；`Alt+Shift+Enter` 以非默认忙时方式发送草稿（运行中排队↔插话）。

### 工作原理

插件是纯浏览器端 Cordis bundle：从 `sessions` 服务读取会话列表与当前会话，`sessions.open()` 执行切换；`workspaces.startSession()` 新建会话；`layout.toggleSidebar()` 在需要时展开侧栏。会话显示顺序**直接读取已渲染的侧边栏 DOM**（行标题映射回会话 id），因此与用户看到的分组/排序/折叠状态完全一致；导航模式的高亮环和提示条直接挂在 `document.body`，不依赖任何插槽渲染链。不新增任何服务端数据通道，不保存任何服务端状态。

### 兼容性

- 已在 `@deepseek-ai/dsh@0.1.1-rc.2`（npx 渠道）随附的 DSH Web 上测试，最后验证日期 2026-08-23。
- Windows（Chrome）与 macOS（Chrome + Safari）预设已逐项筛查系统/浏览器冲突——见上方 macOS 键位理由。
- 会话顺序与搜索框定位依赖 DSH Web 的 DOM 类名（带模糊匹配回退）——见已知限制。

### 配置

无配置文件：所有设置都在面板内完成。键位与固定关系按浏览器 origin 保存在 localStorage（`dsh.session-hotkeys.keys` / `dsh.session-hotkeys.pins`），刷新与重启 DSH 后依然有效。

### 权限与数据

纯浏览器端：无网络请求、无服务端状态、不触碰凭据。插件只读取已渲染侧边栏 DOM 与 `sessions` / `workspaces` / `layout` 服务，仅写入上述两个 localStorage 键。

### 故障排查

- 「快捷键没反应」：打开面板（`Alt+P`）在「按键」页确认键位仍是预期组合；若键位无误，请确认侧边栏已展开（显示顺序读取自已渲染的行），并排查是否有其它窗口/扩展占用该组合。
- 切换键无效：确认侧边栏处于展开状态——显示顺序读取自已渲染的行。
- 自定义丢失：清除浏览器站点数据会重置键位与固定槽位。
- 其它问题：提交 issue 并附上你的 DSH 版本与插件版本。

### 已知限制

- 会话顺序、搜索框与模型选择按钮的定位依赖 DSH Web 的 DOM 结构（CSS 类名 / aria 属性），并带有模糊匹配回退；DSH Web 前端升级后如失效，请升级本插件或提 issue 注明 DSH 版本。
- 键位录制仅支持字母、`` ``、F1–F12 与数字（数字类动作）组合，主键盘与小键盘数字均可；小键盘数字需开启 NumLock（关闭时小键盘上报的是 End/Home/方向键等导航键，不会映射为数字）。
- 浏览器端无法恢复已归档会话：DSH 0.1.1-rc.2 没有公开的取消归档接口。「已归档」页可列出归档会话并复制其 ID 供宿主端插件或手动恢复；归档不会删除会话日志。
- 固定槽位与键位按浏览器 origin 存储，换浏览器/清缓存会重置。
- 在 Windows 上，插件会阻止 Alt 键的默认行为，以免 Chrome 把焦点切到浏览器菜单（⋮）吞掉 Alt+数字；代价是 DSH 输入框里 Alt+小键盘的 Alt 码输入（如 `Alt+0167`）不可用。

### 开发

```sh
git clone https://github.com/<你的用户名>/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # 自检：包结构 / 客户端 bundle 可解析且无外部依赖
```

本地试跑：把包 link 进 profile 后重启 DSH Web 即可。

### License

[MIT](LICENSE)。安全问题：请通过 GitHub Issues 反馈。

