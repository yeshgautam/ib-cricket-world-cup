(function () {
  document.getElementById("tabbarMount").outerHTML = TABBAR.renderTabbar("standings");

  const season = SEASON.buildSeason();
  const results = SEASON.playedResults(season);
  const rows = SEASON.computeStandings(results);

  const played = results.length;
  document.getElementById("asOfLabel").textContent =
    played === 0 ? "Tournament has not started — no results entered yet" : `${played} of ${season.fixtures.length} matches played`;

  function formHtml(form) {
    if (!form.length) return `<span style="color:var(--text-faint); font-size:11px;">—</span>`;
    return `<div class="form-strip">${form
      .map((r) => {
        const cls = r === "W" ? "w" : r === "L" ? "l" : "t";
        const glyph = r === "W" ? "✓" : r === "L" ? "✕" : "T";
        return `<span class="form-dot ${cls}">${glyph}</span>`;
      })
      .join("")}</div>`;
  }

  document.getElementById("standingsBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.rank}</td>
      <td class="team-cell"><span class="flag" style="font-size:16px;">${r.flag}</span>${r.name}</td>
      <td>${r.played}</td>
      <td>${r.won}</td>
      <td>${r.lost}</td>
      <td>${r.tied}</td>
      <td>${r.nrr > 0 ? "+" : ""}${r.nrr.toFixed(3)}</td>
      <td><b>${r.points}</b></td>
      <td>${formHtml(r.form)}</td>
    </tr>`
    )
    .join("");
})();
