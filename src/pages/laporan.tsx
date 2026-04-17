import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import {
  getTransactions, getSaldoHistory, getDailySnapshot, getDailyNotes,
  lockReport, resetBalance, getUsers,
  type TransactionRecord, type SaldoHistoryRecord, type DailyNoteRecord, type UserRecord
} from "@/lib/firestore";
import { formatRupiah, getWibDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Lock, Download, Share2, Loader2, RotateCcw } from "lucide-react";

export default function Laporan() {
  const { user, shift } = useAuth();
  const { toast } = useToast();
  const today = getWibDate();
  const now = new Date();

  const isOwner = user?.role === "owner";

  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(() => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [kasirFilter, setKasirFilter] = useState("Semua");
  const [kasirList, setKasirList] = useState<UserRecord[]>([]);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [saldoHistory, setSaldoHistory] = useState<SaldoHistoryRecord[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [dailyNotes, setDailyNotes] = useState<DailyNoteRecord>({ sisaSaldoBank: 0, saldoRealApp: 0 });

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOwner) {
      getUsers().then(u => setKasirList(u.filter(k => k.role !== "owner" && k.isActive))).catch(() => {});
    }
  }, [isOwner]);

  const getDateRange = useCallback(() => {
    if (viewMode === "day") return { startDate: date, endDate: date };
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      startDate: `${y}-${String(m).padStart(2, "0")}-01`,
      endDate: `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    };
  }, [viewMode, date, month]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      let kasirName: string | undefined;
      if (!isOwner) {
        kasirName = user.name;
      } else if (kasirFilter !== "Semua") {
        kasirName = kasirFilter;
      }
      const [txs, saldo, snap, notes] = await Promise.all([
        getTransactions({ kasirName, startDate, endDate }),
        getSaldoHistory({ kasirName, startDate, endDate }),
        isOwner ? Promise.resolve(null) : getDailySnapshot(user.name, startDate),
        isOwner ? Promise.resolve({ sisaSaldoBank: 0, saldoRealApp: 0 }) : getDailyNotes(user.name, startDate),
      ]);
      setTransactions(txs);
      setSaldoHistory(saldo);
      setIsLocked((snap as any)?.locked || false);
      setDailyNotes(notes as DailyNoteRecord);
    } catch {} finally {
      setLoading(false);
    }
  }, [user, isOwner, kasirFilter, getDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const bankTx = transactions.filter(t => t.category === "BANK");
  const flipTx = transactions.filter(t => t.category === "FLIP");
  const appTx = transactions.filter(t => t.category === "APP PULSA");
  const danaTx = transactions.filter(t => t.category === "DANA");
  const tarikTx = transactions.filter(t => t.category === "TARIK TUNAI");
  const aksTx = transactions.filter(t => t.category === "AKSESORIS");
  const nonTunaiTx = transactions.filter(t => (t.paymentMethod || "").toLowerCase().includes("non-tunai") || t.category === "NON TUNAI");

  const sumNominal = (list: TransactionRecord[]) => list.reduce((s, t) => s + (t.nominal || 0), 0);
  const sumAdmin = (list: TransactionRecord[]) => list.reduce((s, t) => s + (t.admin || 0), 0);

  const totalBank = sumNominal(bankTx);
  const totalFlip = sumNominal(flipTx);
  const totalApp = sumNominal(appTx);
  const totalDana = sumNominal(danaTx);
  const totalTarik = sumNominal(tarikTx);
  const totalAks = sumNominal(aksTx);
  const totalAdmin = sumAdmin(transactions);
  const totalNonTunai = sumNominal(nonTunaiTx);

  const totalPenjualan = totalBank + totalFlip + totalApp + totalDana;
  const sisaCashPenjualan = totalPenjualan - totalTarik;
  const sisaCashTotal = sisaCashPenjualan + totalAdmin + totalAks;

  const saldoBankHistory = saldoHistory.filter(s => s.jenis === "Bank");
  const totalIsiSaldoBank = saldoBankHistory.reduce((s, h) => s + h.nominal, 0);

  const sisaSaldoBank = dailyNotes.sisaSaldoBank || 0;
  const saldoRealApp = dailyNotes.saldoRealApp || 0;
  const selisih = saldoRealApp - sisaSaldoBank;

  const categoryItems = [
    { label: "BANK", count: bankTx.length, total: totalBank },
    { label: "FLIP", count: flipTx.length, total: totalFlip },
    { label: "DANA", count: danaTx.length, total: totalDana },
    { label: "APP PULSA", count: appTx.length, total: totalApp },
  ].filter(c => c.count > 0);

  const handleResetSaldo = async () => {
    if (!confirm("Reset saldo kasir ini ke Rp 0? Tindakan tidak bisa dibatalkan.")) return;
    setResetting(true);
    try {
      await resetBalance(user!.name);
      toast({ title: "Saldo berhasil direset ke Rp 0" });
    } catch {
      toast({ title: "Gagal reset saldo", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const handleLock = async () => {
    if (!confirm("Kunci laporan hari ini? Data tidak bisa diubah lagi.")) return;
    setLocking(true);
    try {
      await lockReport(user!.name, date);
      setIsLocked(true);
      toast({ title: "Laporan dikunci" });
    } catch {
      toast({ title: "Gagal mengunci", variant: "destructive" });
    } finally {
      setLocking(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const wsData: any[][] = [
        ["ALFAZA CELL - Laporan Harian"],
        [`Kasir: ${user?.name}`, `Shift: ${shift}`, `Tanggal: ${date}`],
        [],
        ["#", "Jam", "Kategori", "Nominal", "Admin", "Keterangan", "Pembayaran"],
      ];
      transactions.forEach((tx, i) => {
        wsData.push([String(i + 1), tx.transTime || "", tx.category, tx.nominal || 0, tx.admin || 0, tx.keterangan || "", tx.paymentMethod || "tunai"]);
      });
      wsData.push([]);
      wsData.push(["Ringkasan"]);
      categoryItems.forEach(c => wsData.push([c.label, c.total]));
      wsData.push(["Total Penjualan", totalPenjualan]);
      wsData.push(["Tarik Tunai", totalTarik]);
      wsData.push(["Sisa Cash Penjualan", sisaCashPenjualan]);
      wsData.push(["Admin", totalAdmin]);
      wsData.push(["Aksesoris", totalAks]);
      wsData.push(["Non Tunai", totalNonTunai]);
      wsData.push(["Sisa Cash Total", sisaCashTotal]);
      wsData.push([]);
      wsData.push(["Saldo & Selisih"]);
      wsData.push(["Sisa Saldo Bank (Catatan)", sisaSaldoBank]);
      wsData.push(["Saldo Real App", saldoRealApp]);
      wsData.push(["Selisih", selisih]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan");
      XLSX.writeFile(wb, `laporan_${user?.name}_${date}.xlsx`);
      toast({ title: "Excel berhasil diunduh" });
    } catch {
      toast({ title: "Gagal membuat Excel", variant: "destructive" });
    }
  };

  const buildPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF("p", "mm", "a4");
    const pw = 210;
    const ml = 12;
    const mr = 12;
    const cw = pw - ml - mr;
    let y = 10;

    const checkPage = (need: number) => { if (y + need > 280) { pdf.addPage(); y = 12; } };

    const sectionHeader = (text: string, bgR: number, bgG: number, bgB: number, h = 9) => {
      checkPage(h + 2);
      pdf.setFillColor(bgR, bgG, bgB);
      pdf.roundedRect(ml, y, cw, h, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
      pdf.text(text, ml + 4, y + h / 2 + 1);
      y += h;
    };

    const sectionHeaderRight = (left: string, right: string, bgR: number, bgG: number, bgB: number, h = 10) => {
      checkPage(h + 2);
      pdf.setFillColor(bgR, bgG, bgB);
      pdf.roundedRect(ml, y, cw, h, 2, 2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10); pdf.setFont("helvetica", "bold");
      pdf.text(left, ml + 4, y + h / 2 + 1);
      pdf.setFontSize(12);
      pdf.text(right, ml + cw - 4, y + h / 2 + 1, { align: "right" });
      y += h;
    };

    const row = (left: string, right: string, opts?: { leftColor?: number[]; rightColor?: number[]; bold?: boolean }) => {
      checkPage(7);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
      const lc = opts?.leftColor || [55, 55, 55];
      pdf.setTextColor(lc[0], lc[1], lc[2]);
      pdf.text(left, ml + 4, y + 4.5);
      const rc = opts?.rightColor || [55, 55, 55];
      pdf.setTextColor(rc[0], rc[1], rc[2]);
      pdf.setFont("helvetica", "bold");
      pdf.text(right, ml + cw - 4, y + 4.5, { align: "right" });
      pdf.setDrawColor(230, 230, 230);
      pdf.line(ml + 2, y + 6.5, ml + cw - 2, y + 6.5);
      y += 7;
    };

    pdf.setFillColor(55, 95, 190);
    pdf.roundedRect(ml, y, cw, 16, 3, 3, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(15); pdf.setFont("helvetica", "bold");
    pdf.text("ALFAZA CELL", pw / 2, y + 7, { align: "center" });
    pdf.setFontSize(9); pdf.setFont("helvetica", "normal");
    pdf.text("Laporan Harian", pw / 2, y + 12.5, { align: "center" });
    y += 19;

    pdf.setFillColor(240, 240, 245);
    pdf.roundedRect(ml, y, cw, 8, 2, 2, "F");
    pdf.setTextColor(80, 80, 100);
    pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
    const infoKasir = isOwner && kasirFilter !== "Semua" ? kasirFilter : (user?.name || "-");
    pdf.text(`Kasir: ${infoKasir}  |  Shift: ${shift || "-"}  |  Tanggal: ${viewMode === "day" ? date : month}`, pw / 2, y + 5, { align: "center" });
    y += 11;

    if (categoryItems.length > 0) {
      sectionHeader("Rincian Kategori", 46, 160, 67);
      categoryItems.forEach(c => {
        row(`${c.label} (${c.count}x)`, formatRupiah(c.total), { leftColor: [30, 30, 200], rightColor: [30, 30, 200], bold: true });
      });
      y += 2;
    }

    sectionHeader("TOTAL PENJUALAN", 16, 150, 100);
    row("Total Penjualan", formatRupiah(totalPenjualan), { leftColor: [16, 130, 90], rightColor: [16, 130, 90] });
    if (tarikTx.length > 0) row(`Tarik Tunai (${tarikTx.length}x)`, `-${formatRupiah(totalTarik)}`, { leftColor: [220, 50, 50], rightColor: [220, 50, 50] });
    row("Sisa Cash Penjualan", formatRupiah(sisaCashPenjualan), { leftColor: [16, 130, 90], rightColor: [16, 130, 90] });
    row("Admin", formatRupiah(totalAdmin), { leftColor: [180, 130, 20], rightColor: [180, 130, 20] });
    if (aksTx.length > 0) row(`Aksesoris (${aksTx.length}x)`, formatRupiah(totalAks), { leftColor: [200, 50, 100], rightColor: [200, 50, 100] });
    row("Non Tunai", formatRupiah(totalNonTunai), { leftColor: [100, 50, 200], rightColor: [100, 50, 200] });
    y += 2;

    sectionHeaderRight("SISA CASH TOTAL", formatRupiah(sisaCashTotal), 230, 160, 20, 12);
    y += 3;

    sectionHeader("Jurnal Penyesuaian", 130, 60, 200);
    row("Total Tambah/Isi Saldo Bank", formatRupiah(totalIsiSaldoBank), { bold: true });
    y += 2;

    sectionHeader("Saldo & Selisih", 46, 140, 67);
    row("Sisa Saldo Bank (Catatan)", formatRupiah(sisaSaldoBank), { leftColor: [30, 30, 200], rightColor: [30, 30, 200] });
    row("Saldo Real App", formatRupiah(saldoRealApp), { leftColor: [200, 30, 30], rightColor: [200, 30, 30] });
    row("Selisih", formatRupiah(selisih), { leftColor: selisih >= 0 ? [16, 130, 90] : [220, 50, 50], rightColor: selisih >= 0 ? [16, 130, 90] : [220, 50, 50], bold: true });
    y += 4;

    if (transactions.length > 0) {
      sectionHeader("Detail Transaksi", 70, 70, 80);

      const colW = [10, 35, 42, 35, 64];
      const colX = [ml, ml + colW[0], ml + colW[0] + colW[1], ml + colW[0] + colW[1] + colW[2], ml + colW[0] + colW[1] + colW[2] + colW[3]];
      const headers = ["#", "Kategori", "Nominal", "Admin", "Keterangan"];
      checkPage(14);

      pdf.setFillColor(55, 55, 65);
      pdf.rect(ml, y, cw, 7, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold");
      headers.forEach((h, i) => pdf.text(h, colX[i] + 2, y + 4.8));
      y += 7;

      pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal");
      transactions.forEach((tx, idx) => {
        checkPage(7);
        const bgFill = idx % 2 === 0;
        if (bgFill) {
          pdf.setFillColor(248, 248, 252);
          pdf.rect(ml, y, cw, 6.5, "F");
        }
        pdf.setTextColor(60, 60, 60);
        pdf.text(String(idx + 1), colX[0] + 2, y + 4.3);
        pdf.text(tx.category || "-", colX[1] + 2, y + 4.3);
        pdf.text(formatRupiah(tx.nominal || 0), colX[2] + 2, y + 4.3);
        pdf.text(formatRupiah(tx.admin || 0), colX[3] + 2, y + 4.3);
        const ket = (tx.keterangan || "-").substring(0, 30);
        pdf.text(ket, colX[4] + 2, y + 4.3);
        y += 6.5;
      });
    }

    y += 6;
    checkPage(8);
    pdf.setTextColor(160, 160, 170);
    pdf.setFontSize(7); pdf.setFont("helvetica", "normal");
    const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    pdf.text(`Dicetak: ${nowStr} | Alfaza Link POS`, pw / 2, y, { align: "center" });

    return pdf;
  };

  const handleExportPDF = async () => {
    try {
      const pdf = await buildPdf();
      pdf.save(`laporan-${user?.name}-${date}.pdf`);
    } catch { toast({ title: "Gagal export PDF", variant: "destructive" }); }
  };

  const handleBagikan = async () => {
    try {
      const pdf = await buildPdf();
      const blob = pdf.output("blob");
      const file = new File([blob], `laporan-${user?.name}-${date}.pdf`, { type: "application/pdf" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Laporan Harian Alfaza Cell" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
      }
    } catch { toast({ title: "Gagal bagikan PDF", variant: "destructive" }); }
  };

  if (loading) {
    return (
      <div className="px-3 pt-3">
        <Header />
        <div className="flex flex-col items-center gap-3 py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-gray-400">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-24">
      <Header />

      {isOwner && (
        <>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button onClick={() => setViewMode("day")} className={`py-2.5 rounded-full text-xs font-bold transition ${viewMode === "day" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-500 border border-gray-200"}`}>
              Per Hari
            </button>
            <button onClick={() => setViewMode("month")} className={`py-2.5 rounded-full text-xs font-bold transition ${viewMode === "month" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-500 border border-gray-200"}`}>
              Per Bulan
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide">
            {["Semua", ...kasirList.map(k => k.name)].map(name => (
              <button
                key={name}
                onClick={() => setKasirFilter(name)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold transition flex-shrink-0 ${kasirFilter === name ? "bg-blue-600 text-white shadow" : "bg-white text-gray-500 border border-gray-200"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="flex items-center gap-2 mb-3">
        {viewMode === "day" ? (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-xs bg-white outline-none"
          />
        ) : (
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-xs bg-white outline-none"
          />
        )}
        <button
          onClick={() => loadData()}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-full text-xs font-bold active:scale-95 transition"
        >
          Tampilkan
        </button>
      </div>

      {/* GRUP 1: Rincian + Total Penjualan + Total Uang Cash */}
      <div ref={reportRef} className="rounded-2xl border-2 border-gray-900 overflow-hidden mb-3">
        {categoryItems.length > 0 && (
          <>
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2.5">
              <h3 className="text-white font-bold text-sm flex items-center gap-1.5">📊 Rincian Kategori</h3>
            </div>
            <div className="px-4 py-3 bg-white space-y-2 border-b-2 border-gray-900">
              {categoryItems.map(c => (
                <div key={c.label} className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-800">{c.label} <span className="text-gray-400 font-normal">({c.count}x)</span></span>
                  <span className="text-sm font-bold text-blue-700">{formatRupiah(c.total)}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 px-4 py-2.5 flex justify-between items-center">
          <h3 className="text-white font-bold text-sm flex items-center gap-1.5">📈 TOTAL PENJUALAN</h3>
          <span className="text-white font-extrabold text-base">{formatRupiah(totalPenjualan)}</span>
        </div>
        <div className="bg-white px-4 space-y-0 border-b-2 border-gray-900">
          {tarikTx.length > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-700 flex items-center gap-1">💸 <strong className="text-emerald-700">Tarik Tunai</strong><span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold ml-1">{tarikTx.length}x</span></span>
              <span className="text-sm font-bold text-red-500">-{formatRupiah(totalTarik)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700 flex items-center gap-1">💰 <strong className="text-emerald-700">Sisa Cash Penjualan</strong></span>
            <span className="text-sm font-bold text-emerald-700">{formatRupiah(sisaCashPenjualan)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-sm text-gray-700 flex items-center gap-1">📱 <strong className="text-amber-600">Admin</strong></span>
            <span className="text-sm font-bold text-amber-600">{formatRupiah(totalAdmin)}</span>
          </div>
          {aksTx.length > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-700 flex items-center gap-1">🎧 <strong className="text-rose-500">Aksesoris</strong><span className="text-[10px] bg-rose-100 text-rose-500 px-1.5 py-0.5 rounded-full font-bold ml-1">{aksTx.length}x</span></span>
              <span className="text-sm font-bold text-rose-500">{formatRupiah(totalAks)}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-700 flex items-center gap-1">🏷️ <strong className="text-purple-600">Non Tunai</strong></span>
            <span className="text-sm font-bold text-purple-600">{formatRupiah(totalNonTunai)}</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-yellow-400 px-4 py-3">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-gray-900 font-extrabold text-sm flex items-center gap-1.5">💰 TOTAL UANG CASH</h3>
            <span className="text-gray-900 font-extrabold text-xl">{formatRupiah(sisaCashTotal)}</span>
          </div>
          <p className="text-[10px] text-gray-800">Sisa Cash: {formatRupiah(sisaCashPenjualan)} + Admin: {formatRupiah(totalAdmin)} + Aks: {formatRupiah(totalAks)}</p>
        </div>
      </div>

      {/* GRUP 2: Jurnal Penyesuaian + Saldo & Selisih */}
      <div className="rounded-2xl border-2 border-gray-900 overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-2.5">
          <h3 className="text-white font-bold text-sm flex items-center gap-1.5">📒 Jurnal Penyesuaian</h3>
        </div>
        <div className="bg-white px-4 space-y-0 border-b-2 border-gray-900">
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-900">
            <span className="text-sm text-gray-700">💳 <strong>Total Tambah/Isi Saldo Bank</strong></span>
            <span className="text-sm font-extrabold text-blue-700">{formatRupiah(totalIsiSaldoBank)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-300">
            <span className="text-sm text-gray-700">Sisa Saldo Bank (Catatan)</span>
            <span className="text-sm font-bold text-gray-800">{formatRupiah(sisaSaldoBank)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-900">
            <span className="text-sm text-gray-700">Total Penjualan</span>
            <span className="text-sm font-bold text-gray-800">{formatRupiah(totalPenjualan)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-900">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm font-extrabold text-gray-900">{formatRupiah(sisaSaldoBank + totalPenjualan)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-bold text-gray-700">Selisih</span>
            <span className={`text-sm font-extrabold ${(totalIsiSaldoBank - (sisaSaldoBank + totalPenjualan)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRupiah(totalIsiSaldoBank - (sisaSaldoBank + totalPenjualan))}</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-700 to-green-500 px-4 py-2.5">
          <h3 className="text-white font-bold text-sm flex items-center gap-1.5">🏦 Saldo & Selisih</h3>
        </div>
        <div className="bg-white px-4 space-y-0">
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-900">
            <span className="text-sm text-gray-700 flex items-center gap-1">🏛️ <strong>Sisa Saldo Bank (Catatan)</strong></span>
            <span className="text-sm font-extrabold text-blue-700">{formatRupiah(sisaSaldoBank)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b-2 border-gray-900">
            <span className="text-sm text-gray-700 flex items-center gap-1">📱 <strong>Saldo Real App</strong></span>
            <span className="text-sm font-extrabold text-red-600">{formatRupiah(saldoRealApp)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-700 flex items-center gap-1">🔄 <strong>Selisih</strong></span>
            <span className={`text-sm font-extrabold ${selisih >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatRupiah(selisih)}</span>
          </div>
        </div>
      </div>

      {/* Tombol aksi */}
      <div className="space-y-2.5 mt-2">
        <div className="grid grid-cols-2 gap-2.5">
          <button onClick={handleExportPDF} className="flex items-center justify-center gap-1.5 bg-red-500 text-white py-3 rounded-2xl font-bold text-xs shadow active:scale-95 transition">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleExportExcel} className="flex items-center justify-center gap-1.5 bg-green-600 text-white py-3 rounded-2xl font-bold text-xs shadow active:scale-95 transition">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
        <button onClick={handleBagikan} className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white py-3 rounded-2xl font-bold text-sm shadow active:scale-95 transition">
          <Share2 className="w-4 h-4" /> BAGIKAN (PDF)
        </button>
        <button onClick={handleResetSaldo} disabled={resetting} className="w-full flex items-center justify-center gap-1.5 bg-gray-900 text-white py-3.5 rounded-2xl font-bold text-sm shadow active:scale-95 transition disabled:opacity-50">
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} RESET SALDO (MANUAL)
        </button>
      </div>
    </div>
  );
}
