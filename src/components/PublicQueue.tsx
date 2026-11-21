import { useCallback, useEffect, useState } from 'react';
import { ListOrdered, Loader2, X } from 'lucide-react';
import type { PublicQueueItem } from '../types/pagawaan';

const REFRESH_INTERVAL_MS = 30_000;

export function PublicQueue({ refreshToken }: { refreshToken: number }) {
  const [items, setItems] = useState<PublicQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/queue');
      if (!response.ok) {
        throw new Error('Unable to load the service queue. Please try again.');
      }
      const data = (await response.json()) as { items: PublicQueueItem[] };
      setItems(data.items);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load the service queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    const intervalId = window.setInterval(loadQueue, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadQueue, refreshToken]);

  const toggleQueue = () => {
    setOpen((previous) => !previous);
    if (!open) loadQueue();
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <section
          id="public-service-queue"
          aria-label="Service queue"
          className="mb-3 flex max-h-[min(70vh,34rem)] w-[min(22rem,calc(100vw-2.5rem))] flex-col border border-[#EDE6D6]/15 bg-[#1B1917] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#EDE6D6]/10 bg-[#23201D] px-4 py-3.5">
            <div>
              <h2 className="font-display text-base font-bold text-[#EDE6D6]">Service Queue</h2>
              <p className="mt-0.5 text-[11px] text-[#A39B8B]">
                Live request progress · {items.length}{' '}
                {items.length === 1 ? 'request' : 'requests'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close service queue"
              className="inline-flex h-9 w-9 items-center justify-center text-[#A39B8B] hover:text-[#EDE6D6]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto p-3">
            {error ? (
              <div role="alert" className="p-4 text-center text-xs text-[#B8443A]">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={loadQueue}
                  className="mt-2 font-semibold text-[#D97724] underline-offset-4 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-xs text-[#A39B8B]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading queue…
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-xs text-[#A39B8B]">
                No service requests are currently in the queue.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {items.map((item) => (
                  <li
                    key={item.referenceNumber}
                    className="border border-[#EDE6D6]/10 bg-[#141312] p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-xs font-semibold tabular-nums text-[#D97724]">
                        {item.referenceNumber}
                      </span>
                      <span
                        className={`shrink-0 border px-2 py-1 text-[10px] font-semibold ${
                          item.queueStatus === 'Done'
                            ? 'border-[#5C8D76]/50 text-[#8FBEA5]'
                            : item.queueStatus === 'Working on It'
                              ? 'border-[#D97724]/50 text-[#E9A15F]'
                              : 'border-[#EDE6D6]/15 text-[#A39B8B]'
                        }`}
                      >
                        {item.queueStatus}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[#EDE6D6]">
                      {item.serviceNames.join(' · ')}
                    </p>
                    <p className="mt-2 text-[10px] text-[#A39B8B]">
                      Submitted {new Date(`${item.createdAt.replace(' ', 'T')}Z`).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <p className="border-t border-[#EDE6D6]/10 px-4 py-2.5 text-[10px] leading-relaxed text-[#A39B8B]">
            Completed requests stay visible here for 30 minutes.
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={toggleQueue}
        aria-expanded={open}
        aria-controls={open ? 'public-service-queue' : undefined}
        aria-label={open ? 'Close service queue' : `Open service queue, ${items.length} requests`}
        className="inline-flex min-h-12 items-center gap-2.5 border border-[#D97724] bg-[#D97724] px-4 text-sm font-semibold text-[#141312] shadow-xl transition-colors hover:bg-[#e58432]"
      >
        {open ? (
          <X className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ListOrdered className="h-4 w-4" aria-hidden="true" />
        )}
        <span>{open ? 'Close Queue' : 'Service Queue'}</span>
        <span className="bg-[#141312] px-1.5 py-0.5 font-mono text-xs tabular-nums text-[#EDE6D6]">
          {items.length}
        </span>
      </button>
    </div>
  );
}
