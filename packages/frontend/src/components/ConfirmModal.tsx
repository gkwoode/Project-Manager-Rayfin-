import { useState, type ReactNode } from 'react';

import { ErrorState } from '@/components/states';
import { Button, Modal } from '@/components/ui';
import type { MutationResult } from '@/components/useCrud';

/**
 * Confirmation for a consequential action. Stays open with the error when
 * the action fails, and closes only once it succeeds.
 */
export function ConfirmModal({
  title,
  eyebrow,
  children,
  confirmLabel,
  pendingLabel,
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  destructive?: boolean;
  onConfirm(): Promise<MutationResult<unknown>>;
  onClose(): void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const result = await onConfirm();
    if (result.ok) {
      onClose();
      return;
    }
    setPending(false);
    setError(result.error);
  }

  return (
    <Modal
      title={title}
      eyebrow={eyebrow}
      onClose={() => {
        if (!pending) onClose();
      }}
      footer={
        <div className="flex justify-end gap-200">
          {/* Focus starts on Cancel so a stray Enter never confirms. */}
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            data-autofocus
          >
            Cancel
          </Button>
          <Button
            onClick={() => void confirm()}
            disabled={pending}
            className={
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
          >
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-400 text-300 leading-400 text-popover-foreground">
        {error ? <ErrorState title="That didn't work" message={error} /> : null}
        {children}
      </div>
    </Modal>
  );
}
