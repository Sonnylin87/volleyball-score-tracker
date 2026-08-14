# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

排球隊得分紀錄板 (Volleyball Team Score Tracker) — a single-page React app for tracking
volleyball players' points and errors during a match, with an advanced rotation/lineup
analysis mode. All UI text, comments, and commit-facing strings in this codebase are in
Traditional Chinese (zh-Hant); keep new UI copy and comments in Chinese to match.

## Commands

```bash
npm install      # install dependencies
npm run dev      # start Vite dev server
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

There is no test suite and no linter configured in this repo (no test script, no ESLint/Prettier
config). Verify changes by running `npm run dev` and exercising the UI manually.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with Vite and deploys
`dist/` to GitHub Pages via `actions/deploy-pages`. The Pages source must be set to "GitHub
Actions" in repo settings. `vite.config.js` sets `base: "/volleyball-score-tracker/"` to match
the GitHub Pages subpath — update this if the repo is ever renamed or forked to a different path.

## Architecture

This is a small Vite + React 18 app with no router and no external state library — everything
is `useState`/`useEffect` plus `localStorage` persistence, all in three files under `src/`:

- **`src/main.jsx`** — entry point, mounts `<App />`.
- **`src/statsConfig.js`** — the single source of truth for what stat categories exist
  (`SCORE_STATS`, `ERROR_STATS`, combined as `ALL_STATS`), plus `emptyStats()` and
  `calcTotal(player)`. Both `App.jsx` and `AdvancedMode.jsx` import from here — **add or rename
  a stat type in this file only**, and both the basic scoreboard and advanced mode pick it up
  automatically (UI rendering, CSV export columns, and total calculation all iterate over these
  arrays rather than hardcoding stat names).
- **`src/App.jsx`** — the basic scoreboard: add/remove players, per-player +/- counters for each
  stat, team total, CSV export, and reset/clear actions. Owns the `players` array (each player is
  `{ id, name, ...stat keys }`) and persists it to `localStorage` under
  `volleyball-score-tracker-data` on every change. Also renders `AdvancedMode` (toggled via
  `showAdvanced` state) and passes it `players`/`setPlayers` so both modes share one player list
  and one set of stat totals.
- **`src/AdvancedMode.jsx`** — the rotation/lineup analysis mode (only reachable once at least
  one player exists). Owns its own `state` object (court `positions` array of 6 slots, event
  `actionLog`, libero fields) persisted separately to `localStorage` under
  `volleyball-advanced-mode-data`. Key concepts:
  - **`positions`** is a 6-element array of player IDs indexed 0-5, representing court slots
    1-6 (`POSITION_LAYOUT`): index 0 = position 1 (front-left, near net), going clockwise;
    front row = positions 1-3, back row = positions 4-6.
  - **`rotate(direction)`** shifts all 6 players one slot clockwise or counter-clockwise; it does
    *not* record any score/error — it's purely a lineup change. Rotating the libero into
    position 1 auto-swaps them back out (a libero can't legally be in the front row/serve).
  - **`recordStat(slotIndex, statKey, delta)`** is the only place that mutates player stats from
    this mode; it updates the shared `players` array (via `setPlayers`) *and* appends an entry to
    `actionLog` capturing the acting player, the server at the time, the full 6-player lineup
    (`rotationKey`/`rotationLabel`), and the team total after the event — this log is the raw
    data every analytics panel below derives from.
  - **Analytics are all derived, not stored**: rotation win-rates by single slot number (1-6),
    win-rates by *full lineup combination* (the "真正的輪轉陣型" — grouped by `rotationKey`, since
    the same slot number can hold different 6-player combinations across rotations), longest
    scoring/error streaks, and "clutch" performance after the team total reaches 20 — all computed
    by filtering/reducing `actionLog` on every render. There's no separate analytics module; if
    you add a new stat breakdown, follow the existing pattern of deriving it from `actionLog`
    inline in `AdvancedMode`.
  - The libero (自由球員) is tracked via `liberoPlayerId` (who is designated), `liberoOnCourt`
    (whether they're currently swapped in), and `liberoOriginalPlayerId` (who they replaced, so
    they can be swapped back). Libero swaps only ever touch position 4 (`swapInLibero`) or
    whichever slot they currently occupy (`swapOutLibero`).

### Data persistence

Both modes read/write `localStorage` directly (no shared storage utility) and load state lazily
via `useState(loadInitialPlayers)` / `useState(loadAdvancedState)`, with defensive parsing —
missing/malformed keys fall back to empty state rather than throwing. `App.jsx`'s loader also
normalizes player `id` to a string on load, since older saved data used numeric IDs and advanced
mode compares IDs as strings throughout. When adding new persisted fields, extend the loader's
fallback object and the parsed-shape mapping together so old localStorage data doesn't break.

### Styling

No CSS files or CSS-in-JS library — each component defines its styles as a template literal
string (`STYLES` in `App.jsx`, `ADV_STYLES` in `AdvancedMode.jsx`) injected via a `<style>` tag,
using a shared CSS custom-property palette (`--court-navy`, `--ball-yellow`, `--error-red`, etc.)
defined on `.vb-root`. Class names are prefixed `vb-` (basic mode) or `adv-` (advanced mode).

## 動作分析（測試版）

An optional pose-analysis feature lives outside the Vite/React app proper, in two parts that
deploy and version independently of everything above:

- **`backend/`** — a separate Flask + mediapipe API (not part of the npm build). Accepts an
  uploaded video, runs pose detection on wrist/ankle landmarks, and returns movement stats,
  peak/trough charts (base64 PNG), and a per-frame CSV as JSON. Deploys on its own to Render
  (`render.yaml` / `Procfile`, `gunicorn app:app`) — see `backend/README.md` for local run and
  deploy steps. It is not built, started, or deployed by anything in `package.json` or
  `.github/workflows/deploy.yml`; treat it as its own project that happens to live in this repo.
- **`public/pose-analysis.html`** — a standalone static page (plain HTML/CSS/vanilla JS, no
  React, no build step) that uploads a video to the backend's `/analyze` endpoint and renders the
  results. Vite copies anything under `public/` to `dist/` unchanged, so this ships to GitHub
  Pages alongside the SPA but is never bundled or imported by `src/`. It hardcodes the backend
  URL in a `BACKEND_URL` constant at the top of its `<script>` — update that after each backend
  redeploy (e.g. Render's free tier URL). `App.jsx` links to it via
  `` `${import.meta.env.BASE_URL}pose-analysis.html` `` so the link resolves correctly under the
  GitHub Pages subpath, opened in a new tab.
