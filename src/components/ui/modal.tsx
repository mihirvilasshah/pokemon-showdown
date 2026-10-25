"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** Optional element rendered next to the title. */
  headerExtra?: ReactNode;
}

/** Built on native <dialog>: focus trapping, Escape to close and inert background for free. */
export function Modal({ open, onClose, title, children, className, headerExtra }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[92dvh] w-[min(1100px,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-line/15 bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/70",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-line/10 px-4 py-3 sm:px-6">
            <h2 className="font-display text-lg font-bold">{title}</h2>
            <div className="flex items-center gap-2">
              {headerExtra}
              <button type="button" className="btn-icon" onClick={onClose} aria-label="Close dialog">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      )}
    </dialog>
  );
}
