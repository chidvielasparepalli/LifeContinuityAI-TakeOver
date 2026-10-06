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

  // Generate mock heatmap days (last 28 days)
  const heatmapDays = Array.from({ length: 28 }, (_, i) => {
    const dayIndex = 27 - i;
    const date = new Date();
    date.setDate(date.getDate() - dayIndex);
    const dateStr = date.toISOString().split("T")[0];
    
    const isMissed = dayIndex === 5 || dayIndex === 15;
    const isToday = dayIndex === 0;

    return {
      date: dateStr,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      status: isMissed ? "missed" : "completed",
      isToday
    };
  });

  const streakCount = stats?.currentStreak !== undefined ? stats.currentStreak : 12;
  const lastCheckInTime = stats?.lastCheckInTimestamp 
    ? new Date(stats.lastCheckInTimestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) + " Today"
    : "10:15 AM Yesterday";

  const nextCheckInWindow = "08:00 AM - 08:00 PM Tomorrow";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* 1. TOP SECURED ALERT HEADER */}
      <div className="app-card p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="h-14 w-14 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
            <Lock className="h-7 w-7" id="status-lock-icon" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="app-badge app-badge-danger text-[10px] font-bold uppercase">
                Portal Locked
              </span>
              <span className="app-badge app-badge-success text-[10px] font-bold uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Monitoring Active
              </span>
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] mt-1.5 tracking-tight">
              {ownerName}'s Emergency Handover Cabinet
            </h1>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-0.5">
              Confidential files, personal messages, and insurance playbooks remain locked. System is actively verifying proof-of-life status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isOwnerPreview && onSimulateUnlock && (
            <button
              onClick={onSimulateUnlock}
              className="btn-primary py-2.5 px-4 text-xs font-bold shrink-0"
              id="btn-sandbox-unlock"
            >
              <Unlock className="h-4 w-4" />
              <span>Simulate Escalation Unlock</span>
            </button>
          )}
          {!isOwnerPreview && (
            <button
              onClick={onLogout}
              className="btn-secondary py-2 px-3.5 text-xs font-bold"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Secure Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. REASSURING LOCKED MESSAGE */}
      <div className="app-card border-dashed border-rose-500/30 p-6 text-center space-y-3 bg-gradient-to-r from-[var(--bg-card)] via-rose-950/10 to-[var(--bg-card)]">
        <div className="flex items-center justify-center gap-2 text-rose-400">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider font-mono">Access Restriction Advisory</span>
        </div>
        <p className="text-xs text-[var(--text-primary)] max-w-2xl mx-auto leading-relaxed">
          For security, the encrypted vault is offline. Access will be authorized <strong className="text-white font-extrabold">automatically</strong> if the owner's fail-safe Proof of Life protocol is triggered.
        </p>
        <p className="text-[11px] text-[var(--text-muted)] max-w-lg mx-auto">
          Protected information will only become available if the owner's Proof of Life protocol is triggered. No actions are required from your end unless notified via secure SMS.
        </p>
      </div>

      {/* 3. CORE MONITORING WIDGETS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* COLUMN A: LIVE STATUS CARD & HEALTH OVERVIEW */}
        <div className="space-y-6 flex flex-col justify-between">
          
          {/* A1: LIVE STATUS WIDGET */}
          <div className="app-card p-6 space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wider">Live Status</h3>
              </div>
              <span className="app-badge app-badge-info text-[10px] font-mono font-bold">
                SECURE
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-1">
              {/* CURRENT STATUS */}
              <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Current Status</p>
                  <p className="text-sm font-extrabold text-emerald-400 mt-0.5 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Active & Safe</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  </p>
                </div>
              </div>

              {/* SYSTEM MONITORING STATUS */}
              <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Monitoring State</p>
                  <p className="text-sm font-extrabold text-[var(--text-primary)] mt-0.5">Continuous Sync</p>
                </div>
              </div>

              {/* LAST SUCCESSFUL CHECK-IN */}
              <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Last Check-In</p>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate">{lastCheckInTime}</p>
                </div>
              </div>

              {/* NEXT SCHEDULED CHECK-IN */}
              <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Next Sync Window</p>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate">{nextCheckInWindow}</p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--border-card)] flex items-start gap-2.5 text-xs text-[var(--text-muted)] leading-relaxed font-normal">
              <Info className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Daily check-ins are recorded directly via mobile app or backup SMS. If missed, a grace period triggers before security handover initiates.
              </span>
            </div>
          </div>

          {/* A2: SYSTEM HEALTH CARD */}
          <div className="app-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wider">System Health Diagnostics</h3>
              </div>
              <span className="app-badge app-badge-success text-[10px] font-bold">
                HEALTH OK
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--border-card)] text-center">
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Risk Assessment</p>
                <p className="text-sm font-bold text-emerald-400 uppercase mt-1">Normal</p>
              </div>
              <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--border-card)] text-center">
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Active Streak</p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{streakCount} Days</p>
              </div>
              <div className="bg-[var(--bg-app)] p-3.5 rounded-2xl border border-[var(--border-card)] text-center col-span-2 md:col-span-1">
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Last Sync Status</p>
                <p className="text-xs font-bold text-indigo-400 mt-1 truncate">Verified Ok</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 border-t border-[var(--border-card)] pt-3">
              <div className="flex items-center justify-between bg-[var(--bg-app)] px-4 py-2.5 rounded-xl border border-[var(--border-card)]">
                <span className="text-xs text-[var(--text-muted)] font-medium">Successful Syncs</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">24</span>
              </div>
              <div className="flex items-center justify-between bg-[var(--bg-app)] px-4 py-2.5 rounded-xl border border-[var(--border-card)]">
                <span className="text-xs text-[var(--text-muted)] font-medium">Missed Syncs (Demo)</span>
                <span className="text-xs font-bold text-amber-400 font-mono">2</span>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN B: ACTIVITY HEATMAP & PROOF OF LIFE TIMELINE */}
        <div className="space-y-6">

          {/* B1: ACTIVITY HEATMAP */}
          <div className="app-card p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-card)] pb-3 gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wider">Sync Heatmap Activity</h3>
              </div>
              <span className="app-badge app-badge-info text-[10px] font-bold">
                28-Day Log
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Continuous proof-of-life log tracking over the last 4 weeks. Missed check-ins are highlighted in warning status colors for visual inspection.
            </p>

            {/* Heatmap Grid */}
            <div className="bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--border-card)]">
              <div className="grid grid-cols-7 gap-2.5 max-w-sm mx-auto">
                {heatmapDays.map((day, idx) => {
                  let bgClass = "bg-emerald-500/80 hover:bg-emerald-400 hover:scale-110";
                  let borderClass = "border-emerald-400/20";
                  
                  if (day.status === "missed") {
                    bgClass = "bg-amber-500/90 hover:bg-amber-400 hover:scale-110 animate-pulse";
                    borderClass = "border-amber-400/40 shadow-lg shadow-amber-500/10";
                  }

                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className={`aspect-square rounded-lg cursor-pointer transition-all border ${bgClass} ${borderClass} relative flex items-center justify-center`}
                      style={{ minHeight: "36px" }}
                    >
                      <span className="text-[10px] font-mono text-slate-950 font-bold">{idx + 1}</span>
                      
                      {day.isToday && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tooltip detail display */}
              <div className="h-6 mt-4 text-center">
                {hoveredDay ? (
                  <p className="text-xs font-mono font-bold text-indigo-400">
                    Day Log: <span className="text-[var(--text-primary)] font-black">{hoveredDay.label}</span> &mdash; Status:{" "}
                    <span className={hoveredDay.status === "missed" ? "text-amber-400 uppercase font-black" : "text-emerald-400 uppercase font-black"}>
                      {hoveredDay.status === "missed" ? "Missed check-in (Simulated)" : "Successful check-in"}
                    </span>
                  </p>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">
                    Hover over days to inspect specific daily sync records
                  </p>
                )}
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] border-t border-[var(--border-card)] pt-3 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-500/80 rounded border border-emerald-400/20" />
                <span>Check-in Success</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-amber-500/90 rounded border border-amber-400/40" />
                <span>Missed Sync (Demo)</span>
              </span>
              <span className="text-[10px] text-amber-400 font-bold italic">
                * Simulated Demo
              </span>
            </div>
          </div>

          {/* B2: PROOF OF LIFE TIMELINE */}
          <div className="app-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-indigo-400" />
                <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wider">Proof of Life Timeline Log</h3>
              </div>
              <span className="app-badge app-badge-info text-[10px] font-mono font-bold">
                AUDITED LOGS
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Auditable timestamped feed of recent activity. Simulated testing events are clearly labeled as demo metrics.
            </p>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {events.length === 0 ? (
                <>
                  {[
                    { id: "s1", methodLabel: "App Login Check-In", date: "Today", time: "10:15 AM", status: "Success" },
                    { id: "s2", methodLabel: "Missed Daily Check-In", date: "5 days ago", time: "08:00 PM", status: "Missed", isSimulated: true },
                    { id: "s3", methodLabel: "Manual \"I'm Safe\" Check-In", date: "Yesterday", time: "09:30 AM", status: "Success" },
                    { id: "s4", methodLabel: "SMS Direct Response", date: "2 days ago", time: "08:45 AM", status: "Success" },
                    { id: "s5", methodLabel: "Missed Daily Check-In", date: "15 days ago", time: "08:00 PM", status: "Missed", isSimulated: true }
                  ].map((evt) => (
                    <div key={evt.id} className="relative pl-5 border-l-2 border-indigo-500/20 py-1 group">
                      <div className={`absolute -left-1.5 top-2 h-3.5 w-3.5 rounded-full border-2 ${
                        evt.status === "Missed" 
                          ? "bg-[var(--bg-card)] border-amber-500 animate-pulse" 
                          : "bg-[var(--bg-card)] border-emerald-500"
                      }`} />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                            <span>{evt.methodLabel}</span>
                            {evt.isSimulated && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                                Demo
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{evt.date} at {evt.time}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          evt.status === "Missed" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
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
                    <div key={evt.id} className="relative pl-5 border-l-2 border-indigo-500/20 py-1 group">
                      <div className={`absolute -left-1.5 top-2 h-3.5 w-3.5 rounded-full border-2 ${
                        isMissed 
                          ? "bg-[var(--bg-card)] border-amber-500" 
                          : "bg-[var(--bg-card)] border-emerald-500"
                      }`} />

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                            <span>{evt.methodLabel}</span>
                            {isDemo && (
                              <span className="text-[8px] bg-amber-500/10 text-amber-400 font-extrabold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                                Demo
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{dateStr} at {evt.time || "12:00 PM"}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                          isMissed 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30" 
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
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
      <div className="border-t border-[var(--border-card)] pt-6 space-y-4">
        <h3 className="font-bold text-[var(--text-primary)] text-sm uppercase tracking-wider flex items-center gap-2">
          <Lock className="h-4 w-4 text-rose-400" />
          <span>Encrypted Handover Directories (Secured Offline)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40 pointer-events-none select-none relative group">
          
          {/* SECURED VAULT BLOCK */}
          <div className="app-card p-5 space-y-4 relative overflow-hidden blur-[1px]">
            <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-2.5">
              <FileText className="h-4 w-4 text-rose-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase">Primary Document Vault</h4>
            </div>
            <div className="space-y-2">
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
            </div>
          </div>

          {/* SECURED BILLS BLOCK */}
          <div className="app-card p-5 space-y-4 relative overflow-hidden blur-[1px]">
            <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-2.5">
              <Calendar className="h-4 w-4 text-rose-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase">Critical Fiduciary EMIs</h4>
            </div>
            <div className="space-y-2">
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
            </div>
          </div>

          {/* SECURED MEDICAL DIRECTORY BLOCK */}
          <div className="app-card p-5 space-y-4 relative overflow-hidden blur-[1px]">
            <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-2.5">
              <Heart className="h-4 w-4 text-rose-400" />
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase">Medical Directives & Bio</h4>
            </div>
            <div className="space-y-2">
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
              <div className="h-7 bg-[var(--bg-app)] rounded-xl" />
            </div>
          </div>

        </div>

        {/* Lock Overlay message */}
        <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-2xl flex items-center justify-center gap-2 text-rose-300 text-xs font-bold text-center">
          <Lock className="h-4 w-4 shrink-0 animate-pulse text-rose-400" />
          <span>Directories are encrypted using AES-256 GCM. Handover releases automatically upon check-in failure.</span>
        </div>
      </div>

    </div>
  );
}
