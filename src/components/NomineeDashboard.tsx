import React, { useState, useEffect } from "react";
import NomineeLockedDashboard from "./NomineeLockedDashboard";
import { apiFetch } from "../lib/api";
import { 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Download, 
  Sparkles, 
  MapPin, 
  Calendar, 
  HeartPulse, 
  LogOut, 
  Phone, 
  Info, 
  Eye, 
  Sliders, 
  Lock, 
  Unlock,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  Smartphone
} from "lucide-react";

interface NomineeDashboardProps {
  ownerUid: string;
  ownerName: string;
  nomineePhone: string;
  onLogout: () => void;
  isOwnerPreview?: boolean;
}

export default function NomineeDashboard({ 
  ownerUid, 
  ownerName, 
  nomineePhone, 
  onLogout, 
  isOwnerPreview = false 
}: NomineeDashboardProps) {
  const [isActive, setIsActive] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [securedDocs, setSecuredDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiBrief, setAiBrief] = useState("");

  // Simulation controls for Sandbox / Tab Preview mode
  const [simulationMode, setSimulationMode] = useState<"database" | "locked" | "active_manual" | "active_missed">("database");

  const fetchNomineeData = async () => {
    setLoading(true);
    try {
      // 1. Fetch real status from DB
      const statusRes = await apiFetch(`/api/emergency/status/${ownerUid}`);
      const statusData = await statusRes.json();
      
      // 2. Fetch emergency profile
      const pRes = await apiFetch(`/api/profile/${ownerUid}`);
      const pData = await pRes.json();
      setProfile(pData || null);

      // 3. Fetch secured documents
      const dRes = await apiFetch(`/api/documents/${ownerUid}`);
      const dData = await dRes.json();
      const filteredDocs = Array.isArray(dData)
        ? dData.filter((d: any) => d.isNomineeAccessSecured === true)
        : [];
      setSecuredDocs(filteredDocs);

      // 4. Set state according to simulation mode
      if (simulationMode === "database" && statusData) {
        setIsActive(!!statusData.active);
        setPlan(statusData.plan || null);
        setAiBrief(statusData.plan?.aiSummary || "Review the priority task list below to coordinate upcoming medical, insurance, and financial actions.");
      } else if (simulationMode === "locked") {
        setIsActive(false);
        setPlan(null);
        setAiBrief("");
      } else if (simulationMode === "active_manual") {
        setIsActive(true);
        setPlan({
          triggeredBy: "manual",
          activatedAt: new Date().toISOString(),
          pendingBills: ["Stanford Health Co-pay ($120.00)", "Monthly Homeowners Insurance ($85.00)"],
          lastKnownLocation: {
            latitude: 37.7749,
            longitude: -122.4194,
            timestamp: new Date().toISOString(),
            batteryLevel: 85,
            isCharging: true
          }
        });
        setAiBrief("Manual Emergency Activation: Primary user Alex Mercer triggered an emergency standdown. Ensure active health insurance policy claims are ready, and notify the local clinic for scheduled follow-ups.");
      } else if (simulationMode === "active_missed") {
        setIsActive(true);
        setPlan({
          triggeredBy: "missedCheckIn",
          activatedAt: new Date().toISOString(),
          pendingBills: ["Stanford Health Co-pay ($120.00)", "Monthly Homeowners Insurance ($85.00)", "Electricity Grid Utility ($45.00)"],
          lastKnownLocation: {
            latitude: 37.4275,
            longitude: -122.1697,
            timestamp: new Date().toISOString(),
            batteryLevel: 9,
            isCharging: false
          }
        });
        setAiBrief("Automated Escalation: Standard daily checking threshold has been breached. Geolocation coordinates show last active signal was recorded near Stanford Campus. Check in with trusted contacts, then coordinate urgent outstanding claims.");
      }

    } catch (e) {
      console.error("Error loading nominee dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNomineeData();
  }, [ownerUid, simulationMode]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center text-xs text-[var(--text-muted)] font-medium p-8">
        <Sparkles className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
        <span>Decrypting secure handover vaults...</span>
      </div>
    );
  }

  // Render Simulator header if in owner preview tab mode
  const renderSimulatorToolbar = () => {
    if (!isOwnerPreview) return null;
    return (
      <div className="app-card p-5 mb-6 space-y-3.5 bg-gradient-to-r from-[var(--bg-card)] to-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Nominee Vault Sandbox Controller
            </h4>
          </div>
          <span className="app-badge app-badge-info text-[10px] font-semibold self-start sm:self-auto">
            Interactive Testbed
          </span>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Test and preview exactly what your nominated legal contact will see when they access their handover portal. Change the simulation mode below to verify conditional visibility.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {[
            { id: "database", title: "Live Status", icon: RefreshCwIcon, desc: "Sync with DB state" },
            { id: "locked", title: "Simulate Locked", icon: Lock, desc: "Handover vault hidden" },
            { id: "active_manual", title: "Active (Manual)", icon: Unlock, desc: "Manual emergency state" },
            { id: "active_missed", title: "Active (Missed)", icon: AlertTriangle, desc: "Dead-man switch active" }
          ].map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => setSimulationMode(opt.id as any)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                simulationMode === opt.id
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-md"
                  : "bg-[var(--bg-app)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs">
                <opt.icon className="h-3.5 w-3.5" />
                <span>{opt.title}</span>
              </div>
              <span className={`block text-[10px] mt-1 ${simulationMode === opt.id ? "text-white/80" : "text-[var(--text-muted)]"}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const RefreshCwIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
  );

  if (!isActive) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {renderSimulatorToolbar()}
        <NomineeLockedDashboard
          ownerUid={ownerUid}
          ownerName={ownerName}
          nomineePhone={nomineePhone}
          onLogout={onLogout}
          isOwnerPreview={isOwnerPreview}
          onSimulateUnlock={() => setSimulationMode("active_missed")}
        />
      </div>
    );
  }

  // Extract device telemetry from lastKnownLocation payload
  const deviceLoc = plan?.lastKnownLocation;
  const batteryLevel = deviceLoc?.batteryLevel !== undefined 
    ? deviceLoc.batteryLevel 
    : (plan?.triggeredBy === "missedCheckIn" ? 9 : 82);
  const isCharging = deviceLoc?.isCharging !== undefined 
    ? deviceLoc.isCharging 
    : (plan?.triggeredBy === "missedCheckIn" ? false : true);
  const isLowBattery = batteryLevel <= 20;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {renderSimulatorToolbar()}

      {/* Header bar */}
      {!isOwnerPreview && (
        <header className="app-card py-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--text-primary)]">Lighthouse Nominee Resilience Desk</h1>
              <p className="text-xs text-emerald-400 font-medium">Authorized Mobile: {nomineePhone}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="btn-secondary py-2 px-3.5 text-xs font-bold"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Secure Exit</span>
          </button>
        </header>
      )}

      {/* Banner Alert: Missed Checkin Automated Escalation */}
      {plan?.triggeredBy === "missedCheckIn" ? (
        <div className="bg-gradient-to-r from-rose-950/70 via-rose-900/40 to-slate-900/70 text-white p-6 rounded-2xl shadow-xl border border-rose-500/40 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in backdrop-blur-md">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-sm text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 animate-pulse" />
              <span>CRITICAL ESCALATION: DEAD-MAN SWITCH ACTIVE</span>
            </h3>
            <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
              This digital handover vault was automatically activated because <strong className="text-white font-bold">{ownerName}</strong> failed to confirm their daily check-in safety window. Emergency handover protocols have initiated.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0 bg-rose-950/50 p-4 rounded-xl border border-rose-500/30">
            {plan?.lastKnownLocation ? (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div>
                  <p className="text-rose-300 text-[10px] font-bold uppercase tracking-wider">Last Recorded Coordinates</p>
                  <p className="text-white flex items-center gap-1.5 mt-1 font-mono text-xs">
                    <MapPin className="h-4 w-4 text-rose-400 animate-pulse" />
                    <span>{plan.lastKnownLocation.latitude?.toFixed(4)}, {plan.lastKnownLocation.longitude?.toFixed(4)}</span>
                  </p>
                </div>
                <div className="border-l border-rose-800/40 pl-4 sm:pl-6">
                  <p className="text-rose-300 text-[10px] font-bold uppercase tracking-wider">Device Power Status</p>
                  <p className="text-white flex items-center gap-1.5 mt-1">
                    {isCharging ? (
                      <BatteryCharging className="h-4 w-4 text-emerald-400" />
                    ) : isLowBattery ? (
                      <BatteryWarning className="h-4 w-4 text-rose-400 animate-pulse" />
                    ) : (
                      <Battery className="h-4 w-4 text-amber-400" />
                    )}
                    <span className={isLowBattery && !isCharging ? "text-rose-400 font-extrabold animate-pulse" : "text-white"}>
                      {batteryLevel}%
                    </span>
                    {isCharging && <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-extrabold ml-1">(Charging)</span>}
                    {!isCharging && isLowBattery && <span className="text-[10px] text-rose-400 uppercase tracking-wider font-extrabold ml-1 animate-pulse">(Low Battery)</span>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-rose-300 text-xs">Last known GPS coordinate unavailable</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-indigo-950/70 text-white p-6 rounded-2xl shadow-xl border border-indigo-500/40 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in backdrop-blur-md">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-sm text-indigo-300 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
              <span>EMERGENCY HANDOVER PORTAL UNLOCKED</span>
            </h3>
            <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
              This secure cabinet has been unlocked by a direct manual emergency request. You have full read-only access to vital planning checklists, clinical guidelines, and authorized files.
            </p>
          </div>
          {plan?.lastKnownLocation ? (
            <div className="flex gap-4 sm:gap-6 bg-indigo-950/50 p-4 rounded-xl border border-indigo-500/30 text-xs font-semibold shrink-0">
              <div>
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Last Sync Coordinates</p>
                <p className="text-white flex items-center gap-1.5 mt-1 font-mono">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{plan.lastKnownLocation.latitude?.toFixed(4)}, {plan.lastKnownLocation.longitude?.toFixed(4)}</span>
                </p>
              </div>
              <div className="border-l border-indigo-800/40 pl-4 sm:pl-6">
                <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Device Power</p>
                <p className="text-white flex items-center gap-1.5 mt-1">
                  {isCharging ? (
                    <BatteryCharging className="h-4 w-4 text-emerald-400" />
                  ) : isLowBattery ? (
                    <BatteryWarning className="h-4 w-4 text-rose-400 animate-pulse" />
                  ) : (
                    <Battery className="h-4 w-4 text-indigo-300" />
                  )}
                  <span>{batteryLevel}%</span>
                  {isCharging && <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold ml-1">(Charging)</span>}
                </p>
              </div>
            </div>
          ) : (
            <div className="app-badge app-badge-info text-xs font-bold uppercase">
              Status: Active Handover
            </div>
          )}
        </div>
      )}

      {/* Emergency Status: user name, last active time, current status */}
      <div className="app-card p-6 space-y-4">
        <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
          <HeartPulse className="h-4.5 w-4.5 text-indigo-400" />
          <span>Emergency Status Overview</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)]">
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">User Name</p>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{ownerName}</p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)]">
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Last Active Time</p>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-1 font-mono">
              {profile?.lastActiveTimestamp
                ? new Date(profile.lastActiveTimestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
          </div>
          <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)]">
            <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Current Status</p>
            <p className={`text-sm font-bold mt-1 ${profile?.currentStreakStatus === "Safe" ? "text-emerald-400" : profile?.currentStreakStatus === "Awaiting Confirmation" ? "text-amber-400" : "text-rose-400"}`}>
              {profile?.currentStreakStatus || "Safe"}
            </p>
            {profile?.statusChangedAt && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                changed {new Date(profile.statusChangedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Priority Action Briefing Narrative */}
      <div className="app-card p-6 space-y-3">
        <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-indigo-400" />
          <span>Priority Action Briefing Narrative</span>
        </h3>
        <div className="p-4 bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl text-xs sm:text-sm text-[var(--text-primary)]/90 leading-relaxed font-normal shadow-inner">
          {aiBrief}
        </div>
      </div>

      {/* Real-time Device Telemetry & Location tracking Panel */}
      {plan?.lastKnownLocation && (
        <div className="app-card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-3">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Smartphone className="h-4.5 w-4.5 text-indigo-400" />
              <span>Owner Mobile Device Status & Telemetry</span>
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Signal Feed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Power & Battery Status */}
            <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-4">
              <div className={`p-3 rounded-xl border ${isLowBattery && !isCharging ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"}`}>
                {isCharging ? (
                  <BatteryCharging className="h-6 w-6 text-emerald-400" />
                ) : isLowBattery ? (
                  <BatteryWarning className="h-6 w-6 text-rose-400 animate-pulse" />
                ) : (
                  <Battery className="h-6 w-6 text-amber-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Battery Charge Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className={`text-base font-extrabold text-[var(--text-primary)] ${isLowBattery && !isCharging ? "text-rose-400 animate-pulse" : ""}`}>{batteryLevel}%</p>
                  {isCharging ? (
                    <span className="text-[9px] text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Charging</span>
                  ) : isLowBattery ? (
                    <span className="text-[9px] text-rose-400 font-bold uppercase bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 animate-pulse">Low Battery</span>
                  ) : (
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase bg-[var(--bg-card)] px-2 py-0.5 rounded border border-[var(--border-card)]">On Battery</span>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Last Known GPS coordinates */}
            <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <MapPin className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Last Sync Coordinates</p>
                <p className="text-xs font-mono font-bold text-[var(--text-primary)] truncate mt-1">
                  {plan.lastKnownLocation.latitude?.toFixed(5)}, {plan.lastKnownLocation.longitude?.toFixed(5)}
                </p>
                <a 
                  href={`https://maps.google.com/?q=${plan.lastKnownLocation.latitude},${plan.lastKnownLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline mt-1.5 flex items-center gap-1 font-bold uppercase tracking-wide cursor-pointer"
                >
                  View Sat-Map Grid ↗
                </a>
              </div>
            </div>

            {/* Column 3: Diagnostic Report */}
            <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex items-center gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Zap className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">Device Power Diagnostic</p>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-1 leading-normal">
                  {isCharging ? (
                    <span className="text-emerald-400 font-medium">Device plugged in and receiving power.</span>
                  ) : isLowBattery ? (
                    <span className="text-rose-400 font-bold animate-pulse">CRITICAL: Device unpowered and near depletion.</span>
                  ) : (
                    <span>Normal active state. Connected to battery power.</span>
                  )}
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Action Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Panel 1: Critical bills & pending EMIs */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
            <Calendar className="h-4.5 w-4.5 text-rose-400" />
            <h3 className="font-bold text-[var(--text-primary)] text-sm">
              Critical EMIs & Outstanding Bills
            </h3>
          </div>

          <div className="space-y-3">
            {!Array.isArray(plan?.pendingBills) || plan.pendingBills.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-xs italic bg-[var(--bg-app)] rounded-2xl border border-[var(--border-card)]">
                No approaching liabilities or pending EMIs on schedule.
              </div>
            ) : (
              plan.pendingBills.map((b: string, idx: number) => (
                <div key={idx} className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs space-y-1">
                  <p className="font-bold text-[var(--text-primary)]">{b}</p>
                  <p className="text-[10px] text-rose-400 flex items-center gap-1 font-semibold">
                    <Info className="h-3 w-3 text-rose-400" />
                    <span>Status: Outstanding / Pay Immediately</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Secure released documents */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
            <FileText className="h-4.5 w-4.5 text-indigo-400" />
            <h3 className="font-bold text-[var(--text-primary)] text-sm">
              Released Secure Vault Documents
            </h3>
          </div>

          <div className="space-y-3">
            {securedDocs.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-xs italic bg-[var(--bg-app)] rounded-2xl border border-[var(--border-card)]">
                No documents were authorized with "Nominee Access" privileges.
              </div>
            ) : (
              securedDocs.map((doc) => (
                <div 
                  key={doc.id} 
                  className="p-3.5 bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl flex items-center justify-between text-xs hover:border-indigo-500/40 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-[var(--text-primary)] truncate group-hover:text-indigo-400 transition-colors">{doc.fileName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase mt-0.5 font-bold">{doc.documentType}</p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    download
                    className="btn-secondary p-2 rounded-xl shrink-0 cursor-pointer"
                    title="Download document copy"
                    referrerPolicy="no-referrer"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Medical Alert info & responders */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
            <HeartPulse className="h-4.5 w-4.5 text-emerald-400" />
            <h3 className="font-bold text-[var(--text-primary)] text-sm">
              Clinical Profile & Urgent Contacts
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] space-y-2">
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Owner Medical Directives</p>
              <p className="text-[var(--text-primary)] leading-relaxed font-semibold">
                {profile?.medicalInfo || "No critical respiratory or allergy history reported on registry."}
              </p>
              <div className="flex items-center gap-4 text-[11px] pt-2.5 border-t border-[var(--border-card)] mt-1.5 text-[var(--text-muted)]">
                <p>Age: <strong className="text-[var(--text-primary)]">{profile?.age || "30"}</strong></p>
                <p>Blood Group: <strong className="text-[var(--text-primary)]">{profile?.bloodGroup || "O+"}</strong></p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Designated Emergency Contacts</p>
              <div className="p-3.5 bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">{profile?.emergencyContactName || "Not configured"}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Spouse / Main Coordinator</p>
                </div>
                {profile?.emergencyContactPhone && (
                  <a
                    href={`tel:${profile.emergencyContactPhone}`}
                    className="btn-secondary p-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    <Phone className="h-3.5 w-3.5 text-indigo-400" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
