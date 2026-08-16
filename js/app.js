/* ============================================================
   app.js
   Wires the AI engine, simulation feed, map and chart together,
   and renders the dashboard UI.
   ============================================================ */

(function () {
  const STORAGE_KEY = "sentryUser";
  const state = {
    zones: buildInitialZones(),
    aggregateHistory: [0],
    alerts: [],
    selectedZoneId: null,
    running: false,
    clockSeconds: 0,
    pendingLatLng: null,
    dashboardReady: false
  };

  const els = {
    app: document.getElementById("app"),
    authShell: document.getElementById("authShell"),
    loginForm: document.getElementById("loginForm"),
    usernameInput: document.getElementById("usernameInput"),
    emailInput: document.getElementById("emailInput"),
    passwordInput: document.getElementById("passwordInput"),
    authStatus: document.getElementById("authStatus"),
    userBadge: document.getElementById("userBadge"),
    locationStatus: document.getElementById("locationStatus"),
    btnUseLocation: document.getElementById("btnUseLocation"),
    feedState: document.getElementById("feedState"),
    overallRisk: document.getElementById("overallRisk"),
    simClock: document.getElementById("simClock"),
    zoneList: document.getElementById("zoneList"),
    zoneCount: document.getElementById("zoneCount"),
    alertLog: document.getElementById("alertLog"),
    alertCount: document.getElementById("alertCount"),
    btnStart: document.getElementById("btnStart"),
    btnSurge: document.getElementById("btnSurge"),
    btnReset: document.getElementById("btnReset"),
    btnLogout: document.getElementById("btnLogout"),
    modal: document.getElementById("zoneModal"),
    zoneNameInput: document.getElementById("zoneNameInput"),
    zoneCapInput: document.getElementById("zoneCapInput"),
    zoneCreateBtn: document.getElementById("zoneCreateBtn"),
    zoneCancelBtn: document.getElementById("zoneCancelBtn")
  };

  const RISK_ORDER = ["low", "medium", "high", "critical"];

  function init() {
    bindAuthEvents();

    const savedUser = getSavedUser();
    if (!savedUser) {
      showAuthScreen();
      return;
    }

    showDashboard(savedUser);
  }

  function bindAuthEvents() {
    els.loginForm.addEventListener("submit", handleLogin);
    els.btnLogout && els.btnLogout.addEventListener("click", handleLogout);
    els.btnUseLocation && els.btnUseLocation.addEventListener("click", requestUserLocation);
  }

  function handleLogin(event) {
    event.preventDefault();

    const username = els.usernameInput.value.trim();
    const email = els.emailInput.value.trim();
    const password = els.passwordInput.value.trim();

    if (!username || !email || !password) {
      setAuthStatus("Please complete all fields to continue.", "error");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthStatus("Please enter a valid email address.", "error");
      return;
    }

    const user = { username, email, password };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setAuthStatus(`Welcome ${username}. Opening dashboard...`, "success");

    setTimeout(() => showDashboard(user), 500);
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY);
    showAuthScreen();
  }

  function showAuthScreen() {
    els.authShell.classList.remove("hidden");
    els.app.classList.add("hidden");
    els.authStatus.textContent = "";
    els.authStatus.classList.remove("success");
  }

  function showDashboard(user) {
    els.authShell.classList.add("hidden");
    els.app.classList.remove("hidden");

    if (els.userBadge) {
      els.userBadge.textContent = user.username;
    }

    if (!state.dashboardReady) {
      initDashboard();
      state.dashboardReady = true;
    }

    requestUserLocation(true);
  }

  function getSavedUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function setAuthStatus(message, type) {
    els.authStatus.textContent = message;
    els.authStatus.classList.toggle("success", type === "success");
  }

  function setLocationStatus(label, statusClass) {
    if (!els.locationStatus) return;
    els.locationStatus.textContent = label;
    els.locationStatus.className = "status-value location-status";
    if (statusClass) els.locationStatus.classList.add(statusClass);
  }

  function requestUserLocation(silent = false) {
    if (!navigator.geolocation) {
      setLocationStatus("UNSUPPORTED", "denied");
      return;
    }

    setLocationStatus("REQUESTING", "requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        MapModule.setUserLocation(latitude, longitude);
        setLocationStatus("LIVE", "active");
        if (!silent) {
          pushAlert("low", `User location detected: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}.`);
        }
      },
      () => {
        setLocationStatus("DENIED", "denied");
        if (!silent) {
          pushAlert("medium", "Location access was denied. The map stays in default venue mode.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  function initDashboard() {
    MapModule.init(VENUE, onMapClick);
    TrendChart.init("trendChart");

    state.zones.forEach(z => {
      const r = AIEngine.predict(z);
      z.riskScore = r.score;
      z.riskLevel = r.level;
      z.factors = r.factors;
      z.recommendation = r.recommendation;
      z.lastAlertLevel = r.level;
    });

    MapModule.render(state.zones, onZoneSelect);
    renderZoneList();
    TrendChart.draw(state.aggregateHistory);

    els.btnStart.addEventListener("click", toggleFeed);
    els.btnSurge.addEventListener("click", () => {
      const z = Simulation.triggerSurge(state.zones);
      pushAlert("high", `Manual surge injected at ${z.name} — monitoring response.`);
    });
    els.btnReset.addEventListener("click", resetAll);
    els.zoneCreateBtn.addEventListener("click", createZoneFromModal);
    els.zoneCancelBtn.addEventListener("click", closeModal);
  }

  /* ---------------- Feed control ---------------- */

  function toggleFeed() {
    if (state.running) {
      Simulation.stop();
      state.running = false;
      els.btnStart.textContent = "▶ Start Feed";
      els.feedState.textContent = "PAUSED";
      els.feedState.classList.remove("live");
    } else {
      Simulation.start(state.zones, onTick, 1800);
      state.running = true;
      els.btnStart.textContent = "⏸ Pause Feed";
      els.feedState.textContent = "LIVE";
      els.feedState.classList.add("live");
    }
  }

  function onTick(results) {
    state.clockSeconds += 2;
    els.simClock.textContent = formatClock(state.clockSeconds);

    let sum = 0;
    results.forEach(({ zone, result }) => {
      sum += result.score;
      maybeAlert(zone);
    });
    const avg = Math.round(sum / results.length);
    state.aggregateHistory.push(avg);
    if (state.aggregateHistory.length > 60) state.aggregateHistory.shift();

    updateOverallRisk(avg);
    MapModule.render(state.zones, onZoneSelect);
    renderZoneList();
    TrendChart.draw(state.aggregateHistory);
  }

  function updateOverallRisk(avg) {
    const level = AIEngine.classify(avg);
    els.overallRisk.textContent = `${avg} · ${level.toUpperCase()}`;
    els.overallRisk.className = "status-value " + level;
  }

  /* ---------------- Alerts ---------------- */

  function maybeAlert(zone) {
    const prevRank = RISK_ORDER.indexOf(zone.lastAlertLevel);
    const curRank = RISK_ORDER.indexOf(zone.riskLevel);

    if (curRank > prevRank && curRank >= RISK_ORDER.indexOf("medium")) {
      const verb = curRank >= 3 ? "CRITICAL — immediate action required" :
                   curRank === 2 ? "HIGH risk detected" : "Risk escalating to MEDIUM";
      pushAlert(zone.riskLevel, `${zone.name}: ${verb}. ${zone.recommendation}`);
    } else if (curRank < prevRank) {
      pushAlert("low", `${zone.name}: risk easing back to ${zone.riskLevel.toUpperCase()}.`);
    }
    zone.lastAlertLevel = zone.riskLevel;
  }

  function pushAlert(level, message) {
    state.alerts.push({ level, message, time: formatClock(state.clockSeconds) });
    if (state.alerts.length > 100) state.alerts.shift();
    renderAlerts();
  }

  function renderAlerts() {
    els.alertCount.textContent = `${state.alerts.length} events`;
    if (state.alerts.length === 0) {
      els.alertLog.innerHTML = `<div class="alert-empty">No alerts yet. Start the feed to begin monitoring.</div>`;
      return;
    }
    els.alertLog.innerHTML = state.alerts.slice(-60).map(a => `
      <div class="alert-row ${a.level}">
        <span class="t mono">${a.time}</span>
        ${escapeHtml(a.message)}
      </div>
    `).join("");
  }

  /* ---------------- Zone dashboard ---------------- */

  function renderZoneList() {
    els.zoneCount.textContent = `${state.zones.length} zones`;
    els.zoneList.innerHTML = state.zones.map(zoneCardHtml).join("");

    els.zoneList.querySelectorAll("[data-zone-id]").forEach(card => {
      card.addEventListener("click", () => onZoneSelect(card.getAttribute("data-zone-id")));
    });
  }

  function zoneCardHtml(z) {
    const pct = Math.min(100, Math.round((z.population / z.capacity) * 100));
    const arrow = z.trend === "up" ? "▲" : z.trend === "down" ? "▼" : "•";
    const selected = z.id === state.selectedZoneId ? "selected" : "";
    return `
      <div class="zone-card risk-${z.riskLevel} ${selected}" data-zone-id="${z.id}">
        <div class="zone-card-top">
          <span class="zone-name">${escapeHtml(z.name)}</span>
          <span class="zone-badge ${z.riskLevel}">${z.riskLevel}</span>
        </div>
        <div class="zone-meta">
          <span>${z.population}/${z.capacity} · ${pct}%</span>
          <span>score ${z.riskScore} ${arrow}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%; background:${riskColor(z.riskLevel)}"></div>
        </div>
        <div class="zone-reco"><b>AI:</b> ${escapeHtml(z.recommendation || "Awaiting first reading…")}</div>
      </div>
    `;
  }

  function riskColor(level) {
    return { low: "#2dd4a8", medium: "#f5b83d", high: "#ff8a3d", critical: "#ff3b5c" }[level];
  }

  function onZoneSelect(id) {
    state.selectedZoneId = id;
    MapModule.highlight(id);
    const zone = state.zones.find(z => z.id === id);
    if (zone) MapModule.panTo(zone);
    renderZoneList();
  }

  /* ---------------- Add zone via map click ---------------- */

  function onMapClick(latlng) {
    state.pendingLatLng = latlng;
    els.zoneNameInput.value = "";
    els.zoneCapInput.value = 500;
    els.modal.classList.remove("hidden");
    els.zoneNameInput.focus();
  }

  function closeModal() {
    els.modal.classList.add("hidden");
    state.pendingLatLng = null;
  }

  function createZoneFromModal() {
    if (!state.pendingLatLng) return closeModal();
    const name = els.zoneNameInput.value.trim() || "Unnamed Zone";
    const capacity = Math.max(10, parseInt(els.zoneCapInput.value, 10) || 500);

    const zone = makeZone({
      id: "z" + Date.now(),
      name,
      lat: state.pendingLatLng.lat,
      lng: state.pendingLatLng.lng,
      capacity,
      population: Math.round(capacity * (0.15 + Math.random() * 0.2)),
      exits: 2 + Math.floor(Math.random() * 3),
      flowFactor: 0.4 + Math.random() * 0.4
    });

    const r = AIEngine.predict(zone);
    zone.riskScore = r.score;
    zone.riskLevel = r.level;
    zone.factors = r.factors;
    zone.recommendation = r.recommendation;
    zone.lastAlertLevel = r.level;

    state.zones.push(zone);
    MapModule.render(state.zones, onZoneSelect);
    renderZoneList();
    pushAlert("low", `${zone.name} added to monitoring grid.`);
    closeModal();
  }

  /* ---------------- Reset ---------------- */

  function resetAll() {
    Simulation.stop();
    state.running = false;
    els.btnStart.textContent = "▶ Start Feed";
    els.feedState.textContent = "STANDBY";
    els.feedState.classList.remove("live");

    state.zones = buildInitialZones();
    state.aggregateHistory = [0];
    state.alerts = [];
    state.selectedZoneId = null;
    state.clockSeconds = 0;
    els.simClock.textContent = formatClock(0);
    els.overallRisk.textContent = "—";
    els.overallRisk.className = "status-value";

    state.zones.forEach(z => {
      const r = AIEngine.predict(z);
      z.riskScore = r.score;
      z.riskLevel = r.level;
      z.factors = r.factors;
      z.recommendation = r.recommendation;
      z.lastAlertLevel = r.level;
    });

    MapModule.clearAll();
    MapModule.render(state.zones, onZoneSelect);
    renderZoneList();
    renderAlerts();
    TrendChart.draw(state.aggregateHistory);
  }

  /* ---------------- Utils ---------------- */

  function formatClock(totalSeconds) {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
