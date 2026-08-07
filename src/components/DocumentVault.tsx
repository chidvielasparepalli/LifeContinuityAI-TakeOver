import React, { useState, useEffect } from "react";
import { Folder, Upload, Shield, ShieldAlert, Sparkles, FileText, Trash2, CheckCircle, RefreshCw, RefreshCcw, Eye, FileSpreadsheet } from "lucide-react";
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
          // Automatically trigger OCR extraction on the preset!
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
    // 1. Run local client-side browser OCR scanner first!
    setOcrRunning(true);
    setOcrProgress({ status: "Initializing Tesseract engine...", progress: 0, currentPage: 0, totalPages: 1 });
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
        // Enforce notes containing the extracted OCR text
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
              // Save short extraction fields for general display in details view
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

              // Update selected document state with the rich extraction
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
          setSelectedDoc(prev => prev ? { ...prev, isNomineeAccessSecured: !prev.isNomineeAccessSecured } : null);
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

      // Save short extraction fields for general display in details view
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
        
        // Enforce update the document notes to include the new text if it has changed
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

        // Auto fill form fields if keywords found
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
        setSuccessFeedback("ZIP backup generated and downloaded successfully!");
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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 text-[#e0dafc]">
      
      {errorFeedback && (
        <div className="lg:col-span-3 bg-red-950/50 border border-red-500/30 text-red-300 p-4 rounded-xl flex items-center justify-between text-xs animate-fade-in shadow-md">
          <span className="font-semibold">{errorFeedback}</span>
          <button onClick={() => setErrorFeedback(null)} className="text-red-400 hover:text-red-300 font-black cursor-pointer px-2 py-1">Dismiss</button>
        </div>
      )}
      
      {successFeedback && (
        <div className="lg:col-span-3 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center justify-between text-xs animate-fade-in shadow-md">
          <span className="font-semibold">{successFeedback}</span>
          <button onClick={() => setSuccessFeedback(null)} className="text-emerald-400 hover:text-emerald-300 font-black cursor-pointer px-2 py-1">Dismiss</button>
        </div>
      )}

      {/* Left Column Stack */}
      <div className="space-y-6 lg:col-span-1">
        {/* File Upload & Config Panel */}
        <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-[#5d6fa3]/20 pb-3">
          <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/25">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Upload Vault Asset</h3>
            <p className="text-xs text-[#5d6fa3]">Add secure identity or contract items</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Document Classification</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
              id="upload-select-type"
            >
              {Object.values(DocumentType).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold uppercase text-[#5d6fa3] tracking-wider">Upload Notes / Context</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl focus:outline-none focus:border-[#e0dafc] text-xs resize-none text-[#e0dafc]"
              placeholder="e.g. Life insurance plan coverage, password or instructions..."
              id="upload-notes"
            />
          </div>

          {/* Collapsible Image Quality Tips */}
          <div className="border border-[#5d6fa3]/30 rounded-xl bg-[#1e233a]/40 overflow-hidden">
            <button
              onClick={() => setShowTips(!showTips)}
              type="button"
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-[#e0dafc] hover:bg-[#1e233a]/60 transition-all"
            >
              <span>💡 Image Scanning Tips for Best OCR</span>
              <span>{showTips ? "▲" : "▼"}</span>
            </button>
            {showTips && (
              <div className="px-4 pb-3 pt-1.5 text-[10px] text-[#5d6fa3] space-y-1.5 border-t border-[#5d6fa3]/10 bg-[#1e233a]/25 leading-relaxed">
                <p className="font-semibold text-indigo-300">For best OCR results:</p>
                <ul className="space-y-1 pl-1 list-none">
                  <li>✓ Use a flat, well-lit photo with no shadows</li>
                  <li>✓ Keep the document straight (not angled)</li>
                  <li>✓ Use PNG format for screenshots</li>
                  <li>✓ Minimum image width: 1000 pixels</li>
                  <li>✓ Avoid blurry or out-of-focus images</li>
                </ul>
              </div>
            )}
          </div>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
              dragOver
                ? "border-[#e0dafc] bg-[#1e233a]/95 scale-[0.99]"
                : "border-[#5d6fa3]/40 hover:border-[#e0dafc]/60 bg-[#1e233a]"
            }`}
            id="drag-drop-zone"
          >
            <Folder className="h-10 w-10 text-[#5d6fa3] mb-3" />
            <p className="text-xs font-bold text-white">Drag & Drop document here</p>
            <p className="text-[10px] text-[#5d6fa3] mt-1">or click to browse from system explorer</p>
            
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
              className="mt-4 px-4 py-2.5 bg-[#2c3353] hover:bg-[#5d6fa3]/20 text-xs font-bold text-[#e0dafc] border border-[#5d6fa3]/30 rounded-xl cursor-pointer transition-colors"
            >
              Select File
            </label>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-amber-400 animate-pulse">
              <RefreshCcw className="h-4 w-4 animate-spin" />
              Writing file to secure sandbox directory...
            </div>
          )}
        </div>
      </div>

      {/* OCR Presets Card */}
      <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6 space-y-4" id="ocr-presets-card">
        <div className="flex items-center gap-3 border-b border-[#5d6fa3]/20 pb-3">
          <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/25">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">OCR Presets</h3>
            <p className="text-xs text-[#5d6fa3]">Instant high-fidelity OCR scanning</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] text-indigo-200/70 leading-normal">
            Select a pre-configured document preset to experience automatic AI data extraction instantly. Perfect for sandbox testing without uploading real sensitive credentials.
          </p>

          <div className="space-y-2">
            {[
              {
                key: "metlife",
                title: "MetLife Term Life Continuity",
                tag: "Insurance",
                desc: "$1,000,000 Death Benefit",
                color: "text-blue-400 bg-blue-950/40 border-blue-900/50"
              },
              {
                key: "aetna",
                title: "Aetna Corporate Health Shield",
                tag: "Medical Report",
                desc: "100% Cashless • Bed Charges",
                color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/50"
              },
              {
                key: "resilience_id",
                title: "State Resilience ID Card",
                tag: "Other",
                desc: "Emergency Identity • Vitals",
                color: "text-purple-400 bg-purple-950/40 border-purple-900/50"
              }
            ].map(preset => {
              const isSelected = selectedDoc?.fileName && selectedDoc.fileName.toLowerCase().includes(preset.key);
              return (
                <button
                  key={preset.key}
                  disabled={!!loadingPreset}
                  type="button"
                  onClick={() => handleLoadPreset(preset.key)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col justify-between items-stretch gap-1 cursor-pointer group ${
                    isSelected
                      ? "bg-[#1e233a] border-indigo-400/80 shadow-md"
                      : "bg-[#1e233a]/60 hover:bg-[#1e233a] border-[#5d6fa3]/20 hover:border-[#5d6fa3]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-indigo-200 transition-colors">
                      {preset.title}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${preset.color}`}>
                      {preset.tag}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#5d6fa3]">
                    <span>{preset.desc}</span>
                    {loadingPreset === preset.key ? (
                      <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1">
                        <RefreshCcw className="h-3 w-3 animate-spin" /> Load...
                      </span>
                    ) : (
                      <span className="text-indigo-400/80 group-hover:text-indigo-300 font-bold uppercase text-[9px] tracking-wider">
                        Load Preset →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Encrypted Backup Engine Card replaced with a Simple Button Flow */}
      <div className="space-y-3">
        {showExportPass ? (
          <div className="p-4 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-2xl space-y-2.5 animate-fade-in shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#e0dafc] uppercase tracking-wider">Set Encryption Passphrase</label>
              <button
                onClick={() => setShowExportPass(false)}
                className="text-[10px] text-[#5d6fa3] hover:text-[#e0dafc] font-semibold transition-colors"
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
                className="flex-1 bg-[#2c3353] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#e0dafc]"
              />
              <button
                onClick={handleExportZIP}
                disabled={exportingZIP || !exportPassword}
                className="px-4 py-2.5 bg-[#e0dafc] text-[#2c3353] font-black text-xs rounded-xl hover:brightness-110 disabled:opacity-50 shrink-0 transition-all cursor-pointer"
              >
                {exportingZIP ? "Exporting..." : "Download"}
              </button>
            </div>
          </div>
        ) : showDecryptTool ? (
          <div className="p-4 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-2xl space-y-3 animate-fade-in shadow-md">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-[#e0dafc] uppercase tracking-wider">Import & Decrypt Backup</label>
              <button
                onClick={() => { setShowDecryptTool(false); resetDecryptState(); }}
                className="text-[10px] text-[#5d6fa3] hover:text-[#e0dafc] font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
            <div className="space-y-2.5">
              <input
                type="file"
                accept=".enc"
                onChange={handleDecryptFileSelect}
                className="w-full text-[10px] text-[#5d6fa3] bg-[#2c3353] border border-[#5d6fa3]/30 rounded-xl p-2 focus:outline-none"
              />
              {decryptFile && (
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter passphrase"
                    value={decryptPassword}
                    onChange={(e) => setDecryptPassword(e.target.value)}
                    className="flex-1 bg-[#2c3353] border border-[#5d6fa3]/30 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-[#e0dafc]"
                  />
                  <button
                    onClick={handleDecryptSubmit}
                    disabled={decrypting || !decryptPassword}
                    className="px-4 py-2.5 bg-[#e0dafc] text-[#2c3353] font-black text-xs rounded-xl hover:brightness-110 disabled:opacity-50 shrink-0 transition-all cursor-pointer"
                  >
                    {decrypting ? "Decrypting..." : "Decrypt"}
                  </button>
                </div>
              )}
              {decryptError && (
                <p className="text-[10px] text-red-400 font-bold leading-normal">{decryptError}</p>
              )}
              {decryptedFiles.length > 0 && (
                <div className="space-y-1.5 mt-1 border-t border-[#5d6fa3]/10 pt-2">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Decrypted Assets ({decryptedFiles.length})</p>
                  <div className="max-h-[120px] overflow-y-auto space-y-1">
                    {decryptedFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-[#2c3353] rounded-lg text-[10px] border border-[#5d6fa3]/15">
                        <span className="truncate text-white font-medium pr-2">{file.name}</span>
                        <a
                          href={file.base64}
                          download={file.name}
                          className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-[#1e233a] font-bold rounded text-[8px] uppercase tracking-wider transition-colors"
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
              className="flex-1 py-3 bg-[#1e233a] hover:bg-[#1e233a]/80 text-[#e0dafc] border border-[#5d6fa3]/30 hover:border-indigo-400/50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
            >
              <Shield className="h-4 w-4 text-emerald-400" />
              Export Encrypted Vault ZIP
            </button>
            <button
              onClick={() => { setShowDecryptTool(true); setShowExportPass(false); }}
              className="px-3 py-3 bg-transparent hover:bg-[#1e233a]/40 text-[#5d6fa3] hover:text-[#e0dafc] border border-dashed border-[#5d6fa3]/20 hover:border-[#5d6fa3]/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              title="Open Decrypt Utility"
            >
              <RefreshCcw className="h-3.5 w-3.5 text-purple-400" />
              Decrypt
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Vault List Panel */}
    <div className="lg:col-span-2 space-y-6">
        <div className="bg-[#2c3353] rounded-2xl border border-[#5d6fa3]/30 shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-[#5d6fa3]/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[#1e233a] rounded-lg flex items-center justify-center text-[#e0dafc] border border-[#5d6fa3]/25">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Resilience Document Vault</h3>
                <p className="text-xs text-[#5d6fa3]">Protected materials release on emergency validation</p>
              </div>
            </div>

            {/* Filter & Search controls */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search documents & OCR text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#1e233a] border border-[#5d6fa3]/30 rounded-xl px-3 py-1.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc] w-full sm:w-48 placeholder-[#5d6fa3]"
              />

              <div className="flex flex-wrap gap-1 bg-[#1e233a] p-1 rounded-xl w-full sm:w-auto border border-[#5d6fa3]/20" id="vault-filters">
                {["All", ...Object.values(DocumentType)].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      filterType === t
                        ? "bg-[#2c3353] text-[#e0dafc] border border-[#5d6fa3]/20 shadow-md"
                        : "text-[#5d6fa3] hover:text-[#e0dafc]"
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
              <div className="text-center py-12 text-[#5d6fa3]">
                <FileText className="h-12 w-12 mx-auto text-[#5d6fa3] opacity-55 mb-3" />
                <p className="text-sm font-semibold text-[#e0dafc]">No secure documents matching criteria.</p>
                <p className="text-xs text-[#5d6fa3] mt-1 max-w-sm mx-auto leading-relaxed">Upload insurance policy folders, healthcare records, or photo IDs to configure nominee handover.</p>
              </div>
            ) : (
              filteredDocs.map((doc) => {
                return (
                  <div
                    key={doc.id}
                    className={`p-4 border rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      selectedDoc?.id === doc.id
                        ? "border-[#e0dafc] bg-[#1e233a]"
                        : "border-[#5d6fa3]/20 bg-[#1e233a] hover:border-[#5d6fa3]/40"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-[#2c3353] rounded-lg shrink-0 border border-[#5d6fa3]/20">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{doc.fileName}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-[#5d6fa3]">
                          <span className="font-bold uppercase px-1.5 py-0.5 bg-[#2c3353] border border-[#5d6fa3]/25 rounded text-[#e0dafc]">
                            {doc.documentType}
                          </span>
                          <span>Uploaded: {new Date(doc.uploadedDate).toLocaleDateString()}</span>
                        </div>
                        {doc.notes && <p className="text-xs text-[#5d6fa3] mt-1.5 line-clamp-1 italic">"{doc.notes}"</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {/* Secure toggle */}
                      <button
                        onClick={() => handleToggleNominee(doc.id)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1.5 rounded-lg border transition-all ${
                          doc.isNomineeAccessSecured
                            ? "bg-green-950/40 border-green-900/50 text-green-400"
                            : "bg-red-950/40 border-red-900/50 text-red-400"
                        }`}
                        title="When active, Nominee can view this document after emergency validation"
                      >
                        {doc.isNomineeAccessSecured ? (
                          <>
                            <Shield className="h-3.5 w-3.5" />
                            Nominee Allowed
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Nominee Blocked
                          </>
                        )}
                      </button>

                      {/* AI Extract / Re-extract */}
                      <button
                        onClick={() => handleExtractAI(doc.id)}
                        disabled={extractingId === doc.id}
                        className="bg-[#e0dafc] hover:brightness-110 text-[#2c3353] font-bold text-[10px] px-2 py-1.5 rounded-lg flex items-center gap-1 border border-[#5d6fa3]/10 cursor-pointer"
                        title="Re-extract text and key fields using local Tesseract OCR"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#2c3353]" />
                        {extractingId === doc.id ? "Analyzing..." : "Re-extract"}
                      </button>

                      <button
                        onClick={() => handleViewExtraction(doc)}
                        className="p-1.5 hover:bg-[#2c3353] rounded-lg text-[#e0dafc] transition-colors border border-transparent hover:border-[#5d6fa3]/20"
                        title="View extracted metadata"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 hover:bg-red-950/40 rounded-lg text-red-400 transition-colors border border-transparent hover:border-red-900/30"
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
          <div className="bg-[#2c3353] rounded-2xl border border-[#e0dafc]/30 shadow-xl p-6 space-y-4 animate-fade-in text-[#e0dafc]">
            <div className="flex items-center justify-between border-b border-[#5d6fa3]/20 pb-2">
              <div>
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#e0dafc]" />
                  AI Policy Extraction Information
                </h4>
                <p className="text-[10px] text-[#5d6fa3] mt-0.5">Source document: {selectedDoc.fileName}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-xs font-bold text-[#5d6fa3] hover:text-[#e0dafc] transition-colors"
              >
                Close
            </button>
          </div>

          {ocrRunning && ocrProgress ? (
              <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-[#1e233a] border border-[#5d6fa3]/20 rounded-xl">
                <div className="h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-indigo-300 font-bold text-center">
                  {ocrProgress.status}
                </p>
                {ocrProgress.progress > 0 && (
                  <div className="w-full bg-[#2c3353] h-1.5 rounded-full overflow-hidden max-w-xs border border-[#5d6fa3]/25 mt-1">
                    <div 
                      className="bg-indigo-400 h-full transition-all duration-300" 
                      style={{ width: `${ocrProgress.progress}%` }} 
                    />
                  </div>
                )}
              </div>
            ) : extraction ? (
              <div>
                {editingExtraction ? (
                  <form onSubmit={handleSaveExtraction} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#5d6fa3] uppercase tracking-wider">Policy Number</label>
                        <input
                          type="text"
                          value={extraction.policyNumber || ""}
                          onChange={(e) => setExtraction({ ...extraction, policyNumber: e.target.value })}
                          className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#5d6fa3] uppercase tracking-wider">Expiry Date</label>
                        <input
                          type="date"
                          value={extraction.expiryDate || ""}
                          onChange={(e) => setExtraction({ ...extraction, expiryDate: e.target.value })}
                          className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#5d6fa3] uppercase tracking-wider">Coverage Limits & Details</label>
                      <textarea
                        value={extraction.coverage || ""}
                        onChange={(e) => setExtraction({ ...extraction, coverage: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg focus:outline-none focus:border-[#e0dafc] text-xs resize-none text-[#e0dafc]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#5d6fa3] uppercase tracking-wider">Nominee on Record</label>
                        <input
                          type="text"
                          value={extraction.nominee || ""}
                          onChange={(e) => setExtraction({ ...extraction, nominee: e.target.value })}
                          className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#5d6fa3] uppercase tracking-wider">Hospital Partner</label>
                        <input
                          type="text"
                          value={extraction.hospitalName || ""}
                          onChange={(e) => setExtraction({ ...extraction, hospitalName: e.target.value })}
                          className="w-full bg-[#1e233a] border border-[#5d6fa3]/30 rounded-lg p-2.5 text-xs text-[#e0dafc] focus:outline-none focus:border-[#e0dafc]"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-[#5d6fa3]/20">
                      <button
                        type="button"
                        onClick={() => setEditingExtraction(false)}
                        className="px-3.5 py-1.5 bg-[#1e233a] border border-[#5d6fa3]/25 text-[#e0dafc] text-xs rounded-lg font-semibold transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-[#e0dafc] text-[#2c3353] text-xs rounded-lg font-black flex items-center gap-1 hover:brightness-110 transition-all"
                      >
                        <CheckCircle className="h-3 w-3 text-[#2c3353]" />
                        Save OCR Data
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {/* Rich Extracted Info Panel */}
                    {extraction.fullOcr && (
                      <div className="space-y-4 bg-[#1e233a]/50 p-4 rounded-xl border border-[#5d6fa3]/25">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
                            extraction.fullOcr.documentType === 'Insurance Policy' ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400' :
                            extraction.fullOcr.documentType === 'Legal Will' ? 'bg-purple-950/40 border-purple-900/50 text-purple-400' :
                            extraction.fullOcr.documentType === 'Bank Statement' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400' :
                            extraction.fullOcr.documentType === 'Medical Record' ? 'bg-orange-950/40 border-orange-900/50 text-orange-400' :
                            extraction.fullOcr.documentType === 'Property Document' ? 'bg-teal-950/40 border-teal-900/50 text-teal-400' :
                            'bg-gray-950/40 border-gray-900/50 text-gray-400'
                          }`}>
                            {extraction.fullOcr.documentType}
                          </span>

                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded-lg border bg-[#1e233a] border-[#5d6fa3]/30 text-[#e0dafc]">
                            {extraction.fullOcr.category}
                          </span>

                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
                            extraction.fullOcr.priority === 'High' ? 'bg-red-950/40 border-red-900/50 text-red-400' :
                            extraction.fullOcr.priority === 'Medium' ? 'bg-amber-950/40 border-amber-900/50 text-amber-400' :
                            'bg-green-950/40 border-green-900/50 text-green-400'
                          }`}>
                            {extraction.fullOcr.priority} Priority
                          </span>

                          <div className="flex flex-wrap items-center gap-2 ml-auto">
                            <span className="text-[10px] font-bold text-indigo-300">
                              OCR Confidence: {Math.round(extraction.fullOcr.confidence)}%
                            </span>
                            {extraction.fullOcr.qualityLabel && (
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${
                                extraction.fullOcr.qualityColor === 'green' ? 'bg-green-950/40 border-green-900/50 text-green-400' :
                                extraction.fullOcr.qualityColor === 'yellow' ? 'bg-amber-950/40 border-amber-900/50 text-amber-400' :
                                'bg-red-950/40 border-red-900/50 text-red-400'
                              }`}>
                                {extraction.fullOcr.qualityLabel}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="space-y-1">
                          <h5 className="text-[10px] font-extrabold uppercase text-[#5d6fa3] tracking-wider">Document Summary</h5>
                          <p className="text-xs text-[#e0dafc] leading-relaxed bg-[#1e233a] p-3 rounded-xl border border-[#5d6fa3]/10">
                            {extraction.fullOcr.summary}
                          </p>
                        </div>

                        {/* Key Fields Grid */}
                        <div className="space-y-1.5">
                          <h5 className="text-[10px] font-extrabold uppercase text-[#5d6fa3] tracking-wider">Extracted Identifiers</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1e233a] p-3.5 rounded-xl border border-[#5d6fa3]/15">
                            {extraction.fullOcr.keyFields?.policyNumber && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Policy No</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.policyNumber}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.accountNumber && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Account No</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.accountNumber}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.panNumber && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">PAN Number</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.panNumber}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.aadhaarNumber && (
                              <div>
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Aadhaar Number</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.aadhaarNumber}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.dates && extraction.fullOcr.keyFields.dates.length > 0 && (
                              <div className="sm:col-span-2">
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Dates Detected</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.dates.join(', ')}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.amounts && extraction.fullOcr.keyFields.amounts.length > 0 && (
                              <div className="sm:col-span-2">
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Amounts Detected</p>
                                <p className="font-bold text-white mt-0.5 text-emerald-400">{extraction.fullOcr.keyFields.amounts.join(', ')}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.emails && extraction.fullOcr.keyFields.emails.length > 0 && (
                              <div className="sm:col-span-2">
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Emails Detected</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.emails.join(', ')}</p>
                              </div>
                            )}
                            {extraction.fullOcr.keyFields?.phones && extraction.fullOcr.keyFields.phones.length > 0 && (
                              <div className="sm:col-span-2">
                                <p className="text-[9px] uppercase font-bold text-[#5d6fa3]">Phones Detected</p>
                                <p className="font-bold text-white mt-0.5">{extraction.fullOcr.keyFields.phones.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tags */}
                        {extraction.fullOcr.tags && extraction.fullOcr.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {extraction.fullOcr.tags.map((t: string) => (
                              <span key={t} className="text-[9px] font-semibold bg-[#2c3353]/60 px-2 py-0.5 border border-[#5d6fa3]/15 rounded text-[#e0dafc]">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Collapsible Full Text */}
                        <div className="border-t border-[#5d6fa3]/15 pt-3">
                          <details className="group">
                            <summary className="text-[10px] font-extrabold uppercase text-[#5d6fa3] tracking-wider cursor-pointer list-none flex items-center justify-between hover:text-[#e0dafc] select-none">
                              <span>View Full Extracted Text</span>
                              <span className="transition-transform group-open:rotate-180">▼</span>
                            </summary>
                            <div className="mt-2 bg-[#1e233a] p-3 rounded-xl border border-[#5d6fa3]/15 text-[11px] leading-relaxed text-[#c3b8f5] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto relative">
                              <button
                                type="button"
                                onClick={() => {
                                  if (extraction.fullOcr?.extractedText) {
                                    navigator.clipboard.writeText(extraction.fullOcr.extractedText);
                                    alert("Copied full text to clipboard!");
                                  }
                                }}
                                className="absolute top-2 right-2 px-2 py-1 bg-[#2c3353] hover:bg-[#e0dafc]/15 text-[9px] font-bold text-[#e0dafc] rounded border border-[#5d6fa3]/30 transition-colors"
                              >
                                Copy Text
                              </button>
                              {extraction.fullOcr.extractedText}
                            </div>
                          </details>
                        </div>
                      </div>
                    )}

                    {/* Standard Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1e233a] p-4 rounded-xl border border-[#5d6fa3]/20 text-xs text-[#e0dafc]">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Policy Number</p>
                        <p className="font-bold text-white mt-0.5">{extraction.policyNumber || "Not found (Tap edit)"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Expiry Date</p>
                        <p className="font-bold text-white mt-0.5">{extraction.expiryDate || "Not found"}</p>
                      </div>
                      <div className="sm:col-span-2 border-t border-b border-[#5d6fa3]/10 py-2.5">
                        <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Coverage Description</p>
                        <p className="text-[#e0dafc] leading-relaxed font-semibold mt-0.5">{extraction.coverage || "No specific coverage extracted."}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Nominee Beneficial</p>
                        <p className="font-bold text-white mt-0.5">{extraction.nominee || "Not found"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#5d6fa3] tracking-wider">Healthcare Partner</p>
                        <p className="font-bold text-white mt-0.5">{extraction.hospitalName || "Not found"}</p>
                      </div>

                      <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-[#5d6fa3]/15 mt-2">
                        <button
                          type="button"
                          onClick={() => setEditingExtraction(true)}
                          className="bg-[#2c3353] border border-[#5d6fa3]/35 hover:bg-[#1e233a] text-xs font-semibold py-1.5 px-3 rounded-lg text-[#e0dafc] transition-all cursor-pointer"
                        >
                          Edit Fields
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 bg-[#1e233a] border border-[#5d6fa3]/20 rounded-xl text-xs text-[#5d6fa3]">
                <Sparkles className="h-6 w-6 text-[#e0dafc] mx-auto mb-2 animate-bounce" />
                <p>No AI OCR extraction detected for this document yet.</p>
                <button
                  onClick={() => handleExtractAI(selectedDoc.id)}
                  className="mt-3 bg-[#e0dafc] text-[#2c3353] font-black px-4 py-1.5 rounded-lg text-[10px] hover:brightness-110 transition-all inline-block"
                >
                  Run Gemini Intelligent OCR
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
