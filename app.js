/* ============================================================
   app.js — Smart Parking IoT · Chart.js Realtime + UI helpers
   ============================================================ */

// =====================================================
//  GRAFIK REALTIME — Chart.js
// =====================================================

/** Simpan data grafik (max 30 titik) */
const MAX_POINTS  = 30;
const chartLabels = [];
const chartData   = [];

let slotChart;

/**
 * Inisialisasi Chart.js setelah DOM siap
 */
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("slotChart").getContext("2d");

  slotChart = new Chart(ctx, {
    type: "line",
    data: {
      labels:   chartLabels,
      datasets: [{
        label:           "Slot Tersedia",
        data:            chartData,
        borderColor:     "#22d3ee",
        backgroundColor: "rgba(34,211,238,0.08)",
        pointBackgroundColor: "#22d3ee",
        pointRadius:     3,
        pointHoverRadius: 5,
        borderWidth:     2,
        tension:         0.4,
        fill:            true,
      }]
    },
    options: {
      responsive: true,
      animation: {
        duration: 400,
        easing:   "easeInOutQuart"
      },
      scales: {
        x: {
          grid:  { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#6b7280", font: { family: "'JetBrains Mono'", size: 10 }, maxTicksLimit: 6 }
        },
        y: {
          beginAtZero: true,
          grid:  { color: "rgba(255,255,255,0.04)" },
          ticks: { color: "#6b7280", font: { family: "'JetBrains Mono'", size: 10 }, stepSize: 1 }
        }
      },
      plugins: {
        legend: {
          labels: {
            color:  "#6b7280",
            font:   { family: "'JetBrains Mono'", size: 11 },
            boxWidth: 12,
          }
        },
        tooltip: {
          backgroundColor: "#141720",
          borderColor:     "#252a38",
          borderWidth:     1,
          titleColor:      "#e2e8f0",
          bodyColor:       "#22d3ee",
          titleFont:       { family: "'JetBrains Mono'" },
          bodyFont:        { family: "'JetBrains Mono'" },
        }
      }
    }
  });

  console.log("✅ Chart.js diinisialisasi");
});

/**
 * Tambah data baru ke grafik realtime
 * Dipanggil dari Firebase listener di index.html
 * @param {number} value - jumlah slot tersedia
 */
function pushChartData(value) {
  if (!slotChart) return;

  const now = new Date().toLocaleTimeString("id-ID", {
    hour:   "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  chartLabels.push(now);
  chartData.push(value);

  // Batasi jumlah titik agar tidak overflow
  if (chartLabels.length > MAX_POINTS) {
    chartLabels.shift();
    chartData.shift();
  }

  slotChart.update();
}

/**
 * Reset / kosongkan data grafik
 */
function clearChart() {
  chartLabels.length = 0;
  chartData.length   = 0;
  if (slotChart) slotChart.update();
  console.log("🔄 Chart direset");
}

// =====================================================
//  UTILITY — Timestamp & animasi angka
// =====================================================

/**
 * Format timestamp Unix ms → string lokal ID
 * @param {number} ts - milliseconds
 * @returns {string}
 */
function formatTimestamp(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("id-ID");
}

/**
 * Animasikan perubahan nilai angka (counter effect ringan)
 * @param {string} elementId - id elemen target
 * @param {number} targetVal  - nilai tujuan
 */
function animateCounter(elementId, targetVal) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const current = parseInt(el.textContent) || 0;
  const diff     = targetVal - current;
  const steps    = 10;
  let   step     = 0;

  const interval = setInterval(() => {
    step++;
    el.textContent = Math.round(current + (diff * step) / steps);
    if (step >= steps) {
      el.textContent = targetVal;
      clearInterval(interval);
    }
  }, 30);
}

// =====================================================
//  KONSOL DEBUGGING — status Firebase & WiFi
// =====================================================

console.log("===========================================");
console.log("  Smart Parking IoT — ESP32 + Firebase");
console.log("  app.js loaded successfully");
console.log("===========================================");
