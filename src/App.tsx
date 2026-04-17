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
import { useEffect } from "react";

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
    if (!firebaseUser || !user) {
      setLocation("/");
    } else if (allowedRoles && !allowedRoles.includes(user.role)) {
      setLocation(user.role === "owner" ? "/owner" : "/beranda");
    }
  }, [user, firebaseUser, firebaseLoading, setLocation, allowedRoles]);

  if (firebaseLoading || !firebaseUser || !user) return null;
  return <Component />;
}

function Router() {
  const { mode } = useDisplayMode();
  const { user } = useAuth();
  const maxW = getMaxWidth(mode);
  useAutoScheduler(!!user);
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location === "/admin" || location === "/license") return;
    
    const checkLicense = () => {
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
    <div className={`pb-20 ${maxW} mx-auto min-h-[100dvh] bg-slate-50/50 shadow-[0_0_40px_rgba(0,0,0,0.05)]`}>
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
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
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
