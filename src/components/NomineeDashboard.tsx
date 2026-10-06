import React, { useState, useEffect } from "react";
import NomineeLockedDashboard from "./NomineeLockedDashboard";
import LoadingState from "./LoadingState";
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
        setAiBrief("Manual Emergency Activation: Primary user Alex Mercer triggered an emergency standdown. Ensure active health insurance policy claims are ready, and notify the local Stanford clinic for scheduled follow-ups.");
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
        setAiBrief("Automated Escalation: Standard daily checking threshold has been breached. Geolocation coordinates show last active signal was recorded near Stanford Campus. Check in with sister Sarah Mercer, then coordinate urgent outstanding insurance claims.");
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
      <div className="p-4 sm:p-6">
        <LoadingState label="Decrypting secure handover vaults" />
      </div>
    );
  }

  // Render Simulator header if in owner preview tab mode
  const renderSimulatorToolbar = () => {
    if (!isOwnerPreview) return null;
    return (
      <div className="bg-[#1e233a] border border-[#5d6fa3]/30 rounded-2xl p-4 mb-6 space-y-3.5 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4.5 w-4.5 text-indigo-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              Nominee Vault Sandbox Controller
            </h4>
          </div>
          <span className="text-[10px] bg-indigo-950/40 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-900/40 font-semibold self-start sm:self-auto">
            Interactive Testbed
          </span>
        </div>

        <p className="text-[11px] text-[#5d6fa3] leading-relaxed">
          Test and preview exactly what your nominated legal contact will see when they access their handover portal. Change the simulation mode below to verify the conditional visibility.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: "database", title: "Live Status", icon: RefreshCwIcon, desc: "Sync with DB state" },
            { id: "locked", title: "Simulate Locked", icon: Lock, desc: "Handover vault hidden" },
            { id: "active_manual", title: "Active (Manual)", icon: Unlock, desc: "Manual emergency state" },
            { id: "active_missed", title: "Active (Missed Checkin)", icon: AlertTriangle, desc: "Dead-man switch active" }
          ].map((opt) => (
            <button
              type="button"
              key={opt.id}
              onClick={() => setSimulationMode(opt.id as any)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                simulationMode === opt.id
                  ? "bg-[#e0dafc] border-[#e0dafc] text-[#2c3353]"
                  : "bg-[#2c3353]/50 border-[#5d6fa3]/15 text-[#e0dafc]/80 hover:bg-[#2c3353]/90"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <opt.icon className="h-3.5 w-3.5" />
                <span>{opt.title}</span>
              </div>
              <span className={`block text-[9px] mt-1 ${simulationMode === opt.id ? "text-[#2c3353]/80" : "text-[#5d6fa3]"}`}>
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
       <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6 text-[#e0dafc]">
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
  // Use intelligent default fallbacks if properties are not fully populated in the DB yet
  const batteryLevel = deviceLoc?.batteryLevel !== undefined 
    ? deviceLoc.batteryLevel 
    : (plan?.triggeredBy === "missedCheckIn" ? 9 : 82);
  const isCharging = deviceLoc?.isCharging !== undefined 
    ? deviceLoc.isCharging 
    : (plan?.triggeredBy === "missedCheckIn" ? false : true);
  const isLowBattery = batteryLevel <= 20;

  return (
    <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6 text-[#e0dafc] space-y-6">
      
      {renderSimulatorToolbar()}

      {/* Header bar */}
      {!isOwnerPreview && (
        <header className="lc-panel text-white py-4 px-6 shadow-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#e0dafc]" />
            <div>
              <h1 className="text-sm font-bold">Lighthouse Nominee Resilience Desk</h1>
              <p className="text-[10px] text-green-400">Authorized Mobile: {nomineePhone}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="bg-[#1e233a] hover:bg-[#1e233a]/80 text-[#e0dafc] border border-[#5d6fa3]/30 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Secure Exit
          </button>
        </header>
      )}

      {/* Banner Alert: Missed Checkin Automated Escalation */}
      {plan?.triggeredBy === "missedCheckIn" ? (
        <div className="bg-red-950/60 text-white p-5 rounded-2xl shadow-lg border border-red-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              CRITICAL ESCALATION: DEAD-MAN SWITCH ACTIVE
            </h3>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              This digital handover vault was automatically activated because <span className="font-bold text-white">{ownerName}</span> failed to confirm their daily check-in safety window. Standard safety protocols have initiated.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0 bg-red-900/20 p-3 rounded-xl border border-red-800/40">
            {plan?.lastKnownLocation ? (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <div>
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Last Recorded Coordinates</p>
                  <p className="text-white flex items-center gap-1 mt-0.5">
                    <MapPin className="h-4 w-4 text-red-400 animate-pulse" />
                    {plan.lastKnownLocation.latitude?.toFixed(4)}, {plan.lastKnownLocation.longitude?.toFixed(4)}
                  </p>
                </div>
                <div className="border-l border-red-800/40 pl-4 sm:pl-6">
                  <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Device Power Status</p>
                  <p className="text-white flex items-center gap-1.5 mt-1">
                    {isCharging ? (
                      <BatteryCharging className="h-4 w-4 text-green-400" />
                    ) : isLowBattery ? (
                      <BatteryWarning className="h-4 w-4 text-red-500 animate-pulse" />
                    ) : (
                      <Battery className="h-4 w-4 text-yellow-400" />
                    )}
                    <span className={isLowBattery && !isCharging ? "text-red-400 font-extrabold animate-pulse" : "text-white"}>
                      {batteryLevel}%
                    </span>
                    {isCharging && <span className="text-[9px] text-green-400 uppercase tracking-wider font-extrabold ml-1">(Charging)</span>}
                    {!isCharging && isLowBattery && <span className="text-[9px] text-red-400 uppercase tracking-wider font-extrabold ml-1 animate-pulse">(Low Battery)</span>}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-red-400">Last known GPS coordinate unavailable</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-indigo-950/50 text-white p-5 rounded-2xl shadow-lg border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-indigo-400" />
              EMERGENCY HANDOVER PORTAL UNLOCKED
            </h3>
            <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
              This secure cabinet has been unlocked by a direct manual emergency request. You have full read-only access to vital planning checklists, clinical guidelines, and authorized files.
            </p>
          </div>
          {plan?.lastKnownLocation ? (
            <div className="flex gap-4 sm:gap-6 bg-indigo-900/20 p-3 rounded-xl border border-indigo-800/40 text-xs font-semibold shrink-0">
              <div>
                <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Last Sync Coordinates</p>
                <p className="text-white flex items-center gap-1 mt-1 font-mono">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  {plan.lastKnownLocation.latitude?.toFixed(4)}, {plan.lastKnownLocation.longitude?.toFixed(4)}
                </p>
              </div>
              <div className="border-l border-indigo-800/40 pl-4 sm:pl-6">
                <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Device Power</p>
                <p className="text-white flex items-center gap-1.5 mt-1">
                  {isCharging ? (
                    <BatteryCharging className="h-4 w-4 text-green-400" />
                  ) : isLowBattery ? (
                    <BatteryWarning className="h-4 w-4 text-red-500 animate-pulse" />
                  ) : (
                    <Battery className="h-4 w-4 text-indigo-300" />
                  )}
                  <span>{batteryLevel}%</span>
                  {isCharging && <span className="text-[9px] text-green-400 uppercase tracking-wider font-bold ml-1">(Charging)</span>}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-900/20 py-2 px-3 rounded-lg border border-indigo-800/30">
              Status: Active Handover
            </div>
          )}
        </div>
      )}

      {/* Emergency Status: user name, last active time, current status */}
       <div className="lc-panel shadow-lg p-6 space-y-4">
        <h3 className="font-black text-white text-sm flex items-center gap-1.5">
          <HeartPulse className="h-4.5 w-4.5 text-indigo-300" />
          Emergency Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15">
            <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">User Name</p>
            <p className="text-sm font-bold text-white mt-1">{ownerName}</p>
          </div>
          <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15">
            <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Last Active Time</p>
            <p className="text-sm font-bold text-white mt-1">
              {profile?.lastActiveTimestamp
                ? new Date(profile.lastActiveTimestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                : "—"}
            </p>
          </div>
          <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15">
            <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Current Status</p>
            <p className={`text-sm font-black mt-1 ${profile?.currentStreakStatus === "Safe" ? "text-green-400" : profile?.currentStreakStatus === "Awaiting Confirmation" ? "text-amber-400" : "text-red-400"}`}>
              {profile?.currentStreakStatus || "Safe"}
            </p>
            {profile?.statusChangedAt && (
              <p className="text-[9px] text-[#5d6fa3] mt-1">
                changed {new Date(profile.statusChangedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Gemini AI Priority Timeline Overview */}
       <div className="lc-panel shadow-lg p-6 space-y-3">
        <h3 className="font-black text-white text-sm flex items-center gap-1.5">
          <Sparkles className="h-4.5 w-4.5 text-indigo-300" />
          Priority Action Briefing Narrative
        </h3>
        <div className="p-4 bg-[#1e233a] border border-[#5d6fa3]/20 rounded-xl text-xs text-[#e0dafc] leading-relaxed font-medium">
          {aiBrief}
        </div>
      </div>

      {/* Real-time Device Telemetry & Location tracking Panel */}
      {plan?.lastKnownLocation && (
         <div className="lc-panel shadow-lg p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#5d6fa3]/20 pb-3">
            <h3 className="font-black text-white text-sm flex items-center gap-1.5">
              <Smartphone className="h-4.5 w-4.5 text-indigo-300" />
              Owner Mobile Device Status & Telemetry
            </h3>
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-400 tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              Active Signal Feed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Column 1: Power & Battery Status */}
            <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-4">
              <div className={`p-3 rounded-lg border ${isLowBattery && !isCharging ? "bg-red-950/40 border-red-900/30 text-red-400 animate-pulse" : "bg-[#2c3353]/60 border-[#5d6fa3]/25 text-[#e0dafc]"}`}>
                {isCharging ? (
                  <BatteryCharging className="h-6 w-6 text-green-400" />
                ) : isLowBattery ? (
                  <BatteryWarning className="h-6 w-6 text-red-500 animate-pulse" />
                ) : (
                  <Battery className="h-6 w-6 text-yellow-400" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Battery Charge Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className={`text-base font-black text-white ${isLowBattery && !isCharging ? "text-red-400 animate-pulse font-black" : ""}`}>{batteryLevel}%</p>
                  {isCharging ? (
                    <span className="text-[9px] text-green-400 font-extrabold uppercase bg-green-950/50 px-1.5 py-0.5 rounded border border-green-900/30">Charging</span>
                  ) : isLowBattery ? (
                    <span className="text-[9px] text-red-400 font-extrabold uppercase bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/30 animate-pulse">Low Battery</span>
                  ) : (
                    <span className="text-[9px] text-[#5d6fa3] font-bold uppercase bg-[#2c3353]/50 px-1.5 py-0.5 rounded border border-[#5d6fa3]/15">On Battery</span>
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: Last Known GPS coordinates */}
            <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#2c3353]/60 border border-[#5d6fa3]/25 text-indigo-400">
                <MapPin className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Last Sync Location Coordinates</p>
                <p className="text-xs font-mono font-bold text-white truncate mt-1">
                  {plan.lastKnownLocation.latitude?.toFixed(5)}, {plan.lastKnownLocation.longitude?.toFixed(5)}
                </p>
                <a 
                  href={`https://maps.google.com/?q=${plan.lastKnownLocation.latitude},${plan.lastKnownLocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-indigo-400 hover:underline mt-1.5 flex items-center gap-1 font-bold uppercase tracking-wide cursor-pointer"
                >
                  View Sat-Map Grid ↗
                </a>
              </div>
            </div>

            {/* Column 3: Diagnostic Report */}
            <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-[#2c3353]/60 border border-[#5d6fa3]/25 text-[#e0dafc]">
                <Zap className="h-6 w-6 text-indigo-300" />
              </div>
              <div>
                <p className="text-[10px] text-[#5d6fa3] font-bold uppercase tracking-wider">Device Power Diagnostic</p>
                <p className="text-xs font-semibold text-[#e0dafc] mt-1 leading-normal">
                  {isCharging ? (
                    <span className="text-green-400 font-medium">Device plugged in and receiving power.</span>
                  ) : isLowBattery ? (
                    <span className="text-red-400 font-extrabold animate-pulse">CRITICAL: Device unpowered and near depletion.</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Panel 1: Critical bills & pending EMIs */}
         <div className="lc-panel shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#5d6fa3]/20 pb-3">
            <Calendar className="h-4.5 w-4.5 text-red-400" />
            <h3 className="font-bold text-white text-sm">
              Critical EMIs & Outstanding Bills
            </h3>
          </div>

          <div className="space-y-3">
            {!Array.isArray(plan?.pendingBills) || plan.pendingBills.length === 0 ? (
              <div className="text-center py-8 text-[#5d6fa3] text-xs italic">
                No approaching liabilities or pending EMIs on schedule.
              </div>
            ) : (
              plan.pendingBills.map((b: string, idx: number) => (
                <div key={idx} className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-xs">
                  <p className="font-bold text-white">{b}</p>
                  <p className="text-[10px] text-[#5d6fa3] mt-1.5 flex items-center gap-1 font-medium">
                    <Info className="h-3 w-3 text-red-400" />
                    Status: Outstanding / Pay Immediately
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Secure released documents */}
         <div className="lc-panel shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#5d6fa3]/20 pb-3">
            <FileText className="h-4.5 w-4.5 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">
              Released Secure Vault Documents
            </h3>
          </div>

          <div className="space-y-3">
            {securedDocs.length === 0 ? (
              <div className="text-center py-8 text-[#5d6fa3] text-xs italic">
                No documents were authorized with "Nominee Access" privileges.
              </div>
            ) : (
              securedDocs.map((doc) => (
                <div 
                  key={doc.id} 
                  className="p-3 bg-[#1e233a] border border-[#5d6fa3]/20 rounded-xl flex items-center justify-between text-xs hover:border-[#5d6fa3]/40 transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-white truncate group-hover:text-[#e0dafc] transition-colors">{doc.fileName}</p>
                    <p className="text-[10px] text-[#5d6fa3] uppercase mt-0.5 font-bold tracking-wide">{doc.documentType}</p>
                  </div>
                  <a
                    href={doc.fileUrl}
                    download
                    className="p-1.5 bg-[#2c3353] hover:bg-indigo-950/40 text-[#e0dafc] border border-[#5d6fa3]/30 rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
                    title="Download document copy"
                    referrerPolicy="no-referrer"
                  >
                    <Download className="h-3.5 w-3.5 text-[#e0dafc]" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Medical Alert info & responders */}
        <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#5d6fa3]/20 pb-3">
            <HeartPulse className="h-4.5 w-4.5 text-green-400" />
            <h3 className="font-bold text-white text-sm">
              Clinical Profile & Urgent Contacts
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/20 space-y-2">
              <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Owner Medical Warnings</p>
              <p className="text-[#e0dafc] leading-relaxed font-semibold">
                {profile?.medicalInfo || "No critical respiratory or allergy history reported on registry."}
              </p>
              <div className="flex items-center gap-4 text-[10px] pt-2.5 border-t border-[#5d6fa3]/10 mt-1.5 text-[#5d6fa3] font-medium">
                <p>Age: <span className="font-bold text-[#e0dafc]">{profile?.age || "30"}</span></p>
                <p>Blood Group: <span className="font-bold text-[#e0dafc]">{profile?.bloodGroup || "O+"}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Designated Emergency Contacts</p>
              <div className="p-3 bg-[#1e233a] border border-[#5d6fa3]/15 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{profile?.emergencyContactName || "Not configured"}</p>
                  <p className="text-[10px] text-[#5d6fa3] mt-0.5 font-medium">Spouse / Main Coordinator</p>
                </div>
                {profile?.emergencyContactPhone && (
                  <a
                    href={`tel:${profile.emergencyContactPhone}`}
                    className="p-2 bg-[#2c3353] hover:bg-[#1e233a] text-[#e0dafc] border border-[#5d6fa3]/25 rounded-lg transition-all"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#e0dafc]" />
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
