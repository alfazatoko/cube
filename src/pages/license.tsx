import { useState } from "react";
import { useLocation } from "wouter";
import { validateLicense } from "@/lib/firestore";
import { Loader2, KeyRound, Clock, CheckCircle2, Infinity, ShieldCheck } from "lucide-react";

export default function License() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleActivate = async () => {
    if (!code) {
      setError("Masukkan kode lisensi.");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Masukkan email pendaftaran yang valid.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create a unique device ID if not exists
      let deviceId = localStorage.getItem("kasir_device_id");
      if (!deviceId) {
        deviceId = "DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
        localStorage.setItem("kasir_device_id", deviceId);
      }

      const res = await validateLicense(code.toUpperCase(), email.toLowerCase(), deviceId);
      if (res.valid && res.license) {
        // Save the valid license to local storage
        localStorage.setItem("kasir_license", JSON.stringify({
          id: res.license.id,
          expiresAt: res.license.expiresAt,
          deviceId
        }));
        
        // Go to login page
        window.location.href = import.meta.env.BASE_URL || "/";
      } else {
        setError(res.message);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal memvalidasi lisensi. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center">
        
        <h1 className="text-4xl font-black text-blue-700 mb-2">CUBE</h1>
        <p className="text-center text-gray-500 font-medium mb-8 max-w-[250px] leading-snug">
          Masukkan kode lisensi untuk mengaktifkan aplikasi
        </p>

        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex flex-col items-center justify-center gap-1">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 mb-1">
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800 text-sm">Demo</span>
            <span className="text-[10px] text-gray-500">7 hari</span>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex flex-col items-center justify-center gap-1">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mb-1">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800 text-sm whitespace-nowrap">4 Bulan</span>
            <span className="text-[10px] text-gray-500">120 hari</span>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex flex-col items-center justify-center gap-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-1">
              <Infinity className="w-5 h-5" />
            </div>
            <span className="font-bold text-gray-800 text-sm">Lifetime</span>
            <span className="text-[10px] text-gray-500">Selamanya</span>
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-3 rounded-2xl mb-4 text-center">
            {error}
          </div>
        )}

        <div className="w-full flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-4 h-14 bg-gray-50 focus-within:border-blue-500 mb-3 transition-all">
          <KeyRound className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="KODE LISENSI"
            value={code}
            onChange={e => {
              let val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              let formatted = '';
              for(let i=0; i<val.length; i++) {
                if (i > 0 && i % 4 === 0) formatted += '-';
                formatted += val[i];
              }
              setCode(formatted.slice(0, 14));
            }}
            onKeyDown={e => e.key === "Enter" && handleActivate()}
            className="flex-1 bg-transparent outline-none text-base font-bold text-gray-800 tracking-widest placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal uppercase"
          />
        </div>

        <div className="w-full flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-4 h-14 bg-gray-50 focus-within:border-blue-500 mb-4 transition-all">
          <KeyRound className="w-5 h-5 text-gray-400 opacity-0" /> {/* Spacer or Mail icon if available */}
          <input
            type="email"
            placeholder="EMAIL PENDAFTARAN"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleActivate()}
            className="flex-1 bg-transparent outline-none text-sm font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
          />
        </div>

        <button
          type="button"
          onClick={handleActivate}
          disabled={loading || code.length < 14 || !email}
          className="w-full h-14 rounded-2xl font-bold text-base bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 mb-6"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          Aktifkan Lisensi
        </button>

        <p className="text-center text-gray-500 text-xs">
          Maks. 7 perangkat per lisensi.<br/>
          Hubungi admin untuk mendapatkan kode.
        </p>
      </div>
    </div>
  );
}
