import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Pencil, X, CreditCard, Plus, Minus, CloudUpload, Loader2, Calendar } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getStokVoucher, syncStokVoucher, getSettings } from "@/lib/firestore";
import { getWibDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

interface VoucherItem { id: number; name: string; price: number; awal: number; akhir: number; }
interface QrisItem { id: number; provider: string; nama: string; harga: number; qty: number; }

const initialDataVoucher: Record<string, VoucherItem[]> = {
  'TRI': [{ id: 101, name: 'AON 1.5GB', price: 15000, awal: 10, akhir: 10 }],
  'TELKOMSEL': [{ id: 201, name: '4GB-1H', price: 8000, awal: 10, akhir: 10 }],
  'AXIS': [{ id: 301, name: '2GB-1H', price: 8000, awal: 5, akhir: 4 }, { id: 302, name: '5GB-5H', price: 10000, awal: 5, akhir: 5 }],
  'XL': [{ id: 401, name: 'Xtra Combo 5GB', price: 25000, awal: 5, akhir: 5 }],
  'SMARTFREN': [{ id: 501, name: 'Unlimited Harian', price: 15000, awal: 8, akhir: 8 }],
  'IM3': [{ id: 601, name: 'Freedom 3GB', price: 15000, awal: 10, akhir: 10 }]
};

export default function StokVoucher() {
  const { user } = useAuth();
  const { toast } = useToast();
  const kasirName = user?.name || "Kasir";
  const [shopName, setShopName] = useState("KASIR CUBE");
  const [selectedDate, setSelectedDate] = useState(getWibDate());
  const storageKeyVoucher = `cube_stok_voucher_${kasirName}_${selectedDate}`;
  const storageKeyQris = `cube_stok_qris_${kasirName}_${selectedDate}`;
  const [dataVoucher, setDataVoucher] = useState<Record<string, VoucherItem[]>>(initialDataVoucher);
  const [dataQris, setDataQris] = useState<QrisItem[]>([]);
  const [providersEditState, setProvidersEditState] = useState<Record<string, boolean>>({});
  const [activeEditingCell, setActiveEditingCell] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState<{ [key: string]: { name: string; price: string; awal: string } }>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => { getSettings().then(s => setShopName(s.shopName)).catch(() => {}); }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const savedVoucher = localStorage.getItem(storageKeyVoucher);
      const savedQris = localStorage.getItem(storageKeyQris);
      if (savedVoucher) {
        setDataVoucher(JSON.parse(savedVoucher));
        setDataQris(savedQris ? JSON.parse(savedQris) : []);
        setIsLoading(false);
      } else {
        setIsSyncing(true);
        try {
          const cloudData = await getStokVoucher(kasirName, selectedDate);
          if (cloudData) {
            setDataVoucher(cloudData.dataVoucher);
            setDataQris(cloudData.dataQris);
            setLastSync(new Date(cloudData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else { setDataVoucher(initialDataVoucher); setDataQris([]); }
        } catch { setDataVoucher(initialDataVoucher); setDataQris([]); }
        finally { setIsSyncing(false); setIsLoading(false); }
      }
    };
    loadData();
  }, [selectedDate, kasirName, storageKeyVoucher, storageKeyQris]);

  // Auto-sync logic (Debounced 1.5 detik)
  useEffect(() => {
    if (isLoading) return;
    
    // Selalu simpan ke local storage secara instan
    localStorage.setItem(storageKeyVoucher, JSON.stringify(dataVoucher));
    localStorage.setItem(storageKeyQris, JSON.stringify(dataQris));
    
    // Debounce cloud sync
    const timeoutId = setTimeout(() => {
      setIsSyncing(true);
      syncStokVoucher(kasirName, selectedDate, dataVoucher, dataQris)
        .then(() => {
          setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch(() => {})
        .finally(() => setIsSyncing(false));
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [dataVoucher, dataQris, storageKeyVoucher, storageKeyQris, isLoading, kasirName, selectedDate]);

  const toggleEditProvider = (p: string) => setProvidersEditState(prev => ({ ...prev, [p]: !prev[p] }));

  const updateProductDetail = (provider: string, index: number, field: keyof VoucherItem, value: string | number) => {
    setDataVoucher(prev => { const n = { ...prev }; const item = { ...n[provider][index] }; if (field === 'price') item.price = parseInt(value as string) || 0; else if (field === 'name') item.name = value as string; n[provider][index] = item; return n; });
  };

  const updateStok = (provider: string, index: number, field: 'awal' | 'akhir', change: number) => {
    setDataVoucher(prev => { const n = { ...prev }; const item = { ...n[provider][index] }; item[field] = Math.max(0, item[field] + change); n[provider][index] = item; return n; });
  };

  const jualQris = (provider: string, idx: number) => {
    const item = dataVoucher[provider][idx];
    if (item.akhir <= 0) { alert("Stok habis!"); return; }
    setDataVoucher(prev => { const n = { ...prev }; n[provider][idx] = { ...n[provider][idx], akhir: n[provider][idx].akhir - 1 }; return n; });
    setDataQris(prev => { const ei = prev.findIndex(q => q.nama === item.name && q.provider === provider); if (ei >= 0) { const n = [...prev]; n[ei] = { ...n[ei], qty: n[ei].qty + 1 }; return n; } return [...prev, { id: Date.now(), provider, nama: item.name, harga: item.price, qty: 1 }]; });
  };

  const editQris = (id: number) => {
    const q = dataQris.find(x => x.id === id); if (!q) return;
    const input = prompt(`Edit Qty untuk ${q.nama} (0 = hapus):`, q.qty.toString()); if (input === null) return;
    const newQty = parseInt(input); if (isNaN(newQty) || newQty < 0) { alert("Tidak valid"); return; }
    const item = dataVoucher[q.provider]?.find(v => v.name === q.nama);
    if (newQty === 0) { if (item) setDataVoucher(prev => { const n = { ...prev }; const p = [...n[q.provider]]; const i = p.findIndex(v => v.name === q.nama); if (i >= 0) p[i] = { ...p[i], akhir: p[i].akhir + q.qty }; n[q.provider] = p; return n; }); setDataQris(prev => prev.filter(x => x.id !== id)); }
    else { const selisih = newQty - q.qty; if (item && item.akhir - selisih < 0) { alert("Stok tidak mencukupi"); return; } if (item) setDataVoucher(prev => { const n = { ...prev }; const p = [...n[q.provider]]; const i = p.findIndex(v => v.name === q.nama); if (i >= 0) p[i] = { ...p[i], akhir: p[i].akhir - selisih }; n[q.provider] = p; return n; }); setDataQris(prev => { const n = [...prev]; const i = n.findIndex(x => x.id === id); if (i >= 0) n[i] = { ...n[i], qty: newQty }; return n; }); }
  };

  const tambahProduk = (provider: string) => {
    const d = newProduct[provider] || { name: '', price: '', awal: '' };
    if (!d.name || !d.price) { alert("Isi nama & harga"); return; }
    const price = parseInt(d.price); const awal = parseInt(d.awal) || 0;
    setDataVoucher(prev => ({ ...prev, [provider]: [...prev[provider], { id: Date.now(), name: d.name, price, awal, akhir: awal }] }));
    setNewProduct(prev => ({ ...prev, [provider]: { name: '', price: '', awal: '' } }));
  };

  const updateNewProductField = (provider: string, field: 'name' | 'price' | 'awal', value: string) => {
    setNewProduct(prev => ({ ...prev, [provider]: { ...(prev[provider] || { name: '', price: '', awal: '' }), [field]: value } }));
  };

  let totalQtyLaku = 0, totalUang = 0, totalQrisUang = 0;
  dataQris.forEach(i => { totalQrisUang += i.harga * i.qty; });
  Object.values(dataVoucher).forEach(items => items.forEach(i => { const l = Math.max(0, i.awal - i.akhir); totalQtyLaku += l; totalUang += l * i.price; }));
  const totalTunai = totalUang - totalQrisUang;

  const providerColor = (p: string) => ({ 'TRI': 'bg-purple-100 text-purple-900', 'TELKOMSEL': 'bg-red-500 text-white', 'AXIS': 'bg-purple-600 text-white', 'XL': 'bg-blue-800 text-white', 'SMARTFREN': 'bg-pink-200 text-pink-900', 'IM3': 'bg-yellow-300 text-yellow-900' }[p] || 'bg-gray-200 text-gray-800');

  const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(selectedDate));

  return (
    <div className="min-h-screen bg-gray-50 pb-24" onClick={(e) => { if (!(e.target as HTMLElement).closest('.editable-cell')) setActiveEditingCell(null); }}>
      <div className="bg-gradient-to-r from-blue-800 to-blue-500 text-white shadow-lg sticky top-0 z-10">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <button onClick={() => window.history.back()} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-xs font-black text-blue-200 uppercase tracking-wider">{shopName}</h1>
                <h2 className="text-xl font-black">STOK VOUCHER</h2>
                <p className="text-[10px] text-blue-100">{kasirName}</p>
              </div>
            </div>
            <div className="flex flex-col items-center bg-white/10 px-3 py-1.5 rounded-lg border border-white/20">
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mb-0.5 text-blue-200" /> : <CloudUpload className="w-4 h-4 mb-0.5 text-blue-200" />}
              <span className="text-[8px] text-blue-100">{isSyncing ? 'Menyimpan...' : (lastSync ? `Tersimpan: ${lastSync}` : 'Tersimpan Online')}</span>
            </div>
          </div>
          <div className="flex items-center justify-between bg-white/10 p-2.5 rounded-xl border border-white/10">
            <div><span className="text-[10px] text-blue-200 font-semibold uppercase block">Tanggal</span><span className="text-sm font-bold">{formattedDate}</span></div>
            <div className="relative">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }} />
              <button className="bg-white text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 pointer-events-none"><Calendar className="w-3.5 h-3.5" /> Ubah</button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white border border-gray-200 rounded-xl p-2 text-center shadow-sm"><div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Laku</div><div className="text-lg font-black text-gray-800">{totalQtyLaku}</div></div>
              <div className="bg-white border border-gray-200 rounded-xl p-2 text-center shadow-sm"><div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Tunai</div><div className="text-sm font-black text-emerald-500 truncate">{formatRupiah(totalTunai)}</div></div>
              <div className="bg-white border border-gray-200 rounded-xl p-2 text-center shadow-sm"><div className="text-[10px] text-gray-500 font-bold uppercase mb-1">QRIS</div><div className="text-sm font-black text-sky-500 truncate">{formatRupiah(totalQrisUang)}</div></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[300px]">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase w-2/5">Produk</th>
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase text-center">Awal</th>
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase text-center">Akhir</th>
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase text-right">Harga</th>
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase text-center">Laku</th>
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase text-right">Total</th>
                      <th className="p-2 text-[10px] font-bold text-gray-600 uppercase text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(dataVoucher).map(provider => {
                      const isEditing = !!providersEditState[provider];
                      return (
                        <React.Fragment key={provider}>
                          <tr className={providerColor(provider)}>
                            <td colSpan={7} className="p-0">
                              <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => toggleEditProvider(provider)}>
                                <span className="bg-white/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                  {isEditing ? <><X className="w-3 h-3" /> Tutup</> : <><Pencil className="w-3 h-3" /> Edit</>}
                                </span>
                                <span className="font-bold text-xs tracking-wider">{provider}</span>
                              </div>
                            </td>
                          </tr>
                          {dataVoucher[provider].map((item, idx) => {
                            const laku = Math.max(0, item.awal - item.akhir);
                            const renderCell = (field: 'awal' | 'akhir', val: number) => {
                              const cellId = `${provider}-${idx}-${field}`;
                              if (activeEditingCell === cellId) return (
                                <div className="flex items-center justify-center border border-gray-300 rounded h-6 bg-white editable-cell">
                                  <button className="bg-gray-100 px-1.5 h-full" onClick={() => updateStok(provider, idx, field, -1)}><Minus className="w-3 h-3" /></button>
                                  <span className="text-xs font-bold w-6 text-center">{val}</span>
                                  <button className="bg-gray-100 px-1.5 h-full" onClick={() => updateStok(provider, idx, field, 1)}><Plus className="w-3 h-3" /></button>
                                </div>
                              );
                              return <span className="font-bold text-xs bg-white border border-gray-200 px-2 py-0.5 rounded cursor-pointer block mx-auto w-max editable-cell" onClick={(e) => { e.stopPropagation(); setActiveEditingCell(cellId); }}>{val}</span>;
                            };
                            return (
                              <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-blue-50' : 'bg-slate-100'} border-b border-gray-100`}>
                                <td className="p-2">{isEditing ? <input type="text" className="w-full text-xs font-bold border border-blue-300 rounded px-1 py-0.5" value={item.name} onChange={(e) => updateProductDetail(provider, idx, 'name', e.target.value)} /> : <span className="text-xs font-bold">{item.name}</span>}</td>
                                <td className="p-1 text-center">{renderCell('awal', item.awal)}</td>
                                <td className="p-1 text-center">{renderCell('akhir', item.akhir)}</td>
                                <td className="p-2 text-right">{isEditing ? <input type="number" className="w-full text-xs font-bold border border-blue-300 rounded px-1 py-0.5 text-right" value={item.price} onChange={(e) => updateProductDetail(provider, idx, 'price', e.target.value)} /> : <span className="text-[10px] text-gray-500">{item.price / 1000}k</span>}</td>
                                <td className="p-2 text-center font-black text-blue-600 text-xs">{laku}</td>
                                <td className="p-2 text-right font-black text-emerald-600 text-[10px]">{laku > 0 ? formatRupiah(laku * item.price) : '-'}</td>
                                <td className="p-2 text-center">{!isEditing && <button className="bg-sky-500 text-white text-[9px] font-black px-1.5 py-1 rounded active:scale-95 transition-transform" onClick={() => jualQris(provider, idx)}>QRIS</button>}</td>
                              </tr>
                            );
                          })}
                          {isEditing && (
                            <tr className="bg-gray-100">
                              <td colSpan={2} className="p-1.5"><input type="text" placeholder="Nama" className="w-full text-xs border border-gray-300 rounded px-2 py-1" value={newProduct[provider]?.name || ''} onChange={(e) => updateNewProductField(provider, 'name', e.target.value)} /></td>
                              <td className="p-1.5"><input type="number" placeholder="Stok" className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-center" value={newProduct[provider]?.awal || ''} onChange={(e) => updateNewProductField(provider, 'awal', e.target.value)} /></td>
                              <td className="p-1.5"><input type="number" placeholder="Harga" className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-right" value={newProduct[provider]?.price || ''} onChange={(e) => updateNewProductField(provider, 'price', e.target.value)} /></td>
                              <td colSpan={3} className="p-1.5"><button className="w-full bg-blue-600 text-white text-[10px] font-bold py-1.5 rounded" onClick={() => tambahProduk(provider)}>Tambah</button></td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-20">
              <div className="bg-gray-100 border-b border-gray-200 p-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-600" />
                <h2 className="font-bold text-xs text-gray-700 uppercase">Riwayat Non-Tunai (QRIS)</h2>
              </div>
              <table className="w-full text-left">
                <thead><tr className="border-b border-gray-100"><th className="p-2 text-[10px] font-bold text-gray-500 uppercase">Produk</th><th className="p-2 text-[10px] font-bold text-gray-500 uppercase text-center">Qty</th><th className="p-2 text-[10px] font-bold text-gray-500 uppercase text-right">Subtotal</th><th className="p-2 text-[10px] font-bold text-gray-500 uppercase text-center">Aksi</th></tr></thead>
                <tbody>
                  {dataQris.length === 0 ? <tr><td colSpan={4} className="p-4 text-center text-xs text-gray-400 italic">Belum ada penjualan non-tunai.</td></tr> : dataQris.map(item => (
                    <tr key={item.id} className="border-b border-gray-50">
                      <td className="p-2 text-xs font-bold text-gray-700">{item.nama}</td>
                      <td className="p-2 text-xs font-bold text-center">{item.qty}</td>
                      <td className="p-2 text-[11px] font-black text-sky-500 text-right">{formatRupiah(item.harga * item.qty)}</td>
                      <td className="p-2 text-center"><button className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 mx-auto" onClick={() => editQris(item.id)}><Pencil className="w-3 h-3" /> Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-gray-50 border-t-2 border-gray-200 p-3 text-right">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Total Keseluruhan</div>
                <div className="text-lg font-black text-gray-800">{formatRupiah(totalUang)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
