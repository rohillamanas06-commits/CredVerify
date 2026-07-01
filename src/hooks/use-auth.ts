import { useEffect, useState } from "react";
import { getUser, type AuthUser } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(getUser());
    setReady(true);
    const handler = () => setUser(getUser());
    window.addEventListener("credchain-auth", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("credchain-auth", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return { user, ready };
}
