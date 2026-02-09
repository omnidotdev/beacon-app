import { Link, Outlet } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Sidebar, { BeaconLogo } from "./Sidebar";

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh w-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="glass-panel flex h-14 items-center justify-between border-b border-border/50 px-4 md:hidden">
          <Link
            to="/"
            className="flex items-center gap-2 transition-all hover:drop-shadow-[0_0_8px_var(--color-primary)] active:scale-95"
          >
            <BeaconLogo className="h-7 w-7 text-primary" />
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-shimmer">
              Early Access
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-icon -mr-1 p-2"
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
