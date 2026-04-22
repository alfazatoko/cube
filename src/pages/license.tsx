import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { validateLicense, getSystemConfig } from "@/lib/firestore";
import { Loader2, KeyRound, Clock, CheckCircle2, Infinity, ShieldCheck, Download, RotateCw } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export default function License() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [waNumber, setWaNumber] = useState("6287824889706");

  useEffect(() => {
    getSystemConfig().then(config => {
      if (config.waNumber) setWaNumber(config.waNumber);
    }).catch(() => {});
  }, []);

  const handleDownloadGuide = () => {
    const link = document.createElement('a');
    link.href = '/panduan-kasir-cube.zip';
    link.download = 'panduan-kasir-cube.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

        // Set tenant ID to connect existing bookkeeping from free trial
        localStorage.setItem("kasir_tenant_id", email.toLowerCase().replace(/[^a-z0-9]/g, "_"));
        
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

  const handleContactAdmin = () => {
    const text = encodeURIComponent("Halo Admin, saya ingin membeli lisensi KASIR CUBE.");
    window.open(`https://wa.me/${waNumber}?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center">
      
      {/* Header Baru untuk menyamai screenshot user */}
      <div className="w-full bg-blue-600 p-4 flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5" />
          <span className="font-extrabold tracking-wider uppercase text-sm">KASIR CUBE</span>
        </div>
        <button onClick={() => window.location.reload()} className="p-1 active:rotate-180 transition-transform duration-500">
          <RotateCw className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-sm flex flex-col items-center p-4 pt-10">
        
        <h1 className="text-4xl font-black text-blue-700 mb-2">CUBE</h1>
        <p className="text-center text-muted-foreground font-medium mb-8 max-w-[250px] leading-snug">
          Masukkan kode lisensi untuk mengaktifkan aplikasi
        </p>

        {/* Download Guide Button - Pindah ke atas agar lebih terlihat */}
        <button
          onClick={handleDownloadGuide}
          className="w-full mb-8 py-4 px-4 rounded-3xl bg-emerald-500 text-white flex items-center justify-center gap-4 group active:scale-95 transition-all duration-200 shadow-lg shadow-emerald-500/20"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-black uppercase tracking-widest">Unduh Panduan</span>
            <span className="text-[10px] text-white/80 font-medium">Klik untuk unduh semua panduan</span>
          </div>
        </button>

        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          <div className="bg-card border border-border rounded-3xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 mb-1">
              <Clock className="w-5 h-5" />
            </div>
            <span className="font-bold text-foreground text-sm">Demo</span>
            <span className="text-[10px] text-muted-foreground">7 hari</span>
          </div>

          <div className="bg-card border border-border rounded-3xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mb-1">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-bold text-foreground text-sm whitespace-nowrap">4 Bulan</span>
            <span className="text-[10px] text-muted-foreground">120 hari</span>
          </div>

          <div className="bg-card border border-border rounded-3xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 mb-1">
              <Infinity className="w-5 h-5" />
            </div>
            <span className="font-bold text-foreground text-sm">Lifetime</span>
            <span className="text-[10px] text-muted-foreground">Selamanya</span>
          </div>
        </div>

        {error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-3 rounded-2xl mb-4 text-center">
            {error}
          </div>
        )}

        <div className="w-full flex items-center gap-3 border-2 border-border rounded-2xl px-4 h-14 bg-muted focus-within:border-blue-500 mb-3 transition-all">
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
            className="flex-1 bg-transparent outline-none text-base font-bold text-foreground tracking-widest placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal uppercase"
          />
        </div>

        <div className="w-full flex items-center gap-3 border-2 border-border rounded-2xl px-4 h-14 bg-muted focus-within:border-blue-500 mb-4 transition-all">
          <KeyRound className="w-5 h-5 text-gray-400 opacity-0" /> {/* Spacer or Mail icon if available */}
          <input
            type="email"
            placeholder="EMAIL PENDAFTARAN"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleActivate()}
            className="flex-1 bg-transparent outline-none text-sm font-bold text-foreground placeholder:text-gray-400 placeholder:font-normal"
          />
        </div>

        <button
          type="button"
          onClick={handleActivate}
          disabled={loading || code.length < 14 || !email}
          className="w-full h-14 rounded-2xl font-bold text-base bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 mb-4"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          Aktifkan Lisensi
        </button>

        <button
          type="button"
          onClick={handleContactAdmin}
          className="w-full h-14 rounded-2xl font-black text-base bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition mb-6"
        >
          <FaWhatsapp className="w-6 h-6" />
          HUBUNGI ADMIN
        </button>

        <p className="text-center text-muted-foreground text-xs">
          Maks. 7 perangkat per lisensi.<br/>
          Hubungi admin untuk mendapatkan kode.
        </p>

      </div>
    </div>
  );
}
