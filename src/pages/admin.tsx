import { useState, useEffect } from "react";
import { Loader2, Key, Trash2, Copy, ShieldCheck, CheckCircle2, Clock, Infinity, Download } from "lucide-react";
import { generateLicense, getLicenses, deleteLicense, getSettings, updateSettings, type LicenseRecord } from "@/lib/firestore";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<"demo" | "4_months" | "lifetime">("demo");
  const [requireLicense, setRequireLicense] = useState(true);
  const [zipping, setZipping] = useState(false);
  const [genEmail, setGenEmail] = useState("");

  useEffect(() => {
    if (authenticated) {
      loadLicenses();
    }
  }, [authenticated]);

  const loadLicenses = async () => {
    setLoading(true);
    try {
      const [data, settings] = await Promise.all([
        getLicenses(),
        getSettings()
      ]);
      const sorted = data.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setLicenses(sorted);
      setRequireLicense(settings.requireLicense ?? true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Umbui123@") {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Password salah!");
    }
  };

  const handleGenerate = async () => {
    if (!selectedType) return;
    if (!genEmail || !genEmail.includes("@")) {
      alert("Masukkan email pendaftaran yang valid!");
      return;
    }
    setGenerating(true);
    try {
      await generateLicense(selectedType, genEmail);
      await loadLicenses();
      setGenEmail("");
      alert("Lisensi berhasil dibuat!");
    } catch (err) {
      console.error("Gagal membuat lisensi", err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleRequireLicense = async () => {
    const newValue = !requireLicense;
    setRequireLicense(newValue);
    try {
      await updateSettings({ requireLicense: newValue });
    } catch (err) {
      console.error("Gagal update setting", err);
      setRequireLicense(!newValue);
    }
  };

  const safeFormat = (dateStr: string | null | undefined, formatStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Format Salah";
      return format(d, formatStr, { locale: idLocale });
    } catch (e) {
      return "Error";
    }
  };

  const handleDownloadZip = async () => {
    setZipping(true);
    try {
      const [{ getSourceFiles }, { default: JSZip }] = await Promise.all([
        import("@/lib/source-bundle"),
        import("jszip"),
      ]);
      const files = getSourceFiles();
      const zip = new JSZip();
      for (const [path, content] of Object.entries(files)) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kasir-cube-source-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      alert("Source code berhasil diunduh!");
    } catch (err) {
      console.error(err);
      alert("Gagal membuat ZIP");
    } finally {
      setZipping(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus lisensi ini?")) return;
    try {
      await deleteLicense(id);
      await loadLicenses();
    } catch (err) {
      console.error("Gagal menghapus", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Kode lisensi disalin!");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl w-full max-w-sm shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center text-gray-800 mb-2">Admin Panel</h2>
          <p className="text-center text-gray-500 text-sm mb-6">Masukkan password rahasia</p>
          
          {error && <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl mb-4 text-center">{error}</div>}
          
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 mb-4 outline-none focus:border-blue-500 transition"
          />
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl hover:bg-blue-700 transition">
            MASUK
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-3xl mx-auto">
        <div className="bg-blue-600 rounded-3xl p-6 text-white mb-6 shadow-lg flex items-center gap-4">
          <ShieldCheck className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-black">License Manager</h1>
            <p className="text-blue-100 text-sm">Kelola kode aktivasi KASIR CUBE</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" /> Sistem Lisensi
            </h3>
            <button 
              onClick={toggleRequireLicense}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireLicense ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireLicense ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {requireLicense ? "Aktif: Pengguna wajib memasukkan kode lisensi." : "Nonaktif: Aplikasi bisa digunakan tanpa lisensi."}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-500" /> Buat Lisensi Baru
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button 
              onClick={() => setSelectedType("demo")}
              className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-2 transition border-2 ${selectedType === "demo" ? "bg-amber-50 border-amber-500 text-amber-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
            >
              <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="font-bold text-[10px] sm:text-sm text-center leading-tight">Demo<br className="sm:hidden"/>(7 Hari)</span>
            </button>
            <button 
              onClick={() => setSelectedType("4_months")}
              className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-2 transition border-2 ${selectedType === "4_months" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
            >
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="font-bold text-[10px] sm:text-sm text-center leading-tight">Pro<br className="sm:hidden"/>(4 Bln)</span>
            </button>
            <button 
              onClick={() => setSelectedType("lifetime")}
              className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center gap-1 sm:gap-2 transition border-2 ${selectedType === "lifetime" ? "bg-purple-50 border-purple-500 text-purple-700" : "bg-white border-gray-100 text-gray-500 hover:bg-gray-50"}`}
            >
              <Infinity className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="font-bold text-[10px] sm:text-sm text-center leading-tight">Lifetime</span>
            </button>
          </div>
          <div className="mb-4">
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Email Pendaftaran</label>
            <input 
              type="email" 
              value={genEmail} 
              onChange={e => setGenEmail(e.target.value)} 
              placeholder="contoh: user@gmail.com" 
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
            />
          </div>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            BUAT KODE SEKARANG
          </button>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-800">Daftar Lisensi</h3>
            <button onClick={loadLicenses} className="text-blue-600 text-sm font-semibold hover:underline">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
          ) : licenses.length === 0 ? (
            <div className="text-center py-10 text-gray-400">Belum ada lisensi.</div>
          ) : (
            <div className="space-y-3">
              {licenses.map(lic => (
                <div key={lic.id} className="border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-lg font-black text-gray-800 bg-gray-100 px-2 py-1 rounded-lg tracking-wider">
                        {lic.id}
                      </code>
                      <button onClick={() => copyToClipboard(lic.id)} className="text-blue-600 hover:text-blue-700">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        lic.type === "demo" ? "bg-amber-100 text-amber-600" :
                        lic.type === "4_months" ? "bg-blue-100 text-blue-600" :
                        "bg-purple-100 text-purple-600"
                      }`}>
                        {lic.type.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="text-gray-400">
                        {lic.activeDevices.length} / {Math.max(lic.maxDevices || 0, 7)} HP
                      </span>
                      {lic.registeredEmail && (
                        <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                          {lic.registeredEmail}
                        </span>
                      )}
                      <span className="text-gray-400">
                        Exp: {lic.expiresAt ? safeFormat(lic.expiresAt, "dd MMM yyyy") : "Lifetime"}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Dibuat: {safeFormat(lic.createdAt, "dd MMM yyyy HH:mm")}
                      {lic.expiresAt && ` • Kedaluwarsa: ${safeFormat(lic.expiresAt, "dd MMM yyyy")}`}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(lic.id)} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition shrink-0 self-end sm:self-auto">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 mb-10 border-t border-gray-200 pt-8">
          <button 
            onClick={handleDownloadZip} 
            disabled={zipping}
            className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-4 rounded-2xl transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
          >
            {zipping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {zipping ? "MEMPROSES ZIP..." : "DOWNLOAD SOURCE CODE (ZIP)"}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">Unduh semua file kode terbaru untuk keperluan backup atau pengembangan</p>
        </div>
      </div>
    </div>
  );
}
