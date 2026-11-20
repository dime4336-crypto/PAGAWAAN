import { useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

export function PrecisionCursor() {
  const prefersReducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [pressed, setPressed] = useState(false);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const smoothX = useSpring(cursorX, { damping: 28, stiffness: 420, mass: 0.4 });
  const smoothY = useSpring(cursorY, { damping: 28, stiffness: 420, mass: 0.4 });

  useEffect(() => {
    if (prefersReducedMotion || typeof window === 'undefined') {
      setEnabled(false);
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updateEnabled = () => setEnabled(mediaQuery.matches && window.innerWidth >= 1024);
    updateEnabled();

    mediaQuery.addEventListener('change', updateEnabled);
    window.addEventListener('resize', updateEnabled);

    return () => {
      mediaQuery.removeEventListener('change', updateEnabled);
      window.removeEventListener('resize', updateEnabled);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!enabled) return;

    const handleMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const annotated = target?.closest('[data-cursor-label]') as HTMLElement | null;
      setLabel(annotated?.dataset.cursorLabel || null);
    };

    const handleDown = () => setPressed(true);
    const handleUp = () => setPressed(false);
    const handleLeave = () => setVisible(false);

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mousedown', handleDown);
    window.addEventListener('mouseup', handleUp);
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mouseup', handleUp);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled, cursorX, cursorY]);

  if (!enabled || !visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[70] hidden lg:block"
      style={{
        x: smoothX,
        y: smoothY,
      }}
    >
      <div
        className={`relative -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 ${
          pressed ? 'scale-75' : label ? 'scale-110' : 'scale-100'
        }`}
      >
        {/* Mechanical reticle ring */}
        <div
          className={`h-6 w-6 rounded-full border transition-colors duration-150 ${
            label
              ? 'border-[#D97724] bg-[#D97724]/10'
              : 'border-[#EDE6D6]/45 bg-transparent'
          }`}
        />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D97724]" />

        {label && (
          <div className="absolute left-7 top-1/2 -translate-y-1/2 whitespace-nowrap border border-[#D97724]/50 bg-[#1B1917] px-2 py-0.5 font-mono text-[11px] font-medium text-[#EDE6D6] shadow-md">
            {label}
          </div>
        )}
      </div>
    </motion.div>
  );
}
