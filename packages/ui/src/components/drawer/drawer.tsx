import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Edge the panel slides in from. Defaults to `left`. */
  side?: 'left' | 'right';
  /** Applied to the panel. */
  className?: string;
  children: ReactNode;
};

/**
 * Modal side panel, e.g. navigation on small screens. Built on Headless UI's
 * Dialog: focus is trapped inside, Escape and backdrop clicks close it, and
 * focus returns to the opener. Motion is skipped with reduced motion.
 */
export function Drawer({
  open,
  onClose,
  label,
  side = 'left',
  className,
  children,
}: DrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-label={label}
      className="relative z-50"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/40 transition-opacity duration-200 ease-out data-closed:opacity-0 motion-reduce:transition-none"
      />
      <DialogPanel
        transition
        className={cn(
          'fixed inset-y-0 flex w-80 max-w-[85vw] flex-col bg-surface shadow-xl transition-transform duration-200 ease-out motion-reduce:transition-none',
          side === 'left'
            ? 'left-0 data-closed:-translate-x-full'
            : 'right-0 data-closed:translate-x-full',
          className,
        )}
      >
        {children}
      </DialogPanel>
    </Dialog>
  );
}
