// Wires the schedule + results into one season view, and derives the points table.
// Result resolution (New Zealand manual, everyone else auto-simulated) lives in
// js/resolve.js so every page applies the same rule.
(function (global) {
  function buildSeason() {
    const fixtures = SCHEDULE.generateFixtures();
    const byId = {};
    fixtures.forEach((f) => (byId[f.id] = f));
    const dates = Array.from(new Set(fixtures.map((f) => f.date))).sort();
    return { fixtures, byId, dates };
  }

  function getResult(fixture) {
    return RESOLVE.resolveResult(fixture);
  }

  function playedResults(season) {
    return season.fixtures.map((f) => getResult(f)).filter(Boolean);
  }

  // ICC-style NRR: a team bowled out is deemed to have used its full overs quota for
  // that innings, for both its own "for" figure and the bowling side's "against" figure.
  // quotaOvers defaults to 50 (ODI); pass a different value if a match ran shorter.
  function computeStandings(results, teamCodes, quotaOvers, pointsScheme) {
    quotaOvers = quotaOvers || 50;
    pointsScheme = pointsScheme || { win: 2, tie: 1, loss: 0 };
    const table = {};
    (teamCodes || DATA.TEAMS.map((t) => t.code)).forEach((code) => {
      const t = DATA.TEAMS_BY_CODE[code];
      table[code] = {
        code,
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
        form: [],
      };
    });

    results
      .slice()
      .sort((a, b) => (a.fixture.date < b.fixture.date ? -1 : 1))
      .forEach((m) => {
        const t1 = table[m.teamA];
        const t2 = table[m.teamB];
        if (!t1 || !t2) return;
        t1.played++;
        t2.played++;
        if (m.tied) {
          t1.tied++;
          t2.tied++;
          t1.points += pointsScheme.tie;
          t2.points += pointsScheme.tie;
          t1.form.push("T");
          t2.form.push("T");
        } else {
          const winner = table[m.winner];
          const loser = m.winner === m.teamA ? t2 : t1;
          winner.won++;
          loser.lost++;
          winner.points += pointsScheme.win;
          loser.points += pointsScheme.loss;
          winner.form.push("W");
          loser.form.push("L");
        }
        m.innings.forEach((inn) => {
          const bat = table[inn.battingTeam];
          const bowl = table[inn.bowlingTeam];
          if (!bat || !bowl) return;
          const oversEq = inn.allOut ? quotaOvers : inn.legalBalls / 6;
          bat.runsFor += inn.total;
          bat.oversFor += oversEq;
          bowl.runsAgainst += inn.total;
          bowl.oversAgainst += oversEq;
        });
      });

    const rows = Object.values(table).map((t) => {
      const nrr = (t.oversFor > 0 ? t.runsFor / t.oversFor : 0) - (t.oversAgainst > 0 ? t.runsAgainst / t.oversAgainst : 0);
      return { ...t, nrr: +nrr.toFixed(3), form: t.form.slice(-5) };
    });
    rows.sort((a, b) => b.points - a.points || b.nrr - a.nrr);
    rows.forEach((r, i) => (r.rank = i + 1));
    return rows;
  }

  function matchesOnDate(season, date) {
    return season.fixtures.filter((f) => f.date === date).map((f) => ({ fixture: f, result: getResult(f) }));
  }

  function teamFixtures(season, code) {
    return season.fixtures.filter((f) => f.teamA === code || f.teamB === code).map((f) => ({ fixture: f, result: getResult(f) }));
  }

  const SEASON = { buildSeason, getResult, playedResults, computeStandings, matchesOnDate, teamFixtures };
  if (typeof module !== "undefined") module.exports = SEASON;
  else global.SEASON = SEASON;
})(typeof window !== "undefined" ? window : globalThis);
