import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Printer, Share2, Plus, Trash2, Edit2, Save } from "lucide-react";
import { getSettings, type SettingsRecord } from "@/lib/firestore";
import { cn } from "@/lib/utils";

interface NotaItem {
  nama: string;
  harga: string;
  jumlah: string;
}

export default function Nota() {
  const [, setLocation] = useLocation();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState("");
  
  const [items, setItems] = useState<NotaItem[]>([
    { nama: "", harga: "", jumlah: "" }
  ]);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    // Load settings saat mount
    getSettings().then(setSettings).catch(() => {});

    // Refresh settings saat tab menjadi visible (user kembali ke halaman nota)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        getSettings().then(setSettings).catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const addItem = () => {
    setItems([...items, { nama: "", harga: "", jumlah: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof NotaItem, value: string) => {
    const newItems = [...items];
    
    // Format harga dengan titik pemisah ribuan
    if (field === 'harga') {
      // Hapus semua karakter non-digit
      const numericValue = value.replace(/\D/g, '');
      // Format dengan titik pemisah ribuan
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      newItems[index][field] = formattedValue;
    } else {
      newItems[index][field] = value;
    }
    
    setItems(newItems);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    // Sederhana: gunakan print dialog untuk save as PDF
    // User bisa pilih "Save as PDF" lalu share manual
    window.print();
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      // Hapus titik untuk kalkulasi
      const harga = parseFloat(item.harga.replace(/\./g, '')) || 0;
      const jumlah = parseFloat(item.jumlah) || 0;
      return total + (harga * jumlah);
    }, 0);
  };

  const handleAddressEdit = () => {
    if (editingAddress) {
      setSettings(prev => prev ? { ...prev, address: tempAddress } : null);
      setEditingAddress(false);
    } else {
      setTempAddress(settings?.address || "");
      setEditingAddress(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setLocation("/beranda")}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Kembali</span>
          </button>
          <h1 className="text-lg font-black tracking-tight">NOTA</h1>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              title="Bagikan"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
              title="Print"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Nota Container */}
      <div className="px-4 py-6">
        <div 
          ref={printRef}
          className="bg-white rounded-2xl shadow-lg p-6 max-w-2xl mx-auto"
        >
          {/* Header Nota */}
          <div className="text-center mb-6 pb-6 border-b-2 border-gray-300">
            <img 
              src={settings?.profilePhotoUrl || "/logo.png"} 
              alt="Logo" 
              className="w-24 h-24 mx-auto mb-3 object-contain"
            />
            <h2 className="text-2xl font-black text-gray-800 mb-2">
              {settings?.shopName || "KASIR CUBE"}
            </h2>
            
            {/* Alamat Toko */}
            <div className="flex items-center justify-center gap-2">
              {editingAddress ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempAddress}
                    onChange={(e) => setTempAddress(e.target.value)}
                    className="text-sm font-bold text-gray-600 border-b-2 border-blue-500 bg-gray-50 px-2 py-1 w-64"
                    placeholder="Masukkan alamat toko"
                  />
                  <button
                    onClick={handleAddressEdit}
                    className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-gray-600">
                    {settings?.address || "Alamat Toko Belum Diatur"}
                  </p>
                  <button
                    onClick={handleAddressEdit}
                    className="p-1 text-blue-500 hover:text-blue-700"
                    title="Edit Alamat"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form Input */}
          <div className="mb-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-lg font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Items */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Nama Barang"
                      value={item.nama}
                      onChange={(e) => updateItem(index, 'nama', e.target.value)}
                      className="w-full text-base font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.harga}
                      onChange={(e) => updateItem(index, 'harga', e.target.value)}
                      className="w-full text-base font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Jml"
                      value={item.jumlah}
                      onChange={(e) => updateItem(index, 'jumlah', e.target.value)}
                      className="w-full text-base font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addItem}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition"
            >
              <Plus className="w-5 h-5" />
              Tambah Barang
            </button>
          </div>

          {/* Total */}
          <div className="border-t-2 border-gray-300 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-700">TOTAL</span>
              <span className="text-2xl font-black text-blue-600">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Tertanda */}
          <div className="flex justify-end mb-6">
            <div className="text-right">
              <p className="text-base font-bold text-gray-500 mb-1">Tertanda</p>
              <p className="text-xl font-black text-gray-800">
                {settings?.shopName || "KASIR CUBE"}
              </p>
            </div>
          </div>

          {/* Terima Kasih */}
          <div className="text-center border-t-2 border-gray-300 pt-4">
            <p className="text-xl font-black text-gray-800">
              TERIMA KASIH
            </p>
            <p className="text-base font-bold text-gray-600 mt-1">
              Atas Kepercayaan Anda
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-gradient-to-r {
            display: none !important;
          }
          button {
            display: none !important;
          }
          input {
            border: none !important;
            background: transparent !important;
          }
          @page {
            margin: 10mm;
            size: A4;
          }
          .min-h-screen {
            min-height: auto !important;
          }
          .pb-24 {
            padding-bottom: 0 !important;
          }
          .bg-gray-100 {
            background: white !important;
          }
          .shadow-lg {
            box-shadow: none !important;
          }
          .rounded-2xl {
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
