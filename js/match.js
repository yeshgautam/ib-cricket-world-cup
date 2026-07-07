(function () {
  const params = new URLSearchParams(window.location.search);
  const matchId = params.get("id");
  const season = SEASON.buildSeason();
  const m = season.byId[matchId];

  if (!m) {
    document.querySelector(".page").innerHTML = `<div class="card"><div class="empty-note">Match not found. <a href="index.html" style="color:var(--teal-light);">Back to matches</a></div></div>`;
    return;
  }

  const teamA = DATA.TEAMS_BY_CODE[m.teamA];
  const teamB = DATA.TEAMS_BY_CODE[m.teamB];
  const inn1 = m.innings[0],
    inn2 = m.innings[1];
  const innByTeam = { [inn1.battingTeam]: inn1, [inn2.battingTeam]: inn2 };

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

  // ---------- score summary ----------
  function renderSummaryHeader() {
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
      <div class="sub-line">${fmtDate(m.fixture.date)} · ${m.fixture.session} · ODI · IB Cricket League 2027</div>
      ${rows}
      <div class="result-line">${m.result}</div>
    `;
  }

  // ---------- tabs ----------
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      renderTab(t.dataset.tab);
    })
  );

  function potmInfo() {
    const p = playerLabel(m.potm);
    let batLine = "",
      bowlLine = "";
    [inn1, inn2].forEach((inn) => {
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
    const bowlTeam = DATA.TEAMS_BY_CODE[inn.bowlingTeam];
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

  function renderSummary() {
    const { p, stat } = potmInfo();
    return `
      <div class="potm-banner">
        <div>
          <div class="label">Player of the Match</div>
          <div class="name">${p.team.flag} ${p.code} #${p.num} ${stat ? "· " + stat : ""}</div>
        </div>
        <div class="potm-avatar" style="background:${p.team.color};">${p.num}</div>
      </div>
      ${inningsSummaryBlock(inn1)}
      ${inningsSummaryBlock(inn2)}
      <div class="meta-block">
        <div><b>Toss:</b> ${DATA.TEAMS_BY_CODE[m.toss.winner].name} won the toss and elected to ${m.toss.decision} first</div>
        <div><b>Venue:</b> ${m.venue}</div>
      </div>
    `;
  }

  // ---------- scorecard ----------
  let scorecardTeam = m.teamA;

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

  function renderScorecard() {
    const inn = innByTeam[scorecardTeam];
    const fowLine = inn.fow.map((f) => `${f.score}/${f.wicket} (${f.batter}, ${f.over} ov)`).join(", ") || "—";
    return `
      <div class="team-toggle">
        <button data-t="${m.teamA}" class="${scorecardTeam === m.teamA ? "active" : ""}">${teamA.flag} ${teamA.name}</button>
        <button data-t="${m.teamB}" class="${scorecardTeam === m.teamB ? "active" : ""}">${teamB.flag} ${teamB.name}</button>
      </div>
      ${scorecardBattingTable(inn)}
      <div class="fow-block"><b>Fall of wickets:</b> ${fowLine}</div>
      <div class="section-title">Bowling — ${DATA.TEAMS_BY_CODE[inn.bowlingTeam].name}</div>
      ${scorecardBowlingTable(inn)}
    `;
  }

  function attachScorecardToggle() {
    document.querySelectorAll(".team-toggle button").forEach((btn) => {
      btn.addEventListener("click", () => {
        scorecardTeam = btn.dataset.t;
        document.getElementById("tabContent").innerHTML = renderScorecard();
        attachScorecardToggle();
      });
    });
  }

  // ---------- commentary ----------
  function renderCommentary() {
    function block(inn, events, label) {
      const items = events
        .slice()
        .reverse()
        .map((e) => {
          const cls = e.text.startsWith("WICKET") ? "wicket" : e.text.startsWith("SIX") ? "six" : "";
          return `<div class="commentary-item ${cls}"><span class="ov">${e.over}</span><span>${e.text}</span></div>`;
        })
        .join("");
      return `<div class="commentary-inn">
        <h4>${label}</h4>
        ${items || '<div class="empty-note" style="padding:12px 0;">No boundaries or wickets — a quiet passage of play.</div>'}
      </div>`;
    }
    return block(inn1, m.events[0], `${DATA.TEAMS_BY_CODE[inn1.battingTeam].name} innings`) + block(inn2, m.events[1], `${DATA.TEAMS_BY_CODE[inn2.battingTeam].name} innings`);
  }

  function renderTab(tab) {
    const el = document.getElementById("tabContent");
    if (tab === "summary") el.innerHTML = renderSummary();
    else if (tab === "scorecard") {
      el.innerHTML = renderScorecard();
      attachScorecardToggle();
    } else el.innerHTML = renderCommentary();
  }

  renderSummaryHeader();
  renderTab("summary");
})();
