import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { formatPHP } from '../config/pricing';
import type { MarketplaceCondition, MarketplaceListing } from '../types/pagawaan';
import { ActionPinDialog } from './ActionPinDialog';

const CONDITIONS: MarketplaceCondition[] = [
  'Brand new',
  'In stock',
  'Like new',
  'Second-hand',
];
const CATEGORIES = [
  'Computers',
  'Computer parts',
  'Networking',
  'Phones & tablets',
  'Accessories',
  'Other',
];
const MAX_IMAGE_BYTES = 1_200_000;
const MAX_IMAGES = 4;

interface ListingDraft {
  title: string;
  category: string;
  description: string;
  price: string;
  condition: MarketplaceCondition;
  location: string;
}

const EMPTY_DRAFT: ListingDraft = {
  title: '',
  category: CATEGORIES[0],
  description: '',
  price: '',
  condition: 'Brand new',
  location: 'Antipolo City, Rizal',
};

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error(`Unable to read ${file.name}.`));
    };
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(data?.error || fallback);
}

export function ForSaleMarketplace({ sellerPhone, sellerEmail }: {
  sellerPhone: string;
  sellerEmail: string;
}) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All items');
  const [conditionFilter, setConditionFilter] = useState('All conditions');
  const [draft, setDraft] = useState<ListingDraft>(EMPTY_DRAFT);
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [photoIndexes, setPhotoIndexes] = useState<Record<number, number>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [pinPrompt, setPinPrompt] = useState<{
    title: string;
    description: string;
    confirm: (pin: string) => Promise<void>;
  } | null>(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch('/api/marketplace');
      if (!response.ok) throw await responseError(response, 'Unable to load For Sale listings.');
      const data = (await response.json()) as { listings: MarketplaceListing[] };
      setListings(data.listings);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load For Sale listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesCategory =
        categoryFilter === 'All items' || listing.category === categoryFilter;
      const matchesCondition =
        conditionFilter === 'All conditions' || listing.condition === conditionFilter;
      const matchesSearch =
        !query ||
        `${listing.title} ${listing.description} ${listing.category} ${listing.location}`
          .toLowerCase()
          .includes(query);
      return matchesCategory && matchesCondition && matchesSearch;
    });
  }, [categoryFilter, conditionFilter, listings, search]);

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (selected.length + images.length > MAX_IMAGES) {
      setImageError(`Choose up to ${MAX_IMAGES} photos.`);
      return;
    }
    const oversized = selected.find((file) => file.size > MAX_IMAGE_BYTES);
    if (oversized) {
      setImageError(`${oversized.name} is too large. Each photo must be 1.2 MB or smaller.`);
      return;
    }
    const unsupported = selected.find(
      (file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    );
    if (unsupported) {
      setImageError('Photos must be JPEG, PNG, or WebP files.');
      return;
    }
    try {
      const encoded = await Promise.all(selected.map(readImage));
      setImages((previous) => [...previous, ...encoded]);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Unable to read selected photos.');
    }
  };

  const publishListing = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPinPrompt({
      title: 'Publish listing',
      description: 'Enter the admin PIN to publish this item on the For Sale page.',
      confirm: async (pin) => {
        const response = await fetch('/api/marketplace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            price: Number(draft.price),
            images,
            pin,
          }),
        });
        if (!response.ok) throw await responseError(response, 'Unable to publish listing.');
        const data = (await response.json()) as { listing: MarketplaceListing };
        setListings((previous) => [data.listing, ...previous]);
        setDraft(EMPTY_DRAFT);
        setImages([]);
        setImageError(null);
        setFormOpen(false);
        setPinPrompt(null);
      },
    });
  };

  const markSold = (listing: MarketplaceListing) => {
    setPinPrompt({
      title: 'Mark item as sold',
      description: `Mark “${listing.title}” as sold? Enter the admin PIN to confirm.`,
      confirm: async (pin) => {
        const response = await fetch(`/api/marketplace/${listing.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Sold', pin }),
        });
        if (!response.ok) throw await responseError(response, 'Unable to update listing.');
        setListings((previous) => previous.filter((item) => item.id !== listing.id));
        setPinPrompt(null);
      },
    });
  };

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('All items');
    setConditionFilter('All conditions');
  };

  return (
    <section className="min-h-[70vh] bg-[#1B1917] py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 border-b border-[#EDE6D6]/10 pb-7 sm:flex-row sm:items-end">
          <div>
            <div className="text-xs font-medium text-[#D97724]">PAGAWAAN · LOCAL LISTINGS</div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#EDE6D6] sm:text-4xl">
              For Sale
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#A39B8B]">
              Browse available computers, components, networking gear, and other workshop finds.
              Listings are posted by Pagawaan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormOpen((open) => !open);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#D97724] bg-[#D97724] px-5 text-sm font-semibold text-[#141312] transition-colors hover:bg-[#e58432]"
          >
            <Tag className="h-4 w-4" aria-hidden="true" />
            {formOpen ? 'Close listing form' : 'Upload an item'}
          </button>
        </div>

        {formOpen && (
          <form
            onSubmit={publishListing}
            className="mt-7 border border-[#D97724]/35 bg-[#141312] p-5 sm:p-7"
          >
            <div className="mb-5">
              <h2 className="font-display text-xl font-semibold text-[#EDE6D6]">Create a listing</h2>
              <p className="mt-1 text-xs text-[#A39B8B]">
                Complete the item details, then confirm with your admin PIN to publish.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs text-[#A39B8B]">
                Item title
                <input
                  required
                  minLength={3}
                  maxLength={100}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder="e.g. 16 GB DDR4 desktop RAM"
                  className="mt-1.5 min-h-11 w-full border border-[#EDE6D6]/15 bg-[#1B1917] px-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </label>
              <label className="text-xs text-[#A39B8B]">
                Category
                <select
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                  className="mt-1.5 min-h-11 w-full border border-[#EDE6D6]/15 bg-[#1B1917] px-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                >
                  {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
              <label className="text-xs text-[#A39B8B]">
                Price (PHP)
                <input
                  required
                  type="number"
                  min="0"
                  max="5000000"
                  step="1"
                  value={draft.price}
                  onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                  placeholder="0"
                  className="mt-1.5 min-h-11 w-full border border-[#EDE6D6]/15 bg-[#1B1917] px-3 font-mono text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </label>
              <label className="text-xs text-[#A39B8B]">
                Condition / availability
                <select
                  value={draft.condition}
                  onChange={(event) =>
                    setDraft({ ...draft, condition: event.target.value as MarketplaceCondition })
                  }
                  className="mt-1.5 min-h-11 w-full border border-[#EDE6D6]/15 bg-[#1B1917] px-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                >
                  {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
                </select>
              </label>
              <label className="text-xs text-[#A39B8B] md:col-span-2">
                Description
                <textarea
                  required
                  minLength={5}
                  maxLength={2000}
                  rows={4}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="Describe the item, included accessories, and any known defects."
                  className="mt-1.5 w-full resize-y border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2.5 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </label>
              <label className="text-xs text-[#A39B8B]">
                Meetup / pickup area
                <input
                  required
                  minLength={2}
                  maxLength={120}
                  value={draft.location}
                  onChange={(event) => setDraft({ ...draft, location: event.target.value })}
                  className="mt-1.5 min-h-11 w-full border border-[#EDE6D6]/15 bg-[#1B1917] px-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </label>
              <div className="text-xs text-[#A39B8B]">
                Photos (up to {MAX_IMAGES}, 1.2 MB each)
                <label className="mt-1.5 flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-dashed border-[#EDE6D6]/25 bg-[#1B1917] px-3 text-sm text-[#EDE6D6] hover:border-[#D97724]">
                  <Camera className="h-4 w-4 text-[#D97724]" aria-hidden="true" />
                  Choose photos {images.length > 0 && `(${images.length})`}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handleImageChange}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>
            {images.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {images.map((image, index) => (
                  <div key={`${index}-${image.slice(-12)}`} className="relative">
                    <img src={image} alt={`Listing photo ${index + 1}`} className="h-20 w-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((previous) => previous.filter((_, i) => i !== index))}
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute right-1 top-1 bg-[#141312]/90 px-1.5 py-0.5 text-xs text-[#EDE6D6]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageError && (
              <p role="alert" className="mt-3 text-xs text-[#E58A80]">{imageError}</p>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-10 border border-[#EDE6D6]/15 px-4 text-xs text-[#EDE6D6] hover:border-[#EDE6D6]/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-10 border border-[#D97724] bg-[#D97724] px-5 text-xs font-semibold text-[#141312] hover:bg-[#e58432]"
              >
                Continue to PIN &amp; publish
              </button>
            </div>
          </form>
        )}

        <div className="mt-7 grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
          <label className="relative block">
            <span className="sr-only">Search listings</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A39B8B]" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search items"
              className="min-h-11 w-full border border-[#EDE6D6]/15 bg-[#141312] pl-10 pr-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
            />
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="min-h-11 w-full border border-[#EDE6D6]/15 bg-[#141312] px-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
            >
              <option>All items</option>
              {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by condition</span>
            <select
              value={conditionFilter}
              onChange={(event) => setConditionFilter(event.target.value)}
              className="min-h-11 w-full border border-[#EDE6D6]/15 bg-[#141312] px-3 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
            >
              <option>All conditions</option>
              {CONDITIONS.map((condition) => <option key={condition}>{condition}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between border-b border-[#EDE6D6]/10 pb-3 text-xs text-[#A39B8B]">
          <span>{loading ? 'Loading listings…' : `${filteredListings.length} available item${filteredListings.length === 1 ? '' : 's'}`}</span>
          {(search || categoryFilter !== 'All items' || conditionFilter !== 'All conditions') && (
            <button type="button" onClick={clearFilters} className="text-[#D97724] hover:underline">
              Clear filters
            </button>
          )}
        </div>

        {loadError ? (
          <div role="alert" className="mt-8 border border-[#B8443A]/40 bg-[#141312] p-6 text-sm text-[#EDE6D6]">
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadListings()} className="mt-3 text-xs font-semibold text-[#D97724] hover:underline">
              Retry
            </button>
          </div>
        ) : !loading && filteredListings.length === 0 ? (
          <div className="mt-8 border border-[#EDE6D6]/10 bg-[#141312] px-5 py-16 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-[#D97724]" aria-hidden="true" />
            <h2 className="mt-3 font-display text-lg font-semibold text-[#EDE6D6]">
              {listings.length === 0 ? 'No items listed yet' : 'No items match these filters'}
            </h2>
            <p className="mt-1 text-sm text-[#A39B8B]">
              {listings.length === 0
                ? 'Check back for new stock, or post the first item.'
                : 'Try a different search or clear the selected filters.'}
            </p>
            {listings.length > 0 && (
              <button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-[#D97724] hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredListings.map((listing) => (
              <article key={listing.id} className="group overflow-hidden border border-[#EDE6D6]/10 bg-[#141312] transition-colors hover:border-[#D97724]/45">
                <div className="relative aspect-[4/3] bg-[#23201D]">
                  {listing.images[0] ? (
                    <img
                      src={listing.images[photoIndexes[listing.id] || 0]}
                      alt={listing.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-10 w-10 text-[#A39B8B]/35" aria-hidden="true" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 border border-[#EDE6D6]/20 bg-[#141312]/90 px-2 py-1 text-[10px] font-medium text-[#EDE6D6]">
                    {listing.condition}
                  </span>
                  {listing.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label={`Previous photo for ${listing.title}`}
                        onClick={() => setPhotoIndexes((previous) => {
                          const current = previous[listing.id] || 0;
                          return {
                            ...previous,
                            [listing.id]:
                              (current - 1 + listing.images.length) % listing.images.length,
                          };
                        })}
                        className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#141312]/85 text-[#EDE6D6] hover:bg-[#141312]"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Next photo for ${listing.title}`}
                        onClick={() => setPhotoIndexes((previous) => {
                          const current = previous[listing.id] || 0;
                          return {
                            ...previous,
                            [listing.id]: (current + 1) % listing.images.length,
                          };
                        })}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#141312]/85 text-[#EDE6D6] hover:bg-[#141312]"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="absolute bottom-3 right-3 bg-[#141312]/90 px-2 py-1 text-[10px] text-[#EDE6D6]">
                        {(photoIndexes[listing.id] || 0) + 1} / {listing.images.length}
                      </span>
                    </>
                  )}
                </div>
                <div className="p-4">
                  <div className="font-mono text-lg font-bold tabular-nums text-[#D97724]">
                    {formatPHP(listing.price)}
                  </div>
                  <h2 className="mt-1 line-clamp-2 min-h-10 font-display text-base font-semibold leading-snug text-[#EDE6D6]">
                    {listing.title}
                  </h2>
                  <p className="mt-2 line-clamp-3 min-h-[3.6rem] text-xs leading-relaxed text-[#A39B8B]">
                    {listing.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#EDE6D6]/10 pt-3 text-[10px] text-[#A39B8B]">
                    <span>{listing.category}</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {listing.location}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <a
                      href={`mailto:${sellerEmail}?subject=${encodeURIComponent(`Question about ${listing.title}`)}`}
                      className="flex min-h-10 flex-1 items-center justify-center border border-[#D97724] bg-[#D97724] px-3 text-xs font-semibold text-[#141312] hover:bg-[#e58432]"
                    >
                      Contact seller
                    </a>
                    <button
                      type="button"
                      onClick={() => markSold(listing)}
                      title="Admin PIN required"
                      className="min-h-10 border border-[#EDE6D6]/15 px-3 text-xs text-[#A39B8B] hover:border-[#D97724]/60 hover:text-[#EDE6D6]"
                    >
                      Mark sold
                    </button>
                  </div>
                  {sellerPhone && (
                    <a href={`tel:+63${sellerPhone.replace(/^0/, '')}`} className="mt-2 block text-center text-[10px] text-[#A39B8B] hover:text-[#D97724]">
                      Call {sellerPhone}
                    </a>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-[#A39B8B]/75">
                    <BadgeCheck className="h-3 w-3 text-[#5C8D76]" aria-hidden="true" />
                    Pagawaan listing · {new Date(`${listing.createdAt.replace(' ', 'T')}Z`).toLocaleDateString()}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {pinPrompt && (
        <ActionPinDialog
          title={pinPrompt.title}
          description={pinPrompt.description}
          onCancel={() => setPinPrompt(null)}
          onConfirm={pinPrompt.confirm}
        />
      )}
    </section>
  );
}
