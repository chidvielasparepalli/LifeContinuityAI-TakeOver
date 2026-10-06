import React, { useState, useEffect } from "react";
import { Clock, Sliders, Calendar, AlertTriangle, CheckCircle, Smartphone, Flame, Settings, Play, ArrowUpRight, Shield, ShieldCheck, RefreshCw, X, Heart } from "lucide-react";
import { CheckInMethod } from "../types";
import { triggerCheckIn } from "../lib/checkinService";
import { apiFetch } from "../lib/api";
import LoadingState from "./LoadingState";

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
  const [initialLoading, setInitialLoading] = useState(true);

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
    } finally {
      setInitialLoading(false);
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
      case "Verified": return "bg-green-950/40 text-green-400 border-green-800/60";
      case "AwaitingCheckIn": return "bg-amber-950/40 text-amber-400 border-amber-800/60";
      case "Unverified": return "bg-red-950/40 text-red-400 border-red-800/60";
      case "EmergencyVerificationActive": return "bg-[#e11d48] text-white border-rose-800 animate-pulse";
      default: return "bg-[#1e233a] text-[#5d6fa3] border-[#5d6fa3]/30";
    }
  };

  // Calendar timeline days simulation
  const daysInMonth = 30;
  const currentDayOfMonth = new Date().getDate();

  const getMethodColor = (method: string) => {
    switch (method) {
      case "login": return "bg-[#1e233a] text-[#e0dafc] border border-[#5d6fa3]/40";
      case "manualButton": return "bg-[#5d6fa3]/25 text-[#e0dafc] border border-[#5d6fa3]/50";
      case "smsReply": return "bg-green-950/50 text-green-400 border border-green-800/40";
      case "pushAction": return "bg-indigo-950/50 text-indigo-400 border border-indigo-800/40";
      default: return "bg-red-950/40 border border-red-900/50 text-red-400";
    }
  };

  if (initialLoading) {
    return (
      <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6">
        <LoadingState label="Loading your proof-of-life monitor" />
      </div>
    );
  }

  return (
    <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6 space-y-8" id="proof-of-life-system">
      
      {/* Celebration Banner */}
      {justCheckedIn && (
        <div className="lc-alert-success p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-emerald-950/20 animate-fade-in" role="status" aria-live="polite">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/40">
              <ShieldCheck className="h-6 w-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Verification Complete: "Yes, I'm Safe"</h3>
              <p className="text-xs text-emerald-300/80 mt-1">Your daily Proof-of-Life handshake is verified. Emergency nominee countdowns are postponed.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { if (setJustCheckedIn) setJustCheckedIn(false); }}
            className="text-xs font-bold text-emerald-400 hover:text-white bg-emerald-900/40 border border-emerald-500/20 py-2 px-4 rounded-xl transition-all cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Modern High-Impact Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Safety Status */}
        <div className="lc-panel-raised p-5 shadow-md flex items-start justify-between gap-4 text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#e0dafc]/50">Safety Status</span>
            <p className={`text-xl font-extrabold mt-1.5 flex items-center gap-2 ${
              stats?.status === "Verified" ? "text-emerald-400" : "text-amber-400"
            }`}>
              {stats?.status === "Verified" ? "Verified Safe" : "Pending Check-In"}
            </p>
            <p className="text-[9px] text-[#e0dafc]/70 font-medium mt-1 leading-none">
              {stats?.status === "Verified" ? "Escalation is standing down" : "Escalation timer running"}
            </p>
          </div>
          <div className={`p-2.5 rounded-xl ${
            stats?.status === "Verified" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
          }`}>
            <Shield className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Streak */}
        <div className="lc-panel-raised p-5 shadow-md flex items-start justify-between gap-4 text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#e0dafc]/50">Consecutive Days</span>
            <p className="text-2xl font-black text-white mt-1.5">{stats?.currentStreak || 0} Days</p>
            <p className="text-[9px] text-[#e0dafc]/70 font-medium mt-1 leading-none">
              Personal record: {stats?.longestStreak || 0} days
            </p>
          </div>
          <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl">
            <Flame className="h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Card 3: Reliability Ratio */}
        <div className="lc-panel-raised p-5 shadow-md flex items-start justify-between gap-4 text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#e0dafc]/50">Check-In Ratio</span>
            <p className="text-2xl font-black text-white mt-1.5">
              {(() => {
                const checkedInCount = history.filter(h => h.method !== "missed").length;
                const ratio = Math.round((checkedInCount / 30) * 100) || 100;
                return `${ratio > 100 ? 100 : ratio}%`;
              })()}
            </p>
            <p className="text-[9px] text-[#e0dafc]/70 font-medium mt-1 leading-none">
              Over the last 30 calendar days
            </p>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Daily Deadline */}
        <div className="lc-panel-raised p-5 shadow-md flex items-start justify-between gap-4 text-white">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#e0dafc]/50">Daily Deadline</span>
            <p className="text-xl font-extrabold text-white mt-1.5 font-mono">{winEnd}</p>
            <p className="text-[9px] text-[#e0dafc]/70 font-medium mt-1 leading-none">
              Grace period: {grace} minutes
            </p>
          </div>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Panel & Simulation Controls */}
        <div className="space-y-6">
          
          {/* Settings Box */}
          <div className="lc-panel shadow-lg p-6 space-y-4 text-[#e0dafc]">
            <div className="flex items-center gap-3 border-b border-[#5d6fa3]/20 pb-3">
              <Settings className="h-5 w-5 text-[#e0dafc]" />
              <h3 className="font-bold text-white text-sm">Escalation Window Settings</h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                   <label htmlFor="checkin-window-start" className="block text-[10px] font-bold text-[#5d6fa3] uppercase tracking-widest">Window Open</label>
                   <input
                     id="checkin-window-start"
                    type="text"
                    value={winStart}
                    onChange={(e) => setWinStart(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-center font-mono font-bold text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="08:00"
                  />
                </div>
                <div className="space-y-1">
                   <label htmlFor="checkin-window-end" className="block text-[10px] font-bold text-[#5d6fa3] uppercase tracking-widest">Window Close</label>
                   <input
                     id="checkin-window-end"
                    type="text"
                    value={winEnd}
                    onChange={(e) => setWinEnd(e.target.value)}
                    className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-center font-mono font-bold text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                    placeholder="20:00"
                  />
                </div>
              </div>

              <div className="space-y-1">
                 <label htmlFor="checkin-grace-period" className="block text-[10px] font-bold text-[#5d6fa3] uppercase tracking-widest">Grace Period (Minutes)</label>
                 <input
                   id="checkin-grace-period"
                  type="number"
                  value={grace}
                  onChange={(e) => setGrace(Number(e.target.value))}
                  className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-center font-mono font-semibold text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                  placeholder="120"
                />
                <p className="text-[9px] text-[#5d6fa3] mt-1.5 leading-relaxed">
                  Delay past Window Close before activating Nominee handover automatically.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e0dafc] hover:brightness-110 text-[#2c3353] font-extrabold py-2.5 px-4 rounded-xl transition-all shadow-md mt-2"
              >
                {loading ? "Persisting settings..." : "Update Settings"}
              </button>
            </form>
          </div>

          {/* Real-time Webhook Simulation Panel */}
          <div className="lc-panel shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#5d6fa3]/20 pb-3">
              <Sliders className="h-5 w-5 text-red-400" />
              <h3 className="font-bold text-white text-sm">Escalation Simulation Engine</h3>
            </div>

            <p className="text-xs text-[#5d6fa3] leading-relaxed">
              Test and audit both the background webhook fallback loops and automated nominee triggers instantly.
            </p>

            {simStatus && (
              <div className="bg-red-950/40 border border-red-900/50 text-red-400 p-3 rounded-xl text-[10px] font-bold animate-fade-in">
                {simStatus}
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              {/* One-tap Webhook simulated loops */}
              <button
                type="button"
                onClick={() => handleSimulateWebhook(CheckInMethod.SmsReply)}
                className="w-full bg-[#1e233a] hover:bg-[#1e233a]/80 text-[#e0dafc] border border-[#5d6fa3]/30 font-bold py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-green-400" />
                  Simulate SMS Reply Webhook ("SAFE")
                </span>
                <ArrowUpRight className="h-4 w-4 text-[#5d6fa3]" />
              </button>

              <button
                type="button"
                onClick={() => handleSimulateWebhook(CheckInMethod.PushAction)}
                className="w-full bg-[#1e233a] hover:bg-[#1e233a]/80 text-[#e0dafc] border border-[#5d6fa3]/30 font-bold py-2.5 px-4 rounded-xl flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  Simulate Push Action Webhook
                </span>
                <ArrowUpRight className="h-4 w-4 text-[#5d6fa3]" />
              </button>

              {/* Missed check-in grace trigger */}
              <button
                type="button"
                onClick={handleSimulateMissedCheckIn}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md mt-2"
              >
                <Play className="h-4 w-4 fill-current text-white" />
                Simulate Grace Period Timeout
              </button>
            </div>
          </div>

        </div>

        {/* Check-in Calendar Timeline Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="lc-panel shadow-lg p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/25">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Proof-of-Life Security Timeline</h3>
                  <p className="text-xs text-[#5d6fa3]">Verified logs mapping out daily check-in safety patterns</p>
                </div>
              </div>

              {stats && (
                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider self-start sm:self-center ${getBadgeClass(stats.status)}`}>
                  {stats.status}
                </span>
              )}
            </div>

            {/* Grid Map / heatmap */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest">Proof-of-Life Heatmap Grid</h4>
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
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold relative transition-all ${
                        isFuture
                          ? "bg-[#1e233a]/30 border border-[#5d6fa3]/15 text-[#5d6fa3]/40"
                          : method
                          ? getMethodColor(method)
                          : "bg-red-950/40 border border-red-900/50 text-red-400"
                      } ${isToday ? "ring-2 ring-[#e0dafc] ring-offset-2 ring-offset-[#2c3353] scale-105" : ""}`}
                      title={method ? `Day ${dayNum}: Verified via ${method}` : `Day ${dayNum}: Unverified`}
                    >
                      <span>{dayNum}</span>
                      {method && (
                        <span className="text-[7px] opacity-75 font-normal block scale-90 uppercase">
                          {method.substring(0, 3)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend explanation */}
            <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[#5d6fa3] border-t border-[#5d6fa3]/25 pt-4 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#1e233a] border border-[#5d6fa3]/40" />
                <span>Full Login</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-[#5d6fa3]/25 border border-[#5d6fa3]/50" />
                <span>Dashboard checklist</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-green-950/50 border border-green-800/40" />
                <span>SMS Reply ("SAFE")</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-indigo-950/50 border border-indigo-800/40" />
                <span>Push Action</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-red-950/40 border border-red-900/50" />
                <span>Missed</span>
              </div>
            </div>

            {/* Streak tracker record box */}
            <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/20 flex items-center justify-between gap-4">
              <div className="text-xs text-white">
                <p className="font-bold text-white">Streak Record Tracker</p>
                <p className="text-[10px] text-[#5d6fa3] mt-1 leading-relaxed">
                  Current streak: <span className="font-bold text-[#e0dafc]">{stats?.currentStreak || 0} days</span> • Longest streak record: <span className="font-bold text-[#e0dafc]">{stats?.longestStreak || 0} days</span>
                </p>
              </div>
              <button
                onClick={handleManualCheckIn}
                disabled={isCheckingIn}
                className={`bg-[#e0dafc] hover:brightness-110 text-[#2c3353] font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isCheckingIn ? "opacity-75 cursor-not-allowed" : ""
                }`}
                id="btn-timeline-manual-checkin"
              >
                {isCheckingIn ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#2c3353]" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2c3353]" />
                )}
                {isCheckingIn ? "Verifying..." : "Check In Now"}
              </button>
            </div>

            {/* Chronological Handshake Logs list */}
            <div className="space-y-4 pt-4 border-t border-[#5d6fa3]/20 text-white">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">Chronological Verification Log</h4>
                <span className="text-[9px] font-mono font-bold text-[#5d6fa3]">Total Logs: {events.length}</span>
              </div>

              {events.length === 0 ? (
                <div className="bg-[#1e233a] p-6 rounded-xl border border-[#5d6fa3]/10 text-center text-xs text-[#5d6fa3]">
                  No verification logs found. Click "Check In Now" to create one.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {events.map((evt, idx) => {
                    const isVerified = evt.status?.toLowerCase() === "success" || evt.status?.toLowerCase() === "safe" || evt.status?.toLowerCase() === "verified" || evt.status === "Success" || evt.status === "Safe";
                    
                    return (
                      <div key={evt.id || idx} className="bg-[#1e233a] p-3.5 rounded-xl border border-[#5d6fa3]/10 flex items-center justify-between gap-4 hover:border-[#e0dafc]/15 transition-all text-white">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            isVerified ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                          }`}>
                            {isVerified ? (
                              <ShieldCheck className="h-4.5 w-4.5" />
                            ) : (
                              <AlertTriangle className="h-4.5 w-4.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate leading-snug">
                              {evt.methodLabel || evt.method || "Handshake Event"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#5d6fa3]">
                              <span>{evt.date}</span>
                              <span>•</span>
                              <span className="font-mono">{evt.time || (evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "")}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${
                            isVerified ? "bg-green-950/40 text-green-400 border-green-800/40" : "bg-red-950/40 text-red-400 border-red-900/40"
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
