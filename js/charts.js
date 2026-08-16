/* ============================================================
   charts.js
   Minimal dependency-free canvas line chart plotting the
   average risk score across all zones over time.
   ============================================================ */

const TrendChart = (() => {
  let canvas, ctx;

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = 150 * devicePixelRatio;
    canvas.style.width = rect.width + "px";
    canvas.style.height = "150px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function colorFor(score) {
    if (score >= 85) return "#ff3b5c";
    if (score >= 65) return "#ff8a3d";
    if (score >= 40) return "#f5b83d";
    return "#2dd4a8";
  }

  function draw(history) {
    if (!ctx) return;
    const w = canvas.width / devicePixelRatio;
    const h = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const padL = 28, padB = 18, padT = 10, padR = 8;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // gridlines + labels
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.fillStyle = "#7d8ba8";
    ctx.font = "10px JetBrains Mono, monospace";
    [0, 25, 50, 75, 100].forEach(v => {
      const y = padT + plotH - (v / 100) * plotH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(String(v), 4, y + 3);
    });

    if (history.length < 2) return;

    const data = history.slice(-40);
    const stepX = plotW / (data.length - 1);

    // threshold reference line at 65 (high)
    ctx.strokeStyle = "rgba(255,138,61,0.4)";
    ctx.setLineDash([4, 4]);
    const yHigh = padT + plotH - (65 / 100) * plotH;
    ctx.beginPath();
    ctx.moveTo(padL, yHigh);
    ctx.lineTo(w - padR, yHigh);
    ctx.stroke();
    ctx.setLineDash([]);

    // gradient fill under line
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, "rgba(63,216,255,0.28)");
    grad.addColorStop(1, "rgba(63,216,255,0)");

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (v / 100) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + (data.length - 1) * stepX, padT + plotH);
    ctx.lineTo(padL, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (v / 100) * plotH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#3fd8ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // last point marker
    const lastVal = data[data.length - 1];
    const lx = padL + (data.length - 1) * stepX;
    const ly = padT + plotH - (lastVal / 100) * plotH;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = colorFor(lastVal);
    ctx.fill();
  }

  return { init, draw };
})();
