import React, { useState, useEffect } from "react";
import {
  Shield,
  LayoutDashboard,
  KeyRound,
  FolderOpen,
  Mail,
  ShieldAlert,
  HeartPulse,
  Bell,
  LogOut,
  CheckCircle,
  Calendar,
  Sliders,
  Eye,
  Plus,
  MessageSquare,
  Sparkles,
  Sun,
  Moon,
  Languages,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LoginScreen from "./components/LoginScreen";
import ProfileCenter from "./components/ProfileCenter";
import DocumentVault from "./components/DocumentVault";
import DataExtractor from "./components/DataExtractor";
import LifeGraphDashboard from "./components/LifeGraphDashboard";
import EmergencyCenter from "./components/EmergencyCenter";
import ReminderAgent from "./components/ReminderAgent";
import CheckInSystem from "./components/CheckInSystem";
import NomineeDashboard from "./components/NomineeDashboard";
import FloatingChatbot from "./components/FloatingChatbot";
import SafetyPanel from "./components/SafetyPanel";
import { useThemeLanguage } from "./components/ThemeLanguageContext";
import { useSafeUser, useSafeClerk } from "./lib/clerkSafe";
import { apiFetch } from "./lib/api";


type Tab =
  | "Dashboard"
  | "Profile"
  | "Vault"
  | "GmailSync"
  | "SafetyCheckIn"
  | "EmergencyActivation"
  | "ReminderAgent"
  | "SafetyPanel"
  | "NomineeDashboard";

export default function App() {
  const { theme, toggleTheme, language, setLanguage, t, languages, isTranslating } = useThemeLanguage();
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<"user" | "nominee" | null>(null);
  const [syncTimeoutReached, setSyncTimeoutReached] = useState(false);

  // Clerk authentication (safe fallback when key is not provided)
  const { isSignedIn, user: clerkUser, isLoaded: isClerkLoaded } = useSafeUser();
  const { signOut } = useSafeClerk();

  // Nominee session state
  const [nomineeSession, setNomineeSession] = useState<{
    ownerUid: string;
    ownerName: string;
    nomineePhone: string;
  } | null>(null);

  const [currentTab, setCurrentTab] = useState<Tab>("Dashboard");
  const [checkInTriggerCounter, setCheckInTriggerCounter] = useState(0);
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Sync Clerk session with backend mock DB
  useEffect(() => {
    if (isClerkLoaded && isSignedIn && clerkUser) {
      const email = clerkUser.primaryEmailAddress?.emailAddress;
      const name = clerkUser.fullName || clerkUser.username || email?.split("@")[0] || "Clerk User";
      const uid = clerkUser.id;

      if (!user || user.uid !== uid) {
        apiFetch("/api/auth/clerk-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, uid })
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Failed to sync Clerk session (HTTP status ${res.status})`);
            return res.json();
          })
          .then((data) => {
            setUser(data.user);
            setRole("user");
            apiFetch("/api/track-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: uid })
            }).catch((err) => console.error("Postgres track-login error:", err));
          })
          .catch((err) => {
            console.error("Clerk sync error, bypassing and logging in locally:", err);
            setUser({
              uid,
              email: email || "user@clerk.com",
              name: name || "Clerk User",
              createdAt: new Date().toISOString()
            });
            setRole("user");
            apiFetch("/api/track-login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: uid })
            }).catch((e) => console.error("Postgres track-login error:", e));
          });
      }
    } else if (isClerkLoaded && !isSignedIn && role === "user" && user && (user.uid?.startsWith("user_") || user.uid?.startsWith("user-clerk"))) {
      // Clear session when logged out of Clerk (but don't affect sandbox session which uses normal ID)
      setUser(null);
      setRole(null);
    }
  }, [isClerkLoaded, isSignedIn, clerkUser, user, role]);

  // Clerk sync timeout fail-safe: bypass loader if stuck for over 4 seconds
  useEffect(() => {
    if (isSignedIn && !role) {
      const timer = setTimeout(() => {
        setSyncTimeoutReached(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setSyncTimeoutReached(false);
    }
  }, [isSignedIn, role]);

  useEffect(() => {
    if (isSignedIn && !role && syncTimeoutReached) {
      console.warn("Clerk sync connection timed out. Logging in locally...");
      const email = clerkUser?.primaryEmailAddress?.emailAddress || "user@clerk.com";
      const name = clerkUser?.fullName || clerkUser?.username || email.split("@")[0] || "Clerk User";
      const uid = clerkUser?.id || `user-clerk-${Date.now()}`;
      setUser({
        uid,
        email,
        name,
        createdAt: new Date().toISOString()
      });
      setRole("user");
      apiFetch("/api/track-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid })
      }).catch((e) => console.error("Postgres track-login error:", e));
    }
  }, [isSignedIn, role, syncTimeoutReached, clerkUser]);

  // Shared check-in state
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [toast, setToast] = useState<{ message: string; details?: string; type: "success" | "error" | null }>({
    message: "",
    details: "",
    type: null
  });

  const triggerToast = (message: string, details?: string, type: "success" | "error" = "success") => {
    setToast({ message, details, type });
  };

  useEffect(() => {
    if (toast.message) {
      const timer = setTimeout(() => {
        setToast({ message: "", details: "", type: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.message]);

  // Sync state between dashboard safety check-ins and the full safety panel
  const handleCheckInTriggered = () => {
    setCheckInTriggerCounter((prev) => prev + 1);
  };

  const handleLoginSuccess = (sessionData: any, userRole: "user" | "nominee") => {
    setRole(userRole);
    if (userRole === "nominee") {
      setNomineeSession({
        ownerUid: sessionData.ownerUid,
        ownerName: sessionData.ownerName,
        nomineePhone: sessionData.nomineePhone
      });
    } else {
      setUser(sessionData);
    }
  };

  const handleLogout = () => {
    if (isSignedIn) {
      signOut();
    }
    setUser(null);
    setRole(null);
    setNomineeSession(null);
    setCurrentTab("Dashboard");
  };

  // Capture Geolocation for Tab 9 location tracking
  useEffect(() => {
    if (user && navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              await apiFetch("/api/location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, latitude, longitude })
              });
            } catch (e) {
              console.error("Failed to write coordinates", e);
            }
          },
          (error) => {
            console.warn("Geolocation permission blocked or timed out.", error);
          }
        );
      } catch (err) {
        console.warn("Geolocation synchronous access blocked or failed:", err);
      }
    }
  }, [user]);

  if (!isClerkLoaded) {
    return (
      <div className="min-h-screen bg-[#2c3353] text-[#e0dafc] flex flex-col justify-center items-center gap-4">
        <div className="h-12 w-12 bg-[#e0dafc] rounded-xl flex items-center justify-center text-[#2c3353] shadow-md border border-indigo-300/30 animate-pulse">
          <Shield className="h-6 w-6 text-indigo-700 animate-spin" />
        </div>
        <p className="text-xs uppercase tracking-widest font-bold text-[#5d6fa3]">Connecting Secure Session...</p>
      </div>
    );
  }

  // Prevent blinking: do not render LoginScreen if signed in with Clerk but not yet synced
  if (isSignedIn && !role) {

    return (
      <div className="min-h-screen bg-[#2c3353] text-[#e0dafc] flex flex-col justify-center items-center gap-4">
        <div className="h-12 w-12 bg-[#e0dafc] rounded-xl flex items-center justify-center text-[#2c3353] shadow-md border border-indigo-300/30 animate-pulse">
          <Shield className="h-6 w-6 text-indigo-700 animate-spin" />
        </div>
        <p className="text-xs uppercase tracking-widest font-bold text-[#5d6fa3]">Syncing Secure Vault...</p>
      </div>
    );
  }

  if (!role) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (role === "nominee" && nomineeSession) {
    return (
      <>
        <NomineeDashboard
          ownerUid={nomineeSession.ownerUid}
          ownerName={nomineeSession.ownerName}
          nomineePhone={nomineeSession.nomineePhone}
          onLogout={handleLogout}
        />
        <FloatingChatbot uid={nomineeSession.ownerUid} isNominee={true} ownerUid={nomineeSession.ownerUid} />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-[#f4f6fb] text-slate-900 theme-light-container" : "bg-[#0d111d] text-slate-100 theme-dark-container"} flex flex-col lg:flex-row relative transition-colors duration-300 font-sans`}>

      {/* -------------------------------------------------------------
          1. PERSISTENT SIDEBAR (Desktop & Tablet Landscape >= 1024px)
          ------------------------------------------------------------- */}
      <aside className={`h-screen sticky top-0 lg:flex hidden flex-col justify-between shrink-0 select-none border-r transition-all duration-300 z-30 ${
        theme === "light" ? "bg-white border-slate-200/80 text-slate-900 shadow-sm" : "bg-[#111726] border-slate-800/80 text-slate-200 shadow-xl"
      } ${isSidebarCollapsed ? "w-20" : "w-64"}`}>

        {/* Top Branding / Logo & Collapse button */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-10 w-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-fade-in shrink-0">
                <h1 className="font-extrabold text-sm tracking-tight flex items-center gap-1.5 text-slate-900 dark:text-white">
                  {t("brandName")}
                  <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-500/20">
                    {t("brandBadge")}
                  </span>
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{t("secureSession")}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Scrollable Navigation links list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* General Section */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">General Portal</h3>
            )}
            {[
              { id: "Dashboard", label: t("tabDashboard") || "Dashboard", icon: LayoutDashboard },
              { id: "Profile", label: t("tabProfile") || "Security Profile", icon: KeyRound },
              { id: "Vault", label: t("tabVault") || "Secure Vault", icon: FolderOpen },
              { id: "GmailSync", label: t("tabGmailSync") || "Gmail Sync", icon: Mail },
              { id: "ReminderAgent", label: t("tabReminderAgent") || "Reminder Agent", icon: Bell },
            ].map((item) => {
              const IconComp = item.icon;
              const isSelected = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-semibold relative ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
                  title={item.label}
                >
                  <IconComp className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  {!isSidebarCollapsed && <span className="text-xs">{item.label}</span>}
                  {isSelected && !isSidebarCollapsed && (
                    <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Safety Handover & Emergency Section */}
          <div className="space-y-1">
            {!isSidebarCollapsed && (
              <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Safety & Handover</h3>
            )}
            {[
              { id: "SafetyPanel", label: t("tabSafetyPanel") || "Resilience Settings", icon: Sliders },
              { id: "SafetyCheckIn", label: "Proof-of-Life Check-In", icon: CheckCircle },
              { id: "EmergencyActivation", label: "Emergency Handover", icon: ShieldAlert },
              { id: "NomineeDashboard", label: "Nominee Portal View", icon: Eye },
            ].map((item) => {
              const IconComp = item.icon;
              const isSelected = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-semibold relative ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white"
                  } ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
                  title={item.label}
                >
                  <IconComp className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                  {!isSidebarCollapsed && <span className="text-xs truncate">{item.label}</span>}
                  {isSelected && !isSidebarCollapsed && (
                    <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3 shrink-0">

          {/* Quick theme & lang row */}
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
              <button
                onClick={toggleTheme}
                className="flex-1 py-1.5 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
                title={t("themeSelector")}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400" />
                )}
              </button>
              <div className="relative flex-1 py-1.5 flex items-center justify-center rounded-lg border-l border-slate-200 dark:border-slate-700">
                <Languages className="h-4 w-4 text-indigo-500 shrink-0 mr-1" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-transparent text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer pr-1"
                >
                  {languages.map((lang) => (
                    <option key={lang.code} value={lang.code} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white uppercase font-bold text-[10px]">
                      {lang.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-center">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-inherit cursor-pointer transition-colors"
                title={t("themeSelector")}
              >
                {theme === "light" ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-400" />}
              </button>
            </div>
          )}

          {/* User profile details / logout */}
          {!isSidebarCollapsed ? (
            <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl flex items-center justify-between gap-2 border border-slate-200/40 dark:border-slate-700/40">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{user.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer transition-all"
                title={t("logout")}
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
              title={t("logout")}
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          )}
        </div>
      </aside>


      {/* -------------------------------------------------------------
          2. STICKY MOBILE & TABLET HEADER (< 1024px)
          ------------------------------------------------------------- */}
      <header className={`lg:hidden flex items-center justify-between sticky top-0 z-30 h-16 px-4 sm:px-6 shadow-sm border-b shrink-0 transition-colors duration-300 ${
        theme === "light" ? "bg-white/95 backdrop-blur-md border-slate-200 text-slate-900" : "bg-[#111726]/95 backdrop-blur-md border-slate-800 text-slate-100"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-xs">
            <Shield className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-tight uppercase text-slate-900 dark:text-white">
            {t("brandName")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            title={t("themeSelector")}
          >
            {theme === "light" ? <Moon className="h-4 w-4 text-indigo-600" /> : <Sun className="h-4 w-4 text-amber-400" />}
          </button>
          <span className="app-badge badge-verified">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("online")}
          </span>
        </div>
      </header>

      {/* -------------------------------------------------------------
          3. ANIMATED MOBILE SLIDE-OUT DRAWER MENU (< 1024px)
          ------------------------------------------------------------- */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`fixed top-0 bottom-0 left-0 w-[300px] max-w-[85vw] z-50 flex flex-col justify-between shadow-2xl border-r lg:hidden ${
                theme === "light" ? "bg-white border-slate-200 text-slate-900" : "bg-[#111726] border-slate-800 text-slate-100"
              }`}
            >
              {/* Drawer Top Branding & Close Button */}
              <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">{t("brandName")}</h2>
                    <p className="text-[9px] text-slate-400 tracking-widest uppercase font-mono">{t("secureSession")}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">

                {/* General Links */}
                <div className="space-y-1">
                  <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">General Portal</h3>
                  {[
                    { id: "Dashboard", label: t("tabDashboard") || "Dashboard", icon: LayoutDashboard },
                    { id: "Profile", label: t("tabProfile") || "Security Profile", icon: KeyRound },
                    { id: "Vault", label: t("tabVault") || "Secure Vault", icon: FolderOpen },
                    { id: "GmailSync", label: t("tabGmailSync") || "Gmail Sync", icon: Mail },
                    { id: "ReminderAgent", label: t("tabReminderAgent") || "Reminder Agent", icon: Bell },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isSelected = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id as Tab);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-semibold ${
                          isSelected ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <IconComp className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Safety Handover & Emergency Links */}
                <div className="space-y-1">
                  <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Safety & Handover</h3>
                  {[
                    { id: "SafetyPanel", label: t("tabSafetyPanel") || "Resilience Settings", icon: Sliders },
                    { id: "SafetyCheckIn", label: "Proof-of-Life Check-In", icon: CheckCircle },
                    { id: "EmergencyActivation", label: "Emergency Handover", icon: ShieldAlert },
                    { id: "NomineeDashboard", label: "Nominee Portal View", icon: Eye },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isSelected = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentTab(item.id as Tab);
                          setIsMobileDrawerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-semibold ${
                          isSelected ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <IconComp className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                        <span className="text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer Footer controls */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 shrink-0">
                {/* Language list */}
                <div className="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-700/40">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Languages className="h-4 w-4 text-indigo-500" />
                    Language
                  </span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-transparent text-xs font-bold uppercase text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white font-bold text-xs">
                        {lang.nativeName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Info & Logout */}
                <div className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl flex items-center justify-between gap-2 border border-slate-200/40 dark:border-slate-700/40">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileDrawerOpen(false);
                      handleLogout();
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl cursor-pointer transition-colors"
                    title={t("logout")}
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* -------------------------------------------------------------
          4. MAIN VIEWPORT CONTAINER
          ------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 relative">

        {/* Tab Context Sub-Header */}
        <div className={`py-3.5 px-4 sm:px-8 flex items-center justify-between shrink-0 text-xs border-b transition-colors duration-300 ${
          theme === "light" ? "bg-white/80 backdrop-blur-md border-slate-200 text-slate-900" : "bg-[#0f1523]/80 backdrop-blur-md border-slate-800 text-slate-100"
        }`}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            <h2 className="font-extrabold uppercase tracking-wider text-slate-900 dark:text-white text-xs sm:text-sm" id="header-tab-title">
              {currentTab === "Dashboard" && (t("titleDashboard") || "Resilience Timeline")}
              {currentTab === "Profile" && (t("titleProfile") || "Nominee Access Settings")}
              {currentTab === "Vault" && (t("titleVault") || "Zero-Knowledge Documents")}
              {currentTab === "GmailSync" && (t("titleGmailSync") || "Email Directives Analyzer")}
              {currentTab === "SafetyCheckIn" && (t("titleSafetyCheckIn") || "Proof-of-Life Check-In")}
              {currentTab === "EmergencyActivation" && (t("titleEmergencyActivation") || "Emergency Handover")}
              {currentTab === "ReminderAgent" && (t("titleReminderAgent") || "Safety Automation Logs")}
              {currentTab === "SafetyPanel" && (t("titleSafetyPanel") || "Fail-Safe Protocol Panel")}
              {currentTab === "NomineeDashboard" && (t("titleNomineeDashboard") || "Nominee Handover Portal")}
            </h2>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">
            <span className="hidden sm:inline">{t("appStatus")}:</span>
            <span className="app-badge badge-verified">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("online")}
            </span>
          </div>
        </div>

        {/* Core Component Window */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 w-full max-w-7xl mx-auto relative overflow-hidden pb-28 lg:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {currentTab === "Dashboard" && (
                <LifeGraphDashboard
                  uid={user.uid}
                  onCheckInTriggered={handleCheckInTriggered}
                  checkInTriggerCounter={checkInTriggerCounter}
                  onNavigate={(tabName) => setCurrentTab(tabName as Tab)}
                  triggerToast={triggerToast}
                  justCheckedIn={justCheckedIn}
                  setJustCheckedIn={setJustCheckedIn}
                />
              )}
              {currentTab === "Profile" && <ProfileCenter uid={user.uid} />}
              {currentTab === "Vault" && <DocumentVault uid={user.uid} />}
              {currentTab === "GmailSync" && <DataExtractor uid={user.uid} />}
              {currentTab === "SafetyCheckIn" && (
                <CheckInSystem
                  uid={user.uid}
                  onCheckInTriggered={handleCheckInTriggered}
                  checkInTriggerCounter={checkInTriggerCounter}
                  onNavigate={(tabName) => setCurrentTab(tabName as any)}
                  triggerToast={triggerToast}
                  justCheckedIn={justCheckedIn}
                  setJustCheckedIn={setJustCheckedIn}
                />
              )}
              {currentTab === "EmergencyActivation" && <EmergencyCenter uid={user.uid} />}
              {currentTab === "ReminderAgent" && <ReminderAgent uid={user.uid} />}
              {currentTab === "SafetyPanel" && <SafetyPanel uid={user.uid} />}
              {currentTab === "NomineeDashboard" && (
                <NomineeDashboard
                  ownerUid={user.uid}
                  ownerName={user.name}
                  nomineePhone={user.nomineePhone || "+1 (555) 019-2834"}
                  onLogout={() => setCurrentTab("Dashboard")}
                  isOwnerPreview={true}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* -------------------------------------------------------------
          5. MOBILE & TABLET COMPACT THUMB-DOCK (< 1024px Only)
          ------------------------------------------------------------- */}
      <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-[380px] bg-slate-900/90 dark:bg-[#111726]/90 backdrop-blur-lg rounded-2xl border border-slate-700/60 shadow-2xl px-4 py-2 z-40 flex items-center justify-between gap-2 animate-fade-in text-white">
        {/* Mobile Dashboard thumb link */}
        <button
          onClick={() => {
            setCurrentTab("Dashboard");
            setShowQuickAccess(false);
          }}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            currentTab === "Dashboard"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className="text-[9px] font-bold">Dashboard</span>
        </button>

        {/* Central Plus safety quick actions button */}
        <div className="relative flex items-center justify-center px-1">
          {showQuickAccess && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-72 bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl z-50 animate-fade-in space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Safety Controls</h4>
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-1.5">
                {[
                  { tab: "SafetyCheckIn", title: "Proof-of-Life Check-In", desc: "Signal active presence & reset timer", color: "text-emerald-400 bg-emerald-950/30 border-emerald-500/20 hover:bg-emerald-950/50", icon: CheckCircle },
                  { tab: "EmergencyActivation", title: "Emergency Handover", desc: "Deploy continuity plan & release vault", color: "text-rose-400 bg-rose-950/30 border-rose-500/20 hover:bg-rose-950/50", icon: ShieldAlert },
                  { tab: "NomineeDashboard", title: "Nominee Portal View", desc: "Audit live handover visibility", color: "text-indigo-400 bg-indigo-950/30 border-indigo-500/20 hover:bg-indigo-950/50", icon: Eye }
                ].map((act, index) => {
                  const ActIcon = act.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentTab(act.tab as Tab);
                        setShowQuickAccess(false);
                      }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${act.color}`}
                    >
                      <ActIcon className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-white leading-none">{act.title}</p>
                        <p className="text-[9px] text-slate-400 leading-normal mt-1">{act.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowQuickAccess(!showQuickAccess)}
            className={`w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 hover:scale-105 active:scale-95 transition-all text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/40 relative z-50 cursor-pointer ${showQuickAccess ? "rotate-45" : ""}`}
            title="Quick Controls"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile AI Chat toggle button */}
        <button
          onClick={() => setIsChatbotOpen(!isChatbotOpen)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            isChatbotOpen
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="h-5 w-5 shrink-0" />
          <span className="text-[9px] font-bold">AI Chat</span>
        </button>
      </div>

      {/* Global floating context-synced Chatbot */}
      <FloatingChatbot
        uid={user.uid}
        externalOpen={isChatbotOpen}
        onToggle={setIsChatbotOpen}
      />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast.message && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-slate-900/95 backdrop-blur-md border ${
              toast.type === "success" ? "border-emerald-500/30 shadow-emerald-500/10" : "border-rose-500/30 shadow-rose-500/10"
            } rounded-2xl p-4 shadow-2xl flex items-start gap-3.5 text-white`}
          >
            <div className={`p-2 rounded-xl shrink-0 ${
              toast.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            }`}>
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white leading-tight">{toast.message}</h4>
              {toast.details && (
                <p className="text-[11px] text-slate-400 leading-normal mt-1">{toast.details}</p>
              )}
            </div>
            <button
              onClick={() => setToast({ message: "", type: null })}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
