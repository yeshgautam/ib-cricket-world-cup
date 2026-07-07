// The manual scorecard entry form: runs / 4s / 6s / out-or-not / (optional) over of
// dismissal per batter. Everything else (balls faced, extras, bowling figures, dismissal
// text, Player of the Match) is derived by js/autofill.js.
(function (global) {
  function teamBlockHtml(code, existingBatters) {
    const squad = DATA.SQUADS[code].players;
    const rows = squad
      .map((p, i) => {
        const be = (existingBatters && existingBatters[i]) || { status: "dnb", runs: 0, fours: 0, sixes: 0, overOut: "" };
        const sel = (v) => (be.status === v ? "selected" : "");
        return `<tr data-idx="${i}">
        <td>${p.name} <span style="color:var(--text-faint); font-size:10px;">(${p.role})</span></td>
        <td><select class="status-sel">
          <option value="dnb" ${sel("dnb")}>DNB</option>
          <option value="not_out" ${sel("not_out")}>Not out</option>
          <option value="out" ${sel("out")}>Out</option>
        </select></td>
        <td><input type="number" min="0" class="runs-in" value="${be.runs || 0}" /></td>
        <td><input type="number" min="0" class="fours-in" value="${be.fours || 0}" /></td>
        <td><input type="number" min="0" class="sixes-in" value="${be.sixes || 0}" /></td>
        <td><input type="text" class="over-in" placeholder="e.g. 8.2" value="${be.overOut || ""}" /></td>
      </tr>`;
      })
      .join("");
    return `<table class="entry-table" data-team="${code}">
      <thead><tr><th>Batter</th><th>Status</th><th>R</th><th>4s</th><th>6s</th><th>Over out</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="entry-totals">Total so far: <b class="live-total">0</b> runs off <b class="live-wkts">0</b> wicket(s)</div>`;
  }

  function readTeamBlock(tableEl) {
    const batters = [];
    tableEl.querySelectorAll("tbody tr").forEach((tr) => {
      const status = tr.querySelector(".status-sel").value;
      batters.push({
        status,
        runs: Number(tr.querySelector(".runs-in").value) || 0,
        fours: Number(tr.querySelector(".fours-in").value) || 0,
        sixes: Number(tr.querySelector(".sixes-in").value) || 0,
        overOut: tr.querySelector(".over-in").value,
      });
    });
    return batters;
  }

  function updateLiveTotal(tableEl) {
    let runs = 0,
      wkts = 0;
    tableEl.querySelectorAll("tbody tr").forEach((tr) => {
      const status = tr.querySelector(".status-sel").value;
      if (status === "dnb") return;
      runs += Number(tr.querySelector(".runs-in").value) || 0;
      if (status === "out") wkts++;
    });
    const wrap = tableEl.nextElementSibling;
    wrap.querySelector(".live-total").textContent = runs;
    wrap.querySelector(".live-wkts").textContent = wkts;
  }

  // renders into `container`, calls onSaved(entry) after a successful save
  function mountEntryForm(container, fixture, onSaved) {
    const teamA = DATA.TEAMS_BY_CODE[fixture.teamA];
    const teamB = DATA.TEAMS_BY_CODE[fixture.teamB];
    const existing = STORE.getEntry(fixture.id);
    const existingBattingFirst = existing ? existing.battingFirst : fixture.teamA;
    const existingByCode = {};
    if (existing) {
      existingByCode[existing.battingFirst] = existing.innings[0].batters;
      const second = existing.battingFirst === fixture.teamA ? fixture.teamB : fixture.teamA;
      existingByCode[second] = existing.innings[1].batters;
    }

    container.innerHTML = `
      <div class="entry-section">
        <div class="entry-row-inline">
          <label><b>Who batted first?</b></label>
          <select id="battingFirstSel">
            <option value="${teamA.code}" ${existingBattingFirst === teamA.code ? "selected" : ""}>${teamA.flag} ${teamA.name}</option>
            <option value="${teamB.code}" ${existingBattingFirst === teamB.code ? "selected" : ""}>${teamB.flag} ${teamB.name}</option>
          </select>
        </div>
        <div class="hint">Enter runs / 4s / 6s and whether each batter got out. Everything else (balls faced, extras, bowling figures, dismissals, Player of the Match) is filled in automatically.</div>

        <h3>${teamA.flag} ${teamA.name}</h3>
        ${teamBlockHtml(teamA.code, existingByCode[teamA.code])}

        <h3>${teamB.flag} ${teamB.name}</h3>
        ${teamBlockHtml(teamB.code, existingByCode[teamB.code])}
      </div>
      <div class="entry-actions">
        <button class="pill-btn primary" id="saveResultBtn">Save result</button>
        ${existing ? '<button class="pill-btn" id="deleteResultBtn">Delete result</button>' : ""}
      </div>
    `;

    const tables = container.querySelectorAll(".entry-table");
    tables.forEach((t) => {
      updateLiveTotal(t);
      t.addEventListener("input", () => updateLiveTotal(t));
      t.addEventListener("change", () => updateLiveTotal(t));
    });

    container.querySelector("#saveResultBtn").addEventListener("click", () => {
      const battingFirst = container.querySelector("#battingFirstSel").value;
      const battingSecond = battingFirst === teamA.code ? teamB.code : teamA.code;
      const firstTable = container.querySelector(`.entry-table[data-team="${battingFirst}"]`);
      const secondTable = container.querySelector(`.entry-table[data-team="${battingSecond}"]`);
      const entry = {
        battingFirst,
        innings: [{ batters: readTeamBlock(firstTable) }, { batters: readTeamBlock(secondTable) }],
      };
      const anyBatting = entry.innings.some((inn) => inn.batters.some((b) => b.status !== "dnb"));
      if (!anyBatting) {
        alert("Enter at least one batter's result before saving.");
        return;
      }
      STORE.saveEntry(fixture.id, entry);
      onSaved(entry);
    });

    const delBtn = container.querySelector("#deleteResultBtn");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        if (confirm("Delete this result?")) {
          STORE.deleteEntry(fixture.id);
          onSaved(null);
        }
      });
    }
  }

  const ENTRYFORM = { mountEntryForm };
  if (typeof module !== "undefined") module.exports = ENTRYFORM;
  else global.ENTRYFORM = ENTRYFORM;
})(typeof window !== "undefined" ? window : globalThis);
