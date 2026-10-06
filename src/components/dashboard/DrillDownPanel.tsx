import React from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { UnifiedEvent } from "./types";

interface DrillDownPanelProps {
  currentEvent: UnifiedEvent | undefined;
  isConfiguring: boolean;
  setIsConfiguring: (val: boolean) => void;
  editName: string;
  setEditName: (val: string) => void;
  editDate: string;
  setEditDate: (val: string) => void;
  editTime: string;
  setEditTime: (val: string) => void;
  editCategory: string;
  setEditCategory: (val: "Medical Consults" | "Financial / EMI" | "Family & School") => void;
  editPriority: "Critical" | "High" | "Medium" | "Low";
  setEditPriority: (val: "Critical" | "High" | "Medium" | "Low") => void;
  editAmount: string;
  setEditAmount: (val: string) => void;
  editStatus: string;
  setEditStatus: (val: string) => void;
  editNotes: string;
  setEditNotes: (val: string) => void;
  editLocation: string;
  setEditLocation: (val: string) => void;
  onResetView: () => void;
  onSaveEvent: () => void;
  onDeleteEvent: (event: UnifiedEvent) => void;
  getDayFormattedTitle: (dateStr: string) => string;
}

export default function DrillDownPanel({
  currentEvent,
  isConfiguring,
  setIsConfiguring,
  editName,
  setEditName,
  editDate,
  setEditDate,
  editTime,
  setEditTime,
  editCategory,
  setEditCategory,
  editPriority,
  setEditPriority,
  editAmount,
  setEditAmount,
  editStatus,
  setEditStatus,
  editNotes,
  setEditNotes,
  editLocation,
  setEditLocation,
  onResetView,
  onSaveEvent,
  onDeleteEvent,
  getDayFormattedTitle,
}: DrillDownPanelProps) {
  if (!currentEvent) {
    return (
      <div className="lc-panel shadow-lg p-6 space-y-6 flex flex-col justify-between" id="drill-down-empty-panel">
        <div className="flex items-center justify-between border-b border-[#5d6fa3]/10 pb-4">
          <span className="text-[10px] font-black uppercase text-[#e0dafc]/50 tracking-widest block">NODE DRILL-DOWN ANALYTICS</span>
        </div>
        <div className="text-center py-16 bg-[#1e233a]/30 border border-[#5d6fa3]/10 rounded-2xl flex flex-col items-center justify-center">
          <AlertCircle className="h-8 w-8 text-[#5d6fa3] mb-3 animate-pulse" />
          <p className="text-xs text-[#5d6fa3] font-medium">Select an obligation from the agenda to drill down</p>
        </div>
      </div>
    );
  }

  // Category mapping
  let categoryColor = "border-purple-500";
  let categoryTagText = "FAMILY";
  let categoryTagStyle = "bg-purple-950/40 text-purple-400 border-purple-900/50";
  if (currentEvent.category === "Medical Consults") {
    categoryColor = "border-red-500";
    categoryTagText = "MEDICAL";
    categoryTagStyle = "bg-red-950/40 text-red-400 border-red-900/50";
  } else if (currentEvent.category === "Financial / EMI") {
    categoryColor = "border-blue-500";
    categoryTagText = "FINANCIAL";
    categoryTagStyle = "bg-blue-950/40 text-blue-400 border-blue-900/50";
  } else if (currentEvent.type === "gmail") {
    categoryColor = "border-indigo-500";
    categoryTagText = "GMAIL";
    categoryTagStyle = "bg-indigo-950/40 text-indigo-400 border-indigo-900/50";
  } else if (currentEvent.type === "document") {
    categoryColor = "border-emerald-500";
    categoryTagText = "VAULT";
    categoryTagStyle = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50";
  }

  // Severity Level
  let severityText = `${currentEvent.priority || "Medium"} Severity`;
  let severityTagStyle = "bg-slate-800 text-slate-300 border-slate-700";
  let severityCardStyle = "bg-slate-100 text-slate-600 border-slate-200";
  if (currentEvent.priority === "Critical") {
    severityTagStyle = "bg-red-950/40 text-red-400 border-red-900/50";
    severityCardStyle = "bg-red-50 text-red-600 border-red-200";
  } else if (currentEvent.priority === "High") {
    severityTagStyle = "bg-orange-950/40 text-orange-400 border-orange-900/50";
    severityCardStyle = "bg-orange-50 text-orange-600 border-orange-200";
  } else if (currentEvent.priority === "Medium") {
    severityTagStyle = "bg-yellow-950/40 text-yellow-400 border-yellow-900/50";
    severityCardStyle = "bg-yellow-50 text-yellow-600 border-yellow-200";
  } else if (currentEvent.priority === "Low") {
    severityTagStyle = "bg-green-950/40 text-green-400 border-green-900/50";
    severityCardStyle = "bg-green-50 text-green-600 border-green-200";
  }

  return (
    <div className="lc-panel shadow-lg p-6 space-y-6 flex flex-col justify-between animate-in fade-in duration-200" id="drill-down-active-panel">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#5d6fa3]/10 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#e0dafc]/50 tracking-widest block">NODE DRILL-DOWN ANALYTICS</span>
          </div>
          <button
            onClick={onResetView}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            Reset view
          </button>
        </div>

        {/* Outer White Card layout styled beautifully */}
        <div className={`lc-detail-card rounded-2xl border-l-4 ${categoryColor} p-6 space-y-4 shadow-xl`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-lg font-bold text-[var(--lc-text)] leading-tight">
                {currentEvent.name}
              </h4>
              <p className="text-xs text-[var(--lc-muted)] mt-1">
                Calendar Schedule: <span className="font-semibold text-[var(--lc-text-soft)]">{getDayFormattedTitle(currentEvent.date)}</span> {currentEvent.time ? `at ${currentEvent.time}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${categoryTagStyle.replace("bg-purple-950/40", "bg-purple-50").replace("bg-red-950/40", "bg-red-50").replace("bg-blue-950/40", "bg-blue-50").replace("bg-indigo-950/40", "bg-indigo-50").replace("bg-emerald-950/40", "bg-emerald-50")}`}>
                {categoryTagText}
              </span>
              <span className={`text-[10px] font-semibold tracking-wider px-2.5 py-1 rounded border ${severityCardStyle}`}>
                {severityText}
              </span>
            </div>
          </div>

          {/* Centered notes box */}
          <div className="bg-[var(--lc-surface-soft)] p-4 rounded-xl border border-[var(--lc-border)]">
            <p className="text-xs text-[var(--lc-text-soft)] leading-relaxed font-medium">
              {currentEvent.notes || "No detailed notes or documentation uploaded for this obligation."}
            </p>
          </div>

          {/* Bottom row metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[var(--lc-border)]">
            <div className="flex items-center gap-8">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--lc-muted)] block">COMMITTED FUNDING</span>
                <span className="text-lg font-black text-[var(--lc-text)] mt-0.5 block">
                  {currentEvent.amount ? `$${currentEvent.amount}` : "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--lc-muted)] block">STATUS STATE</span>
                <span className="inline-flex items-center gap-1.5 mt-1">
                  <span className={`h-2 w-2 rounded-full ${
                    currentEvent.status === "Paid" || currentEvent.status === "Completed" 
                      ? "bg-emerald-500 animate-pulse" 
                      : "bg-green-500"
                  }`} />
                  <span className="text-sm font-black text-[var(--lc-text-soft)]">
                    {currentEvent.status || "Pending"}
                  </span>
                </span>
              </div>
            </div>

            {(currentEvent.type === "bill" || currentEvent.type === "appointment") && (
              <button
                onClick={() => {
                  setIsConfiguring(!isConfiguring);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-stretch sm:self-center"
              >
                Configure Event Action &gt;
              </button>
            )}
          </div>

          {/* Inline Expandable Configuration Tray */}
          {isConfiguring && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest">Configure Obligation Suite</h5>
                <button 
                  onClick={() => setIsConfiguring(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Event Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Time</label>
                    <input
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Medical Consults">Medical Consults</option>
                    <option value="Financial / EMI">Financial / EMI</option>
                    <option value="Family & School">Family & School</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Priority / Severity</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Committed Funding ($)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="N/A"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Status State</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Upcoming">Upcoming</option>
                    <option value="Paid">Paid</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {editCategory !== "Financial / EMI" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Clinical / Meeting Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    placeholder="e.g. Desk 4, Apollo Clinic"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Obligation Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Enter notes..."
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this event?")) {
                      onDeleteEvent(currentEvent);
                    }
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Obligation
                </button>

                <button
                  onClick={onSaveEvent}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
