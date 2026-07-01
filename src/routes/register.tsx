import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { AuthCarousel } from "@/components/AuthCarousel";
import { api, setAuth, type Role } from "@/lib/api";

export default Register;

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("candidate");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = (await api.post("/auth/register", { name, email, password, role })).data;
      setAuth(r.access_token);
      navigate("/app");
    } catch (e: any) {
      setErr(e.response?.data?.detail || e.message);
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
          <h1 className="font-display text-3xl mb-2">Create account</h1>
          <p className="text-white/60 text-sm mb-8">
            Join as a candidate or employer. Institutions sign in with their wallet.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("candidate")}
                className={`py-2 rounded-md text-sm border transition ${role === "candidate"
                    ? "bg-white text-black border-white"
                    : "border-white/15 text-white/70 hover:bg-white/5"
                  }`}
              >
                Candidate
              </button>
              <button
                type="button"
                onClick={() => setRole("employer")}
                className={`py-2 rounded-md text-sm border transition ${role === "employer"
                    ? "bg-white text-black border-white"
                    : "border-white/15 text-white/70 hover:bg-white/5"
                  }`}
              >
                Employer
              </button>
            </div>

            <Field label="Full name">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Jane Doe"
              />
            </Field>
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
                minLength={6}
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
              {loading ? "Creating…" : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-sm text-white/60">
            Already have an account?{" "}
            <Link to="/login" className="text-[color:var(--gold)] hover:underline">
              Sign in
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
