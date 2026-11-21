-- Pagawaan PostgreSQL / Supabase Migration Schema
-- Mirrors the relational data model enforced by the Pagawaan application.

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

CREATE SEQUENCE IF NOT EXISTS public.pagawaan_request_seq START 1;

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
  queue_status TEXT NOT NULL DEFAULT 'In Queue' CHECK (
    queue_status IN ('In Queue', 'Working on It', 'Done')
  ),
  queue_done_at TIMESTAMPTZ,
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

-- Row Level Security Policies
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;

-- Public read access to active catalog & settings
CREATE POLICY "Public read active categories" ON public.service_categories
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read active services" ON public.services
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read workshop settings" ON public.workshop_settings
  FOR SELECT USING (TRUE);

-- Admin-only full management via admin_users table
CREATE POLICY "Admins manage categories" ON public.service_categories
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.auth_user_id = auth.uid()));

CREATE POLICY "Admins manage services" ON public.services
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.auth_user_id = auth.uid()));

CREATE POLICY "Admins manage requests" ON public.service_requests
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.auth_user_id = auth.uid()));

CREATE POLICY "Admins manage request items" ON public.service_request_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.auth_user_id = auth.uid()));

CREATE POLICY "Admins manage internal notes" ON public.request_internal_notes
  FOR ALL USING (EXISTS (SELECT 1 FROM public.admin_users a WHERE a.auth_user_id = auth.uid()));
