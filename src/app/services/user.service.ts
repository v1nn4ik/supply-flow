import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UserData as ModelUserData } from '../models/user.model';

// Алиас для совместимости с существующим кодом
export type UserData = ModelUserData;

export interface User {
	_id: string;
	firstName: string;
	lastName: string;
	middleName?: string;
	email: string;
	role?: string;
	phone?: string;
}

const API_URL = environment.apiUrl;

@Injectable({
	providedIn: 'root'
})
export class UserService {
	private userData = new BehaviorSubject<UserData | null>(null);
	userData$ = this.userData.asObservable();

	constructor(private http: HttpClient) {
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
				error: () => {
					this.userData.next(null);
				}
			});
		}
	}

	getCurrentUser(): Observable<User | null> {
		const userData = this.getUserData();
		if (!userData) {
			return new Observable(subscriber => subscriber.next(null));
		}

		return this.getUsers().pipe(
			map(users => {
				const user = users.find(user =>
					user.firstName === userData.firstName &&
					user.lastName === userData.lastName
				);
				return user || null;
			})
		);
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
				error: () => {
					// Оставляем только обработку ошибки без логирования
				}
			});
		}
	}

	uploadProfilePhoto(file: File): Promise<string> {
		const token = localStorage.getItem('token');
		if (!token) {
			return Promise.reject('Пользователь не авторизован');
		}

		const formData = new FormData();
		formData.append('profilePhoto', file);

		return new Promise((resolve, reject) => {
			this.http.post<{ message: string, profilePhoto: string }>(`${API_URL}/auth/user/photo`, formData, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			}).subscribe({
				next: (response) => {
					const currentUserData = this.userData.value;
					if (currentUserData) {
						currentUserData.profilePhoto = response.profilePhoto;
						this.userData.next(currentUserData);
					}
					resolve(response.profilePhoto);
				},
				error: (error) => {
					console.error('Ошибка при загрузке фото:', error);
					reject(error?.error?.message || 'Ошибка загрузки фото');
				}
			});
		});
	}

	deleteProfilePhoto(): Promise<void> {
		const token = localStorage.getItem('token');
		if (!token) {
			return Promise.reject('Пользователь не авторизован');
		}

		return new Promise((resolve, reject) => {
			this.http.delete<{ message: string }>(`${API_URL}/auth/user/photo`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			}).subscribe({
				next: () => {
					const currentUserData = this.userData.value;
					if (currentUserData) {
						currentUserData.profilePhoto = undefined;
						this.userData.next(currentUserData);
					}
					resolve();
				},
				error: (error) => {
					reject(error?.error?.message || 'Ошибка удаления фото');
				}
			});
		});
	}

	getUserData(): UserData | null {
		return this.userData.value;
	}

	clearUserData(): void {
		this.userData.next(null);
	}

	getUsers(): Observable<User[]> {
		const token = localStorage.getItem('token');
		return this.http.get<User[]>(`${API_URL}/auth/users`, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});
	}

	getFullName(user: User): string {
		return `${user.lastName} ${user.firstName}${user.middleName ? ' ' + user.middleName : ''}`;
	}

	updateUserRole(userId: string, role: string): Observable<any> {
		const token = localStorage.getItem('token');
		return this.http.put<any>(`${API_URL}/auth/user/role`, { userId, role }, {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});
	}
}