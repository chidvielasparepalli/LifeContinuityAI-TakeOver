import { LoaderCircle } from "lucide-react";

interface LoadingStateProps {
  label?: string;
  compact?: boolean;
}

export default function LoadingState({
  label = "Loading your continuity workspace",
  compact = false,
}: LoadingStateProps) {
  return (
    <div
      className={`lc-loading-state ${compact ? "lc-loading-state-compact" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="lc-spinner-wrap">
        <LoaderCircle className="lc-spinner" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-[var(--lc-text)]">{label}</p>
        <p className="text-xs text-[var(--lc-muted)]">Secure data is being prepared.</p>
      </div>
    </div>
  );
}
