// Central "how does this fixture get a result" rule, used by every page: New Zealand
// always bats second. When New Zealand plays, the opponent's whole innings (their
// batting AND New Zealand's bowling figures against them) is auto-simulated, and New
// Zealand's innings comes from a manual batting-only entry (js/entry-form.js) with the
// opponent's bowling figures against New Zealand derived automatically. Every other
// match is fully auto-simulated (deterministic, weighted by team rating).
(function (global) {
  const USER_TEAM = "NZ";

  // Auto-simulating ~220 matches is not free (~1ms each); several pages call
  // resolveResult for the same fixture more than once per render, so memoize per
  // page load. Cache key folds in the entry so saving/editing a result invalidates it.
  const cache = new Map();

  function needsManualEntry(fixture) {
    return fixture.teamA === USER_TEAM || fixture.teamB === USER_TEAM;
  }

  function resolveResult(fixture) {
    const manual = needsManualEntry(fixture);
    const entry = manual ? STORE.getEntry(fixture.id) : null;
    const key = fixture.id + "|" + (entry ? JSON.stringify(entry) : "0");
    if (cache.has(key)) return cache.get(key);
    const result = entry ? AUTOFILL.buildNZMatchResult(fixture, entry) : manual ? null : SIM.simulateMatch(fixture);
    cache.set(key, result);
    return result;
  }

  const RESOLVE = { resolveResult, needsManualEntry, USER_TEAM };
  if (typeof module !== "undefined") module.exports = RESOLVE;
  else global.RESOLVE = RESOLVE;
})(typeof window !== "undefined" ? window : globalThis);
