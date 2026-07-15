---
name: verify
description: Build, launch and drive the Drakoryia Electron app to observe a change working end-to-end.
---

# Verifying Drakoryia

Electron + NestJS-in-main + Prisma/SQLite + React renderer (TanStack Router).

## Build

```bash
pnpm build        # prisma generate + tsc --noEmit + electron-vite build -> out/
```

`node-pty`, `better-sqlite3` and `@prisma/client` are native/CJS. electron-vite v5
auto-externalizes anything in `dependencies` (`build.externalizeDeps` defaults to
true), so no config change is needed when adding a native module. `pnpm add` runs
the root `postinstall` (`electron-builder install-app-deps`), which rebuilds those
binaries against Electron's ABI — pnpm's own "Ignored build scripts" warning for
node-pty is therefore harmless.

## Launch

Drive the built bundle straight over `file://` — no static server needed:

```js
const app = await electron.launch({
  executablePath: require('electron'),      // resolves to node_modules/.pnpm/electron@*/…/electron
  args: ['out/main/index.js'],
  cwd: '/home/samihenrique/work/devfy/drakoryia',
  env: { ...process.env, DISPLAY: ':0' }
})
```

The router uses **hash history** (`createHashHistory` in `src/renderer/src/router.tsx`)
precisely because `loadFile` gives the renderer
`location.pathname = /…/out/renderer/index.html`, which matches no route. Routes
live in the hash (`index.html#/workspaces/<id>/canvas`) and behave identically
under `file://` and the dev server. If you ever switch back to browser history,
every route renders "Not Found" in the packaged app.

Playwright is not a project dep — install it in a scratch dir (`npm i playwright`)
and always pass `executablePath`, or it errors with "Electron executablePath not
found". Host is Wayland; `DISPLAY=:0` (XWayland) works.

## Drive

```js
const win = await app.firstWindow()
await win.setViewportSize({ width: 1440, height: 900 })
win.on('pageerror', (e) => console.log('[pageerror]', e.message))
```

- Workspace card → `win.locator('article button').first()` (the card title is a
  button with a stretched `::after` overlay; the gear is a sibling).
- Canvas pane → `.react-flow__pane`; right-click it to open the context menu
  (`getByRole('menu', { name: 'Canvas actions' })`).
- Terminal text → `document.querySelector('.xterm-rows').textContent`.
- Seeding data: `win.evaluate(() => window.drakoryia.workspaces.create({…}))` uses
  the real preload API. The DB lives in Electron's userData and is shared with the
  user's own running instance — prefer an existing workspace over seeding, and
  don't assume a seeded row survives.

## Gotchas

- Sessions live in the main process, not the DB. `TerminalManager.disposeAll()`
  on `will-quit` SIGTERMs every pty, so closing the app leaves no strays —
  confirm with `pgrep -af 'claude --model'`.
- A `TerminalSnapshot` embeds `history` (the scrollback at fetch time). Caching
  that snapshot in React Query replays stale/empty output when the canvas is
  re-entered — `terminalQueryOptions` deliberately sets `gcTime: 0` /
  `refetchOnMount: 'always'`.
- Launching a CLI spawns a real `claude`/`codex` in the workspace directory and
  consumes real credits.
