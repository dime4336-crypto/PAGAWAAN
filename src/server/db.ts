import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_WORKSHOP_CONFIG,
  type WorkshopContactConfig,
} from '../config/workshop.ts';
import { calculateAuthoritativeItemEstimate } from '../config/pricing.ts';
import type {
  RequestStatus,
  ServiceCategory,
  ServiceItem,
  ServiceRequestRecord,
} from '../types/pagawaan.ts';

const dbFilePath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'pagawaan.db');
fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });

export const sqlite = new Database(dbFilePath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export function initializeDatabase(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS service_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      starting_price INTEGER NOT NULL DEFAULT 0 CHECK (starting_price >= 0),
      pricing_type TEXT NOT NULL CHECK (
        pricing_type IN ('fixed_starting', 'per_unit', 'custom_quote', 'cable_formula', 'monthly')
      ),
      turnaround_estimate TEXT NOT NULL DEFAULT 'Estimated upon assessment',
      configurator_type TEXT NOT NULL DEFAULT 'general_service',
      supports_quantity INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      email TEXT,
      location TEXT NOT NULL,
      service_method TEXT NOT NULL,
      preferred_date TEXT NOT NULL,
      additional_notes TEXT,
      estimated_total INTEGER,
      has_custom_quote_items INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'New' CHECK (
        status IN (
          'New',
          'Reviewing',
          'Quotation Sent',
          'Awaiting Confirmation',
          'Confirmed',
          'In Progress',
          'Completed',
          'Cancelled'
        )
      ),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS service_request_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 50),
      configuration TEXT NOT NULL DEFAULT '{}',
      estimated_price INTEGER
    );

    CREATE TABLE IF NOT EXISTS request_internal_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workshop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON service_requests(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_request_items_req ON service_request_items(request_id);
  `);

  seedCatalogIfEmpty();
  seedWorkshopConfigIfEmpty();
}

function seedWorkshopConfigIfEmpty(): void {
  const existing = sqlite
    .prepare('SELECT value FROM workshop_settings WHERE key = ?')
    .get('contact_config') as { value: string } | undefined;

  if (!existing) {
    sqlite
      .prepare('INSERT INTO workshop_settings (key, value) VALUES (?, ?)')
      .run('contact_config', JSON.stringify(DEFAULT_WORKSHOP_CONFIG));
  }
}

function seedCatalogIfEmpty(): void {
  const countRow = sqlite.prepare('SELECT COUNT(*) as cnt FROM service_categories').get() as {
    cnt: number;
  };
  if (countRow.cnt > 0) return;

  const insertCategory = sqlite.prepare(`
    INSERT INTO service_categories (slug, name, description, sort_order, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const insertService = sqlite.prepare(`
    INSERT INTO services (
      category_id, slug, name, description, details, starting_price,
      pricing_type, turnaround_estimate, configurator_type, supports_quantity, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const tx = sqlite.transaction(() => {
    const cat1 = Number(
      insertCategory.run(
        'computer-laptop',
        'Computer & Laptop Services',
        'Hardware diagnostics, OS recovery, thermal maintenance, and component upgrades.',
        1
      ).lastInsertRowid
    );
    const cat2 = Number(
      insertCategory.run(
        'networking-ethernet',
        'Networking & Ethernet',
        'Custom RJ45 termination, structured cabling, testing, and LAN configuration.',
        2
      ).lastInsertRowid
    );
    const cat3 = Number(
      insertCategory.run(
        'mobile-assistance',
        'Mobile Device Assistance',
        'Legitimate device setup, data migration, backup hygiene, and official account help.',
        3
      ).lastInsertRowid
    );
    const cat4 = Number(
      insertCategory.run(
        'software-development',
        'Software Development',
        'Python automation, custom web applications, databases, and site maintenance.',
        4
      ).lastInsertRowid
    );

    const servicesSeed: Array<
      [number, string, string, string, string, number, string, string, string, number]
    > = [
      [
        cat1,
        'basic-diagnostics',
        'Basic Diagnostics',
        'Structured hardware and software fault isolation for desktops and laptops.',
        'Includes POST verification, SMART storage health check, thermal inspection, and a clear written fault assessment before any repair proceeds.',
        150,
        'fixed_starting',
        'Est. 1–2 hours',
        'pc_troubleshooting',
        1,
      ],
      [
        cat1,
        'pc-software-troubleshooting',
        'Software Troubleshooting',
        'Resolve OS boot errors, driver conflicts, crashing apps, and startup issues.',
        'Targeted troubleshooting of Windows or Linux environment issues, corrupted registries, or stubborn driver mismatches.',
        250,
        'fixed_starting',
        'Est. 2–4 hours',
        'pc_troubleshooting',
        1,
      ],
      [
        cat1,
        'pc-optimization',
        'PC Optimization',
        'Clean startup bloat, tune power profiles, verify storage health, and tidy updates.',
        'Improves everyday responsiveness without risky third-party cleaners or unwanted data removal.',
        350,
        'fixed_starting',
        'Est. 2–3 hours',
        'pc_troubleshooting',
        1,
      ],
      [
        cat1,
        'windows-installation',
        'Windows Installation',
        'Clean OS installation, chipset drivers, essential utilities, and partition setup.',
        'Optional pre-install personal file backup available. Uses customer-owned or factory digital license.',
        500,
        'fixed_starting',
        'Est. 2–4 hours',
        'windows_install',
        1,
      ],
      [
        cat1,
        'ram-ssd-installation',
        'RAM / SSD Installation',
        'Careful physical installation of customer-supplied or sourced RAM and NVMe/SATA drives.',
        'Labor starting rate; hardware parts are quoted separately if Pagawaan sources them.',
        200,
        'fixed_starting',
        'Est. 45–90 mins',
        'general_service',
        1,
      ],
      [
        cat1,
        'laptop-cleaning',
        'Laptop Cleaning',
        'Internal dust extraction from fans, heatsink fins, chassis vents, and keyboard.',
        'Reduces thermal throttling and fan noise using ESD-safe brushes and precision disassembly tools.',
        350,
        'fixed_starting',
        'Est. 1–2 hours',
        'general_service',
        1,
      ],
      [
        cat1,
        'thermal-paste-replacement',
        'Thermal Paste Replacement',
        'Heatsink cleaning and fresh application of high-conductivity thermal compound.',
        'Recommended when laptops run hot under light load or after years of dried factory paste.',
        350,
        'fixed_starting',
        'Est. 1–2 hours',
        'general_service',
        1,
      ],
      [
        cat2,
        'rj45-termination-one-end',
        'RJ45 Termination — One End',
        'Precision re-crimp of a damaged or broken RJ45 modular plug on one cable end.',
        'Terminated to T568B standard and verified on an 8-wire continuity tester.',
        50,
        'per_unit',
        'Est. 15–30 mins',
        'rj45_repair',
        1,
      ],
      [
        cat2,
        'rj45-termination-both-ends',
        'RJ45 Termination — Both Ends',
        'Fresh RJ45 plugs crimped on both ends of an existing Cat5e or Cat6 cable.',
        'Ideal for trimming excess cable slack or replacing worn plugs on both terminations.',
        100,
        'per_unit',
        'Est. 20–40 mins',
        'rj45_repair',
        1,
      ],
      [
        cat2,
        'custom-ethernet-cable',
        'Custom Ethernet Cable',
        'Made-to-length Cat5e or Cat6 patch cable with tested RJ45 connectors.',
        'Final estimate scales with cable category, exact meter length, connector boot type, and quantity.',
        100,
        'cable_formula',
        'Est. same day / next day',
        'custom_cable',
        1,
      ],
      [
        cat2,
        'ethernet-cable-testing',
        'Ethernet Cable Testing',
        'Pin-by-pin wiremap verification for shorts, opens, split pairs, or crossed wires.',
        'Diagnoses intermittent link drops before spending on unnecessary full cable replacement.',
        50,
        'per_unit',
        'Est. 15 mins',
        'rj45_repair',
        1,
      ],
      [
        cat2,
        'router-configuration',
        'Router Configuration',
        'SSID setup, WPA2/WPA3 hardening, DNS tuning, guest network, and firmware check.',
        'Tailored for home offices, studios, or secondary access point / bridge setups.',
        300,
        'fixed_starting',
        'Est. 1–2 hours',
        'network_install',
        0,
      ],
      [
        cat2,
        'basic-lan-setup',
        'Basic LAN Setup',
        'Interconnect router, switch, and wired workstations for reliable local sharing.',
        'Covers port patching, static LAN IPs for shared printers or NAS, and link verification.',
        500,
        'fixed_starting',
        'Est. 2–4 hours',
        'network_install',
        0,
      ],
      [
        cat2,
        'ethernet-installation',
        'Ethernet Installation',
        'Structured multi-room cable routing, surface trunking, and wall termination.',
        'Quoted after assessing room count, approximate run length, and mounting conditions.',
        0,
        'custom_quote',
        'Quoted after survey',
        'network_install',
        0,
      ],
      [
        cat3,
        'phone-setup',
        'Phone Setup',
        'Clean initial setup, essential app installation, storage organization, and settings review.',
        'Tailored for new devices, family handsets, or clean work-ready phone profiles.',
        200,
        'fixed_starting',
        'Est. 1–2 hours',
        'general_service',
        1,
      ],
      [
        cat3,
        'data-transfer',
        'Data Transfer',
        'Guided migration of photos, contacts, documents, and messages between devices.',
        'Handled securely with full verification before wiping or trading in the source device.',
        200,
        'fixed_starting',
        'Est. 1–3 hours',
        'general_service',
        1,
      ],
      [
        cat3,
        'backup-assistance',
        'Backup Assistance',
        'Configure cloud or local encrypted backups so important photos and files stay safe.',
        'Includes a plain-language walkthrough so you know how to verify and restore backups yourself.',
        200,
        'fixed_starting',
        'Est. 1–2 hours',
        'general_service',
        1,
      ],
      [
        cat3,
        'mobile-software-troubleshooting',
        'Software Troubleshooting',
        'Fix storage bloat, misbehaving apps, sync errors, and update failures.',
        'Software-level diagnostics without destructive factory resets unless explicitly requested.',
        250,
        'fixed_starting',
        'Est. 1–2 hours',
        'general_service',
        1,
      ],
      [
        cat3,
        'official-account-recovery',
        'Official Account Recovery Assistance',
        'Legitimate guided recovery through official Google, Apple, or Microsoft recovery channels.',
        'Authorized account owners only. Pagawaan never performs unauthorized security or lock bypassing.',
        0,
        'custom_quote',
        'Depends on provider review',
        'general_service',
        0,
      ],
      [
        cat4,
        'python-automation',
        'Python Automation',
        'Custom scripts for spreadsheet cleanup, file sorting, data parsing, or routine reports.',
        'Eliminates repetitive manual computer tasks with documented, maintainable scripts.',
        500,
        'fixed_starting',
        'Est. 2–5 days',
        'website_dev',
        0,
      ],
      [
        cat4,
        'website-development',
        'Website Development',
        'Custom-designed, fast, responsive websites built without bloated templates.',
        'Ideal for local businesses, service catalogs, portfolios, and custom quotation forms.',
        1500,
        'fixed_starting',
        'Est. 5–14 days',
        'website_dev',
        0,
      ],
      [
        cat4,
        'database-setup',
        'Database Setup',
        'Clean relational PostgreSQL or SQLite schema design, constraints, and backup workflows.',
        'Built for inventory ledgers, service queues, and structured operational records.',
        800,
        'fixed_starting',
        'Est. 2–4 days',
        'website_dev',
        0,
      ],
      [
        cat4,
        'custom-software',
        'Custom Software',
        'Bespoke internal dashboards, quotation tools, or hardware-connected web utilities.',
        'Scoped and quoted collaboratively around your exact operational workflow.',
        0,
        'custom_quote',
        'Quoted after scoping',
        'website_dev',
        0,
      ],
      [
        cat4,
        'website-maintenance',
        'Website Maintenance',
        'Monthly uptime checks, dependency patches, content edits, and backup verification.',
        'Monthly maintenance plan; scope and billing cadence confirmed before activation.',
        500,
        'monthly',
        'Ongoing monthly',
        'website_dev',
        0,
      ],
    ];

    for (const row of servicesSeed) {
      insertService.run(...row);
    }
  });

  tx();
}

export function getPublicCatalog(): {
  categories: ServiceCategory[];
  services: ServiceItem[];
} {
  const categories = sqlite
    .prepare(
      `SELECT id, slug, name, description, sort_order as sortOrder, is_active as isActive
       FROM service_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    )
    .all() as Array<Omit<ServiceCategory, 'isActive'> & { isActive: number }>;

  const services = sqlite
    .prepare(
      `SELECT
         s.id,
         s.category_id as categoryId,
         c.slug as categorySlug,
         c.name as categoryName,
         s.slug,
         s.name,
         s.description,
         s.details,
         s.starting_price as startingPrice,
         s.pricing_type as pricingType,
         s.turnaround_estimate as turnaroundEstimate,
         s.configurator_type as configuratorType,
         s.supports_quantity as supportsQuantity,
         s.is_active as isActive
       FROM services s
       JOIN service_categories c ON s.category_id = c.id
       WHERE s.is_active = 1 AND c.is_active = 1
       ORDER BY c.sort_order ASC, s.id ASC`
    )
    .all() as Array<
    Omit<ServiceItem, 'supportsQuantity' | 'isActive'> & {
      supportsQuantity: number;
      isActive: number;
    }
  >;

  return {
    categories: categories.map((c) => ({ ...c, isActive: Boolean(c.isActive) })),
    services: services.map((s) => ({
      ...s,
      supportsQuantity: Boolean(s.supportsQuantity),
      isActive: Boolean(s.isActive),
    })),
  };
}

export function getAdminCatalog(): {
  categories: ServiceCategory[];
  services: ServiceItem[];
} {
  const categories = sqlite
    .prepare(
      `SELECT id, slug, name, description, sort_order as sortOrder, is_active as isActive
       FROM service_categories
       ORDER BY sort_order ASC, id ASC`
    )
    .all() as Array<Omit<ServiceCategory, 'isActive'> & { isActive: number }>;

  const services = sqlite
    .prepare(
      `SELECT
         s.id,
         s.category_id as categoryId,
         c.slug as categorySlug,
         c.name as categoryName,
         s.slug,
         s.name,
         s.description,
         s.details,
         s.starting_price as startingPrice,
         s.pricing_type as pricingType,
         s.turnaround_estimate as turnaroundEstimate,
         s.configurator_type as configuratorType,
         s.supports_quantity as supportsQuantity,
         s.is_active as isActive
       FROM services s
       JOIN service_categories c ON s.category_id = c.id
       ORDER BY c.sort_order ASC, s.id ASC`
    )
    .all() as Array<
    Omit<ServiceItem, 'supportsQuantity' | 'isActive'> & {
      supportsQuantity: number;
      isActive: number;
    }
  >;

  return {
    categories: categories.map((c) => ({ ...c, isActive: Boolean(c.isActive) })),
    services: services.map((s) => ({
      ...s,
      supportsQuantity: Boolean(s.supportsQuantity),
      isActive: Boolean(s.isActive),
    })),
  };
}

export function getWorkshopConfig(): WorkshopContactConfig {
  const row = sqlite
    .prepare('SELECT value FROM workshop_settings WHERE key = ?')
    .get('contact_config') as { value: string } | undefined;
  if (!row) return DEFAULT_WORKSHOP_CONFIG;
  try {
    return { ...DEFAULT_WORKSHOP_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_WORKSHOP_CONFIG;
  }
}

export function updateWorkshopConfig(config: Partial<WorkshopContactConfig>): WorkshopContactConfig {
  const current = getWorkshopConfig();
  const next = { ...current, ...config };
  sqlite
    .prepare(
      `INSERT INTO workshop_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
    .run('contact_config', JSON.stringify(next));
  return next;
}

export function createServiceRequest(input: {
  customerName: string;
  contactNumber: string;
  email?: string;
  location: string;
  serviceMethod: string;
  preferredDate: string;
  additionalNotes?: string;
  items: Array<{
    serviceId: number;
    quantity: number;
    configuration: Record<string, string | number | boolean>;
  }>;
}): ServiceRequestRecord {
  const selectServiceStmt = sqlite.prepare(
    `SELECT id, slug, name, starting_price as startingPrice, pricing_type as pricingType, is_active as isActive
     FROM services WHERE id = ?`
  );

  const tx = sqlite.transaction(() => {
    let estimatedTotal = 0;
    let hasCustomQuoteItems = false;

    const resolvedItems = input.items.map((item) => {
      const dbService = selectServiceStmt.get(item.serviceId) as
        | {
            id: number;
            slug: string;
            name: string;
            startingPrice: number;
            pricingType: string;
            isActive: number;
          }
        | undefined;

      if (!dbService || !dbService.isActive) {
        throw new Error(`Requested service ID ${item.serviceId} is unavailable.`);
      }

      const authoritativePrice = calculateAuthoritativeItemEstimate({
        slug: dbService.slug,
        pricingType: dbService.pricingType,
        startingPrice: dbService.startingPrice,
        quantity: item.quantity,
        configuration: item.configuration,
      });

      if (authoritativePrice === null) {
        hasCustomQuoteItems = true;
      } else {
        estimatedTotal += authoritativePrice;
      }

      return {
        serviceId: dbService.id,
        serviceSlug: dbService.slug,
        serviceName: dbService.name,
        quantity: item.quantity,
        configuration: item.configuration,
        estimatedPrice: authoritativePrice,
      };
    });

    const seqRow = sqlite
      .prepare('SELECT COALESCE(MAX(id), 0) + 1 as nextId FROM service_requests')
      .get() as { nextId: number };
    const year = new Date().getFullYear();
    const referenceNumber = `PAG-${year}-${String(seqRow.nextId).padStart(5, '0')}`;

    const insertReq = sqlite.prepare(`
      INSERT INTO service_requests (
        reference_number, customer_name, contact_number, email, location,
        service_method, preferred_date, additional_notes, estimated_total,
        has_custom_quote_items, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New')
    `);

    const reqRes = insertReq.run(
      referenceNumber,
      input.customerName,
      input.contactNumber,
      input.email || null,
      input.location,
      input.serviceMethod,
      input.preferredDate,
      input.additionalNotes || null,
      estimatedTotal,
      hasCustomQuoteItems ? 1 : 0
    );

    const requestId = Number(reqRes.lastInsertRowid);

    const insertItem = sqlite.prepare(`
      INSERT INTO service_request_items (
        request_id, service_id, quantity, configuration, estimated_price
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const ri of resolvedItems) {
      insertItem.run(
        requestId,
        ri.serviceId,
        ri.quantity,
        JSON.stringify(ri.configuration),
        ri.estimatedPrice
      );
    }

    return requestId;
  });

  const newRequestId = tx();
  const created = getServiceRequestById(newRequestId);
  if (!created) {
    throw new Error('Failed to load created service request.');
  }
  return created;
}

export function getServiceRequestById(id: number): ServiceRequestRecord | null {
  const reqRow = sqlite
    .prepare(
      `SELECT
         id,
         reference_number as referenceNumber,
         customer_name as customerName,
         contact_number as contactNumber,
         email,
         location,
         service_method as serviceMethod,
         preferred_date as preferredDate,
         additional_notes as additionalNotes,
         estimated_total as estimatedTotal,
         has_custom_quote_items as hasCustomQuoteItems,
         status,
         created_at as createdAt
       FROM service_requests WHERE id = ?`
    )
    .get(id) as
    | (Omit<ServiceRequestRecord, 'items' | 'internalNotes' | 'hasCustomQuoteItems'> & {
        hasCustomQuoteItems: number;
      })
    | undefined;

  if (!reqRow) return null;

  const itemRows = sqlite
    .prepare(
      `SELECT
         i.id,
         i.service_id as serviceId,
         s.name as serviceName,
         s.slug as serviceSlug,
         i.quantity,
         i.configuration,
         i.estimated_price as estimatedPrice
       FROM service_request_items i
       JOIN services s ON i.service_id = s.id
       WHERE i.request_id = ?
       ORDER BY i.id ASC`
    )
    .all(id) as Array<{
    id: number;
    serviceId: number;
    serviceName: string;
    serviceSlug: string;
    quantity: number;
    configuration: string;
    estimatedPrice: number | null;
  }>;

  const noteRows = sqlite
    .prepare(
      `SELECT id, request_id as requestId, note, created_at as createdAt
       FROM request_internal_notes
       WHERE request_id = ?
       ORDER BY id DESC`
    )
    .all(id) as Array<{ id: number; requestId: number; note: string; createdAt: string }>;

  return {
    ...reqRow,
    hasCustomQuoteItems: Boolean(reqRow.hasCustomQuoteItems),
    items: itemRows.map((row) => ({
      ...row,
      configuration: safeParseJson(row.configuration),
    })),
    internalNotes: noteRows,
  };
}

export function listAllServiceRequests(): ServiceRequestRecord[] {
  const ids = sqlite
    .prepare('SELECT id FROM service_requests ORDER BY id DESC')
    .all() as Array<{ id: number }>;

  return ids
    .map((row) => getServiceRequestById(row.id))
    .filter((item): item is ServiceRequestRecord => item !== null);
}

export function updateRequestStatus(id: number, status: RequestStatus): ServiceRequestRecord | null {
  const result = sqlite
    .prepare('UPDATE service_requests SET status = ? WHERE id = ?')
    .run(status, id);
  if (result.changes === 0) return null;
  return getServiceRequestById(id);
}

export function addRequestInternalNote(
  requestId: number,
  note: string
): ServiceRequestRecord | null {
  const exists = sqlite
    .prepare('SELECT id FROM service_requests WHERE id = ?')
    .get(requestId) as { id: number } | undefined;
  if (!exists) return null;

  sqlite
    .prepare('INSERT INTO request_internal_notes (request_id, note) VALUES (?, ?)')
    .run(requestId, note.trim());

  return getServiceRequestById(requestId);
}

export function updateServiceRecord(
  id: number,
  patch: {
    startingPrice?: number;
    isActive?: boolean;
    turnaroundEstimate?: string;
    description?: string;
    categoryId?: number;
  }
): ServiceItem | null {
  const existing = sqlite.prepare('SELECT id FROM services WHERE id = ?').get(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];

  if (patch.startingPrice !== undefined) {
    updates.push('starting_price = ?');
    params.push(Math.max(0, Math.round(patch.startingPrice)));
  }
  if (patch.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }
  if (patch.turnaroundEstimate !== undefined) {
    updates.push('turnaround_estimate = ?');
    params.push(patch.turnaroundEstimate.trim());
  }
  if (patch.description !== undefined) {
    updates.push('description = ?');
    params.push(patch.description.trim());
  }
  if (patch.categoryId !== undefined) {
    updates.push('category_id = ?');
    params.push(patch.categoryId);
  }

  if (updates.length > 0) {
    params.push(id);
    sqlite.prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const catalog = getAdminCatalog();
  return catalog.services.find((s) => s.id === id) ?? null;
}

export function createCategoryRecord(input: {
  name: string;
  slug: string;
  description: string;
}): ServiceCategory {
  const maxOrder = sqlite
    .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as nextOrder FROM service_categories')
    .get() as { nextOrder: number };

  const res = sqlite
    .prepare(
      `INSERT INTO service_categories (slug, name, description, sort_order, is_active)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(input.slug.trim(), input.name.trim(), input.description.trim(), maxOrder.nextOrder);

  const id = Number(res.lastInsertRowid);
  const catalog = getAdminCatalog();
  const created = catalog.categories.find((c) => c.id === id);
  if (!created) throw new Error('Failed to create category');
  return created;
}

export function updateCategoryRecord(
  id: number,
  patch: { name?: string; description?: string; isActive?: boolean }
): ServiceCategory | null {
  const existing = sqlite.prepare('SELECT id FROM service_categories WHERE id = ?').get(id);
  if (!existing) return null;

  const updates: string[] = [];
  const params: unknown[] = [];

  if (patch.name !== undefined) {
    updates.push('name = ?');
    params.push(patch.name.trim());
  }
  if (patch.description !== undefined) {
    updates.push('description = ?');
    params.push(patch.description.trim());
  }
  if (patch.isActive !== undefined) {
    updates.push('is_active = ?');
    params.push(patch.isActive ? 1 : 0);
  }

  if (updates.length > 0) {
    params.push(id);
    sqlite
      .prepare(`UPDATE service_categories SET ${updates.join(', ')} WHERE id = ?`)
      .run(...params);
  }

  const catalog = getAdminCatalog();
  return catalog.categories.find((c) => c.id === id) ?? null;
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
