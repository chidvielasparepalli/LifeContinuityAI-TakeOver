import React from "react";
import { AlertCircle, Trash2, Edit3, Save, DollarSign, Calendar, MapPin, Tag } from "lucide-react";
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
      <div className="app-card p-6 space-y-6 flex flex-col justify-between" id="drill-down-empty-panel">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-widest block">NODE DRILL-DOWN ANALYTICS</span>
        </div>
        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6">
          <AlertCircle className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-3 animate-pulse" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Select an obligation from the agenda to drill down</p>
        </div>
      </div>
    );
  }

  // Category mapping
  let categoryTagText = "FAMILY";
  let categoryBadgeClass = "badge-brand";
  if (currentEvent.category === "Medical Consults") {
    categoryTagText = "MEDICAL";
    categoryBadgeClass = "badge-critical";
  } else if (currentEvent.category === "Financial / EMI") {
    categoryTagText = "FINANCIAL";
    categoryBadgeClass = "badge-info";
  } else if (currentEvent.type === "gmail") {
    categoryTagText = "GMAIL";
    categoryBadgeClass = "badge-brand";
  } else if (currentEvent.type === "document") {
    categoryTagText = "VAULT";
    categoryBadgeClass = "badge-verified";
  }

  // Severity Level
  let severityBadgeClass = "badge-warning";
  if (currentEvent.priority === "Critical") {
    severityBadgeClass = "badge-danger";
  } else if (currentEvent.priority === "High") {
    severityBadgeClass = "badge-warning";
  } else if (currentEvent.priority === "Low") {
    severityBadgeClass = "badge-verified";
  }

  return (
    <div className="app-card p-6 space-y-6 flex flex-col justify-between" id="drill-down-active-panel">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-widest block">NODE DRILL-DOWN ANALYTICS</span>
          </div>
          <button
            onClick={onResetView}
            className="text-xs font-bold text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            Reset view
          </button>
        </div>

        {/* Card details */}
        <div className="app-card-elevated p-6 space-y-5 border border-slate-200 dark:border-slate-700/70">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <h4 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-tight">
                {currentEvent.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                <span>{getDayFormattedTitle(currentEvent.date)}</span> {currentEvent.time ? `• ${currentEvent.time}` : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`app-badge ${categoryBadgeClass}`}>
                {categoryTagText}
              </span>
              <span className={`app-badge ${severityBadgeClass}`}>
                {currentEvent.priority || "Medium"} Urgency
              </span>
            </div>
          </div>

          {/* Notes box */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {currentEvent.notes || "No detailed notes or documentation uploaded for this obligation."}
            </p>
          </div>

          {/* Bottom row metrics */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-8">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">COMMITTED FUNDING</span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block font-mono">
                  {currentEvent.amount ? `$${currentEvent.amount}` : "N/A"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">STATUS STATE</span>
                <span className="inline-flex items-center gap-1.5 mt-1">
                  <span className={`h-2 w-2 rounded-full ${
                    currentEvent.status === "Paid" || currentEvent.status === "Completed" 
                      ? "bg-emerald-500 animate-pulse" 
                      : "bg-indigo-500"
                  }`} />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
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
                className="btn-secondary text-xs py-2.5 px-4"
              >
                <Edit3 className="h-3.5 w-3.5 text-indigo-500" />
                {isConfiguring ? "Close Config" : "Configure Event"}
              </button>
            )}
          </div>

          {/* Inline Expandable Configuration Tray */}
          {isConfiguring && (
            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Configure Obligation Suite</h5>
                <button 
                  onClick={() => setIsConfiguring(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Event Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="input-field text-xs py-2"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</label>
                    <input
                      type="text"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="input-field text-xs py-2"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as any)}
                    className="input-field text-xs py-2 cursor-pointer"
                  >
                    <option value="Medical Consults">Medical Consults</option>
                    <option value="Financial / EMI">Financial / EMI</option>
                    <option value="Family & School">Family &amp; School</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Priority / Urgency</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="input-field text-xs py-2 cursor-pointer"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Committed Funding ($)</label>
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="input-field text-xs py-2"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status State</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input-field text-xs py-2 cursor-pointer"
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
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Clinical / Meeting Location</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="input-field text-xs py-2"
                    placeholder="e.g. Desk 4, Apollo Clinic"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Obligation Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="input-field text-xs py-2 resize-none"
                  placeholder="Enter notes..."
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this event?")) {
                      onDeleteEvent(currentEvent);
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Obligation
                </button>

                <button
                  onClick={onSaveEvent}
                  className="btn-primary text-xs py-2 px-5"
                >
                  <Save className="h-3.5 w-3.5" />
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
