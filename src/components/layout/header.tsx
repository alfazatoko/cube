import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { getSettings, type SettingsRecord } from "@/lib/firestore";
import { User, Clock, CalendarDays, Sun, Moon, Fingerprint, Monitor, Tablet, Smartphone } from "lucide-react";
import { useDisplayMode } from "@/hooks/use-display-mode";

export function Header() {
  const { user, shift, loginTime, absenTime } = useAuth();
  const [clock, setClock] = useState("");
  const { mode, setMode } = useDisplayMode();
  const [settings, setSettings] = useState<SettingsRecord | null>(null);

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
    <div className="bg-gradient-to-br from-blue-800 via-blue-600 to-blue-500 rounded-3xl p-4 mb-4 text-white relative overflow-hidden shadow-lg">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white/40">
              <img src={settings?.profilePhotoUrl || `${import.meta.env.BASE_URL}alfaza-logo.png`} alt="Alfaza" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-wide leading-tight">
                {settings?.shopName || "ALFAZA LINK"}
              </h1>
              <p className="text-[10px] font-medium text-blue-200 -mt-0.5">Sistem Kasir Pro</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold font-mono tracking-wider">{clock}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
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
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{dayName}, {dateStr}</span>
            </div>
            <div className="flex items-center gap-1">
              {shiftLabel === "Pagi" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{shiftLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 bg-white/10 rounded-full p-0.5">
            {displayModes.map(dm => {
              const Icon = dm.icon;
              return (
                <button
                  key={dm.id}
                  onClick={() => setMode(dm.id)}
                  className={`p-1.5 rounded-full transition-all ${mode === dm.id ? 'bg-white/25' : 'opacity-50 hover:opacity-80'}`}
                  title={dm.id.toUpperCase()}
                >
                  <Icon className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
