import { useState, useEffect } from "react";
import { Loader2, Key, Trash2, Copy, ShieldCheck, CheckCircle2, Clock, Infinity } from "lucide-react";
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
      setLicenses(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
    setGenerating(true);
    try {
      await generateLicense(selectedType);
      await loadLicenses();
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
                      <button onClick={() => copyToClipboard(lic.id)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                      <span className={`px-2 py-0.5 rounded-full ${
                        lic.type === "demo" ? "bg-amber-100 text-amber-700" :
                        lic.type === "4_months" ? "bg-blue-100 text-blue-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {lic.type.toUpperCase()}
                      </span>
                      <span className={lic.status === "active" ? "text-green-600" : "text-red-500"}>
                        {lic.status.toUpperCase()}
                      </span>
                      <span className="text-gray-500">
                        {lic.activeDevices.length}/{lic.maxDevices} Devices
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      Dibuat: {format(new Date(lic.createdAt), "dd MMM yyyy HH:mm", { locale: idLocale })}
                      {lic.expiresAt && ` • Kedaluwarsa: ${format(new Date(lic.expiresAt), "dd MMM yyyy", { locale: idLocale })}`}
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
      </div>
    </div>
  );
}
