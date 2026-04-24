import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, Clock, PlusCircle, BarChart3, Settings, LogOut, History, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { AddSaldoModal } from "@/components/modals/add-saldo-modal";

import { useDisplayMode } from "@/hooks/use-display-mode";

export function BottomNav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isLandscape } = useDisplayMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"isi-saldo" | "penyesuaian">("isi-saldo");

  useEffect(() => {
    const openIsiSaldo = () => {
      setModalMode("isi-saldo");
      setIsModalOpen(true);
    };
    const openPenyesuaian = () => {
      setModalMode("penyesuaian");
      setIsModalOpen(true);
    };

    window.addEventListener("open-isi-saldo", openIsiSaldo);
    window.addEventListener("open-penyesuaian", openPenyesuaian);
    return () => {
      window.removeEventListener("open-isi-saldo", openIsiSaldo);
      window.removeEventListener("open-penyesuaian", openPenyesuaian);
    };
  }, []);

  if (location === "/" || location === "/admin" || location === "/license") return null;

  const isOwnerMode = location.startsWith("/owner");

  const kasirNav = [
    { icon: Home, label: "Beranda", href: "/beranda" },
    { icon: Clock, label: "Riwayat", href: "/riwayat" },
    { 
      icon: PlusCircle, 
      label: "Isi Saldo", 
      href: "#", 
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        setModalMode("isi-saldo");
        setIsModalOpen(true);
      } 
    },
    { icon: BarChart3, label: "Laporan", href: "/laporan" },
    { icon: Settings, label: "Owner", href: "/owner", ownerOnly: true },
    { icon: LogOut, label: "Keluar", href: "logout", isLogout: true },
  ];

  const ownerNav = [
    { icon: Home, label: "Beranda", href: "/owner" },
    { icon: History, label: "Riwayat", href: "/riwayat" },
    { icon: ArrowLeft, label: "Kembali", href: "/beranda" },
    { icon: LogOut, label: "Keluar", href: "logout", isLogout: true },
  ];

  const navItems = isOwnerMode ? ownerNav : kasirNav.filter(item => {
    if (item.ownerOnly && user?.role !== "owner") return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <>
      <div className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around px-1 z-50 transition-all duration-300",
        isLandscape ? "py-1 pb-[env(safe-area-inset-bottom,4px)] shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" : "py-1.5 pb-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
      )}>
        {navItems.map((item, idx) => {
          const isActive = item.href !== "logout" && item.href !== "#" && location === item.href;
          const isLogout = (item as any).isLogout;
          const isButton = !!item.onClick;

          const content = (
            <div
              className={cn(
                "flex flex-col items-center justify-center transition-all",
                isLandscape ? "py-0.5 gap-0" : "py-1 gap-0.5",
                isActive ? "text-blue-600" : "text-gray-900"
              )}
            >
              <div
                className={cn(
                  "p-1 rounded-xl transition-all",
                  isActive ? "bg-blue-50 text-blue-600" : ""
                )}
              >
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-bold text-blue-600")}>
                {item.label}
              </span>
            </div>
          );

          return (
            <div key={idx} className="flex-1">
              {isLogout ? (
                <button onClick={handleLogout} className="w-full flex flex-col items-center justify-center py-1 gap-0.5">
                  <div className="p-1 rounded-xl"><item.icon className="w-5 h-5 text-red-500" /></div>
                  <span className="text-[10px] font-bold text-red-500">{item.label}</span>
                </button>
              ) : isButton ? (
                <button onClick={item.onClick} className="w-full">{content}</button>
              ) : (
                <Link href={item.href} className="block">{content}</Link>
              )}
            </div>
          );
        })}
      </div>

      <AddSaldoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        kasirName={user?.name || ""}
        mode={modalMode}
      />
    </>
  );
}
