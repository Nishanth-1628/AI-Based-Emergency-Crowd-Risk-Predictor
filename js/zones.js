/* ============================================================
   zones.js
   Defines the fictional venue and the starting set of monitored
   zones. Each zone is a "sensor node" the AI engine reasons about.
   ============================================================ */

const VENUE = {
  name: "Riverside Arena Complex",
  center: [28.6139, 77.2090], // fictional demo coordinates
  zoom: 17
};

/**
 * A Zone models one physical area with a crowd sensor.
 * exits        -> number of usable emergency exits (fewer = riskier)
 * flowFactor    -> 0-1, how easily crowd can disperse (lower = bottleneck)
 */
function makeZone({ id, name, lat, lng, capacity, population, exits, flowFactor }) {
  return {
    id,
    name,
    lat,
    lng,
    capacity,
    population,
    exits,
    flowFactor,
    history: [population],      // population history
    riskHistory: [0],           // risk score history (0-100)
    riskLevel: "low",
    riskScore: 0,
    trend: "stable",
    lastAlertLevel: "low"
  };
}

function buildInitialZones() {
  const c = VENUE.center;
  return [
    makeZone({ id: "z1", name: "Main Entrance Plaza", lat: c[0] + 0.0009, lng: c[1] - 0.0012, capacity: 800, population: 220, exits: 4, flowFactor: 0.8 }),
    makeZone({ id: "z2", name: "Central Concourse",    lat: c[0] + 0.0002, lng: c[1] + 0.0003, capacity: 1200, population: 540, exits: 5, flowFactor: 0.7 }),
    makeZone({ id: "z3", name: "North Stand Stairwell", lat: c[0] + 0.0016, lng: c[1] + 0.0010, capacity: 350, population: 260, exits: 2, flowFactor: 0.35 }),
    makeZone({ id: "z4", name: "Gate C Corridor",      lat: c[0] - 0.0008, lng: c[1] + 0.0014, capacity: 500, population: 180, exits: 3, flowFactor: 0.55 }),
    makeZone({ id: "z5", name: "Food Court Atrium",    lat: c[0] - 0.0004, lng: c[1] - 0.0010, capacity: 900, population: 410, exits: 4, flowFactor: 0.65 }),
  ];
}
