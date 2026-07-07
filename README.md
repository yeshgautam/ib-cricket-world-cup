# IB Cricket League 2027

A static, zero-build site for a 12-team fictional ODI league. **New Zealand always bats
second** — the opponent's whole innings (their batting *and* New Zealand's bowling
figures against them) is auto-simulated, and you enter only New Zealand's batting (you
play the game yourself and type in what happened). Every other match is fully
auto-simulated. The team this applies to is set in `js/resolve.js` (`USER_TEAM`). Manual
entries save to `localStorage` in your browser — there is no backend, so entries stay on
whichever device/browser you enter them on.

## Pages

- `index.html` — the "MATCHES" home page. Browse the schedule by day (or the full
  264-match list via the "Full schedule" toggle), or filter to one team. Every match
  shows its pitch/ground/time conditions. New Zealand's fixtures show "Scheduled" with
  an "Enter score" link until played; every other match already shows its result.
- `match.html?id=...` — shows the batting-entry form for an unplayed New Zealand match,
  or (once a result exists) Summary / Scorecard / Key Moments tabs, plus conditions and
  who batted first. Works for both league and playoff matches. "Edit result" (New
  Zealand matches only) re-opens the form, pre-filled.
- `standings.html` — league points table (win = 2, tie/no result = 1, loss = 0), ranked
  by points then Net Run Rate, with a Last-5 form strip.
- `stats.html` — tournament-wide leaderboards (Runs, Wickets, Highest Scores, Best
  Bowling Figures) across all 12 teams.
- `players.html` — pick a team, see its 11-player squad with season stats.
- `nzstats.html` — New Zealand only: full batting table and full bowling table for all
  11 players.
- `bracket.html` — the playoff bracket (see below). Has its own "Generate playoff
  bracket from current standings" action once at least 9 teams have a played match.

## Entering a New Zealand result

The opponent bats first and is fully auto-simulated — their batting card *and* their
bowling figures against New Zealand are generated automatically. You only fill in New
Zealand's batting: **runs, 4s, 6s, and whether each batter got out** (plus an optional
over-of-dismissal for the fall-of-wickets list). That's it — New Zealand's balls faced,
strike rate, extras, and the opponent's bowling figures *against* New Zealand (who took
each wicket, economy, everything) are all derived automatically (`js/autofill.js`),
deterministically seeded per match so the same entry always produces the same scorecard.

## Match conditions

Every match — league or playoff — gets a pitch type (Normal / Dry / Green / Bouncy) and
time of day (Day / Overcast / Night), rolled per fixture (`js/conditions.js`), plus a
stadium size (Big / Small) fixed per venue (`stadiumSize` in `js/data.js`, based on real
ground dimensions — e.g. Eden Park is small despite decent capacity). These feed modest
multipliers into the auto-simulator's outcome odds (green pitches and overcast skies
favor bowlers, small grounds favor boundaries) and are shown on every match.

## How it's built

- **Teams**: `js/data.js` — 12 national teams with a 0–100 rating loosely reflecting
  recent (2023–2026) ODI form/rankings, a home venue, and a stadium size. The rating
  drives the auto-simulation's outcome odds for every match except New Zealand's own
  batting (which you enter).
- **Squads**: also `js/data.js` — 11 placeholder players per team (`{CODE} 1`…`{CODE}
  11}`), generated from a role template (openers, top order, all-rounders, keeper,
  bowlers). **Swap in real names later** by editing `buildSquad` in `js/data.js` —
  nothing else needs to change.
- **Schedule**: `js/schedule.js` — a circle-method round robin, played 4 times per pair
  (66 pairs × 4 = 264 matches), 2 home + 2 away per pair. One morning (10:00) and one
  evening (7:00 PM) match per day, with a rest day between rounds. Season starts
  January 1, 2027.
- **Conditions**: `js/conditions.js` — deterministic per-fixture pitch/time roll plus
  venue-based stadium size; exposes multipliers the simulator applies to its odds.
- **Results store**: `js/store.js` — a thin `localStorage` CRUD layer keyed by match id.
- **Autofill engine**: `js/autofill.js` — `buildNZMatchResult` combines an auto-simulated
  opponent innings with New Zealand's manually entered batting card, deriving New
  Zealand's balls faced, extras, and the opponent's bowling figures against them.
- **Auto-simulation engine**: `js/simulate.js` — a seeded, deterministic ball-by-ball
  50-over simulator, used for every match not involving New Zealand *and* for the
  opponent's innings whenever New Zealand plays. Outcome odds are weighted by team
  rating and match conditions, adjusted for powerplay/death overs and required-run-rate
  pressure when chasing.
- **Resolver**: `js/resolve.js` — the single rule every page uses to get a match's
  result: New Zealand's matches need a manual entry (return `null` until one exists);
  everything else auto-simulates. Memoized per page load since simulating ~220 matches
  isn't free (~200ms cold).
- **Standings**: `js/season.js` — aggregates played results into a points table with
  ICC-style Net Run Rate (a team bowled out is deemed to have used the full 50-over
  quota, for both its own and the bowling side's NRR figure).
- **Playoffs**: `js/bracket.js` — seeds the top 9 from the current league standings
  (rank 1 gets a bye; ranks 2–9 split into two groups of 4), runs the group stage
  (win = 3, washout/tie = 1, loss = 0), picks the better-placed 3rd-place team as a
  wildcard, runs the 3-match knockout, the 3-team final group, and a best-of-7 Grand
  Final — stopping as soon as one side reaches 4 wins. Every playoff match resolves
  through the same `js/resolve.js` rule as the league.

## Running locally

No build step. Serve the folder statically, e.g.:

```
python3 -m http.server 8080
```

then open `http://localhost:8080/`. Also works unmodified on GitHub Pages
(Settings → Pages → deploy from this branch, root).
