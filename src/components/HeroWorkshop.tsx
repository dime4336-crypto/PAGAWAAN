import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDownRight, Cable, Cpu, Terminal } from 'lucide-react';
import { WORKSHOP_MEDIA, type WorkshopContactConfig } from '../config/workshop';
import { MagneticButton } from './motion/MagneticButton';

interface HeroWorkshopProps {
  config: WorkshopContactConfig;
  onExploreServices: () => void;
  onStartRequest: () => void;
}

type BenchMode = 'pinout' | 'diagnostics' | 'pipeline';

const T568B_PINS = [
  { pin: 1, pair: 'Pair 2', colorName: 'White / Orange', hex: '#F3C79B', signal: 'TX_D1+' },
  { pin: 2, pair: 'Pair 2', colorName: 'Orange', hex: '#D97724', signal: 'TX_D1-' },
  { pin: 3, pair: 'Pair 3', colorName: 'White / Green', hex: '#A5CBB8', signal: 'RX_D2+' },
  { pin: 4, pair: 'Pair 1', colorName: 'Blue', hex: '#4B749F', signal: 'BI_D3+' },
  { pin: 5, pair: 'Pair 1', colorName: 'White / Blue', hex: '#9FBAD4', signal: 'BI_D3-' },
  { pin: 6, pair: 'Pair 3', colorName: 'Green', hex: '#5C8D76', signal: 'RX_D2-' },
  { pin: 7, pair: 'Pair 4', colorName: 'White / Brown', hex: '#B9A490', signal: 'BI_D4+' },
  { pin: 8, pair: 'Pair 4', colorName: 'Brown', hex: '#7A593E', signal: 'BI_D4-' },
];

export function HeroWorkshop({
  config,
  onExploreServices,
  onStartRequest,
}: HeroWorkshopProps) {
  const prefersReducedMotion = useReducedMotion();
  const [benchMode, setBenchMode] = useState<BenchMode>('pinout');
  const [selectedPin, setSelectedPin] = useState<number>(2);
  const [imgError, setImgError] = useState(false);

  const activePinInfo = T568B_PINS.find((p) => p.pin === selectedPin) || T568B_PINS[1];

  return (
    <section
      id="top"
      className="relative border-b border-[#EDE6D6]/10 bg-[#141312] workshop-drafting-grid"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-10">
          {/* Left Column: Editorial Headline + Clear Value Proposition + Action Hierarchy */}
          <div className="flex flex-col justify-between lg:col-span-6">
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#A39B8B]">
                <span>{config.brandName} Workshop</span>
                <span aria-hidden="true">·</span>
                <span>Metro Manila, Philippines</span>
                <span aria-hidden="true">·</span>
                <span>{config.tagline}</span>
              </div>

              <h1 className="mt-5 font-display text-[clamp(2.35rem,4.4vw,3.85rem)] font-bold leading-[1.04] tracking-tight text-[#EDE6D6]">
                Tech failing?
                <br />
                <span className="text-[#D97724]">We make it work.</span>
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-[#A39B8B] sm:text-lg">
                From broken computers to tangled networks and custom software. We build, repair,
                and connect the technology you depend on.
              </p>

              {/* Single clear primary CTA + secondary navigation action */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <MagneticButton
                  type="button"
                  onClick={onStartRequest}
                  cursorLabel="Start Request"
                  className="inline-flex min-h-[46px] items-center gap-2.5 border border-[#D97724] bg-[#D97724] px-6 py-3 text-sm font-semibold text-[#141312] whitespace-nowrap transition-colors duration-150 hover:bg-[#e58432]"
                >
                  <span>Start a Service Request</span>
                  <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
                </MagneticButton>

                <button
                  type="button"
                  onClick={onExploreServices}
                  className="inline-flex min-h-[46px] items-center gap-2 border border-[#EDE6D6]/20 bg-[#1B1917] px-6 py-3 text-sm font-medium text-[#EDE6D6] whitespace-nowrap transition-colors duration-150 hover:border-[#D97724]/60 hover:text-[#D97724]"
                >
                  <span>Explore Services</span>
                </button>
              </div>
            </div>

            {/* Bench photography strip integrated cleanly at bottom of left column */}
            <div className="mt-10 overflow-hidden border border-[#EDE6D6]/12 bg-[#1B1917]">
              <div className="relative aspect-[16/8] w-full overflow-hidden bg-[#23201D]">
                {!imgError ? (
                  <img
                    src={WORKSHOP_MEDIA.heroBench}
                    alt="Pagawaan electronics and computer repair workbench with analog oscilloscope and RJ45 cabling tools"
                    referrerPolicy="no-referrer"
                    onError={() => setImgError(true)}
                    className="h-full w-full object-cover object-center opacity-90"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#23201D] to-[#141312] text-sm text-[#A39B8B]">
                    Pagawaan Diagnostics &amp; Cabling Workbench
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141312]/85 via-[#141312]/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-xs text-[#EDE6D6]">
                  <span className="font-medium">Physical &amp; Digital Workshop Bench</span>
                  <span className="font-mono text-[#A39B8B]">
                    Hardware · Ethernet · Custom Code
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Mechanical Bench Schematic (Illustrative Visualization) */}
          <div className="flex flex-col border border-[#EDE6D6]/12 bg-[#1B1917] lg:col-span-6">
            {/* Panel top header with explicit illustrative preview label */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE6D6]/10 px-5 py-3.5">
              <div>
                <h2 className="font-display text-sm font-semibold text-[#EDE6D6]">
                  Interactive Bench Schematic
                </h2>
                <p className="text-xs text-[#A39B8B]">
                  Illustrative technical preview · Inspect wiremaps and diagnostic routes
                </p>
              </div>

              {/* Segmented functional mode tabs */}
              <div
                role="tablist"
                aria-label="Schematic preview modes"
                className="flex items-center gap-1 border border-[#EDE6D6]/12 bg-[#141312] p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={benchMode === 'pinout'}
                  onClick={() => setBenchMode('pinout')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    benchMode === 'pinout'
                      ? 'bg-[#D97724] text-[#141312]'
                      : 'text-[#A39B8B] hover:text-[#EDE6D6]'
                  }`}
                >
                  <Cable className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>T568B Pinout</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={benchMode === 'diagnostics'}
                  onClick={() => setBenchMode('diagnostics')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    benchMode === 'diagnostics'
                      ? 'bg-[#D97724] text-[#141312]'
                      : 'text-[#A39B8B] hover:text-[#EDE6D6]'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>PC Path</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={benchMode === 'pipeline'}
                  onClick={() => setBenchMode('pipeline')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                    benchMode === 'pipeline'
                      ? 'bg-[#D97724] text-[#141312]'
                      : 'text-[#A39B8B] hover:text-[#EDE6D6]'
                  }`}
                >
                  <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Software Stack</span>
                </button>
              </div>
            </div>

            {/* Schematic canvas */}
            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
              {benchMode === 'pinout' && (
                <div className="flex flex-1 flex-col justify-between gap-6">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#A39B8B]">
                      <span>8P8C Modular RJ45 Termination Standard (TIA/EIA-568-B)</span>
                      <span className="font-mono text-[#EDE6D6]">1000BASE-T</span>
                    </div>

                    {/* Interactive SVG RJ45 Schematic */}
                    <div className="mt-4 border border-[#EDE6D6]/10 bg-[#141312] p-4">
                      <svg
                        viewBox="0 0 460 170"
                        className="w-full h-auto"
                        role="img"
                        aria-label="Interactive T568B 8-pin Ethernet connector diagram"
                      >
                        {/* Outer connector housing */}
                        <rect
                          x="18"
                          y="18"
                          width="170"
                          height="134"
                          rx="4"
                          fill="#23201D"
                          stroke="#EDE6D6"
                          strokeOpacity="0.25"
                          strokeWidth="1.5"
                        />
                        <rect
                          x="188"
                          y="50"
                          width="28"
                          height="70"
                          fill="#2C2824"
                          stroke="#EDE6D6"
                          strokeOpacity="0.2"
                        />
                        {/* Gold contacts & animated conductor traces */}
                        {T568B_PINS.map((pin, idx) => {
                          const y = 30 + idx * 15;
                          const isSelected = pin.pin === selectedPin;
                          return (
                            <g
                              key={pin.pin}
                              onClick={() => setSelectedPin(pin.pin)}
                              className="cursor-pointer"
                            >
                              <rect
                                x="28"
                                y={y}
                                width="34"
                                height="8"
                                rx="1"
                                fill={isSelected ? '#D97724' : '#B9924E'}
                                opacity={isSelected ? 1 : 0.72}
                              />
                              <path
                                d={`M 62 ${y + 4} C 180 ${y + 4}, 250 ${y + 4}, 432 ${y + 4}`}
                                fill="none"
                                stroke={pin.hex}
                                strokeWidth={isSelected ? 3.5 : 2}
                                strokeOpacity={isSelected ? 1 : 0.45}
                                strokeDasharray={isSelected && !prefersReducedMotion ? '8 6' : undefined}
                              >
                                {isSelected && !prefersReducedMotion && (
                                  <animate
                                    attributeName="stroke-dashoffset"
                                    from="28"
                                    to="0"
                                    dur="0.8s"
                                    repeatCount="indefinite"
                                  />
                                )}
                              </path>
                              <text
                                x="440"
                                y={y + 7}
                                fontSize="9"
                                fontFamily="IBM Plex Mono, monospace"
                                fill={isSelected ? '#EDE6D6' : '#A39B8B'}
                              >
                                {pin.pin}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Pin selector buttons */}
                  <div>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                      {T568B_PINS.map((pin) => {
                        const active = pin.pin === selectedPin;
                        return (
                          <button
                            key={pin.pin}
                            type="button"
                            onClick={() => setSelectedPin(pin.pin)}
                            className={`flex flex-col items-center border px-2 py-2 text-xs transition-colors ${
                              active
                                ? 'border-[#D97724] bg-[#2C2824] text-[#EDE6D6]'
                                : 'border-[#EDE6D6]/10 bg-[#141312] text-[#A39B8B] hover:border-[#EDE6D6]/30'
                            }`}
                          >
                            <span
                              className="mb-1.5 h-2 w-4"
                              style={{ backgroundColor: pin.hex }}
                              aria-hidden="true"
                            />
                            <span className="font-mono tabular-nums">P{pin.pin}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-[#EDE6D6]/10 bg-[#23201D] px-4 py-3 text-xs">
                      <div>
                        <span className="font-mono text-[#D97724]">
                          Pin {activePinInfo.pin}
                        </span>
                        <span className="mx-2 text-[#A39B8B]" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-medium text-[#EDE6D6]">
                          {activePinInfo.colorName}
                        </span>
                      </div>
                      <div className="font-mono text-[#A39B8B]">
                        {activePinInfo.pair} · Signal {activePinInfo.signal}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {benchMode === 'diagnostics' && (
                <div className="flex flex-1 flex-col justify-between gap-5">
                  <div className="text-xs text-[#A39B8B]">
                    Structured Hardware Isolation Sequence · Zero Guesswork Repair
                  </div>

                  <div className="border border-[#EDE6D6]/10 bg-[#141312] p-4">
                    <svg
                      viewBox="0 0 460 155"
                      className="w-full h-auto"
                      role="img"
                      aria-label="Hardware diagnostic signal path schematic"
                    >
                      {[
                        { x: 20, label: 'Power Rail', sub: 'PSU / DC-In' },
                        { x: 130, label: 'POST & RAM', sub: 'Firmware Check' },
                        { x: 240, label: 'Thermals', sub: 'Paste & Fans' },
                        { x: 350, label: 'Storage', sub: 'SMART & OS' },
                      ].map((node, idx) => (
                        <g key={node.label}>
                          {idx < 3 && (
                            <motion.line
                              x1={node.x + 92}
                              y1="72"
                              x2={node.x + 110}
                              y2="72"
                              stroke="#D97724"
                              strokeWidth="2"
                              strokeDasharray="4 4"
                              animate={
                                prefersReducedMotion ? undefined : { strokeDashoffset: [16, 0] }
                              }
                              transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                            />
                          )}
                          <rect
                            x={node.x}
                            y="36"
                            width="92"
                            height="72"
                            fill="#23201D"
                            stroke="#EDE6D6"
                            strokeOpacity="0.22"
                          />
                          <text
                            x={node.x + 10}
                            y="62"
                            fill="#EDE6D6"
                            fontSize="11"
                            fontWeight="600"
                            fontFamily="Archivo, sans-serif"
                          >
                            {node.label}
                          </text>
                          <text
                            x={node.x + 10}
                            y="82"
                            fill="#A39B8B"
                            fontSize="9"
                            fontFamily="IBM Plex Mono, monospace"
                          >
                            {node.sub}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="border border-[#EDE6D6]/10 bg-[#23201D] p-3.5 text-xs">
                      <div className="font-medium text-[#EDE6D6]">Thermal &amp; Fan Service</div>
                      <p className="mt-1 text-[#A39B8B]">
                        ESD-safe dust extraction and fresh thermal compound to curb throttling.
                      </p>
                    </div>
                    <div className="border border-[#EDE6D6]/10 bg-[#23201D] p-3.5 text-xs">
                      <div className="font-medium text-[#EDE6D6]">Verified Upgrades</div>
                      <p className="mt-1 text-[#A39B8B]">
                        RAM, NVMe SSD, and clean OS migration with pre-install backup options.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {benchMode === 'pipeline' && (
                <div className="flex flex-1 flex-col justify-between gap-5">
                  <div className="text-xs text-[#A39B8B]">
                    Custom Web &amp; Automation Engineering · Built in the Workshop
                  </div>

                  <div className="border border-[#EDE6D6]/10 bg-[#141312] p-4 font-mono text-xs leading-relaxed text-[#EDE6D6]">
                    <div className="text-[#A39B8B]">request_schema.ts — Zod + Server Verification</div>
                    <pre className="mt-3 overflow-x-auto text-[12px] text-[#EDE6D6]/90">
{`const quote = calculateEstimate({
  service: "custom-ethernet-cable",
  category: "Cat6",
  lengthMeters: 15,
  connector: "Snagless Booted RJ45",
});
// Authoritative total computed server-side in PHP`}
                    </pre>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="border border-[#EDE6D6]/10 bg-[#23201D] p-3.5 text-xs">
                      <div className="font-medium text-[#EDE6D6]">Web Applications</div>
                      <p className="mt-1 text-[#A39B8B]">
                        Custom UI, relational SQL schemas, and admin workflows—never generic templates.
                      </p>
                    </div>
                    <div className="border border-[#EDE6D6]/10 bg-[#23201D] p-3.5 text-xs">
                      <div className="font-medium text-[#EDE6D6]">Python Automation</div>
                      <p className="mt-1 text-[#A39B8B]">
                        Scripts that clean spreadsheets, automate reports, and bridge local hardware.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom calibration strip */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE6D6]/10 pt-4 text-xs text-[#A39B8B]">
                <span>Illustrative workshop diagram · Select any service below to request a quote</span>
                <span className="font-mono text-[#5C8D76]">T568B · PHP · Metro Manila</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
