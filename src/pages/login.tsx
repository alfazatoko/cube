import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { getUsers, getSettings, loginUser, type UserRecord } from "@/lib/firestore";
import { ChevronDown, Loader2, Lock, SunMedium, SunMoon, Eye, EyeOff, Mail, KeyRound, LogOut, Store, BookOpen, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const logoUrl = "/logo.png";

const SHIFT_OPTIONS = [
  { value: "PAGI", label: "Pagi", icon: SunMedium },
  { value: "SIANG", label: "Siang", icon: SunMoon },
];

const GUIDE_PAGES = [
  {
    title: "1. Cara Isi Saldo",
    content: "Untuk menambah modal awal atau mengisi saldo laci:\n\n1. Tekan tombol **+ Saldo** di halaman Beranda.\n2. Pilih jenis saldo: **Bank** (untuk saldo di rekening) atau **Cash** (untuk uang fisik di laci).\n3. Masukkan nominal saldo dan keterangan (opsional).\n4. Tekan Simpan. Saldo Anda akan otomatis bertambah di dashboard.",
    icon: Store,
    color: "bg-blue-500"
  },
  {
    title: "2. Cara Catat Transaksi",
    content: "Cara melakukan pencatatan transaksi harian:\n\n1. Pilih **Kategori** transaksi (misal: Bank BRI, Dana, dll).\n2. Masukkan **Nominal** transaksi.\n3. Masukkan biaya **Admin** yang dikenakan ke pelanggan.\n4. Tambahkan **Keterangan** jika diperlukan (misal: nomor HP atau nama).\n5. Tekan **Proses Transaksi**.",
    icon: KeyRound,
    color: "bg-emerald-500"
  },
  {
    title: "3. Non Tunai & Catatan",
    content: "**Non Tunai**:\nGunakan menu ini untuk transaksi yang tidak melibatkan uang cash fisik (transfer ke transfer).\n\n**Catatan (Kasbon & Kontak)**:\n- **KASBON**: Catat piutang pelanggan agar tidak lupa.\n- **KONTAK**: Simpan nomor WA pelanggan agar mudah dihubungi kembali.",
    icon: BookOpen,
    color: "bg-purple-500"
  },
  {
    title: "4. Laporan & Penyesuaian",
    content: "**Laporan**:\nBerisi rekapitulasi total uang yang masuk, keluar, dan admin.\n\n**Penyesuaian**:\nTombol di bagian atas laporan untuk mencatat **Saldo Real App** dan **Sisa Saldo Bank** di akhir hari agar laporan keuangan sinkron dengan saldo asli di aplikasi bank/e-wallet.",
    icon: Mail,
    color: "bg-amber-500"
  },
  {
    title: "5. Mode Owner (Pemilik)",
    content: "Menu khusus pemilik toko untuk kontrol penuh:\n\n- **Kasir**: Tambah atau edit akun karyawan.\n- **Absen**: Pantau jam kehadiran karyawan secara real-time.\n- **Setting**: Ganti Nama Toko, Logo, Running Text, dan **Custom Kategori**.\n- **Backup**: Ekspor data transaksi ke Excel untuk arsip permanen.",
    icon: Lock,
    color: "bg-rose-500"
  },
  {
    title: "6. Izin & Gaji (Owner)",
    content: "**Manajemen Izin**:\nOwner bisa menyetujui atau menolak pengajuan izin kasir. Izin yang disetujui akan tercatat otomatis.\n\n**Sistem Gaji**:\nFitur untuk menghitung total gaji berdasarkan jumlah hari kerja (dari absen) dikalikan gaji per hari, ditambah bonus atau potongan yang bisa diatur secara manual per kasir.",
    icon: HelpCircle,
    color: "bg-indigo-500"
  }
];

function GuideModal({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [page, setPage] = useState(0);
  const current = GUIDE_PAGES[page];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto p-0 overflow-hidden border-none bg-white shadow-2xl">
        <DialogHeader className={`p-6 pb-12 relative overflow-hidden text-white ${current.color} transition-colors duration-500`}>
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/5 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg">
              <current.icon className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-xl font-black text-center">{current.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 -mt-8 relative z-20 bg-white rounded-t-[2.5rem] min-h-[300px] flex flex-col">
          <div className="flex-1">
            <div className="prose prose-sm prose-slate">
              <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap font-medium italic mb-4">
                "{current.content.split('\n\n')[0]}"
              </p>
              <div className="space-y-3">
                {current.content.split('\n\n').slice(1).map((text, i) => (
                  <div key={i} className="text-gray-700 text-sm leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {text.split('\n').map((line, j) => (
                      <p key={j} className={line.startsWith('**') ? 'font-bold text-blue-700' : ''}>{line}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-1.5">
              {GUIDE_PAGES.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200'}`} />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-30 active:scale-90 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                disabled={page === GUIDE_PAGES.length - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-5 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                LANJUT <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FirebaseAuthScreen() {
  const { firebaseLogin, firebaseRegister } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [shopCode, setShopCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const SHOP_CODE = "ALFAZA2024";

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Email dan password harus diisi");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (isRegister) {
      if (shopCode !== SHOP_CODE) {
        setError("Kode toko salah. Hubungi pemilik toko.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Password tidak cocok");
        return;
      }
    }
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await firebaseRegister(email, password);
      } else {
        await firebaseLogin(email, password);
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
        setError("Email atau password salah");
      } else if (code === "auth/email-already-in-use") {
        setError("Email sudah terdaftar. Silakan login.");
        setIsRegister(false);
      } else if (code === "auth/weak-password") {
        setError("Password terlalu lemah (min 6 karakter)");
      } else if (code === "auth/invalid-email") {
        setError("Format email tidak valid");
      } else {
        setError(err?.message || "Gagal autentikasi");
      }
    } finally {
      setLoading(false);
    }
  };

  const [authSettings, setAuthSettings] = useState<{ profilePhotoUrl?: string; shopName?: string } | null>(null);
  useEffect(() => { getSettings().then(s => setAuthSettings(s)).catch(() => {}); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center p-4">
      <div className="bg-card p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <img src={authSettings?.profilePhotoUrl || logoUrl} alt="KASIR CUBE" className="w-full h-full object-cover" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-blue-700 text-center mb-0.5">{authSettings?.shopName || "KASIR CUBE"}</h2>
        <p className="text-center text-muted-foreground text-sm mb-1">Sistem Kasir Pro</p>
        <p className="text-center text-blue-500 text-xs font-semibold mb-6">
          {isRegister ? "Daftar Akun Baru" : "Login Firebase"}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-2.5 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-5">
          {isRegister && (
            <div className="flex items-center gap-3 border-2 border-border rounded-2xl px-4 h-14 bg-muted focus-within:border-blue-500">
              <Store className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Kode Toko"
                value={shopCode}
                onChange={e => setShopCode(e.target.value.toUpperCase())}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-foreground tracking-widest placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal"
              />
            </div>
          )}

          <div className="flex items-center gap-3 border-2 border-border rounded-2xl px-4 h-14 bg-muted focus-within:border-blue-500">
            <Mail className="w-5 h-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isRegister && handleSubmit()}
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>

          <div className="flex items-center gap-3 border-2 border-border rounded-2xl px-4 h-14 bg-muted focus-within:border-blue-500">
            <KeyRound className="w-5 h-5 text-gray-400" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !isRegister && handleSubmit()}
              className="flex-1 bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-gray-400 placeholder:font-normal"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {isRegister && (
            <div className="flex items-center gap-3 border-2 border-border rounded-2xl px-4 h-14 bg-muted focus-within:border-blue-500">
              <KeyRound className="w-5 h-5 text-gray-400" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Konfirmasi Password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-foreground placeholder:text-gray-400 placeholder:font-normal"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-14 rounded-3xl font-extrabold text-lg bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 mb-4"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          {isRegister ? "DAFTAR" : "LOGIN"}
        </button>

        <button
          type="button"
          onClick={() => { setIsRegister(!isRegister); setError(""); setShopCode(""); setConfirmPassword(""); }}
          className="w-full text-center text-sm text-blue-600 font-semibold"
        >
          {isRegister ? "Sudah punya akun? Login" : "Belum punya akun? Daftar"}
        </button>

        <div className="mt-4 bg-blue-50 rounded-xl p-3 border border-blue-200">
          <p className="text-[10px] text-blue-600 text-center">
            Data disimpan di Firebase Cloud. Aman dan bisa diakses dari mana saja.
          </p>
        </div>
      </div>
    </div>
  );
}

function KasirSelectionScreen() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [shopNameSetting, setShopNameSetting] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [pin, setPin] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>("PAGI");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { login, firebaseLogout, firebaseUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) {
        setError("Koneksi ke Firebase timeout.");
        setLoading(false);
      }
    }, 10000);

    const load = async () => {
      try {
        const [usersData, settingsData] = await Promise.all([
          getUsers(),
          getSettings(),
        ]);
        if (!cancelled) {
          clearTimeout(timeout);
          setUsers(usersData.filter(u => u.isActive));
          setPinEnabled(settingsData.pinEnabled ?? false);
          setProfilePhoto(settingsData.profilePhotoUrl || "");
          setShopNameSetting(settingsData.shopName || "");
          setLoading(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          clearTimeout(timeout);
          setError(err?.message || "Gagal memuat data");
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  const doLogin = async (userName: string) => {
    const user = users.find((u) => u.name === userName);
    if (!user) return;
    if (pinEnabled && pin.length < 4) {
      setError("PIN harus 4 digit");
      return;
    }
    if (user.role !== "owner" && !selectedShift) {
      setError("Pilih shift dulu");
      return;
    }
    setLoggingIn(true);
    setError("");
    setSelected(userName);
    try {
      const now = new Date();
      const deviceH = now.getHours().toString().padStart(2, "0");
      const deviceM = now.getMinutes().toString().padStart(2, "0");
      const deviceTime = `${deviceH}:${deviceM}`;

      const result = await loginUser(
        userName,
        pinEnabled ? pin : undefined,
        user.role !== "owner" ? selectedShift : undefined,
        deviceTime
      );

      if (result.success && result.user) {
        login(result.user, selectedShift || "", result.absenTime);
        setLocation(result.role === "owner" ? "/owner" : "/beranda");
      } else {
        setError(result.message || "Login gagal");
        setLoggingIn(false);
      }
    } catch {
      setError("Gagal login");
      setLoggingIn(false);
    }
  };

  const activeUsers = users.filter((u) => u.role !== "owner").sort((a, b) => a.name.localeCompare(b.name));
  const ownerUser = users.find((u) => u.role === "owner");
  const selectedUser = users.find((u) => u.name === selected);
  const isOwnerSelected = selectedUser?.role === "owner";

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <img src={profilePhoto || logoUrl} alt="KASIR CUBE" className="w-full h-full object-cover" />
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-blue-700 text-center mb-0.5">{shopNameSetting || "KASIR CUBE"}</h2>
        <p className="text-center text-gray-500 text-sm mb-1">Sistem Kasir Pro</p>
        {firebaseUser && (
          <p className="text-center text-[10px] text-green-600 mb-4 font-semibold">
            🔒 {firebaseUser.email}
          </p>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-4 py-2.5 rounded-xl mb-4 text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <span className="text-sm text-gray-400">Memuat data...</span>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setDropdownOpen((v) => !v)}
              className="w-full h-16 rounded-3xl border-2 border-blue-500 bg-white px-5 flex items-center justify-between text-left mb-5 shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg font-extrabold text-gray-900 truncate">
                  {selected || "PILIH KASIR"}
                </span>
                {isOwnerSelected && <span className="text-lg">👑</span>}
              </div>
              <ChevronDown className="w-6 h-6 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="mb-5 rounded-3xl border-2 border-gray-200 bg-white shadow-lg overflow-hidden">
                {activeUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelected(u.name);
                      setDropdownOpen(false);
                      setSelectedShift("PAGI");
                    }}
                    className="w-full px-5 py-4 text-left text-base font-semibold text-gray-900 border-b last:border-b-0 border-border"
                  >
                    {u.name}
                  </button>
                ))}
                {ownerUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(ownerUser.name);
                      setDropdownOpen(false);
                      setSelectedShift("PAGI");
                    }}
                    className="w-full px-5 py-4 text-left text-base font-semibold text-gray-900"
                  >
                    {ownerUser.name} 👑
                  </button>
                )}
              </div>
            )}

            {selectedUser && selectedUser.role !== "owner" && (
              <>
                <p className="text-center text-gray-500 font-semibold mb-3">Pilih Shift</p>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {SHIFT_OPTIONS.map((shift) => {
                    const Icon = shift.icon;
                    const isActive = selectedShift === shift.value;
                    return (
                      <button
                        key={shift.value}
                        type="button"
                        onClick={() => setSelectedShift(shift.value)}
                        className={`h-28 rounded-3xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                          isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <Icon className="w-8 h-8 text-gray-500" />
                        <span className="text-2xl font-extrabold text-gray-700">{shift.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {pinEnabled && (
              <div className="flex items-center gap-3 border-2 border-gray-200 rounded-2xl px-4 h-14 bg-gray-50 mb-4 focus-within:border-blue-500">
                <Lock className="w-5 h-5 text-gray-500" />
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="PIN"
                  value={pin}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, "");
                    if (d.length <= 4) setPin(d);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && selected) {
                      e.preventDefault();
                      void doLogin(selected);
                    }
                  }}
                  className="flex-1 bg-transparent outline-none text-base font-bold text-gray-800 tracking-widest placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal"
                />
                <button type="button" onClick={() => setShowPin(!showPin)} className="text-gray-400 hover:text-gray-600 p-1">
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => selected && void doLogin(selected)}
              disabled={loggingIn || !selected || (selectedUser?.role !== "owner" && !selectedShift)}
              className="w-full h-14 rounded-3xl font-extrabold text-lg bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 mb-3"
            >
              {loggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              MASUK
            </button>

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="w-full flex items-center justify-center gap-2 text-blue-600 text-sm font-bold py-2.5 mb-2 hover:bg-blue-50 rounded-xl transition"
            >
              <HelpCircle className="w-4 h-4" /> Buka Buku Panduan
            </button>

            <button
              type="button"
              onClick={firebaseLogout}
              className="w-full flex items-center justify-center gap-2 text-red-500 text-sm font-semibold py-2"
            >
              <LogOut className="w-4 h-4" /> Logout Firebase
            </button>

            <GuideModal open={isGuideOpen} onOpenChange={setIsGuideOpen} />
          </>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const { firebaseUser, firebaseLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (firebaseLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2rem] w-full max-w-sm shadow-2xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <img src={logoUrl} alt="KASIR CUBE" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-xl font-extrabold text-blue-700">KASIR CUBE</h2>
          <p className="text-gray-500 text-sm">Sistem Kasir Pro</p>
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-400">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <FirebaseAuthScreen />;
  }

  return <KasirSelectionScreen />;
}
