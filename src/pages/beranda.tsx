import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { AddSaldoModal } from "@/components/modals/add-saldo-modal";
import { getBalance, createTransaction, getSettings, type BalanceRecord, type SettingsRecord } from "@/lib/firestore";
import { formatRupiah, formatThousands, parseThousands, getWibDate } from "@/lib/utils";
import { Landmark, Wallet, ArrowDownToLine, Gem, Lock, Settings, ChevronDown, RefreshCcw, Sliders, CreditCard, Clipboard } from "lucide-react";
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
      toast({ title: err.message || "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, category, nominalDisplay, adminDisplay, keterangan, shopSettings, toast, loadBalance]);

  return (
    <div className="px-3 pt-3 pb-24 landscape-scroll">
      <DebugWrapper componentName="Header">
        <Header />
      </DebugWrapper>

      <DebugWrapper componentName="RunningText">
        <div className="overflow-hidden mb-3">
          <div className="running-text text-red-600 text-sm font-bold text-center">
            {shopSettings?.runningText || "GRATIS BULAN INI CATAT PEMBUKUAN DI KASIR CUBE"}
          </div>
        </div>
      </DebugWrapper>

      <DebugWrapper componentName="SaldoCards">
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="bg-gradient-to-br from-blue-900 to-blue-600 rounded-2xl p-3 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-12 h-12 bg-card/10 rounded-full" />
            <p className="text-[10px] font-semibold opacity-90 mb-0.5 flex items-center gap-1">
              <Landmark className="w-3 h-3" /> SALDO BANK
            </p>
            <h3 className="text-xl font-extrabold">{formatRupiah(balance?.bank || 0)}</h3>
          </div>
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 rounded-2xl p-3 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-3 -bottom-3 w-12 h-12 bg-card/10 rounded-full" />
            <p className="text-[10px] font-semibold opacity-90 mb-0.5 flex items-center gap-1">
              <Wallet className="w-3 h-3" /> SALDO CASH
            </p>
            <h3 className="text-xl font-extrabold">{formatRupiah(balance?.cash || 0)}</h3>
          </div>
        </div>
      </DebugWrapper>

      <DebugWrapper componentName="StatsRow">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 bg-card border border-border rounded-xl py-2 px-2 text-center shadow-sm">
            <span className="text-[8px] font-bold text-muted-foreground block uppercase flex items-center justify-center gap-0.5">
              <ArrowDownToLine className="w-2.5 h-2.5" /> Tarik Tunai
            </span>
            <span className="text-xs font-extrabold text-foreground block">{formatRupiah(balance?.tarik || 0)}</span>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl py-2 px-2 text-center shadow-sm">
            <span className="text-[8px] font-bold text-muted-foreground block uppercase flex items-center justify-center gap-0.5">
              <Gem className="w-2.5 h-2.5" /> Aksesoris
            </span>
            <span className="text-xs font-extrabold text-foreground block">{formatRupiah(balance?.aks || 0)}</span>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl py-2 px-2 text-center shadow-sm">
            <span className="text-[8px] font-bold text-muted-foreground block uppercase flex items-center justify-center gap-0.5">
              <RefreshCcw className="w-2.5 h-2.5 text-gray-900" /> ADMIN
            </span>
            <span className="text-xs font-extrabold text-foreground block">{formatRupiah(balance?.adminTotal || 0)}</span>
          </div>
        </div>
      </DebugWrapper>

      <DebugWrapper componentName="ActionButtons">
        <div className="flex gap-2 mb-3">
          <button onClick={() => window.dispatchEvent(new Event('open-penyesuaian'))} className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-2.5 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 active:scale-95 transition hover:shadow-emerald-500/40">
            <Sliders className="w-4 h-4" />
            <span>Penyesuaian</span>
          </button>
          <button onClick={() => setLocation("/non-tunai")} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 active:scale-95 transition hover:shadow-blue-500/40">
            <CreditCard className="w-4 h-4" />
            <span>Nontunai</span>
          </button>
          <button onClick={() => setLocation("/catatan")} className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-2.5 rounded-2xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 shadow-lg shadow-teal-500/30 active:scale-95 transition hover:shadow-teal-500/40">
            <Clipboard className="w-4 h-4" />
            <span>Catatan</span>
          </button>
        </div>
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
                {shopSettings?.customCategories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
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
