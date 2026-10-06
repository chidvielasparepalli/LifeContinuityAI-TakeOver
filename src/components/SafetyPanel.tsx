import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Clock, 
  Bell, 
  Smartphone, 
  Sliders, 
  CheckCircle, 
  UserCheck, 
  Volume2, 
  Play, 
  Activity, 
  HelpCircle, 
  ListOrdered, 
  Save, 
  AlertTriangle,
  Mail,
  Zap,
  Search,
  RefreshCw,
  FileText,
  ShieldAlert,
  Key,
  Lock,
  User,
  Eye
} from "lucide-react";
import { apiFetch } from "../lib/api";

interface SafetyPanelProps {
  uid: string;
}

export default function SafetyPanel({ uid }: SafetyPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Settings states corresponding to database
  const [winStart, setWinStart] = useState("08:00");
  const [winEnd, setWinEnd] = useState("20:00");
  const [grace, setGrace] = useState(120);
  const [intervals, setIntervals] = useState<number[]>([120, 60, 15]);

  // Extended safety custom fields
  const [checkingInterval, setCheckingInterval] = useState("daily");
  const [activeChannels, setActiveChannels] = useState<string[]>(["sms", "email", "login"]);
  const [secondaryValidatorName, setSecondaryValidatorName] = useState("Sarah Mercer (Sister)");
  const [secondaryValidatorPhone, setSecondaryValidatorPhone] = useState("+1 (555) 019-2834");

  // Heartbeat test state
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [heartbeatLog, setHeartbeatLog] = useState<string[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/checkin/settings/${uid}`);
        const data = await res.json();
        if (data) {
          setWinStart(data.checkInWindowStart || "08:00");
          setWinEnd(data.checkInWindowEnd || "20:00");
          setGrace(data.gracePeriodMinutes || 120);
          setIntervals(data.reminderIntervals || [120, 60, 15]);
          
          if (data.checkingInterval) setCheckingInterval(data.checkingInterval);
          if (data.activeChannels) setActiveChannels(data.activeChannels);
          if (data.secondaryValidatorName) setSecondaryValidatorName(data.secondaryValidatorName);
          if (data.secondaryValidatorPhone) setSecondaryValidatorPhone(data.secondaryValidatorPhone);
        }
      } catch (e) {
        console.error("Error loading safety settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [uid]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    try {
      const res = await apiFetch(`/api/checkin/settings/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInWindowStart: winStart,
          checkInWindowEnd: winEnd,
          reminderIntervals: intervals,
          gracePeriodMinutes: Number(grace),
          checkingInterval,
          activeChannels,
          secondaryValidatorName,
          secondaryValidatorPhone
        })
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving safety settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleChannel = (channel: string) => {
    if (activeChannels.includes(channel)) {
      setActiveChannels(activeChannels.filter(c => c !== channel));
    } else {
      setActiveChannels([...activeChannels, channel]);
    }
  };

  const toggleInterval = (mins: number) => {
    if (intervals.includes(mins)) {
      setIntervals(intervals.filter(i => i !== mins).sort((a,b) => b-a));
    } else {
      setIntervals([...intervals, mins].sort((a,b) => b-a));
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
      
      {/* Description Info Header */}
      <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-400" />
            <span>Lighthouse Safety Configuration Desk</span>
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-2xl">
            This panel governs your proof-of-life confirmation thresholds. Ensure these values match your routine so that safety notifications feel natural, while establishing bulletproof contingency handovers for your Nominees.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="app-badge app-badge-info text-[11px] font-bold">Auto Escalation: STANDBY</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        
        {/* Main Settings form */}
        <div className="space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Box 1: Checking intervals & active window */}
            <div className="app-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">Proof-of-Life Intervals & Safety Windows</h4>
                  <p className="text-xs text-[var(--text-muted)]">Determine how often and when Lighthouse checks on you</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Check-in frequency */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Verification Frequency
                  </label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { id: "daily", title: "Once Daily Proof-of-life", desc: "One check-in required inside the window" },
                      { id: "twice", title: "Twice Daily Verification", desc: "Morning and evening checkpoints" },
                      { id: "hourly", title: "Continuous (6-Hour Interval)", desc: "High-frequency safety checks for active safety monitoring" }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setCheckingInterval(opt.id)}
                        className={`text-left p-3.5 rounded-2xl border text-xs transition-all cursor-pointer ${
                          checkingInterval === opt.id
                            ? "bg-indigo-500/15 border-indigo-500 text-[var(--text-primary)] shadow-sm"
                            : "bg-[var(--bg-app)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-indigo-500/30"
                        }`}
                      >
                        <p className="font-bold text-xs">{opt.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timing Window inputs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                      Active Monitoring Window
                    </label>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      Notifications are only dispatched during this timeframe to prevent night-time disruptions.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Opens</span>
                        <input
                          type="text"
                          value={winStart}
                          onChange={(e) => setWinStart(e.target.value)}
                          className="input-field w-full text-center font-mono font-bold"
                          placeholder="08:00"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Closes</span>
                        <input
                          type="text"
                          value={winEnd}
                          onChange={(e) => setWinEnd(e.target.value)}
                          className="input-field w-full text-center font-mono font-bold"
                          placeholder="20:00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-card)] text-xs text-[var(--text-muted)] leading-relaxed">
                    <strong className="text-[var(--text-primary)]">Rule Note:</strong> Your daily check-in is complete if you log in, respond to an SMS, or sync workspace activity once between <span className="font-bold text-indigo-400">{winStart}</span> and <span className="font-bold text-indigo-400">{winEnd}</span>.
                  </div>
                </div>

              </div>
            </div>

            {/* Box 2: Grace period & Reminder triggers */}
            <div className="app-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">Grace Period & Prior Reminder Escalations</h4>
                  <p className="text-xs text-[var(--text-muted)]">Define pre-deadline warnings and emergency delays</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Grace Period slider/options */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Grace Period Delay Post-Deadline
                  </label>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    How much time do you have to check in after the active window closes before Nominee extraction triggers?
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {[
                      { mins: 2, label: "2 Minutes", desc: "Ultra-high alert" },
                      { mins: 60, label: "1 Hour", desc: "High alert" },
                      { mins: 120, label: "2 Hours", desc: "Standard buffer" },
                      { mins: 240, label: "4 Hours", desc: "Relaxed buffer" }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.mins}
                        onClick={() => setGrace(opt.mins)}
                        className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          grace === opt.mins
                            ? "bg-indigo-500/15 border-indigo-500 text-[var(--text-primary)] shadow-sm"
                            : "bg-[var(--bg-app)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-indigo-500/30"
                        }`}
                      >
                        <span className="block font-bold text-xs">{opt.label}</span>
                        <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reminder triggers checklist */}
                <div className="space-y-3 pt-2">
                  <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Pre-Deadline Warnings Dispatch Schedule
                  </label>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Lighthouse will send you direct alerts on your enabled communication channels at these intervals prior to the window closing.
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {[
                      { id: 120, label: "2 Hours Prior", keyName: "t2h" },
                      { id: 60, label: "1 Hour Prior", keyName: "t1h" },
                      { id: 30, label: "30 Mins Prior", keyName: "t30m" },
                      { id: 15, label: "15 Mins Prior", keyName: "t15m" }
                    ].map((rem) => {
                      const isActive = intervals.includes(rem.id);
                      return (
                        <button
                          type="button"
                          key={rem.id}
                          onClick={() => toggleInterval(rem.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs transition-all text-left cursor-pointer ${
                            isActive
                              ? "bg-indigo-500/15 border-indigo-500 text-[var(--text-primary)]"
                              : "bg-[var(--bg-app)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-md flex items-center justify-center border transition-all ${
                            isActive ? "bg-indigo-600 border-indigo-500 text-white" : "border-[var(--border-card)]"
                          }`}>
                            {isActive && <CheckCircle className="h-3 w-3" />}
                          </div>
                          <span className="font-bold text-xs">{rem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Verification Channels & Escalation Validator */}
            <div className="app-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-4">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">Verification Channels & Secondary Validators</h4>
                  <p className="text-xs text-[var(--text-muted)]">Manage notification delivery methods and backup contacts</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Channels toggles */}
                <div className="space-y-3">
                  <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                    Authorized Safety Channels
                  </label>
                  <div className="space-y-2.5">
                    {[
                      { id: "sms", icon: Smartphone, title: "SMS Reminders & Direct Reply", desc: "Automated text alerts to your mobile" },
                      { id: "email", icon: Mail, title: "Email Backup Verification", desc: "Daily proof-of-life email dispatch" },
                      { id: "login", icon: UserCheck, title: "Dashboard Session Logins", desc: "Logging in checks you in automatically" }
                    ].map((chan) => {
                      const isChecked = activeChannels.includes(chan.id);
                      const Icon = chan.icon;
                      return (
                        <div
                          key={chan.id}
                          onClick={() => toggleChannel(chan.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-indigo-500/10 border-indigo-500/40 text-[var(--text-primary)]"
                              : "bg-[var(--bg-app)] border-[var(--border-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className={`h-4.5 w-4.5 shrink-0 ${isChecked ? "text-indigo-400" : "text-[var(--text-muted)]"}`} />
                            <div className="min-w-0 text-left">
                              <p className="font-bold text-xs truncate text-[var(--text-primary)]">{chan.title}</p>
                              <p className="text-[11px] text-[var(--text-muted)] truncate">{chan.desc}</p>
                            </div>
                          </div>
                          <div className={`h-5 w-9 rounded-full transition-colors flex items-center p-0.5 shrink-0 ${
                            isChecked ? "bg-indigo-600 justify-end" : "bg-slate-700 justify-start"
                          }`}>
                            <span className="h-4 w-4 rounded-full bg-white shadow-md block" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Secondary trusted contact validators */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                      Secondary Safety Contact (Validator)
                    </label>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      If you miss your check-in deadline, this trusted validator is notified first to verify your status before nominee release.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Validator Name</span>
                      <input
                        type="text"
                        value={secondaryValidatorName}
                        onChange={(e) => setSecondaryValidatorName(e.target.value)}
                        className="input-field w-full text-xs"
                        placeholder="e.g. Sarah Mercer (Sister)"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">Validator Phone Number</span>
                      <input
                        type="text"
                        value={secondaryValidatorPhone}
                        onChange={(e) => setSecondaryValidatorPhone(e.target.value)}
                        className="input-field w-full text-xs"
                        placeholder="e.g. +1 (555) 019-2834"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Form Save Button and success trigger */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-card)] gap-4">
              <div className="text-xs">
                {saveSuccess ? (
                  <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>Safety configuration saved securely to profile registry!</span>
                  </p>
                ) : (
                  <p className="text-[var(--text-muted)] font-medium leading-relaxed">
                    Make sure to save changes to register update events onto your nominee ledger.
                  </p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary py-3 px-8 text-xs font-bold shrink-0 cursor-pointer"
                id="btn-safety-save-settings"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? "Persisting Settings..." : "Save Safety Parameters"}</span>
              </button>
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
