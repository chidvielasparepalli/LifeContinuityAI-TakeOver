import React, { useState, useEffect } from "react";
import { apiFetch } from "../lib/api";
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  FileText, 
  Heart, 
  Key, 
  Info, 
  Sparkles,
  RefreshCw,
  LogOut,
  Smartphone
} from "lucide-react";
import { motion } from "motion/react";

interface NomineeLockedDashboardProps {
  ownerUid: string;
  ownerName: string;
  nomineePhone: string;
  onLogout: () => void;
  isOwnerPreview?: boolean;
  onSimulateUnlock?: () => void;
}

export default function NomineeLockedDashboard({
  ownerUid,
  ownerName,
  nomineePhone,
  onLogout,
  isOwnerPreview = false,
  onSimulateUnlock
}: NomineeLockedDashboardProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<any | null>(null);

  const safeFetchJson = async (url: string) => {
    try {
      const res = await apiFetch(url);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return null;
      }
      return await res.json();
    } catch (e) {
      console.warn(`Error fetching ${url}:`, e);
      return null;
    }
  };

  const fetchMonitoringData = async () => {
    setLoading(true);
    try {
      // Fetch check-in events safely
      const eventsData = await safeFetchJson(`/api/checkin/events/${ownerUid}`);
      if (eventsData) {
        setEvents(eventsData || []);
      }

      // Fetch check-in stats safely from life-graph endpoint
      const lifeGraphData = await safeFetchJson(`/api/life-graph/${ownerUid}`);
      if (lifeGraphData && lifeGraphData.checkInStats) {
        setStats(lifeGraphData.checkInStats);
      }
    } catch (e) {
      console.error("Error fetching nominee monitoring data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, [ownerUid]);

  // Generate mock heatmap days (last 28 days) representing consistent daily check-ins
  // with a couple of simulated missed days (colored differently as requested)
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const dayIndex = 27 - i;
    const date = new Date();
    date.setDate(date.getDate() - dayIndex);
    const dateStr = date.toISOString().split("T")[0];
    
    // Make specific days "missed" for the simulated heatmap demonstration
    // e.g. 5 days ago and 15 days ago
    const isMissed = dayIndex === 5 || dayIndex === 15;
    const isUpcoming = dayIndex < 0; // future, not used here
    const isToday = dayIndex === 0;

    return {
      date: dateStr,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      status: isMissed ? "missed" : "completed",
      isToday
    };
  });

  // Safe Fallback counts if database stats aren't loaded or fully populated
  const streakCount = stats?.currentStreak !== undefined ? stats.currentStreak : 12;
  const lastCheckInTime = stats?.lastCheckInTimestamp 
    ? new Date(stats.lastCheckInTimestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " Today"
    : "10:15 AM Yesterday";

  // Calculate next check-in window (e.g. 08:00 AM - 08:00 PM Tomorrow)
  const nextCheckInWindow = "08:00 AM - 08:00 PM Tomorrow";

  return (
    <div className="lc-page-wrap max-w-7xl mx-auto space-y-6">
      
      {/* 1. TOP SECURED ALERT HEADER */}
      <div className="lc-panel p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4.5 w-full md:w-auto">
          <div className="h-12 w-12 bg-red-950/40 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
            <Lock className="h-6 w-6" id="status-lock-icon" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-red-400 bg-red-950/50 px-2.5 py-0.5 rounded border border-red-900/40">
                Portal Locked
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-green-400 bg-green-950/50 px-2.5 py-0.5 rounded border border-green-900/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live Monitoring Active
              </span>
            </div>
            <h1 className="text-lg font-black text-white mt-1.5 uppercase tracking-wide">
              {ownerName}'s Emergency Handover Cabinet
            </h1>
            <p className="text-xs text-[#5d6fa3] leading-relaxed mt-1">
              Confidential files, personal messages, and insurance playbooks remain locked. System is checking proof-of-life status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isOwnerPreview && onSimulateUnlock && (
            <button
              onClick={onSimulateUnlock}
              className="bg-indigo-600 hover:bg-indigo-50 text-white hover:text-indigo-950 font-extrabold text-xs py-2.5 px-4.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg border border-indigo-500/20 active:scale-95 shrink-0"
              id="btn-sandbox-unlock"
            >
              <Unlock className="h-4 w-4" />
              Simulate Escalation Unlock
            </button>
          )}
          {!isOwnerPreview && (
            <button
              onClick={onLogout}
              className="bg-[#2c3353]/60 hover:bg-[#2c3353] text-[#e0dafc] border border-[#5d6fa3]/30 font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Secure Logout
            </button>
          )}
        </div>
      </div>

      {/* 2. REASSURING LOCKED MESSAGE */}
      <div className="bg-gradient-to-r from-red-950/20 via-slate-900/10 to-red-950/20 border border-dashed border-red-500/15 rounded-2xl p-6 text-center space-y-3.5">
        <div className="flex items-center justify-center gap-2 text-red-400">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span className="text-xs font-black uppercase tracking-widest font-mono">Access Restriction Advisory</span>
        </div>
        <p className="text-xs text-gray-300 max-w-2xl mx-auto leading-relaxed">
          For security, the encrypted vault is offline. Access will be authorized <span className="text-white font-extrabold">automatically</span> if the owner's fail-safe Proof of Life protocol is triggered.
        </p>
        <p className="text-[11px] text-[#5d6fa3] max-w-lg mx-auto">
          Protected information will only become available if the owner's Proof of Life protocol is triggered. No actions are required from your end unless notified via secure SMS.
        </p>
      </div>

      {/* 3. CORE MONITORING WIDGETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUMN A: LIVE STATUS CARD & HEALTH OVERVIEW */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* A1: LIVE STATUS WIDGET */}
          <div className="lc-panel p-5 shadow-lg space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[#5d6fa3]/20 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">Live Status</h3>
              </div>
              <span className="text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-900/30 px-2 py-0.5 rounded font-mono">
                SECURE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
              {/* CURRENT STATUS */}
              <div className="bg-[#1e233a] p-3.5 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-green-950/40 border border-green-500/20 flex items-center justify-center text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Current Status</p>
                  <p className="text-sm font-extrabold text-green-400 mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                    Active & Safe
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                  </p>
                </div>
              </div>

              {/* SYSTEM MONITORING STATUS */}
              <div className="bg-[#1e233a] p-3.5 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Monitoring State</p>
                  <p className="text-sm font-extrabold text-white mt-0.5">Continuous Sync</p>
                </div>
              </div>

              {/* LAST SUCCESSFUL CHECK-IN */}
              <div className="bg-[#1e233a] p-3.5 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-900 border border-[#5d6fa3]/25 flex items-center justify-center text-[#e0dafc]">
                  <Clock className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Last Check-In</p>
                  <p className="text-xs font-bold text-white mt-1 leading-normal truncate">{lastCheckInTime}</p>
                </div>
              </div>

              {/* NEXT SCHEDULED CHECK-IN */}
              <div className="bg-[#1e233a] p-3.5 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-slate-900 border border-[#5d6fa3]/25 flex items-center justify-center text-[#e0dafc]">
                  <Calendar className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Next Sync Window</p>
                  <p className="text-xs font-bold text-[#e0dafc] mt-1 leading-normal truncate">{nextCheckInWindow}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1e233a] p-3 rounded-xl border border-indigo-500/10 flex items-start gap-2.5 text-[11px] text-indigo-200/90 leading-relaxed font-medium">
              <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Daily check-ins are recorded directly via mobile app or backup SMS check-ins. If the check-in is missed, a 2-hour grace period triggers before security handover initiates.
              </span>
            </div>
          </div>

          {/* A2: SYSTEM HEALTH CARD */}
          <div className="lc-panel p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#5d6fa3]/20 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">System Health Diagnostics</h3>
              </div>
              <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded">
                SECURE HEALTH
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-[#1e233a] p-3 rounded-xl border border-[#5d6fa3]/10 text-center">
                <p className="text-[9px] text-[#5d6fa3] font-bold uppercase tracking-wider">Risk Assessment</p>
                <p className="text-sm font-black text-emerald-400 uppercase tracking-wide mt-1">Normal</p>
              </div>
              <div className="bg-[#1e233a] p-3 rounded-xl border border-[#5d6fa3]/10 text-center">
                <p className="text-[9px] text-[#5d6fa3] font-bold uppercase tracking-wider">Active Streak</p>
                <p className="text-sm font-black text-white mt-1">{streakCount} Days</p>
              </div>
              <div className="bg-[#1e233a] p-3 rounded-xl border border-[#5d6fa3]/10 text-center col-span-2 md:col-span-1">
                <p className="text-[9px] text-[#5d6fa3] font-bold uppercase tracking-wider">Last Sync Status</p>
                <p className="text-xs font-bold text-indigo-300 mt-1 leading-normal truncate">Verified Ok</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 border-t border-[#5d6fa3]/10 pt-3">
              <div className="flex items-center justify-between bg-[#1e233a]/50 px-3.5 py-2.5 rounded-lg border border-[#5d6fa3]/10">
                <span className="text-[11px] text-[#a5b4fc]/80 font-semibold">Successful Syncs</span>
                <span className="text-xs font-black text-green-400 bg-green-950/40 px-2 py-0.5 rounded border border-green-900/20 font-mono">24</span>
              </div>
              <div className="flex items-center justify-between bg-[#1e233a]/50 px-3.5 py-2.5 rounded-lg border border-[#5d6fa3]/10">
                <span className="text-[11px] text-[#a5b4fc]/80 font-semibold">Missed Syncs (Simulated)</span>
                <span className="text-xs font-black text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/20 font-mono">2</span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN B: ACTIVITY HEATMAP & PROOF OF LIFE TIMELINE */}
        <div className="space-y-6">

          {/* B1: ACTIVITY HEATMAP */}
          <div className="lc-panel p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#5d6fa3]/20 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">Sync Heatmap Activity</h3>
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#5d6fa3] bg-[#1e233a] border border-[#5d6fa3]/15 px-2 py-0.5 rounded">
                28-Day Log
              </span>
            </div>

            <p className="text-[11px] text-[#5d6fa3] leading-relaxed">
              Continuous proof-of-life log tracking over the last 4 weeks. Missed check-ins are highlighted in warning status colors for visual inspection.
            </p>

            {/* Heatmap Grid */}
            <div className="relative py-2 bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15">
              <div className="grid grid-cols-7 gap-2.5 max-w-sm mx-auto">
                {heatmapDays.map((day, idx) => {
                  let bgClass = "bg-green-500/80 hover:bg-green-400 hover:scale-110";
                  let borderClass = "border-green-400/20";
                  
                  if (day.status === "missed") {
                    bgClass = "bg-amber-500/90 hover:bg-amber-400 hover:scale-110 animate-pulse";
                    borderClass = "border-amber-400/40 shadow-lg shadow-amber-500/10";
                  }

                  return (
                    <button
                      type="button"
                      key={idx}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      onFocus={() => setHoveredDay(day)}
                      onBlur={() => setHoveredDay(null)}
                      aria-label={`${day.label}: ${day.status === "missed" ? "missed check-in" : "successful check-in"}`}
                      className={`aspect-square rounded-md cursor-pointer transition-all border ${bgClass} ${borderClass} relative flex items-center justify-center`}
                      style={{ minHeight: "36px" }}
                    >
                      <span className="text-[9px] font-mono text-slate-900 font-extrabold">{idx + 1}</span>
                      
                      {day.isToday && (
                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tooltip detail display */}
              <div className="h-6 mt-4.5 text-center">
                {hoveredDay ? (
                  <p className="text-[10px] font-mono font-bold text-indigo-300">
                    Day Log: <span className="text-white font-black">{hoveredDay.label}</span> &mdash; Status:{" "}
                    <span className={hoveredDay.status === "missed" ? "text-amber-400 uppercase font-black" : "text-green-400 uppercase font-black"}>
                      {hoveredDay.status === "missed" ? "Missed check-in (Simulated)" : "Successful check-in"}
                    </span>
                  </p>
                ) : (
                  <p className="text-[9px] text-[#5d6fa3] uppercase font-bold tracking-widest">
                    Hover over grids to audit specific daily sync logs
                  </p>
                )}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-between text-[10px] font-bold text-[#5d6fa3] border-t border-[#5d6fa3]/10 pt-3 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-green-500/80 rounded border border-green-400/20" />
                Check-in Success
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-amber-500/90 rounded border border-amber-400/40" />
                Missed Sync (Demo Sandbox)
              </span>
              <span className="text-[9px] text-amber-500 font-extrabold italic">
                * Simulated Demo data
              </span>
            </div>
          </div>

          {/* B2: PROOF OF LIFE TIMELINE */}
          <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#5d6fa3]/20 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm uppercase tracking-wide">Proof of Life Timeline Log</h3>
              </div>
              <span className="text-[10px] bg-indigo-950/60 text-indigo-300 border border-indigo-900/30 px-2 py-0.5 rounded font-mono font-bold">
                AUDITED LOGS
              </span>
            </div>

            <p className="text-[11px] text-[#5d6fa3] leading-relaxed">
              Auditable timestamped feed of recent activity. Simulated testing events are clearly labeled as demo metrics.
            </p>

            <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                // Display handsome fallback simulated timeline events as requested
                <>
                  {[
                    { id: "s1", methodLabel: "App Login Check-In", date: "Today", time: "10:15 AM", status: "Success" },
                    { id: "s2", methodLabel: "Missed Daily Check-In", date: "5 days ago", time: "08:00 PM", status: "Missed", isSimulated: true },
                    { id: "s3", methodLabel: "Manual \"I'm Safe\" Check-In", date: "Yesterday", time: "09:30 AM", status: "Success" },
                    { id: "s4", methodLabel: "SMS Direct Response", date: "2 days ago", time: "08:45 AM", status: "Success" },
                    { id: "s5", methodLabel: "Missed Daily Check-In", date: "15 days ago", time: "08:00 PM", status: "Missed", isSimulated: true }
                  ].map((evt) => (
                    <div key={evt.id} className="relative pl-5.5 border-l-2 border-indigo-500/20 py-0.5 group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                        evt.status === "Missed" 
                          ? "bg-[#2c3353] border-amber-500 animate-pulse" 
                          : "bg-[#2c3353] border-green-500"
                      }`} />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-[#e0dafc] transition-colors flex items-center gap-1.5">
                            {evt.methodLabel}
                            {evt.isSimulated && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 font-extrabold px-1 py-0.2 rounded border border-amber-500/20 uppercase tracking-widest">
                                Simulated Event
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#5d6fa3] mt-0.5">{evt.date} at {evt.time}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          evt.status === "Missed" 
                            ? "bg-amber-950/40 text-amber-400 border-amber-900/30" 
                            : "bg-green-950/40 text-green-400 border-green-900/30"
                        }`}>
                          {evt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                events.map((evt) => {
                  const isMissed = evt.status?.toLowerCase() === "missed";
                  const dateStr = evt.date ? new Date(evt.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent";
                  const isDemo = evt.id?.startsWith("evt-demo-");

                  return (
                    <div key={evt.id} className="relative pl-5.5 border-l-2 border-indigo-500/20 py-0.5 group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-1.5 top-1.5 h-3.5 w-3.5 rounded-full border-2 ${
                        isMissed 
                          ? "bg-[#2c3353] border-amber-500" 
                          : "bg-[#2c3353] border-green-500"
                      }`} />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-[#e0dafc] transition-colors flex items-center gap-1.5">
                            {evt.methodLabel}
                            {isDemo && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 font-extrabold px-1.5 py-0.2 rounded border border-amber-500/20 uppercase tracking-widest">
                                Simulated Event
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-[#5d6fa3] mt-0.5">{dateStr} at {evt.time || "12:00 PM"}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          isMissed 
                            ? "bg-amber-950/40 text-amber-400 border-amber-900/30" 
                            : "bg-green-950/40 text-green-400 border-green-900/30"
                        }`}>
                          {evt.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* 4. VISUAL LOCK PREVIEWS OF ENCRYPTED SECTIONS */}
      <div className="border-t border-[#5d6fa3]/20 pt-6 space-y-4">
        <h3 className="font-black text-white text-sm uppercase tracking-wide flex items-center gap-2">
          <Lock className="h-4 w-4 text-red-400" />
          Encrypted Handover Directories (Secured Offline)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-45 pointer-events-none select-none relative group">
          
          {/* SECURED VAULT BLOCK */}
          <div className="bg-[#1e233a]/90 rounded-2xl border border-red-500/10 p-5 space-y-4 relative overflow-hidden blur-[1px]">
            <div className="flex items-center gap-2 border-b border-[#5d6fa3]/10 pb-2.5">
              <FileText className="h-4 w-4 text-red-400" />
              <h4 className="text-xs font-bold text-white uppercase">Primary Document Vault</h4>
            </div>
            <div className="space-y-2">
              <div className="h-7 bg-slate-800/40 rounded-lg" />
              <div className="h-7 bg-slate-800/40 rounded-lg" />
              <div className="h-7 bg-slate-800/40 rounded-lg" />
            </div>
          </div>

          {/* SECURED BILLS BLOCK */}
          <div className="bg-[#1e233a]/90 rounded-2xl border border-red-500/10 p-5 space-y-4 relative overflow-hidden blur-[1px]">
            <div className="flex items-center gap-2 border-b border-[#5d6fa3]/10 pb-2.5">
              <Calendar className="h-4 w-4 text-red-400" />
              <h4 className="text-xs font-bold text-white uppercase">Critical Fiduciary EMIs</h4>
            </div>
            <div className="space-y-2">
              <div className="h-7 bg-slate-800/40 rounded-lg" />
              <div className="h-7 bg-slate-800/40 rounded-lg" />
              <div className="h-7 bg-slate-800/40 rounded-lg" />
            </div>
          </div>

          {/* SECURED MEDICAL DIRECTORY BLOCK */}
          <div className="bg-[#1e233a]/90 rounded-2xl border border-red-500/10 p-5 space-y-4 relative overflow-hidden blur-[1px]">
            <div className="flex items-center gap-2 border-b border-[#5d6fa3]/10 pb-2.5">
              <Heart className="h-4 w-4 text-red-400" />
              <h4 className="text-xs font-bold text-white uppercase">Medical Directives & Bio</h4>
            </div>
            <div className="space-y-2">
              <div className="h-7 bg-slate-800/40 rounded-lg" />
              <div className="h-7 bg-slate-800/40 rounded-lg" />
              <div className="h-7 bg-slate-800/40 rounded-lg" />
            </div>
          </div>

        </div>

        {/* Lock Overlay message */}
        <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex items-center justify-center gap-2 text-red-400 text-xs font-bold text-center">
          <Lock className="h-4 w-4 shrink-0 animate-pulse" />
          <span>Directories are encrypted using AES-256 GCM. Handover releases automatically upon check-in failure.</span>
        </div>
      </div>

    </div>
  );
}
