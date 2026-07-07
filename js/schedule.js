// Builds the IB Cricket League 2027 fixture list: 12 teams, double round-robin played
// twice (so every pair meets 4 times, 2 at each team's home venue) = 66 pairs * 4 = 264
// matches. One match in the morning, one in the evening, with a rest day between rounds.
(function (global) {
  const SEASON_START = Date.UTC(2027, 0, 1); // Jan 1, 2027
  const DAY_MS = 24 * 60 * 60 * 1000;

  function addDays(baseUTC, days) {
    return baseUTC + days * DAY_MS;
  }

  function formatDate(utcMs) {
    const d = new Date(utcMs);
    return d.toISOString().slice(0, 10);
  }

  // Standard circle-method round robin: team[0] fixed, the rest rotate each round.
  function buildRounds(teamCodes) {
    const N = teamCodes.length;
    let arr = teamCodes.slice();
    const rounds = [];
    for (let r = 0; r < N - 1; r++) {
      const pairs = [];
      for (let i = 0; i < N / 2; i++) {
        pairs.push([arr[i], arr[N - 1 - i]]);
      }
      rounds.push(pairs);
      const fixed = arr[0];
      const rest = arr.slice(1);
      rest.unshift(rest.pop());
      arr = [fixed, ...rest];
    }
    return rounds; // N-1 rounds, N/2 pairs each
  }

  function generateFixtures() {
    const teamCodes = DATA.TEAMS.map((t) => t.code);
    const rounds = buildRounds(teamCodes);
    const fixtures = [];
    let cursor = SEASON_START;
    let matchNum = 0;

    for (let leg = 0; leg < 4; leg++) {
      for (let r = 0; r < rounds.length; r++) {
        const pairs = rounds[r];
        for (let p = 0; p < pairs.length; p++) {
          const [x, y] = pairs[p];
          const home = leg % 2 === 0 ? x : y;
          const away = home === x ? y : x;
          const dayOffset = Math.floor(p / 2);
          const session = p % 2 === 0 ? "Morning" : "Evening";
          matchNum++;
          fixtures.push({
            id: "m" + matchNum,
            num: matchNum,
            leg: leg + 1,
            round: r + 1,
            teamA: home,
            teamB: away,
            home,
            away,
            date: formatDate(addDays(cursor, dayOffset)),
            session,
            time: session === "Morning" ? "10:00 AM" : "7:00 PM",
            venue: DATA.TEAMS_BY_CODE[home].venue,
          });
        }
        // 3 match-days per round (2 matches each) + 1 rest day before the next round
        cursor = addDays(cursor, 4);
      }
    }
    return fixtures;
  }

  const SCHEDULE = { generateFixtures, formatDate, addDays, SEASON_START };
  if (typeof module !== "undefined") module.exports = SCHEDULE;
  else global.SCHEDULE = SCHEDULE;
})(typeof window !== "undefined" ? window : globalThis);
