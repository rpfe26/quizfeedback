# AGENTS.md

## Project
QuizFeedback - React 18 + TypeScript (Vite) front-end with a dependency-free Node 22 backend
(`server/*.mjs`, uses `node:sqlite`, `node:zlib`, `node:crypto`). No UI framework: plain
CSS Modules only.

## Commands
- `npm install` then `npm run dev:all` - Vite on 5180 + API on 3050.
- `npm run build` - `tsc && vite build` into `dist/`.
- `PORT=<port> node server/server.mjs` - serves `dist/` plus the `/api/*` routes from one port.
- `npm test` - server test suite (`node --test` on `tests/server/*.test.mjs`; 48 tests, no deps).
  The suite spawns a real server on port 18123 with `DATA_DIR` pointing at a temp dir, so it
  never touches `data/quizfeedback.db`. `DATA_DIR` env var overrides the data directory for
  any server run.
- `npm run dist:mac` / `npm run dist:win` - Electron desktop installers (output in `release/`).

## Runtime deps
The server (`server/*.mjs`) imports only `node:*` builtins plus local files. React/Vite/lucide
are build-time only, so the Docker runtime stage needs no `node_modules` at all.

## Styling conventions
- All theme values live as CSS custom properties in `src/index.css` (`:root`). Components
  consume them via `var(--...)`; avoid hardcoded colors in module files.
- Each component pairs a `*.module.css` next to it. Class names referenced as `styles.X` must
  be defined in the matching module or they render unstyled (no build error).
- Layout uses `rem` everywhere so the base `html { font-size }` acts as the global scale.
