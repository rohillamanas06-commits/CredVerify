import { Link, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

const PAGE_CONTENT: Record<string, { title: string, content: React.ReactNode }> = {
  "about": {
    title: "About Us",
    content: (
      <>
        <p>CredChain is a pioneering platform dedicated to revolutionizing how credentials are issued, shared, and verified. By combining advanced AI document analysis with the immutable security of the Polygon blockchain, we ensure every credential is tamper-proof and instantly verifiable.</p>
        <p>Our mission is to build a trustless ecosystem for educational institutions, employers, and candidates, eliminating credential fraud and streamlining the verification process globally.</p>
      </>
    )
  },
  "faq": {
    title: "Frequently Asked Questions",
    content: (
      <>
        <h3 className="text-xl text-white font-medium mt-6 mb-2">How does it work?</h3>
        <p>Institutions issue credentials which are hashed and anchored to the Polygon blockchain. Candidates can share a secure link, and anyone can verify the credential's authenticity in seconds without requiring technical knowledge.</p>
        <h3 className="text-xl text-white font-medium mt-6 mb-2">Is it secure?</h3>
        <p>Yes. The underlying document data is never exposed publicly. We only store cryptographic hashes on the blockchain, ensuring complete data privacy while guaranteeing absolute authenticity.</p>
      </>
    )
  },
  "terms-of-service": {
    title: "Terms of Service",
    content: (
      <>
        <p>Welcome to CredChain. By accessing or using our platform, you agree to be bound by these Terms of Service. Our services allow institutions to issue credentials and users to verify them via the Polygon blockchain.</p>
        <p>You agree not to misuse our platform, submit false documentation, or attempt to bypass our AI verification systems. We reserve the right to suspend or terminate accounts that violate these terms.</p>
      </>
    )
  },
  "privacy-policy": {
    title: "Privacy Policy",
    content: (
      <>
        <p>At CredChain, your privacy is our priority. We collect basic account information (such as your email and name) to provide our services. We do not store sensitive credential documents directly on the public blockchain.</p>
        <p>All verification hashes are anonymized. We do not sell your personal data to third parties. For data deletion requests, please contact our support team.</p>
      </>
    )
  },
  "cookie-policy": {
    title: "Cookie Policy",
    content: (
      <>
        <p>We use cookies to improve your experience on CredChain. These include essential cookies required for authentication and session management, as well as analytics cookies to help us understand how our platform is used.</p>
        <p>You can control or delete cookies through your browser settings. However, disabling essential cookies may prevent you from logging into your account or verifying credentials.</p>
      </>
    )
  }
};

export default function StaticPage() {
  const { pageId } = useParams();
  
  const pageData = pageId && PAGE_CONTENT[pageId] ? PAGE_CONTENT[pageId] : {
    title: "Page Not Found",
    content: <p>The page you are looking for does not exist.</p>
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      <main className="flex-1 w-full max-w-4xl px-4 md:px-8 mx-auto py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition mb-10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to home
        </Link>
        <h1 className="font-display text-4xl mb-8">{pageData.title}</h1>
        <div className="text-white/70 max-w-3xl space-y-4">
          {pageData.content}
        </div>
      </main>
    </div>
  );
}
