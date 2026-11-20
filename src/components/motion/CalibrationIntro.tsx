import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface CalibrationIntroProps {
  onComplete: () => void;
}

const CALIBRATION_STAGES = [
  'Bench Calibration',
  'Service Ledger',
  'Schematic Ready',
];

export function CalibrationIntro({ onComplete }: CalibrationIntroProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(false);
      onComplete();
      return;
    }

    const start = performance.now();
    const duration = 900;
    let frameId = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const ratio = Math.min(1, elapsed / duration);
      setProgress(Math.round(ratio * 100));

      if (ratio < 0.35) setActiveStage(0);
      else if (ratio < 0.72) setActiveStage(1);
      else setActiveStage(2);

      if (ratio < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setTimeout(() => {
          setVisible(false);
          onComplete();
        }, 140);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [prefersReducedMotion, onComplete]);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#141312] px-6 workshop-drafting-grid"
          role="status"
          aria-label="Loading Pagawaan workshop"
        >
          {/* Horizontal technical scan hairline */}
          <motion.div
            initial={{ y: '-40vh', opacity: 0 }}
            animate={{ y: '40vh', opacity: [0, 0.7, 0] }}
            transition={{ duration: 0.9, ease: 'linear' }}
            className="pointer-events-none fixed inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D97724] to-transparent"
          />

          <div className="w-full max-w-md border border-[#EDE6D6]/12 bg-[#1B1917] p-8">
            <div className="flex items-baseline justify-between border-b border-[#EDE6D6]/10 pb-4">
              <span className="font-display text-2xl font-bold tracking-tight text-[#EDE6D6]">
                PAGAWAAN
              </span>
              <span className="font-mono text-xs tabular-nums text-[#D97724]">
                {String(progress).padStart(3, '0')}%
              </span>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
              {CALIBRATION_STAGES.map((stage, idx) => {
                const isDone = idx <= activeStage;
                return (
                  <div
                    key={stage}
                    className={`border px-2.5 py-2 transition-colors duration-150 ${
                      isDone
                        ? 'border-[#D97724]/50 bg-[#23201D] text-[#EDE6D6]'
                        : 'border-[#EDE6D6]/10 text-[#A39B8B]/60'
                    }`}
                  >
                    <div className="font-mono text-[11px] tabular-nums text-[#A39B8B]">
                      0{idx + 1}
                    </div>
                    <div className="mt-0.5 truncate font-medium">{stage}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 h-1.5 w-full overflow-hidden bg-[#2C2824]">
              <motion.div
                className="h-full bg-[#D97724]"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[#A39B8B]">
              <span>Built, fixed, connected.</span>
              <button
                type="button"
                onClick={() => {
                  setVisible(false);
                  onComplete();
                }}
                className="font-mono text-xs text-[#EDE6D6] underline-offset-4 hover:text-[#D97724] hover:underline"
              >
                Skip
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
