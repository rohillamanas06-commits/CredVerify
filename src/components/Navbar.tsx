import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { clearAuth } from "@/lib/api";

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-black text-white border-b border-white/10">
      <div className="w-full px-4 md:px-8 flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg tracking-tight">
          CredChain
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user ? (
            <>
              <Link
                to="/app"
                className="px-3 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="ml-2 px-3 py-1.5 rounded-md bg-white text-black hover:bg-white/90 transition"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
