import { AlertTriangle, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The states every data-backed list has to handle, in one place.
 *
 * These exist because "it works" and "it works when the list is empty, the network is
 * down, or the user has no rows yet" are different bars, and the second one is what
 * ships. Each has a deliberate shape: empty is inviting, error is actionable, loading
 * holds layout instead of collapsing it.
 */

export function LoadingState({
  rows = 3,
  className,
}: {
  readonly rows?: number;
  readonly className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-200', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-1200 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export interface EmptyStateProps {
  readonly title: string;
  /** One line on what this list is for, or how to add the first item. */
  readonly hint?: string;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-200 rounded-xl border border-dashed border-input px-600 py-1000 text-center',
        className
      )}
    >
      {icon ? (
        <div aria-hidden="true" className="text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <p className="font-heading text-400 font-semibold text-foreground">
        {title}
      </p>
      {hint ? (
        <p className="max-w-sm text-300 leading-300 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {action ? <div className="mt-200">{action}</div> : null}
    </div>
  );
}

export interface ErrorStateProps {
  readonly message: string;
  readonly title?: string;
  readonly onRetry?: () => void;
  readonly onDismiss?: () => void;
}

export function ErrorState({
  message,
  title = "That didn't work",
  onRetry,
  onDismiss,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-300 rounded-xl border border-destructive/40 bg-destructive/5 px-400 py-300 text-foreground"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-100-nudge icon-size-200 shrink-0 text-destructive"
      />
      <div className="min-w-0 flex-1 text-300 leading-300">
        <p className="font-semibold">{title}</p>
        <p className="mt-100 text-muted-foreground">{message}</p>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg px-200 py-100 text-200 font-semibold text-brand-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-100 text-muted-foreground hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X aria-hidden="true" className="icon-size-200" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Confirmation for an irreversible action.
 *
 * Deliberately requires the caller to name the thing being deleted: "Delete this
 * item?" is a prompt people click through without reading.
 */
export interface ConfirmDeleteProps {
  readonly label: string;
  /** Extra consequence, e.g. "and its 4 tasks". */
  readonly detail?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly pending?: boolean;
}

export function ConfirmDelete({
  label,
  detail,
  onConfirm,
  onCancel,
  pending,
}: ConfirmDeleteProps) {
  return (
    <div
      role="alertdialog"
      aria-label={`Delete ${label}`}
      className="flex flex-wrap items-center gap-300 rounded-xl border border-destructive/40 bg-destructive/5 px-400 py-300 text-300 leading-300"
    >
      <span className="min-w-0 flex-1">
        Delete <strong>{label}</strong>
        {detail ? ` ${detail}` : ''}? This can't be undone.
      </span>
      <div className="flex gap-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg px-300 py-200-nudge font-medium hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-lg bg-destructive px-300 py-200-nudge font-semibold text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
