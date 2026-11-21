CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  condition TEXT NOT NULL CHECK (
    condition IN ('Brand new', 'In stock', 'Like new', 'Second-hand')
  ),
  location TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Sold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE IF NOT EXISTS public.pagawaan_request_seq START 1;

DO $$
DECLARE
  last_reference_number BIGINT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(reference_number FROM '[0-9]+$')::BIGINT), 0)
    INTO last_reference_number
    FROM public.service_requests;

  IF last_reference_number = 0 THEN
    PERFORM setval('public.pagawaan_request_seq', 1, FALSE);
  ELSE
    PERFORM setval('public.pagawaan_request_seq', last_reference_number, TRUE);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_service_request_with_items(
  p_customer_name TEXT,
  p_contact_number TEXT,
  p_email TEXT,
  p_location TEXT,
  p_service_method TEXT,
  p_preferred_date TEXT,
  p_additional_notes TEXT,
  p_estimated_total INTEGER,
  p_has_custom_quote_items BOOLEAN,
  p_items JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_reference_number BIGINT;
  new_request_id BIGINT;
  request_reference TEXT;
  item JSONB;
BEGIN
  next_reference_number := nextval('public.pagawaan_request_seq');
  request_reference := format(
    'PAG-%s-%s',
    TO_CHAR(CURRENT_DATE, 'YYYY'),
    LPAD(next_reference_number::TEXT, 5, '0')
  );

  INSERT INTO public.service_requests (
    reference_number,
    customer_name,
    contact_number,
    email,
    location,
    service_method,
    preferred_date,
    additional_notes,
    estimated_total,
    has_custom_quote_items
  )
  VALUES (
    request_reference,
    p_customer_name,
    p_contact_number,
    p_email,
    p_location,
    p_service_method,
    p_preferred_date,
    p_additional_notes,
    p_estimated_total,
    p_has_custom_quote_items
  )
  RETURNING id INTO new_request_id;

  FOR item IN
    SELECT value FROM jsonb_array_elements(p_items) AS entries(value)
  LOOP
    INSERT INTO public.service_request_items (
      request_id,
      service_id,
      quantity,
      configuration,
      estimated_price
    )
    VALUES (
      new_request_id,
      (item->>'service_id')::BIGINT,
      (item->>'quantity')::INTEGER,
      COALESCE(item->'configuration', '{}'::jsonb),
      NULLIF(item->>'estimated_price', 'null')::INTEGER
    );
  END LOOP;

  RETURN new_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_service_request_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_service_request_with_items(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, BOOLEAN, JSONB
) TO service_role;
