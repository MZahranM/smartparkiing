/* ============================================================
   app.js — Smart Parking IoT
   
   FILE INI BERISI:
   1. Konfigurasi Firebase (firebaseConfig) ← JAWABAN MASALAH 3
   2. Inisialisasi Firebase (initializeApp)
   3. Login Firebase Auth untuk website    ← JAWABAN MASALAH 4
   4. Semua listener realtime Firebase     ← JAWABAN MASALAH 2
   5. Fungsi kontrol ESP32 dari website
   6. Grafik realtime Chart.js
   7. Helper UI

   ============================================================
   JAWABAN PERTANYAAN AUTHENTICATION (Masalah 4):
   ──────────────────────────────────────────────
   Q: Apakah website harus login juga?
   A: YA, harus. Firebase Rules kita set "auth != null",
      artinya hanya user terautentikasi yang bisa baca/tulis.
      Jika website tidak login → Firebase tolak semua request
      → data tidak masuk → website tidak update.

   Q: Apakah cukup firebaseConfig saja?
   A: TIDAK cukup. firebaseConfig hanya mengenali PROJECT-nya.
      Auth diperlukan untuk izin baca/tulis data.

   Q: Apakah Auth mempengaruhi koneksi realtime?
   A: YA. Listener onValue() akan gagal jika user belum login.

   Q: Cara terbaik?
   A: Login otomatis saat website dibuka menggunakan
      signInWithEmailAndPassword() — user tidak perlu
      memasukkan password manual, cukup background auto-login.
      Website langsung masuk dashboard setelah login berhasil.
   ============================================================
*/

// ============================================================
//  1. KONFIGURASI FIREBASE
//     Sumber: Firebase Console → Project Settings → Your Apps
//     Ini adalah konfigurasi project "smart-parkiing"
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyBTwMNlw7V1eGOGEzR6MZeIXn9HIZT71bE",
  authDomain:        "smart-parkiing.firebaseapp.com",
  databaseURL:       "https://smart-parkiing-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "smart-parkiing",
  storageBucket:     "smart-parkiing.firebasestorage.app",
  messagingSenderId: "1059121264551",
  appId:             "1:1059121264551:web:4aed4416da5cf27e786882"
};

// Email & password SAMA dengan yang ada di .ino
// Firebase Auth mengenali website & ESP32 sebagai user yang sama
const USER_EMAIL    = "admin@smartparking.com";
const USER_PASSWORD = "admin123456";

// ============================================================
//  2. INISIALISASI FIREBASE
//     Menggunakan Firebase Compat SDK (bukan modular/ESM)
//     Compat SDK = bisa dipakai tanpa import/export
//     → semua fungsi jadi global → onclick="" bisa kerja
// ============================================================
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();       // untuk login
const db   = firebase.database();   // untuk baca/tulis data

console.log("🔥 Firebase initialized — project: smart-parkiing");

// ============================================================
//  3. LOGIN OTOMATIS FIREBASE AUTH
//     Website login di background menggunakan email/password
//     yang sama dengan ESP32. User tidak perlu input manual.
//     Setelah login berhasil → listener realtime diaktifkan.
// ============================================================
auth.signInWithEmailAndPassword(USER_EMAIL, USER_PASSWORD)
  .then((credential) => {
    console.log("✅ Auth berhasil — UID:", credential.user.uid);
    setFirebaseStatus(true);
    startAllListeners();   // baru aktifkan listener setelah login
  })
  .catch((err) => {
    console.error("❌ Auth gagal:", err.code, "—", err.message);
    setFirebaseStatus(false);

    // Petunjuk spesifik sesuai jenis error
    if (err.code === "auth/user-not-found") {
      console.error("👉 Solusi: Buat user di Firebase Console → Authentication → Users → Add User");
      console.error("   Email:", USER_EMAIL, "| Password:", USER_PASSWORD);
    } else if (err.code === "auth/wrong-password") {
      console.error("👉 Solusi: Cek USER_PASSWORD di app.js — harus sama dengan ESP32");
    } else if (err.code === "auth/network-request-failed") {
      console.error("👉 Solusi: Cek koneksi internet");
    }
  });

// ============================================================
//  4. SEMUA LISTENER REALTIME FIREBASE
//     Dipanggil setelah login berhasil.
//     db.ref("path").on("value", callback) = listener realtime:
//     → setiap kali data di Firebase berubah, callback dipanggil
//     → ini yang membuat website update otomatis tanpa refresh
// ============================================================
function startAllListeners() {
  console.log("👂 Mengaktifkan semua listener realtime...");

  // ----------------------------------------------------------
  //  SLOT TERSEDIA
  //  Path: parking/slots/available
  //  ESP32 menulis ke sini setiap 1 detik
  // ----------------------------------------------------------
  db.ref("parking/slots/available").on("value", (snap) => {
    const val = snap.val() ?? 0;
    document.getElementById("val-available").textContent = val;
    updateSlotBar(val);
    updateStatusBadge(val);
    pushChartData(val);  // update grafik realtime
    console.log("[Firebase] available:", val);
  });

  // ----------------------------------------------------------
  //  TOTAL SLOT
  //  Path: parking/slots/total
  // ----------------------------------------------------------
  db.ref("parking/slots/total").on("value", (snap) => {
    const val = snap.val() ?? 10;
    // Update semua elemen yang menampilkan total slot
    document.querySelectorAll(".mirror-total").forEach(el => el.textContent = val);
    document.getElementById("val-total").textContent       = val;
    document.getElementById("bar-total-label").textContent = val;
  });

  // ----------------------------------------------------------
  //  JARAK SENSOR MASUK
  //  Path: parking/sensors/distanceIn
  // ----------------------------------------------------------
  db.ref("parking/sensors/distanceIn").on("value", (snap) => {
    const val = snap.val() ?? 999;
    document.getElementById("val-dist-in").textContent = val + " cm";
  });

  // ----------------------------------------------------------
  //  JARAK SENSOR KELUAR
  //  Path: parking/sensors/distanceOut
  // ----------------------------------------------------------
  db.ref("parking/sensors/distanceOut").on("value", (snap) => {
    const val = snap.val() ?? 999;
    document.getElementById("val-dist-out").textContent = val + " cm";
  });

  // ----------------------------------------------------------
  //  STATUS GATE MASUK
  //  Path: parking/gates/gateIn
  //  Nilai: "OPEN" atau "CLOSED"
  // ----------------------------------------------------------
  db.ref("parking/gates/gateIn").on("value", (snap) => {
    setGateUI("gate-in", snap.val() ?? "CLOSED");
  });

  // ----------------------------------------------------------
  //  STATUS GATE KELUAR
  //  Path: parking/gates/gateOut
  // ----------------------------------------------------------
  db.ref("parking/gates/gateOut").on("value", (snap) => {
    setGateUI("gate-out", snap.val() ?? "CLOSED");
  });

  // ----------------------------------------------------------
  //  STATUS ESP32 ONLINE
  //  Path: parking/system/online
  //  ESP32 menulis true setiap 5 detik (pingOnline)
  //  Jika ESP32 mati, nilai tidak berubah → bisa dideteksi
  // ----------------------------------------------------------
  db.ref("parking/system/online").on("value", (snap) => {
    setESPStatus(snap.val() === true);
  });

  // ----------------------------------------------------------
  //  TIMESTAMP UPDATE TERAKHIR
  //  Path: parking/system/lastUpdate
  // ----------------------------------------------------------
  db.ref("parking/system/lastUpdate").on("value", (snap) => {
    const val = snap.val();
    if (val) {
      // val adalah uptime ESP32 dalam detik
      document.getElementById("val-last-update").textContent =
        new Date().toLocaleTimeString("id-ID");
    }
  });

  console.log("✅ Semua listener aktif — data akan update realtime");
}

// ============================================================
//  5. FUNGSI KONTROL ESP32 DARI WEBSITE
//     Website menulis ke parking/commands/
//     ESP32 membaca di fungsi checkCommands() setiap 300ms
//     Setelah eksekusi, ESP32 reset command ke false
// ============================================================

// Buka gate masuk
function openGateIn() {
  db.ref("parking/commands").update({ openGateIn: true })
    .then(() => console.log("📤 CMD: openGateIn = true"))
    .catch((e) => console.error("❌ Gagal:", e.message));
}

// Tutup gate masuk
function closeGateIn() {
  db.ref("parking/commands").update({ openGateIn: false })
    .then(() => console.log("📤 CMD: openGateIn = false"))
    .catch((e) => console.error("❌ Gagal:", e.message));
}

// Buka gate keluar
function openGateOut() {
  db.ref("parking/commands").update({ openGateOut: true })
    .then(() => console.log("📤 CMD: openGateOut = true"))
    .catch((e) => console.error("❌ Gagal:", e.message));
}

// Tutup gate keluar
function closeGateOut() {
  db.ref("parking/commands").update({ openGateOut: false })
    .then(() => console.log("📤 CMD: openGateOut = false"))
    .catch((e) => console.error("❌ Gagal:", e.message));
}

// Reset slot parkir ke nilai total
function resetSlots() {
  // Kirim command reset ke ESP32
  db.ref("parking/commands").update({ resetSlots: true })
    .then(() => console.log("📤 CMD: resetSlots = true"))
    .catch((e) => console.error("❌ Gagal:", e.message));
}

// ============================================================
//  6. GRAFIK REALTIME — Chart.js
// ============================================================
const MAX_POINTS  = 30;
const chartLabels = [];
const chartData   = [];
let   slotChart;

// Inisialisasi grafik setelah DOM siap
document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById("slotChart").getContext("2d");

  slotChart = new Chart(ctx, {
    type: "line",
    data: {
      labels:   chartLabels,
      datasets: [{
        label:                "Slot Tersedia",
        data:                 chartData,
        borderColor:          "#22d3ee",
        backgroundColor:      "rgba(34,211,238,0.08)",
        pointBackgroundColor: "#22d3ee",
        pointRadius:          3,
        pointHoverRadius:     5,
        borderWidth:          2,
        tension:              0.4,
        fill:                 true,
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 300 },
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
          labels: { color: "#6b7280", font: { family: "'JetBrains Mono'", size: 11 }, boxWidth: 12 }
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

  // Footer tahun
  document.getElementById("footer-year").textContent = new Date().getFullYear();

  console.log("✅ Chart.js diinisialisasi");
});

// Tambah titik baru ke grafik
function pushChartData(value) {
  if (!slotChart) return;
  const now = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  chartLabels.push(now);
  chartData.push(value);
  if (chartLabels.length > MAX_POINTS) {
    chartLabels.shift();
    chartData.shift();
  }
  slotChart.update();
}

// Reset grafik
function clearChart() {
  chartLabels.length = 0;
  chartData.length   = 0;
  if (slotChart) slotChart.update();
  console.log("🔄 Chart direset");
}

// ============================================================
//  7. HELPER UI — update tampilan card & badge
// ============================================================

// Status Firebase Connected / Disconnected
function setFirebaseStatus(ok) {
  const el = document.getElementById("firebase-status");
  if (!el) return;
  el.textContent = ok ? "Connected" : "Disconnected";
  el.className   = "badge " + (ok ? "badge-green" : "badge-red");
}

// Status ESP32 Online / Offline
function setESPStatus(online) {
  const el  = document.getElementById("esp-status");
  const dot = document.getElementById("esp-dot");
  if (!el || !dot) return;
  el.textContent = online ? "Online" : "Offline";
  el.className   = "badge " + (online ? "badge-green" : "badge-red");
  dot.className  = "status-dot " + (online ? "dot-green" : "dot-red");
}

// Badge status gate (OPEN/CLOSED)
function setGateUI(id, status) {
  const badge = document.getElementById(id + "-badge");
  if (!badge) return;
  const isOpen       = (status === "OPEN");
  badge.textContent  = isOpen ? "OPEN" : "CLOSED";
  badge.className    = "gate-badge " + (isOpen ? "gate-open" : "gate-closed");
}

// Pill status parkir (TERSEDIA / HAMPIR PENUH / PENUH)
function updateStatusBadge(available) {
  const pill  = document.getElementById("parking-status-badge");
  const valEl = document.getElementById("val-available");
  const total = parseInt(document.getElementById("val-total").textContent) || 10;
  if (!pill) return;

  if (available === 0) {
    pill.textContent  = "PENUH";
    pill.className    = "status-pill pill-red";
    if (valEl) valEl.style.color = "var(--red)";
  } else if (available < Math.ceil(total * 0.3)) {
    pill.textContent  = "HAMPIR PENUH";
    pill.className    = "status-pill pill-yellow";
    if (valEl) valEl.style.color = "var(--yellow)";
  } else {
    pill.textContent  = "TERSEDIA";
    pill.className    = "status-pill pill-green";
    if (valEl) valEl.style.color = "var(--cyan)";
  }
}

// Bar kapasitas parkir
function updateSlotBar(available) {
  const total    = parseInt(document.getElementById("val-total").textContent) || 10;
  const used     = total - available;
  const pct      = (used / total) * 100;
  const bar      = document.getElementById("slot-bar-fill");
  const usedLabel= document.getElementById("slot-used-label");
  if (!bar) return;
  bar.style.width      = pct + "%";
  bar.style.background = pct >= 100 ? "var(--red)"
                       : pct >= 70  ? "var(--yellow)"
                       :              "var(--green)";
  if (usedLabel) usedLabel.textContent = used;
}

// ============================================================
//  LOG STARTUP
// ============================================================
console.log("==========================================");
console.log("  Smart Parking IoT — app.js loaded");
console.log("  Firebase project : smart-parkiing");
console.log("  Auth             : " + USER_EMAIL);
console.log("==========================================");