const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Project {
  id: string;
  name: string;
  county_name?: string;
  smart_guidance_flow?: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
  owner_id: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  last_analysis_date?: string;
}

export interface ProjectCreate {
  name: string;
  county_name?: string;
  smart_guidance_flow?: string;
  status?: 'draft' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
}

export interface ProjectUpdate {
  name?: string;
  county_name?: string;
  smart_guidance_flow?: string;
  status?: 'draft' | 'in_progress' | 'submitted' | 'completed' | 'cancelled';
}

export interface Document {
  id: string;
  filename: string;
  document_type: 'planset' | 'utility_bill' | 'other';
  file_size: number;
  content_type: string;
  project_id: string;
  owner_id: string;
  file_path: string;
  uploaded_at: string;
  extracted_text?: string;
  analysis_results?: any;
  customer_address?: string;
  jurisdiction_details?: any;
}

class ProjectsService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private getAuthHeadersForUpload() {
    const token = localStorage.getItem('access_token');
    return {
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async createProject(projectData: ProjectCreate): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects/`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create project');
    }

    return response.json();
  }

  async getProjects(skip: number = 0, limit: number = 100): Promise<Project[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/?skip=${skip}&limit=${limit}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        // Token might be expired, redirect to login
        localStorage.removeItem('access_token');
        window.location.href = '/auth';
        throw new Error('Authentication expired. Please login again.');
      }
      const error = await response.json().catch(() => ({ detail: 'Failed to fetch projects' }));
      throw new Error(error.detail || 'Failed to fetch projects');
    }

    return response.json();
  }

  async getProject(projectId: string): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch project');
    }

    return response.json();
  }

  async updateProject(projectId: string, projectData: ProjectUpdate): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update project');
    }

    return response.json();
  }

  async deleteProject(projectId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete project');
    }
  }

  async getProjectDocuments(projectId: string): Promise<Document[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/documents`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch project documents');
    }

    const data = await response.json();
    return data.documents;
  }

  async uploadDocuments(
    projectId: string,
    plansetFile: File,
    utilityBillFile: File
  ): Promise<any> {
    const formData = new FormData();
    formData.append('pdf1', plansetFile);
    formData.append('pdf2', utilityBillFile);

    const response = await fetch(
      `${API_BASE_URL}/api/projects/${projectId}/upload`,
      {
        method: 'POST',
        headers: this.getAuthHeadersForUpload(),
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload documents');
    }

    return response.json();
  }

  async getProjectCount(): Promise<number> {
    const response = await fetch(`${API_BASE_URL}/api/projects/count`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get project count');
    }

    const data = await response.json();
    return data.count;
  }
}

export const projectsService = new ProjectsService();
