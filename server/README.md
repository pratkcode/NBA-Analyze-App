# Server — NBA Analytics

```bash
cd server
npm install
cp .env.example .env   # then add your API key
npm run dev
```

The API runs on port 4000 under `/api/`.

## Data sources

| Data | Source | Needs |
| --- | --- | --- |
| Players, teams, games, schedules | [balldontlie](https://www.balldontlie.io) | Free API key (5 requests/min) |
| Season averages, league leaders | balldontlie | Paid GOAT tier |
| Today's scoreboard / live scores | ESPN public scoreboard | Nothing |

Get a key at https://app.balldontlie.io and put it in `server/.env`:

```
BALLDONTLIE_API_KEY=your-key-here
```

If a key is missing, or data isn't included in your plan, the API returns a clear
error message (e.g. `{"error": "This data is not included in your balldontlie plan."}`)
and the app shows that message. It never shows made-up numbers.
