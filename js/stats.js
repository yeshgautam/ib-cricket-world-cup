(function () {
  document.getElementById("tabbarMount").outerHTML = TABBAR.renderTabbar("stats");

  const season = SEASON.buildSeason();
  const results = SEASON.playedResults(season);
  document.getElementById("asOfLabel").textContent = results.length === 0 ? "No results entered yet — stats will appear once matches are played" : `From ${results.length} played match${results.length === 1 ? "" : "es"}`;

  if (results.length === 0) {
    document.getElementById("statsBody").innerHTML = `<div class="empty-note">Tournament has not started.</div>`;
    return;
  }

  const players = PLAYERSTATS.aggregate(results);

  function avatar(p) {
    const num = p.name.split(" ")[1] || "?";
    return `<div class="player-avatar" style="background:${p.team.color};">${num}</div>`;
  }
  function nameCell(p) {
    return `<div class="player-cell">${avatar(p)}<div><div>${p.name}</div><span class="player-name-sub">${p.team.flag} ${p.team.name}</span></div></div>`;
  }

  const runsLeaders = players
    .slice()
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 10);
  const wicketLeaders = players
    .filter((p) => p.bowlInnings > 0)
    .sort((a, b) => b.wickets - a.wickets || a.econ - b.econ)
    .slice(0, 10);
  const highScores = players
    .filter((p) => p.bestScore)
    .slice()
    .sort((a, b) => b.bestScore.runs - a.bestScore.runs)
    .slice(0, 10);
  const bestBowling = players
    .filter((p) => p.bestBowling && p.bestBowling.wickets > 0)
    .slice()
    .sort((a, b) => b.bestBowling.wickets - a.bestBowling.wickets || a.bestBowling.runs - b.bestBowling.runs)
    .slice(0, 10);

  document.getElementById("statsBody").innerHTML = `
    <div class="section-title" style="margin-top:0;">Runs</div>
    <table class="leader-table">
      <thead><tr><th></th><th>Player</th><th>M</th><th>Avg</th><th>Runs</th></tr></thead>
      <tbody>${runsLeaders
        .map((p, i) => `<tr><td>${i + 1}</td><td>${nameCell(p)}</td><td>${p.matchCount}</td><td>${p.avg}</td><td><b>${p.runs}</b></td></tr>`)
        .join("")}</tbody>
    </table>

    <div class="section-title">Wickets</div>
    <table class="leader-table">
      <thead><tr><th></th><th>Player</th><th>M</th><th>Econ</th><th>W</th></tr></thead>
      <tbody>${wicketLeaders
        .map((p, i) => `<tr><td>${i + 1}</td><td>${nameCell(p)}</td><td>${p.matchCount}</td><td>${p.econ}</td><td><b>${p.wickets}</b></td></tr>`)
        .join("")}</tbody>
    </table>

    <div class="section-title">Highest Scores</div>
    <table class="leader-table">
      <thead><tr><th></th><th>Player</th><th>SR</th><th>HS</th></tr></thead>
      <tbody>${highScores
        .map((p, i) => {
          const sr = p.bestScore.balls ? ((p.bestScore.runs / p.bestScore.balls) * 100).toFixed(2) : "0.00";
          return `<tr><td>${i + 1}</td><td>${nameCell(p)}</td><td>${sr}</td><td><b>${p.bestScore.runs}${p.bestScore.notOut ? "*" : ""}</b></td></tr>`;
        })
        .join("")}</tbody>
    </table>

    <div class="section-title">Best Bowling Figures</div>
    <table class="leader-table">
      <thead><tr><th></th><th>Player</th><th>O</th><th>Econ</th><th>BB</th></tr></thead>
      <tbody>${bestBowling
        .map((p, i) => {
          const balls = PLAYERSTATS.ballsFromOvers(p.bestBowling.overs);
          const econ = balls ? ((p.bestBowling.runs / balls) * 6).toFixed(2) : "0.00";
          return `<tr><td>${i + 1}</td><td>${nameCell(p)}</td><td>${p.bestBowling.overs}</td><td>${econ}</td><td><b>${p.bestBowling.wickets}/${p.bestBowling.runs}</b></td></tr>`;
        })
        .join("")}</tbody>
    </table>
  `;
})();
