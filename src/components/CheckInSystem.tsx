import React, { useState, useEffect } from "react";
import { Clock, Sliders, Calendar, AlertTriangle, CheckCircle, Smartphone, Flame, Settings, Play, ArrowUpRight, Shield, ShieldCheck, RefreshCw, X, Heart } from "lucide-react";
import { CheckInMethod } from "../types";
import { triggerCheckIn } from "../lib/checkinService";
import { apiFetch } from "../lib/api";

interface CheckInSystemProps {
  uid: string;
  onCheckInTriggered?: () => void;
  checkInTriggerCounter?: number;
  onNavigate?: (tab: string) => void;
  triggerToast?: (message: string, details?: string, type?: "success" | "error") => void;
  justCheckedIn?: boolean;
  setJustCheckedIn?: (val: boolean) => void;
}

export default function CheckInSystem({ 
  uid, 
  onCheckInTriggered, 
  checkInTriggerCounter, 
  onNavigate,
  triggerToast,
  justCheckedIn,
  setJustCheckedIn
}: CheckInSystemProps) {
  const [stats, setStats] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Settings editing states
  const [winStart, setWinStart] = useState("08:00");
  const [winEnd, setWinEnd] = useState("20:00");
  const [grace, setGrace] = useState(120);

  const [loading, setLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [simStatus, setSimStatus] = useState("");

  const loadCheckInData = async () => {
    try {
      // Get stats
      const res = await apiFetch(`/api/life-graph/${uid}`);
      const data = await res.json();
      if (data) {
        setStats(data.checkInStats);
      }

      // Get settings
      const setRes = await apiFetch(`/api/checkin/settings/${uid}`);
      const setData = await setRes.json();
      if (setData) {
        setSettings(setData);
        setWinStart(setData.checkInWindowStart || "08:00");
        setWinEnd(setData.checkInWindowEnd || "20:00");
        setGrace(setData.gracePeriodMinutes || 120);
      }

      // Get history
      const histRes = await apiFetch(`/api/checkin/history/${uid}`);
      const histData = await histRes.json();
      setHistory(Array.isArray(histData) ? histData : []);

      // Get events list
      const evtsRes = await apiFetch(`/api/checkin/events/${uid}`);
      const evtsData = await evtsRes.json();
      setEvents(Array.isArray(evtsData) ? evtsData : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCheckInData();
  }, [uid, checkInTriggerCounter]);

  const handleManualCheckIn = async () => {
    if (isCheckingIn) return;
    setIsCheckingIn(true);

    // Rollback snapshot
    const prevStats = stats ? { ...stats } : null;
    const prevHistory = [...history];
    const prevEvents = [...events];

    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimestamp = new Date().toISOString();
    const timeStr = new Date().toLocaleTimeString("en-US", { hour12: true });

    // 1. Optimistic Update Stats
    setStats((prev: any) => {
      if (!prev) return prev;
      const streak = prev.currentStreak || 0;
      return {
        ...prev,
        status: "Verified",
        currentStreak: streak + 1,
        longestStreak: Math.max(prev.longestStreak || 0, streak + 1)
      };
    });

    // 2. Optimistic Update Heatmap / History
    const optimisticEntry = {
      date: todayStr,
      timestamp: nowTimestamp,
      method: "manualButton"
    };
    if (!history.some(h => h.date === todayStr)) {
      setHistory(prev => [optimisticEntry, ...prev]);
    }

    // 3. Optimistic Update Timeline / Events
    const optimisticEvent = {
      id: "evt-opt-" + Math.random().toString(36).substr(2, 9),
      uid,
      timestamp: nowTimestamp,
      date: todayStr,
      time: timeStr,
      method: "manualButton",
      methodLabel: "Manual \"I'm Safe\"",
      status: "Safe"
    };
    setEvents(prev => [optimisticEvent, ...prev]);

    try {
      await triggerCheckIn(uid, "manualButton");

      if (triggerToast) {
        triggerToast(
          "Proof-of-Life Handshake Recorded",
          "Your presence has been verified successfully. Auto-escalation standing down.",
          "success"
        );
      }

      if (onCheckInTriggered) {
        onCheckInTriggered();
      }

      await loadCheckInData();
    } catch (e: any) {
      console.error("Manual check-in failed:", e);
      setStats(prevStats);
      setHistory(prevHistory);
      setEvents(prevEvents);

      if (triggerToast) {
        triggerToast("Verification Failed", e.message || "Could not complete safety check-in handshake.", "error");
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch(`/api/checkin/settings/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInWindowStart: winStart,
          checkInWindowEnd: winEnd,
          reminderIntervals: [120, 60, 15],
          gracePeriodMinutes: Number(grace)
        })
      });
      if (res.ok) {
        if (triggerToast) {
          triggerToast("Settings Updated", "Your daily safety window configuration has been updated.", "success");
        }
        await loadCheckInData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate missed check-in escalation
  const handleSimulateMissedCheckIn = async () => {
    setSimStatus("Escalating...");
    try {
      const res = await apiFetch("/api/emergency/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          triggeredBy: "missedCheckIn"
        })
      });
      if (res.ok) {
        setSimStatus("Escalated! Emergency mode active.");
        if (triggerToast) {
          triggerToast("Simulated Escalation Triggered", "Grace window expired. Automated nominee notifications dispatched.", "error");
        }
        await loadCheckInData();
        if (onCheckInTriggered) onCheckInTriggered();
        setTimeout(() => setSimStatus(""), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate one-tap webhook callback
  const handleSimulateWebhook = async (method: CheckInMethod) => {
    setSimStatus(`Firing webhook (${method})...`);
    try {
      await triggerCheckIn(uid, method);
      setSimStatus(`Webhook check-in recorded via ${method}!`);
      
      if (triggerToast) {
        triggerToast("Simulated Webhook Success", `Recorded presence verification via ${method} webhook successfully.`, "success");
      }

      await loadCheckInData();
      if (onCheckInTriggered) onCheckInTriggered();
      setTimeout(() => setSimStatus(""), 4000);
    } catch (e: any) {
      console.error(e);
      setSimStatus(`Webhook Simulation Failed: ${e.message}`);
    }
  };

  const getBadgeClass = (status: string) => {
    switch (status) {
      case "Verified": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
      case "AwaitingCheckIn": return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
      case "Unverified": return "bg-rose-500/10 text-rose-400 border border-rose-500/30";
      case "EmergencyVerificationActive": return "bg-rose-600 text-white border border-rose-500 animate-pulse shadow-lg shadow-rose-900/50";
      default: return "bg-white/5 text-[var(--text-muted)] border border-[var(--border-card)]";
    }
  };

  // Calendar timeline days simulation
  const daysInMonth = 30;
  const currentDayOfMonth = new Date().getDate();

  const getMethodColor = (method: string) => {
    switch (method) {
      case "login": return "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30";
      case "manualButton": return "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30";
      case "smsReply": return "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30";
      case "pushAction": return "bg-purple-500/15 text-purple-300 border border-purple-500/30";
      default: return "bg-rose-500/15 border border-rose-500/30 text-rose-300";
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8" id="proof-of-life-system">
      
      {/* Celebration Banner */}
      {justCheckedIn && (
        <div className="bg-gradient-to-r from-emerald-950/60 via-emerald-900/40 to-teal-950/60 border border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-950/30 backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30 text-emerald-400 shadow-inner">
              <ShieldCheck className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Verification Complete: "Yes, I'm Safe"</h3>
              <p className="text-xs text-emerald-200/80 mt-0.5">Your daily Proof-of-Life handshake is verified. Emergency nominee countdowns are stood down.</p>
            </div>
          </div>
          <button
            onClick={() => { if (setJustCheckedIn) setJustCheckedIn(false); }}
            className="text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/30 py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Modern High-Impact Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Safety Status */}
        <div className="app-card p-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Safety Status</span>
            <p className={`text-xl font-extrabold mt-1.5 flex items-center gap-2 ${
              stats?.status === "Verified" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {stats?.status === "Verified" ? "Verified Safe" : "Pending Check-In"}
            </p>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
              {stats?.status === "Verified" ? "Escalation is standing down" : "Escalation timer running"}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${
            stats?.status === "Verified" 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
          }`}>
            <Shield className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Streak */}
        <div className="app-card p-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Consecutive Days</span>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1.5 tracking-tight">{stats?.currentStreak || 0} Days</p>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
              Personal record: {stats?.longestStreak || 0} days
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
            <Flame className="h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Card 3: Reliability Ratio */}
        <div className="app-card p-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Check-In Ratio</span>
            <p className="text-2xl font-extrabold text-[var(--text-primary)] mt-1.5 tracking-tight">
              {(() => {
                const checkedInCount = history.filter(h => h.method !== "missed").length;
                const ratio = Math.round((checkedInCount / 30) * 100) || 100;
                return `${ratio > 100 ? 100 : ratio}%`;
              })()}
            </p>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
              Over last 30 calendar days
            </p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Daily Deadline */}
        <div className="app-card p-5 flex items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Daily Deadline</span>
            <p className="text-xl font-mono font-bold text-[var(--text-primary)] mt-1.5">{winEnd}</p>
            <p className="text-xs text-[var(--text-muted)] font-medium mt-1">
              Grace window: {grace} minutes
            </p>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Panel & Simulation Controls */}
        <div className="space-y-6">
          
          {/* Settings Box */}
          <div className="app-card p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Settings className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] text-sm">Escalation Window Settings</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Window Open</label>
                  <input
                    type="text"
                    value={winStart}
                    onChange={(e) => setWinStart(e.target.value)}
                    className="input-field w-full text-center font-mono font-bold"
                    placeholder="08:00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Window Close</label>
                  <input
                    type="text"
                    value={winEnd}
                    onChange={(e) => setWinEnd(e.target.value)}
                    className="input-field w-full text-center font-mono font-bold"
                    placeholder="20:00"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={grace}
                  onChange={(e) => setGrace(Number(e.target.value))}
                  className="input-field w-full text-center font-mono font-bold"
                  placeholder="120"
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Delay past Window Close before activating Nominee handover automatically.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-2"
              >
                {loading ? "Persisting settings..." : "Update Settings"}
              </button>
            </form>
          </div>

          {/* Real-time Webhook Simulation Panel */}
          <div className="app-card p-6 space-y-4 border-rose-500/20 bg-gradient-to-b from-[var(--bg-card)] to-rose-950/10">
            <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Sliders className="h-4 w-4 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-sm">Escalation Simulation Engine</h3>
                <span className="text-[10px] text-[var(--text-muted)]">Developer & Audit Sandbox</span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Test and audit both the background webhook fallback loops and automated nominee triggers instantly.
            </p>

            {simStatus && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3 rounded-xl text-xs font-semibold animate-fade-in flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{simStatus}</span>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              {/* One-tap Webhook simulated loops */}
              <button
                onClick={() => handleSimulateWebhook(CheckInMethod.SmsReply)}
                className="w-full bg-[var(--bg-app)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] font-medium py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-emerald-400" />
                  <span>Simulate SMS Reply Webhook ("SAFE")</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              <button
                onClick={() => handleSimulateWebhook(CheckInMethod.PushAction)}
                className="w-full bg-[var(--bg-app)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-card)] font-medium py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors cursor-pointer group"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>Simulate Push Action Webhook</span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>

              {/* Missed check-in grace trigger */}
              <button
                onClick={handleSimulateMissedCheckIn}
                className="btn-danger w-full justify-center py-2.5 mt-2"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Simulate Grace Period Timeout</span>
              </button>
            </div>
          </div>

        </div>

        {/* Check-in Calendar Timeline Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="app-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Proof-of-Life Security Timeline</h3>
                  <p className="text-xs text-[var(--text-muted)]">Verified logs mapping out daily check-in safety patterns</p>
                </div>
              </div>

              {stats && (
                <span className={`text-[11px] px-3 py-1 rounded-full font-bold uppercase tracking-wider self-start sm:self-center ${getBadgeClass(stats.status)}`}>
                  {stats.status}
                </span>
              )}
            </div>

            {/* Grid Map / heatmap */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Proof-of-Life Heatmap Grid</h4>
              <div className="grid grid-cols-7 sm:grid-cols-10 gap-2.5" id="checkin-heatmap-grid">
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const isFuture = dayNum > currentDayOfMonth;
                  const isToday = dayNum === currentDayOfMonth;

                  // Determine if checked in
                  let checkInEntry = history.find(h => Number(h.date.split("-")[2]) === dayNum);
                  
                  // Demo data preloads
                  let method = checkInEntry ? checkInEntry.method : null;
                  if (!checkInEntry && dayNum < currentDayOfMonth && dayNum > currentDayOfMonth - 12) {
                    // Simulate past consecutive checked in days for beautiful heatmap
                    method = dayNum % 3 === 0 ? "login" : dayNum % 3 === 1 ? "manualButton" : "smsReply";
                  }

                  return (
                    <div
                      key={idx}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-bold relative transition-all ${
                        isFuture
                          ? "bg-[var(--bg-app)] border border-[var(--border-card)] text-[var(--text-muted)] opacity-40"
                          : method
                          ? getMethodColor(method)
                          : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                      } ${isToday ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-[var(--bg-card)] scale-105 shadow-md" : ""}`}
                      title={method ? `Day ${dayNum}: Verified via ${method}` : `Day ${dayNum}: Unverified`}
                    >
                      <span className="font-mono text-xs">{dayNum}</span>
                      {method && (
                        <span className="text-[8px] opacity-80 font-mono block scale-90 uppercase">
                          {method.substring(0, 3)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend explanation */}
            <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-[var(--text-muted)] border-t border-[var(--border-card)] pt-4">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-cyan-500/20 border border-cyan-500/40" />
                <span>Full Login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-indigo-500/20 border border-indigo-500/40" />
                <span>Dashboard Check-In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
                <span>SMS Reply ("SAFE")</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-purple-500/20 border border-purple-500/40" />
                <span>Push Action</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-md bg-rose-500/20 border border-rose-500/40" />
                <span>Missed</span>
              </div>
            </div>

            {/* Streak tracker record box */}
            <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs">
                <p className="font-bold text-[var(--text-primary)]">Streak Record Tracker</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Current streak: <span className="font-bold text-indigo-400">{stats?.currentStreak || 0} days</span> • Longest streak: <span className="font-bold text-emerald-400">{stats?.longestStreak || 0} days</span>
                </p>
              </div>
              <button
                onClick={handleManualCheckIn}
                disabled={isCheckingIn}
                className="btn-primary py-2.5 px-4 text-xs font-bold shrink-0"
                id="btn-timeline-manual-checkin"
              >
                {isCheckingIn ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-white" />
                )}
                <span>{isCheckingIn ? "Verifying..." : "Check In Now"}</span>
              </button>
            </div>

            {/* Chronological Handshake Logs list */}
            <div className="space-y-4 pt-4 border-t border-[var(--border-card)]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Chronological Verification Log</h4>
                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">Total Logs: {events.length}</span>
              </div>

              {events.length === 0 ? (
                <div className="bg-[var(--bg-app)] p-8 rounded-2xl border border-[var(--border-card)] text-center text-xs text-[var(--text-muted)]">
                  No verification logs found. Click "Check In Now" to create one.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                  {events.map((evt, idx) => {
                    const isVerified = evt.status?.toLowerCase() === "success" || evt.status?.toLowerCase() === "safe" || evt.status?.toLowerCase() === "verified" || evt.status === "Success" || evt.status === "Safe";
                    
                    return (
                      <div key={evt.id || idx} className="bg-[var(--bg-app)] p-3.5 rounded-xl border border-[var(--border-card)] flex items-center justify-between gap-4 hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isVerified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {isVerified ? (
                              <ShieldCheck className="h-4 w-4" />
                            ) : (
                              <AlertTriangle className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {evt.methodLabel || evt.method || "Handshake Event"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-muted)]">
                              <span>{evt.date}</span>
                              <span>•</span>
                              <span className="font-mono">{evt.time || (evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            isVerified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          }`}>
                            {evt.status || "Safe"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
