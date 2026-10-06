import React from "react";
import { Calendar, RefreshCw, ShieldAlert, Plus, ShieldCheck, X } from "lucide-react";

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
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" id="modal-calendar-sync">
      <div className="app-card max-w-md w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Google Calendar Synchronization</h4>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Calendar Connector block */}
        <div className="app-card-elevated p-5 space-y-4 border border-slate-200 dark:border-slate-700/70">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="h-5.5 w-5.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h5 className="font-bold text-slate-900 dark:text-white text-base">Calendar Connector</h5>
              <p className={`text-xs font-semibold mt-0.5 ${
                isGoogleAuthorized ? "text-emerald-500 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"
              }`}>
                {isGoogleAuthorized ? "Authorized Google Calendar Sync" : "Connection Pending Authorization"}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Connect Google Calendar to synchronize medical visits, insurance renewals, and school schedules automatically. Synced events automatically update your emergency nominee continuity plan.
          </p>

          <div className="space-y-2.5 pt-1">
            {/* Authorize Button */}
            <button
              type="button"
              onClick={onAuthorize}
              disabled={isGoogleAuthorizing}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                isGoogleAuthorized 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  : "btn-primary"
              }`}
            >
              {isGoogleAuthorizing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Authenticating Account...
                </>
              ) : isGoogleAuthorized ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
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
                  ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  : !isGoogleAuthorized
                  ? "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                  : "btn-secondary"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGoogleSyncing ? "animate-spin" : ""}`} />
              {isGoogleSyncing ? "Syncing Calendar Schedule..." : "Sync Calendar Schedule"}
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
}
