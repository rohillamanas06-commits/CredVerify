import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export default Overview;

function Overview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ total: number; verified: number; flagged: number } | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    if (user.role === "employer") {
      setRecent([]);
      setStats({ total: 0, verified: 0, flagged: 0 });
      setIsLoading(false);
      return;
    }
    const loader =
      user.role === "institution" ? api.get("/credentials/issued").then(r => r.data) : api.get("/credentials/mine").then(r => r.data);
    loader
      .then((list) => {
        setRecent(list.slice(0, 5));
        setStats({
          total: list.length,
          verified: list.filter((c: any) => c.on_chain && c.status !== "revoked").length,
          flagged: list.filter((c: any) => c.ai_fraud_flag).length,
        });
      })
      .catch((e) => setErr(e.message))
      .finally(() => setIsLoading(false));
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">
          {user?.role === "institution" ? "Issuer dashboard" : user?.role === "employer" ? "Verify hub" : "Your credentials"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.role === "institution"
            ? "Issue and manage credentials anchored on Polygon."
            : user?.role === "employer"
            ? "Verify candidates' credentials via share links or document hash."
            : "Hold, share, and verify your credentials."}
        </p>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-md">{err}</div>}

      {user?.role !== "employer" && (
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Total" value={stats?.total ?? "—"} />
          <Stat label="Verified on-chain" value={stats?.verified ?? "—"} />
          <Stat label="Flagged" value={stats?.flagged ?? "—"} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {user?.role === "institution" && (
          <Link to="/app/issue" className="btn-primary">Issue credential</Link>
        )}
        {user?.role === "candidate" && (
          <Link to="/app/share" className="btn-primary">Create share link</Link>
        )}
        <Link to="/app/verify" className="btn-secondary">Verify a credential</Link>
      </div>

      {user?.role !== "employer" && (
        <section>
          <h2 className="font-display text-xl mb-3">Recent</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No credentials yet.</p>
          ) : (
            <ul className="divide-y border rounded-lg overflow-hidden bg-card">
              {recent.map((c) => (
                <li key={c.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.credential_type} · {new Date(c.issue_date).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusBadge cred={c} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <style>{`
        .btn-primary { background: var(--foreground); color: var(--background); padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-secondary { border:1px solid var(--border); padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; }
        .btn-secondary:hover { background: var(--muted); }
      `}</style>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-5 bg-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-3xl mt-2">{value}</div>
    </div>
  );
}

export function StatusBadge({ cred }: { cred: any }) {
  const revoked = cred.status === "revoked";
  const flagged = cred.ai_fraud_flag;
  const onChain = cred.on_chain;
  const cls = revoked
    ? "bg-red-500/20 text-red-400 border border-red-500/30"
    : flagged
    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
    : onChain
    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
    : "bg-white/10 text-white/70 border border-white/20";
  const label = revoked ? "Revoked" : flagged ? "Flagged" : onChain ? "On-chain" : "Pending";
  return <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}
