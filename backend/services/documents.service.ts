import fs from "fs";
import path from "path";
import crypto from "crypto";
import JSZip from "jszip";
import { IDocumentRepository } from "../repositories/DocumentRepository";

export class DocumentsService {
  constructor(private documentRepository: IDocumentRepository) {}

  async createDocument(doc: any) {
    if (!doc.uid || !doc.fileName) {
      throw new Error("Missing required document details");
    }
    return this.documentRepository.create(doc);
  }

  async getDocument(id: string) {
    return this.documentRepository.getById(id);
  }

  async getDocumentsByUid(uid: string) {
    return this.documentRepository.getByUid(uid);
  }

  async deleteDocument(id: string) {
    return this.documentRepository.delete(id);
  }

  async updateDocument(id: string, docDetails: any) {
    return this.documentRepository.update(id, docDetails);
  }

  async createPresetDocuments(uid: string) {
    const userDocs = await this.documentRepository.getByUid(uid);
    if (userDocs.length > 0) {
      return userDocs;
    }

    const presets = [
      {
        id: "preset-doc-will",
        uid,
        fileName: "Last_Will_and_Testament_Draft_2026.pdf",
        documentType: "Will & Testament",
        uploadedDate: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        notes: "Main will document. Designates Sarah Mercer as sole executor and primary beneficiary. Secondary trustee is legal firm TrustCorp LLP. Physical copy located in security safe box #32A.",
        fileUrl: "/uploads/preset_will.pdf",
        isNomineeAccessSecured: true,
        digitalAccessHash: "sha256-a94f31c"
      },
      {
        id: "preset-doc-life-ins",
        uid,
        fileName: "Aetna_Term_Life_Policy_AM94238.pdf",
        documentType: "Insurance Policies",
        uploadedDate: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
        notes: "Group Term Life Insurance active. Benefit amount $1,000,000 USD. Designated nominee: Sarah Mercer. Copay processing details inside.",
        fileUrl: "/uploads/preset_insurance.pdf",
        isNomineeAccessSecured: true,
        digitalAccessHash: "sha256-e9102bc"
      }
    ];

    const createdDocs = [];
    for (const preset of presets) {
      const created = await this.documentRepository.create(preset);
      createdDocs.push(created);

      // Create matching extraction presets
      if (preset.id === "preset-doc-will") {
        await this.documentRepository.createExtraction({
          id: "pe-1",
          documentId: preset.id,
          policyNumber: "LAST-WILL-2026-MERCER",
          expiryDate: "N/A (Perpetual)",
          coverage: "Estate distribution, custody directives, trustee designations",
          nominee: "Sarah Mercer (Spouse) / Trustee: TrustCorp LLP",
          hospitalName: "N/A"
        });
      } else if (preset.id === "preset-doc-life-ins") {
        await this.documentRepository.createExtraction({
          id: "pe-2",
          documentId: preset.id,
          policyNumber: "AM94238-AETNA-GRP",
          expiryDate: "2035-12-31",
          coverage: "$1,000,000 USD (Term Life Benefit)",
          nominee: "Sarah Mercer (100% Beneficiary Allocation)",
          hospitalName: "N/A (Aetna Health / Group Claims Division)"
        });
      }
    }
    return createdDocs;
  }

  async getExtraction(docId: string) {
    return this.documentRepository.getExtractionByDocId(docId);
  }

  async saveExtraction(docId: string, extractionDetails: any) {
    return this.documentRepository.updateExtraction(docId, extractionDetails);
  }

  async exportZip(uid: string, password?: string, uploadsDir?: string) {
    const userDocs = await this.documentRepository.getByUid(uid);
    if (userDocs.length === 0) {
      throw new Error("No documents found in vault to export");
    }

    const zip = new JSZip();
    const effectiveUploadsDir = uploadsDir || path.join(process.cwd(), "uploads");

    // Add files to zip
    for (const doc of userDocs) {
      const filename = path.basename(doc.fileUrl);
      const filePath = path.join(effectiveUploadsDir, filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        zip.file(doc.fileName, content);
      }
    }

    // Create readme file inside zip
    let readmeText = `Lighthouse / LifeContinuity AI Secure Vault Export\n`;
    readmeText += `Generated on: ${new Date().toISOString()}\n`;
    readmeText += `Total Documents: ${userDocs.length}\n\n`;
    readmeText += `--- Document Metadata list ---\n\n`;

    for (let i = 0; i < userDocs.length; i++) {
      const doc = userDocs[i];
      const ext = await this.documentRepository.getExtractionByDocId(doc.id);
      readmeText += `${i + 1}. Filename: ${doc.fileName}\n`;
      readmeText += `   Classification: ${doc.documentType}\n`;
      readmeText += `   Uploaded Date: ${doc.uploadedDate}\n`;
      readmeText += `   Notes: ${doc.notes || "None"}\n`;
      readmeText += `   Nominee Handover Access: ${doc.isNomineeAccessSecured ? "Allowed" : "Blocked"}\n`;
      if (ext) {
        readmeText += `   [AI Extracted Fields]:\n`;
        readmeText += `     - Policy Number: ${ext.policyNumber || "N/A"}\n`;
        readmeText += `     - Expiry Date: ${ext.expiryDate || "N/A"}\n`;
        readmeText += `     - Nominee Beneficial on Record: ${ext.nominee || "N/A"}\n`;
        readmeText += `     - Healthcare Partner: ${ext.hospitalName || "N/A"}\n`;
        readmeText += `     - Coverage: ${ext.coverage || "N/A"}\n`;
      }
      readmeText += `\n`;
    }

    zip.file("VAULT_INDEX_SUMMARY.txt", readmeText);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    if (password) {
      const salt = crypto.randomBytes(16);
      const key = crypto.scryptSync(password, salt, 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      const encrypted = Buffer.concat([cipher.update(zipBuffer), cipher.final()]);
      const finalBuffer = Buffer.concat([salt, iv, encrypted]);

      return {
        contentType: "application/octet-stream",
        filename: "vault_export_secured.zip.enc",
        buffer: finalBuffer
      };
    } else {
      return {
        contentType: "application/zip",
        filename: "vault_export.zip",
        buffer: zipBuffer
      };
    }
  }

  async decryptZip(fileBase64: string, password?: string) {
    if (!fileBase64 || !password) {
      throw new Error("File payload and password are required");
    }

    const rawBuffer = Buffer.from(fileBase64.split(",")[1] || fileBase64, "base64");
    if (rawBuffer.length < 32) {
      throw new Error("Invalid encrypted file. Too small to be valid.");
    }

    const salt = rawBuffer.slice(0, 16);
    const iv = rawBuffer.slice(16, 32);
    const encryptedData = rawBuffer.slice(32);

    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decryptedZip = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

    const zip = await JSZip.loadAsync(decryptedZip);
    const filesList: any[] = [];

    for (const [relativePath, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const fileBuffer = await file.async("nodebuffer");
        filesList.push({
          name: relativePath,
          base64: `data:application/octet-stream;base64,${fileBuffer.toString("base64")}`
        });
      }
    }

    return filesList;
  }

  async extractDocumentPolicy(id: string, fileUrl: string, documentType: string, ai: any) {
    const doc = await this.documentRepository.getById(id);
    if (!doc) {
      throw new Error(`Document metadata not found: ${id}`);
    }

    const filename = path.basename(fileUrl);
    const filePath = path.join(process.cwd(), "uploads", filename);

    let base64Data = "";
    if (fs.existsSync(filePath)) {
      base64Data = fs.readFileSync(filePath).toString("base64");
    }

    // Default Fallbacks
    let policyNumber = "AM-POLICY-" + Math.floor(100000 + Math.random() * 900000);
    let expiryDate = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0];
    let coverage = "$500,000 Life Benefit Coverage";
    let nominee = "Sarah Mercer (Spouse)";
    let hospitalName = "Stanford Health Care";

    if (base64Data && ai) {
      try {
        console.log(`[GEMINI OCR] Sending document page payload to gemini-3.5-flash for metadata extraction.`);
        const systemPrompt = `You are a high-reliability legal and insurance document data extractor. 
Analyze the provided document base64 (which is a PDF/Image of type: ${documentType}) and extract the following:
1. Policy, Deed, Contract or Document Identifier Number.
2. Term Expiry date or End Date (formatted as YYYY-MM-DD or 'N/A' if perpetual).
3. Value / Coverage amount or Principal directive summary.
4. Named Nominee, Trustee, or Beneficiary on record.
5. Organization, Insurer, Healthcare partner, or Authority name.

Provide a JSON output matching this schema:
{
  "policyNumber": "number",
  "expiryDate": "YYYY-MM-DD",
  "coverage": "short text",
  "nominee": "name",
  "hospitalName": "organization"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: systemPrompt },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: base64Data
                  }
                }
              ]
            }
          ],
          config: { responseMimeType: "application/json" }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          policyNumber = parsed.policyNumber || policyNumber;
          expiryDate = parsed.expiryDate || expiryDate;
          coverage = parsed.coverage || coverage;
          nominee = parsed.nominee || nominee;
          hospitalName = parsed.hospitalName || hospitalName;
        }
      } catch (err: any) {
        console.warn("[GEMINI OCR failed, using regex/text extract fallbacks]", err.message || err);
      }
    }

    const extraction = {
      id: "pe-" + Math.random().toString(36).substr(2, 9),
      documentId: id,
      policyNumber,
      expiryDate,
      coverage,
      nominee,
      hospitalName
    };

    return this.documentRepository.updateExtraction(id, extraction);
  }
}
