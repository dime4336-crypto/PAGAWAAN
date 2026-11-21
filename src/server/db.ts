import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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

let supabase: SupabaseClient | undefined;

function getSupabase(): SupabaseClient {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }

  supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabase;
}

function throwOnSupabaseError(error: { message: string } | null, operation: string): void {
  if (error) {
    throw new Error(`Supabase ${operation} failed: ${error.message}`);
  }
}

function mapCategory(row: {
  id: number;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
}): ServiceCategory {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function mapService(
  row: {
    id: number;
    category_id: number;
    slug: string;
    name: string;
    description: string;
    details: string;
    starting_price: number;
    pricing_type: ServiceItem['pricingType'];
    turnaround_estimate: string;
    configurator_type: ServiceItem['configuratorType'];
    supports_quantity: boolean;
    is_active: boolean;
  },
  category: ServiceCategory
): ServiceItem {
  return {
    id: Number(row.id),
    categoryId: Number(row.category_id),
    categorySlug: category.slug,
    categoryName: category.name,
    slug: row.slug,
    name: row.name,
    description: row.description,
    details: row.details,
    startingPrice: row.starting_price,
    pricingType: row.pricing_type,
    turnaroundEstimate: row.turnaround_estimate,
    configuratorType: row.configurator_type,
    supportsQuantity: row.supports_quantity,
    isActive: row.is_active,
  };
}

async function loadCatalog(includeInactive: boolean): Promise<{
  categories: ServiceCategory[];
  services: ServiceItem[];
}> {
  const client = getSupabase();
  let categoriesQuery = client
    .from('service_categories')
    .select('id, slug, name, description, sort_order, is_active')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  let servicesQuery = client
    .from('services')
    .select(
      'id, category_id, slug, name, description, details, starting_price, pricing_type, turnaround_estimate, configurator_type, supports_quantity, is_active'
    )
    .order('id', { ascending: true });

  if (!includeInactive) {
    categoriesQuery = categoriesQuery.eq('is_active', true);
    servicesQuery = servicesQuery.eq('is_active', true);
  }

  const [categoryResult, serviceResult] = await Promise.all([
    categoriesQuery,
    servicesQuery,
  ]);
  throwOnSupabaseError(categoryResult.error, 'loading service categories');
  throwOnSupabaseError(serviceResult.error, 'loading services');

  const categories = (categoryResult.data ?? []).map(mapCategory);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const services: ServiceItem[] = [];
  for (const row of serviceResult.data ?? []) {
    const category = categoriesById.get(Number(row.category_id));
    if (!category) {
      throw new Error(`Supabase service ${row.id} references a missing category.`);
    }
    if (!includeInactive && !category.isActive) continue;
    services.push(mapService(row, category));
  }

  return { categories, services };
}

export async function initializeDatabase(): Promise<void> {
  const requiredTables = [
    ['service_categories', 'id'],
    ['services', 'id'],
    ['service_requests', 'id'],
    ['service_request_items', 'id'],
    ['request_internal_notes', 'id'],
    ['workshop_settings', 'key'],
    ['marketplace_listings', 'id'],
  ] as const;

  for (const [table, column] of requiredTables) {
    const { error } = await getSupabase().from(table).select(column).limit(1);
    throwOnSupabaseError(error, `checking ${table} table`);
  }
}

export function getPublicCatalog(): Promise<{
  categories: ServiceCategory[];
  services: ServiceItem[];
}> {
  return loadCatalog(false);
}

export function getAdminCatalog(): Promise<{
  categories: ServiceCategory[];
  services: ServiceItem[];
}> {
  return loadCatalog(true);
}

export async function getWorkshopConfig(): Promise<WorkshopContactConfig> {
  const { data, error } = await getSupabase()
    .from('workshop_settings')
    .select('value')
    .eq('key', 'contact_config')
    .maybeSingle();
  throwOnSupabaseError(error, 'loading workshop configuration');

  if (!data) return DEFAULT_WORKSHOP_CONFIG;
  if (typeof data.value !== 'object' || data.value === null || Array.isArray(data.value)) {
    throw new Error('Supabase contact_config must contain a JSON object.');
  }
  return { ...DEFAULT_WORKSHOP_CONFIG, ...data.value } as WorkshopContactConfig;
}

export async function updateWorkshopConfig(
  config: Partial<WorkshopContactConfig>
): Promise<WorkshopContactConfig> {
  const current = await getWorkshopConfig();
  const next = { ...current, ...config };
  const { error } = await getSupabase()
    .from('workshop_settings')
    .upsert(
      { key: 'contact_config', value: next, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  throwOnSupabaseError(error, 'saving workshop configuration');
  return next;
}

export async function createServiceRequest(input: {
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
}): Promise<ServiceRequestRecord> {
  const serviceIds = [...new Set(input.items.map((item) => item.serviceId))];
  const { data: serviceRows, error } = await getSupabase()
    .from('services')
    .select('id, slug, name, starting_price, pricing_type, is_active')
    .in('id', serviceIds);
  throwOnSupabaseError(error, 'validating requested services');

  const servicesById = new Map(
    (serviceRows ?? []).map((service) => [Number(service.id), service])
  );
  let estimatedTotal = 0;
  let hasCustomQuoteItems = false;
  const resolvedItems = input.items.map((item) => {
    const service = servicesById.get(item.serviceId);
    if (!service || !service.is_active) {
      throw new Error(`Requested service ID ${item.serviceId} is unavailable.`);
    }

    const estimatedPrice = calculateAuthoritativeItemEstimate({
      slug: service.slug,
      pricingType: service.pricing_type,
      startingPrice: service.starting_price,
      quantity: item.quantity,
      configuration: item.configuration,
    });
    if (estimatedPrice === null) {
      hasCustomQuoteItems = true;
    } else {
      estimatedTotal += estimatedPrice;
    }

    return {
      service_id: Number(service.id),
      quantity: item.quantity,
      configuration: item.configuration,
      estimated_price: estimatedPrice,
    };
  });

  const { data: requestId, error: createError } = await getSupabase().rpc(
    'create_service_request_with_items',
    {
      p_customer_name: input.customerName,
      p_contact_number: input.contactNumber,
      p_email: input.email || null,
      p_location: input.location,
      p_service_method: input.serviceMethod,
      p_preferred_date: input.preferredDate,
      p_additional_notes: input.additionalNotes || null,
      p_estimated_total: estimatedTotal,
      p_has_custom_quote_items: hasCustomQuoteItems,
      p_items: resolvedItems,
    }
  );
  throwOnSupabaseError(createError, 'creating service request');
  if (requestId === null || requestId === undefined) {
    throw new Error('Supabase did not return the created service request ID.');
  }

  const created = await getServiceRequestById(Number(requestId));
  if (!created) throw new Error('Failed to load created service request.');
  return created;
}

export async function getServiceRequestById(
  id: number
): Promise<ServiceRequestRecord | null> {
  const client = getSupabase();
  const { data: row, error } = await client
    .from('service_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  throwOnSupabaseError(error, 'loading service request');
  if (!row) return null;

  const [itemsResult, notesResult] = await Promise.all([
    client
      .from('service_request_items')
      .select('id, service_id, quantity, configuration, estimated_price, services(name, slug)')
      .eq('request_id', id)
      .order('id', { ascending: true }),
    client
      .from('request_internal_notes')
      .select('id, request_id, note, created_at')
      .eq('request_id', id)
      .order('id', { ascending: false }),
  ]);
  throwOnSupabaseError(itemsResult.error, 'loading service request items');
  throwOnSupabaseError(notesResult.error, 'loading service request notes');

  type ItemRow = {
    id: number;
    service_id: number;
    quantity: number;
    configuration: Record<string, unknown> | string;
    estimated_price: number | null;
    services: { name: string; slug: string } | Array<{ name: string; slug: string }> | null;
  };
  const items = (itemsResult.data ?? []) as ItemRow[];
  const notes = notesResult.data ?? [];

  return {
    id: Number(row.id),
    referenceNumber: row.reference_number,
    customerName: row.customer_name,
    contactNumber: row.contact_number,
    email: row.email,
    location: row.location,
    serviceMethod: row.service_method,
    preferredDate: row.preferred_date,
    additionalNotes: row.additional_notes,
    estimatedTotal: row.estimated_total,
    hasCustomQuoteItems: Boolean(row.has_custom_quote_items),
    status: row.status,
    queueStatus: row.queue_status,
    queueDoneAt: row.queue_done_at,
    createdAt: row.created_at,
    items: items.map((item) => {
      const service = Array.isArray(item.services) ? item.services[0] : item.services;
      if (!service) {
        throw new Error(`Supabase request item ${item.id} references a missing service.`);
      }
      return {
        id: Number(item.id),
        serviceId: Number(item.service_id),
        serviceName: service.name,
        serviceSlug: service.slug,
        quantity: item.quantity,
        configuration: parseJsonRecord(item.configuration),
        estimatedPrice: item.estimated_price,
      };
    }),
    internalNotes: notes.map((note) => ({
      id: Number(note.id),
      requestId: Number(note.request_id),
      note: note.note,
      createdAt: note.created_at,
    })),
  };
}

export async function listAllServiceRequests(): Promise<ServiceRequestRecord[]> {
  const { data, error } = await getSupabase()
    .from('service_requests')
    .select('id')
    .order('id', { ascending: false });
  throwOnSupabaseError(error, 'listing service requests');

  const requests = await Promise.all(
    (data ?? []).map((row) => getServiceRequestById(Number(row.id)))
  );
  return requests.filter((request): request is ServiceRequestRecord => request !== null);
}

export async function listPublicQueueItems(): Promise<PublicQueueItem[]> {
  const { data, error } = await getSupabase()
    .from('service_requests')
    .select(
      'reference_number, queue_status, queue_done_at, created_at, status, service_request_items(services(name))'
    )
    .neq('status', 'Cancelled')
    .order('created_at', { ascending: true });
  throwOnSupabaseError(error, 'loading public service queue');

  type QueueRow = {
    reference_number: string;
    queue_status: QueueStatus;
    queue_done_at: string | null;
    created_at: string;
    status: RequestStatus;
    service_request_items: Array<{
      services: { name: string } | Array<{ name: string }> | null;
    }>;
  };
  const cutoff = Date.now() - 30 * 60 * 1000;
  const items = new Map<string, PublicQueueItem>();

  for (const row of (data ?? []) as QueueRow[]) {
    if (
      row.queue_status === 'Done' &&
      (!row.queue_done_at || Date.parse(row.queue_done_at) < cutoff)
    ) {
      continue;
    }
    const serviceNames = row.service_request_items
      .map((item) => {
        const service = Array.isArray(item.services) ? item.services[0] : item.services;
        return service?.name;
      })
      .filter((name): name is string => Boolean(name));
    const existing = items.get(row.reference_number);
    if (existing) {
      for (const name of serviceNames) {
        if (!existing.serviceNames.includes(name)) existing.serviceNames.push(name);
      }
    } else {
      items.set(row.reference_number, {
        referenceNumber: row.reference_number,
        queueStatus: row.queue_status,
        createdAt: row.created_at,
        serviceNames: [...new Set(serviceNames)],
      });
    }
  }
  return [...items.values()];
}

const MARKETPLACE_COLUMNS =
  'id, title, category, description, price, condition, location, images, status, created_at';

function mapListing(row: {
  id: number;
  title: string;
  category: string;
  description: string;
  price: number;
  condition: MarketplaceCondition;
  location: string;
  images: unknown;
  status: MarketplaceListing['status'];
  created_at: string;
}): MarketplaceListing {
  const images = row.images ?? [];
  if (!Array.isArray(images) || !images.every((image) => typeof image === 'string')) {
    throw new Error(`Supabase marketplace listing ${row.id} has invalid images data.`);
  }
  return {
    id: Number(row.id),
    title: row.title,
    category: row.category,
    description: row.description,
    price: row.price,
    condition: row.condition,
    location: row.location,
    images,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function listMarketplaceListings(): Promise<MarketplaceListing[]> {
  const { data, error } = await getSupabase()
    .from('marketplace_listings')
    .select(MARKETPLACE_COLUMNS)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  throwOnSupabaseError(error, 'listing marketplace items');
  return (data ?? []).map(mapListing);
}

export async function createMarketplaceListing(input: {
  title: string;
  category: string;
  description: string;
  price: number;
  condition: MarketplaceCondition;
  location: string;
  images: string[];
}): Promise<MarketplaceListing> {
  const { data, error } = await getSupabase()
    .from('marketplace_listings')
    .insert({
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      price: input.price,
      condition: input.condition,
      location: input.location.trim(),
      images: input.images,
    })
    .select(MARKETPLACE_COLUMNS)
    .single();
  throwOnSupabaseError(error, 'creating marketplace listing');
  if (!data) throw new Error('Supabase did not return the created marketplace listing.');
  return mapListing(data);
}

export async function updateMarketplaceListingStatus(
  id: number,
  status: MarketplaceListing['status']
): Promise<MarketplaceListing | null> {
  const { data, error } = await getSupabase()
    .from('marketplace_listings')
    .update({ status })
    .eq('id', id)
    .select(MARKETPLACE_COLUMNS)
    .maybeSingle();
  throwOnSupabaseError(error, 'updating marketplace listing');
  return data ? mapListing(data) : null;
}

export async function updateRequestStatus(
  id: number,
  status: RequestStatus
): Promise<ServiceRequestRecord | null> {
  const patch =
    status === 'Cancelled'
      ? {
          status,
          queue_status: 'Done' as const,
          queue_done_at: new Date().toISOString(),
        }
      : { status };
  const { data, error } = await getSupabase()
    .from('service_requests')
    .update(patch)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  throwOnSupabaseError(error, 'updating service request status');
  return data ? getServiceRequestById(id) : null;
}

export async function updateRequestQueueStatus(
  id: number,
  queueStatus: QueueStatus
): Promise<ServiceRequestRecord | null> {
  const { data, error } = await getSupabase()
    .from('service_requests')
    .update({
      queue_status: queueStatus,
      queue_done_at: queueStatus === 'Done' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  throwOnSupabaseError(error, 'updating request queue status');
  return data ? getServiceRequestById(id) : null;
}

export async function addRequestInternalNote(
  requestId: number,
  note: string
): Promise<ServiceRequestRecord | null> {
  const { data: request, error: requestError } = await getSupabase()
    .from('service_requests')
    .select('id')
    .eq('id', requestId)
    .maybeSingle();
  throwOnSupabaseError(requestError, 'checking service request');
  if (!request) return null;

  const { error } = await getSupabase()
    .from('request_internal_notes')
    .insert({ request_id: requestId, note: note.trim() });
  throwOnSupabaseError(error, 'adding internal note');
  return getServiceRequestById(requestId);
}

export async function updateServiceRecord(
  id: number,
  patch: {
    startingPrice?: number;
    isActive?: boolean;
    turnaroundEstimate?: string;
    description?: string;
    categoryId?: number;
  }
): Promise<ServiceItem | null> {
  const updates: Record<string, unknown> = {};
  if (patch.startingPrice !== undefined) {
    updates.starting_price = Math.max(0, Math.round(patch.startingPrice));
  }
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;
  if (patch.turnaroundEstimate !== undefined) {
    updates.turnaround_estimate = patch.turnaroundEstimate.trim();
  }
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.categoryId !== undefined) updates.category_id = patch.categoryId;

  if (Object.keys(updates).length > 0) {
    const { data, error } = await getSupabase()
      .from('services')
      .update(updates)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    throwOnSupabaseError(error, 'updating service');
    if (!data) return null;
  }

  const catalog = await getAdminCatalog();
  return catalog.services.find((service) => service.id === id) ?? null;
}

export async function createCategoryRecord(input: {
  name: string;
  slug: string;
  description: string;
}): Promise<ServiceCategory> {
  const { data: lastCategory, error: orderError } = await getSupabase()
    .from('service_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwOnSupabaseError(orderError, 'finding category order');

  const { data, error } = await getSupabase()
    .from('service_categories')
    .insert({
      slug: input.slug.trim(),
      name: input.name.trim(),
      description: input.description.trim(),
      sort_order: (lastCategory?.sort_order ?? 0) + 1,
      is_active: true,
    })
    .select('id, slug, name, description, sort_order, is_active')
    .single();
  throwOnSupabaseError(error, 'creating service category');
  if (!data) throw new Error('Supabase did not return the created service category.');
  return mapCategory(data);
}

export async function updateCategoryRecord(
  id: number,
  patch: { name?: string; description?: string; isActive?: boolean }
): Promise<ServiceCategory | null> {
  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.isActive !== undefined) updates.is_active = patch.isActive;
  if (Object.keys(updates).length === 0) {
    const catalog = await getAdminCatalog();
    return catalog.categories.find((category) => category.id === id) ?? null;
  }

  const { data, error } = await getSupabase()
    .from('service_categories')
    .update(updates)
    .eq('id', id)
    .select('id, slug, name, description, sort_order, is_active')
    .maybeSingle();
  throwOnSupabaseError(error, 'updating service category');
  return data ? mapCategory(data) : null;
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Supabase service request item configuration must be a JSON object.');
  }
  return value as Record<string, unknown>;
}
