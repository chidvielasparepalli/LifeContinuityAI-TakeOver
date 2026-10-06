import React from "react";
import { AlertCircle, Clock } from "lucide-react";
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
    <div className="lc-panel shadow-lg p-6 space-y-6 flex flex-col justify-between" id="agenda-panel-container">
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-black uppercase text-[#e0dafc]/50 tracking-widest block">SELECTED DAY AGENDA</span>
          <h3 className="text-xl font-bold text-white mt-1" id="selected-day-title">
            {getDayFormattedTitle(selectedDayStr)}
          </h3>
        </div>

        <div className="space-y-4">
          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-12 bg-[#1e233a]/30 border border-[#5d6fa3]/10 rounded-2xl">
              <AlertCircle className="h-8 w-8 text-[#5d6fa3] mx-auto mb-3" />
              <p className="text-xs text-[#5d6fa3] font-medium max-w-sm mx-auto leading-relaxed">
                No critical life obligations scheduled for this day matching selected category/priority filters.
              </p>
            </div>
          ) : (
            selectedDayEvents.map(event => {
              const isSelected = selectedEventId === event.id;
              const isCompleted = event.status === "Paid" || event.status === "Completed";
              
              // Color mapping for Category Tag
              let tagText = "FAMILY";
              let tagStyles = "bg-purple-950/40 text-purple-400 border-purple-900/50";
              if (event.category === "Medical Consults") {
                tagText = "MEDICAL";
                tagStyles = "bg-red-950/40 text-red-400 border-red-900/50";
              } else if (event.category === "Financial / EMI") {
                tagText = "FINANCIAL";
                tagStyles = "bg-blue-950/40 text-blue-400 border-blue-900/50";
              }

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-4 cursor-pointer hover:brightness-110 ${
                    isSelected 
                      ? "bg-[#1e233a] border-indigo-500 shadow-md ring-1 ring-indigo-500/30" 
                      : "bg-[#1e233a]/60 border-[#5d6fa3]/15 hover:border-[#5d6fa3]/30"
                  }`}
                  id={`agenda-event-${event.id}`}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold text-white ${isCompleted ? "line-through opacity-50" : ""}`}>
                        {event.name}
                      </h4>
                      {event.amount && (
                        <span className="text-[10px] font-mono bg-[#2c3353]/80 border border-[#5d6fa3]/20 px-2 py-0.5 rounded text-slate-300">
                          ${event.amount}
                        </span>
                      )}
                    </div>
                    
                    {event.notes && (
                      <p className="text-xs text-slate-300 leading-relaxed truncate max-w-md">
                        {event.notes}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] text-[#5d6fa3] font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{event.time || "All Day"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${tagStyles}`}>
                      {tagText}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
