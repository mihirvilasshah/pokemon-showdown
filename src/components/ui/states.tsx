"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { userMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

export function ErrorState({ error, title = "Something went wrong", message, onRetry, className, compact }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-bad/30 bg-bad/10 p-6 text-center",
        compact && "p-4",
        className,
      )}
    >
      <AlertTriangle className="h-6 w-6 text-bad" aria-hidden />
      <div>
        <p className="font-display font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted">{message ?? userMessage(error)}</p>
      </div>
      {onRetry && (
        <button type="button" className="btn-ghost" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line/20 p-10 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action}
    </div>
  );
}
