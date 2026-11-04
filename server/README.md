# Server — NBA Analytics

All NBA data comes from **NBA.com** through the free [nba_api](https://github.com/swar/nba_api)
Python package. No API key or subscription is needed.

## Setup

Requires Node.js and Python 3.9+.

```bash
cd server
npm install
npm run setup:py   # creates server/.venv and installs nba_api
npm run dev
```

The API runs on port 4000 under `/api/`. The website (in `client/`) calls this server;
it never contacts NBA.com directly.

## How it works

```
React app  →  Express (/api)  →  python/nba_bridge.py  →  NBA.com (via nba_api)
                 short cache        throttle + disk cache
```

- **`python/nba_bridge.py`** is the only code that talks to NBA.com. Express starts it
  automatically and restarts it if it crashes.
- **Throttling:** one NBA.com request at a time, at least ~0.8–1.2 s apart.
- **Caching:** every response is saved to `server/.cache/nba/` (safe to delete). Current-season
  data refreshes every 15 min – 6 h depending on type; past seasons are kept for 30 days.
- **Failures:** failed requests are retried twice. If NBA.com is still down, the last saved copy
  is used (the site shows a notice), and for 60 s further requests use saved data immediately.
  Each page section loads separately, so one failed endpoint doesn't break the page.

## Endpoints

| Route | Data |
| --- | --- |
| `GET /players/search?q=` | Player search (all players since 1946, plus current rookies) |
| `GET /players/:id?season=` | Profile, season averages, advanced stats, league ranks |
| `GET /players/:id/career` | Season-by-season and career stats (regular season + playoffs) |
| `GET /players/:id/gamelog?season=` | Every game of a season |
| `GET /players/:id/shots?season=` | Shot chart + zone breakdown vs league average |
| `GET /players/:id/clutch?season=` | Clutch stats (last 5 min, within 5 pts) |
| `GET /players/compare?ids=a,b&season=` | Side-by-side stats with league percentiles |
| `GET /leaders?stat=&limit=&season=` | League leaders (pts, reb, ast, stl, blk, fg3m, per, ts_pct, usg_pct, net_rating, pie, def_rating) |
| `GET /teams?season=` | All 30 teams with ratings, pace, shooting and league ranks |
| `GET /teams/:id?season=` | Team profile, roster with stats, results, upcoming games, clutch |
| `GET /teams/:id/history` | Franchise record by season |
| `GET /teams/compare?ids=a,b&season=` | Side-by-side team stats |
| `GET /standings?season=` | Conference standings |
| `GET /games/recent` | Latest final scores |
| `GET /scoreboard` | Today's games (or the next game day) |

## Where the numbers come from

- Everything is real NBA.com data. Nothing is estimated or made up.
- **TS%, eFG%, usage %, offensive/defensive/net rating, pace, PIE** are NBA.com's own numbers.
- **PER** isn't published by NBA.com, so it is calculated here from NBA.com season totals using
  Hollinger's formula (league average = 15). For 2023-24 it gives Jokić 31.0, Giannis 29.8 and
  Dončić 28.1, matching Basketball-Reference.
- **Leaderboards and ranks** only include qualified players: at least half the games played so
  far and 15+ minutes per game.

## Limitations of NBA.com's endpoints

- **Unofficial and undocumented.** NBA.com doesn't support these endpoints for public use. They can
  change or break without notice; when that happens, updating nba_api (`.venv/bin/pip install -U nba_api`)
  usually fixes it.
- **Can block traffic.** NBA.com may slow down or block requests that come too fast, and often
  blocks cloud hosting providers (AWS, Heroku, etc.) entirely. It works from home/school networks.
  If you deploy this, expect to need a server that NBA.com doesn't block.
- **Slow first loads.** A first-time request can take a few seconds; after that it's cached.
- **Detailed stats start in 1996-97.** Older seasons only have basic totals (career and franchise history).
- **Data updates after games.** Box scores appear shortly after games end. Live in-game scores come
  from NBA's live scoreboard, which switches to the new day mid-morning Eastern time.
- **Player photos and team logos** load from NBA's image server (cdn.nba.com) in the visitor's browser.
- **Terms of use.** NBA.com data is for personal and educational use. A commercial app would need a
  licensed data provider.
