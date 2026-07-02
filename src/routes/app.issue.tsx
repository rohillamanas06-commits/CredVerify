import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { Loader2, ChevronsUpDown } from "lucide-react";

export default IssuePage;

function IssuePage() {
  const navigate = useNavigate();
  const [candidateEmail, setCandidateEmail] = useState("");
  const [type, setType] = useState("Degree");
  const [title, setTitle] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiry, setExpiry] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setErr("Please choose a document.");
    setErr(null); setLoading(true); setResult(null);
    try {
      const fd = new FormData();
      fd.append("candidate_email", candidateEmail);
      fd.append("credential_type", type);
      fd.append("title", title);
      fd.append("issue_date", new Date(issueDate).toISOString());
      if (expiry) fd.append("expiry_date", new Date(expiry).toISOString());
      fd.append("file", file);
      const r = (await api.post("/credentials/issue", fd)).data;
      setResult(r);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-display text-3xl">Issue credential</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload the document. AI will analyze it and the hash will be anchored to Polygon.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4 border rounded-lg p-6 bg-card">
        <Field label="Candidate email">
          <input type="email" required value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Credential type">
            <div className="relative">
              <select value={type} onChange={(e) => setType(e.target.value)} className="input appearance-none pr-10">
                <option>Degree</option>
                <option>Diploma</option>
                <option>Certificate</option>
                <option>License</option>
              </select>
              <ChevronsUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-muted-foreground opacity-70" />
            </div>
          </Field>
          <Field label="Title">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="B.Tech Computer Science" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Issue date">
            <input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="input" />
          </Field>
          <Field label="Expiry date (optional)">
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="input" />
          </Field>
        </div>
        <Field label="Document (PDF or image, max 10MB)">
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="input" />
        </Field>

        {err && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-md">{err}</div>}

        <button disabled={loading} className="btn-primary flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Issuing…" : "Issue credential"}
        </button>
      </form>

      {result && (
        <div className="border rounded-lg p-6 bg-card space-y-3">
          <h2 className="font-display text-xl">Issued ✓</h2>
          <p className="text-sm">Credential ID: <span className="font-mono text-xs">{result.credential_id}</span></p>
          <p className="text-sm">Document hash: <span className="font-mono text-xs break-all">{result.document_hash}</span></p>
          {result.ai_confidence != null && (
            <p className="text-sm">AI confidence: <strong>{Math.round(result.ai_confidence * 100)}%</strong></p>
          )}
          {result.ai_fraud_flag && (
            <div className="text-sm text-yellow-400 bg-yellow-500/20 border border-yellow-500/30 p-3 rounded space-y-2">
              <p className="font-medium">⚠ Fraud indicators detected</p>
              {result.analysis_layers ? (
                <div className="space-y-1 text-xs">
                  {result.analysis_layers.metadata?.length > 0 && (
                    <div><strong>Metadata:</strong> {result.analysis_layers.metadata.join("; ")}</div>
                  )}
                  {result.analysis_layers.structural?.length > 0 && (
                    <div><strong>Structural:</strong> {result.analysis_layers.structural.join("; ")}</div>
                  )}
                  {result.analysis_layers.visual_ai?.length > 0 && (
                    <div><strong>Visual AI:</strong> {result.analysis_layers.visual_ai.join("; ")}</div>
                  )}
                </div>
              ) : (
                <p>{(result.fraud_indicators ?? []).join(", ") || "see AI notes"}</p>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{result.on_chain_status}</p>
          <button onClick={() => navigate("/app/credentials")} className="btn-primary">View all</button>
        </div>
      )}

      <style>{`
        .input { width:100%; background:var(--background); border:1px solid var(--border); border-radius:6px; padding:9px 12px; font-size:14px; color:var(--foreground); }
        .input:focus { outline:none; border-color: var(--foreground); }
        .btn-primary { background: var(--foreground); color: var(--background); padding: 10px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; }
        .btn-primary:disabled { opacity: 0.5; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
