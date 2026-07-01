export function Footer() {
  return (
    <footer className="bg-black text-white/70 border-t border-white/10">
      <div className="container-tight py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--gold)]" />
          <span className="font-display text-white">CredChain</span>
          <span className="text-white/40">— verified credentials, on-chain.</span>
        </div>
        <div className="text-white/40">
          © {new Date().getFullYear()} CredChain. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
