import * as pdf from 'pdf-parse';
import Tesseract, { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { fromBuffer } from 'pdf2pic';

// Embedded JPEG extractor from PDF buffer for scanned documents
function extractJpegFromPdf(pdfBuffer: Buffer): Buffer | null {
  const startMarker = Buffer.from([0xFF, 0xD8, 0xFF]);
  const endMarker = Buffer.from([0xFF, 0xD9]);
  
  const startIdx = pdfBuffer.indexOf(startMarker);
  if (startIdx !== -1) {
    const endIdx = pdfBuffer.indexOf(endMarker, startIdx);
    if (endIdx !== -1) {
      return pdfBuffer.subarray(startIdx, endIdx + 2);
    }
  }
  return null;
}

export interface OcrResult {
  extractedText: string;
  confidence: number;
  method: string;
}

export interface KeyFieldsResult {
  documentType: string;
  category: string;
  priority: string;
  policyNumber: string | null;
  accountNumber: string | null;
  dates: string[];
  amounts: string[];
  emails: string[];
  phones: string[];
  panNumber: string | null;
  aadhaarNumber: string | null;
  summary: string;
  tags: string[];
}

// PART A — Advanced Image Preprocessing Pipeline
async function preprocessImage(fileBuffer: Buffer, extension: string): Promise<Buffer> {
  const metadata = await sharp(fileBuffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;

  const targetWidth = Math.max(originalWidth, 2000);
  const scaleFactor = targetWidth / originalWidth;
  const targetHeight = Math.round(originalHeight * scaleFactor);

  let pipeline = sharp(fileBuffer);

  // JPEG compression artifacts cleanup (PART C)
  if (extension === 'jpg' || extension === 'jpeg') {
    pipeline = pipeline.median(3);
  }

  // WebP conversion (PART C)
  if (extension === 'webp') {
    const pngBuffer = await sharp(fileBuffer).png().toBuffer();
    pipeline = sharp(pngBuffer);
  }

  const processed = await pipeline
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'fill',
      kernel: sharp.kernel.lanczos3
    })
    .greyscale()
    .normalize()
    .sharpen({
      sigma: 1.5,
      m1: 0.5,
      m2: 0.5
    })
    .median(1)
    .linear(1.5, -30)
    .png({
      quality: 100,
      compressionLevel: 0
    })
    .toBuffer();

  return processed;
}

// PART B — Multi-Pass OCR Strategy
async function runMultiPassOCR(imageBuffer: Buffer): Promise<{ text: string; confidence: number; passCount: number }> {
  const worker1 = await createWorker('eng', 1);
  const worker2 = await createWorker('eng', 1);
  const worker3 = await createWorker('eng', 1);

  await Promise.all([
    worker1.setParameters({
      tessedit_pageseg_mode: '3' as any,
      tessedit_char_whitelist: '',
      preserve_interword_spaces: '1'
    }),
    worker2.setParameters({
      tessedit_pageseg_mode: '11' as any,
      preserve_interword_spaces: '1'
    }),
    worker3.setParameters({
      tessedit_pageseg_mode: '6' as any,
      preserve_interword_spaces: '1'
    })
  ]);

  try {
    const [p1, p2, p3] = await Promise.all([
      worker1.recognize(imageBuffer),
      worker2.recognize(imageBuffer),
      worker3.recognize(imageBuffer)
    ]);

    const texts = [p1.data.text || '', p2.data.text || '', p3.data.text || ''].map(t => t.trim());
    const confidences = [p1.data.confidence || 0, p2.data.confidence || 0, p3.data.confidence || 0];

    const bestIndex = confidences.indexOf(Math.max(...confidences));

    const allLines = new Set<string>();
    texts.forEach(text => {
      text.split('\n').forEach(line => {
        const cleaned = line.trim();
        if (cleaned.length > 2) {
          allLines.add(cleaned);
        }
      });
    });

    const mergedText = Array.from(allLines).join('\n');
    const finalText = mergedText.length > texts[bestIndex].length ? mergedText : texts[bestIndex];

    return {
      text: finalText,
      confidence: Math.max(...confidences),
      passCount: 3
    };
  } finally {
    await Promise.all([
      worker1.terminate(),
      worker2.terminate(),
      worker3.terminate()
    ]);
  }
}

// PART D — Text Cleanup After OCR
function cleanOCRText(rawText: string): string {
  return rawText
    .split('\n')
    .filter(line => {
      const cleaned = line.trim();
      return (cleaned.match(/[a-zA-Z0-9]/g) || []).length >= 2;
    })
    .map(line => line
      .replace(/\|/g, 'I')
      .replace(/0(?=[a-zA-Z])/g, 'O')
      .replace(/1(?=[a-zA-Z])/g, 'I')
      .replace(/\s{3,}/g, '  ')
      .trim()
    )
    .join('\n')
    .split('\n')
    .filter((line, index, arr) => line !== arr[index - 1])
    .join('\n')
    .trim();
}

// PART C — Handle Different Image Types Differently in extractTextFromFile
export async function extractTextFromFile(fileBuffer: Buffer, mimeType: string): Promise<OcrResult> {
  const isPdf = mimeType === 'application/pdf' || mimeType.toLowerCase().endsWith('.pdf');

  if (isPdf) {
    try {
      const pdfParser = (pdf as any).default || pdf;
      const data = await pdfParser(fileBuffer);
      let extractedText = data.text || '';
      extractedText = extractedText.replace(/\s+/g, ' ').trim();

      // If text < 100 characters (scanned PDF)
      if (extractedText.length < 100) {
        try {
          console.log('[OCR] Scanned PDF detected. Attempting pdf2pic conversion...');
          const converter = fromBuffer(fileBuffer, {
            density: 300,
            format: 'png',
            width: 2480,
            height: 3508
          });
          const pageResult = await converter(1, { responseType: 'buffer' });
          const processedImage = await preprocessImage(pageResult.buffer, 'png');
          const ocrResult = await runMultiPassOCR(processedImage);
          const cleanedText = cleanOCRText(ocrResult.text);

          return {
            extractedText: cleanedText,
            confidence: ocrResult.confidence,
            method: 'pdf2pic + tesseract'
          };
        } catch (pdfPicErr) {
          console.warn('[OCR] pdf2pic page conversion failed, trying embedded jpeg fallback:', pdfPicErr);
          const embeddedImage = extractJpegFromPdf(fileBuffer);
          if (embeddedImage) {
            const processedImage = await preprocessImage(embeddedImage, 'jpeg');
            const ocrResult = await runMultiPassOCR(processedImage);
            const cleanedText = cleanOCRText(ocrResult.text);
            return {
              extractedText: cleanedText,
              confidence: ocrResult.confidence,
              method: 'tesseract-embedded'
            };
          }
        }
      }

      return {
        extractedText,
        confidence: 100,
        method: 'pdf-parse'
      };
    } catch (err: any) {
      console.warn('[OCR] pdf-parse failed, attempting fallback:', err.message || err);
      const embeddedImage = extractJpegFromPdf(fileBuffer);
      if (embeddedImage) {
        const processedImage = await preprocessImage(embeddedImage, 'jpeg');
        const ocrResult = await runMultiPassOCR(processedImage);
        const cleanedText = cleanOCRText(ocrResult.text);
        return {
          extractedText: cleanedText,
          confidence: ocrResult.confidence,
          method: 'tesseract-fallback'
        };
      }
      throw err;
    }
  }

  // Handle Images
  if (mimeType.startsWith('image/')) {
    let extension = 'png';
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') extension = 'jpeg';
    else if (mimeType === 'image/webp') extension = 'webp';

    const processedImage = await preprocessImage(fileBuffer, extension);
    const ocrResult = await runMultiPassOCR(processedImage);
    const cleanedText = cleanOCRText(ocrResult.text);

    return {
      extractedText: cleanedText,
      confidence: ocrResult.confidence,
      method: 'tesseract'
    };
  }

  throw new Error(`Unsupported mimeType: ${mimeType}`);
}

export function extractKeyFields(text: string): KeyFieldsResult {
  const tLower = text.toLowerCase();

  // Regex Patterns
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

  // Category mapping
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

  // Summary (First 300 characters of text)
  const summary = text.slice(0, 300) + (text.length > 300 ? '...' : '');

  // Tag detection from keywords
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
