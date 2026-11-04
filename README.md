# NBA Analytics

A full-stack NBA analytics app: player and team stats, advanced metrics, shot charts, game logs,
clutch stats, comparisons and standings, all from real NBA.com data (free, no API key).

- `client/`: React + Vite + Tailwind website
- `server/`: Express API plus a Python service that gets NBA.com data via [nba_api](https://github.com/swar/nba_api)

## Run it

You need Node.js and Python 3.9+.

```bash
npm install                      # from the project root, installs client + server
cd server && npm run setup:py    # one time: installs nba_api into server/.venv
```

Then use two terminals:

```bash
cd server && npm run dev         # API on http://localhost:4000
cd client && npm run dev         # website on http://localhost:5173
```

See [server/README.md](server/README.md) for how the data works and NBA.com's limitations.
