import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { MagneticButton } from './motion/MagneticButton';

interface NavbarProps {
  requestCount: number;
  onOpenTray: () => void;
  onOpenAdmin: () => void;
}

const NAV_ITEMS = [
  { id: 'services', label: 'Services' },
  { id: 'cable-builder', label: 'Cable Builder' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'showcase', label: 'Workshop' },
  { id: 'contact', label: 'Contact' },
] as const;

export function Navbar({ requestCount, onOpenTray }: NavbarProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<string>('services');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: 0.05 }
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#EDE6D6]/10 bg-[#141312]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Zone 1: Single clean wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          }}
          className="font-display text-xl font-bold tracking-tight text-[#EDE6D6] whitespace-nowrap shrink-0 transition-colors hover:text-[#D97724]"
          data-cursor-label="Home"
        >
          PAGAWAAN
        </a>

        {/* Zone 2: Five concise single-line nav links with sliding mechanical indicator */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A39B8B]"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeId === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(item.id);
                }}
                className={`relative py-1.5 whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  isActive ? 'text-[#EDE6D6]' : 'hover:text-[#EDE6D6]'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="navbar-mechanical-indicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-[#D97724]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Single standout primary action + mobile drawer trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <MagneticButton
            type="button"
            onClick={onOpenTray}
            cursorLabel="Order Tray"
            className="inline-flex min-h-[40px] items-center gap-2 border border-[#D97724] bg-[#D97724] px-4 py-2 text-sm font-semibold text-[#141312] whitespace-nowrap shrink-0 transition-colors duration-150 hover:bg-[#e58432]"
          >
            <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Request Service</span>
            {requestCount > 0 && (
              <span className="ml-0.5 bg-[#141312] px-1.5 py-0.5 font-mono text-xs tabular-nums text-[#EDE6D6]">
                {requestCount}
              </span>
            )}
          </MagneticButton>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="inline-flex h-11 w-11 items-center justify-center border border-[#EDE6D6]/15 bg-[#1B1917] text-[#EDE6D6] md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Animated mobile navigation panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            aria-label="Mobile navigation"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="border-t border-[#EDE6D6]/10 bg-[#1B1917] px-4 py-4 md:hidden"
          >
            <div className="flex flex-col divide-y divide-[#EDE6D6]/8">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
                  className="flex min-h-[44px] items-center justify-between py-2.5 text-sm font-medium text-[#EDE6D6] hover:text-[#D97724]"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs text-[#A39B8B]">Go</span>
                </a>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
