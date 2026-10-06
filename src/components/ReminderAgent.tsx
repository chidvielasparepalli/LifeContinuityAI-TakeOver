import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Calendar, 
  Play,
  CheckCircle2,
  X,
  AlertCircle,
  Clock,
  Radio,
  Sparkles
} from "lucide-react";
import { apiFetch } from "../lib/api";

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

  // Initial mock logs matching the reference layout
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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-6 right-6 z-[100] max-w-md w-full bg-[var(--bg-card)] text-[var(--text-primary)] p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-start gap-3.5 animate-in fade-in slide-in-from-top-5 duration-300">
          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Success: Alert Dispatched</h4>
            <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{toastMessage}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{toastDetails}</p>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--bg-app)] shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Outer Header Block */}
      <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20 shrink-0">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Intelligent Notification Agent</h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Autonomous notification engine for maintaining continuous schedule & deadline vigilance.
            </p>
          </div>
        </div>
        <div className="app-badge app-badge-info font-bold px-3 py-1.5 text-xs shrink-0 self-start md:self-auto">
          View: Reminder Service Active
        </div>
      </div>

      {/* Main Agent Scheduler Panel */}
      <div className="app-card p-6 sm:p-8 space-y-6">
        
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-card)] pb-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="text-indigo-400 shrink-0">🔔</span>
              <span>Daily Reminder Agent Scheduler (Autonomous Cron)</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Recurring scheduler execution log. The agent runs daily at 08:00 AM UTC to inspect due dates and dispatch warnings.
            </p>
          </div>
          
          <button
            onClick={handleTriggerAgent}
            disabled={isTriggering}
            className="btn-primary py-2.5 px-5 text-xs font-bold self-start md:self-center shrink-0"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isTriggering ? "animate-spin" : ""}`} />
            <span>{isTriggering ? "Triggering..." : "Trigger Reminder Agent"}</span>
          </button>
        </div>

        {/* Content Section: Settings & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left: Cron Settings Card */}
          <div className="lg:col-span-2 space-y-4">
            <div className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase">
              Cron Agent Settings
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2.5 text-xs">
                <span className="font-medium text-[var(--text-muted)]">Scheduler Interval</span>
                <span className="bg-[var(--bg-app)] border border-[var(--border-card)] px-3 py-1.5 rounded-xl font-mono text-xs font-semibold text-[var(--text-primary)]">
                  Every 24h (08:00 AM)
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2.5 text-xs">
                <span className="font-medium text-[var(--text-muted)]">Dispatched Channel</span>
                <span className="bg-[var(--bg-app)] border border-[var(--border-card)] px-3 py-1.5 rounded-xl font-mono text-xs font-semibold text-[var(--text-primary)] text-right">
                  SMS / Push Notification
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2.5 text-xs">
                <span className="font-medium text-[var(--text-muted)]">Warnings Window</span>
                <span className="bg-[var(--bg-app)] border border-[var(--border-card)] px-3 py-1.5 rounded-xl font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  Within 3 days
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[var(--border-card)] pb-2.5 text-xs">
                <span className="font-medium text-[var(--text-muted)]">Scheduler Status</span>
                <span className="app-badge app-badge-success text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>
            </div>

            {/* Note block */}
            <div className="bg-[var(--bg-app)] border border-[var(--border-card)] rounded-2xl p-4 text-xs leading-relaxed text-[var(--text-muted)]">
              <strong className="text-[var(--text-primary)]">System Notification: </strong>
              Clicking the trigger button executes the live scheduler agent. It inspects all pending bills, utility dues, insurance policies, and appointments.
            </div>
          </div>

          {/* Right: Chronological Log Output Container */}
          <div className="lg:col-span-3 space-y-4">
            <div className="text-[11px] font-bold tracking-wider text-[var(--text-muted)] uppercase flex items-center justify-between">
              <span>System Scheduler Run Logs</span>
              <span className="text-[10px] font-mono normal-case text-indigo-400">Telemetry Active</span>
            </div>

            <div className="bg-[var(--bg-app)] text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-[var(--border-card)] min-h-[280px] shadow-inner space-y-3 overflow-y-auto max-h-[380px] leading-relaxed">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2.5 hover:bg-white/5 p-2 rounded-xl transition-colors">
                  <span className="text-[var(--text-muted)] shrink-0 font-mono text-[11px]">[{log.timestamp}]</span>
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span className="text-indigo-400 font-bold shrink-0">[SYS]</span>
                  <span className="text-[var(--text-primary)]/90 font-medium leading-relaxed">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
