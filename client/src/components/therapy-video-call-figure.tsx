import { useState, useRef, useCallback, useEffect } from "react";

interface TherapyVideoCallFigureProps {
  className?: string;
}

export function TherapyVideoCallFigure({ className = "" }: TherapyVideoCallFigureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<"left" | "right">("left");

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Alternate speaker every 4s
  useEffect(() => {
    if (prefersReducedMotion) return;
    const interval = setInterval(() => {
      setActiveSpeaker((prev) => (prev === "left" ? "right" : "left"));
    }, 4000);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Handle mouse movement for parallax tilt
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !containerRef.current || !isHovered) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const tiltX = ((e.clientY - centerY) / (rect.height / 2)) * -6;
    const tiltY = ((e.clientX - centerX) / (rect.width / 2)) * 6;

    setTilt({ x: tiltX, y: tiltY });
  }, [prefersReducedMotion, isHovered]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  // Mobile tap pulse
  const handleTap = useCallback(() => {
    if (prefersReducedMotion) return;
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 300);
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
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease-out",
        }}
      >
        {/* SVG Illustration */}
        <div className="flex flex-col items-center justify-center h-full p-8">
          <svg
            viewBox="0 0 280 200"
            className="w-full max-w-[280px]"
            aria-label="Video call illustration between client and therapist"
            role="img"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="tvf-therapist-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="tvf-client-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(160, 45%, 55%)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="hsl(160, 40%, 45%)" stopOpacity="0.7" />
              </linearGradient>
              <linearGradient id="tvf-frame-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.2" />
              </linearGradient>

              {/* Soft shadow filter */}
              <filter id="tvf-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.1" />
              </filter>
            </defs>

            {/* Background rings (very subtle) */}
            {!prefersReducedMotion && (
              <g className="tvf-rings" opacity="0.15">
                <circle
                  cx="140"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1"
                  className="tvf-ring-1"
                />
                <circle
                  cx="140"
                  cy="100"
                  r="100"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="0.5"
                  opacity="0.5"
                  className="tvf-ring-2"
                />
              </g>
            )}

            {/* Video frame background */}
            <rect
              x="30"
              y="25"
              width="220"
              height="150"
              rx="16"
              fill="url(#tvf-frame-grad)"
              filter="url(#tvf-shadow)"
            />

            {/* Divider line */}
            <line
              x1="140"
              y1="40"
              x2="140"
              y2="160"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.5"
            />

            {/* Therapist side (left) */}
            <g className="tvf-therapist">
              {/* Avatar circle */}
              <circle
                cx="85"
                cy="95"
                r="35"
                fill="url(#tvf-therapist-grad)"
                filter="url(#tvf-shadow)"
              />
              {/* Silhouette - head */}
              <circle cx="85" cy="85" r="12" fill="hsl(var(--background))" opacity="0.9" />
              {/* Silhouette - shoulders */}
              <ellipse cx="85" cy="115" rx="16" ry="10" fill="hsl(var(--background))" opacity="0.9" />

              {/* Speaking indicator dots (left) */}
              <g
                className="tvf-speaking-left"
                style={{
                  opacity: activeSpeaker === "left" ? 1 : 0.2,
                  transition: "opacity 0.5s ease-in-out",
                }}
              >
                <circle
                  cx="70"
                  cy="140"
                  r="3"
                  fill="hsl(var(--primary))"
                  className={!prefersReducedMotion && activeSpeaker === "left" ? "tvf-dot-1" : ""}
                />
                <circle
                  cx="85"
                  cy="140"
                  r="3"
                  fill="hsl(var(--primary))"
                  className={!prefersReducedMotion && activeSpeaker === "left" ? "tvf-dot-2" : ""}
                />
                <circle
                  cx="100"
                  cy="140"
                  r="3"
                  fill="hsl(var(--primary))"
                  className={!prefersReducedMotion && activeSpeaker === "left" ? "tvf-dot-3" : ""}
                />
              </g>
            </g>

            {/* Client side (right) */}
            <g className="tvf-client">
              {/* Avatar circle */}
              <circle
                cx="195"
                cy="95"
                r="35"
                fill="url(#tvf-client-grad)"
                filter="url(#tvf-shadow)"
              />
              {/* Silhouette - head */}
              <circle cx="195" cy="85" r="12" fill="hsl(var(--background))" opacity="0.9" />
              {/* Silhouette - shoulders */}
              <ellipse cx="195" cy="115" rx="16" ry="10" fill="hsl(var(--background))" opacity="0.9" />

              {/* Speaking indicator dots (right) */}
              <g
                className="tvf-speaking-right"
                style={{
                  opacity: activeSpeaker === "right" ? 1 : 0.2,
                  transition: "opacity 0.5s ease-in-out",
                }}
              >
                <circle
                  cx="180"
                  cy="140"
                  r="3"
                  fill="hsl(160, 45%, 50%)"
                  className={!prefersReducedMotion && activeSpeaker === "right" ? "tvf-dot-1" : ""}
                />
                <circle
                  cx="195"
                  cy="140"
                  r="3"
                  fill="hsl(160, 45%, 50%)"
                  className={!prefersReducedMotion && activeSpeaker === "right" ? "tvf-dot-2" : ""}
                />
                <circle
                  cx="210"
                  cy="140"
                  r="3"
                  fill="hsl(160, 45%, 50%)"
                  className={!prefersReducedMotion && activeSpeaker === "right" ? "tvf-dot-3" : ""}
                />
              </g>
            </g>

            {/* Camera icon (top center) */}
            <g transform="translate(125, 8)">
              <rect x="0" y="0" width="30" height="18" rx="4" fill="hsl(var(--foreground))" opacity="0.8" />
              <circle cx="15" cy="9" r="5" fill="none" stroke="hsl(var(--background))" strokeWidth="1.5" />
              <circle cx="15" cy="9" r="2" fill="hsl(var(--background))" />
              {/* Recording dot */}
              <circle
                cx="26"
                cy="4"
                r="2"
                fill="hsl(0, 70%, 55%)"
                className={!prefersReducedMotion ? "tvf-rec-dot" : ""}
              />
            </g>

            {/* Connection status (top right) */}
            <circle
              cx="240"
              cy="35"
              r="4"
              fill="hsl(142, 70%, 45%)"
              className={!prefersReducedMotion ? "tvf-status-dot" : ""}
            />
          </svg>

          {/* Text content below SVG */}
          <div className="text-center mt-6 space-y-2">
            <h3 className="font-serif text-2xl font-semibold">Video Call</h3>
            <p className="text-muted-foreground text-sm max-w-[220px]">
              Secure video sessions with the quality of face-to-face meetings
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-4 text-sm text-primary">
            <span
              className={`w-2 h-2 rounded-full bg-green-500 ${!prefersReducedMotion ? "tvf-status-dot" : ""}`}
            />
            <span>Experts available</span>
          </div>
        </div>

        {/* Hover glow overlay */}
        {isHovered && !prefersReducedMotion && (
          <div
            className="absolute inset-0 pointer-events-none rounded-2xl"
            style={{
              background: "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.08) 0%, transparent 65%)",
            }}
          />
        )}
      </div>

      {/* CSS Keyframes */}
      <style>{`
        /* Speaking dots animation - sequential pulse */
        @keyframes tvfDot1 {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          25% { opacity: 1; transform: translateY(-2px); }
          50% { opacity: 0.4; transform: translateY(0); }
        }
        @keyframes tvfDot2 {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          35% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
          65% { opacity: 0.4; transform: translateY(0); }
        }
        @keyframes tvfDot3 {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          60% { opacity: 0.4; transform: translateY(0); }
          75% { opacity: 1; transform: translateY(-2px); }
          90% { opacity: 0.4; transform: translateY(0); }
        }

        .tvf-dot-1 { animation: tvfDot1 1.2s ease-in-out infinite; }
        .tvf-dot-2 { animation: tvfDot2 1.2s ease-in-out infinite; }
        .tvf-dot-3 { animation: tvfDot3 1.2s ease-in-out infinite; }

        /* Status/recording dot breathing */
        @keyframes tvfStatusBreathe {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }

        .tvf-status-dot { animation: tvfStatusBreathe 2.5s ease-in-out infinite; }

        /* Recording dot blink */
        @keyframes tvfRecBlink {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.3; }
        }

        .tvf-rec-dot { animation: tvfRecBlink 1.5s ease-in-out infinite; }

        /* Background rings subtle pulse */
        @keyframes tvfRing {
          0%, 100% { transform: scale(1); opacity: 0.15; }
          50% { transform: scale(1.02); opacity: 0.1; }
        }

        .tvf-ring-1 { animation: tvfRing 5s ease-in-out infinite; transform-origin: center; }
        .tvf-ring-2 { animation: tvfRing 6s ease-in-out infinite 0.5s; transform-origin: center; }

        /* Disable all for reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .tvf-dot-1, .tvf-dot-2, .tvf-dot-3,
          .tvf-status-dot, .tvf-rec-dot,
          .tvf-ring-1, .tvf-ring-2 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
