import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Loader2,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
} from 'lucide-react';
import { formatPHP } from '../config/pricing';
import type { WorkshopContactConfig } from '../config/workshop';
import {
  REQUEST_STATUSES,
  QUEUE_STATUSES,
  type QueueStatus,
  type RequestStatus,
  type ServiceCategory,
  type ServiceItem,
  type ServiceRequestRecord,
} from '../types/pagawaan';

interface AdminDashboardProps {
  workshopConfig: WorkshopContactConfig;
  onExitAdmin: () => void;
  onCatalogMutated: () => void;
  onConfigUpdated: (next: WorkshopContactConfig) => void;
}

type AdminTab = 'requests' | 'catalog' | 'settings';

export function AdminDashboard({
  workshopConfig,
  onExitAdmin,
  onCatalogMutated,
  onConfigUpdated,
}: AdminDashboardProps) {
  const [authChecked, setAuthChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('requests');
  const [requests, setRequests] = useState<ServiceRequestRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [queueStatusError, setQueueStatusError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Price editing map
  const [priceEdits, setPriceEdits] = useState<Record<number, string>>({});
  const [turnaroundEdits, setTurnaroundEdits] = useState<Record<number, string>>({});

  // New category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Editable workshop config
  const [configDraft, setConfigDraft] = useState<WorkshopContactConfig>(workshopConfig);

  useEffect(() => {
    setConfigDraft(workshopConfig);
  }, [workshopConfig]);

  const showNotice = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2600);
  };

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [reqRes, catRes] = await Promise.all([
        fetch('/api/admin/requests'),
        fetch('/api/admin/catalog'),
      ]);
      if (reqRes.status === 401 || catRes.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!reqRes.ok || !catRes.ok) {
        throw new Error('Unable to load workshop records.');
      }

      const reqData = await reqRes.json();
      const catData = await catRes.json();

      setRequests(reqData.requests || []);
      setCategories(catData.categories || []);
      setServices(catData.services || []);

      const nextPrices: Record<number, string> = {};
      const nextTurnarounds: Record<number, string> = {};
      for (const s of catData.services || []) {
        nextPrices[s.id] = String(s.startingPrice);
        nextTurnarounds[s.id] = s.turnaroundEstimate;
      }
      setPriceEdits(nextPrices);
      setTurnaroundEdits(nextTurnarounds);

      if ((reqData.requests || []).length > 0) {
        setSelectedRequestId((prev) => prev ?? reqData.requests[0].id);
      }
    } catch (err: unknown) {
      setDataError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/session');
        const data = await res.json();
        setAuthenticated(Boolean(data.authenticated));
        if (data.authenticated) {
          await loadAdminData();
        }
      } catch {
        setAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [loadAdminData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Access denied.');
        return;
      }
      setAuthenticated(true);
      setPasscode('');
      await loadAdminData();
    } catch {
      setAuthError('Unable to reach server for verification.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthenticated(false);
    setRequests([]);
  };

  const filteredRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return requests.filter((r) => {
      const statusMatch = statusFilter === 'All' || r.status === statusFilter;
      if (!statusMatch) return false;
      if (!q) return true;
      return (
        r.referenceNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.contactNumber.toLowerCase().includes(q)
      );
    });
  }, [requests, statusFilter, searchQuery]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || filteredRequests[0] || null,
    [requests, selectedRequestId, filteredRequests]
  );

  const handleStatusChange = async (requestId: number, status: RequestStatus) => {
    const res = await fetch(`/api/admin/requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const data = await res.json();
      setRequests((prev) => prev.map((r) => (r.id === requestId ? data.request : r)));
      showNotice(`Status updated to ${status}`);
    }
  };

  const handleQueueStatusChange = async (requestId: number, queueStatus: QueueStatus) => {
    setQueueStatusError(null);
    try {
      const response = await fetch(`/api/admin/requests/${requestId}/queue-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to update queue status.');
      }
      setRequests((previous) =>
        previous.map((request) => (request.id === requestId ? data.request : request))
      );
      showNotice(`Queue status updated to ${queueStatus}`);
    } catch (err: unknown) {
      setQueueStatusError(
        err instanceof Error ? err.message : 'Unable to update queue status.'
      );
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/admin/requests/${selectedRequest.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: newNote }),
      });
      if (res.ok) {
        const data = await res.json();
        setRequests((prev) =>
          prev.map((r) => (r.id === selectedRequest.id ? data.request : r))
        );
        setNewNote('');
        showNotice('Internal note saved');
      }
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveService = async (service: ServiceItem) => {
    const nextPrice = Math.max(0, Math.round(Number(priceEdits[service.id] ?? service.startingPrice)));
    const nextTurnaround = turnaroundEdits[service.id] ?? service.turnaroundEstimate;

    const res = await fetch(`/api/admin/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startingPrice: nextPrice,
        turnaroundEstimate: nextTurnaround,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setServices((prev) => prev.map((s) => (s.id === service.id ? data.service : s)));
      onCatalogMutated();
      showNotice(`Updated ${service.name}`);
    }
  };

  const handleToggleService = async (service: ServiceItem) => {
    const res = await fetch(`/api/admin/services/${service.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !service.isActive }),
    });
    if (res.ok) {
      const data = await res.json();
      setServices((prev) => prev.map((s) => (s.id === service.id ? data.service : s)));
      onCatalogMutated();
      showNotice(
        `${service.name} ${data.service.isActive ? 'enabled' : 'disabled'}`
      );
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatSlug.trim()) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCatName,
        slug: newCatSlug,
        description: newCatDesc,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => [...prev, data.category]);
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      onCatalogMutated();
      showNotice('Category added');
    } else {
      const err = await res.json();
      showNotice(err.error || 'Could not create category');
    }
  };

  const handleToggleCategory = async (cat: ServiceCategory) => {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    if (res.ok) {
      const data = await res.json();
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? data.category : c)));
      onCatalogMutated();
      showNotice(`Category ${data.category.isActive ? 'enabled' : 'disabled'}`);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceLocation: configDraft.serviceLocation,
        email: configDraft.email,
        contactNumber: configDraft.contactNumber,
        businessHours: configDraft.businessHours,
        facebookUrl: configDraft.facebookUrl,
        messengerUrl: configDraft.messengerUrl,
        whatsappUrl: configDraft.whatsappUrl,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      onConfigUpdated(updated);
      showNotice('Workshop contact settings saved');
    } else {
      const err = await res.json();
      showNotice(err.error || 'Invalid configuration fields');
    }
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141312] text-sm text-[#A39B8B]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#D97724]" />
        Verifying workshop session...
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#141312] px-4 workshop-drafting-grid">
        <div className="w-full max-w-md border border-[#EDE6D6]/15 bg-[#1B1917] p-7 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#EDE6D6]/10 pb-4">
            <div>
              <div className="text-xs font-medium text-[#D97724]">Protected Route</div>
              <h1 className="mt-0.5 font-display text-xl font-bold text-[#EDE6D6]">
                Pagawaan Owner Console
              </h1>
            </div>
            <Lock className="h-5 w-5 text-[#D97724]" aria-hidden="true" />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-[#A39B8B]">
            Enter the workshop owner passcode configured in <code className="font-mono text-[#EDE6D6]">ADMIN_ACCESS_KEY</code> to review incoming service requests and manage pricing.
          </p>

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="admin-passcode-input"
                className="block text-xs font-medium text-[#EDE6D6]"
              >
                Workshop Passcode
              </label>
              <input
                id="admin-passcode-input"
                type="password"
                autoFocus
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter owner passcode"
                className="mt-1.5 w-full min-h-[44px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 font-mono text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
              />
            </div>

            {authError && (
              <div
                role="alert"
                className="border border-[#B8443A]/60 bg-[#B8443A]/15 px-3 py-2 text-xs text-[#EDE6D6]"
              >
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 border border-[#D97724] bg-[#D97724] px-4 py-2.5 text-sm font-semibold text-[#141312] disabled:opacity-60"
            >
              {authLoading ? 'Verifying...' : 'Unlock Operations Console'}
            </button>
          </form>

          <button
            type="button"
            onClick={onExitAdmin}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-[#A39B8B] hover:text-[#EDE6D6]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Public Workshop</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141312] text-[#EDE6D6]">
      {/* Top Bar */}
      <header className="border-b border-[#EDE6D6]/12 bg-[#1B1917] px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#EDE6D6]/15 bg-[#141312] px-3 py-1.5 text-xs text-[#EDE6D6] hover:border-[#D97724]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Storefront</span>
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-[#EDE6D6]">
                Pagawaan Operations Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {toastMessage && (
              <span className="border border-[#5C8D76]/60 bg-[#5C8D76]/15 px-3 py-1.5 text-xs text-[#EDE6D6]">
                {toastMessage}
              </span>
            )}
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#EDE6D6]/15 bg-[#141312] px-3 py-1.5 text-xs text-[#EDE6D6] hover:border-[#D97724]"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <a
              href="/api/admin/requests/export"
              className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#D97724] bg-[#D97724] px-3.5 py-1.5 text-xs font-semibold text-[#141312]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex min-h-[38px] items-center gap-1.5 border border-[#EDE6D6]/15 bg-[#141312] px-3 py-1.5 text-xs text-[#A39B8B] hover:text-[#EDE6D6]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Lock</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#EDE6D6]/10 pb-4">
          {(
            [
              { id: 'requests', label: `Service Requests (${requests.length})` },
              { id: 'catalog', label: `Catalog & Pricing (${services.length})` },
              { id: 'settings', label: 'Workshop Contact Settings' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[40px] border px-4 py-2 text-xs font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-[#D97724] bg-[#D97724] text-[#141312]'
                  : 'border-[#EDE6D6]/15 bg-[#1B1917] text-[#A39B8B] hover:text-[#EDE6D6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {dataError && (
          <div className="mt-4 border border-[#B8443A]/60 bg-[#B8443A]/15 p-4 text-xs text-[#EDE6D6]">
            {dataError}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="mt-6 space-y-5">
            {/* Search + Status Filters */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {['All', ...REQUEST_STATUSES].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`border px-2.5 py-1.5 text-xs transition-colors ${
                      statusFilter === st
                        ? 'border-[#D97724] bg-[#23201D] text-[#EDE6D6]'
                        : 'border-[#EDE6D6]/10 bg-[#1B1917] text-[#A39B8B] hover:text-[#EDE6D6]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A39B8B]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reference, name, city..."
                  className="w-full min-h-[38px] border border-[#EDE6D6]/15 bg-[#1B1917] py-1.5 pl-9 pr-3 text-xs text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="border border-[#EDE6D6]/10 bg-[#1B1917] p-10 text-center text-sm text-[#A39B8B]">
                No service requests match the current filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Request Table */}
                <div className="overflow-x-auto border border-[#EDE6D6]/12 bg-[#1B1917] lg:col-span-5">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#EDE6D6]/10 bg-[#23201D] text-[#A39B8B]">
                      <tr>
                        <th className="px-3.5 py-3 font-medium">Reference</th>
                        <th className="px-3.5 py-3 font-medium">Customer</th>
                        <th className="px-3.5 py-3 font-medium">Status</th>
                        <th className="px-3.5 py-3 text-right font-medium">Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EDE6D6]/8">
                      {filteredRequests.map((req) => {
                        const isSelected = selectedRequest?.id === req.id;
                        return (
                          <tr
                            key={req.id}
                            onClick={() => setSelectedRequestId(req.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-[#2C2824]' : 'hover:bg-[#23201D]'
                            }`}
                          >
                            <td className="px-3.5 py-3 font-mono font-medium tabular-nums text-[#D97724]">
                              {req.referenceNumber}
                            </td>
                            <td className="px-3.5 py-3">
                              <div className="font-medium text-[#EDE6D6]">{req.customerName}</div>
                              <div className="text-[11px] text-[#A39B8B]">{req.location}</div>
                            </td>
                            <td className="px-3.5 py-3 text-[#EDE6D6]">{req.status}</td>
                            <td className="px-3.5 py-3 text-right font-mono tabular-nums text-[#EDE6D6]">
                              {formatPHP(req.estimatedTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Inspector Panel */}
                {selectedRequest && (
                  <div className="space-y-5 border border-[#EDE6D6]/12 bg-[#1B1917] p-6 lg:col-span-7">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EDE6D6]/10 pb-4">
                      <div>
                        <div className="font-mono text-sm font-bold text-[#D97724]">
                          {selectedRequest.referenceNumber}
                        </div>
                        <h2 className="mt-0.5 font-display text-xl font-bold text-[#EDE6D6]">
                          {selectedRequest.customerName}
                        </h2>
                        <div className="mt-1 text-xs text-[#A39B8B]">
                          Submitted {new Date(selectedRequest.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="admin-status-select"
                          className="block text-[11px] text-[#A39B8B]"
                        >
                          Workflow Status
                        </label>
                        <select
                          id="admin-status-select"
                          value={selectedRequest.status}
                          onChange={(e) =>
                            handleStatusChange(
                              selectedRequest.id,
                              e.target.value as RequestStatus
                            )
                          }
                          className="mt-1 min-h-[38px] border border-[#D97724]/50 bg-[#141312] px-3 py-1.5 text-xs font-medium text-[#EDE6D6]"
                        >
                          {REQUEST_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="admin-queue-status-select"
                          className="block text-[11px] text-[#A39B8B]"
                        >
                          Public Queue Status
                        </label>
                        <select
                          id="admin-queue-status-select"
                          value={selectedRequest.queueStatus}
                          onChange={(event) =>
                            handleQueueStatusChange(
                              selectedRequest.id,
                              event.target.value as QueueStatus
                            )
                          }
                          className="mt-1 min-h-[38px] border border-[#D97724]/50 bg-[#141312] px-3 py-1.5 text-xs font-medium text-[#EDE6D6]"
                        >
                          {QUEUE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {queueStatusError && (
                          <p role="alert" className="mt-1 max-w-48 text-[10px] text-[#B8443A]">
                            {queueStatusError}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Customer Metadata */}
                    <dl className="grid grid-cols-1 gap-3 border border-[#EDE6D6]/10 bg-[#141312] p-4 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-[#A39B8B]">Contact Number</dt>
                        <dd className="mt-0.5 font-mono text-[#EDE6D6]">
                          {selectedRequest.contactNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#A39B8B]">Email</dt>
                        <dd className="mt-0.5 text-[#EDE6D6]">
                          {selectedRequest.email || 'Not provided'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#A39B8B]">Location / Barangay</dt>
                        <dd className="mt-0.5 text-[#EDE6D6]">{selectedRequest.location}</dd>
                      </div>
                      <div>
                        <dt className="text-[#A39B8B]">Service Method &amp; Preferred Date</dt>
                        <dd className="mt-0.5 text-[#EDE6D6]">
                          {selectedRequest.serviceMethod} ·{' '}
                          <span className="font-mono">{selectedRequest.preferredDate}</span>
                        </dd>
                      </div>
                      {selectedRequest.additionalNotes && (
                        <div className="sm:col-span-2">
                          <dt className="text-[#A39B8B]">Customer Instructions</dt>
                          <dd className="mt-0.5 text-[#EDE6D6]">
                            {selectedRequest.additionalNotes}
                          </dd>
                        </div>
                      )}
                    </dl>

                    {/* Requested Items + Custom Configurations */}
                    <div>
                      <h3 className="text-xs font-semibold text-[#EDE6D6]">
                        Requested Services &amp; Configurations
                      </h3>
                      <div className="mt-2 space-y-2.5">
                        {selectedRequest.items.map((item) => (
                          <div
                            key={item.id}
                            className="border border-[#EDE6D6]/10 bg-[#141312] p-3.5 text-xs"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-semibold text-[#EDE6D6]">
                                {item.serviceName} × {item.quantity}
                              </span>
                              <span className="font-mono tabular-nums text-[#D97724]">
                                {item.estimatedPrice !== null
                                  ? formatPHP(item.estimatedPrice)
                                  : 'Custom Quotation'}
                              </span>
                            </div>
                            {Object.keys(item.configuration).length > 0 && (
                              <pre className="mt-2 overflow-x-auto bg-[#1B1917] p-2.5 font-mono text-[11px] text-[#A39B8B]">
                                {JSON.stringify(item.configuration, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-[#EDE6D6]/10 pt-3 text-xs">
                        <span className="text-[#A39B8B]">Server-Calculated Estimate</span>
                        <span className="font-mono text-base font-bold tabular-nums text-[#EDE6D6]">
                          {formatPHP(selectedRequest.estimatedTotal)}
                          {selectedRequest.hasCustomQuoteItems ? ' + Custom items' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Internal Notes */}
                    <div className="border-t border-[#EDE6D6]/10 pt-4">
                      <h3 className="text-xs font-semibold text-[#EDE6D6]">
                        Internal Workshop Notes
                      </h3>
                      <form onSubmit={handleAddNote} className="mt-2 flex gap-2">
                        <input
                          type="text"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Add technician assessment, parts quote, or schedule log..."
                          className="min-h-[40px] flex-1 border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-xs text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={savingNote || !newNote.trim()}
                          className="inline-flex min-h-[40px] items-center gap-1.5 border border-[#D97724] bg-[#D97724] px-4 py-2 text-xs font-semibold text-[#141312] disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Add Note</span>
                        </button>
                      </form>

                      <div className="mt-3 space-y-2">
                        {selectedRequest.internalNotes.length === 0 ? (
                          <p className="text-xs text-[#A39B8B]">No internal notes recorded yet.</p>
                        ) : (
                          selectedRequest.internalNotes.map((n) => (
                            <div
                              key={n.id}
                              className="border border-[#EDE6D6]/10 bg-[#141312] px-3 py-2 text-xs"
                            >
                              <div className="text-[#EDE6D6]">{n.note}</div>
                              <div className="mt-1 font-mono text-[10px] text-[#A39B8B]">
                                {new Date(n.createdAt).toLocaleString()}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'catalog' && (
          <div className="mt-6 space-y-8">
            {/* Categories Management */}
            <div className="border border-[#EDE6D6]/12 bg-[#1B1917] p-6">
              <h2 className="font-display text-base font-bold text-[#EDE6D6]">
                Service Categories
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 border border-[#EDE6D6]/10 bg-[#141312] p-3.5 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#EDE6D6]">{cat.name}</div>
                      <div className="font-mono text-[11px] text-[#A39B8B]">{cat.slug}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`border px-3 py-1.5 text-xs font-medium ${
                        cat.isActive
                          ? 'border-[#5C8D76]/60 bg-[#5C8D76]/15 text-[#EDE6D6]'
                          : 'border-[#EDE6D6]/15 bg-[#23201D] text-[#A39B8B]'
                      }`}
                    >
                      {cat.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleCreateCategory}
                className="mt-5 grid grid-cols-1 gap-3 border-t border-[#EDE6D6]/10 pt-5 sm:grid-cols-4"
              >
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name"
                  className="min-h-[40px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-xs text-[#EDE6D6]"
                />
                <input
                  type="text"
                  required
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value.toLowerCase())}
                  placeholder="slug-name"
                  className="min-h-[40px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 font-mono text-xs text-[#EDE6D6]"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Short description"
                  className="min-h-[40px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-xs text-[#EDE6D6]"
                />
                <button
                  type="submit"
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 border border-[#D97724] bg-[#D97724] px-4 py-2 text-xs font-semibold text-[#141312]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Category</span>
                </button>
              </form>
            </div>

            {/* Services Pricing & Availability */}
            <div className="overflow-x-auto border border-[#EDE6D6]/12 bg-[#1B1917]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#EDE6D6]/10 bg-[#23201D] text-[#A39B8B]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Starting Price (PHP)</th>
                    <th className="px-4 py-3 font-medium">Turnaround</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDE6D6]/8">
                  {services.map((srv) => (
                    <tr key={srv.id} className="hover:bg-[#23201D]/60">
                      <td className="px-4 py-3 font-medium text-[#EDE6D6]">{srv.name}</td>
                      <td className="px-4 py-3 text-[#A39B8B]">{srv.categoryName}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          disabled={srv.pricingType === 'custom_quote'}
                          value={priceEdits[srv.id] ?? srv.startingPrice}
                          onChange={(e) =>
                            setPriceEdits((prev) => ({ ...prev, [srv.id]: e.target.value }))
                          }
                          className="w-24 border border-[#EDE6D6]/15 bg-[#141312] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#EDE6D6] disabled:opacity-40"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={turnaroundEdits[srv.id] ?? srv.turnaroundEstimate}
                          onChange={(e) =>
                            setTurnaroundEdits((prev) => ({
                              ...prev,
                              [srv.id]: e.target.value,
                            }))
                          }
                          className="w-40 border border-[#EDE6D6]/15 bg-[#141312] px-2.5 py-1.5 text-xs text-[#EDE6D6]"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleService(srv)}
                          className={`border px-2.5 py-1 text-[11px] font-medium ${
                            srv.isActive
                              ? 'border-[#5C8D76]/60 bg-[#5C8D76]/15 text-[#EDE6D6]'
                              : 'border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B]'
                          }`}
                        >
                          {srv.isActive ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveService(srv)}
                          className="inline-flex items-center gap-1 border border-[#D97724] px-3 py-1.5 text-xs font-medium text-[#D97724] hover:bg-[#D97724] hover:text-[#141312]"
                        >
                          <Save className="h-3 w-3" />
                          <span>Save</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <form
            onSubmit={handleSaveConfig}
            className="mt-6 max-w-2xl space-y-4 border border-[#EDE6D6]/12 bg-[#1B1917] p-6"
          >
            <h2 className="font-display text-base font-bold text-[#EDE6D6]">
              Editable Workshop Contact &amp; Links
            </h2>
            <p className="text-xs text-[#A39B8B]">
              Changes here update the public contact footer and service coverage details immediately.
            </p>

            {(
              [
                ['serviceLocation', 'Service Location'],
                ['businessHours', 'Business Hours'],
                ['email', 'Email Address'],
                ['contactNumber', 'Contact Number'],
                ['facebookUrl', 'Facebook Page URL'],
                ['messengerUrl', 'Messenger Link URL'],
                ['whatsappUrl', 'WhatsApp Link URL'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#EDE6D6]">{label}</label>
                <input
                  type="text"
                  value={configDraft[key]}
                  onChange={(e) =>
                    setConfigDraft((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#141312] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                />
              </div>
            ))}

            <button
              type="submit"
              className="inline-flex min-h-[44px] items-center gap-2 border border-[#D97724] bg-[#D97724] px-5 py-2.5 text-xs font-semibold text-[#141312]"
            >
              <Save className="h-4 w-4" />
              <span>Save Workshop Settings</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
