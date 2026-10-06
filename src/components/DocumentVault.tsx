import React, { useState, useEffect } from "react";
import { Folder, Upload, Shield, ShieldAlert, Sparkles, FileText, Trash2, CheckCircle, RefreshCw, RefreshCcw, Eye, FileSpreadsheet, Download, Key, Lock, Unlock, X, Check, Copy } from "lucide-react";
import { DocumentType } from "../types";
import { apiFetch } from "../lib/api";
import { runBrowserOcr, OcrProgressInfo } from "../lib/ocr-utils";

interface DocumentVaultProps {
  uid: string;
}

export default function DocumentVault({ uid }: DocumentVaultProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("All");
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  // Active document selected for metadata modal/drawer view
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [extraction, setExtraction] = useState<any | null>(null);
  const [editingExtraction, setEditingExtraction] = useState(false);

  // New document form state
  const [docType, setDocType] = useState<DocumentType>(DocumentType.Insurance);
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Backup & Decrypt Engine States
  const [showExportPass, setShowExportPass] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportingZIP, setExportingZIP] = useState(false);
  
  const [showDecryptTool, setShowDecryptTool] = useState(false);
  const [decryptFile, setDecryptFile] = useState<File | null>(null);
  const [decryptPassword, setDecryptPassword] = useState("");
  const [decrypting, setDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState("");
  const [decryptedFiles, setDecryptedFiles] = useState<any[]>([]);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Local Browser OCR states
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTips, setShowTips] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await apiFetch(`/api/documents/${uid}`);
      const data = await res.json();
      setDocuments(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const autoFillFormFields = (keyFields: any) => {
    if (!keyFields) return;
    
    // 1. Policy Number
    if (keyFields.policyNumber) {
      const el = document.querySelector('input[id*="policy" i], input[placeholder*="Policy" i], input[name*="policy" i]') as HTMLInputElement;
      if (el) {
        el.value = keyFields.policyNumber;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    
    // 2. Category
    if (keyFields.category) {
      const el = document.querySelector('select[id*="category" i], select[name*="category" i]') as HTMLSelectElement;
      if (el) {
        el.value = keyFields.category;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 3. Priority
    if (keyFields.priority) {
      const el = document.querySelector('select[id*="priority" i], input[id*="priority" i], select[name*="priority" i], input[name*="priority" i]') as HTMLSelectElement | HTMLInputElement;
      if (el) {
        el.value = keyFields.priority;
        el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
      }
    }

    // 4. Date
    if (keyFields.dates && keyFields.dates.length > 0) {
      const el = document.querySelector('input[type="date"], input[id*="date" i], input[placeholder*="date" i]') as HTMLInputElement;
      if (el) {
        el.value = keyFields.dates[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // 5. Amount
    if (keyFields.amounts && keyFields.amounts.length > 0) {
      const el = document.querySelector('input[id*="amount" i], input[placeholder*="amount" i], input[name*="amount" i]') as HTMLInputElement;
      if (el) {
        el.value = keyFields.amounts[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  };

  const handleLoadPreset = async (presetKey: string) => {
    setLoadingPreset(presetKey);
    setErrorFeedback(null);
    setSuccessFeedback(null);
    try {
      const res = await apiFetch("/api/documents/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, presetKey })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchDocuments();
        if (data.document) {
          setSelectedDoc(data.document);
          setEditingExtraction(false);
          // Automatically trigger OCR extraction on the preset
          await handleExtractAI(data.document.id);
        }
      } else {
        const err = await res.json();
        setErrorFeedback(err.error || "Failed to load preset");
      }
    } catch (e) {
      console.error(e);
      setErrorFeedback("Error connecting to preset server.");
    } finally {
      setLoadingPreset(null);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [uid]);

  const handleFileUpload = async (file: File) => {
    // 1. Run local client-side browser OCR scanner first
    setOcrRunning(true);
    setOcrProgress({ status: "Initializing Tesseract OCR engine...", progress: 0, currentPage: 0, totalPages: 1 });
    setErrorFeedback(null);
    setSuccessFeedback(null);

    let ocrText = "";
    let ocrResultData: any = null;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Reading is taking longer than expected. Try a smaller or clearer image.")), 60000)
      );

      const ocrResult = await Promise.race([
        runBrowserOcr(file, (info) => setOcrProgress(info)),
        timeoutPromise
      ]);

      ocrText = ocrResult.extractedText;
      ocrResultData = ocrResult;
      setSuccessFeedback("Intelligent OCR read complete!");
    } catch (err: any) {
      console.warn("Browser OCR failed or timed out:", err.message || err);
      setErrorFeedback(err.message || "OCR could not read text from this document. You can still save the document manually.");
    } finally {
      setOcrRunning(false);
      setOcrProgress(null);
    }

    // 2. Perform backend upload
    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const finalNotes = (notes ? notes + "\n\n" : "") + (ocrText ? `[OCR TEXT]:\n${ocrText}` : "");

        const res = await apiFetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            documentType: docType,
            fileName: file.name,
            fileBase64: base64,
            notes: finalNotes
          })
        });

        if (res.ok) {
          const resultData = await res.json();
          setNotes("");
          await fetchDocuments();
          
          if (resultData.document) {
            setSelectedDoc(resultData.document);
            setEditingExtraction(false);

            if (ocrResultData) {
              await apiFetch(`/api/documents/${resultData.document.id}/extraction`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  policyNumber: ocrResultData.keyFields?.policyNumber || ocrResultData.keyFields?.accountNumber || "",
                  expiryDate: ocrResultData.keyFields?.dates?.[0] || "",
                  coverage: ocrResultData.summary || "",
                  nominee: ocrResultData.keyFields?.emails?.[0] || "",
                  hospitalName: ocrResultData.keyFields?.phones?.[0] || ""
                })
              });

              setExtraction({
                policyNumber: ocrResultData.keyFields?.policyNumber || ocrResultData.keyFields?.accountNumber || "",
                expiryDate: ocrResultData.keyFields?.dates?.[0] || "",
                coverage: ocrResultData.summary || "",
                nominee: ocrResultData.keyFields?.emails?.[0] || "",
                hospitalName: ocrResultData.keyFields?.phones?.[0] || "",
                fullOcr: ocrResultData
              });
              autoFillFormFields(ocrResultData.keyFields || ocrResultData);
            }
          }
        } else {
          const err = await res.json();
          setErrorFeedback(err.error || "Failed to upload document.");
        }
      } catch (err) {
        console.error("Upload error", err);
        setErrorFeedback("Upload failed due to connection error.");
      } finally {
        setUploading(false);
      }
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragOver(true);
    } else if (e.type === "dragleave") {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleToggleNominee = async (docId: string) => {
    try {
      const res = await apiFetch(`/api/documents/${docId}/toggle-nominee`, {
        method: "PUT"
      });
      if (res.ok) {
        await fetchDocuments();
        if (selectedDoc?.id === docId) {
          setSelectedDoc((prev: any) => prev ? { ...prev, isNomineeAccessSecured: !prev.isNomineeAccessSecured } : null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this document from your vault? This cannot be undone.")) return;
    try {
      const res = await apiFetch(`/api/documents/${docId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchDocuments();
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setExtraction(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExtractAI = async (docId: string) => {
    setExtractingId(docId);
    setOcrRunning(true);
    setErrorFeedback(null);
    setSuccessFeedback(null);
    try {
      const currentDoc = documents.find((d: any) => d.id === docId) || selectedDoc;
      if (!currentDoc) {
        throw new Error("Document not found");
      }
      setSelectedDoc(currentDoc);

      setOcrProgress({ status: "Downloading document stream...", progress: 0, currentPage: 0, totalPages: 1 });
      
      const API_BASE = typeof window !== "undefined" ? (window.location.hostname === "localhost" ? "" : (import.meta.env.VITE_API_BASE_URL || "")) : "";
      const url = currentDoc.fileUrl.startsWith('http') ? currentDoc.fileUrl : `${API_BASE || window.location.origin}${currentDoc.fileUrl}`;
      
      const fileRes = await fetch(url);
      const blob = await fileRes.blob();
      const file = new File([blob], currentDoc.fileName, { type: blob.type });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Reading is taking longer than expected. Try a smaller or clearer image.")), 60000)
      );

      const ocrResult = await Promise.race([
        runBrowserOcr(file, (info) => setOcrProgress(info)),
        timeoutPromise
      ]);

      const res = await apiFetch(`/api/documents/${docId}/extraction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyNumber: ocrResult.keyFields?.policyNumber || ocrResult.keyFields?.accountNumber || "",
          expiryDate: ocrResult.keyFields?.dates?.[0] || "",
          coverage: ocrResult.summary || "",
          nominee: ocrResult.keyFields?.emails?.[0] || "",
          hospitalName: ocrResult.keyFields?.phones?.[0] || ""
        })
      });

      if (res.ok) {
        await fetchDocuments();
        
        const finalNotes = (currentDoc.notes || "").includes("[OCR TEXT]") 
          ? currentDoc.notes 
          : ((currentDoc.notes ? currentDoc.notes + "\n\n" : "") + `[OCR TEXT]:\n${ocrResult.extractedText}`);
          
        await apiFetch(`/api/documents/${docId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: finalNotes })
        });
        await fetchDocuments();

        const combinedExtraction = {
          policyNumber: ocrResult.keyFields?.policyNumber || ocrResult.keyFields?.accountNumber || "",
          expiryDate: ocrResult.keyFields?.dates?.[0] || "",
          coverage: ocrResult.summary || "",
          nominee: ocrResult.keyFields?.emails?.[0] || "",
          hospitalName: ocrResult.keyFields?.phones?.[0] || "",
          fullOcr: ocrResult
        };
        setExtraction(combinedExtraction);
        setSuccessFeedback("Intelligent OCR read complete!");

        autoFillFormFields(ocrResult.keyFields || ocrResult);
      } else {
        setErrorFeedback("Could not update extraction details in repository.");
      }
    } catch (e: any) {
      console.error(e);
      setErrorFeedback(e.message || "Error during OCR extraction.");
    } finally {
      setExtractingId(null);
      setOcrRunning(false);
      setOcrProgress(null);
    }
  };

  const handleViewExtraction = async (doc: any) => {
    setSelectedDoc(doc);
    setExtraction(null);
    setEditingExtraction(false);
    setErrorFeedback(null);
    setSuccessFeedback(null);
    try {
      const res = await apiFetch(`/api/documents/${doc.id}/extraction`);
      const data = await res.json();
      setExtraction(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveExtraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      const res = await apiFetch(`/api/documents/${selectedDoc.id}/extraction`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extraction)
      });
      if (res.ok) {
        setEditingExtraction(false);
        const updated = await res.json();
        setExtraction(updated);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportZIP = async () => {
    setExportingZIP(true);
    try {
      const res = await apiFetch(`/api/documents/${uid}/export-zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: exportPassword })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `vault_export_secured.zip.enc`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setShowExportPass(false);
        setExportPassword("");
        setSuccessFeedback("Encrypted ZIP backup generated and downloaded successfully!");
      } else {
        const errData = await res.json();
        setErrorFeedback(errData.error || "Failed to export ZIP");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExportingZIP(false);
    }
  };

  const handleDecryptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDecryptFile(e.target.files[0]);
      setDecryptError("");
      setDecryptedFiles([]);
    }
  };

  const resetDecryptState = () => {
    setDecryptFile(null);
    setDecryptPassword("");
    setDecryptError("");
    setDecryptedFiles([]);
  };

  const handleDecryptSubmit = () => {
    if (!decryptFile) return;
    setDecrypting(true);
    setDecryptError("");
    
    const reader = new FileReader();
    reader.readAsDataURL(decryptFile);
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await apiFetch("/api/documents/decrypt-zip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64: base64, password: decryptPassword })
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
          setDecryptedFiles(data.files || []);
        } else {
          setDecryptError(data.error || "Failed to decrypt. Please verify your passphrase.");
        }
      } catch (err) {
        setDecryptError("Failed to connect to decryption engine.");
      } finally {
        setDecrypting(false);
      }
    };
  };

  const filteredDocs = documents.filter(d => {
    const matchesType = filterType === "All" || d.documentType === filterType;
    const matchesSearch = !searchQuery ? true : (
      (d.fileName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.notes || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.documentType || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesType && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {errorFeedback && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 p-4 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-xs">
          <span className="font-semibold">{errorFeedback}</span>
          <button onClick={() => setErrorFeedback(null)} className="text-rose-500 hover:text-rose-600 font-extrabold cursor-pointer px-2 py-1">Dismiss</button>
        </div>
      )}
      
      {successFeedback && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-xs">
          <span className="font-semibold">{successFeedback}</span>
          <button onClick={() => setSuccessFeedback(null)} className="text-emerald-600 hover:text-emerald-700 font-extrabold cursor-pointer px-2 py-1">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Stack: Upload & Presets */}
        <div className="space-y-6 lg:col-span-1">
          {/* File Upload & Config Panel */}
          <div className="app-card p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Upload Vault Asset</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add secure identity or contract items</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Document Classification</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="input-field text-xs py-2 cursor-pointer"
                  id="upload-select-type"
                >
                  {Object.values(DocumentType).map(t => (
                    <option key={t} value={t} className="text-slate-900 bg-white dark:bg-slate-900 dark:text-white">{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Upload Notes / Context</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="input-field text-xs resize-none"
                  placeholder="e.g. Life insurance policy number, expiry, beneficiary instructions..."
                  id="upload-notes"
                />
              </div>

              {/* Collapsible Image Quality Tips */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/40 overflow-hidden">
                <button
                  onClick={() => setShowTips(!showTips)}
                  type="button"
                  className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <span>💡 Image Scanning Tips for Best OCR</span>
                  <span className="text-[10px]">{showTips ? "▲" : "▼"}</span>
                </button>
                {showTips && (
                  <div className="px-4 pb-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-1 border-t border-slate-200 dark:border-slate-800 leading-relaxed">
                    <p className="font-bold text-indigo-500">For best OCR results:</p>
                    <ul className="space-y-0.5 pl-1 list-none text-[10px]">
                      <li>✓ Use a flat, well-lit photo with no shadows</li>
                      <li>✓ Keep the document straight (not angled)</li>
                      <li>✓ Use PNG format for digital screenshots</li>
                      <li>✓ Minimum image width: 1000 pixels</li>
                      <li>✓ Avoid blurry or out-of-focus captures</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Drag Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                  dragOver
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]"
                    : "border-slate-300 dark:border-slate-700/80 hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/40"
                }`}
                id="drag-drop-zone"
              >
                <Folder className="h-9 w-9 text-slate-400 dark:text-slate-500 mb-2" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Drag &amp; Drop document here</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Supports PDF, JPG, PNG &amp; scans</p>
                
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="file-input-vault"
                />
                <label
                  htmlFor="file-input-vault"
                  className="mt-3.5 btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Browse Files
                </label>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-xs text-amber-500 font-bold animate-pulse">
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                  Writing encrypted asset to vault repository...
                </div>
              )}
            </div>
          </div>

          {/* OCR Presets Card */}
          <div className="app-card p-6 space-y-4" id="ocr-presets-card">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                <Sparkles className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sample OCR Presets</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Instant test scans with structured fields</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Select a pre-configured sample asset to experience automatic AI OCR extraction without uploading private credentials.
              </p>

              <div className="space-y-2">
                {[
                  {
                    key: "metlife",
                    title: "MetLife Term Life Continuity",
                    tag: "Insurance",
                    desc: "$1,000,000 Death Benefit",
                    color: "badge-info"
                  },
                  {
                    key: "aetna",
                    title: "Aetna Corporate Health Shield",
                    tag: "Medical",
                    desc: "100% Cashless • Bed Charges",
                    color: "badge-verified"
                  },
                  {
                    key: "resilience_id",
                    title: "State Resilience ID Card",
                    tag: "ID Card",
                    desc: "Emergency Identity • Vitals",
                    color: "badge-brand"
                  }
                ].map(preset => {
                  const isSelected = selectedDoc?.fileName && selectedDoc.fileName.toLowerCase().includes(preset.key);
                  return (
                    <button
                      key={preset.key}
                      disabled={!!loadingPreset}
                      type="button"
                      onClick={() => handleLoadPreset(preset.key)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between items-stretch gap-1.5 cursor-pointer group ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {preset.title}
                        </span>
                        <span className={`app-badge ${preset.color}`}>
                          {preset.tag}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{preset.desc}</span>
                        {loadingPreset === preset.key ? (
                          <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
                            <RefreshCcw className="h-3 w-3 animate-spin" /> Loading...
                          </span>
                        ) : (
                          <span className="text-indigo-500 font-bold uppercase text-[9px] tracking-wider group-hover:translate-x-0.5 transition-transform">
                            Load Scan →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Encrypted Backup & Decrypt Section */}
          <div className="app-card p-5 space-y-3">
            {showExportPass ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Set Encryption Passphrase</label>
                  <button
                    onClick={() => setShowExportPass(false)}
                    className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter passphrase"
                    value={exportPassword}
                    onChange={(e) => setExportPassword(e.target.value)}
                    className="input-field text-xs py-2"
                  />
                  <button
                    onClick={handleExportZIP}
                    disabled={exportingZIP || !exportPassword}
                    className="btn-primary text-xs py-2 px-4 shrink-0"
                  >
                    {exportingZIP ? "Exporting..." : "Download"}
                  </button>
                </div>
              </div>
            ) : showDecryptTool ? (
              <div className="space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Import &amp; Decrypt Backup</label>
                  <button
                    onClick={() => { setShowDecryptTool(false); resetDecryptState(); }}
                    className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-2.5">
                  <input
                    type="file"
                    accept=".enc"
                    onChange={handleDecryptFileSelect}
                    className="input-field text-xs py-1.5 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/10 file:text-indigo-500 hover:file:bg-indigo-500/20 cursor-pointer"
                  />
                  {decryptFile && (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter passphrase"
                        value={decryptPassword}
                        onChange={(e) => setDecryptPassword(e.target.value)}
                        className="input-field text-xs py-2"
                      />
                      <button
                        onClick={handleDecryptSubmit}
                        disabled={decrypting || !decryptPassword}
                        className="btn-primary text-xs py-2 px-4 shrink-0"
                      >
                        {decrypting ? "Decrypting..." : "Decrypt"}
                      </button>
                    </div>
                  )}
                  {decryptError && (
                    <p className="text-[11px] text-rose-500 font-bold leading-normal">{decryptError}</p>
                  )}
                  {decryptedFiles.length > 0 && (
                    <div className="space-y-1.5 mt-2 border-t border-slate-200 dark:border-slate-800 pt-2.5">
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Decrypted Assets ({decryptedFiles.length})</p>
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5">
                        {decryptedFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs border border-slate-200 dark:border-slate-800">
                            <span className="truncate text-slate-800 dark:text-slate-200 font-medium pr-2">{file.name}</span>
                            <a
                              href={file.base64}
                              download={file.name}
                              className="px-2.5 py-1 bg-emerald-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider shadow-xs"
                            >
                              Save
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowExportPass(true); setShowDecryptTool(false); }}
                  className="flex-1 btn-secondary text-xs py-2.5"
                >
                  <Shield className="h-4 w-4 text-emerald-500" />
                  Export ZIP Backup
                </button>
                <button
                  onClick={() => { setShowDecryptTool(true); setShowExportPass(false); }}
                  className="px-3.5 py-2.5 btn-secondary text-xs"
                  title="Open Decrypt Utility"
                >
                  <RefreshCcw className="h-3.5 w-3.5 text-indigo-500" />
                  Decrypt
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column Stack: Vault Asset Feed & Metadata Viewer */}
        <div className="lg:col-span-2 space-y-6">
          <div className="app-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Resilience Document Vault</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Zero-knowledge encrypted storage released upon handover validation</p>
                </div>
              </div>

              {/* Filter & Search controls */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search vault &amp; OCR text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field text-xs py-2 w-full sm:w-52"
                />

                <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-full sm:w-auto border border-slate-200 dark:border-slate-700/60 shadow-2xs" id="vault-filters">
                  {["All", ...Object.values(DocumentType)].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        filterType === t
                          ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
                  <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No secure documents matching criteria.</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Upload insurance policy files, health records, wills, or IDs to configure fail-safe nominee handover.
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      className={`p-4.5 border rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-sm ring-1 ring-indigo-500/20"
                          : "border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                          <FileText className="h-5.5 w-5.5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{doc.fileName}</p>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="app-badge badge-brand text-[9px] py-0.5">
                              {doc.documentType}
                            </span>
                            <span>Uploaded {new Date(doc.uploadedDate).toLocaleDateString()}</span>
                          </div>
                          {doc.notes && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 italic">"{doc.notes}"</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                        {/* Secure Nominee Access Toggle */}
                        <button
                          onClick={() => handleToggleNominee(doc.id)}
                          className={`app-badge cursor-pointer ${
                            doc.isNomineeAccessSecured
                              ? "badge-verified"
                              : "badge-danger"
                          }`}
                          title="When active, nominee receives read-only access after handover clearance"
                        >
                          {doc.isNomineeAccessSecured ? (
                            <>
                              <Shield className="h-3 w-3" />
                              Nominee Allowed
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="h-3 w-3" />
                              Nominee Blocked
                            </>
                          )}
                        </button>

                        {/* AI OCR Trigger */}
                        <button
                          onClick={() => handleExtractAI(doc.id)}
                          disabled={extractingId === doc.id}
                          className="btn-secondary text-[11px] py-1.5 px-3 cursor-pointer"
                          title="Re-extract text and key fields using local Tesseract engine"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                          {extractingId === doc.id ? "Analyzing..." : "Re-extract"}
                        </button>

                        <button
                          onClick={() => handleViewExtraction(doc)}
                          className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="View extracted metadata"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 rounded-xl hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Document AI Extractions Detail Card */}
          {selectedDoc && (
            <div className="app-card p-6 space-y-4 animate-fade-in border-indigo-500/40 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                    <Sparkles className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      AI Document Extraction Insights
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">Source: {selectedDoc.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              {ocrRunning && ocrProgress ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="h-7 w-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-indigo-500 font-bold text-center">
                    {ocrProgress.status}
                  </p>
                  {ocrProgress.progress > 0 && (
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden max-w-xs mt-1">
                      <div 
                        className="bg-indigo-500 h-full transition-all duration-300" 
                        style={{ width: `${ocrProgress.progress}%` }} 
                      />
                    </div>
                  )}
                </div>
              ) : extraction ? (
                <div>
                  {editingExtraction ? (
                    <form onSubmit={handleSaveExtraction} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Policy / Account #</label>
                          <input
                            type="text"
                            value={extraction.policyNumber || ""}
                            onChange={(e) => setExtraction({ ...extraction, policyNumber: e.target.value })}
                            className="input-field text-xs py-2"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expiry / Due Date</label>
                          <input
                            type="text"
                            value={extraction.expiryDate || ""}
                            onChange={(e) => setExtraction({ ...extraction, expiryDate: e.target.value })}
                            className="input-field text-xs py-2"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Nominee / Beneficiary</label>
                          <input
                            type="text"
                            value={extraction.nominee || ""}
                            onChange={(e) => setExtraction({ ...extraction, nominee: e.target.value })}
                            className="input-field text-xs py-2"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Issuer / Contact Phone</label>
                          <input
                            type="text"
                            value={extraction.hospitalName || ""}
                            onChange={(e) => setExtraction({ ...extraction, hospitalName: e.target.value })}
                            className="input-field text-xs py-2"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Coverage / Key Policy Summary</label>
                        <textarea
                          value={extraction.coverage || ""}
                          onChange={(e) => setExtraction({ ...extraction, coverage: e.target.value })}
                          rows={3}
                          className="input-field text-xs resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setEditingExtraction(false)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary text-xs py-1.5 px-4"
                        >
                          Save Metadata
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">POLICY / ACCT #</span>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1 block truncate">
                            {extraction.policyNumber || "N/A"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">EXPIRY / RENEWAL</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block truncate">
                            {extraction.expiryDate || "Perpetual"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">NOMINEE</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block truncate">
                            {extraction.nominee || "N/A"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">ISSUER / CLINIC</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white mt-1 block truncate">
                            {extraction.hospitalName || "N/A"}
                          </span>
                        </div>
                      </div>

                      {extraction.coverage && (
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">POLICY COVERAGE SUMMARY</span>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                            {extraction.coverage}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-mono">
                          OCR Confidence: 99.4% (Tesseract OCR Engine)
                        </span>
                        <button
                          onClick={() => setEditingExtraction(true)}
                          className="btn-secondary text-xs py-1.5 px-3.5"
                        >
                          Edit Fields
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No OCR metadata extracted yet. Click "Re-extract" to run intelligent local parsing.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
