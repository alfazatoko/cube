import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import {
  getUsers, createUser, updateUser, deleteUser,
  getSettings, updateSettings,
  getTransactions, updateTransaction, getSaldoHistory, getBalance, resetBalance,
  getAttendance, getIzinList, createIzin, updateIzin,
  resetAllData, getDailyNotes, ownerAddSaldo, getTenantCollection,
  type UserRecord, type SettingsRecord, type TransactionRecord, type AttendanceRecord, type IzinRecord, type SaldoHistoryRecord, type CategoryLabels,
} from "@/lib/firestore";
import { db, auth } from "@/lib/firebase";
import { getDocs, query, where, collection } from "firebase/firestore/lite";
import { formatRupiah, formatThousands, parseThousands, getWibDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Users, BarChart3, TrendingUp, FileText, DollarSign, Fingerprint,
  Database, Settings, ArrowLeft, Plus, Trash2, Edit, Eye, EyeOff,
  Shield, Check, X, CalendarDays, Download, RefreshCw,
  BookOpen, AlertTriangle, Star, Activity, Loader2, Lock,
  Share2, ImageIcon, PlusCircle, UserCog, Mail, KeyRound, SlidersHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import html2canvas from "html2canvas";
import { AddSaldoModal } from "@/components/modals/add-saldo-modal";

type OwnerPage = "main" | "kasir" | "grafik" | "performa" | "izin" | "gajih" | "absen" | "backup" | "setting" | "ringkasan" | "akun";

export default function Owner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState<OwnerPage>("main");
  const [isSaldoModalOpen, setIsSaldoModalOpen] = useState(false);

  const menuItems = [
    { id: "kasir" as const, icon: Users, label: "Kasir", desc: "Kelola data kasir", color: "from-blue-600 to-blue-500" },
    { id: "tambah_saldo" as const, icon: PlusCircle, label: "Tambah Saldo", desc: "Topup saldo kasir", color: "from-emerald-600 to-emerald-500" },
    { id: "ringkasan" as const, icon: FileText, label: "Ringkasan", desc: "Ringkasan harian", color: "from-indigo-600 to-indigo-500" },
    { id: "grafik" as const, icon: BarChart3, label: "Grafik", desc: "Grafik transaksi", color: "from-emerald-600 to-emerald-500" },
    { id: "performa" as const, icon: TrendingUp, label: "Performa", desc: "Performa kasir", color: "from-purple-600 to-purple-500" },
    { id: "absen" as const, icon: Fingerprint, label: "Absen", desc: "Kehadiran kasir", color: "from-teal-600 to-teal-500" },
    { id: "izin" as const, icon: CalendarDays, label: "Izin", desc: "Kelola izin", color: "from-amber-600 to-amber-500" },
    { id: "gajih" as const, icon: DollarSign, label: "Gajih", desc: "Data gaji kasir", color: "from-green-600 to-green-500" },
    { id: "akun" as const, icon: UserCog, label: "Akun", desc: "Profil & Password", color: "from-blue-800 to-blue-600" },
    { id: "backup" as const, icon: Database, label: "Backup", desc: "Backup & reset", color: "from-rose-600 to-rose-500" },
    { id: "setting" as const, icon: Settings, label: "Setting", desc: "Pengaturan app", color: "from-gray-600 to-gray-500" },
  ];



  if (page === "main") {
    return (
      <div className="px-3 pt-3 pb-20">
        <Header />
        <div className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-2xl p-4 mb-4 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6" />
            <div>
              <h2 className="font-extrabold text-lg">Panel Owner</h2>
              <p className="text-[11px] opacity-80">Kelola semua data toko</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => {
                if (item.id === "tambah_saldo") setIsSaldoModalOpen(true);
                else setPage(item.id as any);
              }} className="bg-card rounded-2xl p-3 shadow-sm border border-border flex flex-col items-center gap-2 active:scale-95 transition">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-gray-700">{item.label}</span>
                <span className="text-[9px] text-gray-400">{item.desc}</span>
              </button>
            );
          })}
        </div>

        <AddSaldoModal
          open={isSaldoModalOpen}
          onOpenChange={setIsSaldoModalOpen}
          kasirName=""
          isOwnerMode={true}
        />

      </div>
    );
  }

  const BackButton = () => (
    <button onClick={() => setPage("main")} className="flex items-center gap-1 text-blue-600 font-bold text-sm mb-3">
      <ArrowLeft className="w-4 h-4" /> Kembali
    </button>
  );

  switch (page) {
    case "kasir": return <KasirPage goBack={() => setPage("main")} />;
    case "grafik": return <GrafikPage goBack={() => setPage("main")} />;
    case "performa": return <PerformaPage goBack={() => setPage("main")} />;
    case "absen": return <AbsenPage goBack={() => setPage("main")} />;
    case "izin": return <IzinPage goBack={() => setPage("main")} />;
    case "gajih": return <GajihPage goBack={() => setPage("main")} />;
    case "akun": return <AkunPage goBack={() => setPage("main")} />;
    case "backup": return <BackupPage goBack={() => setPage("main")} />;
    case "setting": return <SettingPage goBack={() => setPage("main")} />;
    case "ringkasan": return <RingkasanPage goBack={() => setPage("main")} />;
    default: return null;
  }
}

function PageWrapper({ title, icon: Icon, goBack, children }: { title: string; icon: any; goBack: () => void; children: React.ReactNode }) {
  return (
    <div className="px-3 pt-3 pb-20">
      <Header />
      <button onClick={goBack} className="flex items-center gap-1 text-blue-600 font-bold text-sm mb-3">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-2xl p-4 mb-4 text-white flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <h2 className="font-extrabold text-base">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function KasirPage({ goBack }: { goBack: () => void }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("kasir");
  const [saving, setSaving] = useState(false);
  const [showPins, setShowPins] = useState<Record<string, boolean>>({});
  const [showPinInput, setShowPinInput] = useState(false);

  const loadUsers = useCallback(async () => {
    const u = await getUsers();
    setUsers(u);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const kasirList = users.filter(u => u.role !== "owner");

  const resetForm = () => {
    setName("");
    setPin("");
    setRole("kasir");
    setEditUser(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Nama harus diisi", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editUser) {
        await updateUser(editUser.id, { name, pin: pin || editUser.pin, role });
      } else {
        await createUser({ name, pin: pin || "0000", role, isActive: true });
      }
      toast({ title: editUser ? "Kasir diperbarui" : "Kasir ditambahkan" });
      resetForm();
      await loadUsers();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus kasir ini?")) return;
    try {
      await deleteUser(id);
      toast({ title: "Kasir dihapus" });
      await loadUsers();
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const toggleActive = async (u: UserRecord) => {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      await loadUsers();
    } catch { }
  };



  return (
    <PageWrapper title="Manajemen Kasir" icon={Users} goBack={goBack}>
      <div className="mb-4">
        <button onClick={() => setShowForm(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow active:scale-95 transition">
          <Plus className="w-4 h-4" /> Tambah Kasir
        </button>
      </div>

      {kasirList.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Belum ada kasir</p>
        </div>
      ) : (
        kasirList.map(u => (
          <div key={u.id} className={`bg-card rounded-2xl p-4 mb-2.5 shadow-sm border ${u.isActive ? 'border-border' : 'border-red-200 bg-red-50/50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <span className="font-bold text-sm">{u.name}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {u.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                    PIN: {showPins[u.id] ? u.pin : "••••"}
                    <button onClick={() => setShowPins(prev => ({ ...prev, [u.id]: !prev[u.id] }))} className="text-gray-400 ml-1">
                      {showPins[u.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => toggleActive(u)} className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold ${u.isActive ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button onClick={() => { setEditUser(u); setName(u.name); setPin(u.pin); setRole(u.role); setShowForm(true); }} className="bg-blue-100 text-blue-600 px-2 py-1.5 rounded-lg">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(u.id)} className="bg-red-100 text-red-600 px-2 py-1.5 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h3 className="font-bold text-lg">{editUser ? "Edit" : "Tambah"} Kasir</h3>
              <button onClick={resetForm} className="text-2xl text-gray-400">&times;</button>
            </div>
            <div className="space-y-4 mb-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Kasir</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Budi" className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">PIN Keamanan (4 Digit)</label>
                <div className="relative">
                  <input
                    type={showPinInput ? "text" : "password"}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    inputMode="numeric"
                    placeholder="0000"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 transition"
                  />
                  <button type="button" onClick={() => setShowPinInput(!showPinInput)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white font-black py-3.5 rounded-2xl text-sm disabled:opacity-60 shadow-lg shadow-blue-500/30">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "SIMPAN DATA KASIR"}
            </button>
          </div>
        </div>
      )}

    </PageWrapper>
  );
}

function GrafikPage({ goBack }: { goBack: () => void }) {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filterKasir, setFilterKasir] = useState("Semua");
  const today = getWibDate();
  const now = new Date();
  const [viewMode, setViewMode] = useState<"range" | "bulan">("range");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(today);
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  useEffect(() => {
    let sDate: string, eDate: string;
    if (viewMode === "bulan") {
      const [y, m] = month.split("-").map(Number);
      sDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      eDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    } else {
      sDate = startDate;
      eDate = endDate;
    }
    Promise.all([
      getTransactions({ startDate: sDate, endDate: eDate }),
      getUsers(),
    ]).then(([t, u]) => {
      setTransactions(t);
      setUsers(u);
    }).catch(() => { });
  }, [startDate, endDate, month, viewMode]);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
  const filteredTx = filterKasir === "Semua" ? transactions : transactions.filter(t => t.kasirName === filterKasir);

  const dailyData = useMemo(() => {
    const map = new Map<string, { bank: number; flip: number; app: number; dana: number; tarik: number; aks: number; admin: number }>();
    filteredTx.forEach(tx => {
      const d = tx.transDate;
      if (!map.has(d)) map.set(d, { bank: 0, flip: 0, app: 0, dana: 0, tarik: 0, aks: 0, admin: 0 });
      const entry = map.get(d)!;
      
      // Use categoryType for grouping in chart
      if (tx.categoryType === "bank") {
        // We can still try to separate if categoryId is known
        if (tx.categoryId === "flip") entry.flip += tx.nominal || 0;
        else if (tx.categoryId === "app") entry.app += tx.nominal || 0;
        else if (tx.categoryId === "dana") entry.dana += tx.nominal || 0;
        else entry.bank += tx.nominal || 0;
      }
      else if (tx.categoryType === "tarik") entry.tarik += tx.nominal || 0;
      else if (tx.categoryType === "aks") entry.aks += tx.nominal || 0;
      
      entry.admin += tx.admin || 0;
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({ date: date.slice(5), ...data }));
  }, [filteredTx]);

  const maxVal = Math.max(1, ...dailyData.map(d => Math.max(d.bank, d.flip, d.app, d.dana, d.tarik, d.aks)));
  const categories = [
    { key: "bank" as const, label: "Bank", color: "bg-blue-500" },
    { key: "flip" as const, label: "Flip", color: "bg-orange-500" },
    { key: "app" as const, label: "App", color: "bg-purple-500" },
    { key: "dana" as const, label: "Dana", color: "bg-sky-500" },
    { key: "tarik" as const, label: "Tarik", color: "bg-emerald-500" },
    { key: "aks" as const, label: "Aks", color: "bg-rose-500" },
  ];

  return (
    <PageWrapper title="Grafik Transaksi" icon={BarChart3} goBack={goBack}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setViewMode("range")}
          className={`py-2 rounded-full text-xs font-bold transition ${viewMode === "range" ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}
        >
          Per Tanggal
        </button>
        <button
          onClick={() => setViewMode("bulan")}
          className={`py-2 rounded-full text-xs font-bold transition ${viewMode === "bulan" ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}
        >
          Per Bulan
        </button>
      </div>

      {viewMode === "range" ? (
        <div className="flex gap-1.5 items-center mb-3">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 rounded-xl border border-border px-2.5 py-2 text-xs bg-card outline-none" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 rounded-xl border border-border px-2.5 py-2 text-xs bg-card outline-none" />
        </div>
      ) : (
        <div className="mb-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-xl border border-border px-3 py-2 text-xs bg-card outline-none" />
        </div>
      )}

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterKasir("Semua")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${filterKasir === "Semua" ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}
        >
          Semua
        </button>
        {kasirList.map(k => (
          <button
            key={k.name}
            onClick={() => setFilterKasir(k.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${filterKasir === k.name ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}
          >
            {k.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(c => (
          <div key={c.key} className="flex items-center gap-1 text-[10px] text-gray-600">
            <div className={`w-2.5 h-2.5 rounded-full ${c.color}`} />
            {c.label}
          </div>
        ))}
      </div>

      {dailyData.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data</div>
      ) : (
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border overflow-x-auto">
          <div className="min-w-[300px]">
            {dailyData.map((d, i) => (
              <div key={i} className="mb-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-1">{d.date}</div>
                {categories.map(c => {
                  const val = d[c.key];
                  const width = Math.max(2, (val / maxVal) * 100);
                  return (
                    <div key={c.key} className="flex items-center gap-1 mb-0.5">
                      <div className={`${c.color} h-3 rounded-full transition-all`} style={{ width: `${width}%` }} />
                      <span className="text-[9px] text-muted-foreground whitespace-nowrap">{formatRupiah(val)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function PerformaPage({ goBack }: { goBack: () => void }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  useEffect(() => {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    Promise.all([
      getUsers(),
      getTransactions({ startDate, endDate }),
    ]).then(([u, t]) => {
      setUsers(u);
      setTransactions(t);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [month]);

  const [y, m] = month.split("-").map(Number);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
  const performaData = kasirList.map(k => {
    const kasirTx = transactions.filter(t => t.kasirName === k.name);
    const daysSet = new Set(kasirTx.map(t => t.transDate));
    const daysActive = daysSet.size || 1;
    const totalNominal = kasirTx.reduce((s, t) => s + (t.nominal || 0), 0);
    const totalAdmin = kasirTx.reduce((s, t) => s + (t.admin || 0), 0);
    return {
      name: k.name,
      count: kasirTx.length,
      totalNominal,
      totalAdmin,
      rataPerHari: Math.round(totalNominal / daysActive),
    };
  }).sort((a, b) => b.totalNominal - a.totalNominal);

  const monthLabel = format(new Date(y, m - 1), "MMMM yyyy", { locale: idLocale });
  const cardColors = ["from-pink-500 to-rose-400", "from-blue-500 to-blue-400", "from-purple-500 to-purple-400", "from-teal-500 to-teal-400", "from-amber-500 to-amber-400"];

  return (
    <div className="px-3 pt-3 pb-20 min-h-screen bg-muted">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={goBack} className="text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <TrendingUp className="w-5 h-5 text-red-500" />
        <h1 className="font-extrabold text-base">Performa Karyawan</h1>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-4 mb-4 text-white">
        <h2 className="font-bold text-base">Bulan {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
        <p className="text-xs opacity-80">Rekap performa kasir bulan ini</p>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="flex-1 rounded-xl border border-border px-3 py-2 text-xs bg-card outline-none" />
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
      ) : performaData.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data</div>
      ) : (
        performaData.map((k, i) => (
          <div key={k.name} className="bg-card rounded-2xl p-4 mb-3 shadow-sm border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${cardColors[i % cardColors.length]} flex items-center justify-center text-white font-bold text-lg shadow`}>
                {k.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-extrabold text-sm uppercase">{k.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-blue-500">Jumlah Transaksi</p>
                <p className="text-lg font-extrabold text-blue-700">{k.count}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-green-500">Total Penjualan</p>
                <p className="text-lg font-extrabold text-green-700">{formatRupiah(k.totalNominal)}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-amber-500">Total Admin</p>
                <p className="text-lg font-extrabold text-amber-700">{formatRupiah(k.totalAdmin)}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-yellow-600">Rata-rata / Hari</p>
                <p className="text-lg font-extrabold text-yellow-700">{formatRupiah(k.rataPerHari)}</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function AbsenPage({ goBack }: { goBack: () => void }) {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"ringkasan" | "lengkap">("ringkasan");
  const [selectedKasir, setSelectedKasir] = useState("Semua");
  const now = new Date();
  const [monthDate, setMonthDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAttendance({ month: monthStr }),
      getUsers(),
    ]).then(([a, u]) => {
      setAttendance(a);
      setUsers(u);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [monthStr]);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: idLocale });

  const prevMonth = () => setMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const summaryData = kasirList.map(k => {
    const kasirAbsen = attendance.filter(a => a.kasirName === k.name);
    const hadir = kasirAbsen.length;
    const pagi = kasirAbsen.filter(a => a.shift === "PAGI").length;
    const siang = kasirAbsen.filter(a => a.shift === "SIANG").length;
    return { name: k.name, hadir, pagi, siang };
  }).filter(k => selectedKasir === "Semua" || k.name === selectedKasir);

  const groupedAttendance = attendance
    .filter(a => selectedKasir === "Semua" || a.kasirName === selectedKasir)
    .reduce((acc, curr) => {
      const date = curr.tanggal;
      if (!acc[date]) acc[date] = [];
      acc[date].push(curr);
      return acc;
    }, {} as Record<string, AttendanceRecord[]>);

  const sortedDates = Object.keys(groupedAttendance).sort((a, b) => b.localeCompare(a));

  const cardColors = ["from-blue-500 to-blue-400", "from-pink-500 to-rose-400", "from-purple-500 to-purple-400", "from-teal-500 to-teal-400", "from-amber-500 to-amber-400"];
  const softColors = [
    { bg: "bg-blue-50", border: "border-blue-100", text: "text-blue-700", icon: "text-blue-400" },
    { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-700", icon: "text-rose-400" },
    { bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700", icon: "text-amber-400" },
    { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-700", icon: "text-emerald-400" },
    { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-700", icon: "text-indigo-400" },
  ];

  return (
    <div className="px-3 pt-3 pb-20 min-h-screen bg-muted">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={goBack} className="text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <Users className="w-5 h-5 text-blue-500" />
        <h1 className="font-extrabold text-base">Data Absensi</h1>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl p-4 mb-4 text-white">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          <div>
            <h2 className="font-bold text-sm">Data Absensi</h2>
            <p className="text-[11px] opacity-80">Rekap kehadiran karyawan bulan ini</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 bg-card rounded-xl p-2 shadow-sm border border-border">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="font-bold text-sm capitalize">{monthLabel}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 rotate-180" />
        </button>
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {["Semua", ...kasirList.map(k => k.name)].map(name => (
          <button
            key={name}
            onClick={() => setSelectedKasir(name)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all border ${selectedKasir === name
                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30"
                : "bg-white text-muted-foreground border-border hover:bg-gray-50"
              }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setViewMode("ringkasan")} className={`py-2.5 rounded-full text-xs font-bold transition ${viewMode === "ringkasan" ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}>
          Ringkasan
        </button>
        <button onClick={() => setViewMode("lengkap")} className={`py-2.5 rounded-full text-xs font-bold transition ${viewMode === "lengkap" ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}>
          Lengkap
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
      ) : viewMode === "ringkasan" ? (
        summaryData.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data absensi</div>
        ) : (
          summaryData.map((k, i) => (
            <div key={k.name} className="bg-card rounded-2xl p-4 mb-3 shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${cardColors[i % cardColors.length]} flex items-center justify-center text-white font-bold text-lg shadow`}>
                  {k.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-extrabold text-sm uppercase">{k.name}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">{k.hadir} Hadir</span>
                {k.pagi > 0 && <span className="text-[11px] font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">{k.pagi} Pagi</span>}
                {k.siang > 0 && <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">{k.siang} Siang</span>}
              </div>
            </div>
          ))
        )
      ) : (
        sortedDates.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data absensi</div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date, idx) => {
              const items = groupedAttendance[date];
              const color = softColors[idx % softColors.length];
              const dateObj = new Date(date);
              const dayLabel = format(dateObj, "EEEE, dd MMMM", { locale: idLocale });

              return (
                <div key={date} className={`rounded-2xl border-2 ${color.border} ${color.bg} overflow-hidden shadow-sm`}>
                  <div className={`px-4 py-2 border-b-2 ${color.border} flex justify-between items-center`}>
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider ${color.text}`}>{dayLabel}</span>
                    <span className={`text-[10px] font-bold bg-white/60 px-2 py-0.5 rounded-full ${color.text}`}>{items.length} Absen</span>
                  </div>
                  <div className="divide-y divide-white/40">
                    {items.sort((a, b) => a.jamMasuk.localeCompare(b.jamMasuk)).map(a => (
                      <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm font-bold text-xs ${color.text}`}>
                            {a.kasirName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-extrabold text-gray-800 uppercase">{a.kasirName}</p>
                            <p className={`text-[10px] font-bold ${a.shift === 'PAGI' ? 'text-amber-600' : 'text-indigo-600'}`}>{a.shift}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-black ${color.text}`}>{a.jamMasuk}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Jam Masuk</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function IzinPage({ goBack }: { goBack: () => void }) {
  const { toast } = useToast();
  const [izinList, setIzinList] = useState<IzinRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [nama, setNama] = useState("");
  const [tanggal, setTanggal] = useState(getWibDate());
  const [alasan, setAlasan] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterKasir, setFilterKasir] = useState("Semua");
  const now = new Date();
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);

  const loadData = useCallback(async () => {
    const [iz, u] = await Promise.all([getIzinList({ month }), getUsers()]);
    setIzinList(iz);
    setUsers(u);
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
  const filteredIzin = filterKasir === "Semua" ? izinList : izinList.filter(iz => iz.nama === filterKasir);

  const handleSubmit = async () => {
    if (!nama || !alasan) { toast({ title: "Isi semua field", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await createIzin({ nama, tanggal, alasan, status: "pending" });
      toast({ title: "Izin diajukan" });
      setShowForm(false);
      setNama("");
      setAlasan("");
      await loadData();
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleApprove = async (iz: IzinRecord, status: string) => {
    try {
      await updateIzin(iz.id, { status });
      toast({ title: status === "approved" ? "Disetujui" : "Ditolak" });
      await loadData();
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  return (
    <PageWrapper title="Manajemen Izin" icon={CalendarDays} goBack={goBack}>
      <div className="flex gap-2 mb-3">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="flex-1 rounded-xl border border-border px-3 py-2 text-xs bg-card outline-none" />
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1 shadow">
          <Plus className="w-3.5 h-3.5" /> Ajukan
        </button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterKasir("Semua")}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${filterKasir === "Semua" ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}
        >
          Semua
        </button>
        {kasirList.map(k => (
          <button
            key={k.name}
            onClick={() => setFilterKasir(k.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${filterKasir === k.name ? "bg-blue-600 text-white shadow" : "bg-card text-muted-foreground border border-border"}`}
          >
            {k.name}
          </button>
        ))}
      </div>

      {filteredIzin.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Tidak ada data izin</div>
      ) : (
        filteredIzin.map(iz => (
          <div key={iz.id} className="bg-card rounded-2xl p-4 mb-2.5 shadow-sm border border-border">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-bold text-sm">{iz.nama}</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">{iz.alasan}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{iz.tanggal}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${iz.status === "approved" ? "bg-green-100 text-green-600" : iz.status === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                {iz.status === "approved" ? "Disetujui" : iz.status === "rejected" ? "Ditolak" : "Pending"}
              </span>
            </div>
            {iz.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleApprove(iz, "approved")} className="flex-1 bg-green-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Setujui
                </button>
                <button onClick={() => handleApprove(iz, "rejected")} className="flex-1 bg-red-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <X className="w-3.5 h-3.5" /> Tolak
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-base">Ajukan Izin</h3>
              <button onClick={() => setShowForm(false)} className="text-xl text-gray-400">&times;</button>
            </div>
            <div className="space-y-3 mb-4">
              <select value={nama} onChange={e => setNama(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none bg-card">
                <option value="">Pilih Kasir</option>
                {kasirList.map(k => <option key={k.name} value={k.name}>{k.name}</option>)}
              </select>
              <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none" />
              <textarea value={alasan} onChange={e => setAlasan(e.target.value)} placeholder="Alasan izin" rows={3} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none" />
            </div>
            <button onClick={handleSubmit} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-full text-sm disabled:opacity-60">
              {saving ? "Menyimpan..." : "Ajukan Izin"}
            </button>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function GajihPage({ goBack }: { goBack: () => void }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [izinList, setIzinList] = useState<IzinRecord[]>([]);
  const now = new Date();
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [selectedKasir, setSelectedKasir] = useState("");
  const [mode, setMode] = useState<"harian" | "bulanan">("harian");
  const [gajiPerHariDisplay, setGajiPerHariDisplay] = useState(() => formatThousands(localStorage.getItem("alfaza_gaji_per_hari") || "50000"));
  const [gajiBulananDisplay, setGajiBulananDisplay] = useState(() => formatThousands(localStorage.getItem("alfaza_gaji_bulanan") || "0"));
  const [bonusDisplay, setBonusDisplay] = useState("0");
  const [editHariKerja, setEditHariKerja] = useState(false);
  const [hariKerjaManual, setHariKerjaManual] = useState("");
  const [catatan, setCatatan] = useState("");
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      getUsers(),
      getAttendance({ month }),
      getIzinList({ month }),
    ]).then(([u, a, iz]) => {
      setUsers(u);
      setAttendance(a);
      setIzinList(iz);
      if (!selectedKasir && u.filter(x => x.role !== "owner" && x.isActive).length > 0) {
        setSelectedKasir(u.filter(x => x.role !== "owner" && x.isActive)[0].name);
      }
    }).catch(() => { });
  }, [month]);

  useEffect(() => {
    localStorage.setItem("alfaza_gaji_per_hari", parseThousands(gajiPerHariDisplay));
  }, [gajiPerHariDisplay]);

  useEffect(() => {
    localStorage.setItem("alfaza_gaji_bulanan", parseThousands(gajiBulananDisplay));
  }, [gajiBulananDisplay]);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
  const absenCount = attendance.filter(a => a.kasirName === selectedKasir).length;
  const izinCount = izinList.filter(iz => iz.nama === selectedKasir && iz.status === "approved").length;

  const hariKerja = editHariKerja ? (parseInt(hariKerjaManual) || 0) : absenCount;
  const gajiPerHari = parseInt(parseThousands(gajiPerHariDisplay)) || 0;
  const gajiBulanan = parseInt(parseThousands(gajiBulananDisplay)) || 0;
  const bonus = parseInt(parseThousands(bonusDisplay)) || 0;

  const gajiPokok = mode === "harian" ? hariKerja * gajiPerHari : gajiBulanan;
  const totalGaji = gajiPokok + bonus;

  const [y, m2] = month.split("-").map(Number);
  const monthLabel = format(new Date(y, m2 - 1), "MMMM yyyy", { locale: idLocale });

  useEffect(() => {
    setHariKerjaManual(String(absenCount));
    setEditHariKerja(false);
  }, [selectedKasir, month, absenCount]);

  const handleShareText = async () => {
    const lines = [
      `Slip Gaji - ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`,
      `Nama: ${selectedKasir}`,
      `Hari Kerja: ${hariKerja} hari`,
      `Izin: ${izinCount} hari`,
      `Gaji Pokok: ${formatRupiah(gajiPokok)}`,
      `Bonus: ${formatRupiah(bonus)}`,
      `Total Gaji: ${formatRupiah(totalGaji)}`,
    ];
    if (catatan) lines.push(`Catatan: ${catatan}`);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Teks disalin ke clipboard" });
      }
    } catch { }
  };

  const handleShareImage = async () => {
    if (!slipRef.current) return;
    try {
      const canvas = await html2canvas(slipRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `slip-gaji-${selectedKasir}-${month}.png`, { type: "image/png" });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
        } else {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = file.name;
          link.click();
          URL.revokeObjectURL(url);
          toast({ title: "Gambar diunduh" });
        }
      }, "image/png");
    } catch {
      toast({ title: "Gagal membuat gambar", variant: "destructive" });
    }
  };

  return (
    <div className="px-3 pt-3 pb-20 min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={goBack} className="text-gray-600 flex items-center gap-1 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        <span className="ml-2 text-base font-extrabold flex items-center gap-1.5">
          <DollarSign className="w-5 h-5 text-green-600" /> Hitung Gaji Karyawan
        </span>
      </div>

      <div className="bg-card rounded-2xl p-5 shadow-sm border border-border mb-4">
        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Pilih Karyawan:</label>
          <select
            value={selectedKasir}
            onChange={e => setSelectedKasir(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-3 text-sm font-bold outline-none bg-card"
          >
            {kasirList.map(k => <option key={k.name} value={k.name}>{k.name.toUpperCase()}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Periode Bulan:</label>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-3 text-sm font-bold outline-none bg-card"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-muted-foreground block mb-2">Mode Penghitungan:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("harian")}
              className={`py-2.5 rounded-full text-xs font-bold transition border-2 ${mode === "harian" ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-card text-muted-foreground border-border"}`}
            >
              {mode === "harian" && <Check className="w-3.5 h-3.5 inline mr-1" />}Gajih / Hari
            </button>
            <button
              onClick={() => setMode("bulanan")}
              className={`py-2.5 rounded-full text-xs font-bold transition border-2 ${mode === "bulanan" ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-card text-muted-foreground border-border"}`}
            >
              {mode === "bulanan" && <Check className="w-3.5 h-3.5 inline mr-1" />}Gajih Full 1 Bulan
            </button>
          </div>
        </div>

        {mode === "harian" ? (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Gaji / Hari:</label>
              <input
                type="text"
                inputMode="numeric"
                value={gajiPerHariDisplay}
                onChange={e => setGajiPerHariDisplay(formatThousands(e.target.value))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Bonus:</label>
              <input
                type="text"
                inputMode="numeric"
                value={bonusDisplay}
                onChange={e => setBonusDisplay(formatThousands(e.target.value))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Gaji Full Bulan:</label>
              <input
                type="text"
                inputMode="numeric"
                value={gajiBulananDisplay}
                onChange={e => setGajiBulananDisplay(formatThousands(e.target.value))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Bonus:</label>
              <input
                type="text"
                inputMode="numeric"
                value={bonusDisplay}
                onChange={e => setBonusDisplay(formatThousands(e.target.value))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm font-bold outline-none"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
              Hari Kerja:
              <input
                type="checkbox"
                checked={editHariKerja}
                onChange={e => { setEditHariKerja(e.target.checked); if (e.target.checked) setHariKerjaManual(String(absenCount)); }}
                className="w-3.5 h-3.5"
              />
              <span className="text-blue-600 text-[10px]">Edit</span>
            </label>
            {editHariKerja ? (
              <input
                type="number"
                value={hariKerjaManual}
                onChange={e => setHariKerjaManual(e.target.value)}
                className="w-full border border-blue-300 rounded-xl px-3 py-2.5 text-sm font-bold outline-none bg-blue-50"
              />
            ) : (
              <div className="w-full bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-700">
                {absenCount} hari
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Izin (Hari):</label>
            <div className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm font-bold text-gray-700">
              {izinCount}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 italic mb-4">
          *Hari kerja dari absen: <span className="font-semibold">{absenCount} hari</span>. Centang Edit untuk ubah manual.
        </p>

        <div className="mb-0">
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
            ✏️ CATATAN:
          </label>
          <textarea
            value={catatan}
            onChange={e => setCatatan(e.target.value)}
            placeholder="Tambahkan catatan untuk karyawan..."
            rows={3}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
          />
        </div>
      </div>

      <div ref={slipRef} className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-2xl p-5 text-white shadow-lg mb-4">
        <h2 className="text-center font-extrabold text-lg mb-0.5">Slip Gaji</h2>
        <p className="text-center text-blue-200 text-sm mb-4">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</p>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-blue-100">Nama:</span>
            <span className="font-bold">{selectedKasir.toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-100">Hari Kerja:</span>
            <span className="font-bold">{hariKerja} hari</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-100">Izin:</span>
            <span className="font-bold">{izinCount} hari</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-100">Gaji Pokok:</span>
            <span className="font-bold">{formatRupiah(gajiPokok)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-100">Bonus:</span>
            <span className="font-bold">{formatRupiah(bonus)}</span>
          </div>
          {catatan && (
            <div className="flex justify-between text-sm">
              <span className="text-blue-100">Catatan:</span>
              <span className="font-bold text-right max-w-[60%]">{catatan}</span>
            </div>
          )}
          <div className="border-t border-blue-400 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-100">Total Gaji</span>
              <span className="font-extrabold text-xl">{formatRupiah(totalGaji)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleShareText}
          className="bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 transition"
        >
          🍰 Bagikan Teks
        </button>
        <button
          onClick={handleShareImage}
          className="bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow active:scale-95 transition"
        >
          📸 Bagikan Gambar
        </button>
      </div>
    </div>
  );
}

function BackupPage({ goBack }: { goBack: () => void }) {
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);

  useEffect(() => { getUsers().then(setUsers).catch(() => { }); }, []);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);

  const handleResetKasir = async (name: string) => {
    if (!confirm(`Reset saldo ${name}?`)) return;
    try {
      await resetBalance(name);
      toast({ title: `Saldo ${name} direset` });
    } catch {
      toast({ title: "Gagal reset", variant: "destructive" });
    }
  };

  const handleResetAll = async () => {
    if (!confirm("RESET SEMUA DATA? Tindakan ini tidak bisa dibatalkan!")) return;
    if (!confirm("Yakin? Semua transaksi, saldo, kasbon, kontak, absen, izin akan dihapus.")) return;
    setResetting(true);
    try {
      await resetAllData();
      toast({ title: "Semua data berhasil direset" });
    } catch {
      toast({ title: "Gagal reset", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleDownloadExcel = async () => {
    setExporting(true);
    try {
      const { utils, writeFile } = await import("xlsx");

      const uid = auth.currentUser?.uid || "";
      const cols = ["transactions", "saldo_history", "hutang", "kontak",
        "attendance", "izin", "daily_notes", "balances", "kasirs"];
      const wb = utils.book_new();

      for (const colName of cols) {
        const q = query(collection(db, colName), where("uid", "==", uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (data.length > 0) {
          const ws = utils.json_to_sheet(data);
          utils.book_append_sheet(wb, ws, colName.toUpperCase());
        }
      }

      writeFile(wb, `BACKUP-KASIRCUBE-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast({ title: "Backup Excel berhasil diunduh" });
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal membuat Excel", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const [settings, allUsers] = await Promise.all([getSettings(), getUsers()]);
      const payload = {
        exportedAt: new Date().toISOString(),
        appName: "KASIR CUBE",
        settings,
        users: allUsers,
      };
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-kasircube-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup JSON berhasil diunduh" });
    } catch {
      toast({ title: "Gagal download backup", variant: "destructive" });
    }
  };

  return (
    <PageWrapper title="Backup & Reset" icon={Database} goBack={goBack}>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="font-bold text-sm text-amber-700">Peringatan</h3>
        </div>
        <p className="text-[11px] text-amber-600">Data tersimpan di Firebase Cloud. Reset hanya menghapus data transaksi, bukan data kasir.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-6">
        <button
          onClick={handleDownloadExcel}
          disabled={exporting}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 active:scale-95 transition disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          DOWNLOAD BACKUP (EXCEL)
        </button>

        <button
          onClick={handleDownloadBackup}
          className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-95 transition"
        >
          <Download className="w-4 h-4" /> Download Backup (JSON)
        </button>
      </div>

      <h3 className="font-bold text-sm text-gray-700 mb-3">Reset Saldo Per Kasir</h3>
      {kasirList.map(k => (
        <div key={k.name} className="bg-card rounded-2xl p-4 mb-2 shadow-sm border border-border flex justify-between items-center">
          <span className="font-bold text-sm">{k.name}</span>
          <button onClick={() => handleResetKasir(k.name)} className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5" /> Reset Saldo
          </button>
        </div>
      ))}

      <div className="mt-6 bg-red-50 rounded-2xl p-4 border border-red-200">
        <h3 className="font-bold text-sm text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Zona Bahaya
        </h3>
        <p className="text-[11px] text-red-500 mb-3">Reset semua data transaksi, saldo, kasbon, kontak, absen, dan izin. Tindakan ini tidak bisa dibatalkan.</p>
        <button onClick={handleResetAll} disabled={resetting} className="w-full bg-red-600 text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 active:scale-95 transition disabled:opacity-50">
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          RESET SELURUH DATA
        </button>
      </div>
    </PageWrapper>
  );
}

function SettingPage({ goBack }: { goBack: () => void }) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [shopName, setShopName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [quotes, setQuotes] = useState("");
  const [runningText, setRunningText] = useState("");
  const [autoResetHour, setAutoResetHour] = useState(2);
  const [autoResetMinute, setAutoResetMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const defaultLabels: CategoryLabels = {
    BANK: { name: "BANK", visible: true },
    FLIP: { name: "FLIP", visible: true },
    APP: { name: "APP", visible: true },
    DANA: { name: "DANA", visible: true },
    AKS: { name: "AKS", visible: true },
    TARIK: { name: "TARIK", visible: true },
  };
  const [catLabels, setCatLabels] = useState<CategoryLabels>(defaultLabels);
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string; type: string; color: string }[]>([]);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setShopName(s.shopName || "KASIR CUBE");
      setProfilePhotoUrl(s.profilePhotoUrl || "");
      setPinEnabled(s.pinEnabled || false);
      setQuotes(s.mutiaraQuotes || "");
      setRunningText(s.runningText || "GRATIS BULAN INI CATAT PEMBUKUAN DI KASIR CUBE");
      setAutoResetHour(s.autoResetHour ?? 2);
      setAutoResetMinute(s.autoResetMinute ?? 0);
      if (s.categoryLabels) {
        setCatLabels(s.categoryLabels);
      }
      if (s.customCategories) {
        setCustomCategories(s.customCategories);
      } else {
        const defaults = [
          { id: "sea_bank", name: "Sea Bank", type: "bank", color: "text-foreground", visible: true },
          { id: "bri", name: "Bank BRI", type: "bank", color: "text-foreground", visible: true },
          { id: "bni", name: "BANK BNI", type: "bank", color: "text-foreground", visible: true },
          { id: "bca", name: "BANK BCA", type: "bank", color: "text-foreground", visible: true },
          { id: "app", name: "Aplikasi Pulsa", type: "bank", color: "text-foreground", visible: true },
          { id: "gopay", name: "APLIKASI GOPAY", type: "bank", color: "text-foreground", visible: true },
          { id: "ppob", name: "APLIKASI PPOB", type: "bank", color: "text-foreground", visible: true },
          { id: "dana", name: "Dana", type: "bank", color: "text-foreground", visible: true },
          { id: "tarik", name: "Tarik Tunai", type: "tarik", color: "text-red-600", visible: true },
          { id: "aks", name: "Aksesoris", type: "aks", color: "text-orange-500", visible: true },
        ];
        setCustomCategories(defaults);
      }
    }).catch(() => { });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 0. Get old settings for migration reference
      const oldSettings = await getSettings();
      const oldCategories = oldSettings.customCategories || [];

      // 1. Update Settings
      await updateSettings({
        shopName,
        profilePhotoUrl,
        pinEnabled,
        mutiaraQuotes: quotes,
        runningText,
        autoResetHour,
        autoResetMinute,
        categoryLabels: catLabels,
        customCategories,
      });

      // 2. Migration: Link legacy transactions (without categoryId) to IDs
      const allTx = await getTransactions({});
      let updateCount = 0;

      // Map names to their corresponding IDs and CURRENT names
      const nameToIdMap: Record<string, string> = {};
      const idToNewNameMap: Record<string, string> = {};

      oldCategories.forEach(c => { nameToIdMap[c.name] = c.id; });
      customCategories.forEach(c => {
        nameToIdMap[c.name] = c.id;
        idToNewNameMap[c.id] = c.name;
      });

      for (const tx of allTx) {
        const targetId = tx.categoryId || nameToIdMap[tx.category];
        const newName = targetId ? idToNewNameMap[targetId] : null;

        // If we found a matching ID but it wasn't set, or the name is outdated
        if (targetId && (tx.categoryId !== targetId || (newName && tx.category !== newName))) {
          await updateTransaction(tx.id, {
            categoryId: targetId,
            category: newName || tx.category // Sync the name string too
          });
          updateCount++;
        }
      }

      toast({
        title: "Pengaturan disimpan",
        description: updateCount > 0 ? `${updateCount} transaksi telah disinkronkan dengan kategori baru.` : "Kategori sudah sinkron.",
      });
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 200;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      const scale = Math.min(maxSize / w, maxSize / h, 1);
      canvas.width = w * scale;
      canvas.height = h * scale;
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL("image/jpeg", 0.6);
      setProfilePhotoUrl(compressed);
    };
    img.src = URL.createObjectURL(file);
  };

  const handleResetAll = async () => {
    if (!confirm("RESET SEMUA DATA? Tindakan ini tidak bisa dibatalkan!")) return;
    if (!confirm("Yakin? Semua transaksi, saldo, kasbon, kontak, absen, izin akan dihapus.")) return;
    setResetting(true);
    try {
      await resetAllData();
      toast({ title: "Semua data berhasil direset" });
    } catch {
      toast({ title: "Gagal reset", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const updateCatLabel = (key: keyof CategoryLabels, field: "name" | "visible", value: string | boolean) => {
    setCatLabels(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const catKeys: (keyof CategoryLabels)[] = ["BANK", "FLIP", "APP", "DANA", "AKS", "TARIK"];

  return (
    <div className="px-3 pt-3 pb-20 min-h-screen bg-muted">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={goBack} className="text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <Settings className="w-5 h-5 text-gray-600" />
        <h1 className="font-extrabold text-base">Pengaturan</h1>
      </div>

      <div className="space-y-4">
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> Profil Toko
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center overflow-hidden shadow">
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow">
                <Edit className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Nama Toko</label>
              <input value={shopName} onChange={e => setShopName(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none font-bold" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-green-500" /> Jam Reset Otomatis Saldo
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-1">Jam</label>
              <select value={autoResetHour} onChange={e => setAutoResetHour(parseInt(e.target.value))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none text-center font-bold bg-card appearance-none">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <span className="font-bold text-lg mt-4">:</span>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-1">Menit</label>
              <select value={autoResetMinute} onChange={e => setAutoResetMinute(parseInt(e.target.value))} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none text-center font-bold bg-card appearance-none">
                {Array.from({ length: 60 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">Saldo semua kasir akan direset otomatis pada jam ini (WIB)</p>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-500" /> PIN Login
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Aktifkan PIN untuk kasir saat login</p>
            </div>
            <button onClick={() => setPinEnabled(!pinEnabled)} className={`w-12 h-6 rounded-full flex items-center transition-all ${pinEnabled ? 'bg-blue-600 justify-end' : 'bg-gray-300 justify-start'}`}>
              <div className="w-5 h-5 bg-card rounded-full mx-0.5 shadow" />
            </button>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Kata-kata Mutiara
          </h3>
          <textarea value={quotes} onChange={e => setQuotes(e.target.value)} rows={4} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none resize-none" placeholder="Masukkan quotes motivasi (satu per baris)..." />
          <p className="text-[10px] text-gray-400 mt-1">Tampil secara acak di header kasir</p>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-500" /> Teks Berjalan (Merah)
          </h3>
          <input value={runningText} onChange={e => setRunningText(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2.5 text-sm outline-none" placeholder="Contoh: Semoga Hari ini penuh Berkah..." />
          <p className="text-[10px] text-gray-400 mt-1">Teks berjalan merah di beranda kasir (kosongkan untuk sembunyikan)</p>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
              <Edit className="w-4 h-4 text-purple-500" /> Kategori Transaksi
            </h3>
            <button onClick={() => setCustomCategories([...customCategories, { id: `cat_${Date.now()}`, name: "Kategori Baru", type: "bank", color: "text-foreground" }])} className="bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold text-xs">
              + Tambah
            </button>
          </div>
          <div className="space-y-2">
            {customCategories.map((cat, index) => (
              <div key={cat.id} className="flex flex-col gap-2 border border-gray-200 p-2.5 rounded-xl bg-gray-50">
                <div className="flex items-center gap-2">
                  <input value={cat.name} onChange={e => {
                    const newCats = [...customCategories];
                    newCats[index].name = e.target.value;
                    setCustomCategories(newCats);
                  }} className={`flex-1 border border-border rounded-lg px-2 py-1.5 text-xs outline-none font-bold ${(cat.visible ?? true) ? 'text-gray-700' : 'text-gray-400 line-through'}`} placeholder="Nama Kategori" />
                  <button onClick={() => {
                    const newCats = [...customCategories];
                    newCats[index].visible = !(newCats[index].visible ?? true);
                    setCustomCategories(newCats);
                  }} className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                    (cat.visible ?? true) ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    {(cat.visible ?? true) ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => {
                    if (confirm("Hapus kategori ini?")) {
                      setCustomCategories(customCategories.filter(c => c.id !== cat.id));
                    }
                  }} className="bg-red-100 text-red-500 p-1.5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-2">
                  <select value={cat.type} onChange={e => {
                    const newCats = [...customCategories];
                    newCats[index].type = e.target.value;
                    setCustomCategories(newCats);
                  }} className="flex-1 border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none bg-white font-semibold text-gray-600">
                    <option value="bank">Bank → Cash (CASH +, BANK -)</option>
                    <option value="tarik">Tarik Tunai (TARIK +, CASH -)</option>
                    <option value="aks">Aksesoris (AKSESORIS +)</option>
                    <option value="admin">Admin Only (Hanya Admin +)</option>
                  </select>
                  <select value={cat.color} onChange={e => {
                    const newCats = [...customCategories];
                    newCats[index].color = e.target.value;
                    setCustomCategories(newCats);
                  }} className="w-24 border border-border rounded-lg px-2 py-1.5 text-[10px] outline-none bg-white font-semibold text-gray-600">
                    <option value="text-foreground">Hitam</option>
                    <option value="text-red-600">Merah</option>
                    <option value="text-orange-500">Orange</option>
                    <option value="text-blue-600">Biru</option>
                    <option value="text-green-600">Hijau</option>
                    <option value="text-purple-600">Ungu</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>


        <button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </button>


      </div>
    </div>
  );
}

function RingkasanPage({ goBack }: { goBack: () => void }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionRecord[]>([]);
  const [allNotes, setAllNotes] = useState<Record<string, { sisaSaldoBank: number; saldoRealApp: number }>>({});
  const [allSaldoHistory, setAllSaldoHistory] = useState<any[]>([]);
  const [shopSettings, setShopSettings] = useState<SettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const today = getWibDate();
  const [date, setDate] = useState(today);
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const now = new Date();
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [selectedKasir, setSelectedKasir] = useState("Semua");

  useEffect(() => {
    setLoading(true);
    let startDate: string, endDate: string;
    if (viewMode === "day") {
      startDate = date;
      endDate = date;
    } else {
      const [y, m] = month.split("-").map(Number);
      startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }
    Promise.all([
      getUsers(),
      getTransactions({ startDate, endDate }),
      getSaldoHistory({ startDate, endDate }),
      getSettings(),
    ]).then(async ([u, t, sh, s]) => {
      setUsers(u);
      setAllTransactions(t);
      setAllSaldoHistory(sh);
      setShopSettings(s);
      const kasirList = u.filter(usr => usr.role !== "owner" && usr.isActive);
      const notesMap: Record<string, { sisaSaldoBank: number; saldoRealApp: number }> = {};
      if (viewMode === "day") {
        for (const k of kasirList) {
          try {
            const notes = await getDailyNotes(k.name, date);
            notesMap[k.name] = notes;
          } catch {
            notesMap[k.name] = { sisaSaldoBank: 0, saldoRealApp: 0 };
          }
        }
      }
      setAllNotes(notesMap);
    }).catch(() => { }).finally(() => setLoading(false));
  }, [date, month, viewMode]);

  const kasirList = users.filter(u => u.role !== "owner" && u.isActive);
  const allKasirs = [{ name: "PANEL ADMIN", isAdmin: true }, ...kasirList.map(k => ({ name: k.name, isAdmin: false }))];
  const chipNames = ["Semua", "Admin", ...kasirList.map(k => k.name)];

  const filteredKasirs = selectedKasir === "Semua"
    ? allKasirs
    : selectedKasir === "Admin"
      ? allKasirs.filter(k => k.isAdmin)
      : allKasirs.filter(k => k.name === selectedKasir);

  const getKasirData = (kasirName: string, isAdmin: boolean) => {
    const tx = isAdmin ? allTransactions : allTransactions.filter(t => t.kasirName === kasirName);

    const bank = tx.filter(t => {
      if (t.categoryType === "tarik") return false;
      if (t.categoryType === "aks") return false;
      if (t.category === "NON TUNAI" || (t.paymentMethod || "").toLowerCase().includes("non-tunai")) return false;
      if (t.categoryType === "admin") return false;
      return t.categoryType === "bank";
    }).reduce((s, t) => s + (t.nominal || 0), 0);
    const tarik = tx.filter(t => t.categoryType === "tarik").reduce((s, t) => s + (t.nominal || 0), 0);
    const aks = tx.filter(t => t.categoryType === "aks").reduce((s, t) => s + (t.nominal || 0), 0);

    const totalAdmin = tx.reduce((s, t) => s + (t.admin || 0), 0);
    const totalPenjualan = bank;
    const sisaCash = totalPenjualan - tarik;
    const nonTunai = tx.filter(t => (t.nominalNonTunai || 0) > 0).reduce((s, t) => s + (t.nominalNonTunai || 0), 0);
    const totalUangCash = sisaCash + totalAdmin + aks;

    const sh = isAdmin ? allSaldoHistory : allSaldoHistory.filter((s: any) => s.kasirName === kasirName);
    const totalIsiSaldoBank = sh.reduce((s: number, h: any) => s + (h.nominal || 0), 0);

    const notes = allNotes[kasirName] || { sisaSaldoBank: 0, saldoRealApp: 0 };
    const saldoBankCatatan = notes.sisaSaldoBank;
    const saldoRealApp = notes.saldoRealApp;
    const selisih = saldoBankCatatan - saldoRealApp;
    const sesuai = selisih === 0;
    const saldoPlusPenjualan = saldoBankCatatan + totalPenjualan;

    return {
      totalIsiSaldoBank, saldoBankCatatan, saldoRealApp, selisih, sesuai,
      totalPenjualan, totalAdmin, sisaCash, tarik, nonTunai, totalUangCash, saldoPlusPenjualan,
    };
  };

  return (
    <div className="px-3 pt-3 pb-20 min-h-screen bg-gradient-to-b from-blue-600 via-blue-500 to-blue-400">
      <div className="flex items-center gap-2 mb-3">
        <button onClick={goBack} className="text-white"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="font-extrabold text-base text-white">Ringkasan Harian Per Kasir</h1>
          <p className="text-[11px] text-white/70">Data ringkasan seluruh kasir</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => setViewMode("day")} className={`py-2.5 rounded-full text-xs font-bold transition ${viewMode === "day" ? "bg-card text-blue-600 shadow" : "bg-card/20 text-white border border-white/30"}`}>
          Per Hari
        </button>
        <button onClick={() => setViewMode("month")} className={`py-2.5 rounded-full text-xs font-bold transition ${viewMode === "month" ? "bg-card text-blue-600 shadow" : "bg-card/20 text-white border border-white/30"}`}>
          Per Bulan
        </button>
      </div>

      <div className="mb-3">
        {viewMode === "day" ? (
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-xl border border-white/30 bg-card/10 text-white px-3 py-2.5 text-sm outline-none" />
        ) : (
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="w-full rounded-xl border border-white/30 bg-card/10 text-white px-3 py-2.5 text-sm outline-none" />
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide">
        {chipNames.map(name => (
          <button
            key={name}
            onClick={() => setSelectedKasir(name)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition flex-shrink-0 ${selectedKasir === name ? "bg-card text-blue-600 shadow" : "bg-card/20 text-white border border-white/30"}`}
          >
            {name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-white" /></div>
      ) : filteredKasirs.length === 0 ? (
        <div className="text-center py-10 text-white/70 text-sm">Tidak ada data kasir</div>
      ) : (
        filteredKasirs.map((k, idx) => {
          const data = getKasirData(k.name, k.isAdmin);
          return (
            <div key={k.name} className="bg-card rounded-2xl mb-4 shadow-lg overflow-hidden">
              <div className={`px-4 py-3 flex items-center justify-between ${k.isAdmin ? 'bg-gradient-to-r from-blue-700 to-blue-500' : 'bg-gradient-to-r from-green-600 to-green-400'}`}>
                <span className="text-white font-bold text-sm">{String(idx + 1).padStart(2, "0")} - {k.name.toUpperCase()}</span>
                <span className="flex items-center gap-1 text-white text-[10px] font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" /> Live
                </span>
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 flex items-center gap-1.5">💳 Total Tambah/Isi Saldo Bank</span>
                  <span className="font-bold text-blue-700">{formatRupiah(data.totalIsiSaldoBank)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 flex items-center gap-1.5">🏦 Saldo Bank Catatan</span>
                  <span className="font-bold text-blue-700">{formatRupiah(data.saldoBankCatatan)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 flex items-center gap-1.5">📱 Saldo Real App</span>
                  <span className="font-bold text-blue-700">{formatRupiah(data.saldoRealApp)}</span>
                </div>

                <div className="flex justify-between items-center text-xs bg-muted rounded-lg px-3 py-2">
                  <span className="text-gray-700 font-semibold flex items-center gap-1.5">✅ Selisih</span>
                  <span className={`font-bold ${data.sesuai ? 'text-green-600' : 'text-red-600'}`}>
                    {data.sesuai ? '✓ Sesuai' : formatRupiah(data.selisih)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-extrabold text-green-700">{formatRupiah(data.totalPenjualan)}</p>
                    <p className="text-[9px] text-green-600">Total Penjualan</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-extrabold text-amber-700">{formatRupiah(data.totalAdmin)}</p>
                    <p className="text-[9px] text-amber-500">Total Admin</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-extrabold text-purple-700">{formatRupiah(data.sisaCash)}</p>
                    <p className="text-[9px] text-purple-500">Sisa Cash</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-red-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-extrabold text-red-600">{formatRupiah(data.tarik)}</p>
                    <p className="text-[9px] text-red-500">Tarik Tunai</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-extrabold text-green-700">{formatRupiah(data.nonTunai)}</p>
                    <p className="text-[9px] text-green-500">Non Tunai</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-2.5 text-center">
                    <p className="text-xs font-extrabold text-red-600">{formatRupiah(data.totalUangCash)}</p>
                    <p className="text-[9px] text-red-500 font-bold">TOTAL UANG CASH</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg px-3 py-2">
                  <span className="text-gray-700 font-semibold flex items-center gap-1.5">🏦 Saldo Bank Catatan + Total Penjualan</span>
                  <span className="font-bold text-indigo-700">{formatRupiah(data.saldoPlusPenjualan)}</span>
                </div>
                <div className="text-[10px] text-gray-400 pl-1">
                  {formatRupiah(data.saldoBankCatatan)} + {formatRupiah(data.totalPenjualan)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
function AkunPage({ goBack }: { goBack: () => void }) {
  const { firebaseUser, user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState(firebaseUser?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerPin, setOwnerPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showOwnerPin, setShowOwnerPin] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);

  useEffect(() => {
    getUsers().then(setUsers).catch(() => { });
    getSettings().then(s => {
      if (s.customCategories) setCustomCategories(s.customCategories);
    }).catch(() => { });
  }, []);

  const [customCategories, setCustomCategories] = useState<{ id: string; name: string; type: string; color: string; visible?: boolean }[]>([]);

  const ownerData = users.find(u => u.role === "owner");

  useEffect(() => {
    if (ownerData) setOwnerPin(ownerData.pin);
  }, [ownerData]);

  const handleUpdateAuth = async () => {
    if (!firebaseUser) return;

    setSaving(true);
    try {
      const { updatePassword, updateEmail } = await import("firebase/auth");

      let updated = false;

      if (email !== firebaseUser.email && email.trim() !== "") {
        await updateEmail(firebaseUser, email);
        updated = true;
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({ title: "Password tidak cocok", variant: "destructive" });
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          toast({ title: "Password minimal 6 karakter", variant: "destructive" });
          setSaving(false);
          return;
        }
        await updatePassword(firebaseUser, newPassword);
        updated = true;
      }

      if (ownerData && ownerPin !== ownerData.pin) {
        if (ownerPin.length < 4) {
          toast({ title: "PIN minimal 4 digit", variant: "destructive" });
          setSaving(false);
          return;
        }
        await updateUser(ownerData.id, { pin: ownerPin });
        updated = true;
      }

      // Save custom categories
      const currentSettings = await getSettings();
      const oldCategories = currentSettings.customCategories || [];
      const hasCatChanges = JSON.stringify(oldCategories) !== JSON.stringify(customCategories);

      if (hasCatChanges) {
        await updateSettings({ customCategories });
        updated = true;

        // Sync legacy transactions if names changed
        const allTx = await getTransactions({});
        let updateCount = 0;
        const nameToIdMap: Record<string, string> = {};
        const idToNewNameMap: Record<string, string> = {};
        
        customCategories.forEach(c => {
          nameToIdMap[c.name] = c.id;
          idToNewNameMap[c.id] = c.name;
        });

        for (const tx of allTx) {
          const targetId = tx.categoryId || nameToIdMap[tx.category];
          const newName = targetId ? idToNewNameMap[targetId] : null;

          if (targetId && (tx.categoryId !== targetId || (newName && tx.category !== newName))) {
            await updateTransaction(tx.id, {
              categoryId: targetId,
              category: newName || tx.category
            });
            updateCount++;
          }
        }
        if (updateCount > 0) {
          toast({ title: `${updateCount} transaksi disinkronkan` });
        }
      }

      if (updated) {
        toast({ title: "Data akun berhasil diperbarui" });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "Tidak ada perubahan" });
      }
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        toast({ title: "Silakan logout dan login kembali untuk mengubah kredensial", variant: "destructive" });
      } else {
        toast({ title: err.message || "Gagal memperbarui data", variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper title="Pengaturan Akun" icon={UserCog} goBack={goBack}>
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Kredensial Login
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Email Firebase</label>
            <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 h-12 bg-gray-50">
              <Mail className="w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-800"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">*Digunakan untuk login ke sistem</p>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="text-xs font-bold text-gray-500 block mb-1">Ganti Password</label>
            <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 h-12 bg-gray-50 mb-2 relative">
              <KeyRound className="w-4 h-4 text-gray-400" />
              <input
                type={showNewPass ? "text" : "password"}
                placeholder="Password Baru (Kosongkan jika tidak diganti)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
              />
              <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="text-gray-400">
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 h-12 bg-gray-50 relative">
              <KeyRound className="w-4 h-4 text-gray-400" />
              <input
                type={showConfirmPass ? "text" : "password"}
                placeholder="Konfirmasi Password Baru"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-800 placeholder:text-gray-400 placeholder:font-normal"
              />
              <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="text-gray-400">
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {ownerData && (
            <div className="pt-2 border-t border-gray-100">
              <label className="text-xs font-bold text-gray-500 block mb-1">Ganti PIN Owner</label>
              <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 h-12 bg-gray-50 relative">
                <Lock className="w-4 h-4 text-gray-400" />
                <input
                  type={showOwnerPin ? "text" : "password"}
                  inputMode="numeric"
                  placeholder="PIN Owner"
                  value={ownerPin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 6) setOwnerPin(val);
                  }}
                  className="flex-1 bg-transparent outline-none text-sm font-semibold text-gray-800 tracking-widest placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal"
                />
                <button type="button" onClick={() => setShowOwnerPin(!showOwnerPin)} className="text-gray-400">
                  {showOwnerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">*PIN untuk masuk ke Mode Owner jika fitur PIN diaktifkan</p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-purple-600" />
              Nama Kategori Dinamis
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">Ubah nama tampilan kategori tanpa mengubah logika perhitungan.</p>
            
            <div className="space-y-3">
              {customCategories.map((cat, idx) => (
                <div key={cat.id} className="flex flex-col gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">ID: {cat.id}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        cat.type === 'bank' ? 'bg-blue-100 text-blue-600' : 
                        cat.type === 'tarik' ? 'bg-red-100 text-red-600' : 
                        cat.type === 'admin' ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {cat.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newCats = [...customCategories];
                        newCats[idx].visible = !(newCats[idx].visible ?? true);
                        setCustomCategories(newCats);
                      }}
                      className={`p-1.5 rounded-lg border flex items-center justify-center transition-colors ${
                        (cat.visible ?? true) ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}
                    >
                      {(cat.visible ?? true) ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input
                      value={cat.name}
                      onChange={e => {
                        const newCats = [...customCategories];
                        newCats[idx].name = e.target.value;
                        setCustomCategories(newCats);
                      }}
                      className={`flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:border-purple-500 transition-all ${(cat.visible ?? true) ? 'text-gray-700' : 'text-gray-400 line-through'}`}
                      placeholder="Nama Tampilan"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleUpdateAuth}
            disabled={saving}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md disabled:opacity-50 mt-4 active:scale-95 transition"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan Kredensial"}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
