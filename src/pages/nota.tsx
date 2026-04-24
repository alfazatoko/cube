import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Printer, Share2, Plus, Trash2, Edit2, Save } from "lucide-react";
import { getSettings, type SettingsRecord } from "@/lib/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

  const getDayName = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "EEEE", { locale: id });
    } catch {
      return "";
    }
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
      {/* Header - Hidden saat print */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-500 text-white p-4 shadow-lg no-print">
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
      <div className="px-4 py-6 nota-container">
        <div 
          ref={printRef}
          className="nota-print-area bg-white rounded-2xl shadow-lg p-6 max-w-2xl mx-auto"
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

          {/* Form Input - Hidden saat print */}
          <div className="mb-6 space-y-4 no-print">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full text-lg font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-sm font-bold text-blue-600">
                {getDayName(tanggal)}
              </p>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="space-y-2">
                  {/* Baris 1: Nama Barang */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Nama Barang"
                      value={item.nama}
                      onChange={(e) => updateItem(index, 'nama', e.target.value)}
                      className="flex-1 text-base font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Baris 2: Harga dan Jumlah (sama panjang) */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Harga"
                      value={item.harga}
                      onChange={(e) => updateItem(index, 'harga', e.target.value)}
                      className="w-full text-base font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Jumlah"
                      value={item.jumlah}
                      onChange={(e) => updateItem(index, 'jumlah', e.target.value)}
                      className="w-full text-base font-bold border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
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

          {/* Rincian Barang - Outside no-print untuk tampil saat print */}
          <div className="rincian-barang mt-4 border-2 border-gray-300 rounded-xl p-4 bg-white">
            <h3 className="text-lg font-black text-black mb-3 text-center">RINCIAN BARANG</h3>
            
            {/* Info Tanggal dan Hari */}
            <div className="mb-3 text-sm">
              <p className="font-bold text-black">
                Hari: <span className="text-blue-700">{getDayName(tanggal)}</span>
              </p>
              <p className="font-bold text-black">
                Tanggal: <span className="text-blue-700">{tanggal}</span>
              </p>
            </div>

            {/* Tabel Rincian */}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="border-b border-gray-400 pb-2">
                  <p className="font-bold text-black">{index + 1}. {item.nama || '-'}</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-800">Harga: Rp {item.harga || '0'}</span>
                    <span className="text-gray-800">Jumlah: {item.jumlah || '0'}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-3 pt-2 border-t-2 border-gray-500">
              <p className="text-lg font-black text-blue-700 text-center">
                TOTAL: Rp {calculateTotal().toLocaleString('id-ID')}
              </p>
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
          @page {
            margin: 0 !important;
            padding: 0 !important;
            size: auto;
          }
          
          /* AGGRESSIVE: Hide anything with dark background */
          * {
            background-color: white !important;
            background: white !important;
          }
          
          /* Except the nota content */
          .rincian-barang, .rincian-barang *,
          .bg-white, .bg-white *,
          [class*="nota"], [class*="nota"] * {
            background-color: white !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Hide semua yang tidak perlu */
          .no-print,
          .bg-gradient-to-r,
          nav,
          .bottom-nav,
          [role="navigation"],
          nav *,
          .bottom-nav *,
          [role="navigation"] *,
          .fixed,
          .sticky,
          header:not(.nota-header),
          footer,
          .timestamp,
          .debug-btn,
          .react-devtools-backdrop,
          .react-devtools-profiler,
          script,
          style {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            background: none !important;
            background-color: transparent !important;
          }
          
          /* Hide all buttons except print (tapi button juga di hide) */
          button,
          .btn,
          [type="button"],
          [type="submit"] {
            display: none !important;
          }
          
          /* Hide any element with dark blue/navy background */
          [style*="background: blue"],
          [style*="background-color: blue"],
          [style*="background: #00008B"],
          [style*="background-color: #00008B"],
          [style*="background: navy"],
          [style*="background-color: navy"],
          [style*="background: #1e3a"],
          [style*="background-color: #1e3a"],
          [class*="bg-[#1e3a"],
          .bg-blue-900,
          .bg-blue-950,
          .bg-indigo-900,
          .bg-indigo-950 {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* SPECIFIC: Hide bottom fixed elements */
          [style*="position: fixed"],
          [style*="position:fixed"],
          .fixed.bottom-0,
          .fixed[class*="bottom"],
          div[class*="bottom-0"],
          div[style*="bottom: 0"],
          div[style*="bottom:0"] {
            display: none !important;
          }
          
          /* Hide anything with dark background at bottom */
          div[style*="background-color: rgb(30"],
          div[style*="background-color: rgb(15"],
          div[style*="background-color: #0f172a"],
          div[style*="background-color: #1e293b"] {
            display: none !important;
          }
          
          /* Hide input fields */
          input,
          select,
          textarea {
            border: none !important;
            background: transparent !important;
            display: none !important;
          }
          
          /* Layout adjustments untuk thermal paper - FULL WIDTH */
          html, body {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow-x: hidden !important;
          }
          
          .min-h-screen {
            min-height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
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
          
          /* NOTA CONTAINER - Full width no padding */
          .nota-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .px-4, .py-6, .p-4, .p-6 {
            padding: 0 !important;
            margin: 0 !important;
          }
          
          /* NOTA PRINT AREA - Full width */
          .nota-print-area,
          .nota-print-area.bg-white,
          .nota-print-area.rounded-2xl,
          .nota-print-area.shadow-lg {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          
          .max-w-2xl, .max-w-xl, .max-w-lg, .max-w-md, .max-w-sm {
            max-width: 100% !important;
            width: 100% !important;
          }
          
          .mx-auto {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          
          /* Rincian barang full width */
          .rincian-barang {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding: 2mm !important;
          }
          
          /* Rincian barang styles untuk thermal */
          .rincian-barang,
          .rincian-barang.bg-white,
          .rincian-barang .bg-white {
            background: white !important;
            border: 1px solid #000 !important;
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          
          /* Container utama nota */
          .bg-white.rounded-2xl,
          [class*="rounded-2xl"] {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 2mm !important;
            border-radius: 0 !important;
          }
          
          .text-black {
            color: #000 !important;
          }
          
          .text-blue-700 {
            color: #000 !important;
            font-weight: bold !important;
          }
          
          .text-gray-800 {
            color: #000 !important;
          }
          
          .border-gray-400,
          .border-gray-500,
          .border-gray-300 {
            border-color: #000 !important;
          }
          
          /* Font size untuk thermal paper */
          body {
            font-size: 10pt !important;
          }
          
          h1, h2 {
            font-size: 12pt !important;
          }
          
          h3 {
            font-size: 11pt !important;
          }
          
          p, span, div {
            font-size: 9pt !important;
          }
          
          /* Pastikan semua teks hitam */
          p, span, h1, h2, h3, h4, h5, h6, div {
            color: #000 !important;
          }
          
          /* Force show rincian barang */
          .rincian-barang,
          [class*="rincian"] {
            display: block !important;
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
