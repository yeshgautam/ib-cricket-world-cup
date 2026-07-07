(function () {
  const HORIZON_KEY = "ib-cricket-horizon-2027";
  const season = SEASON.buildSeason();
  const dates = season.dates;

  let horizon = parseInt(localStorage.getItem(HORIZON_KEY), 10);
  if (isNaN(horizon) || horizon < 0 || horizon >= dates.length) horizon = 0;
  let viewIdx = horizon;
  let filterTeam = "ALL";

  function saveHorizon() {
    localStorage.setItem(HORIZON_KEY, String(horizon));
  }

  function fmtDate(dstr) {
    const d = new Date(dstr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function scoreStr(inn) {
    return inn.allOut ? `${inn.total}` : `${inn.total}/${inn.wickets}`;
  }

  function dateIndex(dstr) {
    return dates.indexOf(dstr);
  }

  function teamRowHtml(code, inn, revealed, winner) {
    const team = DATA.TEAMS_BY_CODE[code];
    const isWinner = revealed && winner === code;
    const scoreHtml = revealed
      ? `<span class="team-score">${scoreStr(inn)} <span style="color:var(--text-faint);font-weight:400;">(${inn.overs} ov)</span></span>`
      : "";
    return `<div class="team-row">
      <div class="team-id"><span class="flag">${team.flag}</span><span class="tname ${isWinner ? "winner" : ""}">${team.name}</span></div>
      ${scoreHtml}
    </div>`;
  }

  function matchBlockHtml(m, revealed) {
    const inn1 = m.innings[0],
      inn2 = m.innings[1];
    const teamAInn = inn1.battingTeam === m.teamA ? inn1 : inn2;
    const teamBInn = inn1.battingTeam === m.teamB ? inn1 : inn2;
    const statusHtml = revealed ? `<span class="status done">Result</span>` : `<span class="status upcoming">Upcoming</span>`;
    const resultLine = revealed ? m.result : `${m.fixture.time} · ${m.venue}`;
    return `<div class="match-block" data-id="${m.id}" data-revealed="${revealed}">
      <div class="match-meta"><span class="session">${m.fixture.session} · ${m.fixture.time}</span>${statusHtml}</div>
      ${teamRowHtml(m.teamA, teamAInn, revealed, m.winner)}
      ${teamRowHtml(m.teamB, teamBInn, revealed, m.winner)}
      <div class="match-result-line"><span>${resultLine}</span>${revealed ? '<span class="more-link">More ›</span>' : ""}</div>
    </div>`;
  }

  function attachBlockClicks() {
    document.querySelectorAll(".match-block").forEach((el) => {
      if (el.dataset.revealed !== "true") return;
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        window.location.href = `match.html?id=${el.dataset.id}`;
      });
    });
  }

  function renderDayView() {
    const date = dates[viewIdx];
    const revealed = viewIdx <= horizon;
    const order = { Morning: 0, Evening: 1 };
    const matches = SEASON.matchesOnDate(season, date).sort((a, b) => order[a.fixture.session] - order[b.fixture.session]);
    const html = matches.map((m) => matchBlockHtml(m, revealed)).join("");
    document.getElementById("matchArea").innerHTML = matches.length
      ? `<div class="match-grid">${html}</div>`
      : `<div class="empty-note">No matches scheduled.</div>`;
    attachBlockClicks();

    document.getElementById("dayLabel").innerHTML = `${fmtDate(date)}<div class="sub">Day ${viewIdx + 1} of ${dates.length}</div>`;
    document.getElementById("prevDay").disabled = viewIdx <= 0;
    document.getElementById("nextDay").disabled = viewIdx >= horizon;
  }

  function renderTeamView(code) {
    const team = DATA.TEAMS_BY_CODE[code];
    const matches = SEASON.teamMatches(season, code)
      .filter((m) => dateIndex(m.fixture.date) <= horizon)
      .sort((a, b) => (a.fixture.date < b.fixture.date ? 1 : -1));

    let won = 0,
      lost = 0,
      tied = 0;
    matches.forEach((m) => {
      if (m.tied) tied++;
      else if (m.winner === code) won++;
      else lost++;
    });

    const standings = SEASON.computeStandings(season.results.filter((m) => dateIndex(m.fixture.date) <= horizon));
    const rank = standings.find((r) => r.code === code);

    const header = `<div style="padding:14px 18px 4px; display:flex; justify-content:space-between; align-items:center;">
      <div style="font-size:14px;"><span class="flag" style="font-size:18px;">${team.flag}</span> <b>${team.name}</b> — ${won}W ${lost}L${tied ? " " + tied + "T" : ""}</div>
      <div style="font-size:12px; color:var(--text-dim);">${rank ? `Rank #${rank.rank} · ${rank.points} pts · NRR ${rank.nrr > 0 ? "+" : ""}${rank.nrr}` : ""}</div>
    </div>`;

    if (!matches.length) {
      document.getElementById("matchArea").innerHTML = header + `<div class="empty-note">No matches simulated yet for ${team.name}. Click "Simulate next day" to play through the season.</div>`;
      return;
    }

    const rows = matches
      .map((m) => {
        const opp = m.teamA === code ? m.teamB : m.teamA;
        const oppTeam = DATA.TEAMS_BY_CODE[opp];
        const won = m.winner === code;
        const outcome = m.tied ? "Tied" : won ? "Won" : "Lost";
        const color = m.tied ? "var(--text-dim)" : won ? "var(--teal-light)" : "var(--red)";
        return `<div class="match-block" data-id="${m.id}" data-revealed="true" style="border-right:none; border-top:1px solid var(--border);">
          <div class="match-meta"><span class="session">${fmtDate(m.fixture.date)} · ${m.fixture.session}</span><span class="status" style="color:${color};">${outcome}</span></div>
          <div class="team-row"><div class="team-id"><span class="flag">${oppTeam.flag}</span><span class="tname">vs ${oppTeam.name}</span></div></div>
          <div class="match-result-line"><span>${m.result}</span><span class="more-link">More ›</span></div>
        </div>`;
      })
      .join("");

    document.getElementById("matchArea").innerHTML = header + rows;
    attachBlockClicks();
  }

  function render() {
    if (filterTeam === "ALL") {
      document.querySelector(".day-nav").style.display = "flex";
      renderDayView();
    } else {
      document.querySelector(".day-nav").style.display = "none";
      renderTeamView(filterTeam);
    }
    document.getElementById("simNextBtn").disabled = horizon >= dates.length - 1;
    document.getElementById("simEndBtn").disabled = horizon >= dates.length - 1;
    document.getElementById("seasonProgress").textContent = `Simulated through ${fmtDate(dates[horizon])} (day ${horizon + 1}/${dates.length})`;
  }

  function populateTeamFilter() {
    const sel = document.getElementById("teamFilter");
    sel.innerHTML =
      `<option value="ALL">All teams</option>` +
      DATA.TEAMS.slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((t) => `<option value="${t.code}">${t.flag} ${t.name}</option>`)
        .join("");
    sel.addEventListener("change", () => {
      filterTeam = sel.value;
      render();
    });
  }

  document.getElementById("prevDay").addEventListener("click", () => {
    viewIdx = Math.max(0, viewIdx - 1);
    renderDayView();
  });
  document.getElementById("nextDay").addEventListener("click", () => {
    viewIdx = Math.min(horizon, viewIdx + 1);
    renderDayView();
  });
  document.getElementById("simNextBtn").addEventListener("click", () => {
    horizon = Math.min(dates.length - 1, horizon + 1);
    viewIdx = horizon;
    saveHorizon();
    render();
  });
  document.getElementById("simEndBtn").addEventListener("click", () => {
    horizon = dates.length - 1;
    viewIdx = horizon;
    saveHorizon();
    render();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    horizon = 0;
    viewIdx = 0;
    saveHorizon();
    render();
  });

  populateTeamFilter();
  render();
})();
