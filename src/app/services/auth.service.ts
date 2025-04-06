import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserData } from '../models/user.model';
import { environment } from '../../environments/environment';

interface UserDataResponse {
  hasUserData: boolean;
  userData?: {
    lastName: string;
    firstName: string;
    middleName?: string;
    birthDate?: string;
  };
}

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: UserData | null = null;

  constructor(private http: HttpClient) {
    // Загрузить пользователя при создании сервиса, если есть токен
    if (this.getToken()) {
      this.loadCurrentUser();
    }
  }

  checkUserData(phone: string): Observable<UserDataResponse> {
    return this.http.post<UserDataResponse>(`${API_URL}/auth/check-user`, { phone });
  }

  requestCode(phone: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/request`, { phone });
  }

  resendCode(phone: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/resend`, { phone });
  }

  verifyCode(data: { phone: string; code: string; lastName?: string; firstName?: string; middleName?: string; birthDate?: string }): Observable<any> {
    return this.http.post(`${API_URL}/auth/verify`, data);
  }

  checkUser(phone: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/check-user`, { phone });
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUser = null;
  }

  getCurrentUser(): UserData | null {
    return this.currentUser;
  }

  setCurrentUser(user: UserData): void {
    this.currentUser = user;
  }
  
  loadCurrentUser(): void {
    const token = this.getToken();
    if (!token) return;
    
    this.http.get<UserData>(`${API_URL}/auth/user/data`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (userData) => {
        this.currentUser = userData;
      },
      error: () => {
        this.currentUser = null;
      }
    });
  }
} 