import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default SharePage;

function SharePage() {
  const [links, setLinks] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    setIsLoading(true);
    api.get("/share-links/mine").then(r => r.data).then(setLinks).catch((e) => setErr(e.message)).finally(() => setIsLoading(false));
  }
  useEffect(load, []);

  async function deactivate(token: string) {
    if (!confirm("Deactivate this link?")) return;
    await api.delete(`/share-links/${token}`);
    load();
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Share links</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create share links from your credentials. Employers can verify without an account.
        </p>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-md">{err}</div>}

      {links.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-card text-sm text-muted-foreground">
          No active share links. Open a credential to create one.
        </div>
      ) : (
        <ul className="divide-y border rounded-lg overflow-hidden bg-card">
          {links.map((l) => {
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${l.token}`;
            return (
              <li key={l.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs truncate">{url}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Accessed {l.access_count} time(s)
                    {l.max_access ? ` · Max ${l.max_access}` : ""}
                    {l.expires_at ? ` · Expires ${new Date(l.expires_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(url).then(() => alert("Copied"))}
                    className="btn-sec"
                  >
                    Copy
                  </button>
                  <button onClick={() => deactivate(l.token)} className="btn-danger">
                    Deactivate
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <style>{`
        .btn-sec { border:1px solid var(--border); padding:6px 12px; border-radius:6px; font-size:13px; }
        .btn-sec:hover { background: var(--muted); }
        .btn-danger { border:1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: #f87171; padding:6px 12px; border-radius:6px; font-size:13px; font-weight: 500; transition: background-color 0.2s; }
        .btn-danger:hover { background: rgba(239, 68, 68, 0.2); }
      `}</style>
    </div>
  );
}
