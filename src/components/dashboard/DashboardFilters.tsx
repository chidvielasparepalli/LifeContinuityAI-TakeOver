import React from "react";
import { Search, Filter, Sliders } from "lucide-react";

interface DashboardFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  priorityFilter: string;
  setPriorityFilter: (val: string) => void;
}

export default function DashboardFilters({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
}: DashboardFiltersProps) {
  return (
    <div className="lc-panel p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-search-filters">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5d6fa3]" />
        <input
          type="text"
          placeholder="Search events, notes, locations or partners..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="lc-field w-full pl-9 pr-4 py-2.5 text-xs"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl px-2.5 py-1">
          <Filter className="h-3.5 w-3.5 text-[#5d6fa3]" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-xs text-[#e0dafc] focus:outline-none cursor-pointer border-none py-1.5 pr-2"
          >
            <option value="All Categories">All Categories</option>
            <option value="Medical Consults">Medical Consults</option>
            <option value="Financial / EMI">Financial / EMI</option>
            <option value="Family & School">Family & School</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl px-2.5 py-1">
          <Sliders className="h-3.5 w-3.5 text-[#5d6fa3]" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-transparent text-xs text-[#e0dafc] focus:outline-none cursor-pointer border-none py-1.5 pr-2"
          >
            <option value="All Priorities">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
