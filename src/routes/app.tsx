import { Link, useNavigate, useParams, useLocation, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { clearAuth } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default AppLayout;

function AppLayout() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

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
    { to: "/", label: "Home" },
    { to: "/app", label: "Overview" },
    { to: "/app/credentials", label: "Credentials", roles: ["institution", "candidate"] },
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
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row w-full">
        <aside 
          className={`border-border bg-background shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30 fixed md:sticky top-14 h-[calc(100vh-3.5rem)] ${
            isSidebarOpen 
              ? "w-64 border-r opacity-100 shadow-2xl md:shadow-none" 
              : "w-0 border-none opacity-0"
          }`}
        >
          <nav className="flex flex-col gap-1 text-sm p-4 md:p-6 overflow-x-hidden overflow-y-auto h-full min-w-[256px]">
            <div className="flex-1 flex flex-col gap-1">
              {nav
                .filter((n) => !n.roles || n.roles.includes(user.role))
                .map((n) => {
                  const active =
                    n.to === "/" || n.to === "/app" 
                      ? pathname === n.to 
                      : pathname.startsWith(n.to);
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
            </div>

            <div className="mt-auto pt-4 md:pt-6 md:border-t border-border/50">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-2 py-2 bg-transparent hover:bg-white/5 rounded-lg transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="w-8 h-8 rounded-md bg-[#e68b1a] text-black flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate font-medium text-foreground text-sm">{user.name || (user.email ? user.email.split('@')[0] : 'User')}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email || 'No details'}</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0"><polyline points="18 15 12 9 6 15"></polyline></svg>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56 mb-2">
                  <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                    {isDark ? (
                      <><svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> Light Mode</>
                    ) : (
                      <><svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> Dark Mode</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { clearAuth(); navigate("/"); }} className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                    <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </nav>
          </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
