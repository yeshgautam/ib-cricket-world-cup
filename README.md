# IB Cricket League 2027

A static, zero-build site for a 12-team fictional ODI league. Everything —
the fixture list, ball-by-ball match simulation, scorecards, and the points
table — is generated in the browser from plain JS data files, deterministically,
so results never change on reload unless the underlying data changes.

## Pages

- `index.html` — the "MATCHES" home page (styled after the Google cricket
  score box). Browse by day, or filter to one team. A **Simulate next day**
  button advances the season's reveal horizon by one day-of-matches;
  **Simulate season** reveals every remaining match at once. Progress is
  saved in `localStorage`, so it persists across reloads until you hit Reset.
- `match.html?id=mNNN` — full match detail: Summary (Player of the Match +
  condensed innings), Scorecard (full batting/bowling tables per team, fall
  of wickets), and Commentary (wickets & sixes, latest first).
- `standings.html` — points table (win = 2, tie/no result = 1, loss = 0),
  ranked by points then Net Run Rate, as of however far the season has been
  simulated.

## How the league is built

- **Teams**: `js/data.js` — 12 national teams with a 0–100 rating loosely
  reflecting recent (2023–2026) ODI form/rankings, plus a home venue.
- **Squads**: also `js/data.js` — 11 placeholder players per team
  (`{CODE} 1`…`{CODE} 11`), generated from a role template (openers, top
  order, all-rounders, keeper, bowlers) so each player has a batting and
  bowling skill derived from the team rating. **Swap in real squads later**
  by editing `ROLE_TEMPLATE`/`buildSquad` in `js/data.js` — nothing else in
  the app needs to change as long as each team still has 11 named players.
- **Schedule**: `js/schedule.js` — a standard circle-method round robin,
  played 4 times per pair (66 pairs × 4 = 264 matches), 2 home + 2 away per
  pair. One morning (10:00) and one evening (7:00 PM) match per day, with a
  rest day between rounds. Season starts January 1, 2027.
- **Simulation**: `js/simulate.js` — a seeded, deterministic ball-by-ball
  50-over simulator. Outcome odds are weighted by the batter's vs. bowler's
  skill (derived from team rating), adjusted for powerplay/death overs and
  required-run-rate pressure when chasing. Produces full batting/bowling
  cards, fall of wickets, extras, and Player of the Match.
- **Standings**: `js/season.js` — aggregates results into a points table
  with ICC-style Net Run Rate.

Because the RNG is seeded per match ID, the exact same schedule always
produces the exact same results — editing ratings or squads will change
outcomes, but reloading the page will not.

## Running locally

No build step. Serve the folder statically, e.g.:

```
python3 -m http.server 8080
```

then open `http://localhost:8080/`. Also works unmodified on GitHub Pages
(Settings → Pages → deploy from this branch, root).
