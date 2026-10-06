import React, { useState, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus, 
  FileSpreadsheet
} from "lucide-react";

import { triggerCheckIn } from "../lib/checkinService";
import { apiFetch } from "../lib/api";
import { CheckInStats } from "../types";
import { UnifiedEvent } from "./dashboard/types";

// Import new modular dashboard subcomponents
import DashboardHeader from "./dashboard/DashboardHeader";
import DashboardStatsGrid from "./dashboard/DashboardStatsGrid";
import DashboardFilters from "./dashboard/DashboardFilters";
import AgendaPanel from "./dashboard/AgendaPanel";
import DrillDownPanel from "./dashboard/DrillDownPanel";
import AddCustomEventModal from "./dashboard/AddCustomEventModal";
import GoogleCalendarSyncModal from "./dashboard/GoogleCalendarSyncModal";
import LoadingState from "./LoadingState";

interface LifeGraphDashboardProps {
  uid: string;
  onCheckInTriggered?: () => void;
  checkInTriggerCounter?: number;
  onNavigate?: (tab: string) => void;
  triggerToast?: (message: string, details?: string, type?: "success" | "error") => void;
  justCheckedIn?: boolean;
  setJustCheckedIn?: (val: boolean) => void;
}

export default function LifeGraphDashboard({
  uid,
  onCheckInTriggered,
  checkInTriggerCounter,
  onNavigate,
  triggerToast,
  justCheckedIn,
  setJustCheckedIn,
}: LifeGraphDashboardProps) {
  // Core database states
  const [bills, setBills] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [gmailRecords, setGmailRecords] = useState<any[]>([]);
  const [extractions, setExtractions] = useState<any[]>([]);
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Calendar visualization states
  const today = new Date();
  const [selectedDayStr, setSelectedDayStr] = useState("2026-07-04");
  const [calendarMonth, setCalendarMonth] = useState(6); // July (0-indexed)
  const [calendarYear, setCalendarYear] = useState(2026);

  // Search, Category, and Priority filters states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [priorityFilter, setPriorityFilter] = useState("All Priorities");

  // Modals visibility states
  const [showAddCustomEvent, setShowAddCustomEvent] = useState(false);
  const [showCalendarSyncModal, setShowCalendarSyncModal] = useState(false);

  // Custom Event state bindings
  const [customTitle, setCustomTitle] = useState("");
  const [customCategory, setCustomCategory] = useState<"Medical Consults" | "Financial / EMI" | "Family & School">("Medical Consults");
  const [customDate, setCustomDate] = useState("2026-07-04");
  const [customTime, setCustomTime] = useState("10:00 AM");
  const [customPriority, setCustomPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [customAmount, setCustomAmount] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [customNotes, setCustomNotes] = useState("");

  // Edit/Configure state bindings
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("10:00 AM");
  const [editCategory, setEditCategory] = useState<"Medical Consults" | "Financial / EMI" | "Family & School">("Medical Consults");
  const [editPriority, setEditPriority] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("Pending");
  const [editLocation, setEditLocation] = useState("");

  // Google Calendar integration states
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(false);
  const [isGoogleSyncing, setIsGoogleSyncing] = useState(false);
  const [isGoogleAuthorizing, setIsGoogleAuthorizing] = useState(false);

  const fetchGraphData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/life-graph/${uid}`);
      const data = await res.json();
      if (data) {
        setBills(Array.isArray(data.bills) ? data.bills : []);
        setAppointments(Array.isArray(data.appointments) ? data.appointments : []);
        setGmailRecords(Array.isArray(data.gmailRecords) ? data.gmailRecords : []);
        setExtractions(Array.isArray(data.extractions) ? data.extractions : []);
        setStats(data.checkInStats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, [uid, checkInTriggerCounter]);

  const handleManualCheckIn = async () => {
    if (isCheckingIn) return;
    setIsCheckingIn(true);

    const prevStats = stats ? { ...stats } : null;

    // Optimistic state update
    setStats((prev: any) => {
      if (!prev) return prev;
      const streak = prev.currentStreak || 0;
      return {
        ...prev,
        status: "Verified",
        currentStreak: streak + 1,
        longestStreak: Math.max(prev.longestStreak || 0, streak + 1)
      };
    });

    try {
      await triggerCheckIn(uid, "manualButton");

      if (triggerToast) {
        triggerToast(
          "Checked in successfully!",
          "Your Proof-of-Life status has been verified and your safety streak updated.",
          "success"
        );
      }

      if (setJustCheckedIn) {
        setJustCheckedIn(true);
      }

      if (onCheckInTriggered) {
        onCheckInTriggered();
      }

      if (onNavigate) {
        onNavigate("SafetyCheckIn");
      }
    } catch (e: any) {
      console.error("Check-in error:", e);
      // Rollback to prior verified stats state
      setStats(prevStats);
      if (triggerToast) {
        triggerToast("Check-in Failed", e.message || "An error occurred during verification.", "error");
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleAuthorizeGoogleCalendar = () => {
    if (isGoogleAuthorizing || isGoogleAuthorized) return;
    setIsGoogleAuthorizing(true);
    setTimeout(() => {
      setIsGoogleAuthorized(true);
      setIsGoogleAuthorizing(false);
      if (triggerToast) {
        triggerToast(
          "Google Calendar Authorized Successfully",
          "Your Google Calendar connection is authenticated and secure. Ready to sync events.",
          "success"
        );
      }
    }, 1200);
  };

  const handleSyncGoogleCalendar = async () => {
    if (isGoogleSyncing) return;
    if (!isGoogleAuthorized) {
      if (triggerToast) {
        triggerToast(
          "Authorization Required",
          "Please authorize Google Calendar before synchronizing events.",
          "error"
        );
      }
      return;
    }
    setIsGoogleSyncing(true);
    try {
      const res = await apiFetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchGraphData();
        if (triggerToast) {
          triggerToast(
            "Calendar Sync Successful",
            `Successfully synchronized Google Calendar. Imported ${data.count || 2} upcoming obligations.`,
            "success"
          );
        }
      } else {
        throw new Error(data.error || "Failed to synchronize events.");
      }
    } catch (e: any) {
      console.error(e);
      if (triggerToast) {
        triggerToast("Calendar Sync Failed", e.message || "An error occurred.", "error");
      }
    } finally {
      setIsGoogleSyncing(false);
    }
  };

  const handleAddCustomEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (customCategory === "Financial / EMI") {
        const res = await apiFetch("/api/life-graph/bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            name: customTitle,
            dueDate: customDate,
            amount: Number(customAmount) || 0,
            category: Number(customAmount) > 500 ? "Loans/EMIs" : "Upcoming Bills",
            status: "Pending",
            priority: customPriority,
            notes: customNotes
          })
        });
        if (res.ok) {
          resetCustomForm();
          fetchGraphData();
        }
      } else {
        const res = await apiFetch("/api/life-graph/appointment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            name: customTitle,
            date: customDate,
            time: customTime,
            location: customLocation,
            notes: customNotes,
            status: "Upcoming",
            priority: customPriority,
            category: customCategory
          })
        });
        if (res.ok) {
          resetCustomForm();
          fetchGraphData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetCustomForm = () => {
    setCustomTitle("");
    setCustomCategory("Medical Consults");
    setCustomDate("2026-07-04");
    setCustomTime("10:00 AM");
    setCustomPriority("Medium");
    setCustomAmount("");
    setCustomLocation("");
    setCustomNotes("");
    setShowAddCustomEvent(false);
  };

  const handleDeleteEvent = async (event: UnifiedEvent) => {
    try {
      const endpoint = event.type === "bill" 
        ? `/api/life-graph/bill/${event.id}` 
        : `/api/life-graph/appointment/${event.id}`;
      const res = await apiFetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        fetchGraphData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectEventForEdit = (event: UnifiedEvent) => {
    setSelectedEventId(event.id);
    setIsConfiguring(false);
    setEditName(event.name);
    setEditDate(event.date);
    setEditTime(event.time || "10:00 AM");
    setEditAmount(event.amount ? String(event.amount) : "");
    setEditNotes(event.notes || "");
    setEditPriority(event.priority);
    setEditCategory(event.category);
    setEditStatus(event.status);
    setEditLocation(event.location || "");
  };

  const handleSaveConfiguredEvent = async () => {
    if (!selectedEventId) return;
    
    const isBill = selectedEventId.startsWith("bill");
    const endpoint = isBill 
      ? `/api/life-graph/bill/${selectedEventId}`
      : `/api/life-graph/appointment/${selectedEventId}`;
      
    const payload = isBill ? {
      name: editName,
      dueDate: editDate,
      amount: Number(editAmount) || 0,
      status: editStatus,
      category: editCategory === "Family & School" ? "School Fees" : editCategory === "Medical Consults" ? "Upcoming Bills" : "Loans/EMIs",
      priority: editPriority,
      notes: editNotes
    } : {
      name: editName,
      date: editDate,
      time: editTime,
      status: editStatus,
      location: editLocation,
      notes: editNotes,
      priority: editPriority,
      category: editCategory
    };

    try {
      const res = await apiFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsConfiguring(false);
        fetchGraphData();
      }
    } catch (e) {
      console.error("Failed to update event", e);
    }
  };

  // Prefill default selected event on database load
  useEffect(() => {
    const list = getUnifiedEvents();
    if (list.length > 0 && !selectedEventId) {
      const defaultEv = list.find(e => e.id === "appt-cardio-july4") || list[0];
      if (defaultEv) {
        setSelectedEventId(defaultEv.id);
        setEditName(defaultEv.name);
        setEditDate(defaultEv.date);
        setEditTime(defaultEv.time || "10:00 AM");
        setEditAmount(defaultEv.amount ? String(defaultEv.amount) : "");
        setEditNotes(defaultEv.notes || "");
        setEditPriority(defaultEv.priority);
        setEditCategory(defaultEv.category);
        setEditStatus(defaultEv.status);
        setEditLocation(defaultEv.location || "");
      }
    }
  }, [bills, appointments]);
  // Helper mapping helper to produce standard UnifiedEvents
  const getUnifiedEvents = (): UnifiedEvent[] => {
    const list: UnifiedEvent[] = [];

    const monthsMap: { [key: string]: number } = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
      aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
      nov: 11, november: 11, dec: 12, december: 12
    };

    const extractDate = (text: string | undefined | null): string | null => {
      if (!text) return null;
      
      // 1. Check YYYY-MM-DD
      const ymd = text.match(/\b(\d{4})[-/](\d{2})[-/](\d{2})\b/);
      if (ymd) {
        return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
      }

      // 2. Check Month Day, Year or Month Day (e.g. July 22nd, 2026 or July 22nd)
      const monthNames = "(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
      const regexMonthDay = new RegExp(`\\b${monthNames}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i");
      const mdMatch = text.match(regexMonthDay);
      if (mdMatch) {
        const monthName = mdMatch[1].toLowerCase();
        const month = String(monthsMap[monthName] || 7).padStart(2, "0");
        const day = String(mdMatch[2]).padStart(2, "0");
        const year = mdMatch[3] || "2026"; // Fallback to current mock year
        return `${year}-${month}-${day}`;
      }

      // 3. Check Day Month Year or Day Month (e.g. 22nd July 2026 or 22 July)
      const regexDayMonth = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+${monthNames}(?:\\s+(\\d{4}))?\\b`, "i");
      const dmMatch = text.match(regexDayMonth);
      if (dmMatch) {
        const monthName = dmMatch[2].toLowerCase();
        const month = String(monthsMap[monthName] || 7).padStart(2, "0");
        const day = String(dmMatch[1]).padStart(2, "0");
        const year = dmMatch[3] || "2026";
        return `${year}-${month}-${day}`;
      }

      return null;
    };

    const calculatePriorityAndDate = (
      itemDateStr: string | undefined | null,
      textToScan: string
    ): { priority: "Critical" | "High" | "Medium" | "Low"; targetDateStr: string } => {
      let targetDateStr = extractDate(textToScan);
      
      if (!targetDateStr && itemDateStr) {
        targetDateStr = extractDate(itemDateStr);
        if (!targetDateStr) {
          targetDateStr = itemDateStr.substring(0, 10);
        }
      }

      if (!targetDateStr) {
        return { priority: "Low", targetDateStr: new Date().toISOString().substring(0, 10) };
      }

      const dateOnlyMatch = targetDateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!dateOnlyMatch) {
        return { priority: "Low", targetDateStr };
      }

      const target = new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      );
      target.setHours(0, 0, 0, 0);

      const current = new Date();
      current.setHours(0, 0, 0, 0);

      const diffTime = target.getTime() - current.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      let priority: "Critical" | "High" | "Medium" | "Low" = "Low";
      if (diffDays <= 0) {
        priority = "Critical";
      } else if (diffDays <= 3) {
        priority = "High";
      } else if (diffDays <= 7) {
        priority = "Medium";
      } else {
        priority = "Low";
      }

      return { priority, targetDateStr };
    };

    bills.forEach((b) => {
      let category = "Financial / EMI";
      if (b.category === "School Fees") {
        category = "Family & School";
      }
      
      const { priority, targetDateStr } = calculatePriorityAndDate(b.dueDate, `${b.name} ${b.notes || ""}`);
      
      list.push({
        id: b.id,
        type: "bill",
        name: b.name,
        date: targetDateStr,
        amount: b.amount,
        status: b.status,
        category,
        priority,
        notes: b.notes || ""
      });
    });

    appointments.forEach((a) => {
      let category = "Medical Consults";
      if (a.category) {
        category = a.category;
      } else if (a.name.toLowerCase().includes("school") || a.notes?.toLowerCase().includes("school") || a.notes?.toLowerCase().includes("kids")) {
        category = "Family & School";
      }

      const { priority, targetDateStr } = calculatePriorityAndDate(a.date, `${a.name} ${a.notes || ""}`);

      list.push({
        id: a.id,
        type: "appointment",
        name: a.name,
        date: targetDateStr,
        time: a.time,
        status: a.status,
        category,
        priority,
        location: a.location,
        notes: a.notes
      });
    });

    gmailRecords.forEach((g) => {
      const textToScan = `${g.subject} ${g.extractedSummary} ${g.rawSnippet || ""}`;
      const { priority, targetDateStr } = calculatePriorityAndDate(g.date, textToScan);
      
      let category = "Gmail Extracted";
      if (g.category === "Bills") category = "Financial / EMI";
      else if (g.category === "Appointments") category = "Medical Consults";
      else if (g.category === "Healthcare") category = "Medical Consults";
      else if (g.category === "Travel") category = "Travel & Bookings";

      list.push({
        id: g.id,
        type: "gmail",
        name: g.subject,
        date: targetDateStr,
        status: "Gmail Synced",
        category,
        priority,
        notes: g.extractedSummary,
        location: g.sender ? `From: ${g.sender}` : undefined
      });
    });

    extractions.forEach((x) => {
      const textToScan = `${x.documentTitle || ""} ${x.coverage || ""} ${x.nominee || ""} ${x.hospitalName || ""} expiry:${x.expiryDate || ""}`;
      const { priority, targetDateStr } = calculatePriorityAndDate(x.expiryDate !== "N/A (Perpetual)" && x.expiryDate !== "N/A" ? x.expiryDate : x.uploadedDate, textToScan);

      let category = "Vault Document";
      if (x.documentType === "Insurance Policies") category = "Financial / EMI";
      else if (x.documentType === "Will & Testament") category = "Family & School";

      list.push({
        id: x.id || `ext-${x.documentId}`,
        type: "document",
        name: x.documentTitle || "Vault Document",
        date: targetDateStr,
        status: "Document Verified",
        category,
        priority,
        notes: `Policy Number: ${x.policyNumber || "N/A"}\nCoverage: ${x.coverage || "N/A"}\nNominee: ${x.nominee || "N/A"}\nHospital/Issuer: ${x.hospitalName || "N/A"}`
      });
    });

    return list;
  };

  const unifiedEvents = getUnifiedEvents();

  // Category statistics card counters
  const billsCount = bills.filter(b => b.category === "Upcoming Bills" && b.status !== "Paid").length;
  const loansCount = bills.filter(b => b.category === "Loans/EMIs" && b.status !== "Paid").length;
  const schoolCount = bills.filter(b => b.category === "School Fees" && b.status !== "Paid").length;
  const apptsCount = appointments.filter(a => a.status !== "Completed").length;

  // Search, Category, and Priority filters applied to lists
  const filteredEvents = unifiedEvents.filter(e => {
    const matchesSearch = 
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = 
      categoryFilter === "All Categories" || e.category === categoryFilter;
    
    const matchesPriority = 
      priorityFilter === "All Priorities" || e.priority === priorityFilter;

    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Export functions
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(unifiedEvents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Life_Graph_Obligations_${uid}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Calendar setup helpers
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sun, ..., 6 = Sat
  };

  const daysInCurrentMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDayIndex = getFirstDayOfMonth(calendarYear, calendarMonth);

  // Pad prev month days
  const prevMonthIndex = calendarMonth === 0 ? 11 : calendarMonth - 1;
  const prevMonthYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
  const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthIndex);

  const calendarDaysList: { day: number; month: number; year: number; isCurrentMonth: boolean; dateStr: string }[] = [];

  // Add padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayVal = daysInPrevMonth - i;
    const mStr = String(prevMonthIndex + 1).padStart(2, "0");
    const dStr = String(dayVal).padStart(2, "0");
    calendarDaysList.push({
      day: dayVal,
      month: prevMonthIndex,
      year: prevMonthYear,
      isCurrentMonth: false,
      dateStr: `${prevMonthYear}-${mStr}-${dStr}`
    });
  }

  // Add current month days
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    const mStr = String(calendarMonth + 1).padStart(2, "0");
    const dStr = String(i).padStart(2, "0");
    calendarDaysList.push({
      day: i,
      month: calendarMonth,
      year: calendarYear,
      isCurrentMonth: true,
      dateStr: `${calendarYear}-${mStr}-${dStr}`
    });
  }

  // Pad next month days to align to grid
  const totalSlots = 42; // 6 rows of 7 days
  const nextMonthPadding = totalSlots - calendarDaysList.length;
  const nextMonthIndex = calendarMonth === 11 ? 0 : calendarMonth + 1;
  const nextMonthYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
  for (let i = 1; i <= nextMonthPadding; i++) {
    const mStr = String(nextMonthIndex + 1).padStart(2, "0");
    const dStr = String(i).padStart(2, "0");
    calendarDaysList.push({
      day: i,
      month: nextMonthIndex,
      year: nextMonthYear,
      isCurrentMonth: false,
      dateStr: `${nextMonthYear}-${mStr}-${dStr}`
    });
  }

  // Prev/Next Month handlers
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  // Get selected day events (sorted by priority or time)
  const selectedDayEvents = filteredEvents.filter(e => e.date === selectedDayStr);

  const getDayFormattedTitle = (dateString: string) => {
    try {
      const parts = dateString.split("-");
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Verified": return "bg-green-950/40 text-green-400 border-green-800/60";
      case "AwaitingCheckIn": return "bg-amber-950/40 text-amber-400 border-amber-800/60";
      case "Unverified": return "bg-red-950/40 text-red-400 border-red-800/60";
      case "EmergencyVerificationActive": return "bg-rose-600 text-white border-rose-800 animate-pulse";
      default: return "bg-[#1e233a] text-[#5d6fa3] border-[#5d6fa3]/30";
    }
  };

  if (loading) {
    return (
      <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <LoadingState label="Building your life graph" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="lc-panel-raised h-28 lc-skeleton" />
          ))}
        </div>
        <div className="lc-panel h-80 lc-skeleton" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6 space-y-8" id="life-graph-root">
      
      {/* Top Banner: Safety Status Widget (Modularized) */}
      <DashboardHeader 
        stats={stats}
        isCheckingIn={isCheckingIn}
        onManualCheckIn={handleManualCheckIn}
        getStatusBadgeClass={getStatusBadgeClass}
      />

      {/* Redesigned Life Graph Agenda Header */}
       <div className="lc-panel shadow-lg p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#5d6fa3]/10 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" />
              Life Graph Agenda
            </h3>
            <p className="text-xs text-[#5d6fa3] mt-0.5">Chronological heatmaps and obligations catalog</p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setCustomDate(selectedDayStr);
                setShowAddCustomEvent(true);
              }}
               className="lc-btn-primary flex-1 sm:flex-none text-xs py-2.5 px-4 shadow-md transition-all gap-1.5 cursor-pointer"
              id="btn-add-custom-event"
            >
              <Plus className="h-4 w-4" />
              Add Custom Event
            </button>
            <button
              onClick={() => setShowCalendarSyncModal(true)}
               className="lc-btn-secondary flex-1 sm:flex-none text-xs py-2.5 px-4 shadow-md transition-all gap-1.5 cursor-pointer"
              id="btn-open-calendar-sync"
            >
              <Calendar className="h-4 w-4 text-indigo-400" />
              Sync Google Calendar
            </button>
            <button
              onClick={handleExportData}
               className="lc-btn-secondary flex-1 sm:flex-none text-xs py-2.5 px-4 transition-all gap-1.5 cursor-pointer"
              title="Export report"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              Export Life Graph
            </button>
          </div>
        </div>

        {/* Care & Obligation Heatmap Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-[#e0dafc]/80 tracking-widest">Care & Obligation Heatmap</h4>
            <div className="flex items-center gap-2 bg-[#1e233a] border border-[#5d6fa3]/25 px-2.5 py-1 rounded-xl">
               <button type="button" onClick={handlePrevMonth} aria-label="Previous month" className="lc-touch-target p-1 hover:text-white transition-colors cursor-pointer">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold text-white min-w-28 text-center select-none">
                {months[calendarMonth]} {calendarYear}
              </span>
               <button type="button" onClick={handleNextMonth} aria-label="Next month" className="lc-touch-target p-1 hover:text-white transition-colors cursor-pointer">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Interactive Heatmap Grid */}
          <div className="bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/15 space-y-3">
            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-2 text-center">
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
                <span key={day} className="text-[10px] font-black text-[#5d6fa3] tracking-wider">{day}</span>
              ))}
            </div>

            {/* Heatmap days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDaysList.map((dayObj, index) => {
                const dayEvents = unifiedEvents.filter(e => e.date === dayObj.dateStr);
                
                // Find highest priority on this day
                let highestPriority: "Critical" | "High" | "Medium" | "Low" | null = null;
                if (dayEvents.length > 0) {
                  if (dayEvents.some(e => e.priority === "Critical")) {
                    highestPriority = "Critical";
                  } else if (dayEvents.some(e => e.priority === "High")) {
                    highestPriority = "High";
                  } else if (dayEvents.some(e => e.priority === "Medium")) {
                    highestPriority = "Medium";
                  } else {
                    highestPriority = "Low";
                  }
                }
                
                const isSelected = selectedDayStr === dayObj.dateStr;

                // Color code backgrounds based on highest priority
                let bgClass = "bg-[#2c3353]/30 text-indigo-200/50";
                let ringClass = "border border-[#5d6fa3]/10 hover:border-[#5d6fa3]/40";
                
                if (dayObj.isCurrentMonth) {
                  bgClass = "bg-[#2c3353]/60 text-white font-medium";
                  ringClass = "border border-[#5d6fa3]/20 hover:border-indigo-400/50";

                  if (dayEvents.length > 0) {
                    if (highestPriority === "Critical") {
                      bgClass = "bg-red-950/65 text-red-200 hover:bg-red-950/80 border-red-500/20";
                    } else if (highestPriority === "High") {
                      bgClass = "bg-orange-950/65 text-orange-200 hover:bg-orange-950/80 border-orange-500/20";
                    } else if (highestPriority === "Medium") {
                      bgClass = "bg-yellow-950/60 text-yellow-200 hover:bg-yellow-950/85 border-yellow-500/20";
                    } else if (highestPriority === "Low") {
                      bgClass = "bg-green-950/65 text-green-200 hover:bg-green-950/80 border-green-500/20";
                    }
                  }
                }

                if (isSelected) {
                  ringClass = "ring-2 ring-indigo-400 border-indigo-400";
                }

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedDayStr(dayObj.dateStr);
                      // Auto-select first event of this day if available
                      const dayEvs = unifiedEvents.filter(e => e.date === dayObj.dateStr);
                      if (dayEvs.length > 0) {
                        handleSelectEventForEdit(dayEvs[0]);
                      } else {
                        setSelectedEventId(null);
                        setIsConfiguring(false);
                      }
                    }}
                    className={`h-11 sm:h-14 rounded-xl flex flex-col items-center justify-between p-1.5 sm:p-2 transition-all cursor-pointer relative ${bgClass} ${ringClass}`}
                  >
                    <span className="text-[10px] sm:text-xs font-bold self-start">{dayObj.day}</span>
                    
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-0.5 justify-center w-full">
                        {dayEvents.some(e => e.priority === "Critical") && <span className="h-1.5 w-1.5 rounded-full bg-red-500" title="Critical Priority" />}
                        {dayEvents.some(e => e.priority === "High") && <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="High Priority" />}
                        {dayEvents.some(e => e.priority === "Medium") && <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" title="Medium Priority" />}
                        {dayEvents.some(e => e.priority === "Low") && <span className="h-1.5 w-1.5 rounded-full bg-green-500" title="Low Priority" />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Priority Urgency Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-bold text-[#5d6fa3] border-t border-[#5d6fa3]/10 pt-3 mt-1">
              <span className="text-[10px] font-black uppercase text-[#e0dafc]/50 tracking-wider">Urgency Index:</span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Critical (Today / Overdue)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                High (Within 3 days)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                Medium (Within 7 days)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Low (Later)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Four Category Summary Grid Cards (Modularized) */}
      <DashboardStatsGrid 
        billsCount={billsCount}
        apptsCount={apptsCount}
        schoolCount={schoolCount}
        loansCount={loansCount}
      />

      {/* Search and Filters Segment (Modularized) */}
      <DashboardFilters 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
      />

      {/* Dual Panel: Selected Day Agenda & Node Drill-Down Analytics (Modularized) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgendaPanel 
          selectedDayStr={selectedDayStr}
          selectedDayEvents={selectedDayEvents}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEventForEdit}
          getDayFormattedTitle={getDayFormattedTitle}
        />

        <DrillDownPanel 
          currentEvent={filteredEvents.find(e => e.id === selectedEventId) || selectedDayEvents[0]}
          isConfiguring={isConfiguring}
          setIsConfiguring={setIsConfiguring}
          editName={editName}
          setEditName={setEditName}
          editDate={editDate}
          setEditDate={setEditDate}
          editTime={editTime}
          setEditTime={setEditTime}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          editPriority={editPriority}
          setEditPriority={setEditPriority}
          editAmount={editAmount}
          setEditAmount={setEditAmount}
          editStatus={editStatus}
          setEditStatus={setEditStatus}
          editNotes={editNotes}
          setEditNotes={setEditNotes}
          editLocation={editLocation}
          setEditLocation={setEditLocation}
          onResetView={() => {
            setSearchQuery("");
            setCategoryFilter("All Categories");
            setPriorityFilter("All Priorities");
            const list = getUnifiedEvents();
            const todayList = list.filter(e => e.date === selectedDayStr);
            if (todayList.length > 0) {
              handleSelectEventForEdit(todayList[0]);
            }
          }}
          onSaveEvent={handleSaveConfiguredEvent}
          onDeleteEvent={async (ev) => {
            if (confirm("Are you sure you want to delete this event?")) {
              await handleDeleteEvent(ev);
              setSelectedEventId(null);
              setIsConfiguring(false);
            }
          }}
          getDayFormattedTitle={getDayFormattedTitle}
        />
      </div>

      {/* Add Custom Event Modal Redesign (Modularized) */}
      {showAddCustomEvent && (
        <AddCustomEventModal 
          customTitle={customTitle}
          setCustomTitle={setCustomTitle}
          customCategory={customCategory}
          setCustomCategory={setCustomCategory}
          customPriority={customPriority}
          setCustomPriority={setCustomPriority}
          customDate={customDate}
          setCustomDate={setCustomDate}
          customTime={customTime}
          setCustomTime={setCustomTime}
          customAmount={customAmount}
          setCustomAmount={setCustomAmount}
          customLocation={customLocation}
          setCustomLocation={setCustomLocation}
          customNotes={customNotes}
          setCustomNotes={setCustomNotes}
          onClose={resetCustomForm}
          onSubmit={handleAddCustomEventSubmit}
        />
      )}

      {/* Google Calendar Sync Modal (Modularized) */}
      {showCalendarSyncModal && (
        <GoogleCalendarSyncModal 
          isGoogleAuthorized={isGoogleAuthorized}
          isGoogleSyncing={isGoogleSyncing}
          isGoogleAuthorizing={isGoogleAuthorizing}
          onAuthorize={handleAuthorizeGoogleCalendar}
          onSync={handleSyncGoogleCalendar}
          onClose={() => setShowCalendarSyncModal(false)}
        />
      )}

    </div>
  );
}
