# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.8.0] - 2026-09-05

### Added
- "Return focus to the chat area" (`Esc`, everywhere): hands keyboard focus to the conversation scroll area (`data-conversation-scroll`, made focusable with `tabindex="-1"` on first use; its keyboard-focus outline is suppressed, so the hand-off is visually silent) so ↑↓, PageUp/PageDown and Home/End scroll the transcript natively again. It works from any focus target and cancels the transient state on the way: the hotkeys panel closes, nav mode exits, the model menu closes without bouncing focus back to its trigger, and the composer input blurs — completing the round-trip with `Alt+Enter`. Untouched: composer suggestion popups (slash commands / @mentions) and IME composition keep their `Esc`, the draft and caret are never modified, the archive confirmation cancels exactly as before, and DSH's own Esc surfaces (dialog close, popover dismiss) still run. Rebindable from the panel's Keys tab like every action (recording `Esc` itself cancels the recorder — use Reset to restore the default).
- macOS: the Esc hand-off was screened against the macOS preset — it is the only modifier-free binding (no Chrome/Safari conflicts, IME untouched, ⌘/⌃+Esc never match), and the focus toast mentions the fn+↑↓ equivalent of PgUp/PgDn on compact Mac keyboards.

## [1.7.1] - 2026-09-05

### Fixed
- Alt+B (collapse/expand sidebar) no longer fails with "Could not toggle the sidebar (layout service not ready)" on a cold boot. v1.7.0 captured `ctx.get("layout")` once during `apply`, but ui-layout provides the service later than this plugin applies (ui-layout waits for the theme service; this plugin only waits for `slots`), so the capture raced to `undefined` and every press fell into the failure toast. The layout service is now resolved at keypress time, which also fixes the sidebar re-expand step in search focus (Alt+Shift+F) and nav mode.

## [1.7.0] - 2026-09-04

### Added
- Sidebar collapse/expand hotkey (`Alt+B` / `⌃⌥B`): toggles the left conversation sidebar through DSH's layout service — the same toggle the sidebar's own collapse/expand button drives (closed ⟷ default width; on narrow viewports the layout store flips its narrow-expanded state). Rebindable from the panel's Keys tab like every other action.

## [1.6.0] - 2026-08-23

### Added
- Panel layout: the panel now opens upward from the sidebar button, caps the list at a compact half-height (≈190px) and scrolls it internally, so the whole panel stays short and fully visible on any screen; the bulky diagnostics card was removed in favor of a compact footer (current-session line only).
- Archive confirmation: `Alt+Shift+A` now opens a themed confirmation card with the session title before archiving — Enter confirms, Esc (or a click on the mask) cancels, and every other hotkey is suspended while the dialog is open. Archiving stays one key, but is no longer one accidental keypress.
- "Focus back to input" hotkey (`Alt+Enter` / `⌃⌥Enter`): returns focus to the composer's chat textarea from anywhere — including while the model menu is open — moving the caret to the end of the draft only when the input was not already focused.
- "Alternate send" hotkey (`Alt+Shift+Enter` / `⌃⌥⇧Enter`): sends the current draft through DSH's own Ctrl/Cmd+Enter composer gesture, which the submission policy resolves to the opposite of the busy-Enter preference (queue↔steer) while the agent is running and to a normal send while idle — the setting itself stays untouched. Empty drafts are refused with a toast so the empty-draft steer-queue chord is never triggered by accident. `Enter` is now a recordable rebind key.
- "Focus model selector" hotkey (`Alt+M` / `⌃⌥M`): moves keyboard focus to the composer's model selector with a forced brand highlight ring, and bridges the model menu's keyboard gaps — DSH's menu handler goes blind after a pane swap (the clicked cell unmounts and focus falls to `<body>`, killing ↑↓ and Esc), and its first ArrowDown skips the first entry. The plugin now re-targets ↑↓ to the first/last menu entry whenever focus sits outside the menu, and Enter on the trigger or inside the menu auto-highlights the first entry (with brief retries while a pane loads), so the ring is visible immediately after the menu opens and after every pane swap instead of only after the first arrow press. Esc closes and returns focus to the trigger. The key also toggles: pressing it while the selector is focused (or its menu is open) returns focus to the composer's chat input with the caret at the end of the draft. The trigger is located through its `aria-haspopup="menu"` + `_trigger` class + title/aria-label fingerprint with localized fallbacks, so other menus (locale, agent-preset, enter-behavior) are never targeted.
- Panel redesign: brand-tinted header with an Esc hint chip, segmented tab control, keycap-style combo chips, card-based diagnostics footer, themed thin scrollbars, roomier row spacing and a subtle entrance animation — everything driven by DSH theme tokens.
- New "Archived" page in the panel (`Alt+Shift+U` / `⌃⌥U`, macOS `⌃⌥U`): lists archived sessions newest-first with open and copy-id actions, plus an archived count in the Diagnostics block. The archive warning texts now point at this page instead of a dead end.
- Note: DSH 0.1.1-rc.2 exposes no public unarchive API — sessions cannot be restored from the browser (verified against dsh-client-runtime / dsh-api-remotes / dsh-workspace type contracts); archiving never deletes session logs.

## [1.5.2] - 2026-08-21

### Fixed
- Numpad digits now work for every digit action: `Alt+Numpad1-9` (Windows) / `⌃⇧Numpad1-9` (macOS) switch to the Nth session, pin/unpin/jump slots, and can be recorded as custom bindings. Previously only top-row `Digit1-9` codes matched (issue #1). Note: NumLock must be on — with NumLock off the numpad reports navigation keys (End/Home/arrows) that cannot be mapped safely.

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
