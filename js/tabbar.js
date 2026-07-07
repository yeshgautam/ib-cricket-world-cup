(function (global) {
  const TABS = [
    { key: "matches", label: "Matches", href: "index.html" },
    { key: "standings", label: "Standings", href: "standings.html" },
    { key: "bracket", label: "Bracket", href: "bracket.html" },
    { key: "stats", label: "Stats", href: "stats.html" },
    { key: "players", label: "Players", href: "players.html" },
  ];

  function renderTabbar(activeKey) {
    return `<div class="tabbar">${TABS.map((t) => `<a href="${t.href}" class="${t.key === activeKey ? "active" : ""}">${t.label}</a>`).join("")}</div>`;
  }

  const TABBAR = { renderTabbar };
  if (typeof module !== "undefined") module.exports = TABBAR;
  else global.TABBAR = TABBAR;
})(typeof window !== "undefined" ? window : globalThis);
