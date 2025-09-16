import axios, { AxiosResponse } from 'axios';
import {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectWithDocuments,
  Document,
  DocumentType,
  UploadResponse,
  QueryResponse,
  JurisdictionCache,
  ApiError
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle API errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

class ProjectApiService {
  // Project CRUD operations
  async getProjects(skip = 0, limit = 100): Promise<Project[]> {
    try {
      const response: AxiosResponse<Project[]> = await api.get('/api/projects/', {
        params: { skip, limit }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getProject(projectId: string): Promise<ProjectWithDocuments> {
    try {
      const response: AxiosResponse<ProjectWithDocuments> = await api.get(`/api/projects/${projectId}`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async createProject(projectData: ProjectCreate): Promise<Project> {
    try {
      const response: AxiosResponse<Project> = await api.post('/api/projects/', projectData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async updateProject(projectId: string, projectData: ProjectUpdate): Promise<Project> {
    try {
      const response: AxiosResponse<Project> = await api.put(`/api/projects/${projectId}`, projectData);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      await api.delete(`/api/projects/${projectId}`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Document operations
  async getProjectDocuments(projectId: string): Promise<Document[]> {
    try {
      const response: AxiosResponse<Document[]> = await api.get(`/api/projects/${projectId}/documents`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async uploadDocument(
    projectId: string,
    file: File,
    documentType?: DocumentType
  ): Promise<Document> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (documentType) {
        formData.append('document_type', documentType);
      }

      const response: AxiosResponse<Document> = await api.post(
        `/api/projects/${projectId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    try {
      await api.delete(`/api/projects/${projectId}/documents/${documentId}`);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Advanced document operations
  async uploadAndProcessDocuments(
    projectId: string,
    plansetFile: File,
    utilityBillFile: File
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('pdf1', plansetFile);
      formData.append('pdf2', utilityBillFile);

      const response: AxiosResponse<UploadResponse> = await api.post(
        `/api/projects/${projectId}/upload-and-process`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async processExistingDocuments(projectId: string): Promise<any> {
    try {
      const response = await api.post(`/api/projects/${projectId}/process-documents`);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async queryProjectDocuments(
    projectId: string,
    query: string,
    topK = 3
  ): Promise<QueryResponse> {
    try {
      const formData = new FormData();
      formData.append('query', query);
      formData.append('top_k', topK.toString());

      const response: AxiosResponse<QueryResponse> = await api.post(
        `/api/projects/${projectId}/query`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Jurisdiction cache operations
  async getJurisdictionStats(): Promise<any> {
    try {
      const response = await api.get('/jurisdiction-cache/stats');
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async getPopularJurisdictions(limit = 10): Promise<JurisdictionCache[]> {
    try {
      const response: AxiosResponse<JurisdictionCache[]> = await api.get('/jurisdiction-cache/popular', {
        params: { limit }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async searchJurisdictions(query: string, limit = 10): Promise<JurisdictionCache[]> {
    try {
      const response: AxiosResponse<JurisdictionCache[]> = await api.get('/jurisdiction-cache/search', {
        params: { q: query, limit }
      });
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Error handling
  private handleError(error: any): Error {
    if (error.response?.data?.detail) {
      return new Error(error.response.data.detail);
    }
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('An unexpected error occurred');
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getDocumentTypeIcon(type: string): string {
    switch (type.toLowerCase()) {
      case 'planset':
        return '📋';
      case 'utility_bill':
        return '⚡';
      default:
        return '📄';
    }
  }
}

// Export singleton instance
export const projectApi = new ProjectApiService();