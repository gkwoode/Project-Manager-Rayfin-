import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80',
  secondary:
    'border border-input bg-card text-card-foreground hover:bg-hover active:bg-muted',
  ghost: 'text-foreground hover:bg-hover active:bg-muted',
  danger: 'text-destructive hover:bg-destructive/10 active:bg-destructive/15',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-800 gap-100 px-300 text-[length:var(--text-200)]',
  md: 'h-1000 gap-200 px-400 text-[length:var(--text-300)]',
  icon: 'size-1000 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center rounded-lg font-semibold whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}

/** Shared look for text inputs, selects, and text areas. */
export const controlClass =
  'w-full rounded-lg border border-input bg-card px-300 py-200 text-300 leading-300 text-card-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60';

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-100', className)}>
      <label
        htmlFor={htmlFor}
        className="text-200 font-semibold tracking-wide text-muted-foreground uppercase"
      >
        {label}
      </label>
      {children}
      {hint ? (
        <div className="text-200 leading-200 text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

/** Small uppercase label with the wide tracking of the "Infosystems" wordmark. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'text-[length:var(--text-100)] leading-100 font-semibold tracking-wordmark uppercase',
        className
      )}
    >
      {children}
    </p>
  );
}

/**
 * A modal on the native `<dialog>`: the browser supplies the top layer, focus
 * containment, inert background, and Escape to close. Mount it to open it and
 * unmount it to close it, so each opening starts with fresh form state.
 */
export function Modal({
  title,
  eyebrow,
  onClose,
  children,
  footer,
}: {
  title: string;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    // Opening focuses the first focusable element (the close button), so move
    // focus to the field marked as the starting point.
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onMouseDown={(event) => {
        // A press on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose();
      }}
      className="m-auto max-h-[calc(100dvh-var(--spacing-1000))] w-[calc(100%-var(--spacing-800))] max-w-dialog overflow-hidden rounded-2xl border border-border bg-popover p-none text-popover-foreground shadow-2xl backdrop:bg-scrim"
    >
      <div className="flex max-h-[calc(100dvh-var(--spacing-1000))] flex-col">
        <header className="flex items-start gap-300 border-b border-border px-600 pt-500 pb-400">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <Eyebrow className="mb-100 text-brand-foreground">{eyebrow}</Eyebrow>
            ) : null}
            <h2
              id={titleId}
              className="text-500 leading-500 font-semibold text-popover-foreground"
            >
              {title}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="-mr-200"
          >
            <X aria-hidden="true" className="icon-size-300" />
          </Button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-600 py-500">
          {children}
        </div>
        {footer ? (
          <footer className="border-t border-border bg-background/60 px-600 py-400">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}

/**
 * The signature meter: a row of capsules, like the dashes that build the
 * Reliance sphere, filled in crimson as work is done.
 */
export function CapsuleMeter({
  done,
  total,
  segments = 12,
  onDark = false,
  className,
  label,
}: {
  done: number;
  total: number;
  segments?: number;
  onDark?: boolean;
  className?: string;
  label: string;
}) {
  const ratio = total === 0 ? 0 : done / total;
  // Any progress shows at least one capsule; only finished work fills them all.
  let filled = Math.round(ratio * segments);
  if (done > 0 && filled === 0) filled = 1;
  if (done < total && filled === segments) filled = segments - 1;
  const percent = Math.round(ratio * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={
        total === 0 ? 'No tasks yet' : `${done} of ${total} tasks done`
      }
      className={cn('flex items-center gap-100-nudge', className)}
    >
      {Array.from({ length: segments }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-200-nudge min-w-0 flex-1 rounded-full transition-colors duration-500',
            i < filled
              ? 'bg-primary'
              : onDark
                ? 'bg-sidebar-border'
                : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}
