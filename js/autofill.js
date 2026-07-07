// Takes the *minimal* thing a user actually types in after playing a match — each
// batter's runs / 4s / 6s / out-or-not / (optional) over of dismissal — and derives a
// complete, internally-consistent scorecard: balls faced, extras, a full bowling card,
// dismissal text, overs, result, and Player of the Match. Deterministic per (fixture,
// entry) pair, so re-rendering the same saved entry always looks the same, but editing
// and resaving an entry regenerates the derived parts.
(function (global) {
  function oversString(legalBalls) {
    return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  }

  function distributeInt(total, weights, rng, jitter) {
    jitter = jitter == null ? 0.3 : jitter;
    const n = weights.length;
    if (total <= 0) return weights.map(() => 0);
    const noisy = weights.map((w) => Math.max(0.001, w * (1 - jitter / 2 + rng() * jitter)));
    const sumW = noisy.reduce((a, b) => a + b, 0);
    const raw = noisy.map((w) => (w / sumW) * total);
    const floors = raw.map(Math.floor);
    const used = floors.reduce((a, b) => a + b, 0);
    const remainder = total - used;
    const fracIdx = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
    const result = floors.slice();
    for (let k = 0; k < remainder; k++) result[fracIdx[k % n].i]++;
    return result;
  }

  function buildRawInnings(squad, batterEntries, rng) {
    const battingCard = [];
    const fow = [];
    let runningScore = 0;
    let wicketsCount = 0;
    let totalRuns = 0;
    let totalBalls = 0;

    for (let idx = 0; idx < squad.length; idx++) {
      const be = (batterEntries && batterEntries[idx]) || { status: "dnb" };
      if (!be.status || be.status === "dnb") continue;

      const runs = Math.max(0, Number(be.runs) || 0);
      const fours = Math.max(0, Number(be.fours) || 0);
      const sixes = Math.max(0, Number(be.sixes) || 0);
      const boundaryRuns = fours * 4 + sixes * 6;
      let remaining = Math.max(0, runs - boundaryRuns);
      let ballsForRemaining = 0;
      while (remaining > 0) {
        let take = remaining >= 3 && rng() < 0.05 ? 3 : remaining >= 2 && rng() < 0.3 ? 2 : 1;
        take = Math.min(take, remaining);
        remaining -= take;
        ballsForRemaining++;
      }
      const mandatoryBalls = fours + sixes + ballsForRemaining;
      const baseSR = 78 + rng() * 40;
      let balls = runs > 0 ? Math.round((runs / baseSR) * 100) : Math.round(1 + rng() * 6);
      balls = Math.max(mandatoryBalls, balls, 1);

      totalRuns += runs;
      totalBalls += balls;
      runningScore += runs;
      const isOut = be.status === "out";
      if (isOut) {
        wicketsCount++;
        fow.push({
          wicket: wicketsCount,
          score: runningScore,
          over: be.overOut && String(be.overOut).trim() ? String(be.overOut).trim() : null,
          batter: squad[idx].name,
          _idx: idx,
        });
      }
      battingCard.push({
        name: squad[idx].name,
        runs,
        balls,
        fours,
        sixes,
        sr: balls ? +((runs / balls) * 100).toFixed(2) : 0,
        out: isOut,
        howOut: isOut ? "" : "not out",
        _idx: idx,
      });
    }
    return { battingCard, fow, totalRuns, totalBalls, wicketsCount };
  }

  function splitExtras(extrasTotal, rng) {
    const [wide, noball, bye, legbye] = distributeInt(extrasTotal, [0.45, 0.15, 0.2, 0.2], rng, 0.6);
    return { wide, noball, bye, legbye };
  }

  function buildBowlingSide(bowlingCode, legalBalls, wicketsToAssign, runsConceded, fow, rng) {
    const bowlers = DATA.SQUADS[bowlingCode].bowlers;
    const ballWeights = bowlers.map((b) => Math.pow(b.bowl, 1.3));
    const ballShares = distributeInt(legalBalls, ballWeights, rng, 0.25);

    const runOutCount = wicketsToAssign > 0 ? Math.round(wicketsToAssign * (rng() < 0.5 ? 0.08 : 0.14) * rng() * 2) : 0;
    const bowlerWicketTotal = Math.max(0, wicketsToAssign - Math.min(runOutCount, wicketsToAssign));
    const wicketWeights = bowlers.map((b) => Math.pow(b.bowl, 1.6));
    const wicketShares = distributeInt(bowlerWicketTotal, wicketWeights, rng, 0.5);

    const runWeights = ballShares.map((b) => Math.max(1, b));
    const runShares = distributeInt(Math.max(0, runsConceded), runWeights, rng, 0.35);

    const bowlingCard = bowlers.map((b, i) => {
      const balls = ballShares[i];
      const overs = Math.floor(balls / 6);
      let maidens = 0;
      for (let o = 0; o < overs; o++) if (rng() < 0.1) maidens++;
      return {
        name: b.name,
        overs: oversString(balls),
        maidens,
        runs: runShares[i],
        wickets: wicketShares[i],
        econ: balls ? +((runShares[i] / balls) * 6).toFixed(2) : 0,
        _balls: balls,
      };
    });

    // Build a shuffled credit list: one entry per wicket, either 'runout' or a bowler name,
    // matching the counts decided above, then zip with fow in chronological order.
    let credits = [];
    for (let i = 0; i < Math.min(runOutCount, wicketsToAssign); i++) credits.push("runout");
    bowlers.forEach((b, i) => {
      for (let k = 0; k < wicketShares[i]; k++) credits.push(b.name);
    });
    while (credits.length < wicketsToAssign) credits.push("runout");
    credits = PRNG.shuffle(credits, rng).slice(0, wicketsToAssign);

    const battingTeamOfWicket = DATA.TEAMS_BY_CODE[bowlingCode]; // fielding side
    fow.forEach((f, i) => {
      const credit = credits[i];
      let howOut, dismissal;
      if (credit === "runout") {
        const fielder = DATA.SQUADS[bowlingCode].players[Math.floor(rng() * 11)];
        howOut = `run out (${fielder.name})`;
        dismissal = { type: "run out", bowler: null, fielder: fielder.name };
      } else {
        dismissal = { type: PRNG.weightedPick({ bowled: 30, caught: 45, lbw: 12, stumped: 5 }, rng), bowler: credit };
        if (dismissal.type === "stumped") {
          dismissal.fielder = DATA.SQUADS[bowlingCode].players.find((p) => p.keeper).name;
          howOut = `st ${dismissal.fielder} b ${credit}`;
        } else if (dismissal.type === "caught") {
          const pool = DATA.SQUADS[bowlingCode].players.filter((p) => p.name !== credit);
          dismissal.fielder = pool[Math.floor(rng() * pool.length)].name;
          howOut = `c ${dismissal.fielder} b ${credit}`;
        } else if (dismissal.type === "lbw") {
          howOut = `lbw b ${credit}`;
        } else {
          howOut = `b ${credit}`;
        }
      }
      f.howOut = howOut;
      f.dismissal = dismissal;
    });

    bowlingCard.forEach((b) => delete b._balls);
    return bowlingCard;
  }

  function computeImpact(battingCard, bowlingCard, scores) {
    battingCard.forEach((b) => {
      scores[b.name] = (scores[b.name] || 0) + b.runs + b.fours + b.sixes * 2 + (b.sr > 100 && b.balls >= 20 ? 5 : 0);
    });
    bowlingCard.forEach((b) => {
      scores[b.name] = (scores[b.name] || 0) + b.wickets * 20 + b.maidens * 5 + (b.econ < 5 && Number(b.overs) >= 5 ? 10 : 0);
    });
  }

  function buildInnings(battingCode, bowlingCode, batterEntries, rng) {
    const squad = DATA.SQUADS[battingCode].players;
    const raw = buildRawInnings(squad, batterEntries, rng);
    const extrasTotal = Math.round(raw.totalRuns * (0.02 + rng() * 0.06)) + (raw.totalRuns === 0 ? Math.round(rng() * 3) : 0);
    const extras = splitExtras(extrasTotal, rng);
    const total = raw.totalRuns + extrasTotal;
    const legalBalls = raw.totalBalls;
    const wickets = Math.min(raw.wicketsCount, 10);
    const allOut = raw.wicketsCount >= 10;
    const runsConceded = total - extras.bye - extras.legbye;
    const bowlingCard = buildBowlingSide(bowlingCode, legalBalls, wickets, runsConceded, raw.fow, rng);

    // fold dismissal text back into the batting card, and fill in any missing "over" via interpolation
    const outIdxs = raw.battingCard.filter((b) => b.out).map((b) => b._idx);
    raw.fow.forEach((f, i) => {
      const card = raw.battingCard.find((b) => b._idx === f._idx);
      if (card) card.howOut = f.howOut;
      if (!f.over) {
        const oversNum = legalBalls / 6;
        const est = (oversNum * (i + 1)) / (raw.fow.length + 1);
        f.over = est.toFixed(1);
      }
    });
    raw.battingCard.forEach((b) => delete b._idx);
    raw.fow.forEach((f) => delete f._idx);

    return {
      battingTeam: battingCode,
      bowlingTeam: bowlingCode,
      total,
      wickets,
      overs: oversString(legalBalls),
      legalBalls,
      allOut,
      extras,
      extrasTotal,
      fow: raw.fow,
      battingCard: raw.battingCard,
      bowlingCard,
    };
  }

  function buildMatchResult(fixture, entry) {
    const seed = fixture.id + "|" + JSON.stringify(entry);
    const rng = PRNG.rngFromString(seed);
    const battingFirst = entry.battingFirst;
    const battingSecond = battingFirst === fixture.teamA ? fixture.teamB : fixture.teamA;

    const inn1 = buildInnings(battingFirst, battingSecond, entry.innings[0].batters, rng);
    const inn2 = buildInnings(battingSecond, battingFirst, entry.innings[1].batters, rng);

    let winner, result, tied;
    if (inn2.total > inn1.total) {
      winner = inn2.battingTeam;
      const wktsLeft = 10 - inn2.wickets;
      result = `${DATA.TEAMS_BY_CODE[winner].name} won by ${wktsLeft > 0 ? wktsLeft : ""} wicket${wktsLeft === 1 ? "" : "s"}`.replace("  ", " ");
      tied = false;
    } else if (inn1.total > inn2.total) {
      winner = inn1.battingTeam;
      const margin = inn1.total - inn2.total;
      result = `${DATA.TEAMS_BY_CODE[winner].name} won by ${margin} run${margin === 1 ? "" : "s"}`;
      tied = false;
    } else {
      winner = null;
      tied = true;
      result = "Match tied";
    }

    const scores = {};
    computeImpact(inn1.battingCard, inn2.bowlingCard, scores);
    computeImpact(inn2.battingCard, inn1.bowlingCard, scores);
    let potm = { name: "-", score: -1 };
    for (const name in scores) {
      let s = scores[name];
      if (winner && name.startsWith(winner)) s += 0.01;
      if (s > potm.score) potm = { name, score: s };
    }

    return {
      id: fixture.id,
      fixture,
      teamA: fixture.teamA,
      teamB: fixture.teamB,
      toss: { winner: battingFirst, decision: "bat" },
      venue: fixture.venue,
      innings: [inn1, inn2],
      result,
      winner,
      tied,
      potm: potm.name,
      manual: true,
    };
  }

  const AUTOFILL = { buildMatchResult, oversString };
  if (typeof module !== "undefined") module.exports = AUTOFILL;
  else global.AUTOFILL = AUTOFILL;
})(typeof window !== "undefined" ? window : globalThis);
