import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Minus, Plus, Ruler } from 'lucide-react';
import {
  CABLE_PRICING_RULES,
  calculateCableEstimate,
  formatPHP,
  type CableCategory,
  type CableWiring,
  type ConnectorType,
} from '../config/pricing';
import type { CartServiceItem, ServiceItem } from '../types/pagawaan';
import { MagneticButton } from './motion/MagneticButton';

interface CableBuilderProps {
  cableService: ServiceItem | undefined;
  onAddCableToRequest: (item: CartServiceItem) => void;
}

export function CableBuilder({ cableService, onAddCableToRequest }: CableBuilderProps) {
  const prefersReducedMotion = useReducedMotion();
  const [category, setCategory] = useState<CableCategory>('Cat6');
  const [lengthMeters, setLengthMeters] = useState<number>(10);
  const [colorId, setColorId] = useState<string>('charcoal-black');
  const [wiring, setWiring] = useState<CableWiring>('Straight-Through (T568B)');
  const [connectorType, setConnectorType] = useState<ConnectorType>('Snagless Booted RJ45');
  const [quantity, setQuantity] = useState<number>(1);
  const [intendedUse, setIntendedUse] = useState<string>('Router to Workstation');
  const [justAdded, setJustAdded] = useState(false);

  const selectedColor =
    CABLE_PRICING_RULES.colors.find((c) => c.id === colorId) || CABLE_PRICING_RULES.colors[0];

  const estimate = useMemo(
    () =>
      calculateCableEstimate({
        category,
        lengthMeters,
        connectorType,
        wiring,
        quantity,
      }),
    [category, lengthMeters, connectorType, wiring, quantity]
  );

  const handleAdd = () => {
    if (!cableService) return;

    onAddCableToRequest({
      uid: `cable-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      serviceId: cableService.id,
      serviceSlug: cableService.slug,
      serviceName: `Custom ${category} Ethernet Cable (${lengthMeters}m)`,
      categoryName: cableService.categoryName,
      pricingType: cableService.pricingType,
      startingPrice: cableService.startingPrice,
      quantity,
      configuration: {
        category,
        lengthMeters,
        color: selectedColor.label,
        wiring,
        connectorType,
        intendedUse: intendedUse.trim() || 'General Ethernet Connection',
      },
      estimatedPrice: estimate.totalPricePhp,
    });

    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const isBooted = connectorType === 'Snagless Booted RJ45';
  const isShielded = connectorType === 'Shielded Cat6 RJ45';
  const isCrossover = wiring === 'Crossover (T568A/B)';

  return (
    <section
      id="cable-builder"
      className="border-b border-[#EDE6D6]/10 bg-[#141312] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-medium text-[#D97724]">
            02 · Custom Fabrication Workbench
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#EDE6D6] sm:text-4xl">
            Build Your Cable
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#A39B8B] sm:text-base">
            Configure custom-length Cat5e or Cat6 Ethernet runs terminated and wiremap-tested in
            our workshop. Material and labor breakdown updates transparently as you adjust specs.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          {/* Left: Live Animated SVG Cable Preview + Pinout Indicator */}
          <div className="flex flex-col justify-between border border-[#EDE6D6]/12 bg-[#1B1917] p-6 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EDE6D6]/10 pb-4">
                <div>
                  <div className="font-display text-base font-semibold text-[#EDE6D6]">
                    {category} · {lengthMeters}m · {selectedColor.label}
                  </div>
                  <div className="mt-0.5 text-xs text-[#A39B8B]">
                    {connectorType} · {wiring}
                  </div>
                </div>
                <div className="font-mono text-xs tabular-nums text-[#D97724]">
                  {quantity} {quantity === 1 ? 'cable' : 'cables'}
                </div>
              </div>

              {/* Animated Mechanical Cable Drawing */}
              <div className="mt-6 border border-[#EDE6D6]/10 bg-[#141312] p-4 sm:p-6">
                <svg
                  viewBox="0 0 640 240"
                  className="w-full h-auto"
                  role="img"
                  aria-label={`Visual preview of ${lengthMeters} meter ${category} cable in ${selectedColor.label} with ${connectorType}`}
                >
                  {/* Calibration Ruler Ticks */}
                  <line
                    x1="60"
                    y1="205"
                    x2="580"
                    y2="205"
                    stroke="#EDE6D6"
                    strokeOpacity="0.2"
                  />
                  {Array.from({ length: 11 }).map((_, idx) => {
                    const x = 60 + idx * 52;
                    return (
                      <g key={idx}>
                        <line
                          x1={x}
                          y1="200"
                          x2={x}
                          y2="210"
                          stroke="#EDE6D6"
                          strokeOpacity="0.35"
                        />
                        <text
                          x={x}
                          y="224"
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="IBM Plex Mono, monospace"
                          fill="#A39B8B"
                        >
                          {Math.round((lengthMeters / 10) * idx)}m
                        </text>
                      </g>
                    );
                  })}

                  {/* Main Curved Ethernet Jacket Path */}
                  <motion.path
                    d="M 145 105 C 245 105, 255 150, 320 150 C 385 150, 395 105, 495 105"
                    fill="none"
                    stroke={selectedColor.hex}
                    strokeWidth={category === 'Cat6' ? 18 : 14}
                    strokeLinecap="round"
                    initial={false}
                    animate={{
                      stroke: selectedColor.hex,
                      strokeWidth: category === 'Cat6' ? 18 : 14,
                    }}
                    transition={{ duration: 0.2 }}
                  />
                  {/* Jacket spec stripe */}
                  <motion.path
                    d="M 145 105 C 245 105, 255 150, 320 150 C 385 150, 395 105, 495 105"
                    fill="none"
                    stroke={selectedColor.jacketAccent}
                    strokeWidth="2"
                    strokeDasharray={isCrossover ? '10 6' : 'none'}
                  />

                  {/* Signal pulse along conductor */}
                  {!prefersReducedMotion && (
                    <motion.path
                      d="M 145 105 C 245 105, 255 150, 320 150 C 385 150, 395 105, 495 105"
                      fill="none"
                      stroke="#D97724"
                      strokeWidth="2"
                      strokeDasharray="14 48"
                      animate={{ strokeDashoffset: [124, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      opacity="0.85"
                    />
                  )}

                  {/* Left Boot (if Snagless) */}
                  {isBooted && (
                    <path
                      d="M 122 93 L 154 96 L 154 114 L 122 117 Z"
                      fill="#2C2824"
                      stroke="#D97724"
                      strokeOpacity="0.65"
                    />
                  )}

                  {/* Left RJ45 Modular Plug */}
                  <g transform="translate(44, 72)">
                    <rect
                      x="0"
                      y="10"
                      width="78"
                      height="46"
                      rx="3"
                      fill={isShielded ? '#57534E' : '#2A2724'}
                      stroke={isShielded ? '#EDE6D6' : '#A39B8B'}
                      strokeOpacity="0.6"
                      strokeWidth="1.5"
                    />
                    {/* Locking latch */}
                    <rect x="24" y="2" width="32" height="8" rx="1" fill="#3F3A35" />
                    {/* 8 Gold contacts */}
                    {Array.from({ length: 8 }).map((_, pinIdx) => (
                      <rect
                        key={pinIdx}
                        x="6"
                        y={14 + pinIdx * 4.8}
                        width="16"
                        height="2.8"
                        fill="#D97724"
                      />
                    ))}
                    <text
                      x="46"
                      y="37"
                      fontSize="9"
                      fontFamily="IBM Plex Mono, monospace"
                      fill="#EDE6D6"
                    >
                      {isCrossover ? '568A' : '568B'}
                    </text>
                  </g>

                  {/* Right Boot (if Snagless) */}
                  {isBooted && (
                    <path
                      d="M 518 93 L 486 96 L 486 114 L 518 117 Z"
                      fill="#2C2824"
                      stroke="#D97724"
                      strokeOpacity="0.65"
                    />
                  )}

                  {/* Right RJ45 Modular Plug */}
                  <g transform="translate(518, 72)">
                    <rect
                      x="0"
                      y="10"
                      width="78"
                      height="46"
                      rx="3"
                      fill={isShielded ? '#57534E' : '#2A2724'}
                      stroke={isShielded ? '#EDE6D6' : '#A39B8B'}
                      strokeOpacity="0.6"
                      strokeWidth="1.5"
                    />
                    <rect x="22" y="2" width="32" height="8" rx="1" fill="#3F3A35" />
                    {Array.from({ length: 8 }).map((_, pinIdx) => (
                      <rect
                        key={pinIdx}
                        x="56"
                        y={14 + pinIdx * 4.8}
                        width="16"
                        height="2.8"
                        fill="#D97724"
                      />
                    ))}
                    <text
                      x="18"
                      y="37"
                      fontSize="9"
                      fontFamily="IBM Plex Mono, monospace"
                      fill="#EDE6D6"
                    >
                      568B
                    </text>
                  </g>

                  {/* Center length badge inside schematic */}
                  <rect
                    x="272"
                    y="40"
                    width="96"
                    height="26"
                    fill="#23201D"
                    stroke="#EDE6D6"
                    strokeOpacity="0.2"
                  />
                  <text
                    x="320"
                    y="57"
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="IBM Plex Mono, monospace"
                    fill="#EDE6D6"
                  >
                    {category} · {lengthMeters}m
                  </text>
                </svg>
              </div>
            </div>

            {/* Preliminary Pricing Breakdown */}
            <div className="mt-6 border border-[#EDE6D6]/10 bg-[#141312] p-4">
              <div className="flex items-center justify-between border-b border-[#EDE6D6]/10 pb-2.5 text-xs font-medium text-[#EDE6D6]">
                <span>Preliminary Material &amp; Labor Breakdown</span>
                <span className="font-mono text-[#A39B8B]">
                  {CABLE_PRICING_RULES.categories[category].perMeterPhp} PHP/m
                </span>
              </div>

              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between text-[#A39B8B]">
                  <dt>
                    {category} Bulk Cable ({lengthMeters}m)
                  </dt>
                  <dd className="font-mono tabular-nums text-[#EDE6D6]">
                    {formatPHP(estimate.materialCostPhp)}
                  </dd>
                </div>
                <div className="flex justify-between text-[#A39B8B]">
                  <dt>Both-End RJ45 Termination &amp; Wiremap Test</dt>
                  <dd className="font-mono tabular-nums text-[#EDE6D6]">
                    {formatPHP(estimate.terminationAndLaborPhp)}
                  </dd>
                </div>
                {estimate.connectorSurchargePhp > 0 && (
                  <div className="flex justify-between text-[#A39B8B]">
                    <dt>{connectorType} Hardware</dt>
                    <dd className="font-mono tabular-nums text-[#EDE6D6]">
                      +{formatPHP(estimate.connectorSurchargePhp)}
                    </dd>
                  </div>
                )}
                {estimate.wiringSurchargePhp > 0 && (
                  <div className="flex justify-between text-[#A39B8B]">
                    <dt>Crossover Pinout Calibration</dt>
                    <dd className="font-mono tabular-nums text-[#EDE6D6]">
                      +{formatPHP(estimate.wiringSurchargePhp)}
                    </dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-[#EDE6D6]/10 pt-2.5">
                  <dt className="font-medium text-[#EDE6D6]">
                    Estimated Total ({quantity} × {formatPHP(estimate.unitPricePhp)})
                  </dt>
                  <dd className="font-mono text-xl font-bold tabular-nums text-[#D97724]">
                    {formatPHP(estimate.totalPricePhp)}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-[11px] text-[#A39B8B]">
                Jacket color and specialty shielded plug stock are confirmed upon quotation review.
              </p>
            </div>
          </div>

          {/* Right: Configuration Controls */}
          <div className="flex flex-col justify-between border border-[#EDE6D6]/12 bg-[#1B1917] p-6 lg:col-span-5">
            <div className="space-y-5">
              {/* Category */}
              <div>
                <span className="block text-xs font-medium text-[#EDE6D6]">
                  1. Cable Grade
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  {(['Cat5e', 'Cat6'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`border p-3 text-left transition-colors ${
                        category === cat
                          ? 'border-[#D97724] bg-[#23201D]'
                          : 'border-[#EDE6D6]/12 bg-[#141312] hover:border-[#EDE6D6]/30'
                      }`}
                    >
                      <div className="font-display text-sm font-semibold text-[#EDE6D6]">
                        {cat}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-[#A39B8B]">
                        {formatPHP(CABLE_PRICING_RULES.categories[cat].perMeterPhp)} / meter
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Slider + Input */}
              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="cable-length-range"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#EDE6D6]"
                  >
                    <Ruler className="h-3.5 w-3.5 text-[#D97724]" aria-hidden="true" />
                    <span>2. Desired Length (Meters)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      aria-label="Cable length in meters"
                      min={CABLE_PRICING_RULES.minMeters}
                      max={CABLE_PRICING_RULES.maxMeters}
                      value={lengthMeters}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n)) {
                          setLengthMeters(Math.max(1, Math.min(100, Math.round(n))));
                        }
                      }}
                      className="w-16 border border-[#EDE6D6]/15 bg-[#141312] px-2 py-1 text-right font-mono text-xs tabular-nums text-[#EDE6D6]"
                    />
                    <span className="font-mono text-xs text-[#A39B8B]">m</span>
                  </div>
                </div>

                <input
                  id="cable-length-range"
                  type="range"
                  min={CABLE_PRICING_RULES.minMeters}
                  max={CABLE_PRICING_RULES.maxMeters}
                  value={lengthMeters}
                  onChange={(e) => setLengthMeters(Number(e.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer appearance-none bg-[#2C2824] accent-[#D97724]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[2, 5, 10, 15, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLengthMeters(preset)}
                      className={`border px-2.5 py-1 font-mono text-[11px] tabular-nums transition-colors ${
                        lengthMeters === preset
                          ? 'border-[#D97724] bg-[#D97724]/15 text-[#EDE6D6]'
                          : 'border-[#EDE6D6]/12 bg-[#141312] text-[#A39B8B] hover:text-[#EDE6D6]'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Jacket Color */}
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#EDE6D6]">3. Jacket Color</span>
                  <span className="text-[11px] text-[#A39B8B]">
                    {selectedColor.availabilityNote}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {CABLE_PRICING_RULES.colors.map((c) => {
                    const active = c.id === colorId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColorId(c.id)}
                        className={`flex items-center gap-2.5 border px-3 py-2 text-xs transition-colors ${
                          active
                            ? 'border-[#D97724] bg-[#23201D] text-[#EDE6D6]'
                            : 'border-[#EDE6D6]/12 bg-[#141312] text-[#A39B8B] hover:border-[#EDE6D6]/30'
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 shrink-0 border border-white/20"
                          style={{ backgroundColor: c.hex }}
                          aria-hidden="true"
                        />
                        <span className="truncate">{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connector Requirements */}
              <div>
                <span className="block text-xs font-medium text-[#EDE6D6]">
                  4. RJ45 Connector Hardware
                </span>
                <div className="mt-2 space-y-2">
                  {(
                    Object.keys(CABLE_PRICING_RULES.connectors) as ConnectorType[]
                  ).map((connKey) => {
                    const rule = CABLE_PRICING_RULES.connectors[connKey];
                    const active = connectorType === connKey;
                    return (
                      <button
                        key={connKey}
                        type="button"
                        onClick={() => setConnectorType(connKey)}
                        className={`flex w-full items-center justify-between border px-3 py-2.5 text-left text-xs transition-colors ${
                          active
                            ? 'border-[#D97724] bg-[#23201D]'
                            : 'border-[#EDE6D6]/12 bg-[#141312] hover:border-[#EDE6D6]/30'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-[#EDE6D6]">{connKey}</div>
                          <div className="text-[11px] text-[#A39B8B]">{rule.note}</div>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-[#D97724]">
                          {rule.surchargePhp === 0 ? 'Included' : `+${formatPHP(rule.surchargePhp)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Wiring Standard + Quantity */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cable-wiring-select"
                    className="block text-xs font-medium text-[#EDE6D6]"
                  >
                    5. Wiring Standard
                  </label>
                  <select
                    id="cable-wiring-select"
                    value={wiring}
                    onChange={(e) => setWiring(e.target.value as CableWiring)}
                    className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-xs text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                  >
                    <option value="Straight-Through (T568B)">Straight-Through (T568B)</option>
                    <option value="Crossover (T568A/B)">Crossover (T568A/B)</option>
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-medium text-[#EDE6D6]">
                    6. Quantity
                  </span>
                  <div className="mt-1.5 flex min-h-[42px] items-center justify-between border border-[#EDE6D6]/15 bg-[#141312] px-2">
                    <button
                      type="button"
                      aria-label="Decrease cable quantity"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="flex h-8 w-8 items-center justify-center text-[#EDE6D6] hover:text-[#D97724]"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-sm tabular-nums text-[#EDE6D6]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Increase cable quantity"
                      onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                      className="flex h-8 w-8 items-center justify-center text-[#EDE6D6] hover:text-[#D97724]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="cable-intended-use"
                  className="block text-xs font-medium text-[#EDE6D6]"
                >
                  Intended Use (Optional)
                </label>
                <input
                  id="cable-intended-use"
                  type="text"
                  value={intendedUse}
                  onChange={(e) => setIntendedUse(e.target.value)}
                  placeholder="e.g., Modem to upstairs desk PC"
                  className="mt-1.5 w-full min-h-[40px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-xs text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 border-t border-[#EDE6D6]/10 pt-5">
              <MagneticButton
                type="button"
                disabled={!cableService}
                onClick={handleAdd}
                cursorLabel="Add Cable"
                className="flex min-h-[46px] w-full items-center justify-center gap-2 border border-[#D97724] bg-[#D97724] px-5 py-3 text-sm font-semibold text-[#141312] transition-colors hover:bg-[#e58432] disabled:opacity-50"
              >
                {justAdded ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Added to Request Tray</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>Add Cable to Request · {formatPHP(estimate.totalPricePhp)}</span>
                  </>
                )}
              </MagneticButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
