import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-black text-white/70 border-t border-white/10 pt-8 pb-8">
      <div className="w-full pl-8 pr-4 md:pl-16 md:pr-8 mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-1 max-w-xs">
          <div className="font-display text-white text-2xl mb-4">CredChain</div>
          <p className="text-sm text-white/60 mb-6">
            An open platform for verified credentials. Issue, share, and verify blockchain-anchored records instantly.
          </p>
          <div className="flex gap-4">
            <a href="https://github.com/rohillamanas06-commits/CredVerify" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
            </a>
            <a href="https://www.linkedin.com/in/manas-rohilla" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            <a href="mailto:rohillamanas06@gmail.com" className="text-white/60 hover:text-white transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4">Product</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><Link to="/app" className="hover:text-white transition">Dashboard</Link></li>
            <li><Link to="/app/verify" className="hover:text-white transition">Verify Credential</Link></li>
            <li><Link to="/register" className="hover:text-white transition">Issue Credential</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Other Products</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><a href="https://resuai.co.in" target="_blank" rel="noreferrer" className="hover:text-white transition">ResuAI</a></li>
            <li><a href="https://med-mate-ai-health-assistant-v2.vercel.app" target="_blank" rel="noreferrer" className="hover:text-white transition">Med-Mate</a></li>
            <li><a href="https://cosmos-galaxy.vercel.app" target="_blank" rel="noreferrer" className="hover:text-white transition">Cosmos</a></li>
            <li><a href="https://cortex-ai-v1.vercel.app" target="_blank" rel="noreferrer" className="hover:text-white transition">Cortex</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><Link to="/page/about" className="hover:text-white transition">About Us</Link></li>
            <li><Link to="/page/faq" className="hover:text-white transition">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li><Link to="/page/terms-of-service" className="hover:text-white transition">Terms of Service</Link></li>
            <li><Link to="/page/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
            <li><Link to="/page/cookie-policy" className="hover:text-white transition">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>

      <div className="w-full px-4 md:px-8 mx-auto mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40">
        <div>
          © {new Date().getFullYear()} CredChain. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
