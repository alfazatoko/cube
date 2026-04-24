import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getSettings, type SettingsRecord } from "@/lib/firestore";
import { User, Clock, CalendarDays, Sun, Moon, Fingerprint, Monitor, Tablet, Smartphone, RotateCw, MoreVertical } from "lucide-react";
import { useDisplayMode } from "@/hooks/use-display-mode";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export function Header() {
  const { user, shift, loginTime, absenTime } = useAuth();
  const [clock, setClock] = useState("");
  const { mode, setMode, theme, setTheme, isLandscape, setIsLandscape, showSimulator, setShowSimulator } = useDisplayMode();
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [, setLocation] = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toTimeString().substring(0, 8).replace(/:/g, "."));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const today = new Date();
  const dayName = format(today, "EEEE", { locale: id });
  const dateStr = format(today, "d MMMM yyyy", { locale: id });

  const getGreeting = () => {
    const lt = loginTime || "";
    const hour = lt ? parseInt(lt.split(":")[0] || lt.split(".")[0], 10) : new Date().getHours();
    if (isNaN(hour)) return "Pagi";
    if (hour >= 3 && hour < 11) return "Pagi";
    if (hour >= 11 && hour < 15) return "Siang";
    if (hour >= 15 && hour < 18) return "Sore";
    return "Malam";
  };
  const shiftLabel = getGreeting();

  const displayModes = [
    { id: "hp" as const, icon: Smartphone },
    { id: "tablet" as const, icon: Tablet },
    { id: "pc" as const, icon: Monitor },
  ];

  return (
    <div className={cn(
      "bg-gradient-to-br from-blue-800 via-blue-600 to-blue-500 rounded-3xl text-white relative shadow-lg transition-all duration-300",
      isLandscape ? "p-2 px-4 mb-2" : "p-4 mb-4"
    )}>
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

      <div className="relative z-10">
        <div className={cn("flex justify-between items-start", isLandscape ? "mb-1" : "mb-2")}>
          <div className="flex items-center gap-2.5">
            <div 
              onClick={() => setShowSimulator(!showSimulator)}
              className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/40 cursor-pointer hover:scale-105 active:scale-95 transition-all"
            >
              <img src={settings?.profilePhotoUrl || "/logo.png"} alt="KASIR CUBE" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-white font-black text-sm tracking-tight leading-none uppercase">
                {settings?.shopName || "KASIR CUBE"}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold text-white/60 tracking-wider">V.2.1</span>
                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold font-mono tracking-wider">{clock}</span>
          </div>
        </div>

        <div className={cn("flex items-center gap-2", isLandscape ? "mb-1" : "mb-2")}>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            <span className="font-bold text-sm">{user.name}</span>
          </div>
          <div className="flex items-center gap-1 text-blue-200 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>Login: {loginTime || "--:--"}</span>
          </div>
          <div className="ml-auto bg-emerald-500/90 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
            <Fingerprint className="w-3 h-3" />
            Absen: {absenTime || "--:--"}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[11px] text-blue-100">
            <button
              onClick={() => setLocation("/kalender")}
              className="flex items-center gap-1 hover:text-white transition cursor-pointer"
              title="Klik untuk lihat kalender"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{dayName}, {dateStr}</span>
            </button>
            <div className="flex items-center gap-1">
              {shiftLabel === "Pagi" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{shiftLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 rounded-full p-1 border border-white/5 relative z-50">
            {/* 1. ICON TEMA MATAHARI */}
            <button
              onClick={() => {
                if (theme === "light") setTheme("blue");
                else if (theme === "blue") setTheme("dark");
                else setTheme("light");
              }}
              className="p-1.5 rounded-full transition-all bg-white/20 hover:bg-white/40 shadow-sm"
              title="Ganti Tema (3x Klik)"
            >
              <Sun className={`w-3.5 h-3.5 ${theme === "blue" ? "text-blue-300" : theme === "dark" ? "text-yellow-200" : "text-white"}`} />
            </button>


            {/* 3. ICON PC */}
            <button
              onClick={() => {
                if (mode === "hp") setMode("tablet");
                else if (mode === "tablet") setMode("pc");
                else setMode("hp");
              }}
              className="p-1.5 rounded-full transition-all bg-white/20 hover:bg-white/40 shadow-sm"
              title="Ukuran Layar (3x Klik)"
            >
              <div className="relative">
                <Monitor className="w-3.5 h-3.5" />
                <span className="absolute -bottom-1 -right-1 text-[6px] font-bold">
                  {mode === "hp" ? "S" : mode === "tablet" ? "M" : "L"}
                </span>
              </div>
            </button>

            {/* 4. MENU TITIK 3 */}
            <div className="relative z-[10000]">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-full transition-all bg-red-500 hover:bg-red-600 shadow-sm"
                title="Menu"
              >
                <MoreVertical className="w-3.5 h-3.5 text-white" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 min-w-[150px] z-[10000]">
                  <button
                    onClick={() => {
                      setLocation("/beranda");
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    BERANDA
                  </button>
                  <button
                    onClick={() => {
                      setLocation("/nota");
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    NOTA
                  </button>
                  <button
                    onClick={() => {
                      setLocation("/stok-barang");
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    STOK BARANG
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
