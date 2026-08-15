# dsh-session-hotkeys

English | [简体中文](README.md)

Session hotkeys for DeepSeek Harness Web: manage sessions from the keyboard the way you switch browser tabs.

## Features

- **`Alt+1~9`**: always switch to the Nth session by sidebar display order (independent of pins; follows grouping, promotion and collapsed groups — what you see is what you get).
- **`Alt+Shift+1~9`**: independent pinned slots with tri-state semantics — empty slot pins the current session; a slot holding another session jumps to it; a slot holding the current session unpins it. Made for power users who keep many hot sessions and want one-key return.
- **`Ctrl+Alt+1~9`**: pure jump to pinned slot N without changing pins (AltGr-safe).
- **`Alt+N`**: new session (current workspace, else the most recent one).
- **`Alt+\``** (the key left of `1`): session nav mode — moves a highlight ring over the **real sidebar session rows**; `↑↓` to move, `Enter` to enter (equivalent to clicking the row), `Esc` to cancel. No session switch happens before Enter.
- **`Alt+P`**: open/close the hotkey panel.
- **`Alt+Shift+F`**: focus the session search box and clear it (auto-expands a collapsed sidebar).
- **Every binding is rebindable**: record a new combination in the panel's "Keys" tab, with conflict detection and one-click reset. Bindings and pins persist in localStorage across refreshes and DSH restarts.
- **Three panel tabs**: `Alt+1-9` positional list (pin any session to a chosen slot) / `Alt+Shift` pin management / `Keys` — rebinding doubles as the cheat sheet, with a one-line description per action and the full text on hover.
- **Clean lifecycle**: all event listeners, styles and DOM nodes are removed on unload.

## Install

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

## Usage

1. `Alt+1~9` jumps straight to the Nth sidebar session; `Alt+Shift+N` pins the current session to slot N.
2. `Alt+\`` enters nav mode: `↑↓` moves the highlight ring, `Enter` enters, `Esc` cancels.
3. Click the keyboard icon at the sidebar foot (or press `Alt+P`) to open the panel; rebind anything in the "Keys" tab.

## How it works

A browser-only Cordis bundle. It reads the session list and current session from the `sessions` service, switches with `sessions.open()`, creates sessions via `workspaces.startSession()`, and expands the sidebar via `layout.toggleSidebar()` when needed. Session display order is read **directly from the rendered sidebar DOM** (row titles mapped back to session ids), so it always matches the grouping/sorting/collapse state the user sees. The nav-mode ring and hint are mounted on `document.body`, independent of any slot render chain. No server data channel, no server-side state.

## Known limitations

- Session order and search-box targeting depend on DSH Web's DOM structure (CSS class names), with fuzzy fallbacks. If a DSH Web upgrade breaks them, please upgrade this plugin or open an issue mentioning your DSH version.
- Key recording accepts letters, `` ` ``, F1–F12, and (for digit actions) digits 1–9.
- Pins and bindings are stored per browser origin; clearing site data resets them.

## Development

```sh
git clone https://github.com/<your-user>/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # self-check: package structure, parseable client bundle, no external imports
```

To test locally, link the package into a profile and restart DSH Web.

## License

[MIT](LICENSE)
