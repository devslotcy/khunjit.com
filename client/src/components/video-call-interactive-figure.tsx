import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Video } from "lucide-react";

interface VideoCallInteractiveFigureProps {
  className?: string;
}

export function VideoCallInteractiveFigure({ className = "" }: VideoCallInteractiveFigureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isTapped, setIsTapped] = useState(false);

  // Mouse position values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth spring animations for tilt
  const springConfig = { stiffness: 150, damping: 20 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  // Handle mouse movement for parallax
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalize to -0.5 to 0.5
    const normalizedX = (e.clientX - centerX) / rect.width;
    const normalizedY = (e.clientY - centerY) / rect.height;

    mouseX.set(normalizedX);
    mouseY.set(normalizedY);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // Mobile tap pulse effect
  const handleTap = useCallback(() => {
    setIsTapped(true);
    setTimeout(() => setIsTapped(false), 600);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTap}
      style={{
        perspective: 800,
        transformStyle: "preserve-3d",
      }}
    >
      {/* Main card with tilt effect */}
      <motion.div
        className="relative w-full h-full rounded-2xl bg-card border border-border shadow-xl overflow-hidden"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        animate={isTapped ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 0.6 }}
      >
        {/* Content container */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full p-8 text-center space-y-6">
          {/* Animated video call illustration */}
          <div className="relative">
            {/* Main icon container with call waves */}
            <motion.div
              className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Call waves animation */}
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="absolute inset-0 rounded-full border-2 border-primary/30"
                  initial={{ scale: 1, opacity: 0 }}
                  animate={isHovered || isTapped ? {
                    scale: [1, 1.5, 2],
                    opacity: [0.6, 0.3, 0],
                  } : { scale: 1, opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: isHovered ? Infinity : 0,
                    delay: index * 0.4,
                    ease: "easeOut",
                  }}
                />
              ))}

              {/* Video icon with pulse */}
              <motion.div
                animate={isHovered ? {
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Video className="w-12 h-12 text-primary" />
              </motion.div>
            </motion.div>

            {/* Floating avatars representing video call participants */}
            <motion.div
              className="absolute -left-4 -top-2 w-10 h-10 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center shadow-lg"
              animate={isHovered ? {
                y: [-2, 2, -2],
                x: [-1, 1, -1],
              } : {}}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <span className="text-white text-xs font-semibold">P</span>
            </motion.div>

            <motion.div
              className="absolute -right-4 -bottom-2 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center shadow-lg"
              animate={isHovered ? {
                y: [2, -2, 2],
                x: [1, -1, 1],
              } : {}}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            >
              <span className="text-white text-xs font-semibold">H</span>
            </motion.div>

            {/* Connecting dots animation */}
            {isHovered && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={`dot-${index}`}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                    animate={{
                      x: [0, (index - 1) * 15],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: index * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </div>

          {/* Text content */}
          <div>
            <h3 className="font-serif text-2xl font-semibold mb-2">Görüntülü Görüşme</h3>
            <p className="text-muted-foreground">
              Yüz yüze görüşme kalitesinde, güvenli video seansları
            </p>
          </div>

          {/* Status indicator */}
          <motion.div
            className="flex items-center gap-2 text-sm text-primary"
            animate={isHovered ? { opacity: 1 } : { opacity: 0.7 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full bg-green-500"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
            <span>Uzmanlar müsait</span>
          </motion.div>
        </div>

        {/* Floating particles on hover */}
        {isHovered && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={`particle-${i}`}
                className="absolute w-1 h-1 rounded-full bg-primary/40"
                initial={{
                  x: Math.random() * 100 + "%",
                  y: "100%",
                  opacity: 0,
                }}
                animate={{
                  y: "-20%",
                  opacity: [0, 0.8, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
        )}

        {/* Subtle gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none"
          animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  );
}
