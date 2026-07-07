(function () {
  document.getElementById("tabbarMount").outerHTML = TABBAR.renderTabbar("bracket");
  const season = SEASON.buildSeason();
  const body = document.getElementById("bracketBody");

  function fixtureRow(fixture, result) {
    const teamA = DATA.TEAMS_BY_CODE[fixture.teamA];
    const teamB = DATA.TEAMS_BY_CODE[fixture.teamB];
    const status = result ? `<span class="status done">Result</span>` : `<span class="status upcoming">Not played</span>`;
    function row(team) {
      const inn = result ? result.innings.find((i) => i.battingTeam === team.code) : null;
      const isWinner = result && result.winner === team.code;
      const score = inn ? `<span class="team-score">${inn.allOut ? inn.total : inn.total + "/" + inn.wickets} <span style="color:var(--text-faint); font-weight:400;">(${inn.overs} ov)</span></span>` : "";
      return `<div class="team-row"><div class="team-id"><span class="flag">${team.flag}</span><span class="tname ${isWinner ? "winner" : ""}">${team.name}</span></div>${score}</div>`;
    }
    const line = result ? result.result : "Enter score ›";
    const conditions = CONDITIONS.getConditions(fixture);
    return `<div class="bracket-match" data-id="${fixture.id}">
      <div class="match-meta"><span class="session">${fixture.session}</span>${status}</div>
      <div class="conditions-tag">${CONDITIONS.describeConditionsShort(conditions)}</div>
      ${row(teamA)}${row(teamB)}
      <div class="match-result-line"><span>${line}</span><span class="more-link">${result ? "More ›" : ""}</span></div>
    </div>`;
  }

  function miniStandingsTable(rows) {
    return `<table class="standings-table" style="margin-bottom:14px;">
      <thead><tr><th>#</th><th>Team</th><th>M</th><th>W</th><th>L</th><th>T</th><th>NRR</th><th>Pts</th></tr></thead>
      <tbody>${rows
        .map(
          (r) => `<tr><td>${r.rank}</td><td class="team-cell"><span class="flag">${r.flag}</span>${r.name}</td><td>${r.played}</td><td>${r.won}</td><td>${r.lost}</td><td>${r.tied}</td><td>${r.nrr > 0 ? "+" : ""}${r.nrr.toFixed(3)}</td><td><b>${r.points}</b></td></tr>`
        )
        .join("")}</tbody>
    </table>`;
  }

  function attachClicks() {
    body.querySelectorAll(".bracket-match[data-id]").forEach((el) => {
      el.addEventListener("click", () => (window.location.href = `match.html?id=${el.dataset.id}`));
    });
  }

  function renderIntro(canGenerate, note) {
    return `<div class="bracket-stage">
      <h3>How the playoffs work</h3>
      <div class="bracket-note">
        Top 9 in the league table qualify. Rank 1 gets a bye straight to the final group.
        Ranks 2&ndash;9 split into two groups of 4 (round robin, win&nbsp;=&nbsp;3, washout/tie&nbsp;=&nbsp;1, loss&nbsp;=&nbsp;0).
        Each group's top 2 advance, plus the better of the two 3rd-place teams ("best third").
        Knockout: A1 v B2, B1 v A2, Best&nbsp;3rd v Rank&nbsp;1. The 3 winners play a round-robin group of 3;
        the top 2 meet in a best-of-7 Grand Final.
      </div>
      ${note ? `<div class="bracket-note">${note}</div>` : ""}
      <button class="pill-btn primary" id="genBtn" ${canGenerate ? "" : "disabled"}>Generate playoff bracket from current standings</button>
    </div>`;
  }

  function render() {
    if (!BRACKET.hasState()) {
      const results = SEASON.playedResults(season);
      const standings = SEASON.computeStandings(results);
      const eligible = standings.filter((r) => r.played > 0).length;
      const canGenerate = eligible >= 9;
      body.innerHTML = renderIntro(canGenerate, canGenerate ? "" : `Need at least 9 teams with a played league match first (currently ${eligible}/9).`);
      const btn = document.getElementById("genBtn");
      if (btn && canGenerate) {
        btn.addEventListener("click", () => {
          BRACKET.generate(standings);
          render();
        });
      }
      return;
    }

    const state = BRACKET.getState();
    let html = renderIntro(false, "");
    html += `<div class="bracket-stage">
      <h3>Seeding</h3>
      <div class="bracket-note"><b>Rank 1 (bye):</b> ${DATA.TEAMS_BY_CODE[state.rank1].flag} ${DATA.TEAMS_BY_CODE[state.rank1].name}</div>
      <div class="bracket-note"><b>Group A:</b> ${state.groupA.map((c) => DATA.TEAMS_BY_CODE[c].flag + " " + DATA.TEAMS_BY_CODE[c].name).join(", ")}</div>
      <div class="bracket-note"><b>Group B:</b> ${state.groupB.map((c) => DATA.TEAMS_BY_CODE[c].flag + " " + DATA.TEAMS_BY_CODE[c].name).join(", ")}</div>
      <button class="pill-btn" id="resetBtn">Reset playoffs</button>
    </div>`;

    ["A", "B"].forEach((key) => {
      const fixtures = BRACKET.groupFixtures(key);
      const rows = BRACKET.withResults(fixtures);
      const standingsG = BRACKET.groupStandings(key);
      html += `<div class="bracket-stage">
        <h3>Group ${key}</h3>
        ${miniStandingsTable(standingsG)}
        ${rows.map((r) => fixtureRow(r.fixture, r.result)).join("")}
      </div>`;
    });

    const ko = BRACKET.knockoutFixtures();
    if (ko) {
      const rows = BRACKET.withResults(ko);
      html += `<div class="bracket-stage">
        <h3>Knockout</h3>
        <div class="bracket-note"><b>Best 3rd:</b> ${DATA.TEAMS_BY_CODE[BRACKET.bestThird()].flag} ${DATA.TEAMS_BY_CODE[BRACKET.bestThird()].name}</div>
        ${rows.map((r) => fixtureRow(r.fixture, r.result)).join("")}
      </div>`;
    } else {
      html += `<div class="bracket-stage"><h3>Knockout</h3><div class="bracket-note">Unlocks once both groups finish all 6 matches.</div></div>`;
    }

    const fg = BRACKET.finalGroupFixtures();
    if (fg) {
      const rows = BRACKET.withResults(fg);
      const st = BRACKET.finalGroupStandings();
      html += `<div class="bracket-stage">
        <h3>Final Group</h3>
        ${st.length ? miniStandingsTable(st) : ""}
        ${rows.map((r) => fixtureRow(r.fixture, r.result)).join("")}
      </div>`;
    } else if (ko) {
      html += `<div class="bracket-stage"><h3>Final Group</h3><div class="bracket-note">Unlocks once all 3 knockout matches are played.</div></div>`;
    }

    const finalists = BRACKET.grandFinalists();
    if (finalists) {
      const gf = BRACKET.grandFinalFixtures();
      const rows = BRACKET.withResults(gf);
      let winsA = 0,
        winsB = 0;
      rows.forEach((r) => {
        if (!r.result) return;
        if (r.result.winner === finalists[0]) winsA++;
        else if (r.result.winner === finalists[1]) winsB++;
      });
      const champ = BRACKET.champion();
      html += `<div class="bracket-stage">
        <h3>Grand Final (best of 7)</h3>
        <div class="bracket-note"><b>${DATA.TEAMS_BY_CODE[finalists[0]].flag} ${DATA.TEAMS_BY_CODE[finalists[0]].name} ${winsA} — ${winsB} ${DATA.TEAMS_BY_CODE[finalists[1]].name} ${DATA.TEAMS_BY_CODE[finalists[1]].flag}</b></div>
        ${champ ? `<div class="potm-banner"><div><div class="label">Champion</div><div class="name">${DATA.TEAMS_BY_CODE[champ].flag} ${DATA.TEAMS_BY_CODE[champ].name}</div></div></div>` : ""}
        ${rows.map((r) => fixtureRow(r.fixture, r.result)).join("")}
      </div>`;
    } else if (fg) {
      html += `<div class="bracket-stage"><h3>Grand Final</h3><div class="bracket-note">Unlocks once the final group's 3 matches are played.</div></div>`;
    }

    body.innerHTML = html;
    attachClicks();
    document.getElementById("resetBtn").addEventListener("click", () => {
      if (confirm("Reset the playoffs? This clears the bracket and all playoff results (league results are untouched).")) {
        BRACKET.reset();
        render();
      }
    });
  }

  render();
})();
