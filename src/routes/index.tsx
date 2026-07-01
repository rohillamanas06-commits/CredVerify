import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import hero from "@/assets/home-hero.jpg";

export default Home;

function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="relative h-[calc(100vh-3.5rem)] w-full overflow-hidden">
        <img
          src={hero}
          alt="Holographic verified credential floating in a blockchain network"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Hero image only */}
      </main>
      <Footer />
    </div>
  );
}
