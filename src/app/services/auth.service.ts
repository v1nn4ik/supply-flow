import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface UserDataResponse {
  hasUserData: boolean;
  userData?: {
    lastName: string;
    firstName: string;
    middleName?: string;
    birthDate?: string;
  };
}

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

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
  }
} 