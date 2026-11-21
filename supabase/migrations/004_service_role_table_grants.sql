GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.service_categories,
  public.services,
  public.service_requests,
  public.service_request_items,
  public.request_internal_notes,
  public.workshop_settings,
  public.marketplace_listings
TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
