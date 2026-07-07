// localStorage-backed store for manually entered match results. Static site, no backend:
// entries live in this browser only. Each entry is the *minimal* input a user provides
// (js/autofill.js expands it into a full scorecard on read).
(function (global) {
  const KEY = "ib-cricket-results-v1";

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeAll(obj) {
    localStorage.setItem(KEY, JSON.stringify(obj));
  }

  function getEntry(matchId) {
    return readAll()[matchId] || null;
  }

  function saveEntry(matchId, entry) {
    const all = readAll();
    all[matchId] = entry;
    writeAll(all);
  }

  function deleteEntry(matchId) {
    const all = readAll();
    delete all[matchId];
    writeAll(all);
  }

  function hasEntry(matchId) {
    return !!readAll()[matchId];
  }

  function playedMatchIds() {
    return Object.keys(readAll());
  }

  const STORE = { getEntry, saveEntry, deleteEntry, hasEntry, playedMatchIds };
  if (typeof module !== "undefined") module.exports = STORE;
  else global.STORE = STORE;
})(typeof window !== "undefined" ? window : globalThis);
