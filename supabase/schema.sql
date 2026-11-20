-- Pagawaan Supabase PostgreSQL bootstrap
-- Paste this entire file into the Supabase SQL Editor and run it once.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.service_categories (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.services (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
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
  supports_quantity BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_requests (
  id BIGSERIAL PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  email TEXT,
  location TEXT NOT NULL,
  service_method TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  additional_notes TEXT,
  estimated_total INTEGER,
  has_custom_quote_items BOOLEAN NOT NULL DEFAULT FALSE,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_request_items (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 50),
  configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_price INTEGER
);

CREATE TABLE IF NOT EXISTS public.request_internal_notes (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'technician')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workshop_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_items_request_id ON public.service_request_items(request_id);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active categories" ON public.service_categories;
CREATE POLICY "Public read active categories" ON public.service_categories
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services" ON public.services
  FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Public read workshop settings" ON public.workshop_settings;
CREATE POLICY "Public read workshop settings" ON public.workshop_settings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admins manage categories" ON public.service_categories;
CREATE POLICY "Admins manage categories" ON public.service_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage services" ON public.services;
CREATE POLICY "Admins manage services" ON public.services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage requests" ON public.service_requests;
CREATE POLICY "Admins manage requests" ON public.service_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage request items" ON public.service_request_items;
CREATE POLICY "Admins manage request items" ON public.service_request_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage internal notes" ON public.request_internal_notes;
CREATE POLICY "Admins manage internal notes" ON public.request_internal_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage settings" ON public.workshop_settings;
CREATE POLICY "Admins manage settings" ON public.workshop_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users a
      WHERE a.auth_user_id = auth.uid()
    )
  );

INSERT INTO public.service_categories (slug, name, description, sort_order, is_active)
VALUES
  ('computer-laptop', 'Computer & Laptop Services', 'Hardware diagnostics, OS recovery, thermal maintenance, and component upgrades.', 1, TRUE),
  ('networking-ethernet', 'Networking & Ethernet', 'Custom RJ45 termination, structured cabling, testing, and LAN configuration.', 2, TRUE),
  ('mobile-assistance', 'Mobile Device Assistance', 'Legitimate device setup, data migration, backup hygiene, and official account help.', 3, TRUE),
  ('software-development', 'Software Development', 'Python automation, custom web applications, databases, and site maintenance.', 4, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.services
  (category_id, slug, name, description, details, starting_price, pricing_type, turnaround_estimate, configurator_type, supports_quantity, is_active)
VALUES
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'basic-diagnostics', 'Basic Diagnostics', 'Structured hardware and software fault isolation for desktops and laptops.', 'Includes POST check, drive SMART health check, thermal reading, and a fault report before any repair proceeds.', 150, 'fixed_starting', 'Est. 1–2 hours', 'pc_troubleshooting', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'pc-software-troubleshooting', 'Software Troubleshooting', 'Resolve OS boot errors, driver conflicts, crashing apps, and startup issues.', 'Targeted troubleshooting of Windows or Linux environment issues, corrupted registries, or driver mismatches.', 250, 'fixed_starting', 'Est. 2–4 hours', 'pc_troubleshooting', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'pc-optimization', 'PC Optimization', 'Clean startup bloat, tune power profiles, verify storage health, and tidy updates.', 'Improves responsiveness without risky registry cleaners or data loss.', 350, 'fixed_starting', 'Est. 2–3 hours', 'pc_troubleshooting', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'windows-installation', 'Windows Installation', 'Clean OS installation, chipset drivers, essential utilities, and partition setup.', 'Optional pre-install personal file backup available; user supplies or uses an existing valid license.', 500, 'fixed_starting', 'Est. 2–4 hours', 'windows_install', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'ram-ssd-installation', 'RAM / SSD Installation', 'Careful physical installation of customer-supplied or sourced RAM and NVMe/SATA drives.', 'Labor starting rate; hardware parts are quoted separately if sourced by Pagawaan.', 200, 'fixed_starting', 'Est. 45–90 mins', 'general_service', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'laptop-cleaning', 'Laptop Cleaning', 'Internal dust extraction from fans, heatsink fins, chassis vents, and keyboard.', 'Reduces thermal throttling and fan noise using ESD-safe brushes and precision tools.', 350, 'fixed_starting', 'Est. 1–2 hours', 'general_service', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'computer-laptop'), 'thermal-paste-replacement', 'Thermal Paste Replacement', 'Heatsink cleaning and fresh application of high-conductivity thermal compound.', 'Recommended for laptops running hot under load or with dried factory paste.', 350, 'fixed_starting', 'Est. 1–2 hours', 'general_service', TRUE, TRUE),

  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'rj45-termination-one-end', 'RJ45 Termination — One End', 'Precision re-crimp of a damaged or broken RJ45 modular plug on one cable end.', 'Wired to T568B and verified with an 8-wire continuity tester.', 50, 'per_unit', 'Est. 15–30 mins', 'rj45_repair', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'rj45-termination-both-ends', 'RJ45 Termination — Both Ends', 'Fresh RJ45 plugs crimped on both ends of an existing Cat5e or Cat6 cable.', 'Ideal for shortening excess cable slack or replacing worn plugs.', 100, 'per_unit', 'Est. 20–40 mins', 'rj45_repair', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'custom-ethernet-cable', 'Custom Ethernet Cable', 'Made-to-length Cat5e or Cat6 patch cable with tested RJ45 connectors.', 'Estimate scales with cable category, meter length, connector boot, and quantity.', 100, 'cable_formula', 'Est. same day / next day', 'custom_cable', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'ethernet-cable-testing', 'Ethernet Cable Testing', 'Pin-by-pin wiremap verification for shorts, opens, split pairs, or crossed wires.', 'Diagnoses intermittent link drops before unnecessary cable replacement.', 50, 'per_unit', 'Est. 15 mins', 'rj45_repair', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'router-configuration', 'Router Configuration', 'SSID setup, WPA2/WPA3 hardening, DNS tuning, guest network, and firmware check.', 'Tailored for home offices, studios, or secondary access point setups.', 300, 'fixed_starting', 'Est. 1–2 hours', 'network_install', FALSE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'basic-lan-setup', 'Basic LAN Setup', 'Interconnect router, switch, and wired workstations for reliable local sharing.', 'Covers port patching, static LAN IPs for printers/NAS, and link verification.', 500, 'fixed_starting', 'Est. 2–4 hours', 'network_install', FALSE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'networking-ethernet'), 'ethernet-installation', 'Ethernet Installation', 'Structured multi-room cable routing, surface trunking, and wall termination.', 'Quoted after assessing room count, run length, and mounting conditions.', 0, 'custom_quote', 'Quoted after survey', 'network_install', FALSE, TRUE),

  ((SELECT id FROM public.service_categories WHERE slug = 'mobile-assistance'), 'phone-setup', 'Phone Setup', 'Clean initial setup, essential app installation, storage organization, and settings review.', 'Tailored for new devices, family handsets, or work-ready profiles.', 200, 'fixed_starting', 'Est. 1–2 hours', 'general_service', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'mobile-assistance'), 'data-transfer', 'Data Transfer', 'Guided migration of photos, contacts, documents, and messages between devices.', 'Handled securely with verification before wiping or trading in the source device.', 200, 'fixed_starting', 'Est. 1–3 hours', 'general_service', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'mobile-assistance'), 'backup-assistance', 'Backup Assistance', 'Configure cloud or local encrypted backups so important photos and files stay safe.', 'Includes a walkthrough so the owner knows how to verify and restore backups.', 200, 'fixed_starting', 'Est. 1–2 hours', 'general_service', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'mobile-assistance'), 'mobile-software-troubleshooting', 'Software Troubleshooting', 'Fix storage bloat, misbehaving apps, sync errors, and update failures.', 'Software-level diagnostics without destructive resets unless requested.', 250, 'fixed_starting', 'Est. 1–2 hours', 'general_service', TRUE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'mobile-assistance'), 'official-account-recovery', 'Official Account Recovery Assistance', 'Legitimate guided recovery through official Google, Apple, or Microsoft channels.', 'Authorized owners only. Pagawaan never performs unauthorized security bypassing.', 0, 'custom_quote', 'Depends on provider review', 'general_service', FALSE, TRUE),

  ((SELECT id FROM public.service_categories WHERE slug = 'software-development'), 'python-automation', 'Python Automation', 'Custom scripts for spreadsheet cleanup, file sorting, data parsing, or routine reports.', 'Eliminates repetitive manual tasks with documented, maintainable scripts.', 500, 'fixed_starting', 'Est. 2–5 days', 'website_dev', FALSE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'software-development'), 'website-development', 'Website Development', 'Custom-designed, fast, responsive websites built without bloated templates.', 'Ideal for local businesses, portfolios, booking forms, and product catalogs.', 1500, 'fixed_starting', 'Est. 5–14 days', 'website_dev', FALSE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'software-development'), 'database-setup', 'Database Setup', 'Clean relational PostgreSQL or SQLite schema design, constraints, and backups.', 'Built for inventory ledgers, appointment logs, and structured business records.', 800, 'fixed_starting', 'Est. 2–4 days', 'website_dev', FALSE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'software-development'), 'custom-software', 'Custom Software', 'Bespoke internal dashboards, quotation tools, or hardware-connected web utilities.', 'Scoped collaboratively around the exact operational workflow.', 0, 'custom_quote', 'Quoted after scoping', 'website_dev', FALSE, TRUE),
  ((SELECT id FROM public.service_categories WHERE slug = 'software-development'), 'website-maintenance', 'Website Maintenance', 'Monthly uptime checks, dependency patches, content edits, and backup verification.', 'Ongoing retainer; scope agreed before activation.', 500, 'monthly', 'Ongoing monthly', 'website_dev', FALSE, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.workshop_settings (key, value)
VALUES (
  'contact_config',
  '{
    "brandName": "Pagawaan",
    "tagline": "Built, fixed, connected.",
    "serviceLocation": "Metro Manila, Philippines (Quezon City / Makati / Pasig / Manila / Taguig)",
    "coveredCities": ["Quezon City","Manila","Makati","Pasig","Mandaluyong","San Juan","Taguig","Marikina","Parañaque","Caloocan"],
    "email": "workshop@pagawaan.ph",
    "contactNumber": "+63 917 000 0000 (Configurable)",
    "businessHours": "Monday – Saturday, 10:00 AM – 7:00 PM PHT (By Arrangement)",
    "facebookUrl": "https://facebook.com/pagawaan.workshop",
    "messengerUrl": "https://m.me/pagawaan.workshop",
    "whatsappUrl": "https://wa.me/639170000000",
    "availabilityDisclaimer": "Service schedules, on-site visits, and parts procurement are subject to technician availability and confirmation after request review.",
    "pricingDisclaimer": "Listed PHP figures are introductory estimates only. Final quotations depend on diagnostic assessment, complexity, cable length, parts, and travel requirements."
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
