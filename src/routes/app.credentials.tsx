import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "./app.index";
import { Loader2 } from "lucide-react";

export default CredentialsPage;

function CredentialsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function load() {
    if (!user) return;
    setIsLoading(true);
    if (user.role === "employer") {
      setItems([]);
      setIsLoading(false);
      return;
    }
    const p = user.role === "institution" ? api.get("/credentials/issued").then(r => r.data) : api.get("/credentials/mine").then(r => r.data);
    p.then(setItems).catch((e) => setErr(e.message)).finally(() => setIsLoading(false));
  }
  useEffect(load, [user]);

  async function viewDoc(id: string) {
    try {
      const { url } = (await api.get(`/credentials/${id}/document`)).data;
      window.open(url, "_blank");
    } catch (e: any) { alert(e.message); }
  }

  async function revoke(id: string) {
    const reason = prompt("Reason for revoking?");
    if (!reason) return;
    setBusy(id);
    try {
      await api.post(`/credentials/${id}/revoke`, { reason });
      load();
    } catch (e: any) { alert(e.message); } finally { setBusy(null); }
  }

  async function createShare(id: string) {
    try {
      const r = (await api.post("/share-links", { credential_id: id, expires_in_hours: 72 })).data;
      const fullUrl = `${window.location.origin}/verify/${r.token}`;
      await navigator.clipboard.writeText(fullUrl);
      alert(`Share link copied to clipboard:\n${fullUrl}`);
    } catch (e: any) { alert(e.message); }
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
        <h1 className="font-display text-3xl">Credentials</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {user?.role === "institution" ? "Credentials you've issued." : "Credentials issued to you."}
        </p>
      </div>

      {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-md">{err}</div>}

      {items.length === 0 ? (
        <div className="border rounded-lg p-12 text-center bg-card">
          <p className="text-muted-foreground text-sm">No credentials yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((c) => (
            <article key={c.id} className="border rounded-lg p-5 bg-card hover:shadow-sm transition">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-lg truncate">{c.title}</h3>
                    <StatusBadge cred={c} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.credential_type}
                    {c.institution_name && ` · ${c.institution_name}`}
                    {c.candidate_name && ` · for ${c.candidate_name}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Issued {new Date(c.issue_date).toLocaleDateString()}
                    {c.expiry_date && ` · Expires ${new Date(c.expiry_date).toLocaleDateString()}`}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground mt-2 truncate">
                    {c.document_hash?.slice(0, 32)}…
                  </p>
                  {c.ai_confidence != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      AI confidence: {Math.round(c.ai_confidence * 100)}%
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => viewDoc(c.id)} className="btn-sec">Document</button>
                  {user?.role === "candidate" && c.status !== "revoked" && (
                    <button onClick={() => createShare(c.id)} className="btn-sec">Share</button>
                  )}
                  {user?.role === "institution" && c.status !== "revoked" && (
                    <button onClick={() => revoke(c.id)} disabled={busy === c.id} className="btn-danger">
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
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
