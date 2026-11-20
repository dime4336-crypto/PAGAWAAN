import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Minus, Plus, X } from 'lucide-react';
import {
  CABLE_PRICING_RULES,
  calculateAuthoritativeItemEstimate,
  formatPHP,
  type CableCategory,
  type CableWiring,
  type ConnectorType,
} from '../config/pricing';
import type { CartServiceItem, ServiceItem } from '../types/pagawaan';

interface ServiceConfiguratorModalProps {
  service: ServiceItem | null;
  onClose: () => void;
  onAdd: (item: CartServiceItem) => void;
}

export function ServiceConfiguratorModal({
  service,
  onClose,
  onAdd,
}: ServiceConfiguratorModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const [quantity, setQuantity] = useState(1);
  const [config, setConfig] = useState<Record<string, string | number | boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!service) return;
    setQuantity(1);
    setFormError(null);

    switch (service.configuratorType) {
      case 'windows_install':
        setConfig({
          deviceType: 'Laptop',
          currentOs: 'Windows 10 / Corrupt OS',
          desiredOs: 'Windows 11 Home / Pro',
          needsBackup: 'Yes — backup personal files first',
          deviceCondition: 'Boots normally / Working drive',
        });
        break;
      case 'custom_cable':
        setConfig({
          category: 'Cat6',
          lengthMeters: 5,
          connectorType: 'Standard RJ45',
          color: 'Charcoal Black',
          wiring: 'Straight-Through (T568B)',
          intendedUse: 'Home / Office Desk Connection',
          deliveryPreference: 'Delivery / pickup by arrangement',
        });
        break;
      case 'rj45_repair':
        setConfig({
          terminationScope:
            service.slug === 'rj45-termination-both-ends'
              ? 'Both Ends'
              : service.slug === 'ethernet-cable-testing'
                ? 'Continuity Test Only'
                : 'One End',
          cableCondition: 'Broken RJ45 latch / loose contact',
          requireTesting: 'Yes — verify 8-pin wiremap',
        });
        break;
      case 'pc_troubleshooting':
        setConfig({
          deviceType: 'Laptop',
          brandModel: '',
          problemCategory: 'Slow performance / Overheating',
          problemDescription: '',
        });
        break;
      case 'network_install':
        setConfig({
          deviceCount: '3–5 wired devices',
          approxCableLength: '25 meters',
          roomCount: '2 rooms',
          routerSwitchAvailable: 'Have ISP router, need advice on switch',
          installLocation: 'Home Office / Residence',
        });
        break;
      case 'website_dev':
        setConfig({
          projectType: service.name,
          pageOrModuleCount: '3–5 pages / core workflows',
          desiredFeatures: '',
          existingHosting: 'No — need guidance on domain & hosting',
          designReference: '',
        });
        break;
      default:
        setConfig({
          deviceModel: '',
          requirements: '',
        });
        break;
    }
  }, [service]);

  if (!service) return null;

  const estimatedPrice = calculateAuthoritativeItemEstimate({
    slug: service.slug,
    pricingType: service.pricingType,
    startingPrice: service.startingPrice,
    quantity,
    configuration: config,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      service.configuratorType === 'pc_troubleshooting' &&
      !String(config.problemDescription || '').trim()
    ) {
      setFormError('Please briefly describe the symptom or issue you are experiencing.');
      return;
    }

    if (
      service.configuratorType === 'website_dev' &&
      !String(config.desiredFeatures || '').trim()
    ) {
      setFormError('Please outline the features or workflow you want built.');
      return;
    }

    onAdd({
      uid: `${service.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serviceId: service.id,
      serviceSlug: service.slug,
      serviceName: service.name,
      categoryName: service.categoryName,
      pricingType: service.pricingType,
      startingPrice: service.startingPrice,
      quantity,
      configuration: config,
      estimatedPrice,
    });
    onClose();
  };

  const setField = (key: string, value: string | number | boolean) => {
    setFormError(null);
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="configurator-modal-title"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        />

        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto border border-[#EDE6D6]/20 bg-[#1B1917] p-6 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-[#EDE6D6]/10 pb-4">
            <div>
              <div className="text-xs font-medium text-[#D97724]">
                Configure Service Specification
              </div>
              <h3
                id="configurator-modal-title"
                className="mt-1 font-display text-xl font-bold text-[#EDE6D6]"
              >
                {service.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close configurator"
              className="flex h-10 w-10 items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B] hover:text-[#EDE6D6]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {service.configuratorType === 'windows_install' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldSelect
                    label="Device Type"
                    value={String(config.deviceType)}
                    onChange={(v) => setField('deviceType', v)}
                    options={['Laptop', 'Desktop PC', 'Mini PC / All-in-One']}
                  />
                  <FieldSelect
                    label="Desired OS"
                    value={String(config.desiredOs)}
                    onChange={(v) => setField('desiredOs', v)}
                    options={[
                      'Windows 11 Home / Pro',
                      'Windows 10 Home / Pro',
                      'Dual-Boot (Windows + Linux)',
                    ]}
                  />
                </div>
                <FieldInput
                  label="Current OS / State"
                  value={String(config.currentOs)}
                  onChange={(v) => setField('currentOs', v)}
                  placeholder="e.g., Windows 10 stuck on boot, fresh blank SSD"
                />
                <FieldSelect
                  label="Do personal files need backup before installation?"
                  value={String(config.needsBackup)}
                  onChange={(v) => setField('needsBackup', v)}
                  options={[
                    'Yes — backup personal files first',
                    'No — fresh wipe / files already backed up',
                    'Unsure — check drive first',
                  ]}
                />
                <FieldInput
                  label="Device Condition & Drive Type"
                  value={String(config.deviceCondition)}
                  onChange={(v) => setField('deviceCondition', v)}
                  placeholder="e.g., Dell Latitude, 512GB NVMe SSD, battery works"
                />
              </>
            )}

            {service.configuratorType === 'custom_cable' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldSelect
                    label="Cable Category"
                    value={String(config.category)}
                    onChange={(v) => setField('category', v as CableCategory)}
                    options={['Cat5e', 'Cat6']}
                  />
                  <div>
                    <label className="block text-xs font-medium text-[#EDE6D6]">
                      Desired Length (meters)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={Number(config.lengthMeters) || 1}
                      onChange={(e) => setField('lengthMeters', Number(e.target.value))}
                      className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 font-mono text-sm tabular-nums text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldSelect
                    label="Connector Type"
                    value={String(config.connectorType)}
                    onChange={(v) => setField('connectorType', v as ConnectorType)}
                    options={[
                      'Standard RJ45',
                      'Snagless Booted RJ45',
                      'Shielded Cat6 RJ45',
                    ]}
                  />
                  <FieldSelect
                    label="Wiring Standard"
                    value={String(config.wiring)}
                    onChange={(v) => setField('wiring', v as CableWiring)}
                    options={['Straight-Through (T568B)', 'Crossover (T568A/B)']}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldSelect
                    label="Jacket Color (Subject to reel stock)"
                    value={String(config.color)}
                    onChange={(v) => setField('color', v)}
                    options={CABLE_PRICING_RULES.colors.map((c) => c.label)}
                  />
                  <FieldSelect
                    label="Delivery or Installation Preference"
                    value={String(config.deliveryPreference)}
                    onChange={(v) => setField('deliveryPreference', v)}
                    options={[
                      'Delivery / pickup by arrangement',
                      'On-site routing & termination',
                    ]}
                  />
                </div>
                <FieldInput
                  label="Intended Use"
                  value={String(config.intendedUse)}
                  onChange={(v) => setField('intendedUse', v)}
                  placeholder="e.g., Router to gaming PC, CCTV uplink, office switch"
                />
              </>
            )}

            {service.configuratorType === 'rj45_repair' && (
              <>
                <FieldSelect
                  label="Termination / Testing Scope"
                  value={String(config.terminationScope)}
                  onChange={(v) => setField('terminationScope', v)}
                  options={['One End', 'Both Ends', 'Continuity Test Only']}
                />
                <FieldInput
                  label="Cable Condition"
                  value={String(config.cableCondition)}
                  onChange={(v) => setField('cableCondition', v)}
                  placeholder="e.g., Cat6 indoor run, snapped latch, loose speed drop to 100Mbps"
                />
                <FieldSelect
                  label="Cable Testing Requirement"
                  value={String(config.requireTesting)}
                  onChange={(v) => setField('requireTesting', v)}
                  options={[
                    'Yes — verify 8-pin wiremap',
                    'No — visual crimp only',
                  ]}
                />
              </>
            )}

            {service.configuratorType === 'pc_troubleshooting' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldSelect
                    label="Device Type"
                    value={String(config.deviceType)}
                    onChange={(v) => setField('deviceType', v)}
                    options={['Laptop', 'Desktop PC', 'Custom Built Workstation']}
                  />
                  <FieldInput
                    label="Device Brand & Model"
                    value={String(config.brandModel)}
                    onChange={(v) => setField('brandModel', v)}
                    placeholder="e.g., Lenovo ThinkPad T14 / Custom Ryzen 5"
                  />
                </div>
                <FieldSelect
                  label="Problem Category"
                  value={String(config.problemCategory)}
                  onChange={(v) => setField('problemCategory', v)}
                  options={[
                    'Slow performance / Overheating',
                    'No power / No display',
                    'Windows crash / Boot loop',
                    'Driver / Wi-Fi / Audio fault',
                    'Storage / SSD health concern',
                    'Other issue',
                  ]}
                />
                <FieldTextarea
                  label="Problem Description *"
                  value={String(config.problemDescription)}
                  onChange={(v) => setField('problemDescription', v)}
                  placeholder="Describe symptoms, error messages, or recent changes before the problem started."
                />
              </>
            )}

            {service.configuratorType === 'network_install' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Number of Devices"
                    value={String(config.deviceCount)}
                    onChange={(v) => setField('deviceCount', v)}
                    placeholder="e.g., 4 PCs, 1 printer, 2 APs"
                  />
                  <FieldInput
                    label="Approximate Cable Length"
                    value={String(config.approxCableLength)}
                    onChange={(v) => setField('approxCableLength', v)}
                    placeholder="e.g., ~40 meters total"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Number of Rooms / Floors"
                    value={String(config.roomCount)}
                    onChange={(v) => setField('roomCount', v)}
                    placeholder="e.g., 2 rooms, single floor"
                  />
                  <FieldSelect
                    label="Router / Switch Availability"
                    value={String(config.routerSwitchAvailable)}
                    onChange={(v) => setField('routerSwitchAvailable', v)}
                    options={[
                      'All routers & switches already on site',
                      'Have ISP router, need switch recommendation',
                      'Need full equipment recommendation',
                    ]}
                  />
                </div>
                <FieldInput
                  label="Installation Location & Wall Type"
                  value={String(config.installLocation)}
                  onChange={(v) => setField('installLocation', v)}
                  placeholder="e.g., Concrete condo wall, surface PVC molding preferred"
                />
              </>
            )}

            {service.configuratorType === 'website_dev' && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FieldInput
                    label="Project / Website Type"
                    value={String(config.projectType)}
                    onChange={(v) => setField('projectType', v)}
                    placeholder="e.g., Business Catalog, Booking Tool, Python Script"
                  />
                  <FieldInput
                    label="Estimated Pages or Modules"
                    value={String(config.pageOrModuleCount)}
                    onChange={(v) => setField('pageOrModuleCount', v)}
                    placeholder="e.g., 5 pages + admin panel"
                  />
                </div>
                <FieldTextarea
                  label="Desired Features & Workflow *"
                  value={String(config.desiredFeatures)}
                  onChange={(v) => setField('desiredFeatures', v)}
                  placeholder="Explain what the website, script, or database needs to accomplish."
                />
                <FieldSelect
                  label="Existing Domain / Hosting"
                  value={String(config.existingHosting)}
                  onChange={(v) => setField('existingHosting', v)}
                  options={[
                    'No — need guidance on domain & hosting',
                    'Yes — already have domain and hosting',
                    'Local / offline tool only',
                  ]}
                />
                <FieldInput
                  label="Design References or Links (Optional)"
                  value={String(config.designReference)}
                  onChange={(v) => setField('designReference', v)}
                  placeholder="Share reference sites or aesthetic notes"
                />
              </>
            )}

            {service.configuratorType === 'general_service' && (
              <>
                <FieldInput
                  label="Device Brand / Model"
                  value={String(config.deviceModel)}
                  onChange={(v) => setField('deviceModel', v)}
                  placeholder="e.g., iPhone 13, Samsung A54, Acer Nitro 5"
                />
                <FieldTextarea
                  label="Specific Requirements or Notes"
                  value={String(config.requirements)}
                  onChange={(v) => setField('requirements', v)}
                  placeholder="Share parts you already have, data size for transfers, or specific goals."
                />
              </>
            )}

            {/* Quantity selector where applicable */}
            {service.supportsQuantity && (
              <div className="flex items-center justify-between border border-[#EDE6D6]/10 bg-[#141312] px-4 py-3">
                <div>
                  <div className="text-xs font-medium text-[#EDE6D6]">Quantity / Units</div>
                  <div className="text-[11px] text-[#A39B8B]">
                    Adjust if requesting for multiple devices or cables
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center border border-[#EDE6D6]/15 bg-[#1B1917] text-[#EDE6D6] hover:border-[#D97724]"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center font-mono text-sm tabular-nums text-[#EDE6D6]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(50, q + 1))}
                    className="flex h-9 w-9 items-center justify-center border border-[#EDE6D6]/15 bg-[#1B1917] text-[#EDE6D6] hover:border-[#D97724]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="border border-[#B8443A]/60 bg-[#B8443A]/15 px-3.5 py-2.5 text-xs text-[#EDE6D6]"
              >
                {formError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EDE6D6]/10 pt-4">
              <div>
                <div className="text-xs text-[#A39B8B]">Preliminary Line Estimate</div>
                <div className="font-mono text-lg font-semibold tabular-nums text-[#EDE6D6]">
                  {estimatedPrice !== null
                    ? `${formatPHP(estimatedPrice)}${service.pricingType === 'monthly' ? '/mo' : ''}`
                    : 'Custom Quotation'}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] border border-[#EDE6D6]/20 px-4 py-2 text-xs font-medium text-[#EDE6D6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] border border-[#D97724] bg-[#D97724] px-5 py-2 text-xs font-semibold text-[#141312] hover:bg-[#e58432]"
                >
                  Add to Request
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#EDE6D6]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-sm text-[#EDE6D6] placeholder:text-[#A39B8B]/55 focus:border-[#D97724] focus:outline-none"
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#EDE6D6]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#EDE6D6]">{label}</label>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-sm text-[#EDE6D6] placeholder:text-[#A39B8B]/55 focus:border-[#D97724] focus:outline-none"
      />
    </div>
  );
}
