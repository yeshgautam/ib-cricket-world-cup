// Central "how does this fixture get a result" rule, used by every page: New Zealand's
// matches are always played for real and entered manually; every other match is
// auto-simulated (deterministic, weighted by team rating) so the rest of the league
// fills itself in. A manual entry always wins if one exists (so any match can be
// corrected/entered by hand, NZ or not) - it's just that NZ is the only team that
// *requires* one before a result appears.
(function (global) {
  const USER_TEAM = "NZ";

  // Auto-simulating ~220 matches is not free (~1ms each); several pages call
  // resolveResult for the same fixture more than once per render, so memoize per
  // page load. Cache key folds in the entry so saving/editing a result invalidates it.
  const cache = new Map();

  function resolveResult(fixture) {
    const entry = STORE.getEntry(fixture.id);
    const key = fixture.id + "|" + (entry ? JSON.stringify(entry) : "0");
    if (cache.has(key)) return cache.get(key);
    const result = entry
      ? AUTOFILL.buildMatchResult(fixture, entry)
      : fixture.teamA === USER_TEAM || fixture.teamB === USER_TEAM
      ? null // needs a manual entry
      : SIM.simulateMatch(fixture); // auto-simulated
    cache.set(key, result);
    return result;
  }

  function needsManualEntry(fixture) {
    return fixture.teamA === USER_TEAM || fixture.teamB === USER_TEAM;
  }

  const RESOLVE = { resolveResult, needsManualEntry, USER_TEAM };
  if (typeof module !== "undefined") module.exports = RESOLVE;
  else global.RESOLVE = RESOLVE;
})(typeof window !== "undefined" ? window : globalThis);
