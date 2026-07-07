// Ball-by-ball ODI (50-over) match simulator. Deterministic per match id: the same
// fixture always produces the same result until ratings/squads/schedule change.
(function (global) {
  const DISMISSALS = { bowled: 30, caught: 45, lbw: 12, "run out": 8, stumped: 5 };

  function pickDismissal(rng) {
    return PRNG.weightedPick(DISMISSALS, rng);
  }

  // Weighted outcome for one delivery faced (excludes wides/no-balls, handled by caller).
  function pickBatOutcome(strikerBat, bowlerBowl, overNum, pressure, rng, noWicket, cond) {
    const diff = strikerBat - bowlerBowl;
    const factor = diff / 10;
    const w = { 0: 42, 1: 32, 2: 8, 3: 1, 4: 11, 6: 3, W: noWicket ? 0 : 5.5 };
    w[4] += factor * 0.9;
    w[6] += factor * 0.45;
    w[0] -= factor * 0.9;
    w[1] += factor * 0.15;
    if (!noWicket) w.W -= factor * 0.35;

    if (overNum < 10) {
      w[4] *= 1.25;
      w[6] *= 1.15;
      w[0] *= 0.9;
    } else if (overNum >= 40) {
      w[4] *= 1.2;
      w[6] *= 1.5;
      w[0] *= 0.8;
      if (!noWicket) w.W *= 1.25;
    }
    if (pressure > 0) {
      w[4] *= 1 + pressure * 0.25;
      w[6] *= 1 + pressure * 0.4;
      w[0] *= 1 - pressure * 0.15;
      if (!noWicket) w.W *= 1 + pressure * 0.3;
    }
    if (cond) {
      w[4] *= cond.boundary;
      w[6] *= cond.boundary * cond.six;
      w[0] *= cond.dot;
      if (!noWicket) w.W *= cond.wicket;
    }
    for (const k in w) w[k] = Math.max(0.3, w[k]);

    const pick = PRNG.weightedPick(w, rng);
    if (pick === "W") return { wicket: true, runs: 0 };
    return { wicket: false, runs: Number(pick) };
  }

  function ballOutcome(strikerBat, bowlerBowl, overNum, pressure, rng, cond) {
    const wideChance = 0.045 + Math.max(0, strikerBat - bowlerBowl) * 0.0003;
    const nbChance = 0.012;
    let x = rng();
    if (x < wideChance) {
      const runs = rng() < 0.9 ? 1 : rng() < 0.5 ? 2 : 4;
      return { type: "wide", runs, legal: false };
    }
    x -= wideChance;
    if (x < nbChance) {
      const bat = pickBatOutcome(strikerBat, bowlerBowl, overNum, pressure, rng, true, cond);
      return { type: "noball", runs: 1 + bat.runs, batRuns: bat.runs, legal: false };
    }
    if (rng() < 0.02) {
      const isLegBye = rng() < 0.7;
      const r = rng() < 0.85 ? 1 : rng() < 0.7 ? 2 : 4;
      return { type: isLegBye ? "legbye" : "bye", runs: r, legal: true };
    }
    const bat = pickBatOutcome(strikerBat, bowlerBowl, overNum, pressure, rng, false, cond);
    if (bat.wicket) return { type: "wicket", runs: 0, dismissal: pickDismissal(rng), legal: true };
    return { type: "run", runs: bat.runs, legal: true };
  }

  function oversString(legalBalls) {
    const o = Math.floor(legalBalls / 6);
    const b = legalBalls % 6;
    return `${o}.${b}`;
  }

  function freshBatterStats(p) {
    return { name: p.name, order: p.order, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: "", batted: false };
  }
  function freshBowlerStats(p) {
    return { name: p.name, legalBalls: 0, overRuns: 0, maidens: 0, runs: 0, wickets: 0 };
  }

  function simulateInnings(battingCode, bowlingCode, rng, winScore, events, cond) {
    const battingSquad = DATA.SQUADS[battingCode].players;
    const bowlers = PRNG.shuffle(DATA.SQUADS[bowlingCode].bowlers, rng);
    const overBowler = [];
    for (let o = 0; o < 50; o++) overBowler.push(bowlers[o % 5]);

    const battersStats = battingSquad.map(freshBatterStats);
    const bowlersStats = {};
    bowlers.forEach((b) => (bowlersStats[b.name] = freshBowlerStats(b)));

    let strikerIdx = 0;
    let nonStrikerIdx = 1;
    let nextIn = 2;
    battersStats[0].batted = true;
    battersStats[1].batted = true;

    let totalRuns = 0;
    let wickets = 0;
    let legalBalls = 0;
    const extras = { wide: 0, noball: 0, bye: 0, legbye: 0 };
    const fow = [];
    let won = false;

    outer: for (let over = 0; over < 50; over++) {
      const bowler = overBowler[over];
      const bStat = bowlersStats[bowler.name];
      let ballsThisOver = 0;
      let runsThisOver = 0;
      while (ballsThisOver < 6) {
        const striker = battingSquad[strikerIdx];
        const bStatObj = battersStats[strikerIdx];
        const currentOver = over + ballsThisOver / 6;

        let pressure = 0;
        if (winScore != null) {
          const remainingRuns = winScore - totalRuns;
          const remainingBalls = 300 - legalBalls;
          if (remainingBalls > 0) {
            const reqRR = (remainingRuns / remainingBalls) * 6;
            const curRR = legalBalls > 0 ? (totalRuns / legalBalls) * 6 : reqRR;
            pressure = Math.max(0, Math.min(1.5, (reqRR - curRR) / 4));
          }
        }

        const outcome = ballOutcome(striker.bat, bowler.bowl, currentOver, pressure, rng, cond);
        const overBallLabel = `${over}.${ballsThisOver + 1}`;

        if (outcome.type === "wide") {
          extras.wide += outcome.runs;
          totalRuns += outcome.runs;
          runsThisOver += outcome.runs;
          bStat.runs += outcome.runs;
        } else if (outcome.type === "noball") {
          extras.noball += 1;
          totalRuns += outcome.runs;
          runsThisOver += outcome.runs;
          bStat.runs += outcome.runs;
          bStatObj.runs += outcome.batRuns;
          if (outcome.batRuns === 4) bStatObj.fours++;
          if (outcome.batRuns === 6) bStatObj.sixes++;
          if (outcome.batRuns % 2 === 1) {
            [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
          }
        } else if (outcome.type === "bye" || outcome.type === "legbye") {
          extras[outcome.type] += outcome.runs;
          totalRuns += outcome.runs;
          runsThisOver += outcome.runs;
          bStatObj.balls++;
          legalBalls++;
          ballsThisOver++;
          bStat.legalBalls++;
          if (outcome.runs % 2 === 1) [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
        } else if (outcome.type === "wicket") {
          if (outcome.dismissal !== "run out") bStat.wickets++;
          bStatObj.balls++;
          bStatObj.out = true;
          wickets++;
          legalBalls++;
          ballsThisOver++;
          bStat.legalBalls++;
          let fielder = null;
          if (outcome.dismissal === "stumped") {
            fielder = DATA.SQUADS[bowlingCode].players.find((p) => p.keeper).name;
          } else if (outcome.dismissal === "caught" || outcome.dismissal === "run out") {
            const fielders = DATA.SQUADS[bowlingCode].players.filter((p) => p.name !== bowler.name);
            fielder = fielders[Math.floor(rng() * fielders.length)].name;
          }
          bStatObj.howOut =
            outcome.dismissal === "bowled"
              ? `b ${bowler.name}`
              : outcome.dismissal === "lbw"
              ? `lbw b ${bowler.name}`
              : outcome.dismissal === "caught"
              ? `c ${fielder} b ${bowler.name}`
              : outcome.dismissal === "stumped"
              ? `st ${fielder} b ${bowler.name}`
              : `run out (${fielder})`;
          fow.push({ wicket: wickets, score: totalRuns, over: overBallLabel, batter: striker.name });
          events.push({ over: overBallLabel, text: `WICKET! ${striker.name} ${bStatObj.howOut} — ${totalRuns}/${wickets}` });
          if (wickets >= 10) break outer;
          strikerIdx = nextIn;
          nextIn++;
          battersStats[strikerIdx].batted = true;
        } else {
          totalRuns += outcome.runs;
          runsThisOver += outcome.runs;
          bStat.runs += outcome.runs;
          bStatObj.runs += outcome.runs;
          bStatObj.balls++;
          legalBalls++;
          ballsThisOver++;
          bStat.legalBalls++;
          if (outcome.runs === 4) bStatObj.fours++;
          if (outcome.runs === 6) {
            bStatObj.sixes++;
            events.push({ over: overBallLabel, text: `SIX! ${striker.name} off ${bowler.name} — ${totalRuns}/${wickets}` });
          }
          if (outcome.runs % 2 === 1) [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
        }

        if (winScore != null && totalRuns >= winScore) {
          won = true;
          break outer;
        }
      }
      if (runsThisOver === 0) bStat.maidens++;
      [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
    }

    const allOut = wickets >= 10;
    const battingCard = battersStats
      .filter((b) => b.batted)
      .map((b) => ({
        name: b.name,
        runs: b.runs,
        balls: b.balls,
        fours: b.fours,
        sixes: b.sixes,
        sr: b.balls ? +((b.runs / b.balls) * 100).toFixed(2) : 0,
        out: b.out,
        howOut: b.out ? b.howOut : "not out",
      }));
    const bowlingCard = bowlers.map((b) => {
      const s = bowlersStats[b.name];
      return {
        name: b.name,
        overs: oversString(s.legalBalls),
        maidens: s.maidens,
        runs: s.runs,
        wickets: s.wickets,
        econ: s.legalBalls ? +((s.runs / s.legalBalls) * 6).toFixed(2) : 0,
      };
    });

    return {
      battingTeam: battingCode,
      bowlingTeam: bowlingCode,
      total: totalRuns,
      wickets: Math.min(wickets, 10),
      overs: oversString(legalBalls),
      legalBalls,
      allOut,
      extras,
      extrasTotal: extras.wide + extras.noball + extras.bye + extras.legbye,
      fow,
      battingCard,
      bowlingCard,
      won,
    };
  }

  function computeImpact(battingCard, bowlingCard) {
    const scores = {};
    battingCard.forEach((b) => {
      scores[b.name] = (scores[b.name] || 0) + b.runs + b.fours + b.sixes * 2 + (b.sr > 100 && b.balls >= 20 ? 5 : 0);
    });
    bowlingCard.forEach((b) => {
      scores[b.name] = (scores[b.name] || 0) + b.wickets * 20 + b.maidens * 5 + (b.econ < 5 && Number(b.overs) >= 5 ? 10 : 0);
    });
    return scores;
  }

  function simulateMatch(fixture) {
    const rng = PRNG.rngFromString(fixture.id);
    const teamA = DATA.TEAMS_BY_CODE[fixture.teamA];
    const teamB = DATA.TEAMS_BY_CODE[fixture.teamB];
    const conditions = CONDITIONS.getConditions(fixture);
    const cond = CONDITIONS.conditionMultipliers(conditions);

    const tossWinner = rng() < 0.5 ? teamA.code : teamB.code;
    const tossDecision = rng() < 0.6 ? "bowl" : "bat";
    const battingFirst = tossDecision === "bat" ? tossWinner : tossWinner === teamA.code ? teamB.code : teamA.code;
    const bowlingFirst = battingFirst === teamA.code ? teamB.code : teamA.code;

    const events1 = [];
    const innings1 = simulateInnings(battingFirst, bowlingFirst, rng, null, events1, cond);
    const winScore = innings1.total + 1;
    const events2 = [];
    const innings2 = simulateInnings(bowlingFirst, battingFirst, rng, winScore, events2, cond);

    let result, winner, margin;
    if (innings2.total >= winScore) {
      winner = innings2.battingTeam;
      margin = `${winner === teamA.code ? teamA.name : teamB.name} won by ${10 - innings2.wickets} wicket${10 - innings2.wickets === 1 ? "" : "s"}`;
      result = margin;
    } else if (innings2.total === innings1.total) {
      winner = null;
      result = "Match tied";
    } else {
      winner = innings1.battingTeam;
      const runMargin = innings1.total - innings2.total;
      margin = `${winner === teamA.code ? teamA.name : teamB.name} won by ${runMargin} run${runMargin === 1 ? "" : "s"}`;
      result = margin;
    }

    const impact1 = computeImpact(innings1.battingCard, []);
    const bowlImpact2 = computeImpact([], innings2.bowlingCard);
    const impact2 = computeImpact(innings2.battingCard, []);
    const bowlImpact1 = computeImpact([], innings1.bowlingCard);
    const allImpact = {};
    [impact1, bowlImpact2, impact2, bowlImpact1].forEach((m) => {
      for (const k in m) allImpact[k] = (allImpact[k] || 0) + m[k];
    });
    let potm = { name: "-", score: -1 };
    for (const name in allImpact) {
      let s = allImpact[name];
      const onWinner = (winner === innings1.battingTeam && name.startsWith(innings1.battingTeam)) || (winner === innings2.battingTeam && name.startsWith(innings2.battingTeam));
      if (onWinner) s += 0.01;
      if (s > potm.score) potm = { name, score: s };
    }

    return {
      id: fixture.id,
      fixture,
      teamA: teamA.code,
      teamB: teamB.code,
      toss: { winner: tossWinner, decision: tossDecision },
      battingFirst,
      venue: fixture.venue,
      conditions,
      innings: [innings1, innings2],
      result,
      winner,
      tied: winner === null,
      potm: potm.name,
      events: [events1, events2],
    };
  }

  const SIM = { simulateMatch, simulateInnings, computeImpact };
  if (typeof module !== "undefined") module.exports = SIM;
  else global.SIM = SIM;
})(typeof window !== "undefined" ? window : globalThis);
