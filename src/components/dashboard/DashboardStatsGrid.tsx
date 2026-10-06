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
      desc: "Active ledger statements", 
      icon: CreditCard, 
      color: "text-red-400 bg-red-950/20 border-red-500/20" 
    },
    { 
      title: "Clinical Appts", 
      count: apptsCount, 
      desc: "Pending health consultations", 
      icon: CalendarCheck, 
      color: "text-green-400 bg-green-950/20 border-green-500/20" 
    },
    { 
      title: "School Tuition", 
      count: schoolCount, 
      desc: "Quarterly education dues", 
      icon: GraduationCap, 
      color: "text-indigo-400 bg-indigo-950/20 border-indigo-500/20" 
    },
    { 
      title: "Active Loans / EMIs", 
      count: loansCount, 
      desc: "Auto-debit amortization assets", 
      icon: PiggyBank, 
      color: "text-blue-400 bg-blue-950/20 border-blue-500/20" 
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
      {cards.map((item, index) => {
        const ItemIcon = item.icon;
        return (
          <div key={index} className={`lc-panel-raised p-4 rounded-2xl flex items-start justify-between gap-4 shadow-md transition-transform hover:-translate-y-0.5 ${item.color}`}>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#e0dafc]/50">{item.title}</span>
              <p className="text-2xl font-black text-white mt-1.5">{item.count}</p>
              <p className="text-[9px] text-[#e0dafc]/70 font-medium leading-none mt-1">{item.desc}</p>
            </div>
            <div className="p-2 bg-white/5 rounded-xl">
              <ItemIcon className="h-5.5 w-5.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
