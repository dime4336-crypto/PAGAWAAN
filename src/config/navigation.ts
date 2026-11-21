export const SITE_NAV_ITEMS = [
  { id: 'services', label: 'Services' },
  { id: 'for-sale', label: 'For Sale' },
  { id: 'cable-builder', label: 'Cable Builder' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'showcase', label: 'Workshop' },
  { id: 'contact', label: 'Contact' },
] as const;

export type SitePage = 'home' | (typeof SITE_NAV_ITEMS)[number]['id'];

export const SITE_PAGE_PATHS: Record<SitePage, string> = {
  home: '/',
  services: '/services',
  'for-sale': '/for-sale',
  'cable-builder': '/cable-builder',
  'how-it-works': '/how-it-works',
  showcase: '/workshop',
  contact: '/contact',
};

export function getSitePageFromPath(pathname: string): SitePage {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === SITE_PAGE_PATHS.home) return 'home';
  return SITE_NAV_ITEMS.find((item) => SITE_PAGE_PATHS[item.id] === normalizedPath)?.id ?? 'home';
}
