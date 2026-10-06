import React, { useState, useEffect } from "react";
import { Shield, Key, Sparkles, Phone, Lock, ArrowRight, UserCheck, Sun, Moon, Languages, CheckCircle2 } from "lucide-react";
import { useThemeLanguage } from "./ThemeLanguageContext";
import { apiFetch } from "../lib/api";
import { SignIn, SignUp } from "@clerk/clerk-react";

const clerkAppearance = {
  variables: {
    colorPrimary: '#6366f1',
    colorBackground: '#111726',
    colorInputBackground: '#182238',
    colorText: '#f8fafc',
    colorTextSecondary: '#94a3b8',
    colorInputText: '#f8fafc',
    colorTextOnPrimaryBackground: '#ffffff',
  },
  elements: {
    card: 'bg-[#111726] border border-slate-800 rounded-2xl shadow-xl w-full p-5',
    headerTitle: 'text-white font-bold text-lg',
    headerSubtitle: 'text-slate-400 text-xs mt-1',
    socialButtonsBlockButton: 'border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold py-2.5 rounded-xl transition-all w-full flex items-center justify-center gap-2 cursor-pointer',
    socialButtonsBlockButtonText: 'text-slate-200 font-semibold text-xs',
    socialButtonsBlockButtonArrow: 'hidden',
    formButtonPrimary: 'w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/25 transition-all text-xs uppercase tracking-wider cursor-pointer',
    formFieldLabel: 'text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1',
    formFieldInput: 'w-full bg-[#182238] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-500',
    footerActionText: 'text-slate-400 text-xs',
    footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold transition-all underline text-xs cursor-pointer',
    dividerText: 'text-slate-500 font-bold text-[10px] uppercase tracking-widest',
    dividerLine: 'bg-slate-800',
    formFieldErrorText: 'text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/50 mt-1',
  }
};

interface LoginScreenProps {
  onLoginSuccess: (user: any, role: "user" | "nominee") => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { theme, toggleTheme, language, setLanguage, t, languages, isTranslating } = useThemeLanguage();
  const [activeTab, setActiveTab] = useState<"user" | "nominee">("user");
  const [isSignUp, setIsSignUp] = useState(false);

  // Carousel slide state
  const [activeSlide, setActiveSlide] = useState(0);

  // User form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Nominee form states
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [nomineeError, setNomineeError] = useState("");

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";
    const payload = isSignUp ? { email, password, name } : { email, password };

    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLoginSuccess(data.user, "user");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "wonderfulcelebrationskart@gmail.com",
          name: "Wonderful Celebrations"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLoginSuccess(data.user, "user");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "sandbox@lighthouseresilience.com",
          password: "demo"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLoginSuccess(data.user, "user");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setNomineeError("");
    if (!phone) {
      setNomineeError("Mobile number is required");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/nominee-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOtpSent(true);
    } catch (err: any) {
      setNomineeError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNomineeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setNomineeError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/nominee-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp, pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onLoginSuccess(data, "nominee");
    } catch (err: any) {
      setNomineeError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const slides = [
    {
      title: t("Secure Document Vault"),
      desc: t("Military-grade encryption for all financial playbooks, wills, passwords, and sensitive documents."),
      icon: Shield,
      badge: t("ZERO KNOWLEDGE")
    },
    {
      title: t("Proof-of-Life Check-ins"),
      desc: t("Seamless automated prompts to confirm presence. Delay nominee triggers automatically."),
      icon: Sparkles,
      badge: t("FAIL-SAFE TRIGGER")
    },
    {
      title: t("Secure Nominee Handover"),
      desc: t("Nominees receive immediate encrypted access once verification holds and conditions clear."),
      icon: UserCheck,
      badge: t("SECURE ACCESS")
    },
    {
      title: t("AI Care Companion"),
      desc: t("AI assistant guided by Gemini parses safety documents, creates playbooks, and supports recovery."),
      icon: Lock,
      badge: t("GEMINI POWERED")
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className={`min-h-screen ${theme === "light" ? "bg-[#f4f6fb] text-slate-900 theme-light-container" : "bg-[#0d111d] text-slate-100 theme-dark-container"} font-sans flex flex-col justify-between overflow-x-hidden transition-colors duration-300`}>
      
      {/* Navigation Header */}
      <nav className={`h-20 px-6 sm:px-12 flex items-center justify-between border-b ${theme === "light" ? "bg-white/90 backdrop-blur-md border-slate-200" : "bg-[#111726]/90 backdrop-blur-md border-slate-800"} shrink-0 transition-colors duration-300 sticky top-0 z-40`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Shield className="w-5.5 h-5.5 text-white" id="logo-icon" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-extrabold tracking-tight uppercase text-slate-900 dark:text-white" id="portal-title">
              {t("brandName")}
            </span>
            <span className="hidden sm:inline-block ml-2 text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">
              Security Protocol
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Selector */}
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 transition-all cursor-pointer"
            title={t("themeSelector")}
            id="btn-login-toggle-theme"
          >
            {theme === "light" ? (
              <Moon className="h-4.5 w-4.5 text-indigo-600" />
            ) : (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            )}
          </button>

          {/* Language Selector */}
          <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 py-1.5 px-3 gap-2">
            <Languages className="h-4 w-4 text-indigo-500 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-none outline-none cursor-pointer pr-1"
              id="btn-login-toggle-language"
              title={t("languageSelector")}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white uppercase font-bold text-xs">
                  {lang.nativeName}
                </option>
              ))}
            </select>
            {isTranslating && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content split screen */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Left column: High-end hero showcase */}
        <div className="w-full lg:w-1/2 p-8 sm:p-14 lg:p-18 flex flex-col justify-center gap-8 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-[#111728] to-[#0c101d] text-white relative overflow-hidden">
          
          {/* Subtle glowing orb background effect */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/25 text-xs text-indigo-300 font-bold uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Fail-Safe Family Continuity System
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-white" id="portal-desc">
              Organize vital assets before emergencies occur.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              Automated proof-of-life heartbeats, zero-knowledge encrypted vaults, and intelligent nominee handovers designed for complete peace of mind.
            </p>
          </div>

          {/* Interactive Core Showcase Carousel Card */}
          <div className="relative p-7 rounded-3xl border border-slate-700/80 bg-slate-800/60 backdrop-blur-md shadow-2xl min-h-[190px] flex flex-col justify-between relative z-10 group">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="app-badge badge-brand">
                  {slides[activeSlide].badge}
                </span>
                <span className="text-[11px] font-mono text-slate-400 font-semibold">
                  {activeSlide + 1} of {slides.length}
                </span>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 text-indigo-300 shrink-0 mt-0.5">
                  {React.createElement(slides[activeSlide].icon, { className: "h-6 w-6 text-indigo-400" })}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{slides[activeSlide].title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1.5">{slides[activeSlide].desc}</p>
                </div>
              </div>
            </div>

            {/* Carousel Navigation indicators & manual buttons */}
            <div className="flex items-center justify-between border-t border-slate-700/60 pt-4 mt-6">
              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${idx === activeSlide ? "w-7 bg-indigo-400" : "w-2 bg-slate-600 hover:bg-slate-500"}`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer font-bold border border-slate-600"
                >
                  &larr;
                </button>
                <button
                  onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer font-bold border border-slate-600"
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span className="app-badge badge-verified">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t("systemStatus")}
            </span>
            <span>AES-256 GCM Multi-Region Encryption</span>
          </div>
        </div>

        {/* Right column: Interactive Authentication Portal */}
        <div className={`w-full lg:w-1/2 p-8 sm:p-14 lg:p-18 flex flex-col justify-center items-center ${theme === "light" ? "bg-white" : "bg-[#0d111d]"} transition-colors duration-300`}>
          <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t("welcomeBack")}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{t("portalDesc")}</p>
            </div>

            {/* Main Tabs */}
            <div className="bg-slate-100 dark:bg-slate-800/70 p-1.5 rounded-2xl flex border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
              <button
                type="button"
                onClick={() => { setActiveTab("user"); setError(""); setNomineeError(""); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "user"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                id="tab-primary-user"
              >
                {t("userPortal")}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("nominee"); setError(""); setNomineeError(""); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "nominee"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                id="tab-nominee-user"
              >
                {t("nomineePortal")}
              </button>
            </div>

            {activeTab === "user" ? (
              <div className="space-y-4 w-full flex flex-col items-center">
                {!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? (
                  <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4.5 text-xs text-amber-700 dark:text-amber-300 space-y-2 text-left">
                    <span className="font-extrabold text-[10px] uppercase text-amber-600 dark:text-amber-400 block tracking-widest">Clerk Integration Config</span>
                    <p className="leading-relaxed text-[11px]">
                      Google Sign-In and User Authentication uses Clerk. To configure live OAuth:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                      <li>Create an account at <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-indigo-500">clerk.com</a>.</li>
                      <li>Enable Google OAuth under User &amp; Auth &rarr; Social Connections.</li>
                      <li>Add <code className="bg-black/10 dark:bg-black/30 px-1.5 py-0.5 rounded font-mono text-[10px]">VITE_CLERK_PUBLISHABLE_KEY</code> to your <code className="bg-black/10 dark:bg-black/30 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> file.</li>
                    </ol>
                  </div>
                ) : (
                  <div className="w-full flex justify-center clerk-auth-container">
                    {isSignUp ? (
                      <SignUp routing="virtual" appearance={clerkAppearance} signInUrl="#" />
                    ) : (
                      <SignIn routing="virtual" appearance={clerkAppearance} signUpUrl="#" />
                    )}
                  </div>
                )}

                {/* Additional Actions & Sandbox Fallback */}
                <div className="w-full border-t border-slate-200 dark:border-slate-800 pt-5 mt-2 flex flex-col gap-3">
                  {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 underline text-center block w-full cursor-pointer transition-colors"
                      id="btn-toggle-auth-mode"
                    >
                      {isSignUp ? "Already registered? Sign In" : "Need an account? Sign Up"}
                    </button>
                  )}

                  <button
                    onClick={handleSandboxLogin}
                    className="w-full py-3.5 text-xs uppercase tracking-wider font-bold rounded-xl border border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    id="btn-sandbox-login"
                  >
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    Instant Sandbox Demo Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-200 space-y-1.5">
                  <span className="font-extrabold text-[10px] uppercase text-indigo-600 dark:text-indigo-300 block tracking-wider">Sandbox Nominee Portal</span>
                  <p className="leading-relaxed text-[11px]">
                    To test nominee verification, configure a **Nominee Registered Phone Number** and **Access PIN** in your Profile Center.
                  </p>
                  <p className="leading-relaxed text-[11px]">
                    Click **Send OTP** to receive demo OTP <span className="font-bold font-mono px-1 py-0.5 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">7777</span> and use your PIN to authenticate.
                  </p>
                </div>

                {/* NOMINEE LOGIN FORM */}
                <form className="space-y-4" onSubmit={handleNomineeLogin}>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Nominee Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="input-field pl-10"
                          placeholder="+1 (555) 012-3456"
                          id="input-nominee-phone"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/70 text-indigo-600 dark:text-indigo-300 text-xs font-bold px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all shrink-0 cursor-pointer"
                        id="btn-send-otp"
                      >
                        {otpSent ? "Resend" : "Send OTP"}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="animate-fade-in space-y-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">SMS Verification Code (OTP)</label>
                        <input
                          type="text"
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="input-field text-center font-mono tracking-widest text-base font-bold"
                          placeholder="7777"
                          maxLength={4}
                          id="input-nominee-otp"
                        />
                        <p className="text-[11px] text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Demo code 7777 successfully generated.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Nominee Access PIN</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type="password"
                            required
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="input-field pl-10 text-center font-mono tracking-widest text-base font-bold"
                            placeholder="••••"
                            maxLength={6}
                            id="input-nominee-pin"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Default Demo PIN: 1234</p>
                      </div>
                    </div>
                  )}

                  {nomineeError && (
                    <p className="text-xs text-rose-500 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30" id="nominee-auth-error">
                      {nomineeError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !otpSent}
                    className={`w-full py-3.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider ${
                      otpSent
                        ? "btn-primary"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                    id="btn-nominee-submit"
                  >
                    <UserCheck className="h-4 w-4" />
                    Verify &amp; Unlock Handover
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className={`h-auto md:h-14 px-6 sm:px-12 py-4 md:py-0 border-t ${theme === "light" ? "bg-white border-slate-200 text-slate-500" : "bg-[#111726] border-slate-800 text-slate-400"} flex flex-col md:flex-row items-center justify-between text-[11px] uppercase tracking-widest gap-2 shrink-0`}>
        <div>v1.0.4 — Secured with AES-256 GCM + Gemini 1.5</div>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Session Security Active
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Zero-Knowledge Storage
          </span>
          <span className="italic font-medium hidden sm:inline text-slate-400">Privacy is a fundamental right.</span>
        </div>
      </footer>
    </div>
  );
}
