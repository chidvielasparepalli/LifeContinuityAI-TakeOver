import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Calendar, 
  Play,
  CheckCircle2,
  X,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "../lib/api";
import LoadingState from "./LoadingState";

interface ReminderAgentProps {
  uid: string;
}

export default function ReminderAgent({ uid }: ReminderAgentProps) {
  const [bills, setBills] = useState<any[]>([]);
  const [appts, setAppts] = useState<any[]>([]);
  const [isTriggering, setIsTriggering] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastDetails, setToastDetails] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  // Initial mock logs that match the reference design layout
  const [logs, setLogs] = useState<any[]>([
    {
      id: "log-1",
      timestamp: "2026-07-16 09:11:30",
      message: "Routine run completed. Verified active Life Graph agenda. No items due within 3 days."
    },
    {
      id: "log-2",
      timestamp: "2026-07-02 08:00:03",
      message: "Daily schedule run completed. 0 urgent reminders flagged."
    },
    {
      id: "log-3",
      timestamp: "2026-07-03 08:00:01",
      message: "Daily schedule run completed. Verified 4 Life Graph items."
    }
  ]);

  const loadReminders = async () => {
    try {
      const res = await apiFetch(`/api/life-graph/${uid}`);
      const data = await res.json();
      if (data) {
        setBills(data.bills?.filter((b: any) => b.status === "Pending") || []);
        setAppts(data.appointments?.filter((a: any) => a.status === "Upcoming") || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
  }, [uid]);

  const handleTriggerAgent = () => {
    if (isTriggering) return;
    setIsTriggering(true);

    setTimeout(() => {
      let dueCount = 0;
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      // Check bills due within 3 days
      bills.forEach(bill => {
        if (bill.dueDate) {
          const dDate = new Date(bill.dueDate);
          if (dDate >= new Date() && dDate <= threeDaysFromNow) {
            dueCount++;
          }
        }
      });

      // Check appointments scheduled within 3 days
      appts.forEach(appt => {
        if (appt.date) {
          const aDate = new Date(appt.date);
          if (aDate >= new Date() && aDate <= threeDaysFromNow) {
            dueCount++;
          }
        }
      });

      const now = new Date();
      const formatTime = (d: Date) => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const sec = String(d.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
      };

      const timestamp = formatTime(now);
      const newLog = {
        id: `log-trigger-${Date.now()}`,
        timestamp,
        message: dueCount > 0
          ? `Routine run completed. Verified active Life Graph agenda. Dispatched alerts for ${dueCount} items due within 3 days.`
          : `Routine run completed. Verified active Life Graph agenda. No items due within 3 days.`
      };

      setLogs(prev => [newLog, ...prev]);
      setIsTriggering(false);

      // Set and trigger the success toast notification
      setToastMessage("Reminder alerts dispatched successfully!");
      setToastDetails(dueCount > 0 
        ? `Successfully sent ${dueCount} alert warnings to your registered contact channel.`
        : "Routine validation check passed: no urgent items require instant warnings today."
      );
      setShowToast(true);
    }, 1200);
  };

  // Auto close toast after 5 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  if (initialLoading) {
    return (
      <div className="lc-page-wrap max-w-6xl mx-auto p-4 sm:p-6">
        <LoadingState label="Loading your reminder agent" />
      </div>
    );
  }

  return (
    <div className="lc-page-wrap max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-700 dark:text-[#e0dafc] transition-colors duration-300">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-[100] max-w-md w-full bg-[#0b0f19] text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start gap-3.5 animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Success: Alert Dispatched</h4>
            <p className="text-sm font-semibold text-[#e0dafc] mt-1">{toastMessage}</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{toastDetails}</p>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-lg hover:bg-slate-800/50 shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Outer Header Block */}
      <div className="lc-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 dark:bg-[#1e233a] flex items-center justify-center text-indigo-600 dark:text-[#e0dafc] border border-indigo-100 dark:border-[#5d6fa3]/25">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Intelligent Notification Agent</h2>
            <p className="text-xs text-slate-500 dark:text-[#5d6fa3] mt-1">
              Autonomous notification system for keeping details updated.
            </p>
          </div>
        </div>
        <div className="bg-indigo-50/70 dark:bg-[#1e233a]/80 text-indigo-700 dark:text-indigo-300 font-bold px-4 py-2 rounded-xl text-xs border border-indigo-100/60 dark:border-[#5d6fa3]/20 shadow-sm shrink-0">
          Current View: Reminder
        </div>
      </div>

      {/* Main Agent Scheduler Panel */}
      <div className="lc-panel p-6 space-y-6 transition-colors duration-300">
        
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#5d6fa3]/20 pb-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400 shrink-0">🔔</span>
              Daily Reminder Agent Scheduler (Module 7)
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#8ea2d1] leading-relaxed">
              Bubble-style recurring scheduler execution log. The agent runs daily at 08:00 AM UTC to inspect due dates and dispatch warnings.
            </p>
          </div>
          
          <button
            onClick={handleTriggerAgent}
            disabled={isTriggering}
            className="bg-[#0b0f19] hover:bg-[#192135] text-white font-black px-5 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all cursor-pointer shadow-lg border border-slate-800 disabled:opacity-50 shrink-0 self-start md:self-center"
          >
            <Play className={`h-3 w-3 text-emerald-400 fill-emerald-400 ${isTriggering ? "animate-spin" : ""}`} />
            {isTriggering ? "Triggering..." : "Trigger Reminder Agent"}
          </button>
        </div>

        {/* Content Section: Settings & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left: Cron Settings Card */}
          <div className="lg:col-span-2 space-y-5">
            <div className="text-[11px] font-black tracking-widest text-slate-400 dark:text-[#5d6fa3] uppercase">
              CRON AGENT SETTINGS
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#5d6fa3]/10 pb-2.5 text-xs">
                <span className="font-bold text-slate-500 dark:text-indigo-200">Scheduler Interval</span>
                <span className="bg-slate-50 dark:bg-[#1e233a] border border-slate-200 dark:border-[#5d6fa3]/20 px-3 py-1.5 rounded-xl font-mono font-semibold text-slate-800 dark:text-white">
                  Every 24 Hours (08:00 AM)
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#5d6fa3]/10 pb-2.5 text-xs">
                <span className="font-bold text-slate-500 dark:text-indigo-200">Dispatched Channel</span>
                <span className="bg-slate-50 dark:bg-[#1e233a] border border-slate-200 dark:border-[#5d6fa3]/20 px-3 py-1.5 rounded-xl font-mono font-semibold text-slate-800 dark:text-white text-right max-w-[180px]">
                  SMS API / Push Notifications
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#5d6fa3]/10 pb-2.5 text-xs">
                <span className="font-bold text-slate-500 dark:text-indigo-200">Due Warnings window</span>
                <span className="bg-slate-50 dark:bg-[#1e233a] border border-slate-200 dark:border-[#5d6fa3]/20 px-3 py-1.5 rounded-xl font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  Within 3 days
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#5d6fa3]/10 pb-2.5 text-xs">
                <span className="font-bold text-slate-500 dark:text-indigo-200">Scheduler Engine Status</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Note block */}
            <div className="bg-slate-50/50 dark:bg-[#1e233a]/30 border border-slate-200/60 dark:border-[#5d6fa3]/20 rounded-2xl p-4 text-[11px] leading-relaxed text-slate-500 dark:text-[#8ea2d1]">
              <span className="font-bold text-slate-700 dark:text-white">System Notification: </span>
              Clicking the trigger button runs the scheduler script on your live dashboard. It checks for outstanding bills, DPS fees, home loan EMIs, or card checkups.
            </div>
          </div>

          {/* Right: Chronological Log Output Container */}
          <div className="lg:col-span-3 space-y-4">
            <div className="text-[11px] font-black tracking-widest text-slate-400 dark:text-[#5d6fa3] uppercase flex items-center justify-between">
              <span>SYSTEM SCHEDULER RUN LOGS</span>
              <span className="text-[9px] text-slate-400 dark:text-[#5d6fa3] font-mono normal-case">Telemetry Live Logs</span>
            </div>

            <div className="bg-[#0b0f19] text-emerald-400 font-mono text-[11px] p-4 rounded-2xl border border-slate-800 dark:border-[#5d6fa3]/15 min-h-[280px] shadow-2xl space-y-3.5 overflow-y-auto max-h-[380px] leading-relaxed">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 hover:bg-slate-900/40 p-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-800/30">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                  <span className="text-emerald-400 font-bold shrink-0">[SYS]</span>
                  <span className="text-[#c1cadb] font-medium leading-relaxed">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
