export interface WorkshopContactConfig {
  brandName: string;
  tagline: string;
  serviceLocation: string;
  coveredCities: string[];
  email: string;
  contactNumber: string;
  businessHours: string;
  facebookUrl: string;
  messengerUrl: string;
  whatsappUrl: string;
  availabilityDisclaimer: string;
  pricingDisclaimer: string;
}

export const DEFAULT_WORKSHOP_CONFIG: WorkshopContactConfig = {
  brandName: 'Pagawaan',
  tagline: 'Built, fixed, connected.',
  serviceLocation: 'Metro Manila, Philippines (Quezon City / Makati / Pasig / Manila / Taguig)',
  coveredCities: [
    'Quezon City',
    'Manila',
    'Makati',
    'Pasig',
    'Mandaluyong',
    'San Juan',
    'Taguig',
    'Marikina',
    'Parañaque',
    'Caloocan',
  ],
  email: 'workshop@pagawaan.ph',
  contactNumber: '+63 917 000 0000 (Configurable)',
  businessHours: 'Monday – Saturday, 10:00 AM – 7:00 PM PHT (By Arrangement)',
  facebookUrl: 'https://facebook.com/pagawaan.workshop',
  messengerUrl: 'https://m.me/pagawaan.workshop',
  whatsappUrl: 'https://wa.me/639170000000',
  availabilityDisclaimer:
    'Service schedules, on-site visits, and parts procurement are subject to technician availability and confirmation after request review.',
  pricingDisclaimer:
    'Listed PHP figures are introductory estimates only. Final quotations depend on diagnostic assessment, complexity, cable length, parts, and travel requirements.',
};

export const WORKSHOP_MEDIA = {
  heroBench: '/src/assets/images/workshop_hero_bench_1795187639464.jpg',
  dispatchLedger: '/src/assets/images/showcase_dispatch_ledger_1795187639068.jpg',
  posBridge: '/src/assets/images/showcase_pos_bridge_1795187639083.jpg',
  patchMapper: '/src/assets/images/showcase_patch_mapper_1795187639129.jpg',
} as const;

export interface ShowcaseProject {
  id: string;
  title: string;
  classification: 'Live Platform' | 'Demonstration Project';
  category: string;
  summary: string;
  architectureNotes: string;
  stack: string[];
  imageUrl: string;
  imageAlt: string;
  liveUrl?: string;
  sourceUrl?: string;
  interactiveSpecs: {
    label: string;
    value: string;
  }[];
}

export const SHOWCASE_PROJECTS: ShowcaseProject[] = [
  {
    id: 'pagawaan-platform',
    title: 'Pagawaan Service & Quotation Engine',
    classification: 'Live Platform',
    category: 'Full-Stack Web Application',
    summary:
      'The interactive storefront and workshop operations console you are using right now—featuring live SVG Ethernet pinout simulation, server-verified PHP pricing, multi-service request intake, and a protected owner console.',
    architectureNotes:
      'Built with strict TypeScript schemas, server-authoritative pricing validation, and relational persistence with zero client-side login friction.',
    stack: ['React 19', 'TypeScript', 'Express', 'SQLite / PostgreSQL', 'Zod', 'Motion'],
    imageUrl: WORKSHOP_MEDIA.heroBench,
    imageAlt: 'Pagawaan precision repair and testing bench with oscilloscope and Ethernet tools',
    liveUrl: '#top',
    interactiveSpecs: [
      { label: 'Core Capability', value: 'Multi-service intake & live cable builder' },
      { label: 'Validation', value: 'Shared Zod rules + server-side price lock' },
      { label: 'Operations', value: 'Passcode-gated console & CSV export' },
    ],
  },
  {
    id: 'barangay-dispatch-ledger',
    title: 'Barangay Dispatch & Inventory Ledger',
    classification: 'Demonstration Project',
    category: 'Operations Dashboard',
    summary:
      'A demonstration internal web ledger designed for local field teams to track equipment sign-outs, vehicle dispatch logs, and consumable cable stock across Metro Manila service routes.',
    architectureNotes:
      'Demonstrates dense tabular keyboard navigation, audit-ready timestamped entries, and CSV reconciliation.',
    stack: ['React', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
    imageUrl: WORKSHOP_MEDIA.dispatchLedger,
    imageAlt: 'Demonstration dark-mode dispatch and inventory dashboard on a workstation monitor',
    interactiveSpecs: [
      { label: 'Project Status', value: 'Demonstration Showcase (Sample UI)' },
      { label: 'Primary View', value: 'Stock movement ledger & field route log' },
      { label: 'Export Format', value: 'RFC-4180 CSV accounting snapshots' },
    ],
  },
  {
    id: 'pos-thermal-bridge',
    title: 'Retail POS & Thermal Receipt Bridge',
    classification: 'Demonstration Project',
    category: 'Python Automation & Hardware',
    summary:
      'A demonstration local Python print-spooler and lightweight web cashier interface that converts browser checkout orders into ESC/POS thermal receipts without cloud printer lock-in.',
    architectureNotes:
      'Shows how Pagawaan connects web tools directly to physical workshop or small-shop hardware over USB or LAN.',
    stack: ['Python', 'ESC/POS', 'WebSockets', 'SQLite'],
    imageUrl: WORKSHOP_MEDIA.posBridge,
    imageAlt: 'Demonstration thermal receipt printer and mechanical keypad on a workshop counter',
    interactiveSpecs: [
      { label: 'Project Status', value: 'Demonstration Showcase (Sample System)' },
      { label: 'Interface', value: 'Local USB / Ethernet thermal print queue' },
      { label: 'Offline Mode', value: 'Local queue survives internet dropouts' },
    ],
  },
  {
    id: 'patch-bay-mapper',
    title: 'Office Patch-Panel & Port Mapper',
    classification: 'Demonstration Project',
    category: 'Network Documentation Tool',
    summary:
      'A demonstration structured-cabling documentation portal mapping switch ports, wall faceplate labels, and T568B continuity test records for multi-room office setups.',
    architectureNotes:
      'Built to prevent unlabeled cable nests after office LAN installations or router reconfigurations.',
    stack: ['TypeScript', 'SVG Schematics', 'Relational DB'],
    imageUrl: WORKSHOP_MEDIA.patchMapper,
    imageAlt: 'Structured network patch panel with numbered RJ45 ports and combed cables',
    interactiveSpecs: [
      { label: 'Project Status', value: 'Demonstration Showcase (Sample System)' },
      { label: 'Mapping', value: 'Room faceplate ID to switch port trace' },
      { label: 'Deliverable', value: 'Printable rack port schedule' },
    ],
  },
];
