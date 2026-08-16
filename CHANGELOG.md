# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.5.1] - 2026-08-16

### Changed
- README: added Uninstall / Compatibility / Configuration / Permissions & data / Troubleshooting sections (bilingual) and a security-reporting line — radar listing compliance.
- package.json: declared peerDependencies for react and the injected @deepseek-ai client bundles.

## [1.5.0] - 2026-08-16

### Added
- Previous / next session hotkeys: `Alt+↑` / `Alt+↓` on Windows, `⌃⌥↑` / `⌃⌥↓` on macOS (Ctrl+Up/Down is Mission Control), stepping through the sidebar display order with wrap-around at both ends; both actions are rebindable from the panel.
- Diagnostics: the recent-hits list now shows the last 3 hits.

## [1.4.1] - 2026-08-16

### Changed
- Merged README.md and README.en.md into a single bilingual README (English first, 简体中文 second); README.en.md removed from the repo and the npm tarball.

## [1.4.0] - 2026-08-16

### Added
- Built-in diagnostics at the bottom of the hotkey panel: recent shortcut hits (label + combo) and sessions/workspaces/layout service availability, plus the current session id — self-service for "why didn't my shortcut fire".
- `dsh.client.immediately: true` — stage-one prefetch, so the shortcut listener registers with the first boot wave and never lags the UI it injects into.

### Changed
- Repo metadata: added `hotkeys` and `dsh` GitHub topics.

## [1.3.1] - 2026-08-16

First public release (npm + GitHub).

### Added
- Panel keyboard navigation: Up/Down move through rows with auto-scroll, Left/Right cycle the three tabs (with focus-restore fix for the tab-cycling focus loss).
- ⚠️ Danger warning on "Archive current session" (bilingual): DSH cannot unarchive yet — proceed with caution.
- Rebinding now requires at least one non-shift modifier (Ctrl / Alt / ⌘) to prevent breaking normal typing.

### Changed
- Shortcuts now fire while typing in inputs (no blur-first step needed).
- macOS: the plugin no longer intercepts the bare Option key (protects Option+letter special-character typing).
- "Nav mode" renamed to "Navigation mode" (EN).

## [1.0.0] - 2026-08-15

### Added
- Initial release: Alt+1-9 positional session switching, pin-slot tri-state (Alt+Shift+1-9), jump-to-pin (Ctrl+Alt+1-9), new-session (Alt+N), archive (Alt+Shift+A), rename (Alt+Shift+R), nav mode with highlight ring over real sidebar rows, panel (Alt+P), search focus (Alt+Shift+F).
- Conflict-free macOS presets (Ctrl+Shift+1-9 etc.) with native symbol rendering; Windows preset with AltGr guard.
- Rebindable Keys tab with conflict detection and one-click reset; bindings and pins persisted in localStorage with self-healing.
- Bilingual UI (zh/en) following the DSH locale setting; bilingual README.
