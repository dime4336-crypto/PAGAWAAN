import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { CheckCircle2 } from 'lucide-react';
import { DEFAULT_WORKSHOP_CONFIG, type WorkshopContactConfig } from './config/workshop';
import { AdminDashboard } from './components/AdminDashboard';
import { CableBuilder } from './components/CableBuilder';
import { ContactFooter } from './components/ContactFooter';
import { HeroWorkshop } from './components/HeroWorkshop';
import { HowItWorksAndAbout } from './components/HowItWorksAndAbout';
import { CalibrationIntro } from './components/motion/CalibrationIntro';
import { PrecisionCursor } from './components/motion/PrecisionCursor';
import { Navbar } from './components/Navbar';
import { RequestDrawer } from './components/RequestDrawer';
import { ServiceCatalog } from './components/ServiceCatalog';
import { ServiceConfiguratorModal } from './components/ServiceConfiguratorModal';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { WorkshopShowcase } from './components/WorkshopShowcase';
import type { CartServiceItem, ServiceCategory, ServiceItem } from './types/pagawaan';

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  const [isAdminRoute, setIsAdminRoute] = useState(
    () => typeof window !== 'undefined' && window.location.pathname === '/admin'
  );
  const [introDone, setIntroDone] = useState(false);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [workshopConfig, setWorkshopConfig] = useState<WorkshopContactConfig>(
    DEFAULT_WORKSHOP_CONFIG
  );

  const [inspectedService, setInspectedService] = useState<ServiceItem | null>(null);
  const [configuringService, setConfiguringService] = useState<ServiceItem | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartServiceItem[]>([]);
  const [toastText, setToastText] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2600);
  }, []);

  const loadPublicData = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const [catRes, cfgRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/config'),
      ]);
      if (!catRes.ok) {
        throw new Error('Could not reach the service catalog.');
      }
      const catJson = await catRes.json();
      setCategories(catJson.categories || []);
      setServices(catJson.services || []);

      if (cfgRes.ok) {
        const cfgJson = await cfgRes.json();
        setWorkshopConfig(cfgJson);
      }
    } catch (err: unknown) {
      setCatalogError(err instanceof Error ? err.message : 'Unable to load services.');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  useEffect(() => {
    const onPopState = () => {
      setIsAdminRoute(window.location.pathname === '/admin');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setIsAdminRoute(true);
    window.scrollTo({ top: 0 });
  };

  const exitAdmin = () => {
    window.history.pushState({}, '', '/');
    setIsAdminRoute(false);
    window.scrollTo({ top: 0 });
  };

  const handleAddToCart = (item: CartServiceItem) => {
    setCartItems((prev) => [...prev, item]);
    triggerToast(`Added "${item.serviceName}" to your request`);
  };

  const handleUpdateQty = (uid: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.uid !== uid) return item;
        const nextQty = Math.max(1, Math.min(50, item.quantity + delta));
        const unit =
          item.estimatedPrice !== null ? Math.round(item.estimatedPrice / item.quantity) : null;
        return {
          ...item,
          quantity: nextQty,
          estimatedPrice: unit !== null ? unit * nextQty : null,
        };
      })
    );
  };

  const handleRemoveItem = (uid: string) => {
    setCartItems((prev) => prev.filter((i) => i.uid !== uid));
  };

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  const customCableService = services.find((s) => s.slug === 'custom-ethernet-cable');
  const websiteDevService = services.find((s) => s.slug === 'website-development');

  const totalCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (isAdminRoute) {
    return (
      <MotionConfig reducedMotion="user">
        <AdminDashboard
          workshopConfig={workshopConfig}
          onExitAdmin={exitAdmin}
          onCatalogMutated={loadPublicData}
          onConfigUpdated={(next) => setWorkshopConfig(next)}
        />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#141312] text-[#EDE6D6]">
        {!introDone && <CalibrationIntro onComplete={() => setIntroDone(true)} />}
        <PrecisionCursor />

        <Navbar
          requestCount={totalCount}
          onOpenTray={() => setTrayOpen(true)}
          onOpenAdmin={openAdmin}
        />

        <main>
          <HeroWorkshop
            config={workshopConfig}
            onExploreServices={() => scrollToElement('services')}
            onStartRequest={() => {
              if (cartItems.length > 0) {
                setTrayOpen(true);
              } else {
                scrollToElement('services');
              }
            }}
          />

          <ServiceCatalog
            categories={categories}
            services={services}
            loading={catalogLoading}
            error={catalogError}
            onRetry={loadPublicData}
            onInspectService={(srv) => setInspectedService(srv)}
            onConfigureService={(srv) => setConfiguringService(srv)}
            onJumpToCableBuilder={() => scrollToElement('cable-builder')}
          />

          <CableBuilder
            cableService={customCableService}
            onAddCableToRequest={handleAddToCart}
          />

          <HowItWorksAndAbout />

          <WorkshopShowcase
            onRequestWebProject={() => {
              if (websiteDevService) {
                setConfiguringService(websiteDevService);
              } else {
                scrollToElement('services');
              }
            }}
          />
        </main>

        <ContactFooter
          config={workshopConfig}
          onOpenAdmin={openAdmin}
          onOpenTray={() => setTrayOpen(true)}
        />

        {/* Modals & Request Tray */}
        <ServiceDetailModal
          service={inspectedService}
          onClose={() => setInspectedService(null)}
          onConfigure={(srv) => setConfiguringService(srv)}
        />

        <ServiceConfiguratorModal
          service={configuringService}
          onClose={() => setConfiguringService(null)}
          onAdd={handleAddToCart}
        />

        <RequestDrawer
          open={trayOpen}
          items={cartItems}
          onClose={() => setTrayOpen(false)}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onClearItems={() => setCartItems([])}
          onRequestSubmitted={(record) => {
            triggerToast(`Submitted ${record.referenceNumber}`);
          }}
        />

        {/* Feedback Toast */}
        <AnimatePresence>
          {toastText && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 border border-[#5C8D76]/70 bg-[#1B1917] px-4 py-3 text-xs font-medium text-[#EDE6D6] shadow-xl"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#5C8D76]" />
              <span>{toastText}</span>
              <button
                type="button"
                onClick={() => setTrayOpen(true)}
                className="ml-2 font-semibold text-[#D97724] underline-offset-4 hover:underline"
              >
                View Tray
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
