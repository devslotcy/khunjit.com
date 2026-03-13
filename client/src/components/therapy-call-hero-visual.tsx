import { useState, useRef, useCallback, useEffect } from "react";

interface TherapyCallHeroVisualProps {
  className?: string;
}

export function TherapyCallHeroVisual({ className = "" }: TherapyCallHeroVisualProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Handle mouse movement for parallax tilt
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate tilt based on mouse position (-8 to 8 degrees)
    const tiltX = ((e.clientY - centerY) / (rect.height / 2)) * -8;
    const tiltY = ((e.clientX - centerX) / (rect.width / 2)) * 8;

    setTilt({ x: tiltX, y: tiltY });
  }, [prefersReducedMotion]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  // Mobile tap pulse
  const handleTap = useCallback(() => {
    if (prefersReducedMotion) return;
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 400);
  }, [prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTap}
      style={{ perspective: "1000px" }}
    >
      {/* Card container with tilt effect */}
      <div
        className={`
          relative w-full h-full rounded-2xl bg-card border border-border shadow-xl overflow-hidden
          transition-all duration-300 ease-out
          ${isHovered && !prefersReducedMotion ? "shadow-2xl shadow-primary/20" : ""}
          ${isTapped && !prefersReducedMotion ? "scale-[1.02]" : ""}
        `}
        style={{
          transform: prefersReducedMotion
            ? "none"
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? "scale(1.02)" : "scale(1)"}`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Image container */}
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          {/* Placeholder skeleton while loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}

          {/* Real image with picture element for format fallback */}
          <picture>
            <source srcSet="/hero/therapy-call.webp" type="image/webp" />
            <img
              src="/hero/therapy-call.jpg"
              alt="Online therapy video call session - a professional and calming virtual consultation"
              className={`
                w-full h-full object-cover
                transition-all duration-500 ease-out
                ${imageLoaded ? "opacity-100" : "opacity-0"}
                ${isHovered && !prefersReducedMotion ? "scale-105" : "scale-100"}
              `}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
            />
          </picture>

          {/* Call wave animation overlay */}
          {!prefersReducedMotion && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Expanding rings */}
                <div
                  className={`
                    absolute w-20 h-20 rounded-full border-2 border-primary/40
                    -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2
                    ${isHovered ? "animate-call-wave-1" : "opacity-0"}
                  `}
                />
                <div
                  className={`
                    absolute w-20 h-20 rounded-full border-2 border-primary/30
                    -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2
                    ${isHovered ? "animate-call-wave-2" : "opacity-0"}
                  `}
                />
                <div
                  className={`
                    absolute w-20 h-20 rounded-full border-2 border-primary/20
                    -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2
                    ${isHovered ? "animate-call-wave-3" : "opacity-0"}
                  `}
                />

                {/* Center video icon */}
                <div
                  className={`
                    relative w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center
                    shadow-lg backdrop-blur-sm
                    transition-transform duration-300
                    ${isHovered ? "scale-110" : "scale-100"}
                  `}
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        </div>

        {/* Text content below image */}
        <div className="relative z-10 p-6 -mt-16">
          <div className="text-white">
            <h3 className="font-serif text-2xl font-semibold">Video Call</h3>
            <p className="text-white/80 text-sm mt-1 max-w-[220px]">
              Secure video sessions with the quality of face-to-face meetings
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-4 text-sm">
            <span
              className={`w-2 h-2 rounded-full bg-green-500 ${!prefersReducedMotion ? "animate-pulse" : ""}`}
            />
            <span className="text-white/90">Experts available</span>
          </div>
        </div>

        {/* Hover glow overlay */}
        {isHovered && !prefersReducedMotion && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: "radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.15) 0%, transparent 60%)",
            }}
          />
        )}
      </div>

      {/* CSS Keyframes for call wave animation */}
      <style>{`
        @keyframes call-wave-1 {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes call-wave-2 {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes call-wave-3 {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          100% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        .animate-call-wave-1 {
          animation: call-wave-1 2s ease-out infinite;
        }

        .animate-call-wave-2 {
          animation: call-wave-2 2s ease-out infinite 0.4s;
        }

        .animate-call-wave-3 {
          animation: call-wave-3 2s ease-out infinite 0.8s;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-call-wave-1,
          .animate-call-wave-2,
          .animate-call-wave-3 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
