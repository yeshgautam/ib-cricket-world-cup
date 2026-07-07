(function () {
  const HORIZON_KEY = "ib-cricket-horizon-2027";
  const season = SEASON.buildSeason();
  const dates = season.dates;
  let horizon = parseInt(localStorage.getItem(HORIZON_KEY), 10);
  if (isNaN(horizon) || horizon < 0 || horizon >= dates.length) horizon = 0;

  const revealedResults = season.results.filter((m) => dates.indexOf(m.fixture.date) <= horizon);
  const rows = SEASON.computeStandings(revealedResults);

  function fmtDate(dstr) {
    const d = new Date(dstr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  document.getElementById("asOfLabel").textContent = `As of ${fmtDate(dates[horizon])} — season simulated through day ${horizon + 1} of ${dates.length}`;

  document.getElementById("standingsBody").innerHTML = rows
    .map(
      (r) => `<tr>
      <td>${r.rank}</td>
      <td class="team-cell"><span class="flag" style="font-size:16px;">${r.flag}</span>${r.name}</td>
      <td>${r.played}</td>
      <td>${r.won}</td>
      <td>${r.lost}</td>
      <td>${r.tied}</td>
      <td><b>${r.points}</b></td>
      <td>${r.nrr > 0 ? "+" : ""}${r.nrr.toFixed(3)}</td>
    </tr>`
    )
    .join("");
})();
