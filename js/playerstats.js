// Aggregates per-player career (season) stats from played match results. Shared by
// stats.html (tournament leaderboards) and players.html (per-team roster view).
(function (global) {
  function ballsFromOvers(oversStr) {
    const [o, b] = String(oversStr).split(".").map(Number);
    return o * 6 + (b || 0);
  }

  function aggregate(results) {
    const players = {};
    function ensure(name) {
      if (!players[name]) {
        const code = name.split(" ")[0];
        players[name] = {
          name,
          code,
          team: DATA.TEAMS_BY_CODE[code],
          matches: new Set(),
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          outs: 0,
          innings: 0,
          bestScore: null, // {runs, balls, notOut}
          wickets: 0,
          runsConceded: 0,
          ballsBowled: 0,
          maidens: 0,
          bowlInnings: 0,
          bestBowling: null, // {wickets, runs, overs}
        };
      }
      return players[name];
    }

    results.forEach((m) => {
      m.innings.forEach((inn) => {
        inn.battingCard.forEach((b) => {
          const p = ensure(b.name);
          p.matches.add(m.id);
          p.runs += b.runs;
          p.ballsFaced += b.balls;
          p.fours += b.fours;
          p.sixes += b.sixes;
          p.innings++;
          if (b.out) p.outs++;
          const better = !p.bestScore || b.runs > p.bestScore.runs || (b.runs === p.bestScore.runs && !b.out && p.bestScore.out);
          if (better) p.bestScore = { runs: b.runs, balls: b.balls, notOut: !b.out };
        });
        inn.bowlingCard.forEach((b) => {
          const balls = ballsFromOvers(b.overs);
          if (balls === 0 && b.wickets === 0 && b.runs === 0) return;
          const p = ensure(b.name);
          p.matches.add(m.id);
          p.wickets += b.wickets;
          p.runsConceded += b.runs;
          p.ballsBowled += balls;
          p.maidens += b.maidens;
          p.bowlInnings++;
          const better = !p.bestBowling || b.wickets > p.bestBowling.wickets || (b.wickets === p.bestBowling.wickets && b.runs < p.bestBowling.runs);
          if (better) p.bestBowling = { wickets: b.wickets, runs: b.runs, overs: b.overs };
        });
      });
    });

    return Object.values(players).map((p) => ({
      ...p,
      matchCount: p.matches.size,
      avg: p.outs ? +(p.runs / p.outs).toFixed(2) : p.runs > 0 ? p.runs : 0,
      sr: p.ballsFaced ? +((p.runs / p.ballsFaced) * 100).toFixed(2) : 0,
      econ: p.ballsBowled ? +((p.runsConceded / p.ballsBowled) * 6).toFixed(2) : 0,
    }));
  }

  const PLAYERSTATS = { aggregate, ballsFromOvers };
  if (typeof module !== "undefined") module.exports = PLAYERSTATS;
  else global.PLAYERSTATS = PLAYERSTATS;
})(typeof window !== "undefined" ? window : globalThis);
