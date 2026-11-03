import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const root = new URL("../", import.meta.url);
const clientSource = readFileSync(new URL("lib/client.js", root), "utf8");

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.classNames = new Set();
    this.classList = {
      add: (...names) => names.forEach((name) => this.classNames.add(name)),
      remove: (...names) => names.forEach((name) => this.classNames.delete(name)),
      contains: (name) => this.classNames.has(name),
      toggle: (name, force) => {
        const shouldAdd = force === undefined ? !this.classNames.has(name) : force;
        if (shouldAdd) this.classNames.add(name);
        else this.classNames.delete(name);
        return shouldAdd;
      }
    };
    this.style = { setProperty() {} };
    this.isConnected = true;
    this.textContent = "";
  }

  set className(value) {
    this.classNames = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get className() {
    return [...this.classNames].join(" ");
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    child.isConnected = true;
    return child;
  }

  remove() {
    this.isConnected = false;
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
    }
  }

  querySelector(selector) {
    if (selector.includes("_title")) return this.titleElement ?? null;
    return null;
  }

  querySelectorAll() {
    return [];
  }

  matches() {
    return false;
  }

  closest() {
    return null;
  }

  contains(element) {
    return this.children.includes(element);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0, width: 100, height: 30 };
  }
}

function createEvent(code, modifiers) {
  const key = code.startsWith("Control") ? "Control"
    : code.startsWith("Shift") ? "Shift"
      : code.startsWith("Alt") ? "Alt"
        : code.startsWith("Digit") ? code.slice(5)
          : code;
  return {
    code,
    key,
    repeat: false,
    isComposing: false,
    keyCode: 0,
    target: null,
    ctrlKey: modifiers.ctrl === true,
    altKey: modifiers.alt === true,
    shiftKey: modifiers.shift === true,
    metaKey: modifiers.meta === true,
    preventDefault() {},
    stopPropagation() {},
    getModifierState(name) {
      return name === "AltGraph" ? false : false;
    }
  };
}

function mountPlugin(platform, { switchBinding = null, domOrder = null } = {}) {
  const oldGlobals = {
    document: globalThis.document,
    Element: globalThis.Element,
    Node: globalThis.Node
  };
  const listeners = new Map();
  const addListener = (target, type, handler) => {
    const key = `${target}:${type}`;
    const handlers = listeners.get(key) ?? [];
    handlers.push(handler);
    listeners.set(key, handlers);
  };
  const emit = (type, event) => {
    event.target = document.body;
    for (const target of ["window", "document"]) {
      for (const handler of listeners.get(`${target}:${type}`) ?? []) handler(event);
    }
  };

  const allRows = Array.from({ length: 11 }, (_, index) => {
    const row = new FakeElement("div");
    row.classList.add("_sessionRow");
    row.titleElement = new FakeElement("span");
    row.titleElement.classList.add("_title");
    row.titleElement.textContent = `Conversation ${index + 1}`;
    row.setAttribute("data-row-key", `session:session-${index + 1}`);
    return row;
  });
  let rows = (domOrder ?? allRows.map((_, index) => index + 1)).map((number) => allRows[number - 1]);
  const mutationObservers = [];
  class FakeMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.active = false;
      mutationObservers.push(this);
    }

    observe() { this.active = true; }
    disconnect() { this.active = false; }
    notify() { if (this.active) this.callback([]); }
  }
  const notifyMutations = () => mutationObservers.forEach((observer) => observer.notify());
  const body = new FakeElement("body");
  const document = {
    body,
    head: new FakeElement("head"),
    documentElement: new FakeElement("html"),
    activeElement: body,
    createElement: (tagName) => new FakeElement(tagName),
    querySelectorAll(selector) {
      if (selector.includes("_sessionRow")) return rows;
      return [];
    },
    querySelector() { return null; },
    getElementById() { return null; },
    addEventListener: (type, handler) => addListener("document", type, handler),
    removeEventListener() {}
  };
  globalThis.document = document;
  globalThis.Element = FakeElement;
  globalThis.Node = FakeElement;

  const storage = new Map(switchBinding === null ? [] : [[
    "dsh.session-hotkeys.keys",
    JSON.stringify({ switchDigit: switchBinding })
  ]]);
  const window = {
    navigator: {
      userAgent: platform === "mac" ? "Macintosh; Intel Mac OS X" : "Windows NT",
      language: "en-US"
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value))
    },
    addEventListener: (type, handler) => addListener("window", type, handler),
    removeEventListener() {},
    setTimeout: () => 1,
    clearTimeout() {},
    requestAnimationFrame: () => 1,
    MutationObserver: FakeMutationObserver
  };

  let definition;
  new Function("window", clientSource)(Object.assign(window, {
    __ModuleLoader__: { load: (value) => { definition = value; } }
  }));
  const react = {
    useState: () => [undefined, () => {}],
    useEffect() {},
    useRef: () => ({ current: null }),
    createElement: () => ({}),
    Fragment: "fragment"
  };
  const openedSessions = [];
  const sessions = {
    list: {
      getSnapshot: () => ({
        ids: allRows.map((_, index) => `session-${index + 1}`),
        byId: Object.fromEntries(allRows.map((row, index) => [`session-${index + 1}`, {
          title: row.titleElement.textContent,
          retainedBy: index === 0 ? { mainView: 1 } : {}
        }]))
      }),
      subscribe: () => () => {}
    }
  };
  const uiWorkspace = { openSession: (id) => openedSessions.push(id) };
  const slots = {
    inject: (_name, callback) => callback(),
    register() {}
  };
  const cleanups = [];
  definition.factory((name) => {
    if (name === "react") return react;
    throw new Error(`Unexpected dependency: ${name}`);
  }).apply({
    get: (name) => ({ slots, sessions, uiWorkspace }[name]),
    effect: (effect) => {
      const cleanup = effect();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }
  });

  let closed = false;
  return {
    get rows() { return rows; },
    get hintModeActive() { return document.documentElement.classList.contains("shk-position-hints"); },
    get activeMutationObservers() { return mutationObservers.filter((observer) => observer.active).length; },
    openedSessions,
    emit,
    reorderRows(numbers) {
      rows = numbers.map((number) => allRows[number - 1]);
      notifyMutations();
    },
    close() {
      if (closed) return;
      closed = true;
      for (const cleanup of cleanups) cleanup();
      globalThis.document = oldGlobals.document;
      globalThis.Element = oldGlobals.Element;
      globalThis.Node = oldGlobals.Node;
    }
  };
}

test("shows the first nine sidebar positions for the configured switch modifiers", () => {
  for (const platform of ["mac", "windows"]) {
    const plugin = mountPlugin(platform);
    try {
      if (platform === "mac") {
        plugin.emit("keydown", createEvent("ControlLeft", { ctrl: true }));
        assert.equal(plugin.rows[0].getAttribute("data-shk-position"), null);
        plugin.emit("keydown", createEvent("ShiftLeft", { ctrl: true, shift: true }));
      } else {
        plugin.emit("keydown", createEvent("ControlLeft", { ctrl: true }));
        assert.equal(plugin.rows[0].getAttribute("data-shk-position"), null);
        plugin.emit("keydown", createEvent("AltLeft", { alt: true }));
      }

      assert.deepEqual(
        plugin.rows.map((row) => row.getAttribute("data-shk-position")),
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, null]
      );

      const digitModifiers = platform === "mac" ? { ctrl: true, shift: true } : { alt: true };
      plugin.emit("keydown", createEvent("Digit4", digitModifiers));
      assert.deepEqual(plugin.openedSessions, ["session-4"]);

      const release = platform === "mac" ? "ShiftLeft" : "AltLeft";
      const modifiers = platform === "mac" ? { ctrl: true } : { ctrl: false, alt: false };
      plugin.emit("keyup", createEvent(release, modifiers));
      assert.ok(plugin.rows.every((row) => row.getAttribute("data-shk-position") === null));
    } finally {
      plugin.close();
    }
  }
});

test("follows custom modifiers and live sidebar order, then clears on window blur", () => {
  const plugin = mountPlugin("windows", {
    switchBinding: { ctrl: true, alt: true, shift: true, meta: false, digit: true, code: null },
    domOrder: [3, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11]
  });
  try {
    plugin.emit("keydown", createEvent("ControlLeft", { ctrl: true }));
    assert.ok(plugin.rows.every((row) => row.getAttribute("data-shk-position") === null));
    plugin.emit("keydown", createEvent("AltLeft", { ctrl: true, alt: true }));
    assert.ok(plugin.rows.every((row) => row.getAttribute("data-shk-position") === null));
    plugin.emit("keydown", createEvent("ShiftLeft", { ctrl: true, alt: true, shift: true }));
    assert.deepEqual(
      plugin.rows.map((row) => row.getAttribute("data-shk-position")),
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, null]
    );

    plugin.emit("keydown", createEvent("MetaLeft", { ctrl: true, alt: true, shift: true, meta: true }));
    assert.ok(plugin.rows.every((row) => row.getAttribute("data-shk-position") === null));
    plugin.emit("keydown", createEvent("ShiftLeft", { ctrl: true, alt: true, shift: true }));
    assert.deepEqual(
      plugin.rows.map((row) => row.getAttribute("data-shk-position")),
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, null]
    );

    plugin.reorderRows([2, 3, 1, 4, 5, 6, 7, 8, 9, 10, 11]);
    assert.deepEqual(
      plugin.rows.map((row) => row.titleElement.textContent),
      ["Conversation 2", "Conversation 3", "Conversation 1", "Conversation 4", "Conversation 5", "Conversation 6", "Conversation 7", "Conversation 8", "Conversation 9", "Conversation 10", "Conversation 11"]
    );
    assert.deepEqual(
      plugin.rows.map((row) => row.getAttribute("data-shk-position")),
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, null]
    );

    plugin.emit("keydown", createEvent("Digit1", { ctrl: true, alt: true, shift: true }));
    assert.deepEqual(plugin.openedSessions, ["session-2"]);
    plugin.emit("blur", {});
    assert.ok(plugin.rows.every((row) => row.getAttribute("data-shk-position") === null));
  } finally {
    plugin.close();
  }
});

test("clears active position badges and observer when the plugin is disposed", () => {
  const plugin = mountPlugin("windows");
  try {
    plugin.emit("keydown", createEvent("AltLeft", { alt: true }));
    assert.deepEqual(
      plugin.rows.map((row) => row.getAttribute("data-shk-position")),
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", null, null]
    );
    assert.equal(plugin.hintModeActive, true);
    assert.equal(plugin.activeMutationObservers, 1);

    plugin.close();

    assert.ok(plugin.rows.every((row) => row.getAttribute("data-shk-position") === null));
    assert.equal(plugin.hintModeActive, false);
    assert.equal(plugin.activeMutationObservers, 0);
  } finally {
    plugin.close();
  }
});
