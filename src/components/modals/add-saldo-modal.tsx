import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addSaldo, addSaldoHistoryOnly, updateDailyNote, getUsers, type UserRecord } from "@/lib/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { formatThousands, parseThousands, formatRupiah, getWibDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Building2, Wallet, Smartphone, Landmark, Users, ChevronDown } from "lucide-react";

const JENIS_TABS = [
  { id: "Bank", label: "Bank", icon: Building2, color: "bg-blue-600" },
  { id: "Cash", label: "Cash", icon: Wallet, color: "bg-emerald-600" },
  { id: "Real App", label: "Real App", icon: Smartphone, color: "bg-purple-600" },
  { id: "Sisa Saldo", label: "Sisa Saldo", icon: Landmark, color: "bg-amber-600" },
];

interface AddSaldoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kasirName: string;
  isOwnerMode?: boolean;
}

export function AddSaldoModal({ open, onOpenChange, kasirName, isOwnerMode }: AddSaldoModalProps) {
  const [jenis, setJenis] = useState("Bank");
  const [selectedKasir, setSelectedKasir] = useState(kasirName || "Semua Kasir");
  const [nominalDisplay, setNominalDisplay] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  
  const nominalRef = useRef<HTMLInputElement>(null);
  const ketRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = getWibDate();

  useEffect(() => {
    if (open && isOwnerMode) {
      getUsers().then(u => {
        const active = u.filter(user => user.role !== "owner" && user.isActive);
        setUsers(active);
        if (!selectedKasir || selectedKasir === "") {
          setSelectedKasir("Semua Kasir");
        }
      });
    }
  }, [open, isOwnerMode]);

  useEffect(() => {
    if (kasirName && !isOwnerMode) {
      setSelectedKasir(kasirName);
    }
  }, [kasirName, isOwnerMode]);

  const isNoteOnly = jenis === "Real App" || jenis === "Sisa Saldo";

  const processTopup = async (targetName: string, amount: number) => {
    if (jenis === "Sisa Saldo" || jenis === "Real App") {
      const field = jenis === "Sisa Saldo" ? "sisaSaldoBank" : "saldoRealApp";
      const label = jenis === "Sisa Saldo" ? "Sisa Saldo Bank" : "Saldo Real App";
      await updateDailyNote(targetName, today, field as any, amount);
      await addSaldoHistoryOnly(targetName, {
        jenis: jenis === "Sisa Saldo" ? "Sisa Saldo" : "Real App",
        nominal: amount,
        keterangan: keterangan || label,
      });
    } else {
      await addSaldo(targetName, {
        jenis,
        nominal: amount,
        keterangan: keterangan || `Tambah Saldo ${jenis}`,
      });
    }
  };

  const handleSubmit = async () => {
    const n = parseInt(parseThousands(nominalDisplay));
    if (!n || n <= 0) {
      toast({ title: "Nominal harus diisi", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (isOwnerMode && selectedKasir === "Semua Kasir") {
        const activeKasirs = users.filter(u => u.role !== "owner" && u.isActive);
        if (activeKasirs.length === 0) {
          toast({ title: "Tidak ada kasir aktif", variant: "destructive" });
          setSaving(false);
          return;
        }
        await Promise.all(activeKasirs.map(u => processTopup(u.name, n)));
        toast({ title: `Berhasil menambah saldo ke ${activeKasirs.length} kasir` });
      } else {
        const target = isOwnerMode ? selectedKasir : kasirName;
        await processTopup(target, n);
        toast({ title: `Saldo ${target} berhasil ditambahkan` });
      }
      
      queryClient.invalidateQueries();
      setNominalDisplay("");
      setKeterangan("");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getPlaceholder = () => {
    if (jenis === "Sisa Saldo") return "Sisa Saldo Bank";
    if (jenis === "Real App") return "Nominal Real App";
    return "Nominal Saldo";
  };

  const getButtonText = () => {
    if (saving) return "MEMPROSES...";
    if (jenis === "Sisa Saldo") return "SIMPAN SISA SALDO";
    if (jenis === "Real App") return "SIMPAN REAL APP";
    return "TAMBAH SALDO";
  };

  const getInfoText = () => {
    if (jenis === "Sisa Saldo") return "Catat sisa saldo bank (catatan manual). Nilai akan diakumulasi dan tampil di laporan.";
    if (jenis === "Real App") return "Catat saldo real app (catatan manual). Nilai akan diakumulasi dan tampil di laporan.";
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm mx-auto p-0 overflow-hidden">
        <DialogHeader className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-4 pb-3">
          <DialogTitle className="text-lg font-extrabold">+ Tambah Saldo</DialogTitle>
          <p className="text-blue-200 text-[11px]">
            {isOwnerMode ? (selectedKasir === "Semua Kasir" ? "Semua Kasir" : `Kasir: ${selectedKasir}`) : `Kasir: ${kasirName}`}
          </p>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {isOwnerMode && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Pilih Kasir Tujuan
              </label>
              <div className="relative">
                <select
                  value={selectedKasir}
                  onChange={(e) => setSelectedKasir(e.target.value)}
                  className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 outline-none appearance-none focus:border-blue-500 transition-all"
                >
                  <option value="Semua Kasir">Semua Kasir</option>
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {JENIS_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = jenis === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setJenis(tab.id)}
                  className={`py-3 rounded-xl text-[10px] font-bold flex flex-col items-center gap-1.5 border-2 transition-all ${
                    isActive
                      ? `${tab.color} text-white border-transparent shadow-md`
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {isNoteOnly && (
            <div className={`${jenis === "Sisa Saldo" ? "bg-amber-50 border-amber-200" : "bg-purple-50 border-purple-200"} border rounded-xl px-3 py-2`}>
              <p className={`text-[11px] ${jenis === "Sisa Saldo" ? "text-amber-700" : "text-purple-700"} font-semibold`}>{getInfoText()}</p>
            </div>
          )}

          <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-3 h-14 bg-gray-50/50">
            <span className="text-blue-600 font-bold text-sm">Rp</span>
            <input
              ref={nominalRef}
              type="text"
              inputMode="numeric"
              placeholder={getPlaceholder()}
              value={nominalDisplay}
              onChange={(e) => setNominalDisplay(formatThousands(e.target.value))}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); isNoteOnly ? handleSubmit() : ketRef.current?.focus(); } }}
              className="flex-1 bg-transparent outline-none text-xl font-bold text-gray-800 placeholder:text-gray-400 placeholder:font-normal placeholder:text-base"
            />
          </div>

          {!isNoteOnly && (
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 h-11 bg-gray-50/50">
              <span className="text-blue-400 text-sm">📝</span>
              <input
                ref={ketRef}
                placeholder="Keterangan (opsional)"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSubmit(); } }}
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-12 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 active:scale-[0.98] transition disabled:opacity-50"
          >
            {getButtonText()}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
