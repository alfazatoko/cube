import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// ═══════════════════════════════════════════════════════════
// SERVICE WORKER — Auto Update dengan Toast Notification
// ═══════════════════════════════════════════════════════════
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Cek update secara berkala setiap 60 detik
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

      // Deteksi saat ada Service Worker baru yang ter-install
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // SW baru sudah ter-install, tampilkan toast notifikasi
            showUpdateToast(registration);
          }
        };
      };
    }).catch((err) => {
      console.warn("SW registration failed:", err);
    });

    // Reload saat controller berubah (setelah user klik "Perbarui")
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}

function showUpdateToast(registration: ServiceWorkerRegistration) {
  // Hapus toast lama jika ada
  const existingToast = document.getElementById("sw-update-toast");
  if (existingToast) existingToast.remove();

  const toast = document.createElement("div");
  toast.id = "sw-update-toast";
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: white;
      padding: 14px 20px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 600;
      max-width: 360px;
      width: calc(100% - 32px);
      animation: slideUp 0.4s ease-out;
    ">
      <span style="flex:1">🚀 Versi terbaru KASIR CUBE tersedia!</span>
      <button id="sw-update-btn" style="
        background: white;
        color: #1e40af;
        border: none;
        padding: 8px 16px;
        border-radius: 10px;
        font-weight: 800;
        font-size: 12px;
        cursor: pointer;
        white-space: nowrap;
        transition: transform 0.1s;
      ">PERBARUI</button>
    </div>
    <style>
      @keyframes slideUp {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
      #sw-update-btn:active { transform: scale(0.95); }
    </style>
  `;
  document.body.appendChild(toast);

  document.getElementById("sw-update-btn")?.addEventListener("click", () => {
    // Kirim pesan ke SW baru agar skipWaiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    toast.remove();
  });
}
