import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Printer, Share2, Plus, Trash2, Edit2, Save, X, Check } from "lucide-react";
import { getSettings, type SettingsRecord } from "@/lib/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { printer } from "@/lib/printer-utils";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
  const [showPreview, setShowPreview] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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
    setShowPreview(true);
  };

  const handleBluetoothPrint = async () => {
    setIsPrinting(true);
    try {
      const data = {
        shopName: settings?.shopName || "KASIR CUBE",
        items: items.map(i => ({
          nama: i.nama,
          harga: parseFloat(i.harga.replace(/\./g, '')) || 0,
          jumlah: parseFloat(i.jumlah) || 0
        })),
        total: calculateTotal(),
        tertanda: settings?.shopName || "KASIR CUBE",
        thanksMessage: "TERIMA KASIH ATAS KEPERCAYAAN ANDA"
      };
      const success = await printer.printReceipt(data);
      if (success) {
        setShowPreview(false);
      }
    } catch (error) {
      console.error("Print failed:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!printRef.current) return;
    
    try {
      // Temporarily hide elements that shouldn't be in the PDF
      const originalTitle = document.title;
      document.title = `Nota_${settings?.shopName || 'KASIR_CUBE'}_${tanggal}`;
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      document.title = originalTitle;

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [canvas.width * 0.264583, canvas.height * 0.264583]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
      const pdfBlob = pdf.output("blob");
      
      const file = new File([pdfBlob], `Nota_${settings?.shopName || 'KASIR_CUBE'}_${tanggal}.pdf`, {
        type: "application/pdf"
      });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Nota ${settings?.shopName || 'KASIR_CUBE'}`,
          text: `Berikut adalah nota transaksi dari ${settings?.shopName || 'KASIR_CUBE'}`,
          files: [file]
        });
      } else {
        // Fallback if sharing is not supported
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error sharing PDF:", error);
      alert("Gagal membagikan nota");
    }
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

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Preview Struk</h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-gray-200 rounded-full transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Receipt Content (Simulated Thermal) */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
              <div className="bg-white p-4 shadow-sm font-mono text-[11px] leading-tight text-black max-w-[220px] mx-auto border-dashed border-2 border-gray-300">
                <div className="text-center mb-2">
                  <p className="font-bold text-sm uppercase">{settings?.shopName || "KASIR CUBE"}</p>
                  <p>--------------------------------</p>
                </div>

                <div className="space-y-1 mb-2">
                  {items.map((item, i) => (
                    <div key={i}>
                      <p>{i + 1}. {item.nama || '-'}</p>
                      <div className="flex justify-between pl-3">
                        <span>{item.jumlah || '0'} x {item.harga || '0'}</span>
                        <span>{((parseFloat(item.harga.replace(/\./g, '')) || 0) * (parseFloat(item.jumlah) || 0)).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p>--------------------------------</p>
                <div className="flex justify-between font-bold text-xs mb-4">
                  <span>TOTAL:</span>
                  <span>Rp {calculateTotal().toLocaleString('id-ID')}</span>
                </div>

                <div className="text-center mb-4">
                  <p>Tertanda:</p>
                  <br />
                  <p className="font-bold uppercase">{settings?.shopName || "KASIR CUBE"}</p>
                </div>

                <div className="text-center">
                  <p className="font-bold">TERIMA KASIH</p>
                  <p>Atas Kepercayaan Anda</p>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-white border-t flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Batal
              </button>
              <button
                onClick={handleBluetoothPrint}
                disabled={isPrinting}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
              >
                {isPrinting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Cetak
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0 !important;
            padding: 0 !important;
            size: 58mm auto; /* Thermal paper size */
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 58mm !important;
          }

          .no-print {
            display: none !important;
          }

          .nota-container {
            padding: 0 !important;
            margin: 0 !important;
          }

          .nota-print-area {
            width: 58mm !important;
            padding: 2mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          /* Hanya tampilkan elemen yang diminta user: Nama Toko, Rincian, TTD, Thanks */
          .nota-print-area > div:not(.rincian-barang):not(.text-center):not(.flex) {
             display: none !important;
          }

          /* Khusus untuk header toko */
          .text-center.mb-6 {
            display: block !important;
            margin-bottom: 5mm !important;
          }
          
          .text-center.mb-6 img {
            display: none !important; /* Sesuai permintaan: hanya nama toko */
          }

          .text-center.mb-6 h2 {
            font-size: 14pt !important;
            margin: 0 !important;
          }

          .text-center.mb-6 p {
            display: none !important; /* Sembunyikan alamat */
          }

          .rincian-barang {
            border: none !important;
            padding: 0 !important;
            margin: 2mm 0 !important;
          }

          .rincian-barang h3 {
            font-size: 10pt !important;
            border-bottom: 1px dashed black;
            padding-bottom: 1mm;
          }

          .rincian-barang .text-sm {
            display: none !important; /* Sembunyikan hari/tanggal detail */
          }

          .rincian-barang .space-y-2 {
            margin: 2mm 0 !important;
          }

          .rincian-barang .border-b {
            border-bottom: 1px dashed #ccc !important;
            padding-bottom: 1mm !important;
            margin-bottom: 1mm !important;
          }

          .rincian-barang .text-lg.font-black {
            font-size: 12pt !important;
            margin-top: 2mm !important;
          }

          .flex.justify-end.mb-6 {
            display: flex !important;
            margin-top: 5mm !important;
          }

          .text-center.border-t-2 {
            display: block !important;
            border-top: 1px dashed black !important;
            margin-top: 5mm !important;
            padding-top: 2mm !important;
          }

          /* Reset all backgrounds to white */
          * {
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
          }
        }
      `}</style>
    </div>
  );
}
