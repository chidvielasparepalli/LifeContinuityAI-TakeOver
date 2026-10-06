import React from "react";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { UnifiedEvent } from "./types";

interface AgendaPanelProps {
  selectedDayStr: string;
  selectedDayEvents: UnifiedEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: UnifiedEvent) => void;
  getDayFormattedTitle: (dateStr: string) => string;
}

export default function AgendaPanel({
  selectedDayStr,
  selectedDayEvents,
  selectedEventId,
  onSelectEvent,
  getDayFormattedTitle,
}: AgendaPanelProps) {
  return (
    <div className="app-card p-6 space-y-6 flex flex-col justify-between" id="agenda-panel-container">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-widest block">SELECTED DAY AGENDA</span>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1" id="selected-day-title">
            {getDayFormattedTitle(selectedDayStr)}
          </h3>
        </div>

        <div className="space-y-3">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
              <AlertCircle className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                No critical obligations scheduled for this day matching your active search and category filters.
              </p>
            </div>
          ) : (
            selectedDayEvents.map(event => {
              const isSelected = selectedEventId === event.id;
              const isCompleted = event.status === "Paid" || event.status === "Completed";
              
              // Color mapping for Category Tag
              let tagText = "FAMILY";
              let tagStyles = "badge-brand";
              if (event.category === "Medical Consults") {
                tagText = "MEDICAL";
                tagStyles = "badge-critical";
              } else if (event.category === "Financial / EMI") {
                tagText = "FINANCIAL";
                tagStyles = "badge-info";
              }

              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer ${
                    isSelected 
                      ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 shadow-sm ring-2 ring-indigo-500/20" 
                      : "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                  id={`agenda-event-${event.id}`}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold text-slate-900 dark:text-white ${isCompleted ? "line-through opacity-50" : ""}`}>
                        {event.name}
                      </h4>
                      {event.amount && (
                        <span className="text-[11px] font-mono font-bold bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-800 dark:text-slate-200">
                          ${event.amount}
                        </span>
                      )}
                    </div>
                    
                    {event.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed truncate max-w-md">
                        {event.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{event.time || "All Day"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                    <span className={`app-badge ${tagStyles}`}>
                      {tagText}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
