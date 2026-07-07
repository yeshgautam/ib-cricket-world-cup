// Playoff structure:
//  - Rank 1 (from the league table) gets a bye straight to the 3-team final group.
//  - Ranks 2-9 split into two groups of 4 (Group A: 2,4,6,8 / Group B: 3,5,7,9),
//    each a round robin (win=3, washout/tie=1, loss=0).
//  - From each group: 1st & 2nd advance. The better of the two groups' 3rd-place
//    finishers ("best third") also advances; the rest are eliminated.
//  - Knockout: A1 v B2, B1 v A2, BestThird v Rank1 (3 matches).
//  - The 3 knockout winners form a round-robin group of 3; top 2 advance.
//  - Grand Final: best-of-7, first to 4 wins.
// State lives in localStorage; every stage reuses the same manual entry form as the
// league (js/entry-form.js) and the same AUTOFILL engine, so team codes are all that's
// needed to build a "fixture".
(function (global) {
  const KEY = "ib-cricket-bracket-v1";
  const BASE_DATE_OFFSET = 200; // days after season start, safely past the league's span

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      return null;
    }
  }
  function writeState(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  function baseDate() {
    return SCHEDULE.formatDate(SCHEDULE.addDays(SCHEDULE.SEASON_START, BASE_DATE_OFFSET));
  }

  function hasState() {
    return !!readState();
  }
  function getState() {
    return readState();
  }

  function clearPlayoffEntries() {
    STORE.playedMatchIds()
      .filter((id) => /^(bg|bk|bf3|gf)-/.test(id))
      .forEach((id) => STORE.deleteEntry(id));
  }

  function generate(standings) {
    const played = standings.filter((r) => r.played > 0);
    if (played.length < 9) throw new Error("Need at least 9 teams with a played match to seed the playoffs.");
    clearPlayoffEntries();
    const top9 = standings.slice(0, 9);
    const rank1 = top9[0].code;
    const rest = top9.slice(1); // ranks 2-9, in order
    const groupA = [rest[0].code, rest[2].code, rest[4].code, rest[6].code];
    const groupB = [rest[1].code, rest[3].code, rest[5].code, rest[7].code];
    const state = { rank1, groupA, groupB, seeds: top9.map((r) => ({ rank: r.rank, code: r.code })), generatedAt: Date.now() };
    writeState(state);
    return state;
  }

  function reset() {
    clearPlayoffEntries();
    localStorage.removeItem(KEY);
  }

  function pairRoundRobin4(teams) {
    return [
      [teams[0], teams[1]],
      [teams[0], teams[2]],
      [teams[0], teams[3]],
      [teams[1], teams[2]],
      [teams[1], teams[3]],
      [teams[2], teams[3]],
    ];
  }

  function makeFixture(id, teamA, teamB, session, dayOffset) {
    return {
      id,
      teamA,
      teamB,
      home: teamA,
      date: SCHEDULE.formatDate(SCHEDULE.addDays(SCHEDULE.SEASON_START, BASE_DATE_OFFSET + dayOffset)),
      session,
      time: "Playoffs",
      venue: DATA.TEAMS_BY_CODE[teamA].venue,
    };
  }

  function groupFixtures(groupKey) {
    const state = readState();
    if (!state) return [];
    const teams = groupKey === "A" ? state.groupA : state.groupB;
    return pairRoundRobin4(teams).map(([a, b], i) => makeFixture(`bg-${groupKey}-${i + 1}`, a, b, `Group ${groupKey}`, i));
  }

  function withResults(fixtures) {
    return fixtures.map((f) => {
      const entry = STORE.getEntry(f.id);
      return { fixture: f, result: entry ? AUTOFILL.buildMatchResult(f, entry) : null };
    });
  }

  function groupComplete(groupKey) {
    return groupFixtures(groupKey).every((f) => STORE.hasEntry(f.id));
  }

  function groupStandings(groupKey) {
    const state = readState();
    if (!state) return [];
    const teams = groupKey === "A" ? state.groupA : state.groupB;
    const results = groupFixtures(groupKey)
      .map((f) => (STORE.hasEntry(f.id) ? AUTOFILL.buildMatchResult(f, STORE.getEntry(f.id)) : null))
      .filter(Boolean);
    return SEASON.computeStandings(results, teams, 50, { win: 3, tie: 1, loss: 0 });
  }

  function bestThird() {
    const a = groupStandings("A")[2];
    const b = groupStandings("B")[2];
    if (!a || !b) return null;
    if (a.points !== b.points) return a.points > b.points ? a.code : b.code;
    return a.nrr >= b.nrr ? a.code : b.code;
  }

  function knockoutFixtures() {
    const state = readState();
    if (!state || !groupComplete("A") || !groupComplete("B")) return null;
    const sa = groupStandings("A");
    const sb = groupStandings("B");
    const bt = bestThird();
    return [
      makeFixture("bk-1", sa[0].code, sb[1].code, "Knockout · A1 v B2", 20),
      makeFixture("bk-2", sb[0].code, sa[1].code, "Knockout · B1 v A2", 21),
      makeFixture("bk-3", bt, state.rank1, "Knockout · Best 3rd v Rank 1", 22),
    ];
  }

  function knockoutComplete() {
    const fx = knockoutFixtures();
    return fx && fx.every((f) => STORE.hasEntry(f.id));
  }

  function finalGroupTeams() {
    const fx = knockoutFixtures();
    if (!fx) return null;
    const results = fx.map((f) => (STORE.hasEntry(f.id) ? AUTOFILL.buildMatchResult(f, STORE.getEntry(f.id)) : null));
    if (results.some((r) => !r || r.tied)) return null; // knockout can't tie through to next round without a winner
    return results.map((r) => r.winner);
  }

  function finalGroupFixtures() {
    const teams = finalGroupTeams();
    if (!teams) return null;
    return [
      makeFixture("bf3-1", teams[0], teams[1], "Final Group", 30),
      makeFixture("bf3-2", teams[0], teams[2], "Final Group", 31),
      makeFixture("bf3-3", teams[1], teams[2], "Final Group", 32),
    ];
  }

  function finalGroupComplete() {
    const fx = finalGroupFixtures();
    return fx && fx.every((f) => STORE.hasEntry(f.id));
  }

  function finalGroupStandings() {
    const teams = finalGroupTeams();
    const fx = finalGroupFixtures();
    if (!teams || !fx) return [];
    const results = fx.map((f) => (STORE.hasEntry(f.id) ? AUTOFILL.buildMatchResult(f, STORE.getEntry(f.id)) : null)).filter(Boolean);
    return SEASON.computeStandings(results, teams, 50, { win: 3, tie: 1, loss: 0 });
  }

  function grandFinalists() {
    if (!finalGroupComplete()) return null;
    const st = finalGroupStandings();
    return [st[0].code, st[1].code];
  }

  // Returns the grand final fixtures actually needed so far: all played games plus the
  // next one to play, stopping once someone has reached 4 wins (or 7 games are done).
  function grandFinalFixtures() {
    const finalists = grandFinalists();
    if (!finalists) return null;
    const fixtures = [];
    let winsA = 0,
      winsB = 0;
    for (let g = 1; g <= 7; g++) {
      const f = makeFixture(`gf-${g}`, finalists[0], finalists[1], `Grand Final · Game ${g}`, 40 + g);
      fixtures.push(f);
      const entry = STORE.getEntry(f.id);
      if (entry) {
        const r = AUTOFILL.buildMatchResult(f, entry);
        if (r.winner === finalists[0]) winsA++;
        else if (r.winner === finalists[1]) winsB++;
        if (winsA >= 4 || winsB >= 4) break;
      } else {
        break; // stop at the next unplayed game
      }
    }
    return fixtures;
  }

  function champion() {
    const fx = grandFinalFixtures();
    if (!fx) return null;
    const finalists = grandFinalists();
    let winsA = 0,
      winsB = 0;
    fx.forEach((f) => {
      const entry = STORE.getEntry(f.id);
      if (!entry) return;
      const r = AUTOFILL.buildMatchResult(f, entry);
      if (r.winner === finalists[0]) winsA++;
      else if (r.winner === finalists[1]) winsB++;
    });
    if (winsA >= 4) return finalists[0];
    if (winsB >= 4) return finalists[1];
    return null;
  }

  function getFixtureById(id) {
    const state = readState();
    if (!state) return null;
    const all = [
      ...groupFixtures("A"),
      ...groupFixtures("B"),
      ...(knockoutFixtures() || []),
      ...(finalGroupFixtures() || []),
      ...(grandFinalFixtures() || []),
    ];
    return all.find((f) => f.id === id) || null;
  }

  const BRACKET = {
    hasState,
    getState,
    generate,
    reset,
    groupFixtures,
    withResults,
    groupComplete,
    groupStandings,
    bestThird,
    knockoutFixtures,
    knockoutComplete,
    finalGroupFixtures,
    finalGroupComplete,
    finalGroupStandings,
    grandFinalists,
    grandFinalFixtures,
    champion,
    getFixtureById,
  };
  if (typeof module !== "undefined") module.exports = BRACKET;
  else global.BRACKET = BRACKET;
})(typeof window !== "undefined" ? window : globalThis);
