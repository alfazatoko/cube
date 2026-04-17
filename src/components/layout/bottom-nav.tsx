import { Link, useLocation } from "wouter";
import { Home, Clock, CreditCard, BarChart3, Settings, LogOut, History, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (location === "/") return null;

  const isOwnerMode = location.startsWith("/owner");

  const kasirNav = [
    { icon: Home, label: "Beranda", href: "/beranda" },
    { icon: Clock, label: "Riwayat", href: "/riwayat" },
    { icon: CreditCard, label: "Non Tunai", href: "/non-tunai" },
    { icon: BarChart3, label: "Laporan", href: "/laporan" },
    { icon: Settings, label: "Owner", href: "/owner", ownerOnly: true },
    { icon: LogOut, label: "Keluar", href: "logout", isLogout: true },
  ];

  const ownerNav = [
    { icon: Home, label: "Home", href: "/owner" },
    { icon: History, label: "Riwayat", href: "/riwayat" },
    { icon: ArrowLeft, label: "Kembali", href: "/beranda" },
    { icon: LogOut, label: "Keluar", href: "logout", isLogout: true },
  ];

  const navItems = isOwnerMode ? ownerNav : kasirNav.filter(item => {
    if (item.ownerOnly && user?.role !== "owner") return false;
    if (item.href === "/non-tunai" && user?.role === "owner") return false;
    return true;
  });

  const handleLogout = () => {
    logout();
    window.location.href = import.meta.env.BASE_URL || "/";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around px-1 py-1.5 pb-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
      {navItems.map((item, idx) => {
        const isActive = item.href !== "logout" && location === item.href;
        const isLogout = (item as any).isLogout;
        return (
          <div key={idx} className="flex-1">
            {isLogout ? (
              <button
                onClick={handleLogout}
                className="w-full flex flex-col items-center justify-center py-1 gap-0.5"
              >
                <div className="p-1 rounded-xl">
                  <item.icon className="w-5 h-5 text-red-500" strokeWidth={2} />
                </div>
                <span className="text-[10px] font-bold text-red-500">{item.label}</span>
              </button>
            ) : (
              <Link href={item.href} className="block">
                <div
                  className={cn(
                    "flex flex-col items-center justify-center py-1 gap-0.5 rounded-2xl transition-all",
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
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
