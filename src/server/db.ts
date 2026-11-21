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
  QueueStatus,
  PublicQueueItem,
  MarketplaceCondition,
  MarketplaceListing,
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
      queue_status TEXT NOT NULL DEFAULT 'In Queue' CHECK (
        queue_status IN ('In Queue', 'Working on It', 'Done')
      ),
      queue_done_at TEXT,
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

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      condition TEXT NOT NULL,
      location TEXT NOT NULL,
      images TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Sold')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_services_category ON services(category_id);
    CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_created ON service_requests(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_request_items_req ON service_request_items(request_id);
  `);

  const requestColumns = sqlite
    .pragma('table_info(service_requests)') as Array<{ name: string }>;
  if (!requestColumns.some((column) => column.name === 'queue_status')) {
    sqlite.exec(`
      ALTER TABLE service_requests
      ADD COLUMN queue_status TEXT NOT NULL DEFAULT 'In Queue'
      CHECK (queue_status IN ('In Queue', 'Working on It', 'Done'))
    `);
  }
  if (!requestColumns.some((column) => column.name === 'queue_done_at')) {
    sqlite.exec('ALTER TABLE service_requests ADD COLUMN queue_done_at TEXT');
  }

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
    return;
  }

  try {
    const saved = JSON.parse(existing.value) as Partial<WorkshopContactConfig>;
    const usesPlaceholderDetails =
      saved.serviceLocation?.startsWith('Metro Manila') ||
      saved.email === 'workshop@pagawaan.ph' ||
      saved.contactNumber?.includes('917 000 0000') ||
      saved.whatsappUrl === 'https://wa.me/639170000000';

    if (usesPlaceholderDetails) {
      sqlite
        .prepare(
          `INSERT INTO workshop_settings (key, value, updated_at)
           VALUES (?, ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .run(
          'contact_config',
          JSON.stringify({
            ...DEFAULT_WORKSHOP_CONFIG,
            ...saved,
            serviceLocation: DEFAULT_WORKSHOP_CONFIG.serviceLocation,
            coveredCities: DEFAULT_WORKSHOP_CONFIG.coveredCities,
            email: DEFAULT_WORKSHOP_CONFIG.email,
            contactNumber: DEFAULT_WORKSHOP_CONFIG.contactNumber,
            businessHours: DEFAULT_WORKSHOP_CONFIG.businessHours,
            whatsappUrl: DEFAULT_WORKSHOP_CONFIG.whatsappUrl,
          })
        );
    }
  } catch {
    sqlite
      .prepare(
        `INSERT INTO workshop_settings (key, value, updated_at)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run('contact_config', JSON.stringify(DEFAULT_WORKSHOP_CONFIG));
  }
}

function seedCatalogIfEmpty(): void {
  const upsertCategory = sqlite.prepare(`
    INSERT INTO service_categories (slug, name, description, sort_order, is_active)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      sort_order = excluded.sort_order
  `);

  const upsertService = sqlite.prepare(`
    INSERT INTO services (
      category_id, slug, name, description, details, starting_price,
      pricing_type, turnaround_estimate, configurator_type, supports_quantity, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      category_id = excluded.category_id,
      name = excluded.name,
      description = excluded.description,
      details = excluded.details,
      starting_price = excluded.starting_price,
      pricing_type = excluded.pricing_type,
      turnaround_estimate = excluded.turnaround_estimate,
      configurator_type = excluded.configurator_type,
      supports_quantity = excluded.supports_quantity,
      is_active = 1
  `);

  type ServiceSeed = [
    number,
    string,
    string,
    string,
    string,
    number,
    string,
    string,
    string,
    number,
  ];
  type FixedServiceSeed = [number, string, string, string, number];

  const tx = sqlite.transaction(() => {
    const categories: Array<[string, string, string, number]> = [
      ['computer-laptop', 'Computer & Laptop Services', 'Diagnostics, troubleshooting, repair, upgrades, cleaning, and system recovery.', 1],
      ['networking-ethernet', 'Networking & Ethernet', 'Cable termination, fabrication, testing, routing, labeling, and LAN cabling.', 2],
      ['network-router', 'Router & Network Configuration', 'Router, Wi-Fi, LAN, switch, printer, sharing, and network maintenance setup.', 3],
      ['mobile-assistance', 'Mobile Device Assistance', 'Phone setup, data transfer, backup, account assistance, and software troubleshooting.', 4],
      ['phone-hardware', 'Phone Hardware Repair', 'Screen, battery, charging port, speaker, and camera replacement labor.', 5],
      ['data-storage', 'Data Backup & Storage', 'Backup, storage setup, migration, health assessment, wiping, and recovery assessment.', 6],
      ['software-development', 'Software & Web Development', 'Websites, automation, reports, databases, dashboards, integrations, and custom applications.', 7],
      ['additional-services', 'Additional Services', 'Remote assistance, callouts, urgent service, after-hours support, and device pickup/delivery.', 8],
      ['service-packages', 'Service Packages', 'Predefined bundled services at a fixed Pagawaan package price.', 9],
    ];
    for (const category of categories) upsertCategory.run(...category);

    const categoryId = (slug: string): number => Number(
      (sqlite.prepare('SELECT id FROM service_categories WHERE slug = ?').get(slug) as { id: number }).id
    );

    const fixed = (
      start: number,
      turnaround = 'Est. upon assessment',
      configurator = 'general_service',
      quantity = 1,
    ): FixedServiceSeed =>
      [start, 'fixed_starting', turnaround, configurator, quantity];

    const services: ServiceSeed[] = [
      [categoryId('computer-laptop'), 'basic-computer-diagnostics', 'Basic Computer Diagnostics', 'Hardware and software fault isolation.', 'POST, startup, hardware, thermal, and baseline storage assessment.', ...fixed(250, '1–2 hours')],
      [categoryId('computer-laptop'), 'software-troubleshooting', 'Software Troubleshooting', 'Resolve software crashes, conflicts, and OS errors.', 'Targeted diagnosis and removal of the identified software fault.', ...fixed(350, '2–4 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'slow-pc-optimization', 'Slow PC Optimization', 'Improve startup and everyday PC responsiveness.', 'Startup cleanup, settings tuning, updates, and storage checks.', ...fixed(500, '2–3 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'windows-error-troubleshooting', 'Windows Error Troubleshooting', 'Diagnose and resolve Windows system errors.', 'Troubleshooting for update, driver, application, and system errors.', ...fixed(350, '1–3 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'blue-screen-troubleshooting', 'Blue Screen Troubleshooting', 'Identify the cause of stop errors and repeated crashes.', 'Crash dump review, driver and hardware fault isolation, and corrective action.', ...fixed(400, '2–4 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'boot-failure-troubleshooting', 'Boot Failure Troubleshooting', 'Restore failed or unbootable systems.', 'Diagnosis of boot records, storage devices, firmware, and startup configuration.', ...fixed(400, '2–4 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'virus-malware-removal', 'Virus and Malware Removal', 'Clean infected systems and remove malicious software.', 'Malware scanning, cleanup, browser reset, security review, and protection setup.', ...fixed(600, '3–6 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'windows-reinstallation', 'Windows Reinstallation', 'Clean Windows installation and essential setup.', 'OS installation, drivers, updates, and baseline configuration.', ...fixed(700, '2–4 hours', 'windows_install')],
      [categoryId('computer-laptop'), 'windows-installation-with-backup', 'Windows Installation with Backup', 'Back up data, reinstall Windows, and restore saved files.', 'Backup is completed before OS installation; license requirements apply.', ...fixed(900, '4–8 hours', 'windows_install')],
      [categoryId('computer-laptop'), 'driver-installation', 'Driver Installation', 'Install compatible chipset, graphics, audio, and device drivers.', 'Verified driver installation and device-manager review.', ...fixed(200, '1–2 hours')],
      [categoryId('computer-laptop'), 'software-installation', 'Software Installation', 'Install and configure customer-approved software.', 'Setup and basic verification of requested applications.', ...fixed(150, '30–90 mins')],
      [categoryId('computer-laptop'), 'startup-optimization', 'Startup Optimization', 'Reduce startup delays and remove unnecessary launch items.', 'Review startup applications and tune startup behavior.', ...fixed(300, '1–2 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'system-updates-configuration', 'System Updates and Configuration', 'Apply OS updates and configure system settings.', 'Windows updates, privacy and power settings, and security configuration.', ...fixed(300, '1–3 hours')],
      [categoryId('computer-laptop'), 'ssd-installation-labor', 'SSD Installation (Labor)', 'Install a customer-provided SSD.', 'Hardware installation and post-install verification; SSD sold separately.', ...fixed(350, '1–2 hours')],
      [categoryId('computer-laptop'), 'ram-installation-labor', 'RAM Installation (Labor)', 'Install compatible customer-provided memory.', 'Physical installation and boot verification; RAM sold separately.', ...fixed(250, '45–90 mins')],
      [categoryId('computer-laptop'), 'ssd-cloning-migration', 'SSD Cloning and Migration', 'Clone an existing system or migrate data to an SSD.', 'Source and destination health checks, cloning, and boot verification.', ...fixed(600, '3–6 hours')],
      [categoryId('computer-laptop'), 'custom-pc-assembly', 'Custom PC Assembly', 'Assemble a custom PC from customer-selected components.', 'Component inspection, assembly, cable routing, BIOS setup, and testing.', ...fixed(1000, '4–8 hours')],
      [categoryId('computer-laptop'), 'pc-cable-management', 'PC Cable Management', 'Improve internal cable routing and airflow presentation.', 'Cable repositioning, tie-down, and visual cleanup inside the chassis.', ...fixed(400, '1–3 hours')],
      [categoryId('computer-laptop'), 'desktop-preventive-maintenance', 'Desktop Preventive Maintenance', 'Clean and inspect a desktop computer.', 'Internal dust removal, fan check, contact review, and software health check.', ...fixed(700, '2–4 hours')],
      [categoryId('computer-laptop'), 'laptop-internal-cleaning', 'Laptop Internal Cleaning', 'Clean dust and debris from laptop internals.', 'ESD-safe internal disassembly, fan and heatsink cleaning.', ...fixed(800, '2–4 hours')],
      [categoryId('computer-laptop'), 'desktop-internal-cleaning', 'Desktop Internal Cleaning', 'Remove dust and inspect desktop cooling components.', 'Case, fan, heatsink, filters, and vent cleaning.', ...fixed(600, '1–3 hours')],
      [categoryId('computer-laptop'), 'thermal-paste-replacement', 'Thermal Paste Replacement', 'Replace processor thermal compound.', 'CPU/GPU heatsink cleaning and fresh thermal compound application.', ...fixed(500, '1–3 hours')],
      [categoryId('computer-laptop'), 'full-laptop-cleaning-thermal-paste', 'Full Laptop Cleaning + Thermal Paste', 'Complete internal cleaning and thermal compound replacement.', 'Full dust removal, cooling inspection, heatsink service, and stress check.', ...fixed(1000, '3–5 hours')],
      [categoryId('computer-laptop'), 'pc-no-display-troubleshooting', 'PC No-Display Troubleshooting', 'Diagnose a PC with no monitor output.', 'Cable, GPU, RAM, BIOS, display, and motherboard fault isolation.', ...fixed(350, '1–3 hours', 'pc_troubleshooting')],
      [categoryId('computer-laptop'), 'pc-no-power-troubleshooting', 'PC No-Power Troubleshooting', 'Find why a desktop or laptop will not power on.', 'Power adapter, PSU, switch, battery, board, and protection fault checks.', ...fixed(350, '1–3 hours', 'pc_troubleshooting')],

      [categoryId('networking-ethernet'), 'rj45-retermination-one-end', 'RJ45 Retermination, One End', 'Replace or repair one RJ45 cable end.', 'T568 termination and continuity verification.', ...fixed(100, '15–30 mins', 'rj45_repair')],
      [categoryId('networking-ethernet'), 'rj45-retermination-both-ends', 'RJ45 Retermination, Both Ends', 'Replace or repair both RJ45 cable ends.', 'Both ends terminated and continuity-tested.', ...fixed(150, '20–40 mins', 'rj45_repair')],
      [categoryId('networking-ethernet'), 'ethernet-continuity-testing', 'Ethernet Cable Continuity Testing', 'Test cable wiremap and signal pin continuity.', 'Pin-by-pin testing for shorts, opens, and crossed pairs.', ...fixed(100, '15 mins', 'rj45_repair')],
      [categoryId('networking-ethernet'), 'cable-fault-diagnosis', 'Cable Fault Diagnosis', 'Identify damaged or poorly terminated network cabling.', 'Visual, continuity, and link-fault assessment.', ...fixed(150, '30–60 mins', 'network_install')],
      [categoryId('networking-ethernet'), 'custom-cat5e-cable', 'Custom Cat5e Cable', 'Made-to-length Cat5e Ethernet cable.', 'Cable fabrication priced per meter and availability confirmed.', ...fixed(20, 'Same day / next day', 'custom_cable')],
      [categoryId('networking-ethernet'), 'custom-cat6-cable', 'Custom Cat6 Cable', 'Made-to-length Cat6 Ethernet cable.', 'Cable fabrication priced per meter and availability confirmed.', ...fixed(25, 'Same day / next day', 'custom_cable')],
      [categoryId('networking-ethernet'), 'cable-fabrication-labor', 'Cable Fabrication Labor', 'Labor for fabrication and assembly of network cable.', 'Termination and testing labor for one cable job.', ...fixed(50, '15–60 mins', 'rj45_repair')],
      [categoryId('networking-ethernet'), 'cable-organization', 'Cable Organization', 'Organize loose or tangled network cables.', 'Routing, bundling, labeling, and dressing of existing cables.', ...fixed(300, '1–3 hours')],
      [categoryId('networking-ethernet'), 'ethernet-cable-installation', 'Ethernet Cable Installation', 'Install one or more Ethernet cable runs.', 'Survey, routing, termination, and basic link testing.', ...fixed(500, 'Quoted after survey', 'network_install')],
      [categoryId('networking-ethernet'), 'wall-to-wall-cable-routing', 'Wall-to-Wall Cable Routing', 'Route Ethernet cabling between rooms or end points.', 'Routing is quoted after length, access, and wall conditions are assessed.', ...fixed(500, 'Quoted after survey', 'network_install')],
      [categoryId('networking-ethernet'), 'keystone-jack-termination', 'Keystone Jack Termination', 'Terminate Ethernet at a wall or patch keystone jack.', 'T568 termination and port continuity testing.', ...fixed(150, '20–40 mins/port', 'rj45_repair')],
      [categoryId('networking-ethernet'), 'patch-panel-termination', 'Patch Panel Termination', 'Terminate and organize Ethernet ports at a patch panel.', 'Punch-down, labeling, and port testing.', ...fixed(100, '20–40 mins/port', 'rj45_repair')],
      [categoryId('networking-ethernet'), 'network-cable-labeling', 'Network Cable Labeling', 'Label cables and network endpoints.', 'Consistent labels for easier tracing and maintenance.', ...fixed(150, '1–2 hours')],
      [categoryId('networking-ethernet'), 'ethernet-cable-replacement', 'Ethernet Cable Replacement', 'Replace damaged or unsuitable Ethernet cable.', 'Replacement scope requires a site or cable assessment.', 0, 'custom_quote', 'Quoted after assessment', 'network_install', 0],
      [categoryId('networking-ethernet'), 'lan-connectivity-troubleshooting', 'LAN Connectivity Troubleshooting', 'Diagnose wired local network connection issues.', 'Link, switch, cable, IP, and endpoint testing.', ...fixed(300, '1–3 hours', 'network_install')],

      [categoryId('network-router'), 'router-initial-configuration', 'Router Initial Configuration', 'Set up a router for first-time use.', 'Internet, SSID, security, firmware, and basic network setup.', ...fixed(350, '1–2 hours', 'network_install')],
      [categoryId('network-router'), 'router-troubleshooting', 'Router Troubleshooting', 'Diagnose router and Internet connectivity issues.', 'Device, uplink, firmware, configuration, and wireless checks.', ...fixed(350, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'wifi-optimization', 'Wi-Fi Optimization', 'Improve wireless coverage and stability.', 'Channel, placement, band, roaming, and interference review.', ...fixed(400, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'wifi-dead-spot-assessment', 'Wi-Fi Dead Spot Assessment', 'Map weak coverage areas and identify causes.', 'Signal measurement and placement or equipment recommendations.', ...fixed(250, '30–90 mins', 'network_install')],
      [categoryId('network-router'), 'access-point-configuration', 'Access Point Configuration', 'Configure a wired or wireless access point.', 'SSID, VLAN/client settings, security, and link verification.', ...fixed(400, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'mesh-wifi-configuration', 'Mesh Wi-Fi Configuration', 'Set up and tune a mesh Wi-Fi system.', 'Node placement, SSID, backhaul, roaming, and coverage testing.', ...fixed(500, '2–4 hours', 'network_install')],
      [categoryId('network-router'), 'lan-configuration', 'LAN Configuration', 'Configure local network addressing and sharing.', 'Router, switch, DHCP, static IP, and connected-device setup.', ...fixed(500, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'basic-home-network-setup', 'Basic Home Network Setup', 'Configure a small home network.', 'Router, devices, Wi-Fi, wired links, and basic security.', ...fixed(800, '2–5 hours', 'network_install')],
      [categoryId('network-router'), 'small-office-network-setup', 'Small Office Network Setup', 'Set up a reliable office network.', 'Router, switch, wired devices, wireless access, and basic network sharing.', ...fixed(1500, '4–8 hours', 'network_install')],
      [categoryId('network-router'), 'network-switch-configuration', 'Network Switch Configuration', 'Configure managed or unmanaged network switching.', 'Port, uplink, VLAN, and basic switch settings as supported.', ...fixed(400, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'device-network-configuration', 'Device Network Configuration', 'Configure one device for wired or wireless network use.', 'Network profile, IP settings, credentials, and connectivity test.', ...fixed(100, '30–60 mins/device', 'network_install')],
      [categoryId('network-router'), 'ip-address-configuration', 'IP Address Configuration', 'Configure static or DHCP network addresses.', 'Host addressing, gateway, DNS, and reachability verification.', ...fixed(200, '30–90 mins', 'network_install')],
      [categoryId('network-router'), 'network-printer-sharing', 'Network Printer Sharing', 'Connect and share a printer over the network.', 'Printer discovery, drivers, sharing, and test print.', ...fixed(350, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'file-folder-network-sharing', 'File and Folder Network Sharing', 'Set up controlled local file and folder sharing.', 'Access groups, permissions, mapped folders, and verification.', ...fixed(300, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'network-troubleshooting', 'Network Troubleshooting', 'Diagnose router, cable, switch, and device network faults.', 'End-to-end wired and wireless connectivity assessment.', ...fixed(350, '1–3 hours', 'network_install')],
      [categoryId('network-router'), 'network-cable-management', 'Network Cable Management', 'Organize switches, patch leads, racks, and network cables.', 'Bundling, routing, labeling, and improved access.', ...fixed(400, '1–4 hours')],
      [categoryId('network-router'), 'network-maintenance', 'Network Maintenance', 'Inspect and maintain a small network.', 'Device review, firmware, backup settings, cabling, and performance checks.', ...fixed(500, '2–4 hours', 'network_install')],

      [categoryId('mobile-assistance'), 'new-phone-setup', 'New Phone Setup', 'Set up a new Android or iOS phone.', 'Account setup, essentials, privacy, updates, and basic configuration.', ...fixed(250, '1–2 hours')],
      [categoryId('mobile-assistance'), 'phone-data-transfer', 'Data Transfer', 'Move approved data between phones or accounts.', 'Contacts, photos, apps, documents, and settings as supported.', ...fixed(300, '1–3 hours')],
      [categoryId('mobile-assistance'), 'photo-video-backup', 'Photo/Video Backup', 'Back up phone photos and videos to approved storage.', 'Organized copy and verification without unauthorized deletion.', ...fixed(250, '1–3 hours')],
      [categoryId('mobile-assistance'), 'google-account-configuration', 'Google Account Configuration', 'Configure Google account and device services.', 'Sync, backup, security, Play services, and account settings.', ...fixed(200, '30–90 mins')],
      [categoryId('mobile-assistance'), 'apple-account-assistance', 'Apple Account Configuration Assistance', 'Assist with Apple account and iPhone/iPad setup.', 'Apple ID, iCloud, backup, and device settings within official workflows.', ...fixed(200, '30–90 mins')],
      [categoryId('mobile-assistance'), 'phone-app-installation', 'App Installation and Configuration', 'Install and configure approved applications.', 'Application setup and basic permissions review.', ...fixed(150, '30–90 mins')],
      [categoryId('mobile-assistance'), 'phone-software-troubleshooting', 'Phone Software Troubleshooting', 'Diagnose app, update, storage, and sync problems.', 'Non-destructive software diagnosis and correction.', ...fixed(300, '1–3 hours')],
      [categoryId('mobile-assistance'), 'phone-storage-optimization', 'Storage Optimization', 'Free and organize usable phone storage safely.', 'Large-file review, cache/app cleanup, and backup recommendations.', ...fixed(250, '1–2 hours')],
      [categoryId('mobile-assistance'), 'factory-reset-assistance', 'Factory Reset Assistance', 'Guide an authorized factory reset and restore process.', 'Backup confirmation, official reset procedure, and post-reset setup.', ...fixed(250, '1–3 hours')],
      [categoryId('mobile-assistance'), 'official-account-recovery-guidance', 'Official Account Recovery Guidance', 'Guide legitimate recovery through official provider channels.', 'Authorized account owners only; no lock bypass or unauthorized access.', ...fixed(300, '30–90 mins')],
      [categoryId('mobile-assistance'), 'phone-to-pc-transfer', 'Phone-to-PC Data Transfer', 'Transfer approved data from a phone to a computer.', 'Verified cable or wireless transfer and organized storage.', ...fixed(250, '1–2 hours')],
      [categoryId('mobile-assistance'), 'phone-backup-and-restore', 'Phone Backup and Restore', 'Create a backup or restore from an existing backup.', 'Backup integrity review and authorized restore assistance.', ...fixed(350, '1–3 hours')],

      [categoryId('phone-hardware'), 'phone-screen-replacement', 'Screen Replacement', 'Replace a damaged phone display.', 'Labor for compatible parts; screen and replacement parts quoted separately.', ...fixed(500, '2–4 hours')],
      [categoryId('phone-hardware'), 'phone-battery-replacement', 'Battery Replacement', 'Replace a worn or faulty phone battery.', 'Labor for compatible battery; battery and consumables quoted separately.', ...fixed(350, '1–3 hours')],
      [categoryId('phone-hardware'), 'phone-charging-port-replacement', 'Charging Port Replacement', 'Replace a damaged charging or USB-C port.', 'Labor for compatible port; parts and board work quoted separately.', ...fixed(500, '2–4 hours')],
      [categoryId('phone-hardware'), 'phone-speaker-replacement', 'Speaker Replacement', 'Replace a faulty phone speaker.', 'Labor for compatible speaker; part quoted separately.', ...fixed(350, '1–3 hours')],
      [categoryId('phone-hardware'), 'phone-camera-replacement', 'Camera Replacement', 'Replace a faulty front or rear phone camera.', 'Labor for compatible camera; part quoted separately.', ...fixed(350, '1–3 hours')],

      [categoryId('data-storage'), 'basic-data-backup', 'Basic Data Backup', 'Create a verified copy of important files.', 'Selected-folder copy to approved local or external storage.', ...fixed(300, '1–3 hours')],
      [categoryId('data-storage'), 'external-drive-setup', 'External Drive Setup', 'Configure an external backup or storage drive.', 'Partitioning, format, naming, permissions, and test copy.', ...fixed(250, '30–90 mins')],
      [categoryId('data-storage'), 'file-organization', 'File Organization', 'Organize and catalog files and folders.', 'Structure cleanup and plain-language naming recommendations.', ...fixed(300, '1–3 hours')],
      [categoryId('data-storage'), 'storage-migration', 'Storage Migration', 'Move data between drives or storage locations.', 'Copy verification and source/destination health review.', ...fixed(500, '2–6 hours')],
      [categoryId('data-storage'), 'hdd-ssd-health-assessment', 'HDD/SSD Health Assessment', 'Check storage health and SMART indicators.', 'Drive report, warning signs, and backup/replacement guidance.', ...fixed(250, '30–90 mins')],
      [categoryId('data-storage'), 'disk-cloning', 'Disk Cloning', 'Create an exact copy of a disk where supported.', 'Source/destination health check, clone, and verification.', ...fixed(600, '3–6 hours')],
      [categoryId('data-storage'), 'secure-data-wiping', 'Secure Data Wiping', 'Securely erase a storage device before reuse or disposal.', 'Approved wipe method and completion verification.', ...fixed(400, '1–8 hours')],
      [categoryId('data-storage'), 'deleted-file-recovery-assessment', 'Basic Deleted-File Recovery Assessment', 'Assess whether deleted files may be recoverable.', 'Device and file-system review; no destructive write procedure.', ...fixed(300, '1–2 hours')],
      [categoryId('data-storage'), 'logical-data-recovery', 'Logical Data Recovery', 'Attempt non-destructive recovery of accessible lost data.', 'Scope depends on drive health, file system, and damage.', 0, 'custom_quote', 'Quoted after assessment', 'general_service', 0],

      [categoryId('software-development'), 'simple-one-page-website', 'Simple One-Page Website', 'A concise, responsive one-page website.', 'Scope, design, deployment, and handoff quoted by requirements.', ...fixed(3000, '5–10 days', 'website_dev')],
      [categoryId('software-development'), 'personal-portfolio-website', 'Personal Portfolio Website', 'A responsive portfolio website for individual work.', 'Pages, content integration, and deployment within agreed scope.', ...fixed(2500, '5–10 days', 'website_dev')],
      [categoryId('software-development'), 'small-business-website', 'Small Business Website', 'A professional responsive business website.', 'Page design, content areas, forms, and deployment scope agreed first.', ...fixed(4000, '7–14 days', 'website_dev')],
      [categoryId('software-development'), 'multi-page-website', 'Multi-Page Website', 'A complete multi-page responsive website.', 'Structured pages, navigation, content integration, and deployment.', ...fixed(6000, '10–21 days', 'website_dev')],
      [categoryId('software-development'), 'website-inquiry-form', 'Website with Inquiry Form', 'A responsive website with a working inquiry form.', 'Form validation, delivery setup, spam protection, and integration.', ...fixed(5000, '7–14 days', 'website_dev')],
      [categoryId('software-development'), 'website-maintenance', 'Website Maintenance', 'Monthly website checks and maintenance.', 'Updates, backup checks, content edits, and basic monitoring within scope.', 500, 'monthly', 'Ongoing monthly', 'website_dev', 0],
      [categoryId('software-development'), 'website-bug-fixing', 'Website Bug Fixing', 'Diagnose and repair identified website issues.', 'Scoped bug fix and verification after reproduction.', ...fixed(500, '1–5 days', 'website_dev')],
      [categoryId('software-development'), 'domain-hosting-configuration', 'Domain/Hosting Configuration', 'Configure domain and hosting services.', 'DNS, SSL, hosting connection, email routing, or deployment setup.', ...fixed(500, '1–3 days', 'website_dev')],
      [categoryId('software-development'), 'python-automation-script', 'Python Automation Script', 'A custom Python script for repetitive tasks.', 'Requirements, implementation, testing, documentation, and handoff.', ...fixed(1000, '3–10 days', 'website_dev')],
      [categoryId('software-development'), 'excel-csv-automation', 'Excel/CSV Automation', 'Automate spreadsheet or CSV processing.', 'Cleaning, transformation, reporting, or repeatable workflow script.', ...fixed(800, '3–10 days', 'website_dev')],
      [categoryId('software-development'), 'automated-pdf-report-generation', 'Automated PDF Report Generation', 'Generate structured PDF reports automatically.', 'Template, data source, PDF generation, and output verification.', ...fixed(1000, '3–10 days', 'website_dev')],
      [categoryId('software-development'), 'data-cleaning-processing', 'Data Cleaning and Processing', 'Clean, normalize, and process structured data.', 'Duplicate removal, validation, transformation, and export.', ...fixed(500, '2–7 days', 'website_dev')],
      [categoryId('software-development'), 'database-setup', 'Database Setup', 'Set up a structured database for a new system.', 'Schema, constraints, seed data, access, and backup workflow.', ...fixed(1000, '3–10 days', 'website_dev')],
      [categoryId('software-development'), 'simple-crud-app', 'Simple CRUD Application', 'Create a basic create, read, update, and delete application.', 'Core records, validation, interface, and deployment scope.', ...fixed(4000, '10–21 days', 'website_dev')],
      [categoryId('software-development'), 'inventory-management-app', 'Inventory Management Application', 'Build inventory and stock tracking software.', 'Items, stock movements, reporting, users, and agreed integrations.', ...fixed(6000, '14–30 days', 'website_dev')],
      [categoryId('software-development'), 'custom-dashboard', 'Custom Dashboard', 'Build a custom operational data dashboard.', 'Charts, tables, filters, data source integration, and deployment.', ...fixed(3000, '7–21 days', 'website_dev')],
      [categoryId('software-development'), 'api-integration', 'API Integration', 'Integrate one or more APIs into a website or application.', 'Authentication, endpoints, mapping, error handling, and testing.', ...fixed(1500, '3–14 days', 'website_dev')],
      [categoryId('software-development'), 'custom-software-app', 'Custom Software Application', 'Build a software application tailored to your workflow.', 'Requirements and scope quoted after discovery.', 0, 'custom_quote', 'Quoted after scoping', 'website_dev', 0],

      [categoryId('additional-services'), 'remote-assistance-30', 'Remote Assistance, Up to 30 Minutes', 'Guided remote troubleshooting session.', 'Available subject to stable Internet access and customer authorization.', ...fixed(250, 'Up to 30 mins')],
      [categoryId('additional-services'), 'remote-assistance-60', 'Remote Assistance, Up to 1 Hour', 'One-hour guided remote support session.', 'Available subject to stable Internet access and customer authorization.', ...fixed(450, 'Up to 60 mins')],
      [categoryId('additional-services'), 'on-site-service-callout', 'On-site Service Callout', 'Travel and initial on-site service visit.', 'Actual location, access, and service scope confirmed before dispatch.', ...fixed(350, 'Scheduled')],
      [categoryId('additional-services'), 'additional-on-site-hour', 'Additional On-Site Hour', 'Extra labor during an approved on-site visit.', 'Added beyond the initial service-call allocation.', ...fixed(250, 'Up to 60 mins')],
      [categoryId('additional-services'), 'urgent-same-day-service', 'Urgent Same-Day Service', 'Priority scheduling for same-day availability.', 'Subject to availability; this is a 20% surcharge.', 0, 'custom_quote', 'Subject to availability', 'general_service', 0],
      [categoryId('additional-services'), 'after-hours-service', 'After-Hours Service', 'Service outside standard business hours.', 'Subject to availability; this is a 25% surcharge.', 0, 'custom_quote', 'Subject to availability', 'general_service', 0],
      [categoryId('additional-services'), 'device-pickup-delivery', 'Device Pickup / Delivery', 'Arrange pickup or delivery of customer devices.', 'Actual transport cost is confirmed based on distance and route.', 0, 'custom_quote', 'By arrangement', 'general_service', 0],
      [categoryId('additional-services'), 'additional-device-same-visit', 'Additional Device, Same Visit', 'Add another device to an on-site service visit.', 'Applies to a compatible additional device handled on the same visit.', ...fixed(150, 'Same visit')],

      [categoryId('service-packages'), 'pagawaan-pc-rescue', 'Pagawaan PC Rescue', 'Basic diagnostics, software troubleshooting, startup optimization, and basic assessment.', 'For one computer with standard software issues; no parts included.', 599, 'fixed_starting', 'Est. 2–4 hours', 'pc_troubleshooting', 1],
      [categoryId('service-packages'), 'pagawaan-pc-refresh', 'Pagawaan PC Refresh', 'Desktop cleaning, software cleanup, startup optimization, and temperature inspection.', 'Thermal paste and replacement materials are quoted separately.', 999, 'fixed_starting', 'Est. 2–4 hours', 'general_service', 1],
      [categoryId('service-packages'), 'pagawaan-network-ready', 'Pagawaan Network Ready', 'Router configuration, one custom Ethernet cable up to 5m, testing, and one device connection.', 'Subject to existing equipment and cable routing conditions.', 899, 'fixed_starting', 'Est. 2–4 hours', 'network_install', 1],
      [categoryId('service-packages'), 'pagawaan-office-essentials', 'Pagawaan Office Essentials', 'Router setup, printer sharing, up to three device configurations, and basic network testing.', 'Existing equipment and network infrastructure are required.', 1999, 'fixed_starting', 'Est. 3–6 hours', 'network_install', 1],
    ];

    for (const row of services) upsertService.run(...row);
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
         queue_status as queueStatus,
         queue_done_at as queueDoneAt,
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

export function listPublicQueueItems(): PublicQueueItem[] {
  const rows = sqlite
    .prepare(
      `SELECT
         r.reference_number as referenceNumber,
         r.queue_status as queueStatus,
         r.created_at as createdAt,
         s.name as serviceName
       FROM service_requests r
       JOIN service_request_items i ON i.request_id = r.id
       JOIN services s ON s.id = i.service_id
       WHERE r.status != 'Cancelled'
         AND (
           r.queue_status != 'Done'
           OR r.queue_done_at >= datetime('now', '-30 minutes')
         )
       ORDER BY r.created_at ASC, i.id ASC`
    )
    .all() as Array<{
    referenceNumber: string;
    queueStatus: QueueStatus;
    createdAt: string;
    serviceName: string;
  }>;

  const items = new Map<string, PublicQueueItem>();
  for (const row of rows) {
    const item = items.get(row.referenceNumber);
    if (item) {
      if (!item.serviceNames.includes(row.serviceName)) {
        item.serviceNames.push(row.serviceName);
      }
    } else {
      items.set(row.referenceNumber, {
        referenceNumber: row.referenceNumber,
        queueStatus: row.queueStatus,
        createdAt: row.createdAt,
        serviceNames: [row.serviceName],
      });
    }
  }
  return [...items.values()];
}

export function updateRequestStatus(id: number, status: RequestStatus): ServiceRequestRecord | null {
  const result = sqlite
    .prepare(
      `UPDATE service_requests
       SET status = ?,
           queue_status = CASE WHEN ? = 'Cancelled' THEN 'Done' ELSE queue_status END,
           queue_done_at = CASE WHEN ? = 'Cancelled' THEN datetime('now') ELSE queue_done_at END
       WHERE id = ?`
    )
    .run(status, status, status, id);
  if (result.changes === 0) return null;
  return getServiceRequestById(id);
}

export function listMarketplaceListings(): MarketplaceListing[] {
  const rows = sqlite
    .prepare(
      `SELECT id, title, category, description, price, condition, location, images, status,
              created_at as createdAt
       FROM marketplace_listings
       ORDER BY created_at DESC, id DESC`
    )
    .all() as Array<Omit<MarketplaceListing, 'images'> & { images: string }>;

  return rows.map((row) => ({
    ...row,
    images: safeParseStringArray(row.images),
  }));
}

export function createMarketplaceListing(input: {
  title: string;
  category: string;
  description: string;
  price: number;
  condition: MarketplaceCondition;
  location: string;
  images: string[];
}): MarketplaceListing {
  const result = sqlite
    .prepare(
      `INSERT INTO marketplace_listings
        (title, category, description, price, condition, location, images)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.title.trim(),
      input.category,
      input.description.trim(),
      input.price,
      input.condition,
      input.location.trim(),
      JSON.stringify(input.images)
    );
  const listing = sqlite
    .prepare(
      `SELECT id, title, category, description, price, condition, location, images, status,
              created_at as createdAt
       FROM marketplace_listings WHERE id = ?`
    )
    .get(Number(result.lastInsertRowid)) as Omit<MarketplaceListing, 'images'> & {
    images: string;
  };
  return { ...listing, images: safeParseStringArray(listing.images) };
}

export function updateMarketplaceListingStatus(
  id: number,
  status: MarketplaceListing['status']
): MarketplaceListing | null {
  const result = sqlite
    .prepare('UPDATE marketplace_listings SET status = ? WHERE id = ?')
    .run(status, id);
  if (result.changes === 0) return null;
  const listing = sqlite
    .prepare(
      `SELECT id, title, category, description, price, condition, location, images, status,
              created_at as createdAt
       FROM marketplace_listings WHERE id = ?`
    )
    .get(id) as Omit<MarketplaceListing, 'images'> & { images: string };
  return { ...listing, images: safeParseStringArray(listing.images) };
}

export function updateRequestQueueStatus(
  id: number,
  queueStatus: QueueStatus
): ServiceRequestRecord | null {
  const result = sqlite
    .prepare(
      `UPDATE service_requests
       SET queue_status = ?,
           queue_done_at = CASE WHEN ? = 'Done' THEN datetime('now') ELSE NULL END
       WHERE id = ?`
    )
    .run(queueStatus, queueStatus, id);
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

function safeParseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')
      ? parsed
      : [];
  } catch {
    return [];
  }
}
