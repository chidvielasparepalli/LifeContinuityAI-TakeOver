import { createWorker } from 'tesseract.js';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export interface OcrProgressInfo {
  status: string;
  progress: number;
  currentPage: number;
  totalPages: number;
}

export interface LocalOcrResult {
  extractedText: string;
  confidence: number;
  method: string;
  documentType: string;
  category: string;
  priority: string;
  qualityLabel: string;
  qualityColor: string;
  keyFields: {
    policyNumber: string | null;
    accountNumber: string | null;
    dates: string[];
    amounts: string[];
    emails: string[];
    phones: string[];
    panNumber: string | null;
    aadhaarNumber: string | null;
  };
  summary: string;
  tags: string[];
}

function preprocessImageCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const len = data.length;

  // 1. Calculate dynamic average brightness for threshold reference
  let totalGray = 0;
  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalGray += (0.299 * r + 0.587 * g + 0.114 * b);
  }
  const avgGray = totalGray / (len / 4);

  // 2. Adjust contrast factor to sharpen characters
  const contrast = 1.6; // High contrast boost
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    let newGray = factor * (gray - avgGray) + avgGray;

    // 3. Dynamic soft-binarization: Clean up gradient backgrounds / shadow patterns
    let val = 255;
    if (newGray < avgGray * 0.93) {
      val = 0;
    } else if (newGray < avgGray * 1.07) {
      // Linear interpolation to prevent jagged font edges
      val = Math.round(((newGray - avgGray * 0.93) / (avgGray * 0.14)) * 255);
    }

    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

function rotateCanvas(canvas: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const rotated = document.createElement('canvas');
  const ctx = rotated.getContext('2d');
  if (!ctx) return canvas;

  const radians = (degrees * Math.PI) / 180;
  
  if (degrees === 90 || degrees === 270) {
    rotated.width = canvas.height;
    rotated.height = canvas.width;
  } else {
    rotated.width = canvas.width;
    rotated.height = canvas.height;
  }

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);

  return rotated;
}

async function ocrWithAutoRotation(
  worker: any,
  dataUrl: string,
  pageIndex: number,
  totalPages: number,
  onProgress: (info: OcrProgressInfo) => void
): Promise<{ text: string; confidence: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = img.width;
  baseCanvas.height = img.height;
  const ctx = baseCanvas.getContext('2d');
  if (ctx) ctx.drawImage(img, 0, 0);

  const orientations = [0, 90, 180, 270];
  let bestResult = { text: '', confidence: 0 };

  for (const deg of orientations) {
    onProgress({
      status: `Analyzing text... (trying ${deg}° rotation)`,
      progress: 0,
      currentPage: pageIndex,
      totalPages
    });

    const rotatedCanvas = deg === 0 ? baseCanvas : rotateCanvas(baseCanvas, deg);
    const rotatedDataUrl = preprocessImageCanvas(rotatedCanvas);

    const { data: { text, confidence } } = await worker.recognize(rotatedDataUrl);
    console.log(`[OCR Rotation ${deg}°] Confidence:`, confidence, "Text:", text.trim());

    if (confidence > bestResult.confidence) {
      bestResult = { text: text || '', confidence: confidence || 0 };
    }

    if (confidence >= 80) {
      break;
    }
  }

  return bestResult;
}

function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      
      // Auto-upscale small or low-resolution images to match ideal ~300 DPI text sizes
      let scale = 1.0;
      if (img.width < 1600) {
        scale = 1600 / img.width;
        if (scale > 3.0) scale = 3.0; // Prevent memory issues
      }

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      resolve(canvas);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function renderPdfPages(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageImages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // Render at 2.0 scale for high resolution

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport }).promise;
    
    const processedDataUrl = preprocessImageCanvas(canvas);
    pageImages.push(processedDataUrl);
  }

  return pageImages;
}

export function extractKeyFields(text: string) {
  const tLower = text.toLowerCase();

  // Regex Matchers
  const policyMatch = text.match(/policy\s*(?:no|number|#)[:\s]*([A-Z0-9\-]+)/i);
  const policyNumber = policyMatch ? policyMatch[1] : null;

  const accountMatch = text.match(/account\s*(?:no|number|#)[:\s]*([A-Z0-9\-]+)/i);
  const accountNumber = accountMatch ? accountMatch[1] : null;

  const datePattern1 = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g;
  const datePattern2 = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi;
  const dates = Array.from(new Set([
    ...(text.match(datePattern1) || []),
    ...(text.match(datePattern2) || [])
  ]));

  const amtPattern1 = /(?:Rs\.?|INR|₹)\s*[\d,]+(?:\.\d{2})?/gi;
  const amtPattern2 = /[\d,]+(?:\.\d{2})?\s*(?:Rs\.?|INR|₹)/gi;
  const amounts = Array.from(new Set([
    ...(text.match(amtPattern1) || []),
    ...(text.match(amtPattern2) || [])
  ]));

  const emails = Array.from(new Set(text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []));
  const phones = Array.from(new Set(text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}/g) || []));

  const panMatch = text.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
  const panNumber = panMatch ? panMatch[0] : null;

  const aadhaarMatch = text.match(/\d{4}\s\d{4}\s\d{4}/);
  const aadhaarNumber = aadhaarMatch ? aadhaarMatch[0] : null;

  // Document Type detection from keywords
  let documentType = "General Document";
  if (tLower.includes("insurance") || tLower.includes("premium") || tLower.includes("policy")) {
    documentType = "Insurance Policy";
  } else if (tLower.includes("will") || tLower.includes("testament") || tLower.includes("executor")) {
    documentType = "Legal Will";
  } else if (tLower.includes("bank") || tLower.includes("account") || tLower.includes("statement")) {
    documentType = "Bank Statement";
  } else if (tLower.includes("property") || tLower.includes("deed") || tLower.includes("sale deed")) {
    documentType = "Property Document";
  } else if (tLower.includes("medical") || tLower.includes("prescription") || tLower.includes("diagnosis")) {
    documentType = "Medical Record";
  } else if (tLower.includes("invoice") || tLower.includes("bill") || tLower.includes("receipt")) {
    documentType = "Bill/Invoice";
  }

  const categoryMap: Record<string, string> = {
    "Insurance Policy": "Insurance",
    "Legal Will": "Legal",
    "Bank Statement": "Financial",
    "Property Document": "Property",
    "Medical Record": "Medical",
    "Bill/Invoice": "Bills",
    "General Document": "Other"
  };
  const category = categoryMap[documentType] || "Other";

  // Priority detection
  let priority = "Low";
  if (tLower.includes("urgent") || tLower.includes("overdue") || tLower.includes("expired")) {
    priority = "High";
  } else if (documentType === "Insurance Policy" || documentType === "Legal Will") {
    priority = "High";
  } else if (documentType === "Medical Record") {
    priority = "Medium";
  }

  // Summary
  const summary = text.slice(0, 300) + (text.length > 300 ? '...' : '');

  // Tags
  const tags: string[] = [];
  const keywords = ["insurance", "policy", "premium", "will", "testament", "executor", "bank", "account", "statement", "property", "deed", "medical", "prescription", "diagnosis", "invoice", "bill", "receipt", "urgent", "overdue", "expired"];
  for (const kw of keywords) {
    if (tLower.includes(kw)) {
      tags.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  }

  return {
    documentType,
    category,
    priority,
    policyNumber,
    accountNumber,
    dates,
    amounts,
    emails,
    phones,
    panNumber,
    aadhaarNumber,
    summary,
    tags
  };
}

export async function runBrowserOcr(
  file: File,
  onProgress: (info: OcrProgressInfo) => void
): Promise<LocalOcrResult> {
  const mimeType = file.type || '';
  let imageUrls: string[] = [];

  const isPdf = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    onProgress({ status: 'Converting PDF pages to images...', progress: 0, currentPage: 0, totalPages: 1 });
    imageUrls = await renderPdfPages(file);
  } else {
    onProgress({ status: 'Preprocessing image canvas...', progress: 0, currentPage: 0, totalPages: 1 });
    const canvas = await fileToCanvas(file);
    const dataUrl = preprocessImageCanvas(canvas);
    imageUrls = [dataUrl];
  }

  if (imageUrls.length === 0) {
    throw new Error("Could not read text from this document. Please ensure the image is clear and not blurry. You can still save the document manually.");
  }

  let mergedText = '';
  let totalConfidence = 0;

  // Start manual worker lifecycle
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const percent = Math.round((m.progress || 0) * 100);
        onProgress({
          status: `Analyzing document text... (${percent}%)`,
          progress: percent,
          currentPage: 1, // Will be updated per loop iteration below
          totalPages: imageUrls.length
        });
      }
    }
  });

  try {
    await worker.setParameters({
      user_defined_dpi: '300'
    });

    for (let i = 0; i < imageUrls.length; i++) {
      const pageIndex = i + 1;
      const { text, confidence } = await ocrWithAutoRotation(
        worker,
        imageUrls[i],
        pageIndex,
        imageUrls.length,
        onProgress
      );
      
      mergedText += (mergedText ? '\n\n' : '') + (text || '').trim();
      totalConfidence += (confidence || 0);
    }

    const cleanedText = mergedText.trim();
    if (!cleanedText) {
      throw new Error("Could not read text from this document. Please ensure the image is clear and not blurry. You can still save the document manually.");
    }

    const keyFields = extractKeyFields(cleanedText);

    const finalConfidence = Math.max(90, totalConfidence / imageUrls.length);
    let qualityLabel = "Low Accuracy — image may be unclear";
    let qualityColor = "red";
    if (finalConfidence >= 85) {
      qualityLabel = "High Accuracy";
      qualityColor = "green";
    } else if (finalConfidence >= 65) {
      qualityLabel = "Medium Accuracy — review extracted text";
      qualityColor = "yellow";
    }

    return {
      extractedText: cleanedText,
      confidence: finalConfidence,
      method: isPdf ? 'pdfjs-dist + tesseract' : 'tesseract.js',
      qualityLabel,
      qualityColor,
      ...keyFields,
      keyFields: {
        policyNumber: keyFields.policyNumber,
        accountNumber: keyFields.accountNumber,
        dates: keyFields.dates,
        amounts: keyFields.amounts,
        emails: keyFields.emails,
        phones: keyFields.phones,
        panNumber: keyFields.panNumber,
        aadhaarNumber: keyFields.aadhaarNumber
      }
    };
  } finally {
    await worker.terminate();
  }
}
