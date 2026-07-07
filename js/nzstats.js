(function () {
  document.getElementById("tabbarMount").outerHTML = TABBAR.renderTabbar("nzstats");

  const season = SEASON.buildSeason();
  const results = SEASON.playedResults(season);
  const nzPlayed = results.filter((m) => m.teamA === "NZ" || m.teamB === "NZ").length;
  const nzTotal = season.fixtures.filter((f) => f.teamA === "NZ" || f.teamB === "NZ").length;
  document.getElementById("asOfLabel").textContent = `New Zealand: ${nzPlayed} of ${nzTotal} matches played`;

  const statsByName = {};
  PLAYERSTATS.aggregate(results).forEach((p) => (statsByName[p.name] = p));

  const squad = DATA.SQUADS.NZ.players;

  function battingRow(p) {
    const s = statsByName[p.name];
    if (!s || s.innings === 0) {
      return `<tr><td>${p.name}<span class="player-name-sub">${p.role}</span></td><td colspan="7" style="color:var(--text-faint); text-align:center;">Yet to bat</td></tr>`;
    }
    const hs = `${s.bestScore.runs}${s.bestScore.notOut ? "*" : ""}`;
    return `<tr>
      <td>${p.name}<span class="player-name-sub">${p.role}</span></td>
      <td>${s.matchCount}</td>
      <td>${s.innings}</td>
      <td><b>${s.runs}</b></td>
      <td>${hs}</td>
      <td>${s.avg}</td>
      <td>${s.sr}</td>
      <td>${s.fours}</td>
      <td>${s.sixes}</td>
    </tr>`;
  }

  function bowlingRow(p) {
    const s = statsByName[p.name];
    if (!s || s.bowlInnings === 0) {
      return `<tr><td>${p.name}<span class="player-name-sub">${p.role}</span></td><td colspan="6" style="color:var(--text-faint); text-align:center;">Yet to bowl</td></tr>`;
    }
    const best = s.bestBowling ? `${s.bestBowling.wickets}/${s.bestBowling.runs}` : "—";
    return `<tr>
      <td>${p.name}<span class="player-name-sub">${p.role}</span></td>
      <td>${s.matchCount}</td>
      <td>${s.bowlInnings}</td>
      <td>${AUTOFILL.oversString(s.ballsBowled)}</td>
      <td>${s.runsConceded}</td>
      <td><b>${s.wickets}</b></td>
      <td>${best}</td>
      <td>${s.econ}</td>
    </tr>`;
  }

  document.getElementById("nzStatsBody").innerHTML = `
    <div style="font-size:14px; margin-bottom:14px;">🇳🇿 <b>New Zealand</b> — every player's batting and bowling record this season</div>

    <div class="section-title" style="margin-top:0;">Batting</div>
    <table class="leader-table one-label">
      <thead><tr><th>Player</th><th>M</th><th>Inn</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>4s</th><th>6s</th></tr></thead>
      <tbody>${squad.map(battingRow).join("")}</tbody>
    </table>

    <div class="section-title">Bowling</div>
    <table class="leader-table one-label">
      <thead><tr><th>Player</th><th>M</th><th>Inn</th><th>Overs</th><th>Runs</th><th>Wkts</th><th>Best</th><th>Econ</th></tr></thead>
      <tbody>${squad.map(bowlingRow).join("")}</tbody>
    </table>
  `;
})();
