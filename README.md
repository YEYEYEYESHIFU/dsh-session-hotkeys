# dsh-session-hotkeys

[English](README.en.md) | 简体中文

给 DeepSeek Harness Web 的会话快捷键插件：像切换浏览器标签页一样用键盘管理会话。

## 功能

- **平台自适应双预设**：启动时自动检测 Windows / macOS，各用一套默认键位；用户手动改键覆盖预设，「恢复默认」回到当前平台预设。

| 动作 | Windows 预设 | macOS 预设（Chrome + Safari 安全） |
| --- | --- | --- |
| 顺序切换第 N 个会话 | `Alt+1-9` | `⌃⇧1-9` |
| 固定槽位三态（固定/跳转/取消） | `Alt+Shift+1-9` | `⌃⌥1-9` |
| 跳转固定槽位 | `Ctrl+Alt+1-9` | `⌃⌥⇧1-9` |
| 新建会话 | `Alt+N` | `⌃⌥N` |
| 归档当前会话 | `Alt+Shift+A` | `⌃⌥A` |
| 重命名当前会话 | `Alt+Shift+R` | `⌃⌥R` |
| 导航模式（↑↓ 选择 · Enter 进入 · Esc 取消） | `Alt+\`` | `⌃\`` |
| 打开面板 | `Alt+P` | `⌃⌥P` |
| 聚焦并清空搜索框 | `Alt+Shift+F` | `⌃⇧F` |

macOS 预设的键位选择理由：Chrome 里 `⌘+1-9` 和 `⌃+1-9` **都会**切换标签页（Safari 是 `⌘+1-9`），所以顺序切换改用 `⌃⇧1-9`；`⌥`（Option）是特殊字符键，单独使用会破坏输入框打字，因此从不单独使用；`⌃+N/P/F/B/A/E/K/D` 是 macOS 文本系统的 Emacs 行编辑键；`⌘⇧+3/4/5` 是系统截图。全部组合已在 macOS Chrome 与 Safari 中逐项筛查无冲突。macOS 界面上所有键位都用原生符号显示：⌃ = Control、⌥ = Option、⇧ = Shift、⌘ = Command（Fn 键不会被网页键盘事件报告，故未使用）。

- **`Alt+1-9` / `⌃⇧1-9`**：始终按侧边栏显示顺序切换到第 N 个会话（与固定无关，所见即所得——分组折叠、活动提升后的顺序都自动跟随）。
- **固定槽位**（Windows `Alt+Shift+1-9` / macOS `⌃⌥1-9`）：独立的固定槽位三态键——空槽位固定当前会话；固定着别的会话时跳转过去；固定着当前会话时取消固定。适合"很多频繁交互的会话，一键回到之前的对话"。
- **归档当前会话**：一键把当前会话移入侧边栏归档区（可在归档区找回，不会删除）。
- **重命名当前会话**：弹出输入框（预填当前标题），确认后立即重命名；留空或取消不修改。
- **新建会话**：当前工作区（否则最近工作区）。
- **导航模式**：在**真实侧边栏会话行**上移动高亮环，`↑↓` 选择、`Enter` 进入（等同点击该行）、`Esc` 取消，未按 Enter 不切换会话。高亮环同样能落在折叠组的「展开其余 N 个会话」按钮上：Enter 展开该组，高亮自动移到第一个新出现的会话（内容仍等下一次 Enter 才显示）。
- **聚焦搜索**：聚焦会话搜索框并清空当前内容（侧边栏收起时自动展开）。
- **所有键位可自定义**：面板「按键」页录制式改键，冲突检测、一键恢复平台默认；键位与固定关系都保存在本浏览器（localStorage），刷新/重启 DSH 后依然有效。
- **面板三个 Tab**：「顺序切换键」（如 `Alt+1-9` / `⌃⇧1-9`）顺序列表（可给任意会话选择固定到具体槽位）/「固定槽位键」（如 `Alt+Shift+1-9` / `⌃⌥1-9`）固定槽位管理 /「按键」改键 + 速查说明（每行一句话说明，悬停看完整详情）。Tab 名称跟随当前键位实时变化。
- **干净的生命周期**：卸载时移除全部事件监听、样式与 DOM 节点。

## 安装

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

## 使用

1. `Alt+1-9` 直达侧边栏第 N 个会话；`Alt+Shift+1-9` 固定槽位三态键（macOS 对应 `⌃⇧1-9` / `⌃⌥1-9`）。
2. `Alt+\`` 进入导航模式，`↑↓` 移动高亮环，`Enter` 进入，`Esc` 取消。
3. 点侧边栏底部键盘图标（或 `Alt+P`）打开面板，在「按键」页给任意功能重新录制键位。

## 工作原理

插件是纯浏览器端 Cordis bundle：从 `sessions` 服务读取会话列表与当前会话，`sessions.open()` 执行切换；`workspaces.startSession()` 新建会话；`layout.toggleSidebar()` 在需要时展开侧栏。会话显示顺序**直接读取已渲染的侧边栏 DOM**（行标题映射回会话 id），因此与用户看到的分组/排序/折叠状态完全一致；导航模式的高亮环和提示条直接挂在 `document.body`，不依赖任何插槽渲染链。不新增任何服务端数据通道，不保存任何服务端状态。

## 已知限制

- 会话顺序与搜索框定位依赖 DSH Web 的 DOM 结构（CSS 类名），并带有模糊匹配回退；DSH Web 前端升级后如失效，请升级本插件或提 issue 注明 DSH 版本。
- 键位录制仅支持字母、`` ` ``、F1–F12 与数字（数字类动作）组合。
- 固定槽位与键位按浏览器 origin 存储，换浏览器/清缓存会重置。
- 在 Windows 上，插件会阻止 Alt 键的默认行为，以免 Chrome 把焦点切到浏览器菜单（⋮）吞掉 Alt+数字；代价是 DSH 输入框里 Alt+小键盘的 Alt 码输入（如 `Alt+0167`）不可用。

## 开发

```sh
git clone https://github.com/<你的用户名>/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # 自检：包结构 / 客户端 bundle 可解析且无外部依赖
```

本地试跑：把包 link 进 profile 后重启 DSH Web 即可。

## License

[MIT](LICENSE)
