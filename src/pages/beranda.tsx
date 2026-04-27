import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { AddSaldoModal } from "@/components/modals/add-saldo-modal";
import { getBalance, createTransaction, getSettings, type BalanceRecord, type SettingsRecord } from "@/lib/firestore";
import { formatRupiah, formatThousands, parseThousands, getWibDate } from "@/lib/utils";
import { Landmark, Wallet, ArrowDownToLine, Gem, Lock, Settings, ChevronDown, RefreshCcw, SlidersHorizontal, SmartphoneNfc, NotebookPen, Receipt, ListPlus, Home, FileText, Ticket, X, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DebugWrapper } from "@/components/debug/debug-wrapper";

const DEFAULT_QUOTES = [
  "Kerja keras hari ini, kemudahan esok hari",
  "Semangat adalah kunci keberhasilan",
  "Pelayanan terbaik adalah investasi terbaik",
];

export default function Beranda() {
  const { user, firebaseUser } = useAuth();
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState("");
  const [nominalDisplay, setNominalDisplay] = useState("");
  const [adminDisplay, setAdminDisplay] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [balance, setBalance] = useState<BalanceRecord | null>(null);
  const [shopSettings, setShopSettings] = useState<SettingsRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [showLainnyaMenu, setShowLainnyaMenu] = useState(false);

  const nominalRef = useRef<HTMLInputElement>(null);
  const adminRef = useRef<HTMLInputElement>(null);
  const ketRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const loadBalance = useCallback(async () => {
    if (!user?.name) return;
    try {
      const bal = await getBalance(user.name);
      setBalance(bal);
    } catch { }
  }, [user?.name]);

  // Reset saldo saat UID berubah (akun berbeda login)
  useEffect(() => {
    setBalance(null);
  }, [firebaseUser?.uid]);

  useEffect(() => {
    loadBalance();
    getSettings().then((s) => {
      setShopSettings(s);
    }).catch(() => { });
    const interval = setInterval(loadBalance, 5000);
    return () => clearInterval(interval);
  }, [loadBalance]);

  const [mutiaraIndex] = useState(() => Math.floor(Math.random() * 100));

  const getMutiaraQuote = () => {
    const quotesStr = shopSettings?.mutiaraQuotes || "";
    const customQuotes = quotesStr.split("\n").map(q => q.trim()).filter(q => q.length > 0);
    const allQuotes = customQuotes.length > 0 ? customQuotes : DEFAULT_QUOTES;
    return allQuotes[mutiaraIndex % allQuotes.length];
  };

  const handleProses = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const dateStr = getWibDate();
    const timeStr = now.toTimeString().substring(0, 5);
    const n = parseInt(parseThousands(nominalDisplay));
    const a = parseInt(parseThousands(adminDisplay)) || 0;

    if (!category || category === "") {
      toast({ title: "Pilih kategori terlebih dahulu", variant: "destructive" });
      return;
    }

    if (!n || n <= 0) {
      toast({ title: "Nominal harus diisi", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const selectedCat = shopSettings?.customCategories?.find(c => c.id === category);

      await createTransaction({
        kasirName: user.name,
        category: selectedCat ? selectedCat.name : category,
        categoryId: selectedCat ? selectedCat.id : undefined,
        categoryType: selectedCat ? selectedCat.type : "bank",
        keterangan,
        transDate: dateStr,
        transTime: timeStr,
        paymentMethod: "tunai",
        nominal: n,
        admin: a,
        nominalTunai: n,
        adminTunai: a,
      });
      toast({ title: "Transaksi berhasil disimpan" });
      setNominalDisplay("");
      setAdminDisplay("");
      setKeterangan("");
      setCategory("");
      nominalRef.current?.focus();
      await loadBalance();
    } catch (err: any) {
      const msg = err?.message || err?.toString?.() || "Gagal menyimpan transaksi";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, category, nominalDisplay, adminDisplay, keterangan, shopSettings, toast, loadBalance]);


  return (
    <div className="px-3 pt-3 pb-24 landscape-scroll overflow-x-hidden">
      <DebugWrapper componentName="Header">
        <Header />
      </DebugWrapper>

      <DebugWrapper componentName="RunningText">
        <div className="overflow-hidden w-full mb-3 max-w-full" style={{overflowX: 'hidden'}}>
          <div className="running-text text-red-600 text-sm font-bold">
            {shopSettings?.runningText || "GRATIS BULAN INI CATAT PEMBUKUAN DI KASIR CUBE"}
          </div>
        </div>
      </DebugWrapper>

      <DebugWrapper componentName="SaldoCardsGroup">
        <div className="bg-gradient-to-br from-[#118EEA] to-blue-700 rounded-3xl p-4 text-white shadow-lg relative overflow-hidden mb-4 border border-blue-400/30">
          {/* Decorative shapes */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-2xl pointer-events-none" />
          
          {/* Top 2 Main Balances */}
          <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
            <div>
              <p className="text-[10px] font-medium text-blue-100 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                <Landmark className="w-3.5 h-3.5" /> Saldo Bank
              </p>
              <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">{formatRupiah(balance?.bank || 0)}</h3>
            </div>
            <div className="pl-4 border-l border-blue-400/40">
              <p className="text-[10px] font-medium text-blue-100 mb-1 flex items-center gap-1.5 uppercase tracking-wide">
                <Wallet className="w-3.5 h-3.5" /> Saldo Cash
              </p>
              <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">{formatRupiah(balance?.cash || 0)}</h3>
            </div>
          </div>

          {/* Bottom 3 Secondary Balances */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-blue-400/40 relative z-10">
            <div>
              <span className="text-[8px] font-bold text-blue-100 uppercase flex items-center gap-1 mb-1">
                <ArrowDownToLine className="w-2.5 h-2.5" /> Tarik Tunai
              </span>
              <span className="text-xs font-extrabold">{formatRupiah(balance?.tarik || 0)}</span>
            </div>
            <div className="pl-2 border-l border-blue-400/40">
              <span className="text-[8px] font-bold text-blue-100 uppercase flex items-center gap-1 mb-1">
                <Gem className="w-2.5 h-2.5" /> Aksesoris
              </span>
              <span className="text-xs font-extrabold">{formatRupiah(balance?.aks || 0)}</span>
            </div>
            <div className="pl-2 border-l border-blue-400/40">
              <span className="text-[8px] font-bold text-blue-100 uppercase flex items-center gap-1 mb-1">
                <RefreshCcw className="w-2.5 h-2.5" /> Admin
              </span>
              <span className="text-xs font-extrabold">{formatRupiah(balance?.adminTotal || 0)}</span>
            </div>
          </div>
        </div>
      </DebugWrapper>

      <DebugWrapper componentName="ActionButtons">
        <div className="grid grid-cols-5 gap-2 mb-4">
          {/* 1. Penyesuaian - ring biru */}
          <button
            onClick={() => window.dispatchEvent(new Event('open-penyesuaian'))}
            className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-[#1a5276]/20 ring-offset-1 min-w-0"
          >
            <SlidersHorizontal className="w-5 h-5 text-[#1a5276] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            <span className="text-[8px] font-bold text-[#1a5276] uppercase tracking-wide w-full truncate text-center px-0.5">Penyesuaian</span>
          </button>
          {/* 2. Non Tunai - ring hijau */}
          <button
            onClick={() => setLocation("/non-tunai")}
            className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-[#1e8449]/20 ring-offset-1 min-w-0"
          >
            <SmartphoneNfc className="w-5 h-5 text-[#1e8449] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            <span className="text-[8px] font-bold text-[#1e8449] uppercase tracking-wide w-full truncate text-center px-0.5">Non Tunai</span>
          </button>
          {/* 3. Catatan - ring oranye */}
          <button
            onClick={() => setLocation("/catatan")}
            className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-[#d35400]/20 ring-offset-1 min-w-0"
          >
            <NotebookPen className="w-5 h-5 text-[#d35400] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            <span className="text-[8px] font-bold text-[#d35400] uppercase tracking-wide w-full truncate text-center px-0.5">Catatan</span>
          </button>
          {/* 4. Nota - ring merah */}
          <button
            onClick={() => setLocation("/nota")}
            className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-[#b71c1c]/20 ring-offset-1 min-w-0"
          >
            <Receipt className="w-5 h-5 text-[#b71c1c] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            <span className="text-[8px] font-bold text-[#b71c1c] uppercase tracking-wide w-full truncate text-center px-0.5">Nota</span>
          </button>
          {/* 5. Lain Nya - ring ungu (aktif saat menu terbuka) */}
          <button
            onClick={() => setShowLainnyaMenu(!showLainnyaMenu)}
            className={`flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-offset-1 min-w-0 ${showLainnyaMenu ? 'ring-[#7d3c98]/60 bg-purple-50' : 'ring-[#7d3c98]/20'}`}
          >
            <ListPlus className="w-5 h-5 text-[#7d3c98] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
            <span className="text-[8px] font-bold text-[#7d3c98] uppercase tracking-wide w-full truncate text-center px-0.5">Lain Nya</span>
          </button>
        </div>

        {/* Lainnya Expanded - grid icon cards seperti tombol utama */}
        {showLainnyaMenu && (
          <div className="mb-3 p-2 bg-purple-50/80 backdrop-blur-sm rounded-2xl border-2 border-[#7d3c98]/15 shadow-inner">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[9px] font-black text-[#7d3c98] uppercase tracking-widest">Menu Lainnya</span>
              <button onClick={() => setShowLainnyaMenu(false)} className="p-0.5 rounded-full hover:bg-purple-200/60 transition">
                <X className="w-3.5 h-3.5 text-[#7d3c98]" />
              </button>
            </div>
          <div className="grid grid-cols-5 gap-2">
              {/* Beranda */}
              <button
                onClick={() => { setLocation("/beranda"); setShowLainnyaMenu(false); }}
                className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-blue-200 ring-offset-1 min-w-0"
              >
                <Home className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wide w-full truncate text-center px-0.5">Beranda</span>
              </button>
              {/* Nota */}
              <button
                onClick={() => { setLocation("/nota"); setShowLainnyaMenu(false); }}
                className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-[#b71c1c]/20 ring-offset-1 min-w-0"
              >
                <FileText className="w-5 h-5 text-[#b71c1c] group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                <span className="text-[8px] font-bold text-[#b71c1c] uppercase tracking-wide w-full truncate text-center px-0.5">Nota</span>
              </button>
              {/* Stok Voucher */}
              <button
                onClick={() => { setLocation("/stok-voucher"); setShowLainnyaMenu(false); }}
                className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-emerald-200 ring-offset-1 min-w-0"
              >
                <Ticket className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wide w-full truncate text-center px-0.5">Voucher</span>
              </button>
              {/* Kalender */}
              <button
                onClick={() => { setLocation("/kalender"); setShowLainnyaMenu(false); }}
                className="flex flex-col items-center justify-center gap-1.5 h-[65px] rounded-2xl bg-white shadow-sm active:scale-95 transition-all group hover:shadow-md ring-2 ring-orange-200 ring-offset-1 min-w-0"
              >
                <CalendarDays className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" strokeWidth={1.8} />
                <span className="text-[8px] font-bold text-orange-600 uppercase tracking-wide w-full truncate text-center px-0.5">Kalender</span>
              </button>
            </div>
          </div>
        )}
      </DebugWrapper>



      <DebugWrapper componentName="QuoteBanner">
        <div className="bg-gradient-to-r from-orange-500 to-amber-400 text-white text-center py-2 rounded-xl mb-3 text-[11px] font-bold">
          {getMutiaraQuote()}
        </div>
      </DebugWrapper>

      {user?.role !== "owner" && (
        <DebugWrapper componentName="CategorySelector">
          <div className="mb-4">
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-800 outline-none appearance-none focus:border-blue-500 transition-all shadow-sm cursor-pointer relative z-10"
              >
                <option value="" disabled>-- PILIH KATEGORI --</option>
                {shopSettings?.customCategories?.filter(c => c.visible ?? true).map((cat) => {
                  let colorClass = "bg-purple-100 text-purple-700"; // Ungu muda untuk lainnya (Bank)
                  if (cat.type === "tarik") colorClass = "bg-red-100 text-red-700"; // Merah
                  if (cat.type === "aks") colorClass = "bg-orange-100 text-orange-700"; // Orange

                  return (
                    <option key={cat.id} value={cat.id} className={colorClass + " font-bold"}>
                      {cat.name}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </DebugWrapper>
      )}

      {user?.role === "owner" && (
        <DebugWrapper componentName="OwnerPanelButton">
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border text-center">
            <button
              onClick={() => setLocation("/owner")}
              className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition"
            >
              <Settings className="w-4 h-4" />
              BUKA PANEL OWNER
            </button>
          </div>
        </DebugWrapper>
      )}

      {user?.role !== "owner" && (
        <DebugWrapper componentName="TransactionForm">
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 h-12 bg-muted/50">
                <span className="text-blue-600 font-bold text-sm">Rp</span>
                <input
                  ref={nominalRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="Nominal"
                  value={nominalDisplay}
                  onChange={(e) => setNominalDisplay(formatThousands(e.target.value))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adminRef.current?.focus(); } }}
                  className="flex-1 bg-transparent outline-none text-base font-bold text-foreground placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 h-11 bg-muted/50">
                <span className="text-amber-500 font-bold text-sm">Rp</span> {/* Rp Admin */}
                <input
                  ref={adminRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="Admin"
                  value={adminDisplay}
                  onChange={(e) => setAdminDisplay(formatThousands(e.target.value))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ketRef.current?.focus(); } }}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-gray-400"
                />
              </div>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 h-11 bg-muted/50">
                <span className="text-blue-400 text-sm">📝</span>
                <input
                  ref={ketRef}
                  placeholder="Keterangan"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleProses(); } }}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              onClick={handleProses}
              disabled={saving}
              className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50"
            >
              PROSES TRANSAKSI
            </button>
          </div>
        </DebugWrapper>
      )}
    </div>
  );
}
