import { Link, useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { VerifyResult } from "@/components/VerifyResult";

export default VerifyPage;

function VerifyPage() {
  const [mode, setMode] = useState<"link" | "hash" | "file">("link");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setLoading(true); setResult(null);
    try {
      const v = value.trim();
      let r: any;
      if (mode === "link") {
        const token = v.includes("/verify/") ? v.split("/verify/")[1] : v;
        if (token.startsWith("http://") || token.startsWith("https://")) {
            throw new Error("Please enter a valid CredVerify share link. To verify a file, switch to 'File' mode and select the document.");
        }
        r = (await api.get(`/verify/link/${encodeURIComponent(token)}`)).data;
      } else if (mode === "hash") {
        r = (await api.get(`/verify/hash/${encodeURIComponent(v)}`)).data;
      } else if (mode === "file") {
        if (!file) throw new Error("Please select a file to verify.");
        const fd = new FormData();
        fd.append("file", file);
        r = (await api.post("/verify/file", fd)).data;
      }
      setResult(r);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="font-display text-3xl">Verify a credential</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paste a share link or document hash. Result is checked against the database and Polygon.
        </p>
      </div>

      <form onSubmit={submit} className="border rounded-lg p-6 bg-card space-y-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => setMode("link")} className={pill(mode === "link")}>Share link</button>
          <button type="button" onClick={() => setMode("hash")} className={pill(mode === "hash")}>Document hash</button>
          <button type="button" onClick={() => setMode("file")} className={pill(mode === "file")}>File</button>
        </div>
        {mode === "file" ? (
          <input
            key="file-input"
            type="file"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-foreground"
          />
        ) : (
          <input
            key="text-input"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={mode === "link" ? "Paste share link or token" : "SHA-256 document hash"}
            className="w-full bg-background border border-border rounded-md px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-foreground"
          />
        )}
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button disabled={loading} className="bg-foreground text-background px-4 py-2.5 rounded-md text-sm font-medium disabled:opacity-50">
          {loading ? "Verifying…" : "Verify"}
        </button>
      </form>

      {result && <VerifyResult data={result} />}
    </div>
  );
}

function pill(active: boolean) {
  return `px-3 py-1.5 rounded-md text-sm border transition ${
    active ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
  }`;
}
