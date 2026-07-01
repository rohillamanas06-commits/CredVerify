import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { AuthCarousel } from "@/components/AuthCarousel";
import { api, setAuth } from "@/lib/api";

export default Login;

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = (await api.post("/auth/login", { email, password })).data;
      setAuth(r.access_token);
      navigate("/app");
    } catch (e: any) {
      setErr(e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  }

  async function walletLogin() {
    setErr(null);
    setLoading(true);
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("MetaMask not detected.");
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const wallet = accounts[0];
      const { message } = (await api.get(`/auth/nonce/${wallet}`)).data;
      const hexMessage = "0x" + Array.from(new TextEncoder().encode(message)).map(b => b.toString(16).padStart(2, '0')).join('');
      const signature: string = await eth.request({
        method: "personal_sign",
        params: [hexMessage, wallet],
      });
      const r = (await api.post("/auth/wallet-login", { wallet_address: wallet, message, signature })).data;
      setAuth(r.access_token);
      navigate("/app");
    } catch (e: any) {
      const detail = e.response?.data?.detail;
      if (e.response?.status === 403) {
        setErr("This wallet is not registered as a trusted institution. Contact the platform admin for approval.");
      } else if (e.response?.status === 401) {
        setErr(detail || "Signature expired or invalid. Please try again.");
      } else {
        setErr(detail || e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-black">
      <div className="flex w-full lg:w-[30%] flex-col bg-black text-white px-8 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to home
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          <h1 className="font-display text-3xl mb-2">Welcome back</h1>
          <p className="text-white/60 text-sm mb-8">Sign in to your account.</p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </Field>

            {err && <p className="text-red-400 text-sm">{err}</p>}

            <button
              disabled={loading}
              className="w-full bg-white text-black rounded-md py-2.5 text-sm font-medium hover:bg-white/90 transition disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-white/40">
            <div className="h-px flex-1 bg-white/10" /> OR <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            onClick={walletLogin}
            disabled={loading}
            className="w-full border border-white/20 rounded-md py-2.5 text-sm font-medium hover:bg-white/5 transition"
          >
            Institution wallet login
          </button>

          <p className="mt-8 text-sm text-white/60">
            No account?{" "}
            <Link to="/register" className="text-[color:var(--gold)] hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-[70%]">
        <AuthCarousel />
      </div>

      <style>{`
        .input { width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); color:white; border-radius:6px; padding:10px 12px; font-size:14px; outline:none; }
        .input:focus { border-color: var(--gold); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-white/60 uppercase tracking-wider">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
