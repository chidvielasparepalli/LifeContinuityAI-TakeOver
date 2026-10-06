import React, { useState, useEffect } from "react";
import { Shield, Key, Sparkles, Phone, Lock, ArrowRight, UserCheck, Sun, Moon, Languages } from "lucide-react";
import { useThemeLanguage } from "./ThemeLanguageContext";
import { apiFetch } from "../lib/api";
import { SignIn, SignUp } from "@clerk/clerk-react";

const clerkAppearance = {
  variables: {
    colorPrimary: '#6366f1',
    colorBackground: '#1e233a',
    colorInputBackground: '#2c3353',
    colorText: '#e0dafc',
    colorTextSecondary: '#a5b4fc',
    colorInputText: '#e0dafc',
    colorTextOnPrimaryBackground: '#ffffff',
  },
  elements: {
    card: 'bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl shadow-xl w-full p-4',
    headerTitle: 'text-white font-bold text-lg',
    headerSubtitle: 'text-[#a5b4fc] text-xs mt-1',
    socialButtonsBlockButton: 'border border-[#5d6fa3]/30 hover:bg-[#2c3353] text-[#e0dafc] font-semibold py-2 rounded-lg transition-all w-full flex items-center justify-center gap-2 cursor-pointer',
    socialButtonsBlockButtonText: 'text-[#e0dafc] font-semibold text-sm',
    socialButtonsBlockButtonArrow: 'hidden',
    formButtonPrimary: 'w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg hover:shadow-indigo-500/25 transition-all text-sm uppercase tracking-wider cursor-pointer',
    formFieldLabel: 'text-[10px] uppercase tracking-widest text-[#a5b4fc] font-bold mb-1',
    formFieldInput: 'w-full bg-[#2c3353] border border-[#5d6fa3]/30 rounded-lg p-2.5 text-sm text-[#e0dafc] focus:outline-none focus:border-indigo-400 transition-all placeholder-[#5d6fa3]/70',
    footerActionText: 'text-[#a5b4fc] text-xs',
    footerActionLink: 'text-indigo-400 hover:text-indigo-300 font-bold transition-all underline text-xs cursor-pointer',
    dividerText: 'text-[#5d6fa3] font-bold text-[10px] uppercase tracking-widest',
    dividerLine: 'bg-[#5d6fa3]/20',
    formFieldErrorText: 'text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900/50 mt-1',
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
    <div className={`lc-shell min-h-screen ${theme === "light" ? "theme-light-container" : "theme-dark-container"} font-sans flex flex-col justify-between overflow-x-hidden transition-colors duration-300`}>
      
      {/* Navigation Header */}
      <nav className="lc-login-nav h-20 px-6 sm:px-12 flex items-center justify-between border-b shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="lc-brand-mark w-10 h-10 rounded-lg">
            <Shield className="w-6 h-6 text-indigo-700" id="logo-icon" />
          </div>
          <span className="text-xl sm:text-2xl font-black tracking-tight uppercase text-inherit" id="portal-title">
            {t("brandName")}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Selector */}
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 rounded-xl text-inherit border border-transparent hover:border-[#5d6fa3]/30 transition-all cursor-pointer"
            title={t("themeSelector")}
            id="btn-login-toggle-theme"
          >
            {theme === "light" ? (
              <Moon className="h-4.5 w-4.5 text-indigo-700" />
            ) : (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            )}
          </button>

          {/* Language Selector */}
          <div className="relative flex items-center bg-white/10 dark:bg-white/5 rounded-xl border border-[#5d6fa3]/10 hover:border-[#5d6fa3]/40 transition-all py-1.5 px-2.5 gap-2 text-white">
            <Languages className="h-4 w-4 text-indigo-300 shrink-0" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-[10px] font-black uppercase tracking-wider text-white border-none outline-none cursor-pointer pr-1"
              id="btn-login-toggle-language"
              title={t("languageSelector")}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code} className="text-black bg-white dark:bg-[#1e233a] dark:text-white uppercase font-bold text-xs">
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

          <div className="hidden lg:flex gap-6 text-xs uppercase tracking-wider font-bold opacity-80">
            <span className="hover:text-indigo-500 dark:hover:text-white cursor-pointer">Protocol</span>
            <span className="hover:text-indigo-500 dark:hover:text-white cursor-pointer">Vault</span>
            <span className="hover:text-indigo-500 dark:hover:text-white cursor-pointer">FAQ</span>
          </div>
        </div>
      </nav>

      {/* Main Content split screen */}
      <main className="flex-1 flex flex-col md:flex-row">
        
        {/* Left column: Branding, value propositions & Carousel */}
        <div className="lc-login-hero w-full md:w-1/2 p-6 sm:p-12 lg:p-16 flex flex-col justify-center gap-6 border-b md:border-b-0 md:border-r border-[#5d6fa3]/20 text-white">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-xs text-teal-200 font-bold uppercase tracking-wider">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              {t("brandName")}
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-white" id="portal-desc">
              {t("loginTitle")}
            </h1>
          </div>

          {/* Interactive Core Showcase Carousel */}
           <div className="relative p-6 rounded-2xl border border-white/15 bg-white/5 overflow-hidden shadow-xl min-h-[170px] flex flex-col justify-between backdrop-blur-sm">
            {/* Slide Background Visual Graphic */}
            <div className="absolute right-3 top-3 opacity-10">
              <Shield className="h-28 w-28 text-indigo-500" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 uppercase tracking-widest">
                  {slides[activeSlide].badge}
                </span>
                <span className="text-[10px] font-mono text-indigo-200/50">
                  {activeSlide + 1} / {slides.length}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                  {React.createElement(slides[activeSlide].icon, { className: "h-5 w-5" })}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{slides[activeSlide].title}</h3>
                  <p className="text-xs text-indigo-200/80 leading-relaxed mt-1">{slides[activeSlide].desc}</p>
                </div>
              </div>
            </div>

            {/* Carousel Navigation indicators & manual buttons */}
            <div className="flex items-center justify-between border-t border-[#5d6fa3]/20 pt-4 mt-4">
              <div className="flex items-center gap-1.5">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${idx === activeSlide ? "w-6 bg-indigo-400" : "w-2 bg-indigo-500/30 hover:bg-indigo-500/50"}`}
                    title={`Slide ${idx + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                  className="px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-indigo-200 transition-all cursor-pointer font-bold border border-white/5"
                >
                  &larr;
                </button>
                <button
                  onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                  className="px-2.5 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10 text-indigo-200 transition-all cursor-pointer font-bold border border-white/5"
                >
                  &rarr;
                </button>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="inline-flex px-4 py-2 rounded-full bg-[#5d6fa3]/20 border border-[#5d6fa3]/40 text-xs text-indigo-200 font-semibold items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              {t("systemStatus")}
            </div>
          </div>
        </div>

        {/* Right column: Interactive form panel */}
         <div className="lc-login-form w-full md:w-1/2 p-6 sm:p-12 lg:p-16 flex flex-col justify-center items-center transition-colors duration-300">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-inherit">{t("welcomeBack")}</h2>
              <p className="text-[#5d6fa3] text-sm font-medium">{t("portalDesc")}</p>
            </div>

            {/* Main Tabs */}
            <div className="bg-[#5d6fa3]/10 p-1 rounded-full flex mb-8 border border-[#5d6fa3]/10">
              <button
                type="button"
                onClick={() => { setActiveTab("user"); setError(""); setNomineeError(""); }}
                className={`flex-1 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "user"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-[#5d6fa3] hover:text-indigo-600 dark:hover:text-[#e0dafc]"
                }`}
                id="tab-primary-user"
              >
                {t("userPortal")}
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab("nominee"); setError(""); setNomineeError(""); }}
                className={`flex-1 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === "nominee"
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-[#5d6fa3] hover:text-indigo-600 dark:hover:text-[#e0dafc]"
                }`}
                id="tab-nominee-user"
              >
                {t("nomineePortal")}
              </button>
            </div>

            {activeTab === "user" ? (
              <div className="space-y-4 w-full flex flex-col items-center">
                {!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? (
                  <div className="w-full bg-amber-950/40 border border-amber-900/50 rounded-xl p-4 text-xs text-amber-250 space-y-2 text-left">
                    <span className="font-extrabold text-[10px] uppercase text-amber-400 block tracking-widest">Clerk Integration Required</span>
                    <p className="leading-relaxed text-[11px]">
                      Google Sign-In and User Authentication requires Clerk. To configure this:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-200">
                      <li>Create an account/project at <a href="https://clerk.com" target="_blank" rel="noopener noreferrer" className="underline font-bold text-white hover:text-indigo-300">clerk.com</a>.</li>
                      <li>Enable **Google** under User & Auth &rarr; Social Connections.</li>
                      <li>Copy your **Publishable Key**.</li>
                      <li>Create a file named <code className="bg-black/45 px-1 py-0.5 rounded font-mono text-white text-[10px]">.env</code> in the project root.</li>
                      <li>Add: <code className="bg-black/45 px-1.5 py-0.5 rounded font-mono text-white text-[10px] block mt-1 break-all select-all">VITE_CLERK_PUBLISHABLE_KEY=your_publishable_key</code></li>
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
                <div className="w-full border-t border-[#5d6fa3]/10 pt-4 mt-2 flex flex-col gap-3">
                  {import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && (
                    <button
                      onClick={() => setIsSignUp(!isSignUp)}
                      className="text-xs font-semibold text-[#5d6fa3] hover:text-[#e0dafc] underline text-center block w-full cursor-pointer"
                      id="btn-toggle-auth-mode"
                    >
                      {isSignUp ? "Already registered? Sign In" : "Need an account? Sign Up"}
                    </button>
                  )}

                  <button
                    onClick={handleSandboxLogin}
                     disabled={loading}
                     className="lc-btn-secondary py-2.5 text-[11px] uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer w-full"
                    id="btn-sandbox-login"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Sandbox Demo Login
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#1e233a] border border-[#5d6fa3]/20 rounded-xl p-3.5 text-xs text-[#a5b4fc]/95 space-y-1">
                  <span className="font-extrabold text-[10px] uppercase text-[#e0dafc] block">Sandbox Nominee Portal</span>
                  <p className="leading-relaxed text-[11px]">
                    To test, configure a **Nominee Registered Phone Number** and **Access PIN** in your **Profile Center**. 
                  </p>
                  <p className="leading-relaxed text-[11px]">
                    Enter that nominee phone number here, click **Send OTP** to receive the mock OTP <span className="font-bold text-white">7777</span>, and use your configured PIN to authenticate.
                  </p>
                </div>
                {/* NOMINEE LOGIN ENTRY POINT */}
                <form className="space-y-4" onSubmit={handleNomineeLogin}>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-[#5d6fa3] font-bold">Nominee Mobile Number</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-[#5d6fa3]" />
                         <input
                           type="tel"
                           autoComplete="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-3 pl-10 text-sm text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                          placeholder="+1 (555) 012-3456"
                          id="input-nominee-phone"
                        />
                      </div>
                         <button
                           type="button"
                           onClick={handleSendOtp}
                           disabled={loading || !phone.trim()}
                           className="lc-btn-secondary text-xs font-semibold px-4 transition-all shrink-0"
                        id="btn-send-otp"
                      >
                        {otpSent ? "Resend" : "Send OTP"}
                      </button>
                    </div>
                  </div>

                  {otpSent && (
                    <div className="animate-fade-in space-y-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-[#5d6fa3] font-bold">SMS Verification Code (OTP)</label>
                         <input
                           type="text"
                           inputMode="numeric"
                           autoComplete="one-time-code"
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-3 text-sm text-center font-mono tracking-widest text-lg text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                          placeholder="7777"
                          maxLength={4}
                          id="input-nominee-otp"
                        />
                        <p className="text-[10px] text-green-400">Demo code 7777 successfully sent.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest text-[#5d6fa3] font-bold">Nominee Access PIN</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-[#5d6fa3]" />
                           <input
                             type="password"
                             autoComplete="current-password"
                            required
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-3 pl-10 text-sm text-center font-mono tracking-widest text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                            placeholder="••••"
                            maxLength={6}
                            id="input-nominee-pin"
                          />
                        </div>
                        <p className="text-[9px] text-[#5d6fa3]">Default Demo PIN: 1234</p>
                      </div>
                    </div>
                  )}

                  {nomineeError && (
                    <p className="text-xs text-red-400 bg-red-950/40 p-3 rounded-lg border border-red-900/50" id="nominee-auth-error">
                      {nomineeError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !otpSent}
                    className={`w-full py-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      otpSent
                        ? "bg-[#e0dafc] text-[#2c3353] hover:brightness-110 shadow-lg"
                        : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                    }`}
                    id="btn-nominee-submit"
                  >
                    <UserCheck className="h-4 w-4" />
                    Verify & Unlock Handover
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="h-auto md:h-12 px-6 sm:px-12 py-4 md:py-0 border-t border-[#5d6fa3]/30 flex flex-col md:flex-row items-center justify-between text-[10px] uppercase tracking-widest text-[#5d6fa3] gap-2 shrink-0">
        <div>v1.0.4 — Secured with AES-256 GCM + Gemini 1.5</div>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Firebase Auth Active
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div> Firestore Sync: 22ms
          </span>
          <span className="text-[#e0dafc]/60 italic font-medium hidden sm:inline">Privacy is a fundamental right.</span>
        </div>
      </footer>
    </div>
  );
}
