import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface UserData {
  lastName: string;
  firstName: string;
  middleName: string;
  birthDate?: string;
  hasCompletedRegistration?: boolean;
}

const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userData = new BehaviorSubject<UserData | null>(null);
  userData$ = this.userData.asObservable();

  constructor(private http: HttpClient) {
    // При инициализации загружаем данные пользователя с сервера
    this.loadUserData();
  }

  loadUserData(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.get<UserData>(`${API_URL}/auth/user/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).subscribe({
        next: (data) => {
          this.userData.next(data);
        },
        error: (error) => {
          this.userData.next(null);
        }
      });
    }
  }

  setUserData(data: UserData): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.post<UserData>(`${API_URL}/auth/user/data`, data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).subscribe({
        next: (response) => {
          this.userData.next(response);
        },
        error: (error) => {
          // Оставляем только обработку ошибки без логирования
        }
      });
    }
  }

  getUserData(): UserData | null {
    return this.userData.value;
  }

  clearUserData(): void {
    this.userData.next(null);
  }
} 