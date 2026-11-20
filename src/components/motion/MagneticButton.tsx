import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

interface MagneticButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  strength?: number;
  cursorLabel?: string;
}

export function MagneticButton({
  children,
  strength = 0.2,
  cursorLabel,
  className = '',
  onClick,
  type = 'button',
  disabled,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 320, damping: 22 });
  const springY = useSpring(y, { stiffness: 320, damping: 22 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || disabled || !ref.current) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - (rect.left + rect.width / 2);
    const offsetY = e.clientY - (rect.top + rect.height / 2);
    x.set(offsetX * strength);
    y.set(offsetY * strength);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      whileTap={prefersReducedMotion || disabled ? undefined : { scale: 0.97 }}
      style={prefersReducedMotion ? undefined : { x: springX, y: springY }}
      data-cursor-label={cursorLabel}
      className={className}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}
