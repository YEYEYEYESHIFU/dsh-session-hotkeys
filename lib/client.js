// dsh-session-hotkeys — browser half (module-loader bundle)
//
// Session hotkeys for DeepSeek Harness Web. Default bindings:
//   Alt+1..9        switch to the Nth session by sidebar display order
//   Alt+Shift+1..9  pinned-slot tri-state: empty→pin current / holds other→jump / holds current→unpin
//   Ctrl+Alt+1..9   jump to pinned slot N without changing pins (AltGr-safe)
//   Alt+N           new session (current workspace, else most recent)
//   Alt+`           nav mode: ↑↓ moves the highlight ring over real sidebar rows, Enter enters, Esc cancels
//   Alt+P           open/close this panel (sidebar keyboard icon)
//   Alt+Shift+F     focus the session search box and clear it
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
    const ROW_SELECTORS = ['div[class*="_sessionRow"]', 'div[role="treeitem"]'];

    const WIN_DEFAULTS = {
      switchDigit: { ctrl: false, alt: true, shift: false, meta: false, digit: true, code: null },
      pinToggle: { ctrl: false, alt: true, shift: true, meta: false, digit: true, code: null },
      jumpPin: { ctrl: true, alt: true, shift: false, meta: false, digit: true, code: null },
      newSession: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "KeyN" },
      archiveSession: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "KeyA" },
      navMode: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "Backquote" },
      panel: { ctrl: false, alt: true, shift: false, meta: false, digit: false, code: "KeyP" },
      searchFocus: { ctrl: false, alt: true, shift: true, meta: false, digit: false, code: "KeyF" }
    };
    // macOS preset: all Ctrl-based (Option types special characters; Cmd+digits are
    // browser tab switching; Emacs line-editing Ctrl letters are avoided). Safe in
    // both Chrome and Safari on macOS.
    const MAC_DEFAULTS = {
      switchDigit: { ctrl: true, alt: false, shift: false, meta: false, digit: true, code: null },
      pinToggle: { ctrl: true, alt: false, shift: true, meta: false, digit: true, code: null },
      jumpPin: { ctrl: true, alt: true, shift: false, meta: false, digit: true, code: null },
      newSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyN" },
      archiveSession: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyA" },
      navMode: { ctrl: true, alt: false, shift: false, meta: false, digit: false, code: "Backquote" },
      panel: { ctrl: true, alt: true, shift: false, meta: false, digit: false, code: "KeyP" },
      searchFocus: { ctrl: true, alt: false, shift: true, meta: false, digit: false, code: "KeyF" }
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
    const ACTION_LABELS = {
      switchDigit: "顺序切换第 N 个会话",
      pinToggle: "固定槽位（三态）",
      jumpPin: "跳转固定槽位",
      newSession: "新建会话",
      archiveSession: "归档当前会话",
      navMode: "导航模式",
      panel: "打开面板",
      searchFocus: "聚焦搜索"
    };
    const DIGIT_ACTIONS = ["switchDigit", "pinToggle", "jumpPin"];
    // Keys tab display: section title + [action id, label, one-line desc, full desc (hover)]
    // Order by usefulness: everyday shortcuts first, pin management last.
    const KEY_SECTIONS = [
      ["常用", [
        ["navMode", "导航模式", "导航模式：↑↓ 选择 · Enter 进入", "进入会话导航模式：↑↓ 在会话行上移动高亮，Enter 进入（等同点击该行），Esc 或其它按键退出"],
        ["switchDigit", "顺序切换第 N 个会话", "按显示顺序切换第 N 个会话", "始终按侧边栏显示顺序切换第 N 个会话（与固定无关）"],
        ["newSession", "新建会话", "新建会话", "在当前工作区（否则最近工作区）新建会话"],
        ["panel", "打开面板", "打开 / 关闭本面板", "打开或关闭本快捷键面板"]
      ]],
      ["搜索与归档", [
        ["searchFocus", "聚焦搜索", "聚焦并清空搜索框", "聚焦会话搜索框并清空当前搜索内容"],
        ["archiveSession", "归档当前会话", "归档当前会话", "把当前会话移入侧边栏归档区（可在归档区找回），不会删除会话"]
      ]],
      ["固定槽位", [
        ["pinToggle", "固定槽位（三态）", "槽位三态：固定 / 跳转 / 取消", "固定槽位三态键：空槽位→固定当前会话；固定着别的会话→跳转过去；固定着当前会话→取消固定"],
        ["jumpPin", "跳转固定槽位", "纯跳转到固定槽位", "直接跳转到固定槽位 N，不改变任何固定（Windows 上 AltGr 除外）"]
      ]]
    ];

    const CSS = [
      ".shk-pinbtn{display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:28px;padding:0 8px;border:none;background:transparent;border-radius:50%;color:var(--dsw-alias-label-secondary);cursor:pointer}",
      ".shk-pinbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}",
      ".shk-pop{position:fixed;z-index:2100;width:312px;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;padding:8px;box-shadow:0 12px 32px rgba(0,0,0,.18);pointer-events:auto}",
      ".shk-pop-title{font-size:12px;font-weight:600;color:var(--dsw-alias-label-primary);padding:2px 6px 6px}",
      ".shk-tabs{display:flex;gap:4px;padding:0 0 6px}",
      ".shk-tab{flex:1;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;padding:3px 0;border-radius:6px;cursor:pointer;white-space:nowrap}",
      ".shk-tab:hover{color:var(--dsw-alias-label-primary)}",
      ".shk-tab.shk-tab-on{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}",
      ".shk-rows{max-height:290px;overflow:auto}",
      ".shk-row{display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:8px}",
      ".shk-row:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".shk-num{flex:none;width:16px;height:16px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}",
      ".shk-title{flex:1;min-width:0;border:none;background:transparent;color:var(--dsw-alias-label-primary);text-align:left;font-size:12px;padding:3px 4px;border-radius:6px;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-title:hover{background:var(--dsw-alias-bg-layer-2)}",
      ".shk-title.shk-empty{color:var(--dsw-alias-label-secondary)}",
      ".shk-mini{flex:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;padding:1px 6px;border-radius:6px;cursor:pointer;white-space:nowrap}",
      ".shk-mini:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}",
      ".shk-mini.shk-pin-set{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}",
      ".shk-mini.shk-rec{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}",
      ".shk-picker{display:flex;flex-wrap:wrap;gap:4px;padding:3px 0 6px 22px}",
      ".shk-pick{width:22px;height:20px;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:10px;cursor:pointer}",
      ".shk-pick:hover{color:var(--dsw-alias-label-primary)}",
      ".shk-pick.shk-pick-taken{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}",
      ".shk-hint{font-size:10px;color:var(--dsw-alias-label-secondary);padding:6px 6px 2px;line-height:1.5}",
      ".shk-current{font-size:10px;color:var(--dsw-alias-label-secondary);padding:2px 6px 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-helpsec{font-size:9px;font-weight:700;color:var(--dsw-alias-label-tertiary);padding:8px 6px 3px;letter-spacing:.06em}",
      ".shk-helpsec:first-child{padding-top:2px}",
      ".shk-keyname{flex:1;min-width:0;font-size:10px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-keyval{flex:none;font-family:ui-monospace,Consolas,monospace;font-size:10px;font-weight:700;color:var(--dsw-alias-brand-primary);padding:1px 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-layer-2);white-space:nowrap}",
      ".shk-keyrow{display:flex;flex-direction:column;gap:1px;padding:3px 6px;border-radius:8px}",
      ".shk-keyrow:hover{background:var(--dsw-alias-interactive-bg-hover)}",
      ".shk-keyline{display:flex;align-items:center;gap:8px;min-height:22px}",
      ".shk-keydesc{font-size:9.5px;color:var(--dsw-alias-label-tertiary);padding:0 0 2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".shk-tipbox{margin:8px 2px 0;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-size:9.5px;color:var(--dsw-alias-label-secondary);line-height:1.7}",
      ".shk-toast{position:fixed;left:50%;bottom:36px;transform:translateX(-50%);z-index:2200;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font-size:13px;padding:8px 16px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.16);pointer-events:none;max-width:70vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".shk-toast-warn{border-color:var(--dsw-alias-state-warn-primary)}",
      ".shk-ring{position:fixed;z-index:2050;pointer-events:none;border:2px solid var(--dsw-alias-brand-primary);border-radius:8px}",
      ".shk-navhint{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:2200;background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-primary);font-size:12px;padding:6px 14px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.16);pointer-events:none}"
    ].join("\n");

    function apply(ctx) {
      const sessions = ctx.get("sessions");
      const workspaces = ctx.get("workspaces");
      const layout = ctx.get("layout");
      const slots = ctx.get("slots");
      if (slots === undefined) return;

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
        if (typeof code === "string" && code.indexOf("Key") === 0) return code.slice(3);
        return code;
      };
      const specText = (spec) => {
        if (spec === null || spec === undefined) return "";
        const parts = [];
        if (spec.ctrl === true) parts.push("Ctrl");
        if (spec.alt === true) parts.push("Alt");
        if (spec.shift === true) parts.push("Shift");
        if (spec.meta === true) parts.push("Meta");
        parts.push(spec.digit === true ? "1~9" : codeLabelOf(spec.code));
        return parts.join("+");
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
              const ok = /^Key[A-Z]$/.test(spec.code) || spec.code === "Backquote" || /^F([1-9]|1[0-2])$/.test(spec.code);
              if (!ok) continue;
              out[id] = {
                ctrl: spec.ctrl === true, alt: spec.alt === true, shift: spec.shift === true, meta: spec.meta === true,
                digit: false, code: spec.code
              };
            }
          }
        } catch {}
        return out;
      };
      let bindings = readBindings();
      const writeBindings = () => {
        try { window.localStorage.setItem(KEYS_KEY, JSON.stringify(bindings)); } catch {}
      };
      const matchEvent = (spec, event) => {
        if (spec === null || spec === undefined) return false;
        if (event.ctrlKey !== spec.ctrl || event.altKey !== spec.alt || event.shiftKey !== spec.shift || event.metaKey !== spec.meta) return false;
        if (spec.digit === true) return typeof event.code === "string" && /^Digit[1-9]$/.test(event.code);
        return event.code === spec.code;
      };
      const specFromEvent = (event, digitAction) => {
        const code = event.code;
        if (digitAction) {
          if (typeof code !== "string" || !/^Digit[1-9]$/.test(code)) return null;
          return { ctrl: event.ctrlKey === true, alt: event.altKey === true, shift: event.shiftKey === true, meta: event.metaKey === true, digit: true, code: null };
        }
        if (typeof code !== "string") return null;
        const ok = /^Key[A-Z]$/.test(code) || code === "Backquote" || /^F([1-9]|1[0-2])$/.test(code);
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
      const uiBus = makeBus({ open: false, rect: null });
      const navBus = makeBus({ active: false, index: -1, order: [] });
      const keysBus = makeBus(bindings);
      const keyBus = makeBus({ recording: null });

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
      const jumpTo = (n) => {
        if (sessions === undefined) { showToast("会话服务不可用", "warn"); return; }
        const slot = slotOf(n);
        if (slot.id === undefined) { showToast("第 " + n + " 个位置没有会话", "warn"); return; }
        const wasCurrent = snap().current === slot.id;
        sessions.open(slot.id);
        showToast((wasCurrent ? "已在会话 " : "已切换到会话 ") + n + " · " + titleOf(slot.id));
      };
      const jumpToPin = (n) => {
        const s = snap();
        const pinnedId = pins[String(n)];
        if (pinnedId === undefined || s.byId[pinnedId] === undefined) { showToast("固定槽位 " + n + " 为空", "warn"); return; }
        if (sessions === undefined) { showToast("会话服务不可用", "warn"); return; }
        sessions.open(pinnedId);
        showToast("已切换到固定槽位 " + n + " · " + titleOf(pinnedId));
      };
      const unpin = (n) => {
        const key = String(n);
        if (pins[key] === undefined) return;
        delete pins[key];
        writePins();
        pinsBus.set({ ...pins });
        showToast("已取消固定槽位 " + n);
      };
      const pinSession = (sessionId, slot) => {
        const key = String(slot);
        if (pins[key] === sessionId) { unpin(slot); return; }
        pins[key] = sessionId;
        writePins();
        pinsBus.set({ ...pins });
        showToast("已固定槽位 " + slot + " ← " + titleOf(sessionId));
      };
      const pinToggle = (n) => {
        const s = snap();
        const key = String(n);
        const pinnedId = pins[key];
        const current = s.current;
        if (pinnedId === undefined) {
          if (current === undefined) { showToast("当前没有打开的会话，无法固定", "warn"); return; }
          pins[key] = current;
          writePins();
          pinsBus.set({ ...pins });
          showToast("已固定槽位 " + n + " ← " + titleOf(current));
          return;
        }
        if (pinnedId === current) { unpin(n); return; }
        if (s.byId[pinnedId] !== undefined) { jumpToPin(n); return; }
        delete pins[key];
        if (current !== undefined) {
          pins[key] = current;
          writePins();
          pinsBus.set({ ...pins });
          showToast("已固定槽位 " + n + " ← " + titleOf(current));
        } else {
          writePins();
          pinsBus.set({ ...pins });
          showToast("固定槽位 " + n + " 已清空（原会话已不存在）", "warn");
        }
      };
      const newSession = () => {
        if (workspaces === undefined) { showToast("工作区服务不可用", "warn"); return; }
        try {
          workspaces.startSession();
          showToast("新建会话");
        } catch (err) {
          console.error("dsh-session-hotkeys newSession:", err);
          showToast("新建会话失败", "warn");
        }
      };
      let archiving = false;
      const archiveCurrent = () => {
        const s = snap();
        const id = s.current;
        if (id === undefined) { showToast("当前没有打开的会话", "warn"); return; }
        if (workspaces === undefined) { showToast("工作区服务不可用", "warn"); return; }
        if (archiving) return;
        archiving = true;
        window.setTimeout(() => { archiving = false; }, 1200);
        const title = titleOf(id);
        workspaces.archiveSession(id).then(() => {
          showToast("已归档会话 · " + title);
        }).catch((err) => {
          console.error("dsh-session-hotkeys archive:", err);
          showToast("归档失败", "warn");
        }).finally(() => {
          window.setTimeout(() => { archiving = false; }, 200);
        });
      };
      const togglePanel = () => {
        const ui = uiBus.getSnapshot();
        if (ui.open === true) { uiBus.set({ open: false, rect: null }); return; }
        let rect = { left: 300, bottom: Math.max(140, window.innerHeight - 80) };
        const btn = document.querySelector(".shk-pinbtn");
        if (btn !== null) {
          const r = btn.getBoundingClientRect();
          rect = { left: r.left, bottom: r.bottom };
        }
        uiBus.set({ open: true, rect });
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
        if (collapsed && layout !== undefined) {
          try { layout.toggleSidebar(); } catch {}
        }
        const attempt = (left) => {
          if (focusSearchAndClear()) return;
          if (left > 0) window.setTimeout(() => attempt(left - 1), 110);
        };
        attempt(10);
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
        hintEl.textContent = "↑↓ 选择 · Enter 进入 · Esc 取消";
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
          const rows = queryRows();
          const row = rows[nav.index];
          if (row === undefined) { removeRing(); hideHint(); return; }
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
        const rows = queryRows();
        const row = rows[nav.index];
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
        if (navBus.getSnapshot().active) { exitNav(); showToast("已退出导航模式"); return; }
        showToast("导航模式：定位会话行…");
        const collapsed = document.querySelector("[data-sidebar-collapsed]") !== null;
        if (collapsed && layout !== undefined) {
          try { layout.toggleSidebar(); } catch {}
        }
        const tryStart = (left) => {
          let order = null;
          try { order = readDomOrder(); } catch (err) { console.error("dsh-session-hotkeys readDomOrder:", err); }
          if (order !== null && order.length > 0) {
            cachedOrder = order;
            const cur = snap().current;
            let index = cur === undefined ? -1 : order.indexOf(cur);
            if (index === -1) index = 0;
            navBus.set({ active: true, index, order });
            scrollToNavRow();
            showToast("导航模式 · " + order.length + " 个会话 · ↑↓ 移动，Enter 进入");
            return;
          }
          if (left > 0) window.setTimeout(() => tryStart(left - 1), 110);
          else showToast("没有找到可导航的会话行（请展开侧边栏后重试）", "warn");
        };
        tryStart(12);
      };
      const moveNav = (delta) => {
        const nav = navBus.getSnapshot();
        if (!nav.active) return;
        let fresh = null;
        try { fresh = readDomOrder(); } catch {}
        const order = fresh ?? nav.order;
        const anchorId = nav.order[nav.index];
        let index = order.indexOf(anchorId);
        if (index === -1) index = Math.min(nav.index, order.length - 1);
        if (index < 0) { exitNav(); return; }
        const next = index + delta;
        if (next < 0 || next >= order.length) return;
        navBus.set({ active: true, index: next, order });
        scrollToNavRow();
      };
      const confirmNav = () => {
        const nav = navBus.getSnapshot();
        if (!nav.active) return;
        const rows = queryRows();
        const row = rows[nav.index];
        exitNav();
        if (row === undefined) { showToast("目标行已不存在", "warn"); return; }
        const titleEl = row.querySelector('[class*="_title"]');
        const name = titleEl === null ? "" : String(titleEl.textContent ?? "").trim();
        try { row.dispatchEvent(new MouseEvent("click", { bubbles: true })); } catch {}
        showToast("进入会话 · " + (name !== "" ? name : "所选行"));
      };
      const onScrollCapture = () => { if (navBus.getSnapshot().active) positionRing(); };
      const onDocClickCapture = () => { exitNav(); };
      window.addEventListener("scroll", onScrollCapture, true);
      document.addEventListener("click", onDocClickCapture, true);

      // ---------- key recording ----------
      const startRecording = (actionId) => {
        keyBus.set({ recording: actionId });
        showToast("请按下新组合键（Esc 取消）…");
      };
      const cancelRecording = () => {
        keyBus.set({ recording: null });
        showToast("已取消改键");
      };
      const resetBindings = () => {
        bindings = {};
        for (const id of Object.keys(PLATFORM_DEFAULTS)) bindings[id] = { ...PLATFORM_DEFAULTS[id] };
        writeBindings();
        keysBus.set(bindings);
        showToast("已恢复 " + PLATFORM_NAME + " 默认键位");
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
          showToast("不支持：请用 字母 / " + (digitAction ? "数字 1-9" : "F1-F12 / `") + " 组合", "warn");
          return;
        }
        for (const id of Object.keys(bindings)) {
          if (id !== actionId && specEquals(bindings[id], spec)) {
            event.preventDefault();
            event.stopPropagation();
            showToast("与「" + ACTION_LABELS[id] + "」冲突，请换一个组合", "warn");
            return;
          }
        }
        bindings[actionId] = spec;
        writeBindings();
        keysBus.set(bindings);
        keyBus.set({ recording: null });
        showToast("已保存：" + ACTION_LABELS[actionId] + " → " + specText(spec));
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
        if ((event.code === "AltLeft" || event.code === "AltRight") && event.ctrlKey !== true) {
          event.preventDefault();
          return;
        }
        if (event.repeat === true) return;
        try {
          const navActive = navBus.getSnapshot().active === true;
          if (navActive) {
            if (event.key === "ArrowDown") { event.preventDefault(); event.stopPropagation(); moveNav(1); return; }
            if (event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); moveNav(-1); return; }
            if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); confirmNav(); return; }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); exitNav(); return; }
          }
          if (keyBus.getSnapshot().recording !== null) { handleRecording(event); return; }
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
              const n = Number(event.code.slice(5));
              if (id === "switchDigit") jumpTo(n);
              else if (id === "pinToggle") pinToggle(n);
              else jumpToPin(n);
            } else if (id === "newSession") newSession();
            else if (id === "archiveSession") archiveCurrent();
            else if (id === "navMode") startNav();
            else if (id === "panel") togglePanel();
            else if (id === "searchFocus") focusSearch();
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
        if ((event.code === "AltLeft" || event.code === "AltRight") && event.ctrlKey !== true) event.preventDefault();
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

      function FooterButton() {
        const open = useBus(uiBus).open === true;
        return React.createElement("button", {
          className: "shk-pinbtn",
          "aria-label": "会话快捷键",
          "aria-expanded": open,
          title: "会话快捷键面板（键位可在面板「按键」页自定义）",
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
        const current = props.useSessions === undefined ? undefined : props.useSessions((s) => s.current);
        const byId = props.useSessions === undefined ? undefined : props.useSessions((s) => s.byId);
        const [tick, setTick] = React.useState(0);
        const [tab, setTab] = React.useState("keys");
        const [pickerFor, setPickerFor] = React.useState(0);
        const popRef = React.useRef(null);
        const titleOfLocal = (id) => {
          if (byId !== undefined && byId[id] !== undefined) {
            const entry = byId[id];
            if (typeof entry.displayTitle === "string" && entry.displayTitle !== "") return entry.displayTitle;
            if (typeof entry.title === "string" && entry.title !== "") return entry.title;
          }
          return id;
        };
        React.useEffect(() => {
          if (ui.open !== true) return;
          const timer = window.setInterval(() => setTick((v) => v + 1), 700);
          return () => window.clearInterval(timer);
        }, [ui.open]);
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
                title: pid === undefined ? "该位置暂无会话" : "按显示顺序第 " + n + " 个 · 点击切换",
                onClick: () => {
                  if (pid !== undefined && sessions !== undefined) sessions.open(pid);
                  uiBus.set({ open: false, rect: null });
                }
              }, pid === undefined ? "—" : titleOfLocal(pid)),
              React.createElement("button", {
                className: "shk-mini" + (pinnedSlot !== 0 ? " shk-pin-set" : ""),
                title: pinnedSlot !== 0 ? "已固定在槽位 " + pinnedSlot + " · 点击改槽位" : "固定到 1-9 的某个固定槽位",
                onClick: () => {
                  if (pid === undefined) return;
                  setPickerFor(pickerFor === n ? 0 : n);
                }
              }, pinnedSlot === 0 ? "固定" : "已固定" + pinnedSlot)
            ));
            if (pickerFor === n && pid !== undefined) {
              const picks = [];
              for (let k = 1; k <= SLOT_COUNT; k++) {
                const occupied = pinsValue[String(k)] !== undefined;
                picks.push(React.createElement("button", {
                  key: "k" + k,
                  className: "shk-pick" + (occupied ? " shk-pick-taken" : ""),
                  title: occupied ? "槽位 " + k + " 已占用（点击替换）" : "固定到槽位 " + k,
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
                title: pinnedId === undefined ? "空槽位（固定当前会话）" : "固定槽位 " + n + " · 点击切换",
                onClick: () => {
                  if (pinnedId !== undefined && sessions !== undefined) sessions.open(pinnedId);
                  uiBus.set({ open: false, rect: null });
                }
              }, pinnedId === undefined ? "—" : titleOfLocal(pinnedId)),
              pinnedId === undefined ? null : React.createElement("button", {
                className: "shk-mini",
                title: "取消固定",
                onClick: () => unpin(n)
              }, "清除")
            ));
          }
          const keyRows = [];
          for (const [secTitle, items] of KEY_SECTIONS) {
            keyRows.push(React.createElement("div", { key: "sec-" + secTitle, className: "shk-helpsec" }, secTitle));
            for (const [id, label, desc, full] of items) {
              const isRec = recording === id;
              keyRows.push(React.createElement("div", { key: "k-" + id, className: "shk-keyrow", title: full },
                React.createElement("div", { className: "shk-keyline" },
                  React.createElement("span", { className: "shk-keyname" }, isRec ? "正在录制：请按新组合键（Esc 取消）…" : label),
                  React.createElement("span", { className: "shk-keyval" }, specText(bindingsValue[id])),
                  React.createElement("button", {
                    className: "shk-mini" + (isRec ? " shk-rec" : ""),
                    title: isRec ? "点击取消录制" : "录制新组合键",
                    onClick: () => {
                      if (isRec) cancelRecording();
                      else startRecording(id);
                    }
                  }, isRec ? "取消" : "改键")
                ),
                isRec ? null : React.createElement("div", { className: "shk-keydesc" }, desc)
              ));
            }
          }
          keyRows.push(React.createElement("div", { key: "k-reset", className: "shk-tipbox" },
            React.createElement("span", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              "当前平台预设：" + PLATFORM_NAME + "。键位与固定关系都保存在本浏览器。悬停每行可看完整说明。",
              React.createElement("button", { className: "shk-mini", title: "恢复默认键位", onClick: resetBindings }, "恢复默认")
            )
          ));
          const width = 312;
          const height = 500;
          const left = Math.max(8, Math.min(ui.rect.left, window.innerWidth - width - 12));
          const top = Math.max(8, Math.min(ui.rect.bottom + 6, window.innerHeight - height - 12));
          children.push(React.createElement("div", {
            key: "pop",
            ref: popRef,
            className: "shk-pop",
            style: { left: left + "px", top: top + "px" },
            onKeyDown: (e) => { if (e.key === "Escape") uiBus.set({ open: false, rect: null }); }
          },
            React.createElement("div", { className: "shk-pop-title" }, "会话快捷键"),
            React.createElement("div", { className: "shk-tabs" },
              React.createElement("button", { className: "shk-tab" + (tab === "keys" ? " shk-tab-on" : ""), onClick: () => { setTab("keys"); setPickerFor(0); } }, "按键"),
              React.createElement("button", { className: "shk-tab" + (tab === "pos" ? " shk-tab-on" : ""), onClick: () => { setTab("pos"); setPickerFor(0); } }, "Alt+1-9"),
              React.createElement("button", { className: "shk-tab" + (tab === "pin" ? " shk-tab-on" : ""), onClick: () => { setTab("pin"); setPickerFor(0); } }, "Alt+Shift")
            ),
            React.createElement("div", { className: "shk-rows" }, tab === "pos" ? posRows : tab === "pin" ? pinRows : keyRows),
            tab === "pos" || tab === "pin" ? React.createElement("div", { className: "shk-hint" }, tab === "pos"
              ? specText(bindingsValue.switchDigit) + " 始终按显示顺序切换 ·「固定」把该会话放入独立固定槽位"
              : specText(bindingsValue.pinToggle) + "：空→固定当前 / 指着别的→跳转 / 指着当前→取消 · " + specText(bindingsValue.jumpPin) + " 纯跳转") : null,
            current === undefined ? null : React.createElement("div", { className: "shk-current" }, "当前：" + titleOfLocal(current))
          ));
        }
        if (children.length === 0) return null;
        return React.createElement(React.Fragment, null, children);
      }

      // ---------- registration ----------
      slots.inject("sidebar.footer.action", () => slots.register(
        { name: "sidebar.footer.action", id: "session-hotkeys-button", order: 0, label: "会话快捷键" },
        FooterButton
      ));
      slots.inject("shell.overlay", () => slots.register(
        { name: "shell.overlay", id: "session-hotkeys-overlay", order: 0, label: "会话快捷键浮层" },
        OverlayView
      ));
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
