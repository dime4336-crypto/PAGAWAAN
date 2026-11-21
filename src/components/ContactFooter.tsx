import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  Clock,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Radio,
} from 'lucide-react';
import type { WorkshopContactConfig } from '../config/workshop';

interface ContactFooterProps {
  config: WorkshopContactConfig;
  onOpenAdmin: () => void;
  onOpenTray: () => void;
}

export function ContactFooter({
  config,
  onOpenAdmin,
  onOpenTray,
}: ContactFooterProps) {
  const prefersReducedMotion = useReducedMotion();
  const [signalActive, setSignalActive] = useState(false);

  return (
    <footer id="contact" className="bg-[#141312] pt-16 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-[#EDE6D6]/10 pb-12 lg:grid-cols-12">
          {/* Brand & Metro Manila Coverage */}
          <div className="lg:col-span-5">
            <div className="font-display text-2xl font-bold tracking-tight text-[#EDE6D6]">
              PAGAWAAN
            </div>
            <p className="mt-2 text-sm font-medium text-[#D97724]">{config.tagline}</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#A39B8B]">
              {config.availabilityDisclaimer}
            </p>

            <div className="mt-6 border border-[#EDE6D6]/10 bg-[#1B1917] p-4 text-xs">
              <div className="font-medium text-[#EDE6D6]">Metro Manila Service Coverage</div>
              <p className="mt-1.5 leading-relaxed text-[#A39B8B]">
                {config.coveredCities.join(' · ')}
              </p>
            </div>
          </div>

          {/* Configurable Contact Details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-7">
            <div className="space-y-4 border border-[#EDE6D6]/10 bg-[#1B1917] p-5 text-sm">
              <h3 className="font-display text-sm font-semibold text-[#EDE6D6]">
                Workshop Coordinates
              </h3>
              <div className="flex items-start gap-3 text-xs text-[#A39B8B]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D97724]" aria-hidden="true" />
                <span>{config.serviceLocation}</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#A39B8B]">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#D97724]" aria-hidden="true" />
                <span>{config.businessHours}</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#A39B8B]">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#D97724]" aria-hidden="true" />
                <a href={`mailto:${config.email}`} className="text-[#EDE6D6] hover:text-[#D97724]">
                  {config.email}
                </a>
              </div>
              <div className="flex items-start gap-3 text-xs text-[#A39B8B]">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#D97724]" aria-hidden="true" />
                <a
                  href={`tel:+63${config.contactNumber.replace(/^0/, '')}`}
                  className="font-mono text-[#EDE6D6] hover:text-[#D97724]"
                >
                  {config.contactNumber}
                </a>
              </div>
            </div>

            {/* Direct Channels with animated connection signal */}
            <div className="flex flex-col justify-between border border-[#EDE6D6]/10 bg-[#1B1917] p-5">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-[#EDE6D6]">
                    Direct Dispatch Channels
                  </h3>
                  <motion.div
                    animate={
                      signalActive && !prefersReducedMotion
                        ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }
                        : undefined
                    }
                    transition={{ repeat: Infinity, duration: 1.1 }}
                    aria-hidden="true"
                  >
                    <Radio
                      className={`h-4 w-4 ${
                        signalActive ? 'text-[#D97724]' : 'text-[#A39B8B]'
                      }`}
                    />
                  </motion.div>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#A39B8B]">
                  Send a structured service request directly on this site, or reach out via
                  configurable Messenger, WhatsApp, or Facebook links.
                </p>
              </div>

              <div
                className="mt-5 space-y-2.5"
                onMouseEnter={() => setSignalActive(true)}
                onMouseLeave={() => setSignalActive(false)}
              >
                <button
                  type="button"
                  onClick={onOpenTray}
                  className="flex min-h-[42px] w-full items-center justify-center gap-2 border border-[#D97724] bg-[#D97724] px-4 py-2 text-xs font-semibold text-[#141312] hover:bg-[#e58432]"
                >
                  Open Service Request Form
                </button>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <a
                    href={config.messengerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[40px] items-center justify-center gap-1.5 border border-[#EDE6D6]/15 bg-[#141312] px-2 py-2 text-[#EDE6D6] hover:border-[#D97724]"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Messenger</span>
                  </a>
                  <a
                    href={config.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[40px] items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] px-2 py-2 text-[#EDE6D6] hover:border-[#D97724]"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={config.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[40px] items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] px-2 py-2 text-[#EDE6D6] hover:border-[#D97724]"
                  >
                    Facebook
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Bottom Bar */}
        <div className="mt-8 flex flex-col items-start justify-between gap-4 text-xs text-[#A39B8B] sm:flex-row sm:items-center">
          <div>
            &copy; {new Date().getFullYear()} {config.brandName}. {config.pricingDisclaimer}
          </div>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex min-h-[36px] items-center gap-1.5 border border-[#EDE6D6]/12 bg-[#1B1917] px-3 py-1.5 text-xs text-[#A39B8B] whitespace-nowrap transition-colors hover:border-[#D97724]/50 hover:text-[#EDE6D6]"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Workshop Admin</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
