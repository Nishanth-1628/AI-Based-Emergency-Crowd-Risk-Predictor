/* ============================================================
   ai-engine.js
   This module stands in for a server-side AI/ML risk model.
   Since the whole app runs client-side, JS itself plays the role
   of "the backend": it ingests sensor readings and produces a
   risk score + classification + recommended action, exactly like
   an API endpoint would return.

   RISK MODEL (heuristic, explainable):
     score = 100 * ( wD*density + wG*growth + wB*bottleneck )
   where:
     density    = population / capacity                (0 -> 1+)
     growth     = normalized short-term growth rate      (0 -> 1)
     bottleneck = (1 - flowFactor) weighted by exits      (0 -> 1)
   ============================================================ */

const AIEngine = (() => {

  const WEIGHTS = { density: 0.55, growth: 0.30, bottleneck: 0.15 };

  const THRESHOLDS = {
    low: 0,
    medium: 40,
    high: 65,
    critical: 85
  };

  function classify(score) {
    if (score >= THRESHOLDS.critical) return "critical";
    if (score >= THRESHOLDS.high) return "high";
    if (score >= THRESHOLDS.medium) return "medium";
    return "low";
  }

  function computeGrowthRate(history) {
    if (history.length < 2) return 0;
    const windowSize = Math.min(5, history.length);
    const recent = history.slice(-windowSize);
    const delta = recent[recent.length - 1] - recent[0];
    const base = Math.max(recent[0], 1);
    // normalize: +50% growth in window -> 1.0 signal
    return clamp(delta / base / 0.5, 0, 1.4);
  }

  function computeBottleneck(zone) {
    const exitFactor = clamp(1 - (zone.exits - 1) / 6, 0, 1); // fewer exits -> higher
    const flowPenalty = clamp(1 - zone.flowFactor, 0, 1);
    return clamp(exitFactor * 0.5 + flowPenalty * 0.5, 0, 1);
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /**
   * Main inference call — analogous to POST /api/predict-risk
   */
  function predict(zone) {
    const density = clamp(zone.population / zone.capacity, 0, 1.6);
    const growth = computeGrowthRate(zone.history);
    const bottleneck = computeBottleneck(zone);

    let raw = (WEIGHTS.density * Math.min(density, 1.2) / 1.2 * 1.0)
            + (WEIGHTS.growth * growth)
            + (WEIGHTS.bottleneck * bottleneck);

    // Overcapacity surcharge — density above 1.0 is an automatic escalation
    if (density > 1.0) raw += (density - 1.0) * 0.6;

    const score = clamp(Math.round(raw * 100), 0, 100);
    const level = classify(score);

    return {
      score,
      level,
      factors: {
        densityPct: Math.round(density * 100),
        growthPct: Math.round(growth * 100),
        bottleneckPct: Math.round(bottleneck * 100)
      },
      recommendation: recommend(level, zone, density)
    };
  }

  function recommend(level, zone, density) {
    switch (level) {
      case "critical":
        return `Evacuate via all ${zone.exits} exits now. Halt entry to ${zone.name} and reroute inbound crowd to lower-density zones.`;
      case "high":
        return `Open additional egress, stop further entry to ${zone.name}, and dispatch stewards to guide outflow.`;
      case "medium":
        return `Increase monitoring frequency. Prepare overflow routing in case density keeps climbing.`;
      default:
        return `Nominal. Continue routine monitoring.`;
    }
  }

  return { predict, classify, THRESHOLDS };
})();
