import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Minus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { formatPHP } from '../config/pricing';
import { apiFetch } from '../config/api';
import {
  SERVICE_METHODS,
  customerRequestSchema,
  type CartServiceItem,
  type CustomerRequestFormValues,
  type ServiceRequestRecord,
} from '../types/pagawaan';

interface RequestDrawerProps {
  open: boolean;
  items: CartServiceItem[];
  onClose: () => void;
  onUpdateQty: (uid: string, delta: number) => void;
  onRemoveItem: (uid: string) => void;
  onClearItems: () => void;
  onRequestSubmitted: (record: ServiceRequestRecord) => void;
}

export function RequestDrawer({
  open,
  items,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearItems,
  onRequestSubmitted,
}: RequestDrawerProps) {
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState<'cart' | 'review' | 'receipt'>('cart');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedReceipt, setSubmittedReceipt] = useState<ServiceRequestRecord | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerRequestFormValues>({
    resolver: zodResolver(customerRequestSchema),
    defaultValues: {
      customerName: '',
      contactNumber: '',
      email: '',
      location: '',
      serviceMethod: 'Walk-in / meet-up by arrangement',
      preferredDate: '',
      additionalNotes: '',
      confirmedDisclaimer: undefined as unknown as true,
      websiteHoneypot: '',
    },
  });

  const watchedCustomer = watch();

  const estimatedSubtotal = items.reduce(
    (sum, item) => sum + (item.estimatedPrice ?? 0),
    0
  );
  const hasCustomQuote = items.some((item) => item.estimatedPrice === null);

  const handleClose = () => {
    if (step === 'receipt') {
      setStep('cart');
      setSubmittedReceipt(null);
    }
    onClose();
  };

  const onSubmitFinal = async (customerData: CustomerRequestFormValues) => {
    setSubmitError(null);
    try {
      const response = await apiFetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerData,
          items: items.map((i) => ({
            serviceId: i.serviceId,
            quantity: i.quantity,
            configuration: i.configuration,
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to submit request.');
      }

      setSubmittedReceipt(payload.request);
      onRequestSubmitted(payload.request);
      onClearItems();
      reset();
      setStep('receipt');
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Network error submitting request.'
      );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Service request tray and quotation form"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
          />

          <motion.aside
            initial={prefersReducedMotion ? { opacity: 1 } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#EDE6D6]/15 bg-[#141312] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#EDE6D6]/12 bg-[#1B1917] px-6 py-4">
              <div>
                <div className="text-xs font-medium text-[#D97724]">
                  {step === 'receipt'
                    ? 'Request Logged'
                    : step === 'review'
                      ? 'Step 2 of 2 · Confirm Quotation Request'
                      : 'Service Request Tray'}
                </div>
                <h2 className="font-display text-lg font-bold text-[#EDE6D6]">
                  {step === 'receipt'
                    ? 'Submission Receipt'
                    : 'Quotation & Customer Details'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close service request drawer"
                className="flex h-10 w-10 items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] text-[#A39B8B] hover:text-[#EDE6D6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {step === 'receipt' && submittedReceipt ? (
                <div className="space-y-6">
                  <div className="border border-[#5C8D76]/60 bg-[#5C8D76]/10 p-5">
                    <div className="flex items-center gap-2.5 text-[#5C8D76]">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span className="font-display text-base font-bold text-[#EDE6D6]">
                        Request Submitted for Review
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#EDE6D6]/90">
                      Your request has been submitted. Pagawaan will review your requirements and
                      contact you to confirm the final quotation and service schedule.
                    </p>
                  </div>

                  <div className="border border-[#EDE6D6]/15 bg-[#1B1917] p-5">
                    <div className="text-xs text-[#A39B8B]">Reference Number</div>
                    <div className="mt-1 font-mono text-2xl font-bold tracking-tight tabular-nums text-[#D97724]">
                      {submittedReceipt.referenceNumber}
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-[#EDE6D6]/10 pt-4 text-xs sm:grid-cols-2">
                      <div>
                        <span className="text-[#A39B8B]">Customer: </span>
                        <span className="text-[#EDE6D6]">{submittedReceipt.customerName}</span>
                      </div>
                      <div>
                        <span className="text-[#A39B8B]">Contact: </span>
                        <span className="font-mono text-[#EDE6D6]">
                          {submittedReceipt.contactNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#A39B8B]">Location: </span>
                        <span className="text-[#EDE6D6]">{submittedReceipt.location}</span>
                      </div>
                      <div>
                        <span className="text-[#A39B8B]">Method: </span>
                        <span className="text-[#EDE6D6]">{submittedReceipt.serviceMethod}</span>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#EDE6D6]/10 pt-4">
                      <div className="text-xs font-medium text-[#EDE6D6]">Requested Items</div>
                      <ul className="mt-2 space-y-2 text-xs">
                        {submittedReceipt.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-baseline justify-between gap-3 text-[#A39B8B]"
                          >
                            <span>
                              {item.serviceName} × {item.quantity}
                            </span>
                            <span className="font-mono tabular-nums text-[#EDE6D6]">
                              {item.estimatedPrice !== null
                                ? formatPHP(item.estimatedPrice)
                                : 'Custom Quote'}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-baseline justify-between border-t border-[#EDE6D6]/10 pt-3">
                        <span className="text-xs text-[#A39B8B]">
                          Preliminary Estimated Total
                        </span>
                        <span className="font-mono text-base font-bold tabular-nums text-[#EDE6D6]">
                          {formatPHP(submittedReceipt.estimatedTotal)}
                          {submittedReceipt.hasCustomQuoteItems ? ' + Custom items' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="min-h-[44px] w-full border border-[#D97724] bg-[#D97724] px-5 py-3 text-sm font-semibold text-[#141312]"
                  >
                    Return to Workshop
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="border border-[#EDE6D6]/12 bg-[#1B1917] p-8 text-center">
                  <ClipboardCheck
                    className="mx-auto h-8 w-8 text-[#A39B8B]"
                    aria-hidden="true"
                  />
                  <h3 className="mt-3 font-display text-base font-semibold text-[#EDE6D6]">
                    No services selected yet
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#A39B8B]">
                    Browse the service catalog or configure a custom Ethernet cable to start your
                    quotation request. No login or account is required.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-5 min-h-[40px] border border-[#D97724] bg-[#D97724] px-4 py-2 text-xs font-semibold text-[#141312]"
                  >
                    Browse Services
                  </button>
                </div>
              ) : (
                <form
                  id="customer-request-form"
                  onSubmit={handleSubmit(onSubmitFinal)}
                  className="space-y-6"
                >
                  {/* Selected Services List */}
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-[#EDE6D6]">
                        Selected Services ({items.length})
                      </h3>
                      <button
                        type="button"
                        onClick={onClearItems}
                        className="text-xs text-[#A39B8B] hover:text-[#B8443A]"
                      >
                        Clear Selection
                      </button>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <motion.div
                            key={item.uid}
                            layout={!prefersReducedMotion}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
                            transition={{ duration: 0.16 }}
                            className="border border-[#EDE6D6]/12 bg-[#1B1917] p-3.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-[#EDE6D6]">
                                  {item.serviceName}
                                </div>
                                <div className="mt-0.5 text-[11px] text-[#A39B8B]">
                                  {item.categoryName}
                                </div>
                              </div>
                              <button
                                type="button"
                                aria-label={`Remove ${item.serviceName}`}
                                onClick={() => onRemoveItem(item.uid)}
                                className="p-1 text-[#A39B8B] hover:text-[#B8443A]"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Configuration key/values */}
                            {Object.keys(item.configuration).length > 0 && (
                              <dl className="mt-2.5 grid grid-cols-1 gap-1 border-t border-[#EDE6D6]/8 pt-2 text-[11px]">
                                {Object.entries(item.configuration)
                                  .filter(([, val]) => String(val).trim() !== '')
                                  .map(([k, val]) => (
                                    <div key={k} className="flex justify-between gap-2">
                                      <dt className="capitalize text-[#A39B8B]">
                                        {k.replace(/([A-Z])/g, ' $1')}:
                                      </dt>
                                      <dd className="text-right text-[#EDE6D6]/90">
                                        {String(val)}
                                      </dd>
                                    </div>
                                  ))}
                              </dl>
                            )}

                            <div className="mt-3 flex items-center justify-between border-t border-[#EDE6D6]/8 pt-2.5">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label="Decrease quantity"
                                  onClick={() => onUpdateQty(item.uid, -1)}
                                  className="flex h-7 w-7 items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] text-[#EDE6D6]"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="w-6 text-center font-mono text-xs tabular-nums">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  aria-label="Increase quantity"
                                  onClick={() => onUpdateQty(item.uid, 1)}
                                  className="flex h-7 w-7 items-center justify-center border border-[#EDE6D6]/15 bg-[#141312] text-[#EDE6D6]"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="font-mono text-xs font-semibold tabular-nums text-[#D97724]">
                                {item.estimatedPrice !== null
                                  ? formatPHP(item.estimatedPrice)
                                  : 'Custom Quote'}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between border border-[#EDE6D6]/12 bg-[#23201D] px-4 py-3">
                      <span className="text-xs text-[#A39B8B]">
                        Preliminary Estimated Subtotal
                      </span>
                      <span className="font-mono text-lg font-bold tabular-nums text-[#EDE6D6]">
                        {formatPHP(estimatedSubtotal)}
                        {hasCustomQuote ? ' + Custom' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Step Toggle: Customer Form vs Review */}
                  {step === 'cart' ? (
                    <div className="space-y-4 border-t border-[#EDE6D6]/10 pt-5">
                      <div>
                        <h3 className="font-display text-sm font-semibold text-[#EDE6D6]">
                          Your Contact &amp; Service Details
                        </h3>
                        <p className="mt-0.5 text-xs text-[#A39B8B]">
                          No login required—just enter your name and how we can reach you.
                        </p>
                      </div>

                      {/* Anti-spam honeypot */}
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="hidden"
                        {...register('websiteHoneypot')}
                      />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-[#EDE6D6]">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            placeholder="Juan Dela Cruz"
                            {...register('customerName')}
                            className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                          />
                          {errors.customerName && (
                            <p className="mt-1 text-xs text-[#B8443A]">
                              {errors.customerName.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#EDE6D6]">
                            Contact Number *
                          </label>
                          <input
                            type="tel"
                            placeholder="0917 123 4567"
                            {...register('contactNumber')}
                            className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 font-mono text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                          />
                          {errors.contactNumber && (
                            <p className="mt-1 text-xs text-[#B8443A]">
                              {errors.contactNumber.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-medium text-[#EDE6D6]">
                            Email (Optional)
                          </label>
                          <input
                            type="email"
                            placeholder="you@example.com"
                            {...register('email')}
                            className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-[#B8443A]">
                              {errors.email.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-[#EDE6D6]">
                            Preferred Date / Window *
                          </label>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            {...register('preferredDate')}
                            className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 font-mono text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                          />
                          {errors.preferredDate && (
                            <p className="mt-1 text-xs text-[#B8443A]">
                              {errors.preferredDate.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#EDE6D6]">
                          Location / Barangay (Metro Manila) *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Brgy. Kapitolyo, Pasig City"
                          {...register('location')}
                          className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                        />
                        {errors.location && (
                          <p className="mt-1 text-xs text-[#B8443A]">
                            {errors.location.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#EDE6D6]">
                          Preferred Service Method *
                        </label>
                        <select
                          {...register('serviceMethod')}
                          className="mt-1.5 w-full min-h-[42px] border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                        >
                          {SERVICE_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#EDE6D6]">
                          Additional Instructions (Optional)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Landmarks, preferred contact channel, or extra device notes..."
                          {...register('additionalNotes')}
                          className="mt-1.5 w-full border border-[#EDE6D6]/15 bg-[#1B1917] px-3 py-2 text-sm text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
                        />
                      </div>

                      <div className="border border-[#EDE6D6]/12 bg-[#1B1917] p-3.5">
                        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#EDE6D6]/90">
                          <input
                            type="checkbox"
                            {...register('confirmedDisclaimer')}
                            className="mt-0.5 h-4 w-4 accent-[#D97724]"
                          />
                          <span>
                            I understand that submitting this request is for quotation and
                            scheduling review—it is not an automatically confirmed appointment or
                            accepted job, and final pricing may change upon assessment.
                          </span>
                        </label>
                        {errors.confirmedDisclaimer && (
                          <p className="mt-1.5 text-xs text-[#B8443A]">
                            {errors.confirmedDisclaimer.message}
                          </p>
                        )}
                      </div>

                      {submitError && (
                        <div
                          role="alert"
                          className="border border-[#B8443A]/60 bg-[#B8443A]/15 px-4 py-3 text-xs text-[#EDE6D6]"
                        >
                          {submitError}
                        </div>
                      )}

                      <div className="flex flex-col gap-2.5 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setStep('review')}
                          className="min-h-[44px] flex-1 border border-[#EDE6D6]/20 bg-[#1B1917] px-4 py-2.5 text-xs font-semibold text-[#EDE6D6] hover:border-[#D97724]"
                        >
                          Review Order Summary
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex min-h-[44px] flex-[1.4] items-center justify-center gap-2 border border-[#D97724] bg-[#D97724] px-5 py-2.5 text-xs font-semibold text-[#141312] hover:bg-[#e58432] disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Submitting Request...</span>
                            </>
                          ) : (
                            <span>Submit Service Request</span>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Review Summary View */
                    <div className="space-y-4 border-t border-[#EDE6D6]/10 pt-5">
                      <h3 className="font-display text-sm font-semibold text-[#EDE6D6]">
                        Order Summary Verification
                      </h3>
                      <div className="space-y-2 border border-[#EDE6D6]/12 bg-[#1B1917] p-4 text-xs">
                        <div className="flex justify-between gap-2">
                          <span className="text-[#A39B8B]">Customer Name:</span>
                          <span className="font-medium text-[#EDE6D6]">
                            {watchedCustomer.customerName || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#A39B8B]">Contact Number:</span>
                          <span className="font-mono text-[#EDE6D6]">
                            {watchedCustomer.contactNumber || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#A39B8B]">Location:</span>
                          <span className="text-[#EDE6D6]">
                            {watchedCustomer.location || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#A39B8B]">Method:</span>
                          <span className="text-[#EDE6D6]">{watchedCustomer.serviceMethod}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#A39B8B]">Preferred Date:</span>
                          <span className="font-mono text-[#EDE6D6]">
                            {watchedCustomer.preferredDate || '—'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-[#A39B8B]">
                        Terms: Introductory estimates do not include replacement hardware parts or
                        special on-site travel unless explicitly itemized in the final quotation.
                      </p>

                      {submitError && (
                        <div
                          role="alert"
                          className="border border-[#B8443A]/60 bg-[#B8443A]/15 px-4 py-3 text-xs text-[#EDE6D6]"
                        >
                          {submitError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setStep('cart')}
                          className="min-h-[44px] flex-1 border border-[#EDE6D6]/20 px-4 py-2 text-xs font-medium text-[#EDE6D6]"
                        >
                          Edit Details
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex min-h-[44px] flex-[1.5] items-center justify-center gap-2 border border-[#D97724] bg-[#D97724] px-5 py-2 text-xs font-semibold text-[#141312] disabled:opacity-60"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <span>Confirm &amp; Submit Request</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
