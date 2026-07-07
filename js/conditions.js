// Per-match conditions: pitch and time-of-day are rolled per fixture (groundstaff prep
// and weather vary game to game, even at the same venue); stadium size is fixed to
// whichever team is hosting (see stadiumSize in js/data.js). Deterministic per fixture id.
(function (global) {
  const PITCH_WEIGHTS = { Normal: 35, Dry: 25, Green: 22, Bouncy: 18 };
  const TIME_WEIGHTS = { Day: 45, Night: 35, Overcast: 20 };

  function getConditions(fixture) {
    const rng = PRNG.rngFromString(fixture.id + "|conditions");
    const pitch = PRNG.weightedPick(PITCH_WEIGHTS, rng);
    const time = PRNG.weightedPick(TIME_WEIGHTS, rng);
    const host = DATA.TEAMS_BY_CODE[fixture.home || fixture.teamA];
    const stadiumSize = host ? host.stadiumSize : "Small";
    return { pitch, time, stadiumSize };
  }

  // Multipliers applied to the ball-by-ball simulator's outcome weights. Kept modest -
  // conditions should nudge the game, not dominate it.
  function conditionMultipliers(conditions) {
    const m = { boundary: 1, six: 1, wicket: 1, dot: 1 };
    switch (conditions.pitch) {
      case "Bouncy":
        m.wicket *= 1.15;
        m.boundary *= 0.95;
        break;
      case "Green":
        m.wicket *= 1.25;
        m.boundary *= 0.85;
        m.dot *= 1.1;
        break;
      case "Dry":
        m.wicket *= 1.05;
        m.boundary *= 1.05;
        break;
      // Normal: no change
    }
    switch (conditions.time) {
      case "Overcast":
        m.wicket *= 1.15;
        m.boundary *= 0.9;
        break;
      case "Night":
        m.boundary *= 1.05;
        break;
      // Day: no change
    }
    if (conditions.stadiumSize === "Big") {
      m.boundary *= 0.85;
      m.six *= 0.75;
    } else {
      m.boundary *= 1.1;
      m.six *= 1.2;
    }
    return m;
  }

  function describeConditions(c) {
    return `${c.pitch} pitch · ${c.stadiumSize} ground · ${c.time}`;
  }

  const PITCH_ICON = { Normal: "⚪", Dry: "🟤", Green: "🟢", Bouncy: "⚡" };
  const TIME_ICON = { Day: "☀️", Overcast: "☁️", Night: "🌙" };

  function describeConditionsShort(c) {
    return `${PITCH_ICON[c.pitch]} ${c.pitch} · ${c.stadiumSize} ground · ${TIME_ICON[c.time]} ${c.time}`;
  }

  const CONDITIONS = { getConditions, conditionMultipliers, describeConditions, describeConditionsShort };
  if (typeof module !== "undefined") module.exports = CONDITIONS;
  else global.CONDITIONS = CONDITIONS;
})(typeof window !== "undefined" ? window : globalThis);
