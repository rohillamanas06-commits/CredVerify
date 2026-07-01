import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { VerifyResult } from "@/components/VerifyResult";
import { Footer } from "@/components/Footer";

export default PublicVerify;

function PublicVerify() {
  const { token } = useParams();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (token && (token.startsWith("http://") || token.startsWith("https://"))) {
      setErr("Please enter a valid CredVerify share link. To verify a file directly, go to the app and use 'File' mode to upload it.");
      return;
    }
    api.get(`/verify/link/${encodeURIComponent(token || "")}`).then(r => r.data).then(setData).catch((e) => setErr(e.message));
  }, [token]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-black text-white">
        <div className="container-tight h-14 flex items-center justify-between">
          <Link to="/" className="font-display flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--gold)]" /> CredChain
          </Link>
          <span className="text-xs text-white/50 uppercase tracking-wider">Public verification</span>
        </div>
      </header>

      <main className="flex-1 container-tight py-12 max-w-2xl">
        <h1 className="font-display text-3xl mb-2">Credential verification</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Result computed from our database and the Polygon blockchain.
        </p>

        {err && (
          <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-lg p-6">
            {err}
          </div>
        )}
        {!err && !data && <div className="text-muted-foreground">Verifying…</div>}
        {data && <VerifyResult data={data} />}
      </main>

      <Footer />
    </div>
  );
}
