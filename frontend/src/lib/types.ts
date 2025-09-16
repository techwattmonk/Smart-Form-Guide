// Project Management Types

export enum ProjectStatus {
  DRAFT = "draft",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected"
}

export enum DocumentType {
  PLANSET = "planset",
  UTILITY_BILL = "utility_bill",
  OTHER = "other"
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  customer_name?: string;
  customer_address?: string;
  status: ProjectStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
  jurisdiction_name?: string;
  jurisdiction_steps?: string;
  extracted_keys?: Record<string, any>;
  document_count: number;
}

export interface ProjectCreate {
  name: string;
  status?: ProjectStatus;
}

export interface ProjectUpdate {
  name?: string;
  status?: ProjectStatus;
}

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  document_type: DocumentType;
  file_size: number;
  content_type: string;
  upload_date: string;
  project_id: string;
  extracted_text?: string;
  extracted_data?: Record<string, any>;
}

export interface ProjectWithDocuments extends Project {
  documents: Document[];
}

export interface UploadResponse {
  message: string;
  documents?: Array<{
    id: string;
    filename: string;
    type: string;
  }>;
  jurisdiction_name?: string;
  jurisdiction_steps?: string;
  cached?: boolean;
}

export interface JurisdictionCache {
  id: string;
  jurisdiction_name: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
  smart_guidance_flow?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Form validation schemas
export interface ProjectFormData {
  name: string;
  status: ProjectStatus;
}

export interface DocumentUploadData {
  file: File;
  document_type?: DocumentType;
}

// API Error types
export interface ApiError {
  detail: string;
  status_code: number;
}

// Search and query types
export interface DocumentSearchResult {
  document: string;
  metadata: Record<string, any>;
  similarity_score: number;
  document_id: string;
  chunk_index: number;
}

export interface QueryResponse {
  results: DocumentSearchResult[];
}