import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import hero from "@/assets/home-hero.jpg";

const pillars = [
  {
    num: "01",
    title: "Issue Credentials",
    lead: "Secure and verifiable.",
    body: "Upload documents. Our AI runs multi-layered forensic checks and anchors the cryptographic hash immutably to the Polygon blockchain."
  },
  {
    num: "02",
    title: "Share Instantly",
    lead: "Proof at your fingertips.",
    body: "Candidates can easily generate secure, one-click shareable links to prove their qualifications to employers or institutions."
  },
  {
    num: "03",
    title: "Verify Seamlessly",
    lead: "Trust without friction.",
    body: "Employers can instantly verify the authenticity of any credential via share link, document hash, or by directly uploading the file."
  },
  {
    num: "04",
    title: "Cryptographic Proof",
    lead: "Unforgeable records.",
    body: "Backed by immutable smart contracts, ensuring every document was issued by a whitelisted institution and remains unaltered."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <main className="w-full">
        <section className="relative h-[calc(100vh-3.5rem)] w-full flex items-center justify-center overflow-hidden shrink-0">
          <div className="absolute inset-0 z-0">
            <img
              src={hero}
              alt="Holographic verified credential floating in a blockchain network"
              className="h-full w-full object-cover"
            />
          </div>
          
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-6">
          </div>
        </section>

        {/* ── Editorial feature rows ────────────────────────────── */}
        <section className="bg-black">
          {pillars.map((p, i) => (
            <div key={p.num} className="border-t border-white/10">
              <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
                <div
                  className={`flex flex-col gap-8 sm:gap-16 ${i % 2 === 0
                    ? "lg:flex-row"
                    : "lg:flex-row-reverse"
                    } lg:items-start`}
                >
                  {/* left / right — big number + title */}
                  <div className="lg:w-2/5 flex flex-col">
                    <span className="font-serif italic text-6xl sm:text-8xl font-extralight text-white/20 leading-none select-none">
                      {p.num}
                    </span>
                    <h3 className="mt-3 text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                      {p.title}
                    </h3>
                    <p className="mt-2 font-serif text-lg sm:text-xl italic text-gray-400">
                      {p.lead}
                    </p>
                  </div>

                  {/* right / left — description */}
                  <div className="lg:w-3/5 lg:pt-12">
                    <p className="text-base sm:text-lg text-gray-300 leading-relaxed">
                      {p.body}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
