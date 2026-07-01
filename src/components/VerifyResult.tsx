export function VerifyResult({ data }: { data: any }) {
  const result: string = data.result ?? "unknown";
  const colors: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    flagged: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
    mismatch: "bg-destructive/10 text-destructive border-destructive/30",
    pending: "bg-muted text-muted-foreground border-border",
  };
  const cls = colors[result] ?? colors.pending;
  const cred = data.credential;

  return (
    <div className="space-y-4">
      <div className={`border rounded-lg p-6 ${cls}`}>
        <div className="text-xs uppercase tracking-widest opacity-70">Verification result</div>
        <div className="font-display text-4xl mt-1 capitalize">{result}</div>
        <div className="text-sm mt-3 space-y-1">
          <Row k="On-chain match" v={data.chain_match ? "Yes" : "No"} />
          <Row k="Revoked" v={data.is_revoked ? "Yes" : "No"} />
          {data.ai_confidence != null && (
            <Row k="AI confidence" v={`${Math.round(data.ai_confidence * 100)}%`} />
          )}
          {data.ai_fraud_flag != null && (
            <Row k="Fraud flag" v={data.ai_fraud_flag ? "⚠ Yes" : "✓ Clear"} />
          )}
          {data.tx_hash && (
            <Row k="Tx hash" v={<span className="font-mono text-xs break-all">{data.tx_hash}</span>} />
          )}
        </div>
        {data.fraud_indicators && data.fraud_indicators.length > 0 && (
          <div className="mt-3 text-sm space-y-1 opacity-80">
            <div className="text-xs uppercase tracking-widest opacity-70">Fraud indicators</div>
            {data.analysis_layers ? (
              <div className="space-y-1 text-xs">
                {data.analysis_layers.metadata?.length > 0 && (
                  <div><strong>Metadata:</strong> {data.analysis_layers.metadata.join("; ")}</div>
                )}
                {data.analysis_layers.structural?.length > 0 && (
                  <div><strong>Structural:</strong> {data.analysis_layers.structural.join("; ")}</div>
                )}
                {data.analysis_layers.visual_ai?.length > 0 && (
                  <div><strong>Visual AI:</strong> {data.analysis_layers.visual_ai.join("; ")}</div>
                )}
              </div>
            ) : (
              <ul className="text-xs list-disc list-inside">
                {data.fraud_indicators.map((f: string, i: number) => <li key={i}>{f}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {cred && (
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="font-display text-xl mb-3">Credential</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <Item k="Title" v={cred.title} />
            <Item k="Type" v={cred.credential_type} />
            <Item k="Holder" v={cred.candidate_name} />
            <Item k="Issuer" v={cred.institution_name} />
            <Item k="Issued" v={cred.issue_date && new Date(cred.issue_date).toLocaleDateString()} />
            {cred.expiry_date && (
              <Item k="Expires" v={new Date(cred.expiry_date).toLocaleDateString()} />
            )}
          </dl>
          <p className="text-xs font-mono text-muted-foreground mt-4 break-all">
            {cred.document_hash}
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-70">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}
function Item({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v ?? "—"}</dd>
    </div>
  );
}
