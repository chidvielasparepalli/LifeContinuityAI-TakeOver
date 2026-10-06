import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, Sliders, Sparkles, FolderSync, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/api";
import LoadingState from "./LoadingState";

interface DataExtractorProps {
  uid: string;
}

export default function DataExtractor({ uid }: DataExtractorProps) {
  const [keywords, setKeywords] = useState("");
  const [emailRecords, setEmailRecords] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [composioAuthorized, setComposioAuthorized] = useState(false);
  const [isLinkingComposio, setIsLinkingComposio] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [needsComposioAuth, setNeedsComposioAuth] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const checkComposioStatus = async () => {
    try {
      const res = await apiFetch(`/api/composio/status/${uid}`);
      const data = await res.json();
      if (data && data.success) {
        setComposioAuthorized(data.connected);
      }
    } catch (e) {
      console.error("Error checking Composio connection status:", e);
    }
  };

  const handleConnectComposio = async () => {
    setIsLinkingComposio(true);
    setSyncError(null);
    setSyncNotice(null);
    try {
      const res = await apiFetch("/api/composio/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, callbackUrl: window.location.origin })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate Composio authorization link");
      }
      if (data.redirectUrl) {
        window.open(data.redirectUrl, "_blank", "noopener,noreferrer");
        setSyncNotice("Authorization opened in a new window. Finish connecting Gmail, then verify the connection here.");
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "Could not start Composio authorization flow.");
    } finally {
      setIsLinkingComposio(false);
    }
  };

  const fetchSettingsAndRecords = async () => {
    try {
      const sRes = await apiFetch(`/api/gmail/settings/${uid}`);
      const sData = await sRes.json();
      if (sData) {
        setKeywords(sData.targetKeywords || "");
      }

      const rRes = await apiFetch(`/api/gmail/records/${uid}`);
      const rData = await rRes.json();
      setEmailRecords(Array.isArray(rData) ? rData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndRecords();
    checkComposioStatus();
  }, [uid]);

  const handleSaveSettings = async () => {
    try {
      await apiFetch(`/api/gmail/settings/${uid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetKeywords: keywords
        })
      });
    } catch (e) {
      console.error(e);
    }
  };



  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncNotice(null);
    setNeedsComposioAuth(false);
    // Persist active settings first
    await handleSaveSettings();

    try {
      const res = await apiFetch("/api/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid })
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "NEEDS_COMPOSIO_AUTH" || data.error === "GMAIL_AUTH_ERROR") {
          setNeedsComposioAuth(true);
          setSyncError(null); // clear generic error, show specific banner instead
        } else {
          setSyncError(data.message || "Failed to execute Gmail synchronization.");
        }
      } else {
        fetchSettingsAndRecords();
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "An unexpected error occurred during synchronization.");
    } finally {
      setIsSyncing(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Bills": return "bg-red-950/40 text-red-400 border border-red-900/50";
      case "Insurance": return "bg-blue-950/40 text-blue-400 border border-blue-900/50";
      case "Travel": return "bg-amber-950/40 text-amber-400 border border-amber-900/50";
      case "Healthcare": return "bg-green-950/40 text-green-400 border border-green-900/50";
      case "Appointments": return "bg-indigo-950/40 text-indigo-400 border border-indigo-900/50";
      default: return "bg-[#2c3353] text-[#e0dafc] border border-[#5d6fa3]/20";
    }
  };

  const filteredRecords = activeCategory === "All"
    ? emailRecords
    : emailRecords.filter(r => r.category === activeCategory);

  const getGmailUrl = (record: any) => {
    let url = record.gmailUrl || "";
    if (url) {
      return url.replace("#inbox/", "#all/");
    }
    // Fallback: extract email address if present in sender
    let cleanSender = record.sender || "";
    const emailMatch = cleanSender.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      cleanSender = emailMatch[1];
    }
    return `https://mail.google.com/mail/u/0/#search/from:${encodeURIComponent(cleanSender)}+subject:(${encodeURIComponent(record.subject || "")})`;
  };

  const handleCardClick = (e: React.MouseEvent, record: any) => {
    const target = e.target as HTMLElement;
    // Do not redirect if user clicks details summary, details content or buttons
    if (target.closest("details") || target.closest("button") || target.closest("a")) {
      return;
    }
    const url = getGmailUrl(record);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDeleteEmail = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this extracted email?")) {
      return;
    }
    try {
      const res = await apiFetch(`/api/gmail/records/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchSettingsAndRecords();
      } else {
        const data = await res.json().catch(() => ({}));
        setSyncError(data.error || "Failed to delete email record.");
      }
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "Failed to delete email record.");
    }
  };

  if (initialLoading) {
    return (
      <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6">
        <LoadingState label="Loading your Gmail timeline" />
      </div>
    );
  }

  return (
    <div className="lc-page-wrap max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 text-[#e0dafc]">
      
      {/* OAuth & Sync Configuration */}
      <div className="space-y-6">
        
        {/* Workspace Auth Box */}
        <div className="lc-panel shadow-lg p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#5d6fa3]/20 pb-3">
            <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/25">
              <FolderSync className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Workspace Connector</h3>
              <p className="text-xs text-[#5d6fa3]">Authorized Google API syncing</p>
            </div>
          </div>

          <p className="text-xs text-[#5d6fa3] leading-relaxed">
            By connecting Google Workspace, Lighthouse securely scans your inbox and scheduled agendas for important alerts (renewals, bills, appointments, healthcare summaries) to map out a complete real-time continuity timeline automatically.
          </p>


          {/* Gmail via Composio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">Gmail Connection</h4>
              {composioAuthorized && (
                <button
                  type="button"
                  onClick={checkComposioStatus}
                  className="text-[10px] text-[#e0dafc] hover:underline flex items-center gap-1 font-bold cursor-pointer"
                  title="Verify connection status"
                >
                  Verify
                </button>
              )}
            </div>
            {composioAuthorized ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-green-400 bg-green-950/40 p-2.5 rounded-xl border border-green-800/60">
                <ShieldCheck className="h-4 w-4 text-green-400" />
                Connected via Composio
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {needsComposioAuth && (
                  <div className="text-xs bg-amber-950/60 border border-amber-700/60 text-amber-300 p-3 rounded-xl leading-relaxed" role="alert">
                    <span className="font-extrabold text-[10px] uppercase tracking-widest block mb-1 text-amber-400">⚡ Action Required</span>
                    Click <strong>"Connect Gmail via Composio"</strong> below to authorize Gmail access, then click <strong>"Check connection status"</strong> and retry syncing.
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleConnectComposio}
                  disabled={isLinkingComposio}
                  className={`w-full font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    needsComposioAuth
                      ? "bg-amber-400 hover:bg-amber-300 text-[#1e233a] animate-pulse"
                      : "bg-[#e0dafc] hover:brightness-110 text-[#2c3353]"
                  }`}
                  id="btn-composio-connect"
                >
                  {isLinkingComposio ? "Generating Link..." : "Connect Gmail via Composio"}
                  <ExternalLink className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => { setNeedsComposioAuth(false); checkComposioStatus(); }}
                  className="w-full bg-transparent hover:bg-[#3b426b] text-[#e0dafc] font-bold text-xs py-1.5 px-3 rounded-xl border border-[#5d6fa3]/25 transition-all cursor-pointer"
                >
                  Check connection status
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Filters Setting */}
        <div className="lc-panel shadow-lg p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#5d6fa3]/20 pb-2">
            <Sliders className="h-4 w-4 text-[#e0dafc]" />
            Synchronization Filters
          </h3>

          <div className="space-y-3">


            <div className="space-y-1">
               <label htmlFor="input-sync-keywords" className="block text-[10px] font-bold uppercase text-[#5d6fa3] tracking-wider">Target Subject Keywords</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onBlur={handleSaveSettings}
                className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                placeholder="loan, emi, bills, policy, booking"
                id="input-sync-keywords"
              />
              <p className="text-[9px] text-[#5d6fa3] opacity-80">Restrict search queries to terms. Comma-separated.</p>
            </div>

            {syncError && (
              <div className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl border border-red-900/50 text-left leading-relaxed" role="alert">
                <span className="font-extrabold text-[10px] uppercase text-red-300 block tracking-widest mb-0.5">Authorization Sync Error</span>
                {syncError}
              </div>
            )}

            {syncNotice && (
              <div className="lc-alert-success p-3 text-xs text-left leading-relaxed" role="status" aria-live="polite">
                <span className="font-bold">Connection update:</span> {syncNotice}
              </div>
            )}

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={isSyncing || !uid}
              className={`w-full font-black text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                uid && !isSyncing
                  ? "bg-[#e0dafc] hover:brightness-110 text-[#2c3353] shadow-md border border-[#5d6fa3]/10 cursor-pointer"
                  : "bg-[#1e233a] text-[#5d6fa3] border border-[#5d6fa3]/20 cursor-not-allowed"
              }`}
              id="btn-sync-trigger"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing Workspace..." : "Scan & Classify Inbox"}
            </button>
          </div>
        </div>
      </div>

      {/* Sync Timeline Results Panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="lc-panel shadow-lg p-6 text-[#e0dafc]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#5d6fa3]/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/25">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Synced Gmail Timeline</h3>
                <p className="text-xs text-[#5d6fa3]">Automatically classified bills, healthcare and booking events</p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-[#1e233a] p-1 rounded-xl self-start border border-[#5d6fa3]/20" id="gmail-category-filters">
              {["All", "Bills", "Insurance", "Healthcare", "Appointments"].map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                    activeCategory === cat
                      ? "bg-[#2c3353] text-[#e0dafc] border border-[#5d6fa3]/25 shadow-md"
                      : "text-[#5d6fa3] hover:text-[#e0dafc]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-[#5d6fa3]">
                <Mail className="h-12 w-12 mx-auto text-[#5d6fa3] opacity-60 mb-3" />
                <p className="text-sm font-semibold text-[#e0dafc]">No synchronized email records yet.</p>
                <p className="text-xs text-[#5d6fa3] mt-1 max-w-sm mx-auto leading-relaxed">Authorize your workspace connection and run "Scan & Classify Inbox" to sync critical timelines.</p>
              </div>
            ) : (
              filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  onClick={(e) => handleCardClick(e, rec)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      window.open(getGmailUrl(rec), "_blank", "noopener,noreferrer");
                    }
                  }}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open email: ${rec.subject}`}
                  className="lc-hover-lift p-4 border border-[#5d6fa3]/20 rounded-xl hover:border-indigo-400/60 hover:bg-[#1e233a]/80 bg-[#1e233a] space-y-2.5 transition-all cursor-pointer relative group"
                  title="Click to view original email in Gmail"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <a
                        href={getGmailUrl(rec)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-white text-sm hover:text-indigo-300 transition-colors flex items-center gap-1.5 inline-flex"
                      >
                        {rec.subject}
                        <ExternalLink className="h-3.5 w-3.5 text-[#5d6fa3] hover:text-indigo-300 transition-all shrink-0" />
                      </a>
                      <p className="text-[10px] text-[#5d6fa3] mt-0.5">Sender: {rec.sender} • {new Date(rec.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getCategoryColor(rec.category)}`}>
                        {rec.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteEmail(e, rec.id)}
                        className="p-1.5 text-[#5d6fa3] hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all cursor-pointer"
                        title="Delete extracted email record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#2c3353] p-3 rounded-lg border border-[#5d6fa3]/15">
                    <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#e0dafc] shrink-0" />
                      Gemini Extracted Action Item Summary:
                    </p>
                    <p className="text-xs text-[#e0dafc]/90 leading-relaxed font-medium">{rec.extractedSummary}</p>
                  </div>

                  <details className="group">
                    <summary className="text-[10px] font-bold text-[#5d6fa3] cursor-pointer hover:text-[#e0dafc] select-none list-none flex items-center gap-1">
                      <span>▶</span> View Original Email Snippet
                    </summary>
                    <div className="mt-2 p-2.5 bg-[#1e233a]/80 rounded text-[11px] font-mono text-[#5d6fa3] border border-[#5d6fa3]/15 whitespace-pre-wrap leading-relaxed">
                      {rec.rawSnippet}...
                    </div>
                  </details>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
