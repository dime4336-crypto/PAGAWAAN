import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CheckCircle2, ClipboardList, Layers, SlidersHorizontal } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Select',
    summary: 'Choose the service you need.',
    detail:
      'Browse computer diagnostics, custom Ethernet cabling, mobile assistance, or custom software and add one or more items.',
    icon: Layers,
  },
  {
    number: '02',
    title: 'Configure',
    summary: 'Tell us about your device, requirements, or project.',
    detail:
      'Specify OS backup needs, Cat5e/Cat6 meter lengths, room counts, or software goals so we inspect with full context.',
    icon: SlidersHorizontal,
  },
  {
    number: '03',
    title: 'Request',
    summary: 'Submit your request and receive a quotation.',
    detail:
      'Enter your name and Metro Manila contact details—no account registration required—to receive a tracked PAG reference.',
    icon: ClipboardList,
  },
  {
    number: '04',
    title: 'Get It Done',
    summary: 'Confirm the quotation and schedule before work begins.',
    detail:
      'Pagawaan reviews your requirements, confirms final pricing and schedule with you, and proceeds only after your go-ahead.',
    icon: CheckCircle2,
  },
];

export function HowItWorksAndAbout() {
  const prefersReducedMotion = useReducedMotion();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <>
      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-b border-[#EDE6D6]/10 bg-[#1B1917] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 border-b border-[#EDE6D6]/10 pb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs font-medium text-[#D97724]">03 · Workshop Process</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#EDE6D6] sm:text-4xl">
                How Pagawaan works
              </h2>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-[#A39B8B]">
              A service request starts a transparent technical review. No hidden charges or
              automatic bookings before you approve the quotation.
            </p>
          </div>

          {/* Animated mechanical progress rail */}
          <div className="mt-8 border border-[#EDE6D6]/10 bg-[#141312] p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs text-[#A39B8B]">
              <span>Workflow Stage Sequence</span>
              <span className="font-mono tabular-nums text-[#D97724]">
                Step {STEPS[activeStep].number} / 04 · {STEPS[activeStep].title}
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full bg-[#2C2824]">
              <motion.div
                className="h-full bg-[#D97724]"
                initial={false}
                animate={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                }
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isSelected = activeStep === idx;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  onMouseEnter={() => setActiveStep(idx)}
                  className={`flex flex-col justify-between border p-5 text-left transition-colors duration-150 ${
                    isSelected
                      ? 'border-[#D97724] bg-[#23201D]'
                      : 'border-[#EDE6D6]/12 bg-[#141312] hover:border-[#EDE6D6]/30'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#D97724]">
                        {step.number}
                      </span>
                      <Icon
                        className={`h-4 w-4 ${
                          isSelected ? 'text-[#EDE6D6]' : 'text-[#A39B8B]'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-bold text-[#EDE6D6]">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#EDE6D6]/90">
                      {step.summary}
                    </p>
                  </div>
                  <p className="mt-4 border-t border-[#EDE6D6]/10 pt-3 text-xs leading-relaxed text-[#A39B8B]">
                    {step.detail}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Pagawaan */}
      <section
        id="about"
        className="border-b border-[#EDE6D6]/10 bg-[#141312] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="text-xs font-medium text-[#D97724]">04 · About Pagawaan</div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#EDE6D6] sm:text-4xl">
                Built, fixed, connected.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#A39B8B]">
                An independent Filipino digital and physical workshop focused on practical
                troubleshooting, clean craftsmanship, and clear communication.
              </p>
            </div>

            <div className="space-y-5 border border-[#EDE6D6]/12 bg-[#1B1917] p-6 sm:p-8 lg:col-span-7">
              <p className="text-base leading-relaxed text-[#EDE6D6]">
                Technology doesn&rsquo;t always work the way it should. Devices break, networks
                fail, systems become complicated, and sometimes you just need someone who knows how
                to make things work again.
              </p>
              <p className="text-base leading-relaxed text-[#A39B8B]">
                Pagawaan was built around a simple idea: useful technology should be accessible,
                understandable, and maintainable.
              </p>
              <p className="text-base leading-relaxed text-[#A39B8B]">
                Whether it&rsquo;s a faulty Ethernet connection, a struggling computer, or a custom
                software project, we approach every problem as something worth solving.
              </p>

              <div className="grid grid-cols-1 gap-4 border-t border-[#EDE6D6]/10 pt-5 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-medium text-[#EDE6D6]">Plain Language</div>
                  <p className="mt-1 text-xs text-[#A39B8B]">
                    Clear fault findings and options without upselling unnecessary replacements.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#EDE6D6]">Legitimate Scope</div>
                  <p className="mt-1 text-xs text-[#A39B8B]">
                    Authorized device care and official account recovery workflows only.
                  </p>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#EDE6D6]">End-to-End Craft</div>
                  <p className="mt-1 text-xs text-[#A39B8B]">
                    From physical RJ45 crimping to full-stack web engineering and databases.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
