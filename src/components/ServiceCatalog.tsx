import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Cable,
  Code2,
  Cpu,
  Info,
  Network,
  Plus,
  Search,
  Smartphone,
  Wrench,
} from 'lucide-react';
import { formatPHP } from '../config/pricing';
import type { ServiceCategory, ServiceItem } from '../types/pagawaan';

interface ServiceCatalogProps {
  categories: ServiceCategory[];
  services: ServiceItem[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onInspectService: (service: ServiceItem) => void;
  onConfigureService: (service: ServiceItem) => void;
  onJumpToCableBuilder: () => void;
}

function getCategoryIcon(slug: string) {
  switch (slug) {
    case 'computer-laptop':
      return Cpu;
    case 'networking-ethernet':
      return Network;
    case 'mobile-assistance':
      return Smartphone;
    case 'software-development':
      return Code2;
    default:
      return Wrench;
  }
}

function formatServicePriceLabel(service: ServiceItem): string {
  if (service.pricingType === 'custom_quote') {
    return 'Custom quotation';
  }
  if (service.pricingType === 'monthly') {
    return `From ${formatPHP(service.startingPrice)}/mo`;
  }
  if (service.pricingType === 'cable_formula') {
    return `From ${formatPHP(service.startingPrice)}+`;
  }
  if (service.slug === 'ram-ssd-installation') {
    return `Labor from ${formatPHP(service.startingPrice)}`;
  }
  return `From ${formatPHP(service.startingPrice)}`;
}

export function ServiceCatalog({
  categories,
  services,
  loading,
  error,
  onRetry,
  onInspectService,
  onConfigureService,
  onJumpToCableBuilder,
}: ServiceCatalogProps) {
  const prefersReducedMotion = useReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return services.filter((service) => {
      const matchesCat =
        selectedCategory === 'all' || service.categorySlug === selectedCategory;
      if (!matchesCat) return false;
      if (!query) return true;
      return (
        service.name.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.categoryName.toLowerCase().includes(query)
      );
    });
  }, [services, selectedCategory, searchQuery]);

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, { category: ServiceCategory; items: ServiceItem[] }>();
    for (const cat of categories) {
      map.set(cat.slug, { category: cat, items: [] });
    }
    for (const srv of filteredServices) {
      const bucket = map.get(srv.categorySlug);
      if (bucket) {
        bucket.items.push(srv);
      }
    }
    return Array.from(map.values()).filter((group) => group.items.length > 0);
  }, [categories, filteredServices]);

  return (
    <section
      id="services"
      className="border-b border-[#EDE6D6]/10 bg-[#1B1917] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col gap-6 border-b border-[#EDE6D6]/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs font-medium text-[#D97724]">
              01 · Workshop Service Catalog
            </div>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-[#EDE6D6] sm:text-4xl">
              Built, repaired, and configured to spec.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#A39B8B] sm:text-base">
              Select one or multiple services to build a single quotation request. Hover any card
              to inspect its workshop discipline, or configure exact hardware and cable specs.
            </p>
          </div>

          {/* Search box */}
          <div className="w-full lg:w-80">
            <label htmlFor="catalog-search" className="sr-only">
              Search services
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A39B8B]"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search repair, RJ45, Windows, web..."
                className="w-full min-h-[44px] border border-[#EDE6D6]/15 bg-[#141312] py-2.5 pl-10 pr-4 text-sm text-[#EDE6D6] placeholder:text-[#A39B8B]/60 focus:border-[#D97724] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`min-h-[40px] border px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'border-[#D97724] bg-[#D97724] text-[#141312]'
                : 'border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B] hover:border-[#EDE6D6]/35 hover:text-[#EDE6D6]'
            }`}
          >
            All Categories ({services.length})
          </button>

          {categories.map((cat) => {
            const active = selectedCategory === cat.slug;
            const Icon = getCategoryIcon(cat.slug);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.slug)}
                className={`inline-flex min-h-[40px] items-center gap-2 border px-4 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'border-[#D97724] bg-[#D97724] text-[#141312]'
                    : 'border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B] hover:border-[#EDE6D6]/35 hover:text-[#EDE6D6]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Introductory pricing disclaimer */}
        <div className="mt-5 flex items-start gap-2.5 border border-[#EDE6D6]/10 bg-[#141312] px-4 py-3 text-xs text-[#A39B8B]">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#D97724]" aria-hidden="true" />
          <p>
            <strong className="font-medium text-[#EDE6D6]">Introductory Estimates:</strong> Listed
            PHP amounts and turnaround windows are introductory estimates only. Final pricing
            depends on complexity, materials, replacement parts, and hands-on assessment.
          </p>
        </div>

        {/* Loading / Error / Empty / Catalog */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-56 animate-pulse border border-[#EDE6D6]/10 bg-[#23201D]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 border border-[#B8443A]/50 bg-[#23201D] p-6 text-sm">
            <p className="font-medium text-[#EDE6D6]">Unable to load service catalog</p>
            <p className="mt-1 text-[#A39B8B]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 border border-[#D97724] bg-[#D97724] px-4 py-2 text-xs font-semibold text-[#141312]"
            >
              Retry Catalog Load
            </button>
          </div>
        ) : groupedByCategory.length === 0 ? (
          <div className="mt-8 border border-[#EDE6D6]/10 bg-[#141312] p-8 text-center">
            <p className="text-sm font-medium text-[#EDE6D6]">
              No matching services found for &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 border border-[#EDE6D6]/20 px-4 py-2 text-xs text-[#EDE6D6] hover:border-[#D97724]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-10 space-y-12">
            {groupedByCategory.map(({ category, items }, catIndex) => {
              const CategoryIcon = getCategoryIcon(category.slug);
              return (
                <div key={category.id}>
                  <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-[#EDE6D6]/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs tabular-nums text-[#D97724]">
                        0{catIndex + 1}
                      </span>
                      <CategoryIcon className="h-4 w-4 text-[#A39B8B]" aria-hidden="true" />
                      <h3 className="font-display text-xl font-semibold text-[#EDE6D6]">
                        {category.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[#A39B8B]">{category.description}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {items.map((service) => {
                      const isHovered = hoveredId === service.id;
                      const isCustomCable = service.slug === 'custom-ethernet-cable';

                      return (
                        <article
                          key={service.id}
                          onMouseEnter={() => setHoveredId(service.id)}
                          onMouseLeave={() => setHoveredId(null)}
                          data-cursor-label="Service"
                          className="group relative flex flex-col justify-between overflow-hidden border border-[#EDE6D6]/12 bg-[#141312] p-5 transition-colors duration-150 hover:border-[#D97724]/55"
                        >
                          {/* Category-specific hover micro-interaction */}
                          {!prefersReducedMotion &&
                            service.categorySlug === 'computer-laptop' &&
                            isHovered && (
                              <motion.div
                                initial={{ scaleX: 0, originX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[#D97724]"
                              />
                            )}

                          {!prefersReducedMotion &&
                            service.categorySlug === 'networking-ethernet' && (
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[#2C2824]">
                                <motion.div
                                  initial={false}
                                  animate={{ scaleX: isHovered ? 1 : 0 }}
                                  style={{ originX: 0 }}
                                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                  className="h-full bg-[#D97724]"
                                />
                              </div>
                            )}

                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#EDE6D6]/12 bg-[#23201D] text-[#D97724]">
                                  {isCustomCable ? (
                                    <Cable className="h-4 w-4" aria-hidden="true" />
                                  ) : (
                                    <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-display text-base font-semibold leading-snug text-[#EDE6D6]">
                                    {service.name}
                                  </h4>
                                  <div className="mt-0.5 text-xs text-[#A39B8B]">
                                    <span>{service.turnaroundEstimate}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Mobile Assistance category hover: toggle switch preview */}
                              {service.categorySlug === 'mobile-assistance' && (
                                <div
                                  aria-hidden="true"
                                  className="flex h-5 w-9 shrink-0 items-center border border-[#EDE6D6]/15 bg-[#23201D] p-0.5"
                                >
                                  <motion.div
                                    animate={{
                                      x: isHovered && !prefersReducedMotion ? 16 : 0,
                                      backgroundColor: isHovered ? '#5C8D76' : '#A39B8B',
                                    }}
                                    transition={{ duration: 0.18 }}
                                    className="h-3.5 w-3.5"
                                  />
                                </div>
                              )}

                              {/* Software category hover: subtle index reveal */}
                              {service.categorySlug === 'software-development' && (
                                <span
                                  aria-hidden="true"
                                  className={`font-mono text-[11px] tabular-nums transition-colors duration-150 ${
                                    isHovered ? 'text-[#D97724]' : 'text-[#A39B8B]/40'
                                  }`}
                                >
                                  {isHovered ? 'spec()' : 'fn'}
                                </span>
                              )}
                            </div>

                            <p
                              className={`mt-4 text-sm leading-relaxed text-[#A39B8B] transition-colors ${
                                service.categorySlug === 'software-development' && isHovered
                                  ? 'text-[#EDE6D6]/90'
                                  : ''
                              }`}
                            >
                              {service.description}
                            </p>
                          </div>

                          <div className="mt-6 border-t border-[#EDE6D6]/10 pt-4">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs text-[#A39B8B]">Estimated rate</span>
                              <span className="font-mono text-sm font-semibold tabular-nums text-[#EDE6D6]">
                                {formatServicePriceLabel(service)}
                              </span>
                            </div>

                            <div className="mt-4 flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => onInspectService(service)}
                                className="min-h-[40px] flex-1 border border-[#EDE6D6]/18 bg-[#1B1917] px-3 py-2 text-xs font-medium text-[#EDE6D6] whitespace-nowrap transition-colors hover:border-[#EDE6D6]/40"
                              >
                                Details
                              </button>

                              {isCustomCable ? (
                                <button
                                  type="button"
                                  onClick={onJumpToCableBuilder}
                                  data-cursor-label="Cable Studio"
                                  className="inline-flex min-h-[40px] flex-[1.4] items-center justify-center gap-1.5 border border-[#D97724] bg-[#D97724] px-3 py-2 text-xs font-semibold text-[#141312] whitespace-nowrap transition-colors hover:bg-[#e58432]"
                                >
                                  <span>Build Cable</span>
                                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onConfigureService(service)}
                                  data-cursor-label="Configure"
                                  className="inline-flex min-h-[40px] flex-[1.4] items-center justify-center gap-1.5 border border-[#D97724] bg-[#D97724] px-3 py-2 text-xs font-semibold text-[#141312] whitespace-nowrap transition-colors hover:bg-[#e58432]"
                                >
                                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Request Service</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
