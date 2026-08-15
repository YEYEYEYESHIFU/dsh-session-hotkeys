# dsh-session-hotkeys

English | [简体中文](README.md)

Session hotkeys for DeepSeek Harness Web: manage sessions from the keyboard the way you switch browser tabs.

## Features

- **Platform-aware dual presets**: Windows / macOS are detected at startup and each gets its own default bindings; manual rebinds override the preset and "Reset" restores the current platform preset.

| Action | Windows preset | macOS preset (Chrome + Safari safe) |
| --- | --- | --- |
| Switch to Nth session | `Alt+1~9` | `Ctrl+1~9` |
| Pinned slot tri-state (pin/jump/unpin) | `Alt+Shift+1~9` | `Ctrl+Shift+1~9` |
| Jump to pinned slot | `Ctrl+Alt+1~9` | `Ctrl+Alt+1~9` |
| New session | `Alt+N` | `Ctrl+Alt+N` |
| Archive current session | `Alt+Shift+A` | `Ctrl+Alt+A` |
| Nav mode (↑↓ move · Enter enter · Esc cancel) | `Alt+\`` | `Ctrl+\`` |
| Open panel | `Alt+P` | `Ctrl+Alt+P` |
| Focus + clear search box | `Alt+Shift+F` | `Ctrl+Shift+F` |

Why the macOS preset looks this way: `Cmd+digits` switch browser tabs in Chrome and Safari; `Option` (=Alt) is the special-character key and hijacking it breaks typing; `Ctrl+N/P/F/B/A/E/K/D` are Emacs line-editing bindings in macOS text fields. The macOS preset therefore uses Ctrl-based combos only, avoiding all of the above.

- **`Alt+1~9` / `Ctrl+1~9`**: always switch to the Nth session by sidebar display order (independent of pins; follows grouping, promotion and collapsed groups — what you see is what you get).
- **Pinned slots** (Windows `Alt+Shift+1~9` / macOS `Ctrl+Shift+1~9`): tri-state semantics — empty slot pins the current session; a slot holding another session jumps to it; a slot holding the current session unpins it. Made for power users who keep many hot sessions and want one-key return.
- **Archive current session**: moves the current session into the sidebar's archive section in one key (recoverable from there; nothing is deleted).
- **New session**: in the current workspace, else the most recent one.
- **Nav mode**: moves a highlight ring over the **real sidebar session rows**; `↑↓` to move, `Enter` to enter (equivalent to clicking the row), `Esc` to cancel. No session switch happens before Enter.
- **Focus search**: focus the session search box and clear it (auto-expands a collapsed sidebar).
- **Every binding is rebindable**: record a new combination in the panel's "Keys" tab, with conflict detection and one-click reset to the platform preset. Bindings and pins persist in localStorage across refreshes and DSH restarts.
- **Three panel tabs**: `Alt+1-9 / Ctrl+1-9` positional list (pin any session to a chosen slot) / `Alt+Shift / Ctrl+Shift` pin management / `Keys` — rebinding doubles as the cheat sheet, with a one-line description per action and the full text on hover.
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
- On Windows the plugin prevents the default Alt-key behavior so Chrome no longer steals focus to the browser menu (⋮) and swallows Alt+digits; the tradeoff is that Alt-code entry on the numpad (e.g. `Alt+0167`) no longer works inside DSH Web input fields.

## Development

```sh
git clone https://github.com/<your-user>/dsh-session-hotkeys.git
cd dsh-session-hotkeys
npm run verify     # self-check: package structure, parseable client bundle, no external imports
```

To test locally, link the package into a profile and restart DSH Web.

## License

[MIT](LICENSE)
