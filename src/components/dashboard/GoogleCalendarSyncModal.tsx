import React, { useEffect, useRef } from "react";
import { Calendar, RefreshCw, ShieldAlert, Plus, ShieldCheck } from "lucide-react";

interface GoogleCalendarSyncModalProps {
  isGoogleAuthorized: boolean;
  isGoogleSyncing: boolean;
  isGoogleAuthorizing: boolean;
  onAuthorize: () => void;
  onSync: () => void;
  onClose: () => void;
}

export default function GoogleCalendarSyncModal({
  isGoogleAuthorized,
  isGoogleSyncing,
  isGoogleAuthorizing,
  onAuthorize,
  onSync,
  onClose,
}: GoogleCalendarSyncModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-[#1e233a]/80 backdrop-blur-sm flex items-center justify-center p-4 text-[#e0dafc]" id="modal-calendar-sync" role="dialog" aria-modal="true" aria-labelledby="calendar-sync-modal-title">
      <div className="lc-panel max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#5d6fa3]/20 pb-3">
          <h4 className="font-bold text-white text-base" id="calendar-sync-modal-title">Google Calendar Synchronization</h4>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            className="lc-btn-secondary min-h-0 px-3 py-1.5 text-xs"
            aria-label="Close calendar synchronization dialog"
          >
            Close
          </button>
        </div>

        {/* Calendar Connector block (matching image style beautifully) */}
        <div className="bg-[#1e233a]/60 border border-[#5d6fa3]/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-[#2c3353] flex items-center justify-center border border-[#5d6fa3]/25 shrink-0 shadow-md">
              <Calendar className="h-5.5 w-5.5 text-[#e0dafc]" />
            </div>
            <div>
              <h5 className="font-extrabold text-white text-base">Calendar Connector</h5>
              <p className={`text-xs font-semibold mt-0.5 ${
                isGoogleAuthorized ? "text-emerald-400" : "text-[#5d6fa3]"
              }`}>
                {isGoogleAuthorized ? "Authorized Google Calendar Sync" : "Connection Pending Authorization"}
              </p>
            </div>
          </div>

          <p className="text-xs text-[#5d6fa3] leading-relaxed">
            Connect Google Calendar to synchronize medical visits, insurance renewals, and school schedules automatically. Synced events automatically update your emergency nominee continuity plan.
          </p>

          <div className="space-y-2.5 pt-1">
            {/* Authorize Button */}
            <button
              type="button"
              onClick={onAuthorize}
              disabled={isGoogleAuthorizing}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isGoogleAuthorized 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "bg-[#e0dafc] hover:brightness-110 text-[#2c3353]"
              }`}
            >
              {isGoogleAuthorizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-[#2c3353]" />
                  Authenticating Account...
                </>
              ) : isGoogleAuthorized ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Authorized Google Calendar
                </>
              ) : (
                <>
                  Authorize Google Calendar
                  <Plus className="h-3.5 w-3.5 rotate-45" />
                </>
              )}
            </button>

            {/* Sync Calendar Button */}
            <button
              type="button"
              onClick={onSync}
              disabled={isGoogleSyncing || !isGoogleAuthorized}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isGoogleSyncing
                  ? "bg-[#1e233a] border-[#5d6fa3]/30 text-white"
                  : !isGoogleAuthorized
                  ? "bg-[#2c3353]/30 border-[#5d6fa3]/10 text-[#5d6fa3] cursor-not-allowed"
                  : "bg-[#2c3353] border-[#5d6fa3]/40 text-[#e0dafc] hover:bg-[#2c3353]/80"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGoogleSyncing ? "animate-spin" : ""}`} />
              {isGoogleSyncing ? "Syncing Calendar Schedule..." : "Sync Calendar Schedule"}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-[#5d6fa3]/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1e233a] hover:bg-[#1e233a]/80 text-[#5d6fa3] text-xs rounded-xl font-bold border border-[#5d6fa3]/20 cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
