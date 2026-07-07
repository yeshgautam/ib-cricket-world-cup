// The manual scorecard entry form - New Zealand's batting only. The opponent always
// bats first and is fully auto-simulated (their batting and New Zealand's bowling
// figures against them); here you enter New Zealand's runs / 4s / 6s / out-or-not per
// batter (plus an optional over-of-dismissal). Everything else - balls faced, the
// opponent's bowling figures against New Zealand, dismissal text, Player of the Match -
// is derived automatically (js/autofill.js).
(function (global) {
  function battingTableHtml(existingBatters) {
    const squad = DATA.SQUADS.NZ.players;
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
    return `<table class="entry-table" data-team="NZ">
      <thead><tr><th>Batter</th><th>Status</th><th>R</th><th>4s</th><th>6s</th><th>Over out</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="entry-totals">Total so far: <b class="live-total">0</b> runs off <b class="live-wkts">0</b> wicket(s)</div>`;
  }

  function readBattingTable(tableEl) {
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

  // renders into `container`, calls onSaved(entry) after a successful save. `fixture`
  // must involve NZ - this form only ever collects New Zealand's batting.
  function mountEntryForm(container, fixture, onSaved) {
    const opponentCode = fixture.teamA === "NZ" ? fixture.teamB : fixture.teamA;
    const opponent = DATA.TEAMS_BY_CODE[opponentCode];
    const existing = STORE.getEntry(fixture.id);

    container.innerHTML = `
      <div class="entry-section">
        <div class="hint">${opponent.flag} ${opponent.name} bat first (auto-simulated). Enter New Zealand's runs / 4s / 6s and whether each batter got out - balls faced, extras, ${opponent.name}'s bowling figures, dismissals, and Player of the Match are all filled in automatically.</div>

        <h3>🇳🇿 New Zealand batting</h3>
        ${battingTableHtml(existing ? existing.batters : null)}
      </div>
      <div class="entry-actions">
        <button class="pill-btn primary" id="saveResultBtn">Save result</button>
        ${existing ? '<button class="pill-btn" id="deleteResultBtn">Delete result</button>' : ""}
      </div>
    `;

    const table = container.querySelector(".entry-table");
    updateLiveTotal(table);
    table.addEventListener("input", () => updateLiveTotal(table));
    table.addEventListener("change", () => updateLiveTotal(table));

    container.querySelector("#saveResultBtn").addEventListener("click", () => {
      const batters = readBattingTable(table);
      if (!batters.some((b) => b.status !== "dnb")) {
        alert("Enter at least one batter's result before saving.");
        return;
      }
      STORE.saveEntry(fixture.id, { batters });
      onSaved({ batters });
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
