export type CableCategory = 'Cat5e' | 'Cat6';
export type CableWiring = 'Straight-Through (T568B)' | 'Crossover (T568A/B)';
export type ConnectorType = 'Standard RJ45' | 'Snagless Booted RJ45' | 'Shielded Cat6 RJ45';

export interface CableColorOption {
  id: string;
  label: string;
  hex: string;
  jacketAccent: string;
  availabilityNote: string;
}

export const CABLE_PRICING_RULES = {
  currency: 'PHP',
  minimumBaseFee: 100,
  categories: {
    Cat5e: {
      label: 'Cat5e UTP (Up to 1 Gbps / 100m)',
      perMeterPhp: 18,
      baseTerminationPhp: 70,
    },
    Cat6: {
      label: 'Cat6 (Up to 10 Gbps short-run / 250 MHz)',
      perMeterPhp: 28,
      baseTerminationPhp: 90,
    },
  },
  connectors: {
    'Standard RJ45': {
      surchargePhp: 0,
      note: '8P8C gold-plated modular plugs (pair)',
    },
    'Snagless Booted RJ45': {
      surchargePhp: 30,
      note: 'Molded strain-relief latch boots (pair)',
    },
    'Shielded Cat6 RJ45': {
      surchargePhp: 75,
      note: 'Metal-shielded pass-through plugs (pair)',
    },
  },
  wiring: {
    'Straight-Through (T568B)': {
      surchargePhp: 0,
      description: 'Standard patch cable for routers, switches, PCs, and wall jacks.',
    },
    'Crossover (T568A/B)': {
      surchargePhp: 20,
      description: 'For legacy direct PC-to-PC or older uplink equipment without Auto-MDIX.',
    },
  },
  colors: [
    {
      id: 'charcoal-black',
      label: 'Charcoal Black',
      hex: '#252321',
      jacketAccent: '#3f3a35',
      availabilityNote: 'Standard stock subject to reel availability',
    },
    {
      id: 'industrial-gray',
      label: 'Industrial Gray',
      hex: '#6d6962',
      jacketAccent: '#8e887f',
      availabilityNote: 'Standard stock subject to reel availability',
    },
    {
      id: 'copper-orange',
      label: 'Copper Orange',
      hex: '#c96b20',
      jacketAccent: '#e2883e',
      availabilityNote: 'Subject to stock confirmation upon quotation',
    },
    {
      id: 'slate-blue',
      label: 'Slate Blue',
      hex: '#38566b',
      jacketAccent: '#4d738d',
      availabilityNote: 'Subject to stock confirmation upon quotation',
    },
  ] satisfies CableColorOption[],
  minMeters: 1,
  maxMeters: 100,
} as const;

export interface CableEstimateInput {
  category: CableCategory;
  lengthMeters: number;
  connectorType: ConnectorType;
  wiring: CableWiring;
  quantity: number;
}

export interface CableEstimateBreakdown {
  materialCostPhp: number;
  terminationAndLaborPhp: number;
  connectorSurchargePhp: number;
  wiringSurchargePhp: number;
  unitPricePhp: number;
  totalPricePhp: number;
}

export function calculateCableEstimate(input: CableEstimateInput): CableEstimateBreakdown {
  const clampedMeters = Math.max(
    CABLE_PRICING_RULES.minMeters,
    Math.min(CABLE_PRICING_RULES.maxMeters, Math.round(Number(input.lengthMeters) || 1))
  );
  const clampedQty = Math.max(1, Math.min(50, Math.round(Number(input.quantity) || 1)));

  const catRule = CABLE_PRICING_RULES.categories[input.category] ?? CABLE_PRICING_RULES.categories.Cat6;
  const connRule =
    CABLE_PRICING_RULES.connectors[input.connectorType] ??
    CABLE_PRICING_RULES.connectors['Standard RJ45'];
  const wiringRule =
    CABLE_PRICING_RULES.wiring[input.wiring] ??
    CABLE_PRICING_RULES.wiring['Straight-Through (T568B)'];

  const materialCostPhp = clampedMeters * catRule.perMeterPhp;
  const terminationAndLaborPhp = catRule.baseTerminationPhp;
  const connectorSurchargePhp = connRule.surchargePhp;
  const wiringSurchargePhp = wiringRule.surchargePhp;

  const rawUnit =
    materialCostPhp + terminationAndLaborPhp + connectorSurchargePhp + wiringSurchargePhp;
  const unitPricePhp = Math.max(CABLE_PRICING_RULES.minimumBaseFee, rawUnit);

  return {
    materialCostPhp,
    terminationAndLaborPhp,
    connectorSurchargePhp,
    wiringSurchargePhp,
    unitPricePhp,
    totalPricePhp: unitPricePhp * clampedQty,
  };
}

export function calculateAuthoritativeItemEstimate(params: {
  slug: string;
  pricingType: string;
  startingPrice: number;
  quantity: number;
  configuration: Record<string, unknown>;
}): number | null {
  const qty = Math.max(1, Math.min(50, Math.round(Number(params.quantity) || 1)));

  if (params.pricingType === 'custom_quote') {
    return null;
  }

  if (params.slug === 'custom-ethernet-cable' || params.pricingType === 'cable_formula') {
    const category =
      params.configuration.category === 'Cat5e' ? 'Cat5e' : ('Cat6' as CableCategory);
    const lengthMeters = Number(params.configuration.lengthMeters) || 5;
    const connectorType: ConnectorType =
      params.configuration.connectorType === 'Snagless Booted RJ45' ||
      params.configuration.connectorType === 'Shielded Cat6 RJ45'
        ? params.configuration.connectorType
        : 'Standard RJ45';
    const wiring: CableWiring =
      params.configuration.wiring === 'Crossover (T568A/B)'
        ? 'Crossover (T568A/B)'
        : 'Straight-Through (T568B)';

    return calculateCableEstimate({
      category,
      lengthMeters,
      connectorType,
      wiring,
      quantity: qty,
    }).totalPricePhp;
  }

  return Math.max(0, Math.round(params.startingPrice)) * qty;
}

export function formatPHP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'Custom Quotation';
  }
  return `₱${amount.toLocaleString('en-PH')}`;
}
