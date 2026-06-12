# Deployment Readiness — ARC-70

## Summary
The full-stack arcade app (`index.html` + `server.js` + `db.js` + SQLite) has been prepared for deployment to a Node.js host. The server serves static assets and the leaderboard/settings API from the same origin, eliminating CORS issues.

## Local Verification
- Server starts and binds to `PORT` / `HOST` env vars.
- `GET /`, `/game.js`, `/style.css` return 200.
- `GET /api/leaderboard` returns cached top-10 scores.
- `POST /api/scores` persists to SQLite and returns updated leaderboard.
- `GET /api/settings/:playerId` and `POST /api/settings` work correctly.

## Changes Made
1. `server.js` — `SETTINGS_FILE` now respects `SETTINGS_PATH` env var (needed for persistent disk mounts).
2. `Dockerfile` added — Node 22 slim image, exposes 3000, uses `/data` volume for DB and settings.
3. `.dockerignore` added — excludes `node_modules`, logs, `.git`, db files.
4. `render.yaml` added — Render blueprint for free-tier web service with 1 GB persistent disk.
5. `fly.toml` added — Fly.io app config with `/data` volume mount.

## Deployment Options

### Render.com (Recommended — Free Tier)
1. Create a new Web Service on Render and connect the GitHub repo.
2. Render will detect `render.yaml` if "Blueprints" are enabled, or set:
   - Build Command: `npm ci`
   - Start Command: `npm start`
   - Add a free 1 GB Disk mounted at `/data`.
3. Environment variables to set:
   - `DB_PATH=/data/leaderboard.db`
   - `SETTINGS_PATH=/data/settings.json`

### Fly.io
1. Install `flyctl` and run `fly launch --dockerfile Dockerfile`.
2. The `fly.toml` is ready; create a volume with `fly volumes create arcade_data --size 1`.
3. Ensure env vars `DB_PATH` and `SETTINGS_PATH` are set to `/data/*`.

### Railway.app
1. Create a project and link the GitHub repo.
2. Add a persistent volume mount at `/data`.
3. Set the same env vars as above.

## Blocker
No deployment-platform API token or CLI auth is available in this environment. I need a Render Deploy Hook, Fly API token, or Railway token (or dashboard access) to complete the live deployment.

## Next Step
Provide a deployment credential OR confirm that I should push these configs to the GitHub repo so you can complete the deploy from the platform dashboard.
