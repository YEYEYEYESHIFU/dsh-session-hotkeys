// dsh-session-hotkeys — browser half (module-loader bundle)
//
// Session hotkeys for DeepSeek Harness Web. Default bindings (Windows / macOS):
//   Alt+1..9 / ⌃⇧1..9        switch to the Nth session by sidebar display order
//   Alt+↑↓ / ⌃⌥↑↓             previous / next session in sidebar order (wraps around)
//   Alt+Shift+1..9 / ⌃⌥1..9  pinned-slot tri-state: empty→pin current / holds other→jump / holds current→unpin
//   Ctrl+Alt+1..9 / ⌃⌥⇧1..9  jump to pinned slot N without changing pins (AltGr-safe)
//   Alt+N / ⌃⌥N              new session (current workspace, else most recent)
//   Alt+Shift+A / ⌃⌥A        archive the current session
//   Alt+Shift+U / ⌃⌥U        open the panel on the “Archived” page (list archived sessions, copy id)
//   Alt+Shift+R / ⌃⌥R        rename the current session (prompt, current title pre-filled)
//   Alt+` / ⌃`               nav mode: ↑↓ moves the highlight ring over real sidebar rows, Enter enters, Esc cancels
//   Alt+P / ⌃⌥P              open/close this panel (sidebar keyboard icon)
//   Alt+B / ⌃⌥B              collapse / expand the left conversation sidebar
//   Alt+Shift+F / ⌃⇧F        focus the session search box and clear it
//   Alt+M / ⌃⌥M              focus the composer's model selector (Enter opens, ↑↓ move, Enter pick, Esc close)
//   Alt+Enter / ⌃⌥Enter        focus back to the chat input (caret to end when it was not focused)
//   Alt+Shift+Enter / ⌃⌥⇧Enter  send the draft with the alternate busy behavior (queue↔steer while running)
//   Esc                      toggle chat focus: hand focus to the transcript from anywhere (closing
//                              the panel / nav / model menu on the way), press again to return to
//                              where you were; in the input, popups and IME keep their own Esc
// Modifier labels render natively per platform: ⌃ Control · ⌥ Option · ⇧ Shift ·
// ⌘ Command on macOS, spelled-out names on Windows.
// Every binding is rebindable from the panel's “Keys” tab (stored in localStorage).
//
// NOTE: session display order is read from the rendered sidebar DOM so it always
// matches what the user sees (grouping, promotion, collapsed groups). Selectors
// have fuzzy fallbacks, but DSH Web DOM changes may require updating them.

window.__ModuleLoader__.load({
  id: "dsh-session-hotkeys",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    let React = require("react");
    if (React === null || typeof React !== "object") throw new Error("dsh-session-hotkeys: react is unavailable");
    if (React.useState === undefined && React.default !== undefined && typeof React.default === "object") React = React.default;

    const SLOT_COUNT = 9;
    const PINS_KEY = "dsh.session-hotkeys.pins";
    const KEYS_KEY = "dsh.session-hotkeys.keys";
    const INPUT_SELECTORS = ['input.qDHVXG_searchInput', 'input[class*="_searchInput"]'];
    const BUTTON_SELECTORS = ['button.qDHVXG_searchButton', 'button[class*="_searchButton"]'];
    // The composer's model-selector trigger: a button with aria-haspopup="menu",
    // the hashed "_trigger" CSS-module class (unique in DSH Web), a localized
    // "Select model…" aria-label, plus title and aria-expanded attributes. The
    // other aria-haspopup=menu buttons (locale, agent-preset, enter-behavior)
    // carry no title/aria-label, so the validator below never lands on them.
    const MODEL_TRIGGER_SELECTORS = [
      'button[aria-haspopup="menu"][class*="_trigger"]',
      'button[aria-haspopup="menu"][aria-label^="Select model"]',
      'button[aria-haspopup="menu"][aria-label^="选择模型"]'
    ];
    // The composer's chat textarea: the only textarea carrying data-phase, and
    // always inside the data-composer-card wrapper (the feedback / question
    // modals' textareas carry neither).
    const COMPOSER_INPUT_SELECTORS = [
      'textarea[data-phase]',
      '[data-composer-card] textarea',
      '[data-input-scroll] textarea'
    ];
    const ROW_SELECTORS = ['div[class*="_sessionRow"]', 'div[role="treeitem"]'];
    // Nav mode targets: session rows plus the "show N more sessions" overflow buttons.
    const NAV_SELECTOR = 'div[class*="_sessionRow"], button[class*="_sessionOverflowButton"]';
    // The chat transcript scroller (dsh-client-ui-conversation): the element
    // carrying data-conversation-scroll wraps the session content AND the
    // composer seat, so focusing it hands ↑↓ / PgUp / PgDn to the transcript.
    const CHAT_SCROLLER_SELECTORS = ['[data-conversation-scroll]'];
    // Composer suggestion popup (slash commands / @mentions): rendered as a
    // role="listbox" inside the composer card while open — Esc belongs to it.
    const COMPOSER_POPUP_SELECTOR = '[data-composer-card] [role="listbox"]';

    const WIN_DEFAULTS = {
      switchDigit: { ctrl: false, alt: true, shift: false, meta: false, digit: true, code: null },
      pinToggle: { ctrl: false, alt: true, shift: true, meta: false, digit: true, code: null },
      jumpPin: { ctrl: true, alt: true, shift: false, meta: false, digit: true, code: null },
      prevSession: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "ArrowUp" },
      nextSession: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "ArrowDown" },
      newSession: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "KeyN" },
      archiveSession: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "KeyA" },
      archiveList: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "KeyU" },
      renameSession: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "KeyR" },
      navMode: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "Backquote" },
      panel: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "KeyP" },
      toggleSidebar: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "KeyB" },
      searchFocus: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "KeyF" },
      focusModel: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "KeyM" },
      inputFocus: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "Enter" },
      inputBlur: { ctrl: false, alt: false, shift: false, meta: false, digit: false, code: "Escape" },
      sendAlternate: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "Enter" }
    };
    // macOS preset: conflict-free in both Chrome and Safari on macOS.
    //   ⌘+1-9 (Cmd)  — tab switching in Chrome AND Safari
    //   ⌃+1-9 (Ctrl) — ALSO tab switching in Chrome (Chromium registers both)
    //   ⌥+1-9 (Option) — types special characters (¡ ™ £ ¢ …) in text fields
    //   ⌃+N/P/F/B/A/E/K/D — Emacs line-editing bindings in macOS text fields
    //   ⌘⇧+3/4/5 — system screenshots
    // The only modifier-free binding is Esc: no browser-level conflict in
    // Chrome or Safari (Esc exits fullscreen only while fullscreen), the
    // IME-cancel Esc is untouched (isComposing / keyCode 229 guards), and
    // ⌘Esc or ⌃Esc never match (the modifier state must be exactly bare).
    // So positional switching uses ⌃⇧1-9, the pin slot tri-state takes ⌃⌥1-9 and
    // pure pin jump takes ⌃⌥⇧1-9; letters follow the ⌃⌥ pattern (⌥ alone is a
    // special-character key, so it is never used without ⌃).
    const MAC_DEFAULTS = {
      switchDigit: { ctrl: true, alt: false, shift: true, meta: false, digit: true, code: null },
      pinToggle: { ctrl: true, alt: true, shift: false, meta: false, digit: true, code: null },
      jumpPin: { ctrl: true, alt: true, shift: true, meta: false, digit: true, code: null },
      prevSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "ArrowUp" },
      nextSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "ArrowDown" },
      newSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyN" },
      archiveSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyA" },
      archiveList: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyU" },
      renameSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyR" },
      navMode: { ctrl: true, alt: false, shift: false, meta: false, digit: false, code: "Backquote" },
      panel: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyP" },
      toggleSidebar: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyB" },
      searchFocus: { ctrl: true, alt: false, shift: true, meta: false, digit: false, code: "KeyF" },
      focusModel: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyM" },
      inputFocus: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "Enter" },
      inputBlur: { ctrl: false, alt: false, shift: false, meta: false, digit: false, code: "Escape" },
      sendAlternate: { ctrl: true, alt: true, shift: true, meta: false, digit: false, code: "Enter" }
    };
    const detectMac = () => {
      try {
        if (window.navigator.userAgentData !== undefined && window.navigator.userAgentData.platform === "macOS") return true;
      } catch {}
      try { return /Macintosh|Mac OS X/i.test(window.navigator.userAgent); } catch {}
      return false;
    };
    const IS_MAC = detectMac();
    const PLATFORM_DEFAULTS = IS_MAC ? MAC_DEFAULTS : WIN_DEFAULTS;
    const PLATFORM_NAME = IS_MAC ? "macOS" : "Windows";
    // PageUp/PageDown are fn+↑/fn+↓ on compact Mac keyboards — say so.
    const CHAT_SCROLL_KEYS = IS_MAC ? "↑↓ / PgUp / PgDn (fn+↑↓)" : "↑↓ / PgUp / PgDn";
    const DIGIT_ACTIONS = ["switchDigit", "pinToggle", "jumpPin"];
    // ---------- i18n ----------
    // All UI strings live here, keyed by DSH locale id ("zh" / "en"). The active
    // language follows the DSH locale preference (ctx.get("locale")); the
    // browser language only acts as a fallback when the locale service is
    // absent. {name} placeholders are filled by t(key, vars).
    const I18N = {
      zh: {
        "appTitle": "会话快捷键",
        "overlayLabel": "会话快捷键浮层",
        "footerTitle": "会话快捷键面板（键位可在面板「按键」页自定义）",
        "sec.secCommon": "常用",
        "sec.secSearchArchive": "搜索与会话操作",
        "sec.secPins": "固定槽位",
        "label.navMode": "导航模式",
        "label.switchDigit": "顺序切换第 N 个会话",
        "label.prevSession": "上一个会话",
        "label.nextSession": "下一个会话",
        "label.pinToggle": "固定槽位（三态）",
        "label.jumpPin": "跳转固定槽位",
        "label.newSession": "新建会话",
        "label.archiveSession": "归档当前会话",
        "label.archiveList": "打开已归档列表",
        "label.renameSession": "重命名当前会话",
        "label.panel": "打开面板",
        "label.toggleSidebar": "折叠 / 展开会话栏",
        "label.searchFocus": "聚焦搜索",
        "label.focusModel": "聚焦模型选择",
        "label.inputFocus": "聚焦输入框",
        "label.inputBlur": "退焦输入框 · 回到聊天区",
        "label.sendAlternate": "非默认方式发送",
        "desc.navMode": "导航模式：↑↓ 选择 · Enter 进入",
        "desc.switchDigit": "按显示顺序切换第 N 个会话",
        "desc.prevSession": "切换到显示顺序中的上一个会话",
        "desc.nextSession": "切换到显示顺序中的下一个会话",
        "desc.newSession": "新建会话",
        "desc.panel": "打开 / 关闭本面板",
        "desc.toggleSidebar": "折叠或展开左侧会话栏",
        "desc.searchFocus": "聚焦并清空搜索框",
        "desc.focusModel": "聚焦模型选择（再按一次回到输入框）",
        "desc.inputFocus": "把焦点移回聊天输入框",
        "desc.inputBlur": "Esc 聚焦聊天区；再按一次还原原焦点",
        "desc.sendAlternate": "以与「忙时 Enter 行为」相反的方式发送当前消息",
        "desc.archiveSession": "归档当前会话（先弹确认卡片，可在「已归档」页查看）",
        "desc.archiveList": "打开「已归档」会话列表页",
        "desc.renameSession": "重命名当前会话",
        "desc.pinToggle": "槽位三态：固定 / 跳转 / 取消",
        "desc.jumpPin": "纯跳转到固定槽位",
        "full.navMode": "进入会话导航模式：↑↓ 在会话行上移动高亮，Enter 进入（等同点击该行），Esc 或其它按键退出；高亮也能落在「展开其余会话」按钮上，Enter 展开并跳到第一个新会话",
        "full.switchDigit": "始终按侧边栏显示顺序切换第 N 个会话（与固定无关）",
        "full.prevSession": "在侧边栏显示顺序中循环切换：到列表最顶部时回绕到最后一个会话",
        "full.nextSession": "在侧边栏显示顺序中循环切换：到列表最底部时回绕到第一个会话",
        "full.newSession": "在当前工作区（否则最近工作区）新建会话",
        "full.panel": "打开或关闭本快捷键面板",
        "full.toggleSidebar": "折叠（收起）或展开左侧的会话侧边栏，等价于点击侧边栏的收起/展开按钮；窄屏视口下由布局服务切换窄屏展开态",
        "full.searchFocus": "聚焦会话搜索框并清空当前搜索内容",
        "full.focusModel": "把焦点移到输入区的模型选择按钮并显示高亮环：Enter 打开模型菜单并自动高亮第一个选项，↑↓ 在选项间移动（高亮环跟随焦点，模型列表与推理等级等子面板切换后同样自动高亮第一个选项），Enter 确认，Esc 关闭（焦点回到按钮）；按钮聚焦或菜单打开时再按一次回到聊天输入框",
        "full.inputFocus": "从任何地方把焦点移回聊天输入框（模型菜单打开时同样生效）；输入框未聚焦时把光标移到文末，已聚焦时不移动光标",
        "full.inputBlur": "按 Esc（默认）总是把键盘焦点交还给聊天内容滚动区（首次自动加 tabindex=-1 使其可聚焦，并抑制其焦点外框），↑↓ / PgUp / PgDn / Home / End 随即原生滚动会话内容；途中顺带取消当前临时状态：快捷键面板关闭、导航模式退出、模型菜单关闭（焦点不再弹回触发按钮）、改键录制照旧取消。聊天输入框聚焦时，斜杠命令弹层与 IME 组合仍拥有 Esc；草稿与光标永远不动。焦点停在聊天区时再按一次即还原 Esc 前的焦点——模型选择（含高亮环）、输入框（光标原位）等。可换绑（按 Esc 本身会取消录制——用「恢复默认」找回）",
        "full.sendAlternate": "把输入框中的当前消息按与「忙时 Enter 行为」设置相反的方式发送：设置排队时用插话、设置插话时用排队（仅运行中生效）；空闲时与普通发送相同。等价于在输入框内按 Ctrl/Cmd+Enter（草稿非空时）。空草稿会被拒绝，不会误触排队插话。",
        "full.archiveSession": "把当前会话从会话列表移除（不会删除会话）。先弹出确认卡片显示会话标题：Enter 确认归档，Esc 取消。归档后会话仍保留日志与工作区席位，可在面板「已归档」页查看、打开或复制其 ID。",
        "full.archiveList": "打开面板并切到「已归档」页：列出已归档会话，可打开查看或复制其 ID。⚠️ DSH 0.1.1-rc.2 没有公开的取消归档接口，浏览器端无法恢复会话，但归档不会删除会话日志。",
        "full.renameSession": "弹出输入框重命名当前会话（空标题或取消则不修改）",
        "full.pinToggle": "固定槽位三态键：空槽位→固定当前会话；固定着别的会话→跳转过去；固定着当前会话→取消固定",
        "full.jumpPin": "直接跳转到固定槽位 N，不改变任何固定（Windows 上 AltGr 除外）",
        "svcSessionsUnavailable": "会话服务不可用",
        "svcWorkspacesUnavailable": "工作区服务不可用",
        "toggleSidebarFail": "无法切换会话栏（布局服务未就绪）",
        "posEmpty": "第 {n} 个位置没有会话",
        "alreadyAt": "已在会话 {n} · {title}",
        "switchedTo": "已切换到会话 {n} · {title}",
        "switchedPrev": "已切换到上一个会话 · {title}",
        "switchedNext": "已切换到下一个会话 · {title}",
        "noSessions": "没有可切换的会话",
        "pinSlotEmpty": "固定槽位 {n} 为空",
        "switchedToPin": "已切换到固定槽位 {n} · {title}",
        "pinCleared": "已取消固定槽位 {n}",
        "pinnedTo": "已固定槽位 {n} ← {title}",
        "noCurrentToPin": "当前没有打开的会话，无法固定",
        "pinClearedGone": "固定槽位 {n} 已清空（原会话已不存在）",
        "newSessionOk": "新建会话",
        "newSessionFail": "新建会话失败",
        "noCurrentSession": "当前没有打开的会话",
        "archived": "已归档会话 · {title}",
        "archiveFail": "归档失败",
        "archivedTitle": "已归档会话",
        "archivedEmpty": "没有已归档会话",
        "archivedCount": "{n} 个已归档会话",
        "archivedOpenTitle": "打开该会话（仍保持已归档状态）",
        "btnCopyId": "复制 ID",
        "copiedId": "已复制会话 ID · {id}",
        "copyFailed": "复制失败",
        "archivedNoRestore": "⚠️ DSH 0.1.1-rc.2 没有公开的取消归档接口：浏览器端无法恢复会话。复制会话 ID 可配合宿主端插件或手动恢复；归档不会删除会话日志。",
        "confirmArchiveTitle": "归档会话",
        "confirmArchiveBody": "归档不会删除日志，但浏览器端无法恢复会话。",
        "confirmHint": "Enter 确认 · Esc 取消 · ←→ 切换",
        "btnConfirmArchive": "归档",
        "renamePromptTitle": "重命名会话",
        "renamedTo": "已重命名为 · {title}",
        "renameFailed": "重命名失败",
        "renameUnavailable": "重命名接口不可用",
        "renameEmpty": "标题不能为空，未修改",
        "renameUnchanged": "标题没有变化，未修改",
        "modelFocusOk": "已聚焦模型选择 · Enter 打开菜单",
        "modelFocusBack": "已回到输入框",
        "modelFocusNone": "未找到模型选择按钮（请先打开一个会话）",
        "modelFocusBackNone": "未找到聊天输入框",
        "modelFocusLocked": "模型选择按钮当前不可用",
        "chatFocusOk": "已聚焦聊天区 · {keys} 滚动",
        "chatFocusNone": "未找到聊天滚动区",
        "chatFocusBack": "焦点已还原",
        "sendAlternateOk": "已发送（忙时非默认方式）",
        "sendAlternateEmpty": "输入框为空，没有可发送的内容",
        "sendAlternateComposing": "正在输入中文（IME 组合中），未发送",
        "navExited": "已退出导航模式",
        "navLocating": "导航模式：定位会话行…",
        "navStarted": "导航模式 · {n} 个目标 · ↑↓ 移动，Enter 进入",
        "navNoRows": "没有找到可导航的会话行（请展开侧边栏后重试）",
        "navExpanded": "已展开 · 高亮已移到首个新会话，按 Enter 进入",
        "navCollapsed": "已收起该组",
        "navUpdateFail": "会话列表更新失败",
        "navRowGone": "目标行已不存在",
        "navRowAny": "所选行",
        "navEntered": "进入会话 · {name}",
        "navHint": "↑↓ 选择 · Enter 进入/展开 · Esc 取消",
        "recPrompt": "请按下新组合键（Esc 取消）…",
        "recCanceled": "已取消改键",
        "resetDone": "已恢复 {platform} 默认键位",
        "recUnsupported": "不支持：请用 字母 / {which} 组合",
        "recUnsupportedDigit": "数字 1-9",
        "recUnsupportedKey": "F1-F12 / ` / Enter",
        "recNeedModifier": "需要组合键：至少包含 Ctrl / Alt / ⌘ 之一",
        "recConflict": "与「{label}」冲突，请换一个组合",
        "recSaved": "已保存：{label} → {spec}",
        "keysTab": "按键",
        "navKeysHint": "↑↓ 移动 · ←→ 切换页签",
        "recordingInRow": "正在录制：请按新组合键（Esc 取消）…",
        "btnCancel": "取消",
        "btnRebind": "改键",
        "btnRebindTitle": "录制新组合键",
        "btnCancelRecTitle": "点击取消录制",
        "resetTip": "当前平台预设：{platform}。键位与固定关系都保存在本浏览器。悬停每行可看完整说明。",
        "macModLegend": "⌃ = Control · ⌥ = Option · ⇧ = Shift · ⌘ = Command",
        "btnReset": "恢复默认",
        "btnResetTitle": "恢复默认键位",
        "posRowEmptyTitle": "该位置暂无会话",
        "posRowTitle": "按显示顺序第 {n} 个 · 点击切换",
        "pinSetTitle": "已固定在槽位 {n} · 点击改槽位",
        "pinChooseTitle": "固定到 1-9 的某个固定槽位",
        "pinBtn": "固定",
        "pinnedBtn": "已固定{n}",
        "pickTakenTitle": "槽位 {n} 已占用（点击替换）",
        "pickFreeTitle": "固定到槽位 {n}",
        "pinRowEmptyTitle": "空槽位（固定当前会话）",
        "pinRowTitle": "固定槽位 {n} · 点击切换",
        "unpinTitle": "取消固定",
        "unpinBtn": "清除",
        "posHint": "{switch} 始终按显示顺序切换 ·「固定」把该会话放入独立固定槽位",
        "pinHint": "{toggle}：空→固定当前 / 指着别的→跳转 / 指着当前→取消 · {jump} 纯跳转",
        "currentLabel": "当前：{title}"
      },
      en: {
        "appTitle": "Session Hotkeys",
        "overlayLabel": "Session hotkeys overlay",
        "footerTitle": "Session hotkeys panel (rebind keys in the 'Keys' tab)",
        "sec.secCommon": "Everyday",
        "sec.secSearchArchive": "Search & Session Actions",
        "sec.secPins": "Pin Slots",
        "label.navMode": "Navigation mode",
        "label.switchDigit": "Switch to Nth session",
        "label.prevSession": "Previous session",
        "label.nextSession": "Next session",
        "label.pinToggle": "Pin slot (tri-state)",
        "label.jumpPin": "Jump to pin slot",
        "label.newSession": "New session",
        "label.archiveSession": "Archive current session",
        "label.archiveList": "Open archived list",
        "label.renameSession": "Rename current session",
        "label.panel": "Open panel",
        "label.toggleSidebar": "Collapse / expand sidebar",
        "label.searchFocus": "Focus search",
        "label.focusModel": "Focus model selector",
        "label.inputFocus": "Focus input",
        "label.inputBlur": "Blur input to chat",
        "label.sendAlternate": "Send (alternate behavior)",
        "desc.navMode": "Navigation mode: ↑↓ select · Enter open",
        "desc.switchDigit": "Switch to Nth by display order",
        "desc.prevSession": "Switch to the previous session in display order",
        "desc.nextSession": "Switch to the next session in display order",
        "desc.newSession": "Start a new session",
        "desc.panel": "Open / close this panel",
        "desc.toggleSidebar": "Toggle the left conversation sidebar",
        "desc.searchFocus": "Focus and clear the search box",
        "desc.focusModel": "Focus the model selector (again: back to input)",
        "desc.inputFocus": "Return focus to the chat input",
        "desc.inputBlur": "Esc focuses the chat; again restores your previous focus",
        "desc.sendAlternate": "Send the draft with the opposite busy-Enter behavior",
        "desc.archiveSession": "Archive the current session (confirmation first; view in the Archived page)",
        "desc.archiveList": "Open the Archived sessions page",
        "desc.renameSession": "Rename the current session",
        "desc.pinToggle": "Tri-state: pin / jump / unpin",
        "desc.jumpPin": "Jump without changing pins",
        "full.navMode": "Enter navigation mode: ↑↓ moves the highlight over session rows, Enter opens (same as clicking), Esc or any other key exits; the highlight also lands on \"show more sessions\" buttons — Enter expands and jumps to the first new session",
        "full.switchDigit": "Always switches to the Nth session by sidebar display order (independent of pins)",
        "full.prevSession": "Cycles through the sidebar display order: wraps from the first session back to the last one",
        "full.nextSession": "Cycles through the sidebar display order: wraps from the last session back to the first one",
        "full.newSession": "Start a new session in the current workspace (or the most recent one)",
        "full.panel": "Open or close this hotkey panel",
        "full.toggleSidebar": "Collapses or expands the left conversation sidebar — the same as clicking the sidebar's collapse/expand button; on narrow viewports the layout service flips the narrow-expanded state instead",
        "full.searchFocus": "Focus the session search box and clear its content",
        "full.focusModel": "Moves focus to the composer's model selector and shows a highlight ring: Enter opens the model menu and auto-highlights the first entry, ↑↓ moves between options (the ring follows focus, and entering the model list or the reasoning-effort sub-pane auto-highlights its first entry too), Enter confirms, Esc closes (focus returns to the trigger); pressing the key again while the selector is focused or its menu is open returns focus to the chat input",
        "full.inputFocus": "Returns focus to the chat input from anywhere (including while the model menu is open); moves the caret to the end only when the input was not already focused",
        "full.inputBlur": "Esc (default) always returns keyboard focus to the conversation scroll area (made focusable with tabindex=-1 on first use; its focus outline is suppressed) so ↑↓ / PgUp / PgDn / Home / End scroll the transcript. On the way it cancels the current transient state: the hotkeys panel closes, nav mode exits, the model menu closes without bouncing focus back to its trigger, and key recording cancels as before. While the composer input holds focus, suggestion popups (slash commands, @mentions) and IME composition keep their own Esc; the draft and caret are never touched. Pressing it again while the transcript holds focus restores the previous focus target — the model selector (ring restored) or the input (caret intact)",
        "full.sendAlternate": "Sends the current draft with the opposite of the busy-Enter preference while the agent is running: queue→steer or steer→queue; identical to a normal send while idle. Equivalent to pressing Ctrl/Cmd+Enter inside the composer with a non-empty draft. Empty drafts are refused so the empty-draft steer-queue chord is never triggered by accident.",
        "full.archiveSession": "Remove the current session from the session list without deleting it. A confirmation card with the session title appears first: Enter confirms, Esc cancels. It then appears in the panel's Archived page, where you can open or copy its id; nothing is deleted.",
        "full.archiveList": "Opens the panel on the “Archived” page: lists archived sessions with open and copy-id actions. ⚠️ DSH 0.1.1-rc.2 exposes no public unarchive API — sessions cannot be restored from the browser, but archiving never deletes session logs.",
        "full.renameSession": "Prompts for a new title for the current session (empty or cancel leaves it unchanged)",
        "full.pinToggle": "Pin slot tri-state: empty slot → pin the current session; holds another session → jump to it; holds the current one → unpin",
        "full.jumpPin": "Jump straight to pin slot N without changing any pins (except AltGr on Windows)",
        "svcSessionsUnavailable": "Sessions service unavailable",
        "svcWorkspacesUnavailable": "Workspaces service unavailable",
        "toggleSidebarFail": "Could not toggle the sidebar (layout service not ready)",
        "posEmpty": "Position {n} has no session",
        "alreadyAt": "Already on session {n} · {title}",
        "switchedTo": "Switched to session {n} · {title}",
        "switchedPrev": "Switched to previous session · {title}",
        "switchedNext": "Switched to next session · {title}",
        "noSessions": "No sessions to switch to",
        "pinSlotEmpty": "Pin slot {n} is empty",
        "switchedToPin": "Switched to pin slot {n} · {title}",
        "pinCleared": "Unpinned slot {n}",
        "pinnedTo": "Pinned slot {n} ← {title}",
        "noCurrentToPin": "No session is open, nothing to pin",
        "pinClearedGone": "Pin slot {n} cleared (the session no longer exists)",
        "newSessionOk": "New session",
        "newSessionFail": "Failed to start a new session",
        "noCurrentSession": "No session is open",
        "archived": "Archived session · {title}",
        "archiveFail": "Archive failed",
        "archivedTitle": "Archived sessions",
        "archivedEmpty": "No archived sessions",
        "archivedCount": "{n} archived sessions",
        "archivedOpenTitle": "Open this session (it stays archived)",
        "btnCopyId": "Copy id",
        "copiedId": "Copied session id · {id}",
        "copyFailed": "Copy failed",
        "archivedNoRestore": "⚠️ DSH 0.1.1-rc.2 has no public unarchive API: sessions cannot be restored from the browser. Copy the session id for a host-side plugin or manual restore; archiving never deletes session logs.",
        "confirmArchiveTitle": "Archive session",
        "confirmArchiveBody": "Nothing is deleted, but the session cannot be restored from the browser.",
        "confirmHint": "Enter confirm · Esc cancel · ←→ switch",
        "btnConfirmArchive": "Archive",
        "renamePromptTitle": "Rename session",
        "renamedTo": "Renamed to · {title}",
        "renameFailed": "Rename failed",
        "renameUnavailable": "Rename API unavailable",
        "renameEmpty": "Title cannot be empty, unchanged",
        "renameUnchanged": "Title unchanged, nothing to rename",
        "modelFocusOk": "Model selector focused · Enter opens the menu",
        "modelFocusBack": "Focus returned to the input",
        "modelFocusNone": "Model selector not found (open a session first)",
        "modelFocusBackNone": "Chat input not found",
        "modelFocusLocked": "Model selector is currently unavailable",
        "chatFocusOk": "Chat focused · {keys} to scroll",
        "chatFocusNone": "Chat scroll area not found",
        "chatFocusBack": "Focus restored",
        "sendAlternateOk": "Sent (alternate busy behavior)",
        "sendAlternateEmpty": "The input is empty, nothing to send",
        "sendAlternateComposing": "IME composition in progress, not sent",
        "navExited": "Navigation mode exited",
        "navLocating": "Navigation mode: locating session rows…",
        "navStarted": "Navigation mode · {n} targets · ↑↓ move, Enter to open",
        "navNoRows": "No navigable session rows found (expand the sidebar and retry)",
        "navExpanded": "Expanded · highlight moved to the first new session, press Enter to open",
        "navCollapsed": "Group collapsed",
        "navUpdateFail": "Failed to refresh the session list",
        "navRowGone": "Target row no longer exists",
        "navRowAny": "the selected row",
        "navEntered": "Opened session · {name}",
        "navHint": "↑↓ move · Enter open/expand · Esc cancel",
        "recPrompt": "Press the new key combo (Esc to cancel)…",
        "recCanceled": "Rebinding canceled",
        "resetDone": "Restored the {platform} default keys",
        "recUnsupported": "Unsupported: use a letter / {which} combo",
        "recUnsupportedDigit": "digit 1-9",
        "recUnsupportedKey": "F1-F12 / ` / Enter",
        "recNeedModifier": "Needs a modifier: at least one of Ctrl / Alt / ⌘",
        "recConflict": 'Conflicts with "{label}" — pick another combo',
        "recSaved": "Saved: {label} → {spec}",
        "keysTab": "Keys",
        "navKeysHint": "↑↓ move · ←→ switch tab",
        "recordingInRow": "Recording: press the new combo (Esc to cancel)…",
        "btnCancel": "Cancel",
        "btnRebind": "Rebind",
        "btnRebindTitle": "Record a new combo",
        "btnCancelRecTitle": "Click to cancel recording",
        "resetTip": "Platform preset: {platform}. Keys and pins are stored in this browser. Hover a row for full details.",
        "macModLegend": "⌃ = Control · ⌥ = Option · ⇧ = Shift · ⌘ = Command",
        "btnReset": "Reset",
        "btnResetTitle": "Restore default keys",
        "posRowEmptyTitle": "No session at this position",
        "posRowTitle": "Position {n} by display order · click to switch",
        "pinSetTitle": "Pinned to slot {n} · click to change slot",
        "pinChooseTitle": "Pin to one of the 1-9 pin slots",
        "pinBtn": "Pin",
        "pinnedBtn": "Pinned{n}",
        "pickTakenTitle": "Slot {n} taken (click to replace)",
        "pickFreeTitle": "Pin to slot {n}",
        "pinRowEmptyTitle": "Empty slot (pins the current session)",
        "pinRowTitle": "Pin slot {n} · click to switch",
        "unpinTitle": "Unpin",
        "unpinBtn": "Clear",
        "posHint": "{switch} always switches by display order · 'Pin' moves the session into an independent pin slot",
        "pinHint": "{toggle}: empty→pin current / holds another→jump / holds current→unpin · {jump} jumps without changing pins",
        "currentLabel": "Current: {title}"
      }
    };
    // Panel tab cycle order (Left/Right arrows wrap around).
    const TAB_ORDER = ["keys", "pos", "pin", "archived"];

    // Keys tab display: [section id, action ids] — order by usefulness: everyday
    // shortcuts first, pin management last.
    const KEY_SECTIONS = [
      ["secCommon", ["navMode", "switchDigit", "prevSession", "nextSession", "newSession", "panel", "toggleSidebar", "focusModel", "inputFocus", "inputBlur", "sendAlternate"]],
      ["secSearchArchive", ["searchFocus", "archiveSession", "archiveList", "renameSession"]],
      ["secPins", ["pinToggle", "jumpPin"]]
    ];

    const CSS = [
      ".shk-pinbtn{display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:28px;padding:0 8px;border:none;background:transparent;border-radius:50%;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .12s ease,color .12s ease}",
      ".shk-pinbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".shk-pinbtn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}",
      "@keyframes shk-pop-in{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}",
      ".shk-pop{position:fixed;z-index:2100;width:324px;max-height:calc(100vh - 20px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:10px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.18));pointer-events:auto;animation:shk-pop-in .16s ease-out}",
      ".shk-head{display:flex;align-items:center;gap:8px;padding:2px 4px 8px;border-bottom:1px solid var(--dsw-alias-border-l1)}",
      ".shk-head-icon{flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:7px;color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent)}",
      ".shk-head-title{flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-head-esc{flex:none;font-family:ui-monospace,Consolas,monospace;font-size:9px;font-weight:700;color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l1);border-bottom-width:2px;border-radius:5px;padding:2px 6px;background:var(--dsw-alias-bg-layer-2)}",
      ".shk-tabs{display:flex;gap:2px;padding:3px;margin:8px 0 6px;background:var(--dsw-alias-bg-layer-2);border-radius:10px}",
      ".shk-tab{flex:1;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;font-weight:500;padding:5px 2px;border-radius:7px;cursor:pointer;white-space:nowrap;transition:background .12s ease,color .12s ease,box-shadow .12s ease}",
      ".shk-tab:hover{color:var(--dsw-alias-label-primary)}",
      ".shk-tab.shk-tab-on{color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-overlay);box-shadow:0 1px 3px rgba(0,0,0,.14);font-weight:600}",
      ".shk-rows{flex:1 1 auto;min-height:0;max-height:190px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--dsh-scrollbar-thumb,var(--dsw-alias-scrollbar-bg-l2)) transparent;padding-right:2px}",
      ".shk-head,.shk-tabs,.shk-hint,.shk-current{flex:none}",
      ".shk-rows::-webkit-scrollbar{width:6px}",
      ".shk-rows::-webkit-scrollbar-thumb{background:var(--dsh-scrollbar-thumb,var(--dsw-alias-scrollbar-bg-l2,rgba(128,128,128,.35)));border-radius:3px}",
      ".shk-rows::-webkit-scrollbar-thumb:hover{background:var(--dsh-scrollbar-thumb-hover,var(--dsw-alias-scrollbar-hover-l2,rgba(128,128,128,.55)))}",
      ".shk-rows::-webkit-scrollbar-track{background:transparent}",
      ".shk-row{display:flex;align-items:center;gap:7px;padding:3px 6px;border-radius:10px;transition:background .1s ease}",
      ".shk-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".shk-num{flex:none;width:18px;height:18px;border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-variant-numeric:tabular-nums}",
      ".shk-title{flex:1;min-width:0;border:none;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font-size:12px;padding:4px 6px;border-radius:7px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;transition:background .1s ease}",
      ".shk-title:hover{background:var(--dsw-alias-bg-layer-2)}",
      ".shk-title.shk-empty{color:var(--dsw-alias-label-tertiary)}",
      ".shk-mini{flex:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;font-weight:500;padding:2px 9px;border-radius:7px;cursor:pointer;white-space:nowrap;transition:color .12s ease,background .12s ease,border-color .12s ease}",
      ".shk-mini:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}",
      ".shk-mini.shk-pin-set{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}",
      ".shk-mini.shk-rec{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".shk-picker{display:flex;flex-wrap:wrap;gap:5px;padding:4px 0 7px 25px}",
      ".shk-pick{width:24px;height:22px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10.5px;cursor:pointer;transition:color .12s ease,border-color .12s ease}",
      ".shk-pick:hover{color:var(--dsw-alias-label-primary)}",
      ".shk-pick.shk-pick-taken{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}",
      ".shk-hint{font-size:10.5px;color:var(--dsw-alias-label-secondary);padding:8px 6px 2px;line-height:1.6}",
      ".shk-current{font-size:10.5px;color:var(--dsw-alias-label-secondary);padding:4px 8px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-diag-empty{padding:1px 0 1px 8px}",
      ".shk-helpsec{font-size:9.5px;font-weight:700;color:var(--dsw-alias-label-tertiary);padding:10px 6px 4px;letter-spacing:.08em;text-transform:uppercase}",
      ".shk-helpsec:first-child{padding-top:4px}",
      ".shk-keyname{flex:1;min-width:0;font-size:11px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-keyval{flex:none;font-family:ui-monospace,Consolas,monospace;font-size:10px;font-weight:700;color:var(--dsw-alias-brand-primary);padding:2px 9px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-layer-2);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 1px 0 rgba(0,0,0,.12);white-space:nowrap}",
      ".shk-keyrow{display:flex;flex-direction:column;gap:2px;padding:4px 6px;border-radius:10px;transition:background .1s ease}",
      ".shk-keyrow:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".shk-tab:focus-visible,.shk-title:focus-visible,.shk-pick:focus-visible,.shk-mini:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}",
      ".shk-keyrow.shk-nav-focus{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 0 0 0 2px var(--dsw-alias-brand-primary)}",
      ".shk-keyrow-danger .shk-keyname{color:var(--dsw-alias-state-warn-primary)}",
      ".shk-keyrow-danger .shk-keydesc{color:var(--dsw-alias-state-warn-primary)}",
      ".shk-keyline{display:flex;align-items:center;gap:8px;min-height:24px}",
      ".shk-keydesc{font-size:10px;color:var(--dsw-alias-label-tertiary);padding:0 0 3px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "button[aria-haspopup='menu'][class*='_trigger']:focus-visible,button[aria-haspopup='menu'][class*='_trigger'].shk-modelfocus{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)!important}",
      "[role='menu'] button[role^='menuitem']:focus{outline:2px solid var(--dsw-alias-brand-primary)!important;outline-offset:-2px;background:var(--dsw-alias-interactive-bg-hover)}",
      ".shk-tipbox{margin:10px 2px 0;padding:8px 10px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);font-size:10px;color:var(--dsw-alias-label-secondary);line-height:1.7}",
      ".shk-toast{position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:2200;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font-size:13px;padding:8px 16px;border-radius:999px;box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.16));pointer-events:none;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-toast-warn{border-color:var(--dsw-alias-state-warn-primary)}",
      ".shk-ring{position:fixed;z-index:2050;pointer-events:none;border:2px solid var(--dsw-alias-brand-primary);border-radius:8px}",
      ".shk-navhint{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:2200;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font-size:12px;padding:6px 14px;border-radius:999px;box-shadow:var(--dsw-shadow-lv3,0 8px 24px rgba(0,0,0,.16));pointer-events:none}",
      "@keyframes shk-fade-in{from{opacity:0}to{opacity:1}}",
      ".shk-confirm-mask{position:fixed;inset:0;z-index:2150;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;animation:shk-fade-in .12s ease-out}",
      ".shk-confirm{width:min(380px,calc(100vw - 32px));background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;box-shadow:var(--dsw-shadow-lv3,0 12px 32px rgba(0,0,0,.18));overflow:hidden;animation:shk-pop-in .16s ease-out}",
      ".shk-confirm-strip{display:flex;align-items:center;gap:8px;background:var(--dsw-alias-state-warn-tertiary);color:var(--dsw-alias-state-warn-primary);font-size:13px;font-weight:600;line-height:18px;padding:10px 14px}",
      ".shk-confirm-dot{flex:none;background:var(--dsw-alias-state-warn-primary);border-radius:50%;width:8px;height:8px}",
      ".shk-confirm-body{padding:12px 14px 2px}",
      ".shk-confirm-session{display:flex;align-items:center;gap:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;margin-bottom:10px}",
      ".shk-confirm-sessionicon{flex:none;display:inline-flex;align-items:center;color:var(--dsw-alias-label-tertiary)}",
      ".shk-confirm-sessiontitle{flex:1;min-width:0;font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-confirm-text{font-size:12px;line-height:1.7;color:var(--dsw-alias-label-secondary);padding:0 2px}",
      ".shk-confirm-actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 14px 6px}",
      ".shk-confirm-btn{flex:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);font-size:12px;font-weight:500;padding:6px 16px;border-radius:8px;cursor:pointer;transition:background .12s ease,color .12s ease,border-color .12s ease}",
      ".shk-confirm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".shk-confirm-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}",
      ".shk-confirm-btn-danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}",
      ".shk-confirm-btn-danger:hover{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent)}",
      ".shk-confirm-hint{font-size:10px;color:var(--dsw-alias-label-tertiary);text-align:right;padding:4px 14px 10px}",
      // Silent focus: the inputBlur action focuses the transcript scroller
      // (the plugin adds tabindex=-1) so ↑↓ / PgUp / PgDn scroll the chat —
      // suppress the white keyboard-focus ring the UA would draw for it.
      "[data-conversation-scroll][tabindex='-1']:focus,[data-conversation-scroll][tabindex='-1']:focus-visible{outline:none!important;outline-offset:0!important;box-shadow:none!important}",
      "div[data-phase]:has([data-conversation-scroll][tabindex='-1']:focus),div[data-phase]:has([data-conversation-scroll][tabindex='-1']:focus-visible){outline:none!important;box-shadow:none!important}"
    ].join("\n");

    function apply(ctx) {
      const sessions = ctx.get("sessions");
      const workspaces = ctx.get("workspaces");
      const slots = ctx.get("slots");
      const locale = ctx.get("locale");
      if (slots === undefined) return;

      // The layout service (ui-layout) is provided LATER than this plugin's
      // apply on a cold boot: ui-layout waits for the theme service while this
      // plugin only waits for `slots`, so an apply-time capture races and can
      // land on `undefined` — permanently disabling Alt+B and the sidebar
      // re-expand in search-focus/nav (v1.7.0 bug). Resolve at keypress time
      // instead: by then the shell has rendered and the service is always
      // present. The dynamic ctx facade stays valid for the fiber's lifetime
      // (every listener below is disposed with it), so ctx.get per press is
      // safe and cheap.
      const layoutService = () => {
        try { return ctx.get("layout"); } catch { return undefined; }
      };

      // ---------- styles (own tag, removed on unload) ----------
      const styleTag = document.createElement("style");
      styleTag.dataset.plugin = "dsh-session-hotkeys";
      styleTag.textContent = CSS;
      document.head.appendChild(styleTag);
      ctx.effect(() => () => {
        if (styleTag.isConnected) styleTag.remove();
      });

      // ---------- pinned slots (localStorage, self-healing) ----------
      const readPins = () => {
        try {
          const raw = window.localStorage.getItem(PINS_KEY);
          if (raw === null || raw === "") return {};
          const parsed = JSON.parse(raw);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
          const clean = {};
          for (let n = 1; n <= SLOT_COUNT; n++) {
            const v = parsed[String(n)];
            if (typeof v === "string" && v.length > 0) clean[String(n)] = v;
          }
          return clean;
        } catch {
          return {};
        }
      };
      let pins = readPins();
      const writePins = () => {
        try { window.localStorage.setItem(PINS_KEY, JSON.stringify(pins)); } catch {}
      };

      // ---------- key bindings (localStorage, self-healing) ----------
      const codeLabelOf = (code) => {
        if (code === "Backquote") return "`";
        if (code === "Escape") return "Esc";
        if (code === "ArrowUp") return "↑";
        if (code === "ArrowDown") return "↓";
        if (code === "ArrowLeft") return "←";
        if (code === "ArrowRight") return "→";
        if (typeof code === "string" && code.indexOf("Key") === 0) return code.slice(3);
        return code;
      };
      // Modifier rendering: native Mac symbols (⌃ Control · ⌥ Option · ⇧ Shift ·
      // ⌘ Command) on macOS, spelled-out names on Windows. Mac combos render
      // Apple-style without "+" separators ("⌃⇧1-9"), Windows keeps "Alt+Shift+1-9".
      const modsText = (spec) => {
        if (spec === null || spec === undefined) return "";
        if (IS_MAC) {
          let out = "";
          if (spec.ctrl === true) out += "⌃";
          if (spec.alt === true) out += "⌥";
          if (spec.shift === true) out += "⇧";
          if (spec.meta === true) out += "⌘";
          return out;
        }
        const parts = [];
        if (spec.ctrl === true) parts.push("Ctrl");
        if (spec.alt === true) parts.push("Alt");
        if (spec.shift === true) parts.push("Shift");
        if (spec.meta === true) parts.push("Meta");
        return parts.join("+");
      };
      const specText = (spec) => {
        if (spec === null || spec === undefined) return "";
        const mods = modsText(spec);
        const key = spec.digit === true ? "1-9" : codeLabelOf(spec.code);
        if (mods === "") return key;
        return IS_MAC ? mods + key : mods + "+" + key;
      };
      const readBindings = () => {
        const out = {};
        for (const id of Object.keys(PLATFORM_DEFAULTS)) out[id] = { ...PLATFORM_DEFAULTS[id] };
        try {
          const raw = window.localStorage.getItem(KEYS_KEY);
          if (raw === null || raw === "") return out;
          const parsed = JSON.parse(raw);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return out;
          for (const id of Object.keys(out)) {
            const spec = parsed[id];
            if (spec === null || typeof spec !== "object") continue;
            if (out[id].digit === true) {
              if (spec.digit !== true) continue;
              out[id] = {
                ctrl: spec.ctrl === true, alt: spec.alt === true, shift: spec.shift === true, meta: spec.meta === true,
                digit: true, code: null
              };
            } else {
              if (spec.digit !== false || typeof spec.code !== "string") continue;
              const ok = /^Key[A-Z]$/.test(spec.code) || spec.code === "Backquote" || spec.code === "Enter" || spec.code === "Escape" || /^Arrow(Up|Down|Left|Right)$/.test(spec.code) || /^F([1-9]|1[0-2])$/.test(spec.code);
              if (!ok) continue;
              out[id] = {
                ctrl: spec.ctrl === true, alt: spec.alt === true, shift: spec.shift === true, meta: spec.meta === true,
                digit: false, code: spec.code
              };
            }
          }
        } catch {}
        // macOS remap migration: the previous preset used Ctrl+1-9, which Chrome
        // on macOS also binds to tab switching. Entries still equal to an exact
        // old default migrate to the new conflict-free combo; user customizations
        // are left untouched.
        if (IS_MAC) {
          const oldMacDigit = [
            ["switchDigit", true, false, false],
            ["pinToggle", true, false, true],
            ["jumpPin", true, true, false]
          ];
          for (const [id, ctrl, alt, shift] of oldMacDigit) {
            const spec = out[id];
            if (spec !== undefined && spec.digit === true && spec.ctrl === ctrl && spec.alt === alt && spec.shift === shift && spec.meta === false) {
              out[id] = { ...MAC_DEFAULTS[id] };
            }
          }
        }
        return out;
      };
      let bindings = readBindings();
      const writeBindings = () => {
        try { window.localStorage.setItem(KEYS_KEY, JSON.stringify(bindings)); } catch {}
      };
      const matchEvent = (spec, event) => {
        if (spec === null || spec === undefined) return false;
        if (event.ctrlKey !== spec.ctrl || event.altKey !== spec.alt || event.shiftKey !== spec.shift || event.metaKey !== spec.meta) return false;
        if (spec.digit === true) return typeof event.code === "string" && /^(Digit|Numpad)[1-9]$/.test(event.code);
        return event.code === spec.code;
      };
      const specFromEvent = (event, digitAction) => {
        const code = event.code;
        if (digitAction) {
          if (typeof code !== "string" || !/^(Digit|Numpad)[1-9]$/.test(code)) return null;
          return { ctrl: event.ctrlKey === true, alt: event.altKey === true, shift: event.shiftKey === true, meta: event.metaKey === true, digit: true, code: null };
        }
        if (typeof code !== "string") return null;
        const ok = /^Key[A-Z]$/.test(code) || code === "Backquote" || code === "Enter" || /^Arrow(Up|Down|Left|Right)$/.test(code) || /^F([1-9]|1[0-2])$/.test(code);
        if (!ok) return null;
        return { ctrl: event.ctrlKey === true, alt: event.altKey === true, shift: event.shiftKey === true, meta: event.metaKey === true, digit: false, code };
      };
      const specEquals = (a, b) => {
        if (a.digit === true || b.digit === true) {
          return a.digit === true && b.digit === true && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta;
        }
        return a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta && a.code === b.code;
      };

      // ---------- tiny external stores for React ----------
      const makeBus = (initial) => {
        let value = initial;
        const listeners = new Set();
        return {
          getSnapshot: () => value,
          subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
          set: (next) => { if (next === value) return; value = next; listeners.forEach((fn) => fn()); }
        };
      };
      const pinsBus = makeBus(pins);
      const uiBus = makeBus({ open: false, rect: null, openTab: null });
      const navBus = makeBus({ active: false, index: -1, items: [], order: [] });
      const keysBus = makeBus(bindings);
      const keyBus = makeBus({ recording: null });
      const confirmBus = makeBus({ open: false, id: null, title: "" });

      // ---------- i18n: follow the DSH locale preference ----------
      let curLang = "zh";
      try {
        const nav = window.navigator;
        if (nav !== undefined && nav.language !== undefined && !/^zh/i.test(String(nav.language))) curLang = "en";
      } catch {}
      const langBus = makeBus(curLang);
      const readLocaleId = () => {
        try {
          if (locale !== undefined && typeof locale.getLocale === "function") {
            const snap = locale.getLocale();
            if (snap !== null && snap !== undefined && snap.active !== undefined) return String(snap.active);
          }
          if (locale !== undefined && typeof locale.getSnapshot === "function") {
            const snap = locale.getSnapshot();
            if (snap !== null && snap !== undefined && snap.active !== undefined) return String(snap.active);
          }
        } catch {}
        return null;
      };
      const applyLocale = (raw) => {
        if (typeof raw !== "string" || raw === "") return;
        const next = I18N[raw] !== undefined ? raw : (raw.indexOf("zh") === 0 ? "zh" : "en");
        if (next !== curLang) { curLang = next; langBus.set(next); }
      };
      applyLocale(readLocaleId());
      if (locale !== undefined && typeof locale.subscribe === "function") {
        try {
          ctx.effect(() => locale.subscribe(() => applyLocale(readLocaleId())));
        } catch {}
      }
      const t = (key, vars) => {
        let s = (I18N[curLang] || I18N.zh)[key];
        if (s === undefined) s = I18N.zh[key];
        if (s === undefined) return key;
        if (vars !== undefined) {
          for (const k in vars) s = s.split("{" + k + "}").join(String(vars[k]));
        }
        return s;
      };

      // ---------- toast (body-mounted, always visible) ----------
      let toastEl = null;
      let toastHideTimer = null;
      const hideToastDom = () => {
        if (toastHideTimer !== null) { window.clearTimeout(toastHideTimer); toastHideTimer = null; }
        if (toastEl !== null) { toastEl.remove(); toastEl = null; }
      };
      const showToast = (text, tone) => {
        if (toastEl === null) {
          toastEl = document.createElement("div");
          document.body.appendChild(toastEl);
        }
        toastEl.className = "shk-toast" + (tone === "warn" ? " shk-toast-warn" : "");
        toastEl.textContent = text;
        if (toastHideTimer !== null) window.clearTimeout(toastHideTimer);
        toastHideTimer = window.setTimeout(hideToastDom, 2800);
      };

      // ---------- clipboard (copy session id from the Archived page) ----------
      const copyText = (text) => {
        const done = () => showToast(t("copiedId", { id: text }));
        const fail = (err) => {
          console.error("dsh-session-hotkeys copy:", err);
          showToast(t("copyFailed"), "warn");
        };
        try {
          if (window.navigator !== undefined && window.navigator.clipboard !== undefined && typeof window.navigator.clipboard.writeText === "function") {
            window.navigator.clipboard.writeText(text).then(done, fail);
            return;
          }
        } catch {}
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          let ok = false;
          try { ok = document.execCommand("copy"); } catch {}
          ta.remove();
          if (ok) done(); else fail(new Error("execCommand copy failed"));
        } catch (err) { fail(err); }
      };

      // ---------- session data ----------
      const snap = () => {
        const store = sessions === undefined ? undefined : sessions.list;
        const s = store === undefined ? undefined : store.getSnapshot();
        if (s === undefined || s === null) return { ids: [], byId: {}, current: undefined };
        return s;
      };
      const titleOf = (id) => {
        const entry = snap().byId[id];
        if (entry === undefined) return id;
        if (typeof entry.displayTitle === "string" && entry.displayTitle !== "") return entry.displayTitle;
        if (typeof entry.title === "string" && entry.title !== "") return entry.title;
        return id;
      };

      // ---------- sidebar display order (read from DOM: what you see is what you get) ----------
      const queryRows = () => {
        const primary = document.querySelectorAll(ROW_SELECTORS[0]);
        if (primary.length > 0) return primary;
        return document.querySelectorAll(ROW_SELECTORS[1]);
      };
      let cachedOrder = null;
      const readDomOrder = () => {
        const rows = queryRows();
        if (rows.length === 0) return null;
        const s = snap();
        const byTitle = new Map();
        for (const id of s.ids) {
          const entry = s.byId[id];
          if (entry === undefined || entry.blank === true) continue;
          const t = entry.displayTitle ?? entry.title ?? id;
          if (typeof t !== "string" || t === "") continue;
          const bucket = byTitle.get(t);
          if (bucket === undefined) byTitle.set(t, [id]);
          else bucket.push(id);
        }
        const used = new Set();
        const order = [];
        for (const row of rows) {
          const titleEl = row.querySelector('[class*="_title"]');
          const text = titleEl === null ? "" : String(titleEl.textContent ?? "").trim();
          let id = null;
          const bucket = text === "" ? undefined : byTitle.get(text);
          if (bucket !== undefined) {
            for (const candidate of bucket) {
              if (!used.has(candidate)) { id = candidate; used.add(candidate); break; }
            }
          }
          if (id === null) {
            const cur = s.current;
            if (cur !== undefined && s.byId[cur] !== undefined && s.byId[cur].blank === true && !used.has(cur)) {
              id = cur;
              used.add(cur);
            }
          }
          order.push(id);
        }
        return order;
      };
      const currentOrder = () => {
        let order = null;
        try { order = readDomOrder(); } catch {}
        if (order !== null) { cachedOrder = order; return order; }
        if (cachedOrder !== null && cachedOrder.length > 0) return cachedOrder;
        return snap().ids;
      };
      // Nav-mode item list: session rows and overflow buttons in document order.
      const readNavItems = () => {
        const els = document.querySelectorAll(NAV_SELECTOR);
        if (els.length === 0) return null;
        const s = snap();
        const byTitle = new Map();
        for (const id of s.ids) {
          const entry = s.byId[id];
          if (entry === undefined || entry.blank === true) continue;
          const t = entry.displayTitle ?? entry.title ?? id;
          if (typeof t !== "string" || t === "") continue;
          const bucket = byTitle.get(t);
          if (bucket === undefined) byTitle.set(t, [id]);
          else bucket.push(id);
        }
        const used = new Set();
        const items = [];
        const order = [];
        let overflowOrdinal = 0;
        let unknownOrdinal = 0;
        for (const el of els) {
          if (el.tagName === "BUTTON") {
            overflowOrdinal += 1;
            items.push({ kind: "overflow", el });
            order.push("o:" + overflowOrdinal);
            continue;
          }
          const titleEl = el.querySelector('[class*="_title"]');
          const text = titleEl === null ? "" : String(titleEl.textContent ?? "").trim();
          let id = null;
          const bucket = text === "" ? undefined : byTitle.get(text);
          if (bucket !== undefined) {
            for (const candidate of bucket) {
              if (!used.has(candidate)) { id = candidate; used.add(candidate); break; }
            }
          }
          if (id === null) {
            const cur = s.current;
            if (cur !== undefined && s.byId[cur] !== undefined && s.byId[cur].blank === true && !used.has(cur)) {
              id = cur;
              used.add(cur);
            }
          }
          items.push({ kind: "session", el });
          if (id !== null) order.push("s:" + id);
          else { unknownOrdinal += 1; order.push("u:" + unknownOrdinal); }
        }
        return { items, order };
      };
      if (sessions !== undefined && sessions.list !== undefined) {
        ctx.effect(() => sessions.list.subscribe(() => {
          try {
            const order = readDomOrder();
            if (order !== null) cachedOrder = order;
          } catch {}
        }));
      }

      const slotOf = (n) => {
        const s = snap();
        const pos = currentOrder()[n - 1];
        if (pos !== null && pos !== undefined && s.byId[pos] !== undefined) return { id: pos };
        return { id: undefined };
      };
      const shiftSlotOf = (id) => {
        for (let k = 1; k <= SLOT_COUNT; k++) {
          if (pins[String(k)] === id) return k;
        }
        return 0;
      };

      // ---------- actions ----------
      const stepSession = (delta) => {
        const s = snap();
        if (sessions === undefined) { showToast(t("svcSessionsUnavailable"), "warn"); return; }
        const order = currentOrder();
        if (order.length === 0) { showToast(t("noSessions"), "warn"); return; }
        let base = order.indexOf(s.current);
        if (base === -1) base = delta > 0 ? -1 : order.length;
        for (let k = 1; k <= order.length; k++) {
          const idx = ((base + delta * k) % order.length + order.length) % order.length;
          const id = order[idx];
          if (id !== null && id !== undefined && s.byId[id] !== undefined) {
            sessions.open(id);
            showToast(t(delta > 0 ? "switchedNext" : "switchedPrev", { title: titleOf(id) }));
            return;
          }
        }
        showToast(t("noSessions"), "warn");
      };
      const jumpTo = (n) => {
        if (sessions === undefined) { showToast(t("svcSessionsUnavailable"), "warn"); return; }
        const slot = slotOf(n);
        if (slot.id === undefined) { showToast(t("posEmpty", { n }), "warn"); return; }
        const wasCurrent = snap().current === slot.id;
        sessions.open(slot.id);
        showToast(t(wasCurrent ? "alreadyAt" : "switchedTo", { n, title: titleOf(slot.id) }));
      };
      const jumpToPin = (n) => {
        const s = snap();
        const pinnedId = pins[String(n)];
        if (pinnedId === undefined || s.byId[pinnedId] === undefined) { showToast(t("pinSlotEmpty", { n }), "warn"); return; }
        if (sessions === undefined) { showToast(t("svcSessionsUnavailable"), "warn"); return; }
        sessions.open(pinnedId);
        showToast(t("switchedToPin", { n, title: titleOf(pinnedId) }));
      };
      const unpin = (n) => {
        const key = String(n);
        if (pins[key] === undefined) return;
        delete pins[key];
        writePins();
        pinsBus.set({ ...pins });
        showToast(t("pinCleared", { n }));
      };
      const pinSession = (sessionId, slot) => {
        const key = String(slot);
        if (pins[key] === sessionId) { unpin(slot); return; }
        pins[key] = sessionId;
        writePins();
        pinsBus.set({ ...pins });
        showToast(t("pinnedTo", { n: slot, title: titleOf(sessionId) }));
      };
      const pinToggle = (n) => {
        const s = snap();
        const key = String(n);
        const pinnedId = pins[key];
        const current = s.current;
        if (pinnedId === undefined) {
          if (current === undefined) { showToast(t("noCurrentToPin"), "warn"); return; }
          pins[key] = current;
          writePins();
          pinsBus.set({ ...pins });
          showToast(t("pinnedTo", { n, title: titleOf(current) }));
          return;
        }
        if (pinnedId === current) { unpin(n); return; }
        if (s.byId[pinnedId] !== undefined) { jumpToPin(n); return; }
        delete pins[key];
        if (current !== undefined) {
          pins[key] = current;
          writePins();
          pinsBus.set({ ...pins });
          showToast(t("pinnedTo", { n, title: titleOf(current) }));
        } else {
          writePins();
          pinsBus.set({ ...pins });
          showToast(t("pinClearedGone", { n }), "warn");
        }
      };
      const newSession = () => {
        if (workspaces === undefined) { showToast(t("svcWorkspacesUnavailable"), "warn"); return; }
        try {
          workspaces.startSession();
          showToast(t("newSessionOk"));
        } catch (err) {
          console.error("dsh-session-hotkeys newSession:", err);
          showToast(t("newSessionFail"), "warn");
        }
      };
      let archiving = false;
      const doArchive = (id, title) => {
        if (workspaces === undefined) { showToast(t("svcWorkspacesUnavailable"), "warn"); return; }
        if (archiving) return;
        archiving = true;
        window.setTimeout(() => { archiving = false; }, 1200);
        workspaces.archiveSession(id).then(() => {
          showToast(t("archived", { title }));
        }).catch((err) => {
          console.error("dsh-session-hotkeys archive:", err);
          showToast(t("archiveFail"), "warn");
        }).finally(() => {
          window.setTimeout(() => { archiving = false; }, 200);
        });
      };
      // Archiving is destructive and hard to undo (DSH exposes no unarchive
      // API), so the hotkey opens a themed confirmation card first — the
      // session title is shown and Enter confirms / Esc cancels.
      const requestArchive = () => {
        const s = snap();
        const id = s.current;
        if (id === undefined) { showToast(t("noCurrentSession"), "warn"); return; }
        const trigger = findModelTrigger();
        if (trigger !== null && trigger.getAttribute("aria-expanded") === "true") {
          try { trigger.click(); } catch {}
        }
        confirmBus.set({ open: true, id, title: titleOf(id) });
      };
      const confirmArchiveNow = () => {
        const confirm = confirmBus.getSnapshot();
        if (!confirm.open || confirm.id === null) return;
        confirmBus.set({ open: false, id: null, title: "" });
        doArchive(confirm.id, confirm.title);
      };
      const cancelArchive = () => {
        confirmBus.set({ open: false, id: null, title: "" });
      };
      const panelRect = () => {
        let rect = { left: 300, bottom: Math.max(140, window.innerHeight - 80) };
        const btn = document.querySelector(".shk-pinbtn");
        if (btn !== null) {
          const r = btn.getBoundingClientRect();
          rect = { left: r.left, bottom: r.bottom };
        }
        return rect;
      };
      const togglePanel = () => {
        const ui = uiBus.getSnapshot();
        if (ui.open === true) { uiBus.set({ open: false, rect: null, openTab: null }); return; }
        uiBus.set({ open: true, rect: panelRect(), openTab: null });
      };
      // Open the panel on the “Archived” page (keeps the current rect when already open).
      const openArchivedTab = () => {
        const ui = uiBus.getSnapshot();
        uiBus.set({ open: true, rect: ui.open === true && ui.rect !== null ? ui.rect : panelRect(), openTab: "archived" });
      };
      // Rename the current session through sessions.binding(id).session.rename —
      // the same API the sidebar's inline rename flow uses. A prompt with the
      // current title pre-filled keeps it keyboard-first.
      const renameCurrent = () => {
        const s = snap();
        const id = s.current;
        if (id === undefined) { showToast(t("noCurrentSession"), "warn"); return; }
        if (sessions === undefined) { showToast(t("svcSessionsUnavailable"), "warn"); return; }
        let binding = undefined;
        try { binding = sessions.binding(id); } catch (err) { console.error("dsh-session-hotkeys binding:", err); }
        const session = binding === undefined ? undefined : binding.session;
        if (session === undefined || typeof session.rename !== "function") { showToast(t("renameUnavailable"), "warn"); return; }
        let input = null;
        try { input = window.prompt(t("renamePromptTitle"), titleOf(id)); } catch (err) { console.error("dsh-session-hotkeys prompt:", err); }
        if (input === null) return; // canceled (Esc / 取消)
        const trimmed = String(input).trim();
        if (trimmed === "") { showToast(t("renameEmpty"), "warn"); return; }
        if (trimmed === titleOf(id)) { showToast(t("renameUnchanged")); return; }
        session.rename(trimmed).then((result) => {
          if (result !== undefined && result !== null && result.ok === false) {
            showToast(t("renameFailed"), "warn");
            return;
          }
          showToast(t("renamedTo", { title: trimmed }));
        }).catch((err) => {
          console.error("dsh-session-hotkeys rename:", err);
          showToast(t("renameFailed"), "warn");
        });
      };

      // ---------- search box focus + clear ----------
      const findOne = (selectors) => {
        for (let i = 0; i < selectors.length; i++) {
          const el = document.querySelector(selectors[i]);
          if (el !== null) return el;
        }
        return null;
      };
      const clearControlledInput = (input) => {
        const proto = window.HTMLInputElement === undefined ? undefined : window.HTMLInputElement.prototype;
        const descriptor = proto === undefined ? undefined : Object.getOwnPropertyDescriptor(proto, "value");
        if (descriptor !== undefined && typeof descriptor.set === "function") descriptor.set.call(input, "");
        else input.value = "";
      };
      const focusSearchAndClear = () => {
        const input = findOne(INPUT_SELECTORS);
        if (input === null) return false;
        const button = findOne(BUTTON_SELECTORS);
        if (button !== null && button.getAttribute("aria-expanded") !== "true") {
          try { button.click(); } catch {}
        }
        if (input.value !== "") {
          clearControlledInput(input);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
        try { input.focus({ preventScroll: true }); } catch { input.focus(); }
        return true;
      };
      const focusSearch = () => {
        const collapsed = document.querySelector("[data-sidebar-collapsed]") !== null;
        if (collapsed) {
          const layout = layoutService();
          if (layout !== undefined) {
            try { layout.toggleSidebar(); } catch {}
          }
        }
        const attempt = (left) => {
          if (focusSearchAndClear()) return;
          if (left > 0) window.setTimeout(() => attempt(left - 1), 110);
        };
        attempt(10);
      };

      // ---------- sidebar collapse / expand ----------
      // Alt+B / ⌃⌥B: toggle the left conversation sidebar through the layout
      // service — the same controller the search/nav flows use to re-expand
      // it (closed ⟷ default width; on narrow viewports the layout store
      // flips its narrowExpanded override itself).
      const toggleSidebarPanel = () => {
        const layout = layoutService();
        if (layout !== undefined && typeof layout.toggleSidebar === "function") {
          try { layout.toggleSidebar(); return; } catch (err) { console.error("dsh-session-hotkeys toggleSidebar:", err); }
        }
        showToast(t("toggleSidebarFail"), "warn");
      };

      // ---------- model selector focus ----------
      // Focus the composer's model trigger with a forced brand ring so the
      // keyboard-only pick flow is always visible: Enter opens the menu, ↑↓
      // move between entries (ring follows focus), Enter picks, Esc closes.
      // The "model menu keyboard bridge" below patches the gaps in DSH's own
      // menu handler (pane-swap focus loss and the skip-first quirk).
      // With dsh-split-view active there are several composers in the DOM (one
      // per pane plus the covered original), so scope the search to the split
      // view's focused pane first and only then fall back document-wide.
      const hotkeyScopes = () => {
        const scopes = [];
        try {
          const focusedPane = document.querySelector(".dsv-pane.focused");
          if (focusedPane !== null) scopes.push(focusedPane);
          else {
            const panes = document.querySelectorAll(".dsv-pane");
            if (panes.length > 0) scopes.push(panes[0]);
          }
        } catch {}
        scopes.push(document);
        return scopes;
      };
      const findModelTrigger = () => {
        for (const scope of hotkeyScopes()) {
          for (const selector of MODEL_TRIGGER_SELECTORS) {
            let els;
            try { els = scope.querySelectorAll(selector); } catch { continue; }
            for (const el of els) {
              if (el.tagName === "BUTTON" && el.hasAttribute("aria-expanded") && el.hasAttribute("title") && el.hasAttribute("aria-label")) return el;
            }
          }
        }
        return null;
      };
      const ringFocus = (trigger) => {
        try {
          // Force a visible brand ring even when the browser would not apply
          // :focus-visible to a programmatically focused button; cleared on blur.
          trigger.classList.add("shk-modelfocus");
          trigger.addEventListener("blur", () => {
            try { trigger.classList.remove("shk-modelfocus"); } catch {}
          }, { once: true });
          trigger.focus();
        } catch (err) {
          console.error("dsh-session-hotkeys ringFocus:", err);
        }
      };
      const findComposerInput = () => {
        for (const scope of hotkeyScopes()) {
          for (const selector of COMPOSER_INPUT_SELECTORS) {
            let el;
            try { el = scope.querySelector(selector); } catch { continue; }
            if (el !== null) return el;
          }
        }
        return null;
      };
      // Focus the composer's chat input. The model menu is closed explicitly
      // first when it is open — after a pane swap focus sits on <body>, so no
      // blur event would cross the menu root to close it. The caret is moved
      // to the end of the draft only when the input was not already focused.
      const focusComposerInput = () => {
        const trigger = findModelTrigger();
        if (trigger !== null && trigger.getAttribute("aria-expanded") === "true") {
          try { trigger.click(); } catch {}
        }
        const input = findComposerInput();
        if (input === null || input.disabled === true) { showToast(t("modelFocusBackNone"), "warn"); return false; }
        const wasFocused = document.activeElement === input;
        try {
          input.focus();
          if (!wasFocused && typeof input.setSelectionRange === "function") {
            const len = String(input.value ?? "").length;
            input.setSelectionRange(len, len);
          }
        } catch (err) {
          console.error("dsh-session-hotkeys focusComposerInput:", err);
          return false;
        }
        showToast(t("modelFocusBack"));
        return true;
      };
      // True while the composer's suggestion popup (slash commands, @mentions)
      // is open — the popup owns Esc (DSH dismisses it on its own keydown).
      const composerPopupOpen = () => {
        const input = findComposerInput();
        if (input === null) return false;
        let scope = document;
        try {
          const card = input.closest("[data-composer-card]");
          if (card !== null) scope = card;
        } catch {}
        let boxes;
        try { boxes = scope.querySelectorAll(COMPOSER_POPUP_SELECTOR); } catch { return false; }
        for (const box of boxes) {
          try {
            const rect = box.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return true;
          } catch {}
        }
        return false;
      };
      // Move focus from the composer textarea to the chat transcript scroller
      // so the arrow / page keys scroll the conversation again. The scroller
      // is made programmatically focusable (tabindex=-1) on first use; the
      // draft and caret stay untouched — only focus moves. preventScroll keeps
      // the current reading position instead of yanking to the bottom.
      const chatScrollerEl = () => {
        for (const selector of CHAT_SCROLLER_SELECTORS) {
          try { const el = document.querySelector(selector); if (el !== null) return el; } catch {}
        }
        return null;
      };
      // True when the element is a conversation transcript scroller (any pane).
      const isTranscriptScroller = (el) => el instanceof Element && el.matches("[data-conversation-scroll]");
      // The toggle's memory: where the next Esc should return to.
      let escReturnFocus = null;
      const saveReturnFocus = () => {
        const active = document.activeElement;
        escReturnFocus = active instanceof Element && active !== document.body && !isTranscriptScroller(active) ? active : null;
      };
      const focusChatTranscript = () => {
        if (isTranscriptScroller(document.activeElement)) return true; // already there: stay silent
        // Remember where to come back to on the next Esc (the toggle).
        saveReturnFocus();
        // Split-view workspace owns the visible chat area: delegate to its
        // bridge, which resolves the focused pane (or the last-typed fallback)
        // and focuses that pane's own transcript scroller.
        try {
          const bridge = window.__dshSplitView;
          if (bridge !== undefined && bridge !== null && typeof bridge.focusChat === "function" && bridge.focusChat() === true) {
            try { document.activeElement?.style?.setProperty("outline", "none"); } catch {}
            showToast(t("chatFocusOk", { keys: CHAT_SCROLL_KEYS }));
            return true;
          }
        } catch {}
        const scroller = chatScrollerEl();
        if (scroller === null) { showToast(t("chatFocusNone"), "warn"); return false; }
        try {
          if (scroller.getAttribute("tabindex") === null) scroller.setAttribute("tabindex", "-1");
          try { scroller.style.setProperty("outline", "none"); } catch {}
          scroller.focus({ preventScroll: true });
        } catch (err) {
          console.error("dsh-session-hotkeys focusChatTranscript:", err);
          return false;
        }
        showToast(t("chatFocusOk", { keys: CHAT_SCROLL_KEYS }));
        return true;
      };
      // The toggle's other half: a transcript scroller holds focus and the
      // user presses Esc again — put focus back where it was before the first
      // press. The model selector gets its highlight ring back; the composer
      // input keeps its caret (textareas preserve the selection while
      // blurred). A target that left the DOM meanwhile (closed panel,
      // unmounted menu item) is dropped silently.
      const tryRestoreFromTranscript = (event) => {
        if (!isTranscriptScroller(document.activeElement)) return false;
        const target = escReturnFocus;
        escReturnFocus = null;
        if (!(target instanceof Element) || !target.isConnected || isTranscriptScroller(target)) return false;
        event.preventDefault();
        event.stopPropagation();
        try {
          if (target === findModelTrigger()) ringFocus(target);
          else target.focus({ preventScroll: true });
        } catch (err) {
          try { target.focus(); } catch {}
        }
        showToast(t("chatFocusBack"));
        return true;
      };
      // True when the event matches the inputBlur binding — the single
      // "return to the conversation" key shared by the input, panel, nav-mode
      // and model-menu paths.
      const blurMatches = (event) => {
        const spec = bindings.inputBlur;
        if (spec === undefined || spec === null || spec.digit === true) return false;
        return matchEvent(spec, event);
      };
      // The "leave the input" variant: fires only when the composer textarea
      // really holds focus. IME composition is left alone (Esc cancels the
      // composition, not the focus), and a composer popup keeps Esc for its
      // own dismissal.
      const tryComposerBlur = (event) => {
        if (!blurMatches(event)) return false;
        const input = findComposerInput();
        if (input === null || input.disabled === true) return false;
        if (document.activeElement !== input) return false;
        if (event.isComposing === true || event.keyCode === 229 || composingActive) return false;
        if (composerPopupOpen()) return false;
        event.preventDefault();
        event.stopPropagation();
        return focusChatTranscript();
      };
      // Send the current draft through DSH's own composer keyboard path using
      // the "accelerated" (Ctrl/Cmd+Enter) gesture: the submission policy
      // resolves that gesture to the opposite of the busy-Enter preference
      // (queue↔steer) while the agent is running, and to a normal send while
      // idle. Requiring a non-empty draft also keeps the empty-draft
      // steer-queue chord out of reach, so this action always sends the draft.
      // A global IME-composition flag guards the case where DSH would silently
      // ignore the synthetic Enter (composingRef), which would otherwise leave
      // a misleading "sent" toast.
      let composingActive = false;
      const onCompositionStart = () => { composingActive = true; };
      const onCompositionEnd = () => { composingActive = false; };
      document.addEventListener("compositionstart", onCompositionStart, true);
      document.addEventListener("compositionend", onCompositionEnd, true);
      const sendAlternate = () => {
        const input = findComposerInput();
        if (input === null || input.disabled === true) { showToast(t("modelFocusBackNone"), "warn"); return; }
        if (String(input.value ?? "").trim() === "") { showToast(t("sendAlternateEmpty"), "warn"); return; }
        if (composingActive) { showToast(t("sendAlternateComposing"), "warn"); return; }
        try {
          input.focus();
          input.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", code: "Enter", ctrlKey: true, shiftKey: false, bubbles: true, cancelable: true
          }));
        } catch (err) {
          console.error("dsh-session-hotkeys sendAlternate:", err);
          return;
        }
        showToast(t("sendAlternateOk"));
      };
      const focusModel = () => {
        const trigger = findModelTrigger();
        if (trigger === null) { showToast(t("modelFocusNone"), "warn"); return; }
        const menuOpen = trigger.getAttribute("aria-expanded") === "true";
        // Toggle: while the selector holds focus (or its menu is open), the
        // same key returns focus to the chat input instead of re-focusing the
        // trigger.
        if (menuOpen || document.activeElement === trigger) {
          focusComposerInput();
          return;
        }
        if (trigger.disabled === true) { showToast(t("modelFocusLocked"), "warn"); return; }
        ringFocus(trigger);
        showToast(t("modelFocusOk"));
      };
      // ---------- model menu keyboard bridge ----------
      // DSH's model menu moves focus with its own root keydown handler, but that
      // handler is blind in two situations: focus on the trigger (its first
      // ArrowDown skips to the second entry) and focus lost to <body> after a
      // pane swap (the clicked cell unmounts, so ↑↓ go dead and even Esc can no
      // longer reach the handler). This bridge patches both gaps whenever the
      // menu is open and focus sits outside the menu container: ↑↓ target the
      // first/last menu entry (the visible ring follows focus), Esc closes and
      // returns focus to the trigger. When focus is already inside the menu,
      // DSH's own handler runs and the ring simply follows the focus.
      const modelMenuEl = () => {
        const trigger = findModelTrigger();
        if (trigger === null) return null;
        const cid = trigger.getAttribute("aria-controls");
        if (cid === null || cid === "") return null;
        return document.getElementById(cid);
      };
      const handleModelMenuKey = (event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Escape") return false;
        // Only bare keys: Alt+↑/↓ etc. belong to the session hotkeys, and
        // Shift+arrows may be a text selection gesture elsewhere.
        if (event.ctrlKey === true || event.altKey === true || event.metaKey === true || event.shiftKey === true) return false;
        const trigger = findModelTrigger();
        if (trigger === null || trigger.getAttribute("aria-expanded") !== "true") return false;
        const menu = modelMenuEl();
        if (menu === null) return false;
        // Esc closes the menu whether focus sits inside it (DSH's own handler
        // would bounce focus back to the trigger) or anywhere outside it.
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          try { trigger.click(); } catch {}
          // Close-and-go: hand focus to the transcript instead of bouncing it
          // back to the trigger; with a rebound (non-Esc) inputBlur combo the
          // old ring-on-trigger behavior still applies.
          if (blurMatches(event)) focusChatTranscript();
          else window.setTimeout(() => ringFocus(trigger), 0);
          return true;
        }
        const active = document.activeElement;
        if (active instanceof Node && menu.contains(active)) return false; // inside the menu: DSH handles arrows
        const entries = menu.querySelectorAll('button[role="menuitem"]:not([disabled]), button[role="menuitemradio"]:not([disabled])');
        if (entries.length === 0) return false;
        const target = event.key === "ArrowDown" ? entries[0] : entries[entries.length - 1];
        event.preventDefault();
        event.stopPropagation();
        try { target.focus(); } catch {}
        return true;
      };
      // Auto-focus the first menu entry once the menu opens or a pane swaps.
      // The menu DOM appears only after the Enter keydown completes (React
      // renders synchronously but our capture listener runs first), so the
      // check runs on the next tick and retries briefly while a pane still
      // loads its list. Keyboard flows only: Enter on the trigger or inside
      // the menu.
      let modelMenuFocusSeq = 0;
      const scheduleModelMenuAutofocus = () => {
        const seq = ++modelMenuFocusSeq;
        const attempt = (left) => {
          if (seq !== modelMenuFocusSeq) return; // superseded by a newer Enter
          const trigger = findModelTrigger();
          if (trigger === null || trigger.getAttribute("aria-expanded") !== "true") return;
          const menu = modelMenuEl();
          if (menu === null) return;
          const active = document.activeElement;
          if (active instanceof Node && menu.contains(active)) return; // already navigating
          const entries = menu.querySelectorAll('button[role="menuitem"]:not([disabled]), button[role="menuitemradio"]:not([disabled])');
          if (entries.length > 0) {
            try { entries[0].focus(); } catch {}
            return;
          }
          if (left > 0) window.setTimeout(() => attempt(left - 1), 100);
        };
        window.setTimeout(() => attempt(12), 0);
      };

      // ---------- nav mode (highlight ring over real sidebar rows) ----------
      let ringEl = null;
      let hintEl = null;
      const ensureRing = () => {
        if (ringEl !== null) return ringEl;
        ringEl = document.createElement("div");
        ringEl.className = "shk-ring";
        document.body.appendChild(ringEl);
        return ringEl;
      };
      const removeRing = () => {
        if (ringEl !== null) { ringEl.remove(); ringEl = null; }
      };
      const showHint = () => {
        if (hintEl !== null) return;
        hintEl = document.createElement("div");
        hintEl.className = "shk-navhint";
        hintEl.textContent = t("navHint");
        document.body.appendChild(hintEl);
      };
      const hideHint = () => {
        if (hintEl !== null) { hintEl.remove(); hintEl = null; }
      };
      let ringRaf = null;
      const positionRing = () => {
        if (ringRaf !== null) return;
        ringRaf = window.requestAnimationFrame(() => {
          ringRaf = null;
          const nav = navBus.getSnapshot();
          if (!nav.active) { removeRing(); hideHint(); return; }
          const item = nav.items[nav.index];
          const row = item === undefined ? undefined : item.el;
          if (row === undefined || row.isConnected !== true) { removeRing(); hideHint(); return; }
          const r = row.getBoundingClientRect();
          const el = ensureRing();
          el.style.left = r.left + "px";
          el.style.top = r.top + "px";
          el.style.width = r.width + "px";
          el.style.height = r.height + "px";
          showHint();
        });
      };
      const scrollToNavRow = () => {
        const nav = navBus.getSnapshot();
        const item = nav.items[nav.index];
        const row = item === undefined ? undefined : item.el;
        if (row !== undefined) { try { row.scrollIntoView({ block: "nearest" }); } catch {} }
        positionRing();
      };
      const exitNav = () => {
        const nav = navBus.getSnapshot();
        if (!nav.active) return;
        navBus.set({ active: false, index: -1, order: [] });
        removeRing();
        hideHint();
      };
      const startNav = () => {
        if (navBus.getSnapshot().active) { exitNav(); showToast(t("navExited")); return; }
        showToast(t("navLocating"));
        const collapsed = document.querySelector("[data-sidebar-collapsed]") !== null;
        if (collapsed) {
          const layout = layoutService();
          if (layout !== undefined) {
            try { layout.toggleSidebar(); } catch {}
          }
        }
        const tryStart = (left) => {
          let fresh = null;
          try { fresh = readNavItems(); } catch (err) { console.error("dsh-session-hotkeys readNavItems:", err); }
          if (fresh !== null && fresh.items.length > 0) {
            const cur = snap().current;
            let index = cur === undefined ? -1 : fresh.order.indexOf("s:" + cur);
            if (index === -1) index = 0;
            navBus.set({ active: true, index, items: fresh.items, order: fresh.order });
            scrollToNavRow();
            showToast(t("navStarted", { n: fresh.items.length }));
            return;
          }
          if (left > 0) window.setTimeout(() => tryStart(left - 1), 110);
          else showToast(t("navNoRows"), "warn");
        };
        tryStart(12);
      };
      const moveNav = (delta) => {
        const nav = navBus.getSnapshot();
        if (!nav.active) return;
        let fresh = null;
        try { fresh = readNavItems(); } catch {}
        const items = fresh === null ? nav.items : fresh.items;
        const order = fresh === null ? nav.order : fresh.order;
        const anchor = nav.order[nav.index];
        let index = order.indexOf(anchor);
        if (index === -1) index = Math.min(nav.index, order.length - 1);
        if (index < 0) { exitNav(); return; }
        const next = index + delta;
        if (next < 0 || next >= order.length) return;
        navBus.set({ active: true, index: next, items, order });
        scrollToNavRow();
      };
      // Enter on a "show N more sessions" button: expand in place, keep nav mode,
      // and land the highlight on the first newly revealed session row (its
      // content still waits for the next Enter).
      const expandOverflow = () => {
        const nav = navBus.getSnapshot();
        const item = nav.items[nav.index];
        if (item === undefined || item.kind !== "overflow") return;
        const text = String(item.el.textContent ?? "");
        const m = /(\d+)/.exec(text);
        const n = m === null ? 0 : parseInt(m[1], 10);
        const expanding = item.el.getAttribute("aria-expanded") !== "true";
        const anchor = nav.order[nav.index];
        syntheticNavClick = true;
        try { item.el.dispatchEvent(new MouseEvent("click", { bubbles: true })); } finally { syntheticNavClick = false; }
        const retry = (left) => {
          let fresh = null;
          try { fresh = readNavItems(); } catch {}
          if (fresh !== null && fresh.items.length > 0) {
            let target = -1;
            if (expanding && n > 0) {
              const ni = fresh.order.indexOf(anchor);
              if (ni !== -1) target = Math.max(0, ni - n);
            }
            if (target === -1) {
              const ni = fresh.order.indexOf(anchor);
              target = ni !== -1 ? ni : Math.min(nav.index, fresh.order.length - 1);
            }
            navBus.set({ active: true, index: target, items: fresh.items, order: fresh.order });
            scrollToNavRow();
            showToast(expanding ? t("navExpanded") : t("navCollapsed"));
            return;
          }
          if (left > 0) window.setTimeout(() => retry(left - 1), 90);
          else { exitNav(); showToast(t("navUpdateFail"), "warn"); }
        };
        window.setTimeout(() => retry(8), 60);
      };
      const confirmNav = () => {
        const nav = navBus.getSnapshot();
        if (!nav.active) return;
        const item = nav.items[nav.index];
        if (item === undefined) { showToast(t("navRowGone"), "warn"); return; }
        if (item.kind === "overflow") { expandOverflow(); return; }
        const row = item.el;
        exitNav();
        if (row === undefined) { showToast(t("navRowGone"), "warn"); return; }
        const titleEl = row.querySelector('[class*="_title"]');
        const name = titleEl === null ? "" : String(titleEl.textContent ?? "").trim();
        try { row.dispatchEvent(new MouseEvent("click", { bubbles: true })); } catch {}
        showToast(t("navEntered", { name: name !== "" ? name : t("navRowAny") }));
      };
      const onScrollCapture = () => { if (navBus.getSnapshot().active) positionRing(); };
      // Internal synthetic clicks (row open, overflow expand) must not exit nav mode.
      let syntheticNavClick = false;
      const onDocClickCapture = () => {
        if (syntheticNavClick) return;
        exitNav();
      };
      window.addEventListener("scroll", onScrollCapture, true);
      document.addEventListener("click", onDocClickCapture, true);

      // ---------- key recording ----------
      const startRecording = (actionId) => {
        keyBus.set({ recording: actionId });
        showToast(t("recPrompt"));
      };
      const cancelRecording = () => {
        keyBus.set({ recording: null });
        showToast(t("recCanceled"));
      };
      const resetBindings = () => {
        bindings = {};
        for (const id of Object.keys(PLATFORM_DEFAULTS)) bindings[id] = { ...PLATFORM_DEFAULTS[id] };
        writeBindings();
        keysBus.set(bindings);
        showToast(t("resetDone", { platform: PLATFORM_NAME }));
      };
      const handleRecording = (event) => {
        const actionId = keyBus.getSnapshot().recording;
        if (actionId === null) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); cancelRecording(); return; }
        const digitAction = DIGIT_ACTIONS.indexOf(actionId) !== -1;
        const spec = specFromEvent(event, digitAction);
        if (spec === null) {
          event.preventDefault();
          event.stopPropagation();
          showToast(t("recUnsupported", { which: t(digitAction ? "recUnsupportedDigit" : "recUnsupportedKey") }), "warn");
          return;
        }
        if (spec.ctrl !== true && spec.alt !== true && spec.meta !== true) {
          event.preventDefault();
          event.stopPropagation();
          showToast(t("recNeedModifier"), "warn");
          return;
        }
        for (const id of Object.keys(bindings)) {
          if (id !== actionId && specEquals(bindings[id], spec)) {
            event.preventDefault();
            event.stopPropagation();
            showToast(t("recConflict", { label: t("label." + id) }), "warn");
            return;
          }
        }
        bindings[actionId] = spec;
        writeBindings();
        keysBus.set(bindings);
        keyBus.set({ recording: null });
        showToast(t("recSaved", { label: t("label." + actionId), spec: specText(spec) }));
        event.preventDefault();
        event.stopPropagation();
      };

      // ---------- global hotkeys ----------
      let lastHandled = null;
      const onKeydown = (event) => {
        if (event === lastHandled) return;
        lastHandled = event;
        // Chrome on Windows focuses the browser menu (⋮) when Alt is pressed alone,
        // which swallows subsequent Alt+digit presses; preventDefault on the bare
        // Alt key stops that behavior (AltGr is left alone via the ctrlKey guard).
        if (!IS_MAC && (event.code === "AltLeft" || event.code === "AltRight") && event.ctrlKey !== true) {
          event.preventDefault();
          return;
        }
        if (event.repeat === true) return;
        try {
          // Modal state: while the archive confirmation is open, all hotkeys
          // are suspended — only the dialog's own Enter/Esc flow runs.
          if (confirmBus.getSnapshot().open === true) return;
          if (handleModelMenuKey(event)) return;
          const navActive = navBus.getSnapshot().active === true;
          if (navActive) {
            if (event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); moveNav(1); return; }
            if (event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); moveNav(-1); return; }
            if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); confirmNav(); return; }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exitNav(); if (blurMatches(event)) focusChatTranscript(); return; }
          }
          if (keyBus.getSnapshot().recording !== null) { handleRecording(event); return; }
          // Second Esc while the transcript holds focus: toggle back to where
          // the first Esc came from.
          if (blurMatches(event) && tryRestoreFromTranscript(event)) return;
          // Esc with the panel open: close it and land on the transcript (the
          // panel's own Esc handler only fires when focus sits inside it).
          if (blurMatches(event) && uiBus.getSnapshot().open === true) {
            event.preventDefault();
            event.stopPropagation();
            uiBus.set({ open: false, rect: null });
            focusChatTranscript();
            return;
          }
          // Esc in the composer: leave the input and focus the chat transcript
          // so ↑↓ / PgUp / PgDn scroll the conversation (inputBlur binding).
          if (tryComposerBlur(event)) return;
          // Esc anywhere else: silently return focus to the transcript — no
          // preventDefault/stopPropagation here, so DSH's own Esc surfaces
          // (dialog close, popover dismiss) still do their job. Skipped while
          // a composer popup is open (its Esc belongs to it) and on screens
          // without a conversation (no warn-toast either).
          if (blurMatches(event) && !composerPopupOpen()) {
            const input = findComposerInput();
            if (input === null || document.activeElement !== input) {
              if (chatScrollerEl() !== null) focusChatTranscript();
            }
          }
          // Plain Enter on the model trigger or inside its menu opens the menu
          // / swaps the pane — auto-highlight the first entry right after.
          if (event.key === "Enter") {
            const trigger = findModelTrigger();
            if (trigger !== null) {
              const menu = modelMenuEl();
              const active = document.activeElement;
              if (active === trigger || (menu !== null && active instanceof Node && menu.contains(active))) {
                scheduleModelMenuAutofocus();
              }
            }
          }
          for (const id of Object.keys(bindings)) {
            const spec = bindings[id];
            if (!matchEvent(spec, event)) continue;
            if (spec.ctrl === true && spec.alt === true) {
              let altGraph = false;
              try { altGraph = event.getModifierState("AltGraph"); } catch {}
              if (altGraph) continue;
            }
            event.preventDefault();
            event.stopPropagation();
            exitNav();
            if (spec.digit === true) {
              const digitMatch = event.code.match(/^(?:Digit|Numpad)([1-9])$/);
              const n = digitMatch ? Number(digitMatch[1]) : NaN;
              if (id === "switchDigit") jumpTo(n);
              else if (id === "pinToggle") pinToggle(n);
              else jumpToPin(n);
            } else if (id === "prevSession") stepSession(-1);
            else if (id === "nextSession") stepSession(1);
            else if (id === "newSession") newSession();
            else if (id === "archiveSession") requestArchive();
            else if (id === "archiveList") openArchivedTab();
            else if (id === "renameSession") renameCurrent();
            else if (id === "navMode") startNav();
            else if (id === "panel") togglePanel();
            else if (id === "toggleSidebar") toggleSidebarPanel();
            else if (id === "searchFocus") focusSearch();
            else if (id === "focusModel") focusModel();
            else if (id === "inputFocus") focusComposerInput();
            else if (id === "sendAlternate") sendAlternate();
            return;
          }
          if (navActive) exitNav();
        } catch (err) {
          console.error("dsh-session-hotkeys keydown error:", err);
        }
      };
      window.addEventListener("keydown", onKeydown, true);
      document.addEventListener("keydown", onKeydown, true);
      // Belt and suspenders: some engines toggle the menu on Alt keyup.
      const onKeyupAlt = (event) => {
        if (!IS_MAC && (event.code === "AltLeft" || event.code === "AltRight") && event.ctrlKey !== true) event.preventDefault();
      };
      window.addEventListener("keyup", onKeyupAlt, true);
      document.addEventListener("keyup", onKeyupAlt, true);

      ctx.effect(() => () => {
        window.removeEventListener("keydown", onKeydown, true);
        document.removeEventListener("keydown", onKeydown, true);
        window.removeEventListener("keyup", onKeyupAlt, true);
        document.removeEventListener("keyup", onKeyupAlt, true);
        window.removeEventListener("scroll", onScrollCapture, true);
        document.removeEventListener("click", onDocClickCapture, true);
        document.removeEventListener("compositionstart", onCompositionStart, true);
        document.removeEventListener("compositionend", onCompositionEnd, true);
        removeRing();
        hideHint();
        hideToastDom();
      });

      // prune pins that no longer exist once the list is ready
      window.setTimeout(() => {
        const s = snap();
        if (s.ids.length === 0) return;
        let changed = false;
        for (let n = 1; n <= SLOT_COUNT; n++) {
          const key = String(n);
          if (pins[key] !== undefined && s.byId[pins[key]] === undefined) { delete pins[key]; changed = true; }
        }
        if (changed) { writePins(); pinsBus.set({ ...pins }); }
      }, 2500);

      // ---------- React UI ----------
      const useBus = (bus) => {
        const [value, setValue] = React.useState(bus.getSnapshot);
        React.useEffect(() => {
          const update = () => setValue(bus.getSnapshot());
          update();
          return bus.subscribe(update);
        }, [bus]);
        return value;
      };

      function KeyboardIcon() {
        return React.createElement("svg", { width: 15, height: 15, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
          React.createElement("rect", { x: 1, y: 3.75, width: 14, height: 8.5, rx: 1.5, stroke: "currentColor", strokeWidth: 1.25 }),
          React.createElement("rect", { x: 2.8, y: 5.5, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 5.1, y: 5.5, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 7.4, y: 5.5, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 9.7, y: 5.5, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 2.8, y: 8.35, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 5.1, y: 8.35, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 7.4, y: 8.35, width: 1.6, height: 1.6, rx: 0.35, fill: "currentColor" }),
          React.createElement("rect", { x: 9.55, y: 8.35, width: 4.4, height: 1.6, rx: 0.35, fill: "currentColor" })
        );
      }

      function ChatIcon() {
        return React.createElement("svg", { width: 13, height: 13, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
          React.createElement("path", { d: "M2.5 3.5h11v7h-6L4 13.5v-3H2.5v-7Z", stroke: "currentColor", strokeWidth: 1.3, strokeLinejoin: "round" })
        );
      }

      function FooterButton() {
        const open = useBus(uiBus).open === true;
        useBus(langBus); // re-render when the language changes
        return React.createElement("button", {
          className: "shk-pinbtn",
          "aria-label": t("appTitle"),
          "aria-expanded": open,
          title: t("footerTitle"),
          onClick: (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            uiBus.set({ open: !open, rect: { left: rect.left, bottom: rect.bottom } });
          }
        }, KeyboardIcon());
      }

      function OverlayView(props) {
        const ui = useBus(uiBus);
        const pinsValue = useBus(pinsBus);
        const bindingsValue = useBus(keysBus);
        const recording = useBus(keyBus).recording;
        const confirmValue = useBus(confirmBus);
        useBus(langBus); // re-render when the language changes
        // Tab labels follow the live binding's modifiers ("Alt+1-9" / "⌃⇧1-9").
        const modsTabLabel = (actionId) => {
          const spec = bindingsValue === undefined ? undefined : bindingsValue[actionId];
          const mods = modsText(spec);
          return (mods === "" ? "" : mods + (IS_MAC ? "" : "+")) + "1-9";
        };
        const archTabLabel = bindingsValue === undefined ? "" : specText(bindingsValue.archiveList);
        const current = props.useSessions === undefined ? undefined : props.useSessions((s) => s.current);
        const byId = props.useSessions === undefined ? undefined : props.useSessions((s) => s.byId);
        const [tick, setTick] = React.useState(0);
        const [popHeight, setPopHeight] = React.useState(0);
        const [tab, setTab] = React.useState("keys");
        const [pickerFor, setPickerFor] = React.useState(0);
        const [navIndex, setNavIndex] = React.useState(-1);
        const popRef = React.useRef(null);
        const confirmCancelRef = React.useRef(null);
        const confirmDangerRef = React.useRef(null);
        const rowSelector = (t) => t === "pos" || t === "pin"
          ? ".shk-row .shk-title, .shk-picker .shk-pick"
          : t === "archived"
            ? ".shk-row .shk-title, .shk-row .shk-mini"
            : ".shk-keyrow, .shk-tipbox .shk-mini";
        const titleOfLocal = (id) => {
          if (byId !== undefined && byId[id] !== undefined) {
            const entry = byId[id];
            if (typeof entry.displayTitle === "string" && entry.displayTitle !== "") return entry.displayTitle;
            if (typeof entry.title === "string" && entry.title !== "") return entry.title;
          }
          return id;
        };
        // Archived set: prefer the slot's standard useWorkspaces feed; fall back
        // to the workspaces service store (the 700ms tick keeps it fresh).
        const archivedIdsValue = props.useWorkspaces !== undefined
          ? props.useWorkspaces((s) => s.archivedSessionIds)
          : (workspaces !== undefined && workspaces.list !== undefined && typeof workspaces.list.getSnapshot === "function"
              ? workspaces.list.getSnapshot().archivedSessionIds
              : undefined);
        const archRows = [];
        {
          const archSet = new Set(archivedIdsValue === undefined || archivedIdsValue === null ? [] : archivedIdsValue);
          for (const id of archSet) {
            const entry = byId === undefined ? undefined : byId[id];
            if (entry !== undefined && (entry.blank === true || entry.origin === "subagent")) continue;
            archRows.push({
              id,
              title: entry === undefined ? id : titleOfLocal(id),
              updatedAt: entry !== undefined && typeof entry.updatedAt === "number" ? entry.updatedAt : 0
            });
          }
          archRows.sort((a, b) => b.updatedAt - a.updatedAt);
        }
        React.useEffect(() => {
          if (ui.open !== true) return;
          const timer = window.setInterval(() => setTick((v) => v + 1), 700);
          return () => window.clearInterval(timer);
        }, [ui.open]);
        // Measure the rendered panel so it can open upward from the sidebar
        // button without running off-screen; layout effect keeps it flicker-free.
        React.useLayoutEffect(() => {
          if (ui.open !== true) return;
          const pop = popRef.current;
          if (pop === null) return;
          const h = pop.getBoundingClientRect().height;
          setPopHeight((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
        }, [ui.open, tab, pickerFor]);
        React.useEffect(() => {
          if (ui.open !== true) return;
          const onDocClick = (e) => {
            const node = e.target;
            if (!(node instanceof Node)) return;
            if (popRef.current !== null && popRef.current.contains(node)) return;
            const btn = document.querySelector(".shk-pinbtn");
            if (btn !== null && btn.contains(node)) return;
            uiBus.set({ open: false, rect: null });
          };
          document.addEventListener("click", onDocClick, true);
          return () => document.removeEventListener("click", onDocClick, true);
        }, [ui.open]);
        React.useEffect(() => {
          if (ui.open !== true) return;
          const pop = popRef.current;
          if (pop !== null && !pop.contains(document.activeElement)) pop.focus({ preventScroll: true });
        }, [ui.open]);
        // “Open archived list” hotkey: land on the Archived page when the panel opens.
        React.useEffect(() => {
          if (ui.open === true && ui.openTab !== null && ui.openTab !== undefined) {
            setTab(ui.openTab);
            setPickerFor(0);
            setNavIndex(-1);
          }
        }, [ui.open, ui.openTab]);
        // Focus the danger button once the archive confirmation opens, so Enter
        // confirms immediately and Esc cancels.
        React.useEffect(() => {
          if (confirmValue.open !== true) return;
          const timer = window.setTimeout(() => {
            if (confirmDangerRef.current !== null) {
              try { confirmDangerRef.current.focus(); } catch {}
            }
          }, 0);
          return () => window.clearTimeout(timer);
        }, [confirmValue.open]);
        React.useEffect(() => {
          if (ui.open !== true) { setNavIndex(-1); return; }
          if (navIndex < 0) return;          const pop = popRef.current;
          if (pop === null) return;
          const sel = rowSelector(tab);
          const targets = pop.querySelectorAll(sel);
          if (targets.length === 0) return;
          const el = targets[Math.min(navIndex, targets.length - 1)];
          if (el === undefined) return;
          pop.querySelectorAll(".shk-nav-focus").forEach((node) => node.classList.remove("shk-nav-focus"));
          if (el.classList !== undefined && el.classList.contains("shk-keyrow")) el.classList.add("shk-nav-focus");
          el.focus({ preventScroll: true });
          const box = pop.querySelector(".shk-rows");
          if (box !== null) {
            const boxTop = box.getBoundingClientRect().top;
            const boxBottom = boxTop + box.clientHeight;
            const elTop = el.getBoundingClientRect().top;
            const elBottom = el.getBoundingClientRect().bottom;
            if (elTop < boxTop) box.scrollTop += elTop - boxTop;
            else if (elBottom > boxBottom) box.scrollTop += elBottom - boxBottom;
          }
        }, [navIndex, tab, ui.open, pickerFor]);
        React.useEffect(() => {
          if (ui.open !== true || navIndex !== -1) return;
          const pop = popRef.current;
          if (pop === null) return;
          const tabEl = pop.querySelector(".shk-tab-on");
          if (tabEl !== null && document.activeElement !== tabEl) tabEl.focus({ preventScroll: true });
        }, [tab, ui.open, navIndex]);
        const orderNow = tick >= 0 ? currentOrder() : null;
        const children = [];
        if (ui.open === true && ui.rect !== null) {
          const posRows = [];
          for (let n = 1; n <= SLOT_COUNT; n++) {
            const positional = orderNow === null ? undefined : orderNow[n - 1];
            const pid = positional === null || positional === undefined ? undefined : positional;
            const pinnedSlot = pid === undefined ? 0 : shiftSlotOf(pid);
            posRows.push(React.createElement("div", { key: "p" + n, className: "shk-row" },
              React.createElement("span", { className: "shk-num" }, String(n)),
              React.createElement("button", {
                className: "shk-title" + (pid === undefined ? " shk-empty" : ""),
                title: pid === undefined ? t("posRowEmptyTitle") : t("posRowTitle", { n }),
                onClick: () => {
                  if (pid !== undefined && sessions !== undefined) sessions.open(pid);
                  uiBus.set({ open: false, rect: null });
                }
              }, pid === undefined ? "—" : titleOfLocal(pid)),
              React.createElement("button", {
                className: "shk-mini" + (pinnedSlot !== 0 ? " shk-pin-set" : ""),
                title: pinnedSlot !== 0 ? t("pinSetTitle", { n: pinnedSlot }) : t("pinChooseTitle"),
                onClick: () => {
                  if (pid === undefined) return;
                  setPickerFor(pickerFor === n ? 0 : n);
                }
              }, pinnedSlot === 0 ? t("pinBtn") : t("pinnedBtn", { n: pinnedSlot }))
            ));
            if (pickerFor === n && pid !== undefined) {
              const picks = [];
              for (let k = 1; k <= SLOT_COUNT; k++) {
                const occupied = pinsValue[String(k)] !== undefined;
                picks.push(React.createElement("button", {
                  key: "k" + k,
                  className: "shk-pick" + (occupied ? " shk-pick-taken" : ""),
                  title: occupied ? t("pickTakenTitle", { n: k }) : t("pickFreeTitle", { n: k }),
                  onClick: () => { pinSession(pid, k); setPickerFor(0); }
                }, String(k)));
              }
              posRows.push(React.createElement("div", { key: "pick" + n, className: "shk-picker" }, picks));
            }
          }
          const pinRows = [];
          for (let n = 1; n <= SLOT_COUNT; n++) {
            const pinnedId = pinsValue[String(n)];
            pinRows.push(React.createElement("div", { key: "s" + n, className: "shk-row" },
              React.createElement("span", { className: "shk-num" }, String(n)),
              React.createElement("button", {
                className: "shk-title" + (pinnedId === undefined ? " shk-empty" : ""),
                title: pinnedId === undefined ? t("pinRowEmptyTitle") : t("pinRowTitle", { n }),
                onClick: () => {
                  if (pinnedId !== undefined && sessions !== undefined) sessions.open(pinnedId);
                  uiBus.set({ open: false, rect: null });
                }
              }, pinnedId === undefined ? "—" : titleOfLocal(pinnedId)),
              pinnedId === undefined ? null : React.createElement("button", {
                className: "shk-mini",
                title: t("unpinTitle"),
                onClick: () => unpin(n)
              }, t("unpinBtn"))
            ));
          }
          const keyRows = [];
          for (const [secId, ids] of KEY_SECTIONS) {
            keyRows.push(React.createElement("div", { key: "sec-" + secId, className: "shk-helpsec" }, t("sec." + secId)));
            for (const id of ids) {
              const isRec = recording === id;
              const label = t("label." + id);
              const desc = t("desc." + id);
              const full = t("full." + id);
              keyRows.push(React.createElement("div", { key: "k-" + id, className: "shk-keyrow" + (id === "archiveSession" ? " shk-keyrow-danger" : ""), tabIndex: -1, title: full },
                React.createElement("div", { className: "shk-keyline" },
                  React.createElement("span", { className: "shk-keyname" }, isRec ? t("recordingInRow") : label),
                  React.createElement("span", { className: "shk-keyval" }, specText(bindingsValue[id])),
                  React.createElement("button", {
                    className: "shk-mini" + (isRec ? " shk-rec" : ""),
                    title: isRec ? t("btnCancelRecTitle") : t("btnRebindTitle"),
                    onClick: () => {
                      if (isRec) cancelRecording();
                      else startRecording(id);
                    }
                  }, isRec ? t("btnCancel") : t("btnRebind"))
                ),
                isRec ? null : React.createElement("div", { className: "shk-keydesc" }, desc)
              ));
            }
          }
          keyRows.push(React.createElement("div", { key: "k-reset", className: "shk-tipbox" },
            React.createElement("span", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              t("resetTip", { platform: PLATFORM_NAME }),
              React.createElement("button", { className: "shk-mini", title: t("btnResetTitle"), onClick: resetBindings }, t("btnReset"))
            ),
            IS_MAC ? React.createElement("div", { style: { marginTop: 4, color: "var(--dsw-alias-label-tertiary)" } }, t("macModLegend")) : null
          ));
          const archEls = [];
          if (archRows.length === 0) {
            archEls.push(React.createElement("div", { key: "a-empty", className: "shk-diag-empty" }, t("archivedEmpty")));
          } else {
            for (const row of archRows) {
              archEls.push(React.createElement("div", { key: "a-" + row.id, className: "shk-row" },
                React.createElement("button", {
                  className: "shk-title",
                  title: t("archivedOpenTitle"),
                  onClick: () => {
                    if (sessions !== undefined) {
                      try { sessions.open(row.id); } catch (err) { console.error("dsh-session-hotkeys open archived:", err); }
                    }
                    uiBus.set({ open: false, rect: null, openTab: null });
                  }
                }, row.title),
                React.createElement("button", {
                  className: "shk-mini",
                  title: t("btnCopyId"),
                  onClick: () => copyText(row.id)
                }, t("btnCopyId"))
              ));
            }
          }
          archEls.push(React.createElement("div", { key: "a-note", className: "shk-tipbox" }, t("archivedNoRestore")));
          const width = 324;
          const estHeight = popHeight > 0 ? popHeight : 560;
          const left = Math.max(8, Math.min(ui.rect.left, window.innerWidth - width - 12));
          const top = Math.max(8, ui.rect.bottom - 6 - estHeight);
          children.push(React.createElement("div", {
            key: "pop",
            ref: popRef,
            className: "shk-pop",
            tabIndex: -1,
            style: { left: left + "px", top: top + "px" },
            onKeyDown: (e) => {
              if (e.key === "Escape") { uiBus.set({ open: false, rect: null }); return; }
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                const dir = e.key === "ArrowRight" ? 1 : -1;
                const at = TAB_ORDER.indexOf(tab);
                setTab(TAB_ORDER[(at + dir + TAB_ORDER.length) % TAB_ORDER.length]);
                setPickerFor(0);
                setNavIndex(-1);
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                e.preventDefault();
                e.stopPropagation();
                const pop = popRef.current;
                if (pop === null) return;
                const sel = rowSelector(tab);
                const targets = pop.querySelectorAll(sel);
                if (targets.length === 0) return;
                const dir = e.key === "ArrowDown" ? 1 : -1;
                const list = Array.prototype.slice.call(targets);
                const active = document.activeElement;
                let base = -1;
                if (active !== null && pop.contains(active)) {
                  const i = list.indexOf(active);
                  if (i !== -1) base = i;
                  else {
                    const row = active.closest(".shk-keyrow, .shk-row, .shk-tipbox");
                    if (row !== null) {
                      const j = list.findIndex((el) => el === row || row.contains(el));
                      if (j !== -1) base = j;
                    }
                  }
                }
                const next = Math.min(targets.length - 1, Math.max(0, base + dir));
                setNavIndex(next);
              }
            }
          },
            React.createElement("div", { className: "shk-head" },
              React.createElement("span", { className: "shk-head-icon", "aria-hidden": "true" }, KeyboardIcon()),
              React.createElement("span", { className: "shk-head-title" }, t("appTitle")),
              React.createElement("span", { className: "shk-head-esc", title: t("footerTitle") }, "Esc")
            ),
            React.createElement("div", { className: "shk-tabs" },
              React.createElement("button", { className: "shk-tab" + (tab === "keys" ? " shk-tab-on" : ""), onClick: () => { setTab("keys"); setPickerFor(0); setNavIndex(-1); } }, t("keysTab")),
              React.createElement("button", { className: "shk-tab" + (tab === "pos" ? " shk-tab-on" : ""), onClick: () => { setTab("pos"); setPickerFor(0); setNavIndex(-1); } }, modsTabLabel("switchDigit")),
              React.createElement("button", { className: "shk-tab" + (tab === "pin" ? " shk-tab-on" : ""), onClick: () => { setTab("pin"); setPickerFor(0); setNavIndex(-1); } }, modsTabLabel("pinToggle")),
              React.createElement("button", { className: "shk-tab" + (tab === "archived" ? " shk-tab-on" : ""), onClick: () => { setTab("archived"); setPickerFor(0); setNavIndex(-1); } }, archTabLabel)
            ),
            React.createElement("div", { className: "shk-rows" }, tab === "pos" ? posRows : tab === "pin" ? pinRows : tab === "archived" ? archEls : keyRows),
            tab === "pos" || tab === "pin" ? React.createElement("div", { className: "shk-hint" },
              tab === "pos"
                ? t("posHint", { switch: specText(bindingsValue.switchDigit) })
                : t("pinHint", { toggle: specText(bindingsValue.pinToggle), jump: specText(bindingsValue.jumpPin) }),
              React.createElement("div", { style: { marginTop: 2 } }, t("navKeysHint"))
            ) : tab === "archived" ? React.createElement("div", { className: "shk-hint" },
              React.createElement("div", null, t("archivedCount", { n: archRows.length })),
              React.createElement("div", { style: { marginTop: 2 } }, t("navKeysHint"))
            ) : React.createElement("div", { className: "shk-hint" }, t("navKeysHint")),
            current === undefined ? null : React.createElement("div", { className: "shk-current" }, t("currentLabel", { title: titleOfLocal(current) }))
          ));
        }
        if (confirmValue.open === true) {
          children.push(React.createElement("div", {
            key: "confirm",
            className: "shk-confirm-mask",
            onClick: (e) => { if (e.target === e.currentTarget) cancelArchive(); }
          },
            React.createElement("div", {
              className: "shk-confirm",
              role: "dialog",
              "aria-modal": "true",
              "aria-label": t("confirmArchiveTitle"),
              onKeyDown: (e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelArchive();
                  return;
                }
                if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Tab") {
                  e.preventDefault();
                  e.stopPropagation();
                  const active = document.activeElement;
                  const dangerEl = confirmDangerRef.current;
                  const cancelEl = confirmCancelRef.current;
                  const forward = e.key === "Tab" ? !e.shiftKey : e.key === "ArrowRight" || e.key === "ArrowDown";
                  const next = forward
                    ? (active === dangerEl ? cancelEl : dangerEl)
                    : (active === cancelEl ? dangerEl : cancelEl);
                  try { next.focus(); } catch {}
                }
              }
            },
              React.createElement("div", { className: "shk-confirm-strip" },
                React.createElement("span", { className: "shk-confirm-dot", "aria-hidden": "true" }),
                React.createElement("span", null, t("confirmArchiveTitle"))
              ),
              React.createElement("div", { className: "shk-confirm-body" },
                React.createElement("div", { className: "shk-confirm-session" },
                  React.createElement("span", { className: "shk-confirm-sessionicon", "aria-hidden": "true" }, ChatIcon()),
                  React.createElement("span", { className: "shk-confirm-sessiontitle" }, confirmValue.title)
                ),
                React.createElement("div", { className: "shk-confirm-text" }, t("confirmArchiveBody"))
              ),
              React.createElement("div", { className: "shk-confirm-actions" },
                React.createElement("button", { ref: confirmCancelRef, className: "shk-confirm-btn", onClick: cancelArchive }, t("btnCancel")),
                React.createElement("button", { ref: confirmDangerRef, className: "shk-confirm-btn shk-confirm-btn-danger", onClick: confirmArchiveNow }, t("btnConfirmArchive"))
              ),
              React.createElement("div", { className: "shk-confirm-hint" }, t("confirmHint"))
            )
          ));
        }
        if (children.length === 0) return null;
        return React.createElement(React.Fragment, null, children);
      }

      // ---------- registration ----------
      slots.inject("sidebar.footer.action", () => slots.register(
        { name: "sidebar.footer.action", id: "session-hotkeys-button", order: 0, label: t("appTitle") },
        FooterButton
      ));
      slots.inject("shell.overlay", () => slots.register(
        { name: "shell.overlay", id: "session-hotkeys-overlay", order: 0, label: t("overlayLabel") },
        OverlayView
      ));
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
