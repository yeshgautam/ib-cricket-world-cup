// Team ratings are a rough distillation of recent (2023-2026) results across formats:
// ICC rankings trends, recent World Cup/series outcomes, and head-to-head form.
// Placeholder squads (11 per team) are generated from role templates below -- swap in the
// real squads by editing PLAYER_NAMES once they're available; nothing else needs to change.
(function (global) {
  const ENGLAND_FLAG = "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}";

  const TEAMS = [
    { code: "IND", name: "India", flag: "🇮🇳", rating: 96, venue: "Wankhede Stadium, Mumbai", color: "#1a4fa0" },
    { code: "AUS", name: "Australia", flag: "🇦🇺", rating: 93, venue: "Melbourne Cricket Ground, Melbourne", color: "#e6b800" },
    { code: "SA", name: "South Africa", flag: "🇿🇦", rating: 90, venue: "The Wanderers, Johannesburg", color: "#007749" },
    { code: "ENG", name: "England", flag: ENGLAND_FLAG, rating: 89, venue: "Lord's, London", color: "#00247d" },
    { code: "NZ", name: "New Zealand", flag: "🇳🇿", rating: 88, venue: "Eden Park, Auckland", color: "#222222" },
    { code: "PAK", name: "Pakistan", flag: "🇵🇰", rating: 83, venue: "Gaddafi Stadium, Lahore", color: "#01411c" },
    { code: "AFG", name: "Afghanistan", flag: "🇦🇫", rating: 80, venue: "Sharjah Cricket Stadium, Sharjah", color: "#0066b3" },
    { code: "SL", name: "Sri Lanka", flag: "🇱🇰", rating: 78, venue: "R. Premadasa Stadium, Colombo", color: "#0b4ea2" },
    { code: "WI", name: "West Indies", flag: "🏏", rating: 75, venue: "Kensington Oval, Bridgetown", color: "#7b0d1e" },
    { code: "BAN", name: "Bangladesh", flag: "🇧🇩", rating: 74, venue: "Sher-e-Bangla Stadium, Dhaka", color: "#006a4e" },
    { code: "ZIM", name: "Zimbabwe", flag: "🇿🇼", rating: 66, venue: "Harare Sports Club, Harare", color: "#d40000" },
    { code: "IRE", name: "Ireland", flag: "🇮🇪", rating: 63, venue: "Malahide Cricket Club, Dublin", color: "#169b62" },
  ];

  const TEAMS_BY_CODE = {};
  TEAMS.forEach((t) => (TEAMS_BY_CODE[t.code] = t));

  // batOff/bowlOff are applied to a team's overall rating to derive each placeholder
  // player's batting/bowling skill. Index order doubles as the batting order.
  const ROLE_TEMPLATE = [
    { role: "Opener", batOff: 3, bowlOff: -68 },
    { role: "Opener", batOff: 0, bowlOff: -68 },
    { role: "Top order", batOff: 4, bowlOff: -70 },
    { role: "Top order", batOff: 1, bowlOff: -70 },
    { role: "Middle order", batOff: -2, bowlOff: -62 },
    { role: "All-rounder", batOff: -6, bowlOff: -6 },
    { role: "Wicketkeeper", batOff: -4, bowlOff: -75, keeper: true },
    { role: "All-rounder", batOff: -12, bowlOff: -4 },
    { role: "Bowler", batOff: -22, bowlOff: 3 },
    { role: "Bowler", batOff: -27, bowlOff: 1 },
    { role: "Bowler", batOff: -30, bowlOff: -1 },
  ];

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function buildSquad(team) {
    return ROLE_TEMPLATE.map((tpl, i) => ({
      name: `${team.code} ${i + 1}`,
      order: i + 1,
      role: tpl.role,
      keeper: !!tpl.keeper,
      bat: clamp(Math.round(team.rating + tpl.batOff), 18, 99),
      bowl: clamp(Math.round(team.rating + tpl.bowlOff), 10, 96),
      team: team.code,
    }));
  }

  const SQUADS = {};
  TEAMS.forEach((t) => {
    const squad = buildSquad(t);
    SQUADS[t.code] = {
      players: squad,
      // exactly 5 bowling options: 2 all-rounders + 3 specialist bowlers (indices 5,7,8,9,10)
      bowlers: [squad[5], squad[7], squad[8], squad[9], squad[10]],
    };
  });

  const DATA = { TEAMS, TEAMS_BY_CODE, SQUADS, buildSquad };
  if (typeof module !== "undefined") module.exports = DATA;
  else global.DATA = DATA;
})(typeof window !== "undefined" ? window : globalThis);
