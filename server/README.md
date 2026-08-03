# Server — NBA Analytics

From project root run:

```bash
cd server
npm install
npm run dev
```

The server exposes minimal placeholder endpoints under `/api/`.

Environment variables
- Create a `.env` file in the `server` folder based on `.env.example`.
- To enable TheSportsDB integration for live scores and team events set `SPORTSDB_KEY` to your v1 API key.

Example `.env` values:

```
PORT=4000
DATABASE_URL=postgres://user:pass@localhost:5432/nba_analytics
SPORTSDB_KEY=123
```
