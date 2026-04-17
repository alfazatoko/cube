import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { formatRupiah, formatThousands, parseThousands, getWibDate } from "@/lib/utils";
import { getTransactions, getSaldoHistory, getUsers, updateTransaction, deleteTransaction, type TransactionRecord, type SaldoHistoryRecord, type UserRecord } from "@/lib/firestore";
import { Receipt, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_FILTERS = ["Semua", "Bank", "Flip", "App", "Dana", "Tarik", "Aks"];
const CATEGORY_MAP: Record<string, string> = {
  Bank: "BANK", Flip: "FLIP", App: "APP PULSA", Dana: "DANA", Tarik: "TARIK TUNAI", Aks: "AKSESORIS",
};
const SALDO_FILTERS = ["Semua", "Bank", "Cash", "Saldo Real", "Sisa Saldo"];

export default function Riwayat() {
  const { user } = useAuth();
  const { toast } = useToast();

  const today = getWibDate();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedKasir, setSelectedKasir] = useState("Semua Kasir");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedSaldoTab, setSelectedSaldoTab] = useState("Semua");
  const [expandedTx, setExpandedTx] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const [editTx, setEditTx] = useState<TransactionRecord | null>(null);
  const [editNominal, setEditNominal] = useState("");
  const [editAdmin, setEditAdmin] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [saldoHistory, setSaldoHistory] = useState<SaldoHistoryRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const kasirFilter = selectedKasir === "Semua Kasir" ? undefined : selectedKasir;

  const loadData = useCallback(async () => {
    if (!user?.name) return;
    try {
      const [txs, saldo, users] = await Promise.all([
        getTransactions({ kasirName: kasirFilter || (user.role === "owner" ? undefined : user.name), startDate, endDate }),
        getSaldoHistory({ kasirName: kasirFilter || (user.role === "owner" ? undefined : user.name), startDate, endDate }),
        getUsers(),
      ]);
      setTransactions(txs);
      setSaldoHistory(saldo);
      setAllUsers(users);
    } catch {}
  }, [user?.name, user?.role, kasirFilter, startDate, endDate, refreshKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus transaksi ini?")) return;
    try {
      await deleteTransaction(id);
      toast({ title: "Transaksi dihapus" });
      setRefreshKey(k => k + 1);
    } catch {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const openEdit = (tx: TransactionRecord) => {
    setEditTx(tx);
    setEditNominal(formatThousands(String(tx.nominal || 0)));
    setEditAdmin(formatThousands(String(tx.admin || 0)));
    setEditKeterangan(tx.keterangan || "");
  };

  const handleEditSave = async () => {
    if (!editTx) return;
    setEditSaving(true);
    try {
      await updateTransaction(editTx.id, {
        nominal: parseInt(parseThousands(editNominal)) || editTx.nominal,
        admin: parseInt(parseThousands(editAdmin)) || 0,
        keterangan: editKeterangan,
      });
      toast({ title: "Diperbarui" });
      setEditTx(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast({ title: "Gagal memperbarui", variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const filteredTx = useMemo(() => {
    let result = transactions;
    if (selectedCategory !== "Semua") {
      const mapped = CATEGORY_MAP[selectedCategory];
      if (mapped) result = result.filter(tx => tx.category === mapped);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      result = result.filter(tx =>
        (tx.keterangan || "").toLowerCase().includes(q) ||
        (tx.category || "").toLowerCase().includes(q) ||
        (tx.kasirName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, selectedCategory, searchText]);

  const filteredSaldo = saldoHistory.filter(s => {
    if (selectedSaldoTab === "Semua") return true;
    if (selectedSaldoTab === "Bank") return s.jenis === "Bank";
    if (selectedSaldoTab === "Cash") return s.jenis === "Cash";
    if (selectedSaldoTab === "Saldo Real") return s.jenis === "Real App";
    if (selectedSaldoTab === "Sisa Saldo") return s.jenis === "Sisa Saldo";
    return true;
  });

  const kasirList = allUsers.filter(u => u.role !== "owner");

  const getShortCategory = (cat: string) => {
    if (cat === "TARIK TUNAI") return "TARIK";
    if (cat === "APP PULSA") return "APP";
    if (cat === "AKSESORIS") return "AKS";
    return cat;
  };

  const isNonTunai = (tx: TransactionRecord) => tx.paymentMethod && tx.paymentMethod.toLowerCase().includes("non-tunai");

  return (
    <div className="px-3 pt-3 pb-20">
      <Header />

      <div className="relative mb-2.5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</span>
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Cari keterangan..."
          className="w-full pl-9 pr-3 py-2 rounded-full border-2 border-gray-200 text-[13px] bg-white outline-none"
        />
      </div>

      <div className="flex gap-1.5 items-center mb-2.5">
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 rounded-full border border-gray-200 px-2.5 py-1.5 text-xs bg-white outline-none" />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 rounded-full border border-gray-200 px-2.5 py-1.5 text-xs bg-white outline-none" />
        <button onClick={() => setRefreshKey(k => k + 1)} className="bg-blue-600 text-white border-none rounded-full px-4 py-1.5 font-bold text-xs whitespace-nowrap">Tampilkan</button>
      </div>

      {user?.role === "owner" && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          <button onClick={() => setSelectedKasir("Semua Kasir")} className={`rounded-full px-3 py-1 text-[11px] font-semibold border-[1.5px] ${selectedKasir === "Semua Kasir" ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-900 border-gray-300'}`}>Semua Kasir</button>
          {kasirList.map(k => (
            <button key={k.name} onClick={() => setSelectedKasir(k.name)} className={`rounded-full px-3 py-1 text-[11px] font-semibold border-[1.5px] ${selectedKasir === k.name ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-900 border-gray-300'}`}>{k.name}</button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 mb-3">
        {CATEGORY_FILTERS.map(c => (
          <button key={c} onClick={() => setSelectedCategory(c)} className={`rounded-full py-1.5 text-xs font-semibold border-[1.5px] text-center ${selectedCategory === c ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-900 border-gray-300'}`}>{c}</button>
        ))}
      </div>

      <div className="bg-white rounded-[14px] overflow-hidden shadow-sm mb-3.5">
        <div className="grid gap-0.5 px-1.5 py-1.5 border-b-2 border-gray-200 text-[9px] font-bold text-gray-500" style={{ gridTemplateColumns: '20px 36px 48px 1fr 52px 1fr 18px' }}>
          <span>#</span><span>Jam</span><span>Tipe</span><span>Nominal</span><span>Admin</span><span>Ket</span><span></span>
        </div>

        {filteredTx.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            {searchText ? `Tidak ditemukan "${searchText}"` : "Tidak ada transaksi"}
          </div>
        ) : (
          filteredTx.map((tx, i) => {
            const nt = isNonTunai(tx);
            const isExpanded = expandedTx === tx.id;
            const ketText = tx.keterangan || "";
            return (
              <div key={tx.id}>
                <div onClick={() => setExpandedTx(isExpanded ? null : tx.id)} className="grid gap-0.5 px-1.5 py-1.5 border-b border-gray-100 text-[9px] items-center cursor-pointer" style={{ gridTemplateColumns: '20px 36px 48px 1fr 52px 1fr 18px' }}>
                  <span className="text-gray-400">{i + 1}</span>
                  <span>{(tx.transTime || "").slice(0, 5)}</span>
                  <span className={`font-bold truncate ${nt ? 'text-purple-600' : 'text-blue-900'}`}>{getShortCategory(tx.category)}</span>
                  <span className={`font-bold truncate ${nt ? 'text-purple-600' : 'text-blue-600'}`}>{formatRupiah(tx.nominal)}</span>
                  <span className="truncate">{formatRupiah(tx.admin || 0)}</span>
                  <span className="text-gray-500 truncate">{nt ? "💳 " : ""}{ketText}</span>
                  <span className="text-gray-400 text-[10px] text-center">{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="px-3.5 py-2 pb-3 bg-gray-50 border-b border-gray-200">
                    <div className="text-xs text-gray-500 mb-1">Tanggal: <strong>{tx.transDate}</strong></div>
                    <div className="text-xs text-gray-500 mb-1">Pembayaran: <strong className={nt ? 'text-purple-600' : 'text-green-600'}>{nt ? "NON TUNAI" : "TUNAI"}</strong></div>
                    {ketText && <div className="text-xs text-gray-500 mb-1">Keterangan: <strong className="text-gray-700">{ketText}</strong></div>}
                    {tx.kasirName && <div className="text-xs text-gray-500 mb-2">Kasir: <strong>{tx.kasirName}</strong></div>}
                    <div className="flex gap-2.5">
                      <button onClick={e => { e.stopPropagation(); openEdit(tx); }} className="bg-blue-50 border border-blue-200 rounded-[10px] px-4 py-1.5 text-[13px] font-bold text-blue-600 flex items-center gap-1">✏️ Edit</button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(tx.id); }} className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-1.5 text-[13px] font-bold text-red-600 flex items-center gap-1">🗑️ Hapus</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {filteredTx.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-2 text-[10px] text-gray-500 flex justify-between">
            <span>{filteredTx.length} transaksi</span>
            <span>Total: {formatRupiah(filteredTx.reduce((sum, tx) => sum + (tx.nominal || 0), 0))}</span>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-blue-900 to-blue-600 rounded-t-[14px] px-3.5 py-2.5 text-white font-bold text-[13px]">RIWAYAT TAMBAH SALDO</div>
      <div className="bg-white rounded-b-[14px] shadow-sm">
        <div className="flex gap-1.5 px-2.5 py-2 border-b border-gray-200">
          {SALDO_FILTERS.map(f => (
            <button key={f} onClick={() => setSelectedSaldoTab(f)} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold border-[1.5px] ${selectedSaldoTab === f ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-700 border-gray-300'}`}>{f}</button>
          ))}
        </div>

        <div className="grid px-2.5 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500" style={{ gridTemplateColumns: '28px 1fr 1fr 1fr 1fr' }}>
          <span>#</span><span>Jam</span><span>Jenis</span><span>Nominal</span><span>Ket</span>
        </div>

        {filteredSaldo.length === 0 ? (
          <div className="text-center py-5 text-gray-400 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Tidak ada riwayat
          </div>
        ) : (
          filteredSaldo.map((s, i) => (
            <div key={s.id} className="grid px-2.5 py-1.5 border-b border-gray-100 text-[10px]" style={{ gridTemplateColumns: '28px 1fr 1fr 1fr 1fr' }}>
              <span className="text-gray-400">{i + 1}</span>
              <span>{s.saldoTime}</span>
              <span className="font-semibold">{s.jenis}</span>
              <span className="font-bold">{formatRupiah(s.nominal)}</span>
              <span className="text-gray-500">{s.keterangan || ""}</span>
            </div>
          ))
        )}
      </div>

      {editTx && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditTx(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3.5">
              <h3 className="font-bold text-base">Edit Transaksi</h3>
              <button onClick={() => setEditTx(null)} className="text-xl text-gray-400">&times;</button>
            </div>
            <div className="mb-2">
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Nominal</label>
              <input value={editNominal} onChange={e => setEditNominal(formatThousands(e.target.value))} inputMode="numeric" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div className="mb-2">
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Admin</label>
              <input value={editAdmin} onChange={e => setEditAdmin(formatThousands(e.target.value))} inputMode="numeric" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <div className="mb-3.5">
              <label className="text-[11px] font-semibold text-gray-500 block mb-1">Keterangan</label>
              <input value={editKeterangan} onChange={e => setEditKeterangan(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none" />
            </div>
            <button onClick={handleEditSave} disabled={editSaving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-full text-sm disabled:opacity-60">
              {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
