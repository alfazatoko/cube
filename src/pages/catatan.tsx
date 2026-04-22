import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Header } from "@/components/layout/header";
import { getHutangList, createHutang, updateHutang, deleteHutang, getKontakList, createKontak, updateKontak, deleteKontak, type HutangRecord, type KontakRecord } from "@/lib/firestore";
import { formatRupiah, formatThousands, parseThousands, getWibDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Receipt, BookUser, Plus, Trash2, Edit, Check, Search, Ban, Phone, Copy, Camera, Image as ImageIcon, X } from "lucide-react";

export default function Catatan() {
  const { user } = useAuth();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<"kasbon" | "kontak">(tabParam === "kontak" ? "kontak" : "kasbon");

  const [hutangList, setHutangList] = useState<HutangRecord[]>([]);
  const [kontakList, setKontakList] = useState<KontakRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<HutangRecord | KontakRecord | null>(null);

  const [nama, setNama] = useState("");
  const [nominalDisplay, setNominalDisplay] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [nomor, setNomor] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLunas, setShowLunas] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);
  const [selectedFoto, setSelectedFoto] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [h, k] = await Promise.all([getHutangList(user?.name), getKontakList(user?.name)]);
      setHutangList(h);
      setKontakList(k);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setNama("");
    setNominalDisplay("");
    setKeterangan("");
    setNomor("");
    setKeterangan("");
    setFoto(null);
    setEditItem(null);
    setShowForm(false);
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Max dimensions
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Quality compression until < 200kb
        let quality = 0.7;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        
        while (dataUrl.length > 200 * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        setFoto(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveKasbon = async () => {
    if (!nama.trim()) { toast({ title: "Nama harus diisi", variant: "destructive" }); return; }
    const n = parseInt(parseThousands(nominalDisplay));
    if (!n || n <= 0) { toast({ title: "Nominal harus diisi", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editItem && "nominal" in editItem) {
        await updateHutang(editItem.id, { nama, nominal: n, keterangan, foto }, user?.name);
      } else {
        await createHutang({ nama, nominal: n, keterangan, tanggal: getWibDate(), lunas: false, createdBy: user?.name, foto }, user?.name);
      }
      toast({ title: editItem ? "Kasbon diperbarui" : "Kasbon ditambahkan" });
      resetForm();
      await loadData();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveKontak = async () => {
    if (!nama.trim()) { toast({ title: "Nama harus diisi", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (editItem && "nomor" in editItem) {
        await updateKontak(editItem.id, { nama, nomor, keterangan, foto }, user?.name);
      } else {
        await createKontak({ nama, nomor, keterangan, createdBy: user?.name, foto }, user?.name);
      }
      toast({ title: editItem ? "Kontak diperbarui" : "Kontak ditambahkan" });
      resetForm();
      await loadData();
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDeleteKasbon = async (id: string) => {
    if (!confirm("Hapus kasbon ini?")) return;
    try {
      await deleteHutang(id, user?.name);
      toast({ title: "Kasbon dihapus" });
      await loadData();
    } catch { toast({ title: "Gagal menghapus", variant: "destructive" }); }
  };

  const handleDeleteKontak = async (id: string) => {
    if (!confirm("Hapus kontak ini?")) return;
    try {
      await deleteKontak(id, user?.name);
      toast({ title: "Kontak dihapus" });
      await loadData();
    } catch { toast({ title: "Gagal menghapus", variant: "destructive" }); }
  };

  const handleLunas = async (h: HutangRecord) => {
    try {
      await updateHutang(h.id, { lunas: !h.lunas, tglLunas: !h.lunas ? getWibDate() : undefined }, user?.name);
      toast({ title: h.lunas ? "Dibatalkan lunas" : "Ditandai lunas" });
      await loadData();
    } catch { toast({ title: "Gagal", variant: "destructive" }); }
  };

  const openEditKasbon = (h: HutangRecord) => {
    setEditItem(h);
    setNama(h.nama);
    setNominalDisplay(formatThousands(String(h.nominal)));
    setKeterangan(h.keterangan || "");
    setFoto(h.foto || null);
    setShowForm(true);
  };

  const openEditKontak = (k: KontakRecord) => {
    setEditItem(k);
    setNama(k.nama);
    setNomor(k.nomor || "");
    setKeterangan(k.keterangan || "");
    setFoto(k.foto || null);
    setShowForm(true);
  };

  const filteredHutang = useMemo(() => {
    let list = hutangList;
    if (!showLunas) list = list.filter(h => !h.lunas);
    if (searchText) {
      const q = searchText.toLowerCase();
      list = list.filter(h => h.nama.toLowerCase().includes(q) || (h.keterangan || "").toLowerCase().includes(q));
    }
    return list;
  }, [hutangList, showLunas, searchText]);

  const filteredKontak = useMemo(() => {
    if (!searchText) return kontakList;
    const q = searchText.toLowerCase();
    return kontakList.filter(k => k.nama.toLowerCase().includes(q) || (k.nomor || "").toLowerCase().includes(q));
  }, [kontakList, searchText]);

  const totalHutang = filteredHutang.filter(h => !h.lunas).reduce((sum, h) => sum + h.nominal, 0);

  return (
    <div className="px-3 pt-3 pb-20">
      <Header />

      <div className="flex gap-2 mb-3">
        <button onClick={() => { setTab("kasbon"); resetForm(); setSearchText(""); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition ${tab === "kasbon" ? "bg-emerald-600 text-white shadow" : "bg-white text-gray-500 border border-gray-200"}`}>
          <Receipt className="w-4 h-4" /> Kasbon
        </button>
        <button onClick={() => { setTab("kontak"); resetForm(); setSearchText(""); }} className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-1 transition ${tab === "kontak" ? "bg-teal-600 text-white shadow" : "bg-white text-gray-500 border border-gray-200"}`}>
          <BookUser className="w-4 h-4" /> Kontak
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Cari..." className="w-full pl-9 pr-3 py-2 rounded-full border-2 border-gray-200 text-sm bg-white outline-none" />
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 text-white rounded-full p-2 shadow">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {tab === "kasbon" && (
        <>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-500 font-semibold">Total Hutang: <strong className="text-red-600">{formatRupiah(totalHutang)}</strong></span>
            <button onClick={() => setShowLunas(!showLunas)} className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${showLunas ? 'bg-green-50 border-green-300 text-green-600' : 'bg-gray-50 border-gray-300 text-gray-500'}`}>
              {showLunas ? "Sembunyikan Lunas" : "Tampilkan Lunas"}
            </button>
          </div>

          {filteredHutang.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Receipt className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Tidak ada kasbon</p>
            </div>
          ) : (
            filteredHutang.map(h => (
              <div key={h.id} className={`bg-white rounded-2xl p-3.5 mb-2 shadow-sm border ${h.lunas ? 'border-green-200 bg-green-50/50' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <span className="font-bold text-sm text-gray-800">{h.nama}</span>
                    {h.keterangan && <p className="text-[11px] text-gray-500 mt-0.5">{h.keterangan}</p>}
                    {h.foto && (
                      <div className="mt-2 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer active:scale-95 transition" onClick={() => setSelectedFoto(h.foto || null)}>
                        <img src={h.foto} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Search className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`font-extrabold text-sm ${h.lunas ? 'text-green-600 line-through' : 'text-red-600'}`}>{formatRupiah(h.nominal)}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400">{h.tanggal}{h.lunas && h.tglLunas ? ` • Lunas: ${h.tglLunas}` : ""}</span>
                    {h.createdBy && <span className="text-[10px] text-blue-400 mt-0.5">Dibuat oleh: {h.createdBy}</span>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleLunas(h)} className={`text-[10px] px-2 py-1 rounded-lg font-bold ${h.lunas ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {h.lunas ? <Ban className="w-3 h-3 inline" /> : <Check className="w-3 h-3 inline" />} {h.lunas ? "Batal" : "Lunas"}
                    </button>
                    <button onClick={() => openEditKasbon(h)} className="text-[10px] px-2 py-1 rounded-lg font-bold bg-blue-100 text-blue-600"><Edit className="w-3 h-3 inline" /></button>
                    <button onClick={() => handleDeleteKasbon(h.id)} className="text-[10px] px-2 py-1 rounded-lg font-bold bg-red-100 text-red-600"><Trash2 className="w-3 h-3 inline" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {tab === "kontak" && (
        <>
          {filteredKontak.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <BookUser className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">Tidak ada kontak</p>
            </div>
          ) : (
            filteredKontak.map(k => (
              <div key={k.id} className="bg-white rounded-2xl p-3.5 mb-2 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-gray-800">{k.nama}</span>
                    {k.nomor && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-base font-bold text-blue-600 flex items-center gap-1"><Phone className="w-4 h-4" /> {k.nomor}</p>
                        <button onClick={() => { navigator.clipboard.writeText(k.nomor || ""); toast({ title: "Nomor disalin" }); }} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-0.5 active:scale-95 transition">
                          <Copy className="w-3 h-3" /> Salin
                        </button>
                      </div>
                    )}
                    {k.keterangan && <p className="text-[11px] text-gray-500 mt-0.5">{k.keterangan}</p>}
                    {k.foto && (
                      <div className="mt-2 relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 cursor-pointer active:scale-95 transition" onClick={() => setSelectedFoto(k.foto || null)}>
                        <img src={k.foto} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Search className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    )}
                    {k.createdBy && <p className="text-[10px] text-blue-400 mt-0.5">Dibuat oleh: {k.createdBy}</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0 ml-2">
                    <button onClick={() => openEditKontak(k)} className="text-[10px] px-2 py-1 rounded-lg font-bold bg-blue-100 text-blue-600"><Edit className="w-3 h-3 inline" /></button>
                    <button onClick={() => handleDeleteKontak(k.id)} className="text-[10px] px-2 py-1 rounded-lg font-bold bg-red-100 text-red-600"><Trash2 className="w-3 h-3 inline" /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-3">
              <h3 className="font-bold text-base">{editItem ? "Edit" : "Tambah"} {tab === "kasbon" ? "Kasbon" : "Kontak"}</h3>
              <button onClick={resetForm} className="text-xl text-gray-400">&times;</button>
            </div>
            <div className="space-y-3 mb-4">
              <input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              {tab === "kasbon" && (
                <input value={nominalDisplay} onChange={e => setNominalDisplay(formatThousands(e.target.value))} inputMode="numeric" placeholder="Nominal" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              )}
              {tab === "kontak" && (
                <input value={nomor} onChange={e => setNomor(e.target.value)} inputMode="tel" placeholder="Nomor HP" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              )}
              <input value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Keterangan" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none" />
              
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 py-3 rounded-xl cursor-pointer active:scale-95 transition border border-dashed border-slate-300">
                  <Camera className="w-4 h-4" />
                  <span className="text-xs font-bold">Ambil Foto</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
                </label>
                {foto && (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-gray-200">
                    <img src={foto} className="w-full h-full object-cover" />
                    <button onClick={() => setFoto(null)} className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button onClick={tab === "kasbon" ? handleSaveKasbon : handleSaveKontak} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold py-3 rounded-full text-sm disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      )}
      {/* Modal Preview Foto */}
      {selectedFoto && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setSelectedFoto(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full backdrop-blur-md">
            <X className="w-6 h-6" />
          </button>
          <img src={selectedFoto} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
          <div className="mt-6 flex gap-4">
             <button onClick={(e) => {
               e.stopPropagation();
               const link = document.createElement('a');
               link.href = selectedFoto;
               link.download = `foto-${Date.now()}.jpg`;
               link.click();
             }} className="bg-white/20 text-white px-6 py-2.5 rounded-full font-bold text-sm backdrop-blur-md flex items-center gap-2">
               Unduh Foto
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
