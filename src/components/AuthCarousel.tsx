import { useEffect, useState } from "react";
import img1 from "@/assets/auth-1.jpg";
import img2 from "@/assets/auth-2.jpg";

const IMAGES = [img1, img2];

export function AuthCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % IMAGES.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {IMAGES.map((src, idx) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ${
            i === idx ? "opacity-100 animate-ken-burns" : "opacity-0"
          }`}
        />
      ))}
      {/* Auth carousel images only */}
    </div>
  );
}
