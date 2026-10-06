import React from "react";
import { Plus, X, Calendar, Clock, DollarSign, MapPin, AlignLeft, Tag } from "lucide-react";

interface AddCustomEventModalProps {
  customTitle: string;
  setCustomTitle: (val: string) => void;
  customCategory: "Medical Consults" | "Financial / EMI" | "Family & School";
  setCustomCategory: (val: "Medical Consults" | "Financial / EMI" | "Family & School") => void;
  customPriority: "Critical" | "High" | "Medium" | "Low";
  setCustomPriority: (val: "Critical" | "High" | "Medium" | "Low") => void;
  customDate: string;
  setCustomDate: (val: string) => void;
  customTime: string;
  setCustomTime: (val: string) => void;
  customAmount: string;
  setCustomAmount: (val: string) => void;
  customLocation: string;
  setCustomLocation: (val: string) => void;
  customNotes: string;
  setCustomNotes: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddCustomEventModal({
  customTitle,
  setCustomTitle,
  customCategory,
  setCustomCategory,
  customPriority,
  setCustomPriority,
  customDate,
  setCustomDate,
  customTime,
  setCustomTime,
  customAmount,
  setCustomAmount,
  customLocation,
  setCustomLocation,
  customNotes,
  setCustomNotes,
  onClose,
  onSubmit,
}: AddCustomEventModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" id="modal-add-custom-event">
      <div className="app-card max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Plus className="h-4.5 w-4.5" />
            </div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Add Custom Life Obligation</h4>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Event / Obligation Title</label>
            <input
              type="text"
              required
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="input-field"
              placeholder="e.g. Cardiology Consult — Dr. Gupta"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Event Category</label>
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as any)}
                className="input-field cursor-pointer"
              >
                <option value="Medical Consults">Medical Consults</option>
                <option value="Financial / EMI">Financial / EMI</option>
                <option value="Family & School">Family &amp; School</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Priority Level</label>
              <select
                value={customPriority}
                onChange={(e) => setCustomPriority(e.target.value as any)}
                className="input-field cursor-pointer"
              >
                <option value="Critical">Critical Priority</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Target Date</label>
              <input
                type="date"
                required
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Time</label>
              <input
                type="text"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="input-field"
                placeholder="e.g. 10:00 AM"
              />
            </div>
          </div>

          {customCategory === "Financial / EMI" ? (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ledger Amount ($)</label>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="input-field"
                placeholder="e.g. 1200"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Clinical / Meeting Location</label>
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="input-field"
                placeholder="e.g. Desk 4, Apollo Clinic"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">Detailed Description &amp; Guidance</label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              rows={3}
              className="input-field resize-none"
              placeholder="e.g. Monthly apartment lease amortization auto-debit process or Medical follow-up instructions..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs py-2 px-5"
            >
              Save Obligation Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
