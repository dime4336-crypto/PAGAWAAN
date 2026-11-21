ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS queue_status TEXT NOT NULL DEFAULT 'In Queue'
    CHECK (queue_status IN ('In Queue', 'Working on It', 'Done')),
  ADD COLUMN IF NOT EXISTS queue_done_at TIMESTAMPTZ;
