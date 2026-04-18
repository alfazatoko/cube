import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";
import { db } from "@/lib/firebase";
import {
  Lock, User, Crown, ShieldCheck, Loader2, Calendar,
  AlertTriangle, MessageCircle, Mail, KeyRound, Eye, EyeOff, RotateCw, LogOut, Gift
} from "lucide-react";
import { getSettings } from "@/lib/firestore";

const DEFAULT_WA = "6287824889706";
const WA_MESSAGE = encodeURIComponent("Halo Admin, saya ingin membeli lisensi KASIR CUBE Full System. Mohon info harga dan cara pembayaran.");

interface FreeTrialData {
  email: string;
  registeredAt: string;
  expiresAt: string;
}

// ===================== AUTH SCREEN (LOGIN/REGISTER) =====================
function AuthScreen({ onAuthenticated, waNumber }: { onAuthenticated: (data: FreeTrialData) => void; waNumber: string }) {
  const { firebaseLogin, firebaseRegister } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    if (!email || !email.includes("@")) {
      setError("Masukkan email yang valid.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await firebaseRegister(email, password);
      } else {
        await firebaseLogin(email, password);
      }

      const emailKey = email.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const ref = doc(db, "freeTrials", emailKey);
      const snap = await getDoc(ref);

      let trialData: FreeTrialData;

      if (snap.exists()) {
        trialData = snap.data() as FreeTrialData;
      } else {
        // Create new trial if not exists
        const now = new Date();
        const expires = new Date(now);
        expires.setMonth(expires.getMonth() + 1);

        trialData = {
          email: email.toLowerCase(),
          registeredAt: now.toISOString(),
          expiresAt: expires.toISOString(),
        };
        await setDoc(ref, trialData);
      }

      // Check if expired
      if (new Date(trialData.expiresAt) < new Date()) {
        setError("Masa gratis untuk email ini sudah habis. Silakan beli lisensi.");
        setLoading(false);
        return;
      }

      // Set tenant isolation
      localStorage.setItem("kasir_tenant_id", email.toLowerCase().replace(/[^a-z0-9]/g, "_"));
      localStorage.setItem("kasir_free_trial", JSON.stringify(trialData));
      onAuthenticated(trialData);
    } catch (err: any) {
      console.error(err);
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/invalid-login-credentials") {
        setError("Email atau password salah.");
      } else if (code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar. Silakan login.");
        setIsRegister(false);
      } else {
        setError("Gagal masuk. Periksa koneksi internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-lg">CUBE</span>
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-blue-700 text-center mb-0.5">KASIR CUBE</h2>
        <p className="text-center text-gray-500 text-sm mb-1">Versi Gratis 1 Bulan</p>
        <p className="text-center text-blue-500 text-xs font-bold mb-4">
          {isRegister ? "Buat Akun Baru" : "Login ke Akun Anda"}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-2.5 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-4 h-14 bg-gray-50 focus-within:border-blue-500 transition-all">
            <Mail className="w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email Anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>
          <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-4 h-14 bg-gray-50 focus-within:border-blue-500 transition-all">
            <KeyRound className="w-5 h-5 text-gray-400" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 p-1">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleAuth}
          disabled={loading || !email || !password}
          className="w-full h-14 rounded-3xl font-extrabold text-base bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 mb-4"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          {isRegister ? "DAFTAR SEKARANG" : "MASUK KE SISTEM"}
        </button>

        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(""); }}
          className="w-full text-center text-sm text-blue-600 font-bold mb-6"
        >
          {isRegister ? "Sudah punya akun? Login" : "Belum punya akun? Daftar Gratis"}
        </button>

        <UpgradeButton waNumber={waNumber} />

        <p className="text-center text-gray-400 text-[10px] mt-4">
          Data Anda aman tersimpan di cloud.<br />
          Email ini bisa digunakan untuk upgrade lisensi nantinya.
        </p>
      </div>
    </div>
  );
}

// ===================== EXPIRED SCREEN =====================
function ExpiredScreen({ waNumber }: { waNumber: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 via-gray-700 to-gray-600 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl text-center">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Masa Gratis Habis</h2>
        <p className="text-gray-500 text-sm mb-6">
          Periode gratis 1 bulan Anda telah berakhir. Untuk melanjutkan menggunakan KASIR CUBE, silakan beli lisensi.
        </p>

        <UpgradeButton large waNumber={waNumber} />

        <button
          onClick={() => {
            localStorage.removeItem("kasir_free_trial");
            localStorage.removeItem("kasir_tenant_id");
            window.location.reload();
          }}
          className="mt-4 text-sm text-gray-400 font-semibold flex items-center justify-center gap-2 mx-auto"
        >
          <RotateCw className="w-4 h-4" /> Kembali ke Login
        </button>
      </div>
    </div>
  );
}

// ===================== UPGRADE BUTTON =====================
function UpgradeButton({ large, waNumber }: { large?: boolean; waNumber?: string }) {
  const num = waNumber || DEFAULT_WA;
  return (
    <a
      href={`https://wa.me/${num}?text=${WA_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition ${large ? "h-14 text-base" : "h-12 text-sm"}`}
    >
      <MessageCircle className="w-5 h-5" />
      HUBUNGI ADMIN - Beli Lisensi
    </a>
  );
}

// ===================== DASHBOARD SCREEN =====================
function DashboardScreen({ trial, waNumber }: { trial: FreeTrialData; waNumber: string }) {
  const daysLeft = Math.max(0, Math.ceil((new Date(trial.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const { login, firebaseLogout } = useAuth();
  const [, setLocation] = useLocation();

  const handleOpenKasir = () => {
    const kasirName = `GRATIS_${trial.email.split("@")[0].toUpperCase()}`;
    login({
      id: "gratis_kasir",
      name: kasirName,
      role: "kasir",
      pin: "",
      isActive: true
    }, "PAGI");
    setLocation("/beranda");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 p-4 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-extrabold tracking-wider uppercase text-sm">KASIR CUBE</span>
          <span className="text-[10px] bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-bold">GRATIS</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{daysLeft} hari</span>
          </div>
          <button onClick={firebaseLogout} className="p-1 hover:text-red-200 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-sm mx-auto">
        {/* Info bar */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6 flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 font-semibold leading-snug">
            Anda menggunakan Versi Gratis. Data akan terhubung otomatis jika nanti membeli lisensi dengan email ini.
          </p>
        </div>

        {/* Kasir Cards */}
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Akses Kasir</p>

        {/* KASIR 01 - ACTIVE */}
        <button
          onClick={handleOpenKasir}
          className="w-full bg-white rounded-3xl p-5 mb-3 border-2 border-blue-500 shadow-lg shadow-blue-500/10 flex items-center gap-4 active:scale-[0.98] transition-all hover:border-blue-600 group"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <User className="w-7 h-7" />
          </div>
          <div className="text-left flex-1">
            <h3 className="text-lg font-extrabold text-gray-900">KASIR UTAMA</h3>
            <p className="text-xs text-blue-600 font-semibold">✅ Aktif — Klik untuk Masuk</p>
          </div>
        </button>

        {/* LOCKED FEATURES */}
        <div className="space-y-3 mb-6 opacity-60">
          <div className="w-full bg-gray-200/70 rounded-3xl p-5 border-2 border-gray-300 flex items-center gap-4 cursor-not-allowed">
            <div className="w-14 h-14 rounded-2xl bg-gray-400 flex items-center justify-center text-white relative">
              <User className="w-7 h-7" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-extrabold text-gray-500">MULTIPLE KASIR</h3>
              <p className="text-xs text-red-500 font-bold">🔒 Terkunci (Beli Lisensi)</p>
            </div>
          </div>

          <div className="w-full bg-gray-200/70 rounded-3xl p-5 border-2 border-gray-300 flex items-center gap-4 cursor-not-allowed">
            <div className="w-14 h-14 rounded-2xl bg-gray-400 flex items-center justify-center text-white relative">
              <Crown className="w-7 h-7" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-white">
                <Lock className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="text-left flex-1">
              <h3 className="text-lg font-extrabold text-gray-500">OWNER PANEL</h3>
              <p className="text-xs text-red-500 font-bold">🔒 Terkunci (Beli Lisensi)</p>
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        <UpgradeButton large waNumber={waNumber} />

        <div className="mt-8 pt-6 border-t border-gray-200">
           <p className="text-center text-gray-400 text-[10px] leading-relaxed">
            Email Terdaftar: <span className="font-bold text-gray-500">{trial.email}</span><br />
            Masa Berlaku Sampai: <span className="font-bold text-blue-500">{new Date(trial.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ===================== MAIN GRATIS PAGE =====================
export default function Gratis() {
  const { firebaseUser, firebaseLoading } = useAuth();
  const [view, setView] = useState<"loading" | "auth" | "dashboard" | "expired">("loading");
  const [trial, setTrial] = useState<FreeTrialData | null>(null);
  const [waNumber, setWaNumber] = useState(DEFAULT_WA);

  useEffect(() => {
    getSettings().then(s => { if (s.waNumber) setWaNumber(s.waNumber); }).catch(() => {});

    if (firebaseLoading) return;

    const stored = localStorage.getItem("kasir_free_trial");
    if (stored) {
      try {
        const data = JSON.parse(stored) as FreeTrialData;
        if (new Date(data.expiresAt) < new Date()) {
          setView("expired");
          setTrial(data);
        } else {
          setTrial(data);
          if (firebaseUser) {
            // Ensure tenant ID is set if logged in
            localStorage.setItem("kasir_tenant_id", firebaseUser.email!.toLowerCase().replace(/[^a-z0-9]/g, "_"));
            setView("dashboard");
          } else {
            setView("auth"); // Must be logged in to access dashboard
          }
        }
      } catch {
        setView("auth");
      }
    } else {
      if (firebaseUser) {
         // Check if trial exists in Firestore for this user
         const emailKey = firebaseUser.email!.toLowerCase().replace(/[^a-z0-9]/g, "_");
         getDoc(doc(db, "freeTrials", emailKey)).then(snap => {
           if (snap.exists()) {
             const data = snap.data() as FreeTrialData;
             localStorage.setItem("kasir_free_trial", JSON.stringify(data));
             localStorage.setItem("kasir_tenant_id", emailKey);
             setTrial(data);
             if (new Date(data.expiresAt) < new Date()) {
               setView("expired");
             } else {
               setView("dashboard");
             }
           } else {
             setView("auth");
           }
         }).catch(() => setView("auth"));
      } else {
        setView("auth");
      }
    }
  }, [firebaseUser, firebaseLoading]);

  if (view === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (view === "expired") return <ExpiredScreen waNumber={waNumber} />;

  if (view === "auth") {
    return (
      <AuthScreen
        waNumber={waNumber}
        onAuthenticated={(data) => {
          setTrial(data);
          setView("dashboard");
        }}
      />
    );
  }

  if (view === "dashboard" && trial) {
    return <DashboardScreen trial={trial} waNumber={waNumber} />;
  }

  return null;
}
