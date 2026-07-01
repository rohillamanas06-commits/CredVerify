import { useEffect, useState } from "react";
import img1 from "@/assets/auth-1.jpg";
import img2 from "@/assets/auth-2.jpg";

const IMAGES = [img1, img2];

export function AuthCarousel() {
  const [i, setI] = useState(0);
  const [prev, setPrev] = useState(-1);
  useEffect(() => {
    const t = setInterval(() => {
      setI((p) => {
        setPrev(p);
        return (p + 1) % IMAGES.length;
      });
    }, 5000);
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
            i === idx || prev === idx ? "animate-ken-burns" : ""
          } ${i === idx ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {/* Auth carousel images only */}
    </div>
  );
}
