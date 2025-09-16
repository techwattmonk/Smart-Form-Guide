import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  profile_picture?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  full_name: string;
}

export interface GoogleLoginData {
  email: string;
  full_name: string;
  google_id: string;
  profile_picture?: string;
}

class AuthService {
  private baseURL = `${API_BASE_URL}/api/auth`;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${this.baseURL}/login`, credentials);
    return response.data;
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${this.baseURL}/register`, credentials);
    return response.data;
  }

  async googleLogin(googleData: GoogleLoginData): Promise<AuthResponse> {
    const response = await axios.post(`${this.baseURL}/google-login`, googleData);
    return response.data;
  }

  async getCurrentUser(token: string): Promise<User> {
    const response = await axios.get(`${this.baseURL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  setToken(token: string) {
    localStorage.setItem('access_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  removeToken() {
    localStorage.removeItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export const authService = new AuthService();
