import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private http: HttpClient) {}

  requestCode(phone: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/request`, { phone });
  }

  resendCode(phone: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/resend`, { phone });
  }

  verifyCode(phone: string, code: string): Observable<any> {
    return this.http.post(`${API_URL}/auth/verify`, { phone, code });
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