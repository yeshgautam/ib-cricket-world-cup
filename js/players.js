(function () {
  document.getElementById("tabbarMount").outerHTML = TABBAR.renderTabbar("players");

  const season = SEASON.buildSeason();
  const results = SEASON.playedResults(season);
  const statsByName = {};
  PLAYERSTATS.aggregate(results).forEach((p) => (statsByName[p.name] = p));

  const sel = document.getElementById("teamSel");
  sel.innerHTML = DATA.TEAMS.slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((t) => `<option value="${t.code}" ${t.code === "NZ" ? "selected" : ""}>${t.flag} ${t.name}</option>`)
    .join("");

  function render() {
    const code = sel.value;
    const team = DATA.TEAMS_BY_CODE[code];
    const squad = DATA.SQUADS[code].players;

    const rows = squad
      .map((p) => {
        const s = statsByName[p.name];
        if (!s || s.matchCount === 0) {
          return `<tr>
            <td>${p.name}<span class="player-name-sub">${p.role}</span></td>
            <td colspan="6" style="color:var(--text-faint); text-align:center;">No matches played yet</td>
          </tr>`;
        }
        return `<tr>
          <td>${p.name}<span class="player-name-sub">${p.role}</span></td>
          <td>${s.matchCount}</td>
          <td>${s.runs}</td>
          <td>${s.avg}</td>
          <td>${s.sr}</td>
          <td>${s.wickets}</td>
          <td>${s.econ}</td>
        </tr>`;
      })
      .join("");

    document.getElementById("playersBody").innerHTML = `
      <div style="font-size:14px; margin-bottom:12px;"><span class="flag" style="font-size:18px;">${team.flag}</span> <b>${team.name}</b> squad (rating ${team.rating}) — home ground: ${team.venue}</div>
      <table class="leader-table one-label">
        <thead><tr><th>Player</th><th>M</th><th>Runs</th><th>Avg</th><th>SR</th><th>Wkts</th><th>Econ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  sel.addEventListener("change", render);
  render();
})();
