import React from "react";
import { CreditCard, CalendarCheck, GraduationCap, PiggyBank } from "lucide-react";

interface DashboardStatsGridProps {
  billsCount: number;
  apptsCount: number;
  schoolCount: number;
  loansCount: number;
}

export default function DashboardStatsGrid({
  billsCount,
  apptsCount,
  schoolCount,
  loansCount,
}: DashboardStatsGridProps) {
  const cards = [
    { 
      title: "Upcoming Bills", 
      count: billsCount, 
      desc: "Active statements pending", 
      icon: CreditCard, 
      color: "text-rose-500",
      bgGradient: "from-rose-500/10 to-rose-500/5 border-rose-500/20"
    },
    { 
      title: "Clinical Appts", 
      count: apptsCount, 
      desc: "Scheduled health consultations", 
      icon: CalendarCheck, 
      color: "text-emerald-500",
      bgGradient: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20"
    },
    { 
      title: "School Tuition", 
      count: schoolCount, 
      desc: "Quarterly education dues", 
      icon: GraduationCap, 
      color: "text-indigo-500",
      bgGradient: "from-indigo-500/10 to-indigo-500/5 border-indigo-500/20"
    },
    { 
      title: "Active Loans / EMIs", 
      count: loansCount, 
      desc: "Auto-debit amortization schedule", 
      icon: PiggyBank, 
      color: "text-blue-500",
      bgGradient: "from-blue-500/10 to-blue-500/5 border-blue-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
      {cards.map((item, index) => {
        const ItemIcon = item.icon;
        return (
          <div key={index} className={`p-5 rounded-2xl border bg-gradient-to-b ${item.bgGradient} flex items-start justify-between gap-4 shadow-sm hover:shadow-md transition-all hover:translate-y-[-1px]`}>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{item.title}</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">{item.count}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-1.5">{item.desc}</p>
            </div>
            <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-800/80 shadow-xs ${item.color}`}>
              <ItemIcon className="h-5 w-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
