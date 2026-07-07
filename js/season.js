// Wires the schedule + simulator together into one season, and derives the points table.
(function (global) {
  let cached = null;

  function buildSeason() {
    if (cached) return cached;
    const fixtures = SCHEDULE.generateFixtures();
    const results = fixtures.map((f) => SIM.simulateMatch(f));
    const byId = {};
    results.forEach((r) => (byId[r.id] = r));
    const dates = Array.from(new Set(fixtures.map((f) => f.date))).sort();
    cached = { fixtures, results, byId, dates };
    return cached;
  }

  // ICC-style NRR: a team bowled out is deemed to have used its full 50-over quota
  // for that innings, for both its own "for" figure and the bowling side's "against" figure.
  function computeStandings(results) {
    const table = {};
    DATA.TEAMS.forEach((t) => {
      table[t.code] = {
        code: t.code,
        name: t.name,
        flag: t.flag,
        played: 0,
        won: 0,
        lost: 0,
        tied: 0,
        points: 0,
        runsFor: 0,
        oversFor: 0,
        runsAgainst: 0,
        oversAgainst: 0,
      };
    });

    results.forEach((m) => {
      const t1 = table[m.teamA];
      const t2 = table[m.teamB];
      t1.played++;
      t2.played++;
      if (m.tied) {
        t1.tied++;
        t2.tied++;
        t1.points += 1;
        t2.points += 1;
      } else {
        const winner = table[m.winner];
        const loser = m.winner === m.teamA ? t2 : t1;
        winner.won++;
        loser.lost++;
        winner.points += 2;
      }
      m.innings.forEach((inn) => {
        const oversEq = inn.allOut ? 50 : inn.legalBalls / 6;
        const bat = table[inn.battingTeam];
        const bowl = table[inn.bowlingTeam];
        bat.runsFor += inn.total;
        bat.oversFor += oversEq;
        bowl.runsAgainst += inn.total;
        bowl.oversAgainst += oversEq;
      });
    });

    const rows = Object.values(table).map((t) => {
      const nrr = (t.oversFor > 0 ? t.runsFor / t.oversFor : 0) - (t.oversAgainst > 0 ? t.runsAgainst / t.oversAgainst : 0);
      return { ...t, nrr: +nrr.toFixed(3) };
    });
    rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    rows.forEach((r, i) => (r.rank = i + 1));
    return rows;
  }

  function matchesOnDate(season, date) {
    return season.fixtures.filter((f) => f.date === date).map((f) => season.byId[f.id]);
  }

  function teamMatches(season, code) {
    return season.results.filter((m) => m.teamA === code || m.teamB === code);
  }

  const SEASON = { buildSeason, computeStandings, matchesOnDate, teamMatches };
  if (typeof module !== "undefined") module.exports = SEASON;
  else global.SEASON = SEASON;
})(typeof window !== "undefined" ? window : globalThis);
