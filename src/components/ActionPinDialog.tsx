import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface ActionPinDialogProps {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: (pin: string) => Promise<void>;
}

export function ActionPinDialog({
  title,
  description,
  onCancel,
  onConfirm,
}: ActionPinDialogProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitPin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onConfirm(pin);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to verify PIN.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel();
      }}
    >
      <form
        onSubmit={submitPin}
        aria-labelledby="action-pin-title"
        className="w-full max-w-sm border border-[#D97724]/40 bg-[#1B1917] p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-1 h-5 w-5 shrink-0 text-[#D97724]" aria-hidden="true" />
            <div>
              <h2 id="action-pin-title" className="font-display text-lg font-semibold text-[#EDE6D6]">
                {title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#A39B8B]">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Close PIN prompt"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#A39B8B] hover:text-[#EDE6D6]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <label htmlFor="action-pin-input" className="mt-5 block text-xs text-[#A39B8B]">
          Admin PIN
        </label>
        <input
          id="action-pin-input"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={32}
          autoFocus
          required
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mt-1.5 min-h-11 w-full border border-[#EDE6D6]/20 bg-[#141312] px-3 font-mono text-lg tracking-[0.3em] text-[#EDE6D6] focus:border-[#D97724] focus:outline-none"
        />
        {error && (
          <p role="alert" className="mt-2 text-xs text-[#E58A80]">
            {error}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-10 border border-[#EDE6D6]/15 px-4 text-xs text-[#EDE6D6] hover:border-[#EDE6D6]/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !pin}
            className="min-h-10 border border-[#D97724] bg-[#D97724] px-4 text-xs font-semibold text-[#141312] hover:bg-[#e58432] disabled:opacity-50"
          >
            {submitting ? 'Verifying…' : 'Confirm'}
          </button>
        </div>
      </form>
    </div>
  );
}
