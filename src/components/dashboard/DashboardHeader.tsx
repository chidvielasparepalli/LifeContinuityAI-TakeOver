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
    <div className="lc-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6" id="dashboard-header-banner">
      <div className="flex items-center gap-4">
        <div className="lc-panel-raised h-12 w-12 rounded-xl flex items-center justify-center text-[#e0dafc]">
          <Flame className="h-6 w-6 animate-pulse text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white flex flex-wrap items-center gap-2 tracking-tight">
            Lighthouse Safety Check-in Dashboard
            {stats && (
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getStatusBadgeClass(stats.status)}`}>
                {stats.status}
              </span>
            )}
          </h2>
          <p className="text-xs text-[#5d6fa3] mt-1">
            Daily proof-of-life status. Checking in postpones automated emergency nominee triggers.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 shrink-0">
        <div className="text-left md:text-right">
          <p className="text-[10px] text-[#5d6fa3] uppercase font-bold tracking-widest">Current Streak</p>
          <p className="text-2xl font-black text-[#e0dafc] flex items-center gap-1 md:justify-end">
            {stats?.currentStreak || 0}
            <span className="text-xs text-[#5d6fa3] font-normal">days consecutive</span>
          </p>
        </div>
        
        <button
          type="button"
          onClick={onManualCheckIn}
          disabled={isCheckingIn}
          className={`lc-btn-primary text-sm py-3 px-6 shadow-lg transition-all gap-2 cursor-pointer ${
            isCheckingIn ? "opacity-75 cursor-not-allowed" : ""
          }`}
          id="btn-safety-checkin-dashboard"
        >
          {isCheckingIn ? (
            <RefreshCw className="h-4.5 w-4.5 text-[#2c3353] animate-spin" />
          ) : (
            <ShieldCheck className="h-4.5 w-4.5 text-[#2c3353]" />
          )}
          {isCheckingIn ? "Verifying..." : "I'm Safe — Check In Now"}
        </button>
      </div>
    </div>
  );
}
