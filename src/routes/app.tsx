import { Link, useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { clearAuth } from "@/lib/api";

export default AppLayout;

function AppLayout() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (ready && !user) navigate("/login");
  }, [ready, user, navigate]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const nav: { to: string; label: string; roles?: string[] }[] = [
    { to: "/app", label: "Overview" },
    { to: "/app/credentials", label: "Credentials" },
    { to: "/app/issue", label: "Issue", roles: ["institution"] },
    { to: "/app/share", label: "Share links", roles: ["candidate"] },
    { to: "/app/verify", label: "Verify" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-black text-white border-b border-white/10">
        <div className="w-full px-4 md:px-8 flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-1 hover:bg-white/10 rounded transition text-white/70 hover:text-white"
              title="Toggle sidebar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <Link to="/" className="font-display text-lg flex items-center gap-2">
              CredChain
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-white/50 hidden sm:inline">
              <span className="text-[color:var(--gold)] uppercase tracking-wider text-xs">{user.role}</span>
            </span>
            <button
              onClick={() => { clearAuth(); navigate("/"); }}
              className="px-3 py-1.5 rounded-md border border-white/15 hover:bg-white/5 transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
        <aside 
          className={`border-border bg-muted/10 shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
            isSidebarOpen 
              ? "w-full md:w-64 border-b md:border-b-0 md:border-r opacity-100" 
              : "w-0 border-none opacity-0"
          }`}
        >
          <nav className="flex md:flex-col gap-1 text-sm p-4 md:p-6 overflow-x-auto md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] min-w-[256px]">
            {nav
              .filter((n) => !n.roles || n.roles.includes(user.role))
              .map((n) => {
                const active =
                  n.to === "/app" ? pathname === "/app" : pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`px-3 py-2 rounded-md whitespace-nowrap transition ${
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
