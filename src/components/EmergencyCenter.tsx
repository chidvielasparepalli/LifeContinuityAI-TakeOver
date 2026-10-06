import React, { useState, useEffect } from "react";
import { AlertOctagon, Sparkles, Volume2, HelpCircle, FileText, Send, XOctagon, Check, Copy, RefreshCw, ShieldAlert, HeartHandshake, ArrowRight } from "lucide-react";
import { apiFetch } from "../lib/api";

interface EmergencyCenterProps {
  uid: string;
  onEmergencyStatusChanged?: () => void;
  triggerRefreshCounter?: number;
}

export default function EmergencyCenter({ uid, onEmergencyStatusChanged, triggerRefreshCounter }: EmergencyCenterProps) {
  const [isActive, setIsActive] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Drafting options
  const [sendTo, setSendTo] = useState("Family Group");
  const [tone, setTone] = useState("Reassuring");
  const [draftText, setDraftText] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  // TTS speaking state
  const [speaking, setSpeaking] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await apiFetch(`/api/emergency/status/${uid}`);
      const data = await res.json();
      setIsActive(data.active);
      setPlan(data.plan || null);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [uid, triggerRefreshCounter]);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/emergency/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, triggeredBy: "manual" })
      });
      if (res.ok) {
        await checkStatus();
        if (onEmergencyStatusChanged) onEmergencyStatusChanged();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/emergency/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      if (res.ok) {
        setDraftText("");
        if ("speechSynthesis" in window) {
          try {
            window.speechSynthesis.cancel();
          } catch (e) {
            console.warn("Deactivate speech cancel failed:", e);
          }
        }
        setSpeaking(false);
        await checkStatus();
        if (onEmergencyStatusChanged) onEmergencyStatusChanged();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async () => {
    setDrafting(true);
    setCopied(false);
    try {
      const res = await apiFetch("/api/emergency/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, sendTo, tone })
      });
      const data = await res.json();
      if (res.ok) {
        setDraftText(data.draft);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDrafting(false);
    }
  };

  const handleCopyDraft = () => {
    if (!draftText) return;
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeakBriefing = () => {
    if (!plan || !plan.aiSummary) return;

    if (speaking) {
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn("Speech synthesis cancel failed:", e);
        }
      }
      setSpeaking(false);
      return;
    }

    try {
      const cleanText = plan.aiSummary.replace(/[*#]/g, ""); // clean markdown characters
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      setSpeaking(true);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.speak(utterance);
      } else {
        setSpeaking(false);
      }
    } catch (err) {
      console.warn("Speech synthesis failed to speak:", err);
      setSpeaking(false);
    }
  };

  // Stop reading voice if component unmounts
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {
          console.warn("Speech synthesis unmount cancel failed:", e);
        }
      }
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {!isActive ? (
        // INACTIVE PREPARATION SCREEN
        <div className="app-card border-dashed border-rose-500/30 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="h-20 w-20 bg-rose-500/10 rounded-3xl flex items-center justify-center text-rose-400 mx-auto border border-rose-500/30 shadow-lg shadow-rose-950/20">
            <ShieldAlert className="h-10 w-10" />
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">Emergency Standby Mode</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-lg mx-auto leading-relaxed">
              When triggered, Lighthouse automatically compiles your critical financial commitments, prescription schedules, active routines, and encrypted vault records. Authorized nominees can unlock verified handover access immediately.
            </p>
          </div>

          <div className="bg-[var(--bg-app)] p-6 rounded-2xl border border-[var(--border-card)] text-left space-y-3 shadow-inner">
            <h4 className="text-xs font-bold text-rose-400 uppercase flex items-center gap-2 tracking-wider">
              <Sparkles className="h-4 w-4 text-rose-400" />
              <span>Pre-activation Checklist</span>
            </h4>
            <ul className="text-xs text-[var(--text-primary)]/80 space-y-2 list-disc list-inside leading-relaxed">
              <li>Emergency Contacts and Mobile number of Nominee are specified under Profile.</li>
              <li>Required insurance schedules are toggled to "Nominee allowed" in Vault.</li>
              <li>Proof-of-life checking intervals are specified in Safety Panel.</li>
            </ul>
          </div>

          <button
            onClick={handleActivate}
            disabled={loading}
            className="btn-danger w-full sm:w-auto px-8 py-3.5 text-sm font-bold shadow-xl shadow-rose-950/30 cursor-pointer"
            id="btn-activate-emergency-manual"
          >
            <AlertOctagon className="h-4 w-4" />
            <span>{loading ? "Compiling Continuity Plan..." : "Manual Emergency Activation"}</span>
          </button>
        </div>
      ) : (
        // ACTIVE COMMAND CENTER VIEW
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* AI Coordination & Voice Briefing */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* AI Summary Card */}
            <div className="app-card border-2 border-rose-500/60 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden bg-gradient-to-b from-[var(--bg-card)] to-rose-950/15">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />
              
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/30 shrink-0 shadow-inner">
                    <Sparkles className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      Lighthouse AI Response Summary
                    </h3>
                    <span className="app-badge app-badge-danger mt-1 text-[10px] font-bold inline-block">
                      Emergency Verification Active (Trigger: {plan?.triggeredBy || "System"})
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDeactivate}
                  disabled={loading}
                  className="btn-secondary py-2 px-3 text-xs font-bold text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10 self-start sm:self-auto shrink-0"
                  id="btn-emergency-deactivate"
                >
                  <XOctagon className="h-4 w-4 text-rose-400" />
                  <span>Stand Down Mode</span>
                </button>
              </div>

              {/* Narrated Summary text block */}
              <div className="bg-[var(--bg-app)] p-5 sm:p-6 rounded-2xl border border-[var(--border-card)] text-xs sm:text-sm text-[var(--text-primary)]/90 leading-relaxed font-normal shadow-inner whitespace-pre-line">
                {plan?.aiSummary || "Compiling summary of emergency continuity parameters and immediate next steps..."}
              </div>

              {/* TTS Voice Briefing controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-card)]">
                <div className="flex items-center gap-3 text-xs font-semibold text-[var(--text-primary)]">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Volume2 className="h-4 w-4" />
                  </div>
                  <span>Play Voice Briefing Playbook hands-free</span>
                </div>
                <button
                  onClick={handleSpeakBriefing}
                  className={`btn-primary py-2.5 px-5 text-xs font-bold shrink-0 ${
                    speaking ? "bg-rose-600 hover:bg-rose-700 text-white" : ""
                  }`}
                  id="btn-emergency-tts"
                >
                  <Volume2 className={`h-4 w-4 ${speaking ? "animate-pulse" : ""}`} />
                  <span>{speaking ? "Pause Voice Briefing" : "Read Briefing Aloud"}</span>
                </button>
              </div>
            </div>

            {/* Compiled Continuity Plan details */}
            <div className="app-card p-6 sm:p-8 space-y-6">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2.5 border-b border-[var(--border-card)] pb-4">
                <FileText className="h-5 w-5 text-indigo-400" />
                <span>Compiled Nominee Continuity Ledger</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3 bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--border-card)]">
                  <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    <span>Things to Pay This Week</span>
                  </h4>
                  {plan?.thingsToPayThisWeek?.length === 0 ? (
                    <p className="text-[var(--text-muted)] italic">No urgent bills logged.</p>
                  ) : (
                    <ul className="space-y-2">
                      {plan?.thingsToPayThisWeek?.map((b: string, idx: number) => (
                        <li key={idx} className="font-medium text-[var(--text-primary)] flex items-start gap-2">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--border-card)]">
                  <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    <span>Medicine Refill Schedule</span>
                  </h4>
                  {plan?.medicinesToRefill?.length === 0 ? (
                    <p className="text-[var(--text-muted)] italic">No prescription reminders specified.</p>
                  ) : (
                    <ul className="space-y-2">
                      {plan?.medicinesToRefill?.map((m: string, idx: number) => (
                        <li key={idx} className="font-medium text-[var(--text-primary)] flex items-start gap-2">
                          <span className="text-cyan-400 font-bold">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-3 bg-[var(--bg-app)] p-5 rounded-2xl border border-[var(--border-card)] md:col-span-2">
                  <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Insurance Claims Roadmap</span>
                  </h4>
                  {plan?.insuranceClaimChecklist?.length === 0 ? (
                    <p className="text-[var(--text-muted)] italic">No policy documents linked for claims.</p>
                  ) : (
                    <ul className="space-y-2">
                      {plan?.insuranceClaimChecklist?.map((cl: string, idx: number) => (
                        <li key={idx} className="font-medium text-[var(--text-primary)] flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{cl}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Smart Update Update Drafter panel */}
          <div className="app-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-card)]">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">Smart Update Drafter</h3>
                <span className="text-[10px] text-[var(--text-muted)]">AI Emergency Dispatch</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Target Recipient</label>
                <select
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  className="input-field w-full text-xs"
                >
                  <option value="Family Group">Family Coordinator</option>
                  <option value="Work Manager">Professional Manager / Boss</option>
                  <option value="Emergency Contact">Emergency Responder</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Communication Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="input-field w-full text-xs"
                >
                  <option value="Reassuring">Reassuring & Calm</option>
                  <option value="Urgent">Urgent & Clear</option>
                  <option value="Professional">Professional Notice</option>
                </select>
              </div>

              <button
                onClick={handleGenerateDraft}
                disabled={drafting}
                className="btn-primary w-full justify-center py-3 text-xs"
                id="btn-emergency-draft-generate"
              >
                <RefreshCw className={`h-4 w-4 ${drafting ? "animate-spin" : ""}`} />
                <span>{drafting ? "Drafting with Gemini..." : "Generate Custom Draft"}</span>
              </button>

              {draftText && (
                <div className="space-y-2 animate-fade-in pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Generated Message</span>
                    <button
                      onClick={handleCopyDraft}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy text</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={draftText}
                    rows={8}
                    className="input-field w-full font-mono text-xs leading-relaxed resize-none p-3.5"
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
