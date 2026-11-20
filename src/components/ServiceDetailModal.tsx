import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Clock, ShieldAlert, X } from 'lucide-react';
import { formatPHP } from '../config/pricing';
import type { ServiceItem } from '../types/pagawaan';

interface ServiceDetailModalProps {
  service: ServiceItem | null;
  onClose: () => void;
  onConfigure: (service: ServiceItem) => void;
}

export function ServiceDetailModal({
  service,
  onClose,
  onConfigure,
}: ServiceDetailModalProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {service && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="service-detail-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-lg border border-[#EDE6D6]/20 bg-[#1B1917] p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EDE6D6]/10 pb-4">
              <div>
                <div className="text-xs font-medium text-[#D97724]">
                  {service.categoryName}
                </div>
                <h3
                  id="service-detail-title"
                  className="mt-1 font-display text-2xl font-bold text-[#EDE6D6]"
                >
                  {service.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close service details"
                className="flex h-10 w-10 items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B] hover:text-[#EDE6D6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              <p className="leading-relaxed text-[#EDE6D6]/90">{service.description}</p>
              <div className="border border-[#EDE6D6]/10 bg-[#141312] p-4 text-xs leading-relaxed text-[#A39B8B]">
                <div className="font-medium text-[#EDE6D6]">Workshop Scope &amp; Notes</div>
                <p className="mt-1.5">{service.details}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="border border-[#EDE6D6]/10 bg-[#23201D] p-3.5">
                  <div className="text-xs text-[#A39B8B]">Introductory Estimate</div>
                  <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#EDE6D6]">
                    {service.pricingType === 'custom_quote'
                      ? 'Custom Quote'
                      : service.pricingType === 'monthly'
                        ? `${formatPHP(service.startingPrice)}/mo`
                        : `${formatPHP(service.startingPrice)}`}
                  </div>
                </div>
                <div className="border border-[#EDE6D6]/10 bg-[#23201D] p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-[#A39B8B]">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Estimated Turnaround</span>
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#EDE6D6]">
                    {service.turnaroundEstimate}
                  </div>
                </div>
              </div>

              {service.slug === 'official-account-recovery' && (
                <div className="flex items-start gap-2.5 border border-[#D97724]/40 bg-[#D97724]/10 p-3 text-xs text-[#EDE6D6]">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#D97724]" />
                  <span>
                    Authorized device and account owners only. Pagawaan assists strictly via
                    official provider recovery workflows and never performs unauthorized lock or
                    security bypassing.
                  </span>
                </div>
              )}

              <p className="text-xs text-[#A39B8B]">
                Final quotation is confirmed after reviewing your device specifications, materials,
                or project requirements.
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#EDE6D6]/10 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] border border-[#EDE6D6]/20 px-4 py-2 text-xs font-medium text-[#EDE6D6] hover:border-[#EDE6D6]/40"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = service;
                  onClose();
                  onConfigure(target);
                }}
                className="min-h-[42px] border border-[#D97724] bg-[#D97724] px-5 py-2 text-xs font-semibold text-[#141312] hover:bg-[#e58432]"
              >
                Configure &amp; Add to Request
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
