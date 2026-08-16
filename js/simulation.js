/* ============================================================
   simulation.js
   Stands in for a real-time sensor/camera feed (CCTV people-
   counting, Wi-Fi probe density, turnstile counts, etc). Every
   tick it produces a new reading per zone, feeds it to AIEngine,
   and reports the result back to app.js.
   ============================================================ */

const Simulation = (() => {
  let timer = null;
  let tickMs = 1800;
  let surgeZoneId = null;
  let surgeTicksLeft = 0;

  function randomWalk(zone) {
    // baseline gentle fluctuation
    const noise = (Math.random() - 0.45) * zone.capacity * 0.045;
    let next = zone.population + noise;

    // occasional organic micro-surge
    if (Math.random() < 0.05) {
      next += zone.capacity * (0.08 + Math.random() * 0.12);
    }

    // active manual surge
    if (surgeZoneId === zone.id && surgeTicksLeft > 0) {
      next += zone.capacity * 0.16;
    }

    return Math.max(0, Math.round(next));
  }

  function stepZone(zone) {
    zone.population = randomWalk(zone);
    zone.history.push(zone.population);
    if (zone.history.length > 40) zone.history.shift();

    const result = AIEngine.predict(zone);

    zone.riskHistory.push(result.score);
    if (zone.riskHistory.length > 40) zone.riskHistory.shift();

    const prevScore = zone.riskScore;
    zone.riskScore = result.score;
    zone.riskLevel = result.level;
    zone.factors = result.factors;
    zone.recommendation = result.recommendation;
    zone.trend = result.score > prevScore + 1 ? "up" : (result.score < prevScore - 1 ? "down" : "stable");

    return result;
  }

  function tick(zones, onTick) {
    if (surgeZoneId && surgeTicksLeft > 0) surgeTicksLeft--;
    if (surgeTicksLeft <= 0) surgeZoneId = null;

    const results = zones.map(z => ({ zone: z, result: stepZone(z) }));
    onTick(results, Date.now());
  }

  function start(zones, onTick, intervalMs) {
    stop();
    tickMs = intervalMs || tickMs;
    timer = setInterval(() => tick(zones, onTick), tickMs);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function isRunning() { return timer !== null; }

  function triggerSurge(zones) {
    const pick = zones[Math.floor(Math.random() * zones.length)];
    surgeZoneId = pick.id;
    surgeTicksLeft = 5;
    return pick;
  }

  return { start, stop, isRunning, triggerSurge, stepZone };
})();
