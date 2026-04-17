import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { getBalance, createTransaction, type BalanceRecord } from "@/lib/firestore";
import { formatRupiah, formatThousands, parseThousands, getWibDate } from "@/lib/utils";
import { CreditCard, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NonTunai() {
  const { user } = useAuth();
  const [nominalDisplay, setNominalDisplay] = useState("");
  const [adminDisplay, setAdminDisplay] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const nominalRef = useRef<HTMLInputElement>(null);
  const adminRef = useRef<HTMLInputElement>(null);
  const ketRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const handleProses = async () => {
    if (!user) return;
    const n = parseInt(parseThousands(nominalDisplay));
    const a = parseInt(parseThousands(adminDisplay)) || 0;
    if (!n || n <= 0) {
      toast({ title: "Nominal harus diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const now = new Date();
      await createTransaction({
        kasirName: user.name,
        category: "NON TUNAI",
        nominal: n,
        nominalTunai: 0,
        nominalNonTunai: n,
        admin: a,
        adminTunai: 0,
        adminNonTunai: a,
        keterangan,
        transDate: getWibDate(),
        transTime: now.toTimeString().substring(0, 5),
        paymentMethod: "NON-TUNAI",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setNominalDisplay("");
      setAdminDisplay("");
      setKeterangan("");
      nominalRef.current?.focus();
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 via-purple-50 to-white">
      <div className="p-4">
        <Header />

        <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white p-4 rounded-2xl mb-5 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 text-base font-extrabold">
            <CreditCard className="w-5 h-5" />
            Khusus Pembayaran Non Tunai
          </div>
        </div>

        {saved && (
          <div className="bg-green-50 border-2 border-green-300 text-green-700 p-3 rounded-2xl mb-4 text-sm font-bold flex items-center justify-center gap-2 animate-in fade-in">
            <Check className="w-5 h-5" /> BERHASIL disimpan!
          </div>
        )}

        <div className="bg-white rounded-3xl p-5 shadow-md border border-purple-100 mb-5">
          <div className="space-y-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-purple-600 font-extrabold text-sm">Rp</span>
              </div>
              <input
                ref={nominalRef}
                type="text"
                inputMode="numeric"
                placeholder="Nominal"
                value={nominalDisplay}
                onChange={(e) => setNominalDisplay(formatThousands(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adminRef.current?.focus(); } }}
                className="flex-1 bg-transparent outline-none text-lg font-bold text-gray-800 placeholder:text-gray-400 border-b border-gray-200 pb-2"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <span className="text-amber-600 font-extrabold text-sm">%</span>
              </div>
              <input
                ref={adminRef}
                type="text"
                inputMode="numeric"
                placeholder="Admin"
                value={adminDisplay}
                onChange={(e) => setAdminDisplay(formatThousands(e.target.value))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ketRef.current?.focus(); } }}
                className="flex-1 bg-transparent outline-none text-lg font-bold text-gray-800 placeholder:text-gray-400 border-b border-gray-200 pb-2"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-lg">📝</span>
              </div>
              <input
                ref={ketRef}
                placeholder="Keterangan"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleProses(); } }}
                className="flex-1 bg-transparent outline-none text-lg font-bold text-gray-800 placeholder:text-gray-400 border-b border-gray-200 pb-2"
              />
            </div>
          </div>

          <button
            onClick={handleProses}
            disabled={saving}
            className="w-full h-14 rounded-2xl font-extrabold text-base bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/30 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            {saving ? "MEMPROSES..." : "SIMPAN NON TUNAI"}
          </button>
        </div>
      </div>
    </div>
  );
}
