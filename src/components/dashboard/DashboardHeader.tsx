import React from "react";
import { Flame, RefreshCw, ShieldCheck } from "lucide-react";
import { CheckInStats } from "../../types";

interface DashboardHeaderProps {
  stats: CheckInStats | null;
  isCheckingIn: boolean;
  onManualCheckIn: () => void;
  getStatusBadgeClass: (status: string) => string;
}

export default function DashboardHeader({
  stats,
  isCheckingIn,
  onManualCheckIn,
  getStatusBadgeClass,
}: DashboardHeaderProps) {
  return (
    <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" id="dashboard-header-banner">
      <div className="flex items-center gap-4">
        <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
          <Flame className="h-7 w-7 animate-pulse text-amber-500" />
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex flex-wrap items-center gap-2.5">
            Lighthouse Safety Check-in Dashboard
            {stats && (
              <span className={`app-badge ${getStatusBadgeClass(stats.status)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                {stats.status}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Daily proof-of-life status. Checking in automatically postpones emergency nominee handover triggers.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 shrink-0">
        <div className="text-left md:text-right border-l md:border-l-0 md:border-r border-slate-200 dark:border-slate-800 pl-4 md:pl-0 md:pr-6">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">Active Safety Streak</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5 md:justify-end mt-0.5">
            {stats?.currentStreak || 0}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">days</span>
          </p>
        </div>
        
        <button
          onClick={onManualCheckIn}
          disabled={isCheckingIn}
          className={`btn-primary text-xs uppercase tracking-wider py-3 px-6 ${
            isCheckingIn ? "opacity-75 cursor-not-allowed" : ""
          }`}
          id="btn-safety-checkin-dashboard"
        >
          {isCheckingIn ? (
            <RefreshCw className="h-4 w-4 animate-spin text-white" />
          ) : (
            <ShieldCheck className="h-4.5 w-4.5 text-white" />
          )}
          {isCheckingIn ? "Verifying Presence..." : "I'm Safe — Check In Now"}
        </button>
      </div>
    </div>
  );
}
