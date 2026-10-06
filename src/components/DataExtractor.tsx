import React, { useState, useEffect } from "react";
import { Mail, RefreshCw, Sliders, Sparkles, FolderSync, ExternalLink, ShieldCheck, Trash2, Filter } from "lucide-react";
import { apiFetch } from "../lib/api";

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
  const [needsComposioAuth, setNeedsComposioAuth] = useState(false);

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
        alert("A window has been opened to connect your Gmail via Composio. Once authorized, click 'Check connection status' or 'Verify' to update status.");
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

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "Bills": return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "Insurance": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "Travel": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "Healthcare": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "Appointments": return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      default: return "bg-white/5 text-[var(--text-muted)] border-[var(--border-card)]";
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
        alert(data.error || "Failed to delete email record.");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete email record.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* OAuth & Sync Configuration */}
      <div className="space-y-6">
        
        {/* Workspace Auth Box */}
        <div className="app-card p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-[var(--border-card)] pb-3">
            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <FolderSync className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Workspace Connector</h3>
              <p className="text-xs text-[var(--text-muted)]">Authorized Google API syncing</p>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            By connecting Google Workspace, Lighthouse securely scans your inbox for critical updates (renewals, bills, appointments, healthcare summaries) to map out a complete real-time continuity timeline automatically.
          </p>

          {/* Gmail via Composio */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-card)]">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Gmail Connection</h4>
              {composioAuthorized && (
                <button
                  onClick={checkComposioStatus}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer transition-colors"
                  title="Verify connection status"
                >
                  Verify
                </button>
              )}
            </div>
            {composioAuthorized ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Connected via Composio</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {needsComposioAuth && (
                  <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 p-3.5 rounded-xl leading-relaxed">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider block mb-1 text-amber-400">⚡ Action Required</span>
                    Click <strong>"Connect Gmail via Composio"</strong> below to authorize Gmail access, then click <strong>"Check connection status"</strong> and retry syncing.
                  </div>
                )}
                <button
                  onClick={handleConnectComposio}
                  disabled={isLinkingComposio}
                  className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                    needsComposioAuth
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
                      : "btn-primary"
                  }`}
                  id="btn-composio-connect"
                >
                  <span>{isLinkingComposio ? "Generating Link..." : "Connect Gmail via Composio"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => { setNeedsComposioAuth(false); checkComposioStatus(); }}
                  className="btn-secondary w-full justify-center py-2 text-xs"
                >
                  Check connection status
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Filters Setting */}
        <div className="app-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--border-card)] pb-3">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <span>Synchronization Filters</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Target Subject Keywords</label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onBlur={handleSaveSettings}
                className="input-field w-full text-xs"
                placeholder="loan, emi, bills, policy, booking"
                id="input-sync-keywords"
              />
              <p className="text-[10px] text-[var(--text-muted)]">Restrict search queries to terms. Comma-separated.</p>
            </div>

            {syncError && (
              <div className="text-xs text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30 text-left leading-relaxed">
                <span className="font-extrabold text-[10px] uppercase text-rose-400 block tracking-wider mb-0.5">Authorization Sync Error</span>
                {syncError}
              </div>
            )}

            <button
              onClick={handleSyncNow}
              disabled={isSyncing || !uid}
              className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                uid && !isSyncing
                  ? "btn-primary cursor-pointer"
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-card)] cursor-not-allowed opacity-60"
              }`}
              id="btn-sync-trigger"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing Workspace..." : "Scan & Classify Inbox"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync Timeline Results Panel */}
      <div className="lg:col-span-2 space-y-6">
        <div className="app-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[var(--border-card)] pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Synced Gmail Timeline</h3>
                <p className="text-xs text-[var(--text-muted)]">Automatically classified bills, healthcare and booking events</p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 bg-[var(--bg-app)] p-1 rounded-xl self-start border border-[var(--border-card)]" id="gmail-category-filters">
              {["All", "Bills", "Insurance", "Healthcare", "Appointments"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-2xl border border-[var(--border-card)]">
                <Mail className="h-12 w-12 mx-auto text-[var(--text-muted)] opacity-50 mb-3" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">No synchronized email records yet.</p>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto leading-relaxed">
                  Authorize your workspace connection and run "Scan & Classify Inbox" to sync critical timelines.
                </p>
              </div>
            ) : (
              filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  onClick={(e) => handleCardClick(e, rec)}
                  className="p-4 rounded-2xl border border-[var(--border-card)] hover:border-indigo-500/40 bg-[var(--bg-app)] space-y-3 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  title="Click to view original email in Gmail"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <a
                        href={getGmailUrl(rec)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sm text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors flex items-center gap-1.5 inline-flex"
                      >
                        <span className="truncate">{rec.subject}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-indigo-400 transition-all shrink-0" />
                      </a>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Sender: <span className="text-[var(--text-primary)] font-medium">{rec.sender}</span> • {new Date(rec.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(rec.category)}`}>
                        {rec.category}
                      </span>
                      <button
                        onClick={(e) => handleDeleteEmail(e, rec.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete extracted email record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-[var(--bg-card)] p-3.5 rounded-xl border border-[var(--border-card)]">
                    <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span>Gemini Extracted Action Item:</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">{rec.extractedSummary}</p>
                  </div>

                  <details className="group/details">
                    <summary className="text-[11px] font-semibold text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] select-none list-none flex items-center gap-1">
                      <span className="transition-transform group-open/details:rotate-90">▶</span>
                      <span>View Original Email Snippet</span>
                    </summary>
                    <div className="mt-2 p-3 bg-[var(--bg-card)] rounded-xl text-[11px] font-mono text-[var(--text-muted)] border border-[var(--border-card)] whitespace-pre-wrap leading-relaxed">
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
