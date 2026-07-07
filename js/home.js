(function () {
  document.getElementById("tabbarMount").outerHTML = TABBAR.renderTabbar("matches");

  const season = SEASON.buildSeason();
  const dates = season.dates;
  let viewIdx = 0;
  let filterTeam = "ALL";

  function fmtDate(dstr) {
    const d = new Date(dstr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }

  function scoreStr(inn) {
    return inn.allOut ? `${inn.total}` : `${inn.total}/${inn.wickets}`;
  }

  function matchBlockHtml(fixture, result) {
    const teamA = DATA.TEAMS_BY_CODE[fixture.teamA];
    const teamB = DATA.TEAMS_BY_CODE[fixture.teamB];
    const statusHtml = result ? `<span class="status done">Result</span>` : `<span class="status upcoming">Scheduled</span>`;

    function row(team) {
      const inn = result ? result.innings.find((i) => i.battingTeam === team.code) : null;
      const isWinner = result && result.winner === team.code;
      const scoreHtml = inn
        ? `<span class="team-score">${scoreStr(inn)} <span style="color:var(--text-faint); font-weight:400;">(${inn.overs} ov)</span></span>`
        : "";
      return `<div class="team-row">
        <div class="team-id"><span class="flag">${team.flag}</span><span class="tname ${isWinner ? "winner" : ""}">${team.name}</span></div>
        ${scoreHtml}
      </div>`;
    }

    const resultLine = result ? result.result : `${fixture.time} · ${fixture.venue}`;
    const actionLabel = result ? "More ›" : "Enter score ›";
    return `<div class="match-block" data-id="${fixture.id}">
      <div class="match-meta"><span class="session">${fixture.session} · ${fixture.time}</span>${statusHtml}</div>
      ${row(teamA)}
      ${row(teamB)}
      <div class="match-result-line"><span>${resultLine}</span><span class="more-link">${actionLabel}</span></div>
    </div>`;
  }

  function attachBlockClicks() {
    document.querySelectorAll(".match-block").forEach((el) => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        window.location.href = `match.html?id=${el.dataset.id}`;
      });
    });
  }

  function renderDayView() {
    const date = dates[viewIdx];
    const order = { Morning: 0, Evening: 1 };
    const matches = SEASON.matchesOnDate(season, date).sort((a, b) => order[a.fixture.session] - order[b.fixture.session]);
    const html = matches.map((m) => matchBlockHtml(m.fixture, m.result)).join("");
    document.getElementById("matchArea").innerHTML = matches.length ? `<div class="match-grid">${html}</div>` : `<div class="empty-note">No matches scheduled.</div>`;
    attachBlockClicks();

    document.getElementById("dayLabel").innerHTML = `${fmtDate(date)}<div class="sub">Day ${viewIdx + 1} of ${dates.length}</div>`;
    document.getElementById("prevDay").disabled = viewIdx <= 0;
    document.getElementById("nextDay").disabled = viewIdx >= dates.length - 1;
  }

  function renderTeamView(code) {
    const team = DATA.TEAMS_BY_CODE[code];
    const all = SEASON.teamFixtures(season, code);
    const played = all.filter((m) => m.result);
    const upcoming = all.filter((m) => !m.result);

    let won = 0,
      lost = 0,
      tied = 0;
    played.forEach((m) => {
      if (m.result.tied) tied++;
      else if (m.result.winner === code) won++;
      else lost++;
    });

    const standings = SEASON.computeStandings(SEASON.playedResults(season));
    const rank = standings.find((r) => r.code === code);

    const header = `<div style="padding:14px 18px 4px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      <div style="font-size:14px;"><span class="flag" style="font-size:18px;">${team.flag}</span> <b>${team.name}</b> — ${won}W ${lost}L${tied ? " " + tied + "T" : ""} (${played.length} played, ${upcoming.length} scheduled)</div>
      <div style="font-size:12px; color:var(--text-dim);">${rank && rank.played ? `Rank #${rank.rank} · ${rank.points} pts · NRR ${rank.nrr > 0 ? "+" : ""}${rank.nrr}` : "No results yet"}</div>
    </div>`;

    function rowHtml(m) {
      const opp = m.fixture.teamA === code ? m.fixture.teamB : m.fixture.teamA;
      const oppTeam = DATA.TEAMS_BY_CODE[opp];
      let statusColor = "var(--text-faint)";
      let outcome = "Scheduled";
      if (m.result) {
        if (m.result.tied) {
          outcome = "Tied";
        } else if (m.result.winner === code) {
          outcome = "Won";
          statusColor = "var(--green)";
        } else {
          outcome = "Lost";
          statusColor = "var(--red)";
        }
      }
      const actionLabel = m.result ? "More ›" : "Enter score ›";
      const resultLine = m.result ? m.result.result : `${m.fixture.time} · ${m.fixture.venue}`;
      return `<div class="match-block" data-id="${m.fixture.id}" style="border-right:none; border-top:1px solid var(--border);">
        <div class="match-meta"><span class="session">${fmtDate(m.fixture.date)} · ${m.fixture.session}</span><span class="status" style="color:${statusColor};">${outcome}</span></div>
        <div class="team-row"><div class="team-id"><span class="flag">${oppTeam.flag}</span><span class="tname">vs ${oppTeam.name}</span></div></div>
        <div class="match-result-line"><span>${resultLine}</span><span class="more-link">${actionLabel}</span></div>
      </div>`;
    }

    const rows = all
      .slice()
      .sort((a, b) => (a.fixture.date < b.fixture.date ? -1 : 1))
      .map(rowHtml)
      .join("");

    document.getElementById("matchArea").innerHTML = header + rows;
    attachBlockClicks();
  }

  function render() {
    const totalPlayed = season.fixtures.filter((f) => STORE.hasEntry(f.id)).length;
    document.getElementById("tournamentStatus").textContent = totalPlayed === 0 ? "Tournament has not started" : `${totalPlayed} of ${season.fixtures.length} matches played`;

    if (filterTeam === "ALL") {
      document.querySelector(".day-nav").style.display = "flex";
      renderDayView();
    } else {
      document.querySelector(".day-nav").style.display = "none";
      renderTeamView(filterTeam);
    }
    document.getElementById("seasonProgress").textContent = `${totalPlayed} of ${season.fixtures.length} matches played`;
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
    viewIdx = Math.min(dates.length - 1, viewIdx + 1);
    renderDayView();
  });

  populateTeamFilter();
  render();
})();
