import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Package, TrendingUp, Menu, LogIn, History } from "lucide-react";

export default function TopNavbar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: BarChart3 },
    { path: "/inventory", label: "Inventory", icon: Package },
    { path: "/sales", label: "Sales", icon: TrendingUp },
    { path: "/sales-history", label: "Sales History", icon: History }, // NEW
    { path: "/login", label: "Sign In", icon: LogIn }, // NEW
  ];

  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="fixed top-0 w-full z-50 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center">
            <span className="font-bold text-white text-lg">S</span>
          </div>
          <div>
            <h1 className="font-bold text-xl md:text-2xl">SteppInStyle</h1>
            <p className="text-sm text-slate-400">Management System</p>
          </div>
        </div>

        {/* Desktop menu */}
        <nav className="hidden md:flex gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                  active
                    ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30 text-white shadow-lg"
                    : "hover:bg-slate-700/30 text-slate-300 hover:text-white border border-transparent hover:border-slate-600/30"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu className="w-6 h-6 text-slate-300" />
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileOpen && (
        <div className="md:hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 pb-4">
          <nav className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    active
                      ? "bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30 text-white shadow-lg"
                      : "hover:bg-slate-700/30 text-slate-300 hover:text-white border border-transparent hover:border-slate-600/30"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
