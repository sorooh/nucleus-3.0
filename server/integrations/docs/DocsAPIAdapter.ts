/**
 * Docs API Adapter - Integration with Abosham Docs Platform
 * 
 * Outbound adapter for sending documents to the Docs Platform
 * Handles: Create, Upload, Analyze, Search, Retrieve documents
 * Security: HMAC-SHA256 signature authentication
 */

import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import FormData from "form-data";

export interface DocumentPayload {
  externalId: string;
  title: string;
  category: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface DocumentResponse {
  success: boolean;
  documentId: string;
  status: string;
}

export interface SearchResult {
  documents: Array<{
    id: string;
    title: string;
    category: string;
    summary?: string;
  }>;
}

export class DocsAPIAdapter {
  private axios: AxiosInstance;
  private secret: string;

  constructor(
    private baseUrl: string,
    private apiKey: string,
    secret: string
  ) {
    this.secret = secret;
    this.axios = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    console.log('[DocsAPIAdapter] Initialized with base URL:', baseUrl);
  }

  /**
   * Generate HMAC signature for request body
   */
  private sign(body: string): string {
    const ts = Math.floor(Date.now() / 1000);
    const sig = crypto
      .createHmac("sha256", this.secret)
      .update(`${ts}.${body}`)
      .digest("hex");
    return `t=${ts}, v1=${sig}`;
  }

  /**
   * Create a new document in the Docs Platform
   */
  async createDocument(payload: DocumentPayload): Promise<DocumentResponse> {
    try {
      const body = JSON.stringify(payload);
      
      console.log('[DocsAPIAdapter] Creating document:', {
        title: payload.title,
        category: payload.category,
        externalId: payload.externalId
      });

      const res = await this.axios.post("/api/documents", body, {
        headers: {
          "X-Surooh-Signature": this.sign(body),
          "Content-Type": "application/json",
        },
      });

      console.log('[DocsAPIAdapter] Document created successfully:', res.data.documentId);
      return res.data;
    } catch (error: any) {
      console.error('[DocsAPIAdapter] Error creating document:', error.message);
      throw new Error(`Failed to create document: ${error.message}`);
    }
  }

  /**
   * Upload a file to an existing document
   * Note: File uploads use X-Api-Key only (no HMAC signature for multipart/form-data)
   */
  async uploadFile(
    docId: string,
    file: Buffer,
    filename: string,
    mimeType?: string
  ): Promise<any> {
    try {
      const form = new FormData();
      form.append("file", file, {
        filename,
        contentType: mimeType || "application/octet-stream",
      });

      console.log('[DocsAPIAdapter] Uploading file to document:', docId);

      // File uploads secured with X-Api-Key only (multipart/form-data)
      const res = await this.axios.post(
        `/api/documents/${docId}/files`,
        form,
        {
          headers: {
            ...form.getHeaders(),
          },
        }
      );

      console.log('[DocsAPIAdapter] File uploaded successfully');
      return res.data;
    } catch (error: any) {
      console.error('[DocsAPIAdapter] Error uploading file:', error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Trigger document analysis (OCR + AI classification)
   */
  async analyzeDocument(id: string): Promise<any> {
    try {
      console.log('[DocsAPIAdapter] Triggering analysis for document:', id);

      // Sign empty body for null/empty POST requests
      const body = "";
      const res = await this.axios.post(
        `/api/documents/${id}/analyze`,
        null,
        {
          headers: {
            "X-Surooh-Signature": this.sign(body),
          },
        }
      );

      console.log('[DocsAPIAdapter] Analysis triggered successfully');
      return res.data;
    } catch (error: any) {
      console.error('[DocsAPIAdapter] Error analyzing document:', error.message);
      throw new Error(`Failed to analyze document: ${error.message}`);
    }
  }

  /**
   * Search documents by query
   */
  async searchDocuments(query: string): Promise<SearchResult> {
    try {
      console.log('[DocsAPIAdapter] Searching documents with query:', query);

      // For GET requests, sign empty body
      const body = "";
      const res = await this.axios.get("/api/documents", {
        params: { query },
        headers: {
          "X-Surooh-Signature": this.sign(body),
        },
      });

      console.log('[DocsAPIAdapter] Search completed:', res.data.documents?.length || 0, 'results');
      return res.data;
    } catch (error: any) {
      console.error('[DocsAPIAdapter] Error searching documents:', error.message);
      throw new Error(`Failed to search documents: ${error.message}`);
    }
  }

  /**
   * Get document details by ID
   */
  async getDocument(id: string): Promise<any> {
    try {
      console.log('[DocsAPIAdapter] Fetching document:', id);

      // For GET requests, sign empty body
      const body = "";
      const res = await this.axios.get(`/api/documents/${id}`, {
        headers: {
          "X-Surooh-Signature": this.sign(body),
        },
      });

      console.log('[DocsAPIAdapter] Document fetched successfully');
      return res.data;
    } catch (error: any) {
      console.error('[DocsAPIAdapter] Error fetching document:', error.message);
      throw new Error(`Failed to get document: ${error.message}`);
    }
  }

  /**
   * Health check - verify connection to Docs Platform
   */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.axios.get("/api/health");
      return res.status === 200;
    } catch (error) {
      console.error('[DocsAPIAdapter] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let docsAdapter: DocsAPIAdapter | null = null;

/**
 * Initialize the Docs API Adapter
 */
export function initDocsAdapter(): DocsAPIAdapter {
  const baseUrl = process.env.DOCS_BASE_URL;
  const apiKey = process.env.DOCS_API_KEY;
  const secret = process.env.DOC_HMAC_SECRET;

  if (!baseUrl || !apiKey || !secret) {
    throw new Error(
      "Missing required environment variables: DOCS_BASE_URL, DOCS_API_KEY, DOC_HMAC_SECRET"
    );
  }

  if (!docsAdapter) {
    docsAdapter = new DocsAPIAdapter(baseUrl, apiKey, secret);
  }

  return docsAdapter;
}

/**
 * Get the initialized Docs API Adapter instance
 */
export function getDocsAdapter(): DocsAPIAdapter {
  if (!docsAdapter) {
    return initDocsAdapter();
  }
  return docsAdapter;
}
