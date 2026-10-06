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
    <div className="app-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-search-filters">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search obligations, clinics, providers, notes or amounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field pl-10 text-xs py-2.5"
        />
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#101626] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
          <Filter className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer border-none py-1 pr-2"
          >
            <option value="All Categories" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">All Categories</option>
            <option value="Medical Consults" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Medical Consults</option>
            <option value="Financial / EMI" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Financial / EMI</option>
            <option value="Family & School" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Family &amp; School</option>
          </select>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#101626] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-2xs">
          <Sliders className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer border-none py-1 pr-2"
          >
            <option value="All Priorities" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">All Priorities</option>
            <option value="Critical" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Critical</option>
            <option value="High" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">High</option>
            <option value="Medium" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Medium</option>
            <option value="Low" className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}
