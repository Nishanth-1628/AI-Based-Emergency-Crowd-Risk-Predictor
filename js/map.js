/* ============================================================
   map.js
   Leaflet-based venue map. Renders each zone as a pulsing circle
   whose size reflects population and color reflects AI risk
   level. Clicking empty map space lets the user drop a new zone.
   ============================================================ */

const MapModule = (() => {
  let map = null;
  let userMarker = null;
  const circles = {};      // id -> L.circle
  const criticalRings = {}; // id -> L.circle (outer pulse ring)
  const COLORS = { low: "#2dd4a8", medium: "#f5b83d", high: "#ff8a3d", critical: "#ff3b5c" };

  function init(venue, onMapClick) {
    map = L.map("map", { zoomControl: true, attributionControl: false })
      .setView(venue.center, venue.zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    map.on("click", (e) => onMapClick(e.latlng));

    return map;
  }

  function radiusFor(zone) {
    const ratio = zone.population / zone.capacity;
    return 18 + Math.min(ratio, 1.5) * 55; // meters
  }

  function upsertZone(zone, onZoneClick) {
    const color = COLORS[zone.riskLevel] || COLORS.low;
    const r = radiusFor(zone);

    if (!circles[zone.id]) {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: r,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35
      }).addTo(map);

      circle.bindPopup(popupHtml(zone));
      circle.on("click", () => onZoneClick(zone.id));
      circles[zone.id] = circle;

      const ring = L.circle([zone.lat, zone.lng], {
        radius: r + 12,
        color,
        weight: 1,
        fillOpacity: 0,
        opacity: 0
      }).addTo(map);
      criticalRings[zone.id] = ring;
    } else {
      circles[zone.id].setLatLng([zone.lat, zone.lng]);
      circles[zone.id].setRadius(r);
      circles[zone.id].setStyle({ color, fillColor: color });
      circles[zone.id].setPopupContent(popupHtml(zone));

      const ring = criticalRings[zone.id];
      ring.setLatLng([zone.lat, zone.lng]);
      ring.setRadius(r + 12);
      ring.setStyle({ color, opacity: zone.riskLevel === "critical" ? 0.7 : 0 });
    }
  }

  function popupHtml(zone) {
    return `<strong>${zone.name}</strong><br>
      ${zone.population} / ${zone.capacity} people<br>
      Risk: <b style="color:${COLORS[zone.riskLevel]}">${zone.riskLevel.toUpperCase()}</b> (${zone.riskScore})`;
  }

  function highlight(id) {
    Object.entries(circles).forEach(([zid, c]) => {
      c.setStyle({ weight: zid === id ? 4 : 2 });
    });
  }

  function render(zones, onZoneClick) {
    zones.forEach(z => upsertZone(z, onZoneClick));
  }

  function panTo(zone) {
    map.panTo([zone.lat, zone.lng]);
    circles[zone.id]?.openPopup();
  }

  function setUserLocation(lat, lng) {
    if (!map) return;

    if (!userMarker) {
      userMarker = L.circleMarker([lat, lng], {
        radius: 8,
        color: "#3fd8ff",
        fillColor: "#3fd8ff",
        fillOpacity: 1,
        weight: 3
      }).addTo(map);
      userMarker.bindPopup("Your location");
    } else {
      userMarker.setLatLng([lat, lng]);
    }

    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 1.2 });
  }

  function clearAll() {
    Object.values(circles).forEach(c => map.removeLayer(c));
    Object.values(criticalRings).forEach(c => map.removeLayer(c));
    if (userMarker) {
      map.removeLayer(userMarker);
      userMarker = null;
    }
    Object.keys(circles).forEach(k => delete circles[k]);
    Object.keys(criticalRings).forEach(k => delete criticalRings[k]);
  }

  return { init, render, highlight, panTo, setUserLocation, clearAll };
})();
