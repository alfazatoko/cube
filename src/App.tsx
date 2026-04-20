import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { DisplayModeProvider, useDisplayMode, getMaxWidth } from "@/hooks/use-display-mode";
import { useAutoScheduler } from "@/hooks/use-auto-scheduler";
import { BottomNav } from "@/components/layout/bottom-nav";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Beranda from "@/pages/beranda";
import Riwayat from "@/pages/riwayat";
import NonTunai from "@/pages/non-tunai";
import Catatan from "@/pages/catatan";
import Laporan from "@/pages/laporan";
import Owner from "@/pages/owner";
import AdminPanel from "@/pages/admin";
import License from "@/pages/license";
import Gratis from "@/pages/gratis";
import { useEffect, useState } from "react";
import { getSettings } from "@/lib/firestore";
import { Monitor, Tablet, Smartphone, RotateCw, Download, Sun, Moon } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, firebaseUser, firebaseLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (firebaseLoading) return;
    const isGratis = user?.id === "gratis_kasir";
    
    if (!user || (!firebaseUser && !isGratis)) {
      setLocation("/");
    } else if (allowedRoles && !allowedRoles.includes(user.role)) {
      setLocation(user.role === "owner" ? "/owner" : "/beranda");
    }
  }, [user, firebaseUser, firebaseLoading, setLocation, allowedRoles]);

  const isGratis = user?.id === "gratis_kasir";
  if (firebaseLoading || (!firebaseUser && !isGratis) || !user) return null;
  return <Component />;
}

function Router() {
  const { mode, setMode, isLandscape, setIsLandscape, isDark, setIsDark } = useDisplayMode();
  const { user } = useAuth();
  const maxW = getMaxWidth(mode, isLandscape);
  useAutoScheduler(!!user);
  const [location, setLocation] = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    } else {
      alert("Aplikasi sudah terinstal atau browser tidak mendukung.");
    }
  };

  useEffect(() => {
    if (location === "/admin" || location === "/license" || location === "/gratis") return;
    
    const checkLicense = async () => {
      try {
        const settings = await getSettings();
        if (settings.requireLicense === false) return; // By-pass license check
      } catch (e) {
        console.error("Failed to fetch settings for license check", e);
      }

      const trialData = localStorage.getItem("kasir_free_trial");
      if (trialData) {
        try {
          const parsed = JSON.parse(trialData);
          if (new Date(parsed.expiresAt) > new Date()) {
            return; // Bypass license check for active free trial
          }
        } catch (e) {}
      }

      const licString = localStorage.getItem("kasir_license");
      if (!licString) {
        setLocation("/license");
        return;
      }
      try {
        const lic = JSON.parse(licString);
        if (lic.expiresAt && new Date(lic.expiresAt) < new Date()) {
          localStorage.removeItem("kasir_license");
          setLocation("/license");
        }
      } catch (e) {
        localStorage.removeItem("kasir_license");
        setLocation("/license");
      }
    };
    checkLicense();
  }, [location, setLocation]);

  return (
    <div className="bg-background min-h-screen">
      {/* Responsive Toolbar - Visible on PC and Tablet screens */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 h-14 bg-card/80 backdrop-blur-md border-b border-border z-[100] items-center justify-between px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div 
            onClick={handleInstall}
            className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
            title="Install App"
          >
            CUBE
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Simulator</span>
        </div>

        <div className="flex items-center bg-muted p-1 rounded-2xl gap-1">
          <button 
            onClick={() => setMode("hp")} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === "hp" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smartphone className="w-4 h-4" /> Smartphone
          </button>
          <button 
            onClick={() => setMode("tablet")} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === "tablet" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Tablet className="w-4 h-4" /> Tablet
          </button>
          <button 
            onClick={() => setMode("pc")} 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${mode === "pc" ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Monitor className="w-4 h-4" /> Desktop PC
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-2.5 rounded-xl transition-all ${isDark ? "bg-gray-800 text-yellow-400" : "bg-muted text-muted-foreground hover:text-blue-600"}`}
            title={isDark ? "Layar Terang" : "Layar Gelap"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setIsLandscape(!isLandscape)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isLandscape ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}
          >
            <RotateCw className={`w-4 h-4 ${isLandscape ? 'rotate-90' : ''} transition-transform`} /> 
            {isLandscape ? "Landscape" : "Portrait"}
          </button>
        </div>
      </div>

      <div className={`pt-0 md:pt-14`}>
        <div className={`pb-20 ${maxW} mx-auto min-h-[100dvh] bg-card lg:shadow-[0_0_60px_rgba(0,0,0,0.1)] relative transition-all duration-300`}>

      <Switch>
        <Route path="/" component={Login} />
        <Route path="/beranda" component={() => <ProtectedRoute component={Beranda} />} />
        <Route path="/riwayat" component={() => <ProtectedRoute component={Riwayat} />} />
        <Route path="/non-tunai" component={() => <ProtectedRoute component={NonTunai} />} />
        <Route path="/catatan" component={() => <ProtectedRoute component={Catatan} />} />
        <Route path="/laporan" component={() => <ProtectedRoute component={Laporan} />} />
        <Route path="/owner" component={() => <ProtectedRoute component={Owner} allowedRoles={["owner"]} />} />
        <Route path="/admin" component={AdminPanel} />
        <Route path="/license" component={License} />
        <Route path="/gratis" component={Gratis} />
        <Route component={NotFound} />
      </Switch>
        <BottomNav />
      </div>
    </div>
  </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DisplayModeProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </DisplayModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
