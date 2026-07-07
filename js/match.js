(function () {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get("id");
  const season = SEASON.buildSeason();
  const fixture = season.byId[matchId] || BRACKET.getFixtureById(matchId);
  const isPlayoff = !season.byId[matchId];
  const backHref = isPlayoff ? "bracket.html" : "index.html";
  const backLabel = isPlayoff ? "← Back to bracket" : "← Back to matches";

  if (!fixture) {
    document.querySelector(".page").innerHTML = `<div class="card"><div class="empty-note">Match not found. <a href="index.html" style="color:var(--blue);">Back to matches</a></div></div>`;
    return;
  }
  document.querySelector(".back-row a").setAttribute("href", backHref);
  document.querySelector(".back-row a").textContent = backLabel;

  const teamA = DATA.TEAMS_BY_CODE[fixture.teamA];
  const teamB = DATA.TEAMS_BY_CODE[fixture.teamB];
  const conditions = CONDITIONS.getConditions(fixture);
  const conditionsLine = CONDITIONS.describeConditions(conditions);
  const isManual = RESOLVE.needsManualEntry(fixture);

  function fmtDate(dstr) {
    const d = new Date(dstr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  function scoreStr(inn) {
    return inn.allOut ? `${inn.total}` : `${inn.total}/${inn.wickets}`;
  }
  function playerLabel(name) {
    const [code, num] = name.split(" ");
    return { code, num, team: DATA.TEAMS_BY_CODE[code] };
  }

  function showEntryForm() {
    document.getElementById("tabsWrap").style.display = "none";
    document.getElementById("entryWrap").style.display = "block";
    document.getElementById("scoreSummary").innerHTML = `
      <div class="sub-line">${fmtDate(fixture.date)} · ${fixture.session} · ${fixture.time} · ${fixture.venue}</div>
      <div class="sub-line">${conditionsLine}</div>
      <div class="team-row"><div class="team-id"><span class="flag" style="font-size:22px;">${teamA.flag}</span><span class="tname">${teamA.name}</span></div></div>
      <div class="team-row"><div class="team-id"><span class="flag" style="font-size:22px;">${teamB.flag}</span><span class="tname">${teamB.name}</span></div></div>
      <div class="result-line" style="color:var(--text-faint);">Not yet played — enter the result below</div>
    `;
    ENTRYFORM.mountEntryForm(document.getElementById("entryWrap"), fixture, () => render());
  }

  function renderSummaryHeader(m) {
    const innByTeam = { [m.innings[0].battingTeam]: m.innings[0], [m.innings[1].battingTeam]: m.innings[1] };
    const rows = [teamA, teamB]
      .map((t) => {
        const inn = innByTeam[t.code];
        const isWinner = m.winner === t.code;
        return `<div class="team-row">
        <div class="team-id"><span class="flag" style="font-size:22px;">${t.flag}</span><span class="tname ${isWinner ? "winner" : ""}">${t.name}</span></div>
        <span class="team-score">${scoreStr(inn)} <span style="color:var(--text-faint); font-weight:400;">(${inn.overs} ov)</span></span>
      </div>`;
      })
      .join("");

    document.getElementById("scoreSummary").innerHTML = `
      <div class="sub-line">${fmtDate(fixture.date)} · ${fixture.session} · ${fixture.venue}</div>
      <div class="sub-line">${conditionsLine}</div>
      ${rows}
      <div class="result-line">${m.result}</div>
    `;
  }

  function potmInfo(m) {
    const p = playerLabel(m.potm);
    let batLine = "",
      bowlLine = "";
    m.innings.forEach((inn) => {
      const b = inn.battingCard.find((x) => x.name === m.potm);
      if (b) batLine = `${b.runs} (${b.balls})`;
      const bw = inn.bowlingCard.find((x) => x.name === m.potm);
      if (bw && bw.wickets + bw.runs > 0) bowlLine = `${bw.wickets}/${bw.runs} (${bw.overs})`;
    });
    const stat = [batLine, bowlLine].filter(Boolean).join(" & ");
    return { p, stat };
  }

  function inningsSummaryBlock(inn) {
    const team = DATA.TEAMS_BY_CODE[inn.battingTeam];
    const topBat = inn.battingCard
      .slice()
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 3);
    const topBowl = inn.bowlingCard
      .slice()
      .filter((b) => Number(b.overs) > 0)
      .sort((a, b) => b.wickets - a.wickets || a.econ - b.econ)
      .slice(0, 3);
    return `<div class="innings-summary">
      <h4>${team.flag} ${team.name} · ${scoreStr(inn)} (${inn.overs})</h4>
      <div style="display:flex; gap:24px;">
        <div style="flex:1; min-width:0;">
          ${topBat.map((b) => `<div class="mini-line"><span class="name">${b.name}</span><span>${b.runs} (${b.balls})</span></div>`).join("")}
        </div>
        <div style="flex:1; min-width:0;">
          ${topBowl.map((b) => `<div class="mini-line"><span class="name">${b.name}</span><span>${b.wickets}/${b.runs} (${b.overs})</span></div>`).join("")}
        </div>
      </div>
    </div>`;
  }

  function renderSummary(m) {
    const { p, stat } = potmInfo(m);
    return `
      <div class="potm-banner">
        <div>
          <div class="label">Player of the Match</div>
          <div class="name">${p.team.flag} ${p.code} #${p.num} ${stat ? "· " + stat : ""}</div>
        </div>
        <div class="potm-avatar" style="background:${p.team.color};">${p.num}</div>
      </div>
      ${inningsSummaryBlock(m.innings[0])}
      ${inningsSummaryBlock(m.innings[1])}
      <div class="meta-block">
        <div><b>${DATA.TEAMS_BY_CODE[m.battingFirst].name}</b> batted first</div>
        <div><b>Venue:</b> ${m.venue}</div>
        <div><b>Conditions:</b> ${CONDITIONS.describeConditions(m.conditions)}</div>
      </div>
    `;
  }

  let scorecardTeam = fixture.teamA;

  function scorecardBattingTable(inn) {
    const rows = inn.battingCard
      .map(
        (b) => `<tr>
      <td><span class="batter-name">${b.name}</span><span class="batter-dismissal">${b.howOut}</span></td>
      <td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td><td>${b.sr}</td>
    </tr>`
      )
      .join("");
    const extras = inn.extras;
    return `<table class="score-table">
      <thead><tr><th>Batting</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>S/R</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="extras-row"><td>Extras</td><td colspan="5">${inn.extrasTotal} (w ${extras.wide}, nb ${extras.noball}, b ${extras.bye}, lb ${extras.legbye})</td></tr>
        <tr class="total-row"><td>Total</td><td colspan="5">${scoreStr(inn)} (${inn.allOut ? "all out, " : ""}${inn.overs} ov)</td></tr>
      </tbody>
    </table>`;
  }

  function scorecardBowlingTable(inn) {
    const rows = inn.bowlingCard
      .map((b) => `<tr><td>${b.name}</td><td>${b.overs}</td><td>${b.maidens}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${b.econ}</td></tr>`)
      .join("");
    return `<table class="score-table">
      <thead><tr><th>Bowling</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  function renderScorecard(m) {
    const innByTeam = { [m.innings[0].battingTeam]: m.innings[0], [m.innings[1].battingTeam]: m.innings[1] };
    const inn = innByTeam[scorecardTeam];
    const fowLine = inn.fow.map((f) => `${f.score}/${f.wicket} (${f.batter}, ${f.over} ov)`).join(", ") || "—";
    return `
      <div class="team-toggle">
        <button data-t="${fixture.teamA}" class="${scorecardTeam === fixture.teamA ? "active" : ""}">${teamA.flag} ${teamA.name}</button>
        <button data-t="${fixture.teamB}" class="${scorecardTeam === fixture.teamB ? "active" : ""}">${teamB.flag} ${teamB.name}</button>
      </div>
      ${scorecardBattingTable(inn)}
      <div class="fow-block"><b>Fall of wickets:</b> ${fowLine}</div>
      <div class="section-title">Bowling — ${DATA.TEAMS_BY_CODE[inn.bowlingTeam].name}</div>
      ${scorecardBowlingTable(inn)}
    `;
  }

  function renderMoments(m) {
    function block(inn, label) {
      const items = inn.fow
        .slice()
        .reverse()
        .map((f) => `<div class="moment-item"><span class="ov">${f.over}</span><span>WICKET! ${f.batter} ${f.howOut} — ${f.score}/${f.wicket}</span></div>`)
        .join("");
      return `<div class="moments-inn">
        <h4>${label}</h4>
        ${items || '<div class="empty-note" style="padding:12px 0;">No wickets recorded.</div>'}
      </div>`;
    }
    return block(m.innings[0], `${DATA.TEAMS_BY_CODE[m.innings[0].battingTeam].name} innings`) + block(m.innings[1], `${DATA.TEAMS_BY_CODE[m.innings[1].battingTeam].name} innings`);
  }

  function attachScorecardToggle(m) {
    document.querySelectorAll(".team-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        scorecardTeam = btn.dataset.t;
        document.getElementById("tabContent").innerHTML = renderScorecard(m);
        attachScorecardToggle(m);
      });
    });
  }

  function renderTab(m, tab) {
    const el = document.getElementById("tabContent");
    if (tab === "summary") el.innerHTML = renderSummary(m);
    else if (tab === "scorecard") {
      el.innerHTML = renderScorecard(m);
      attachScorecardToggle(m);
    } else el.innerHTML = renderMoments(m);
  }

  let currentMatch = null;
  let activeTab = "summary";

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      activeTab = t.dataset.tab;
      renderTab(currentMatch, activeTab);
    })
  );

  const editBtn = document.getElementById("editResultBtn");
  if (isManual) {
    editBtn.addEventListener("click", () => {
      document.getElementById("tabsWrap").style.display = "none";
      document.getElementById("entryWrap").style.display = "block";
      ENTRYFORM.mountEntryForm(document.getElementById("entryWrap"), fixture, () => render());
    });
  } else {
    editBtn.style.display = "none";
  }

  function showResult(m) {
    currentMatch = m;
    document.getElementById("entryWrap").style.display = "none";
    document.getElementById("tabsWrap").style.display = "block";
    renderSummaryHeader(m);
    tabs.forEach((x) => x.classList.remove("active"));
    document.querySelector('.tab[data-tab="summary"]').classList.add("active");
    activeTab = "summary";
    renderTab(m, "summary");
  }

  function render() {
    const result = SEASON.getResult(fixture);
    if (result) showResult(result);
    else showEntryForm();
  }

  render();
})();
